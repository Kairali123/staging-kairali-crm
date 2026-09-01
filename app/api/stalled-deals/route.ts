import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { STAGE_THRESHOLDS } from '@/lib/config'

export const dynamic = 'force-dynamic'

type PipelineStage = 'new' | 'qualified' | 'proposal_sent' | 'negotiating' | 'payment_pending' | 'won' | 'lost'

type CachedPayload = {
  success: true
  stalledDeals: any[]
  stats: any
}

type CacheEntry = {
  expiresAt: number
  payload: CachedPayload
}

const CACHE_TTL_MS = 2 * 60 * 1000
const globalForStalledDeals = globalThis as typeof globalThis & {
  __dealAssistantStalledDealsCache?: Map<string, CacheEntry>
}

const stalledDealsCache =
  globalForStalledDeals.__dealAssistantStalledDealsCache ?? new Map<string, CacheEntry>()
globalForStalledDeals.__dealAssistantStalledDealsCache = stalledDealsCache

// Helper to normalize phone numbers (compare last 10 digits)
function normalizePhone(phoneStr: string): string {
  if (!phoneStr) return ''
  const digits = phoneStr.replace(/\D/g, '')
  return digits.slice(-10)
}

// Parse "DD/MM/YYYY HH:MM:SS" — JS new Date() misreads DD as MM for this format
function parseCRMDate(str: any): Date | null {
  if (!str) return null
  if (str instanceof Date || (typeof str === 'object' && typeof str.getTime === 'function')) {
    return str
  }
  const strStr = String(str).trim()
  
  // If it's already an ISO string or standard YYYY-MM-DD
  if (strStr.includes('T') || strStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const d = new Date(strStr)
    return isNaN(d.getTime()) ? null : d
  }

  const [datePart, timePart = '00:00:00'] = strStr.split(' ')
  const parts = datePart.split('/')
  if (parts.length !== 3) {
    const d = new Date(strStr)
    return isNaN(d.getTime()) ? null : d
  }
  const [dd, mm, yyyy] = parts
  const paddedDd = dd.padStart(2, '0')
  const paddedMm = mm.padStart(2, '0')
  const d = new Date(`${yyyy}-${paddedMm}-${paddedDd}T${timePart}`)
  return isNaN(d.getTime()) ? null : d
}

function normalizeText(val: any): string {
  return String(val || '').toLowerCase().trim()
}

function trimText(value: any, limit: number): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1).trimEnd()}…`
}

function determinePipelineStage(params: {
  isWon: boolean
  latestDisp?: string
  latestNote?: string
  hasActivity: boolean
  quoteAmount: number
}): PipelineStage {
  const { isWon, latestDisp = '', latestNote = '', hasActivity, quoteAmount } = params
  const text = `${latestDisp} ${latestNote}`.toLowerCase()

  if (isWon) return 'won'
  if (text.includes('cold') || text.includes('lost') || text.includes('not interested') || text.includes('do not contact')) return 'lost'
  if (text.includes('payment') || text.includes('invoice') || text.includes('advance') || text.includes('deposit') || text.includes('balance')) return 'payment_pending'
  if (text.includes('proposal') || text.includes('quotation') || text.includes('quote sent') || text.includes('sent quote')) return 'proposal_sent'
  if (text.includes('meeting') || text.includes('negotiat') || text.includes('followup') || text.includes('follow-up')) return 'negotiating'
  if (text.includes('qualified') || text.includes('hot lead') || text.includes('interested') || text.includes('first contact') || text.includes('sales pitch')) return 'qualified'
  if (quoteAmount > 0 && hasActivity) return 'proposal_sent'
  return 'new'
}

function calculateHealthScore(input: {
  stage: PipelineStage
  daysStalled: number
  unreachable: boolean
  quoteAmount: number
  hasNotes: boolean
}): number {
  const stagePenalty: Record<PipelineStage, number> = {
    new: 6,
    qualified: 10,
    proposal_sent: 14,
    negotiating: 18,
    payment_pending: 24,
    won: 0,
    lost: 35,
  }

  let score = 100
  score -= Math.min(input.daysStalled * 3, 42)
  score -= stagePenalty[input.stage]
  if (input.unreachable) score -= 12
  if (input.quoteAmount > 0) score += 4
  if (input.hasNotes) score += 2

  return Math.max(0, Math.min(100, Math.round(score)))
}

function getNextBestAction(stage: PipelineStage, unreachable: boolean, daysStalled: number): string {
  if (stage === 'won') return 'Hand off to onboarding'
  if (stage === 'lost') return 'Review loss reason and archive'
  if (unreachable) return 'Call customer again'
  if (stage === 'payment_pending') return 'Confirm payment and offer help'
  if (stage === 'proposal_sent') return daysStalled > 4 ? 'Call to review proposal' : 'Send a proposal reminder'
  if (stage === 'negotiating') return daysStalled > 4 ? 'Schedule a negotiation call' : 'Follow up on objections'
  if (stage === 'qualified') return 'Send quotation'
  return daysStalled > 4 ? 'Escalate for immediate outreach' : 'Call customer'
}

function buildSummary(stats: any): string {
  const stalled = stats.totalStalled || 0
  const avgHealth = stats.averageHealthScore || 0
  const won = stats.pipelineCounts?.won || 0
  const lost = stats.pipelineCounts?.lost || 0
  const total = stats.pipelineCountsTotal || stalled + won + lost
  const conversion = total > 0 ? Math.round((won / total) * 100) : 0
  const dominantStage = Object.entries(stats.stageCounts || {})
    .sort((a: any, b: any) => Number(b[1]) - Number(a[1]))[0]?.[0] || 'new'

  return `Pipeline is ${Math.max(0, 100 - avgHealth)}% at risk, with ${stalled} stalled leads and ${conversion}% conversion. Most stalled deals are in ${String(dominantStage).replace(/_/g, ' ')}.`
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const fromDate = searchParams.get('from') // Expecting YYYY-MM-DD
    const toDate = searchParams.get('to')     // Expecting YYYY-MM-DD
    const company = searchParams.get('company') // Expecting KTAHV, KAPPL, VILLARAAG, or ALL
    const cacheKey = [fromDate || '', toDate || '', company || 'ALL'].join('|')

    const cached = stalledDealsCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload)
    }

    const pool = await getPool()
    const connection = await pool.getConnection()

    try {
      // 1. Build the query for active leads with optional date range filter on m.Date_Time
      // Database Optimization: Filter s.Timestamp_2 to be at least 3 days old, 
      // since any lead updated in the last 3 days cannot be stalled under any stage threshold (min threshold is 3 days).
      let query = `
        SELECT 
          m.lead_id, 
          m.Name_of_Client as name, 
          m.Mobile as phone, 
          m.Email_Id as email, 
          m.Subjects as package_interested, 
          m.Notes as notes,
          m.Date_Time as assigned_date,
          s.Assign_To_MR_Main as assigned_sales_rep,
          s.Timestamp_2 as last_update_date,
          s.Converted_Amount as converted_amount,
          s.Lead_Relates_to_which_company as company
        FROM master_buffer m
        INNER JOIN staging_buffer_new s ON m.lead_id = s.Lead_id
        WHERE m.lead_id IS NOT NULL 
          AND m.lead_id != '' 
          AND m.lead_id != '-'
          AND LOWER(m.WebSite_Name) NOT LIKE '%kserve api outcome%'
          AND s.Timestamp_2 <= DATE_SUB(NOW(), INTERVAL 3 DAY)
      `
      const params: any[] = []

      if (fromDate && toDate) {
        query += ` AND m.Date_Time >= ? AND m.Date_Time <= ?`
        params.push(`${fromDate} 00:00:00`, `${toDate} 23:59:59`)
      }

      if (company && company.toUpperCase() !== 'ALL') {
        query += ` AND LOWER(s.Lead_Relates_to_which_company) = LOWER(?)`
        params.push(company)
      }

      // Order by assigned date descending (latest date first) and limit to 5000 for high performance
      query += ' ORDER BY m.Date_Time DESC LIMIT 5000'

      const [leadsRaw]: any = await connection.execute(query, params)

      if (leadsRaw.length === 0) {
        const emptyPayload: CachedPayload = { success: true, stalledDeals: [], stats: {} }
        stalledDealsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload: emptyPayload })
        return NextResponse.json(emptyPayload)
      }

      const leadIds = leadsRaw.map((l: any) => l.lead_id)
      const leadPhones = leadsRaw.map((l: any) => normalizePhone(l.phone)).filter(Boolean)
      const leadEmails = leadsRaw.map((l: any) => l.email ? l.email.toLowerCase().trim() : '').filter(Boolean)

      if (leadIds.length === 0) {
        const emptyPayload: CachedPayload = { success: true, stalledDeals: [], stats: {} }
        stalledDealsCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload: emptyPayload })
        return NextResponse.json(emptyPayload)
      }

      // 2. Fetch latest follow-up date from deal_assistant_followups for these active leads
      const followupsPromise = pool.query(`
        SELECT lead_id, MAX(followed_up_at) as last_assistant_followup
        FROM deal_assistant_followups
        WHERE lead_id IN (?)
        GROUP BY lead_id
      `, [leadIds])

      const assistantFollowupsMap = new Map<string, Date>()
      // 3. Fetch activities from followup_activity for these active leads
      const activitiesPromise = pool.query(`
        SELECT lead_id, Full_Disposition, Comment, Call_Notes, created_at, latest_called_at
        FROM followup_activity
        WHERE lead_id IN (?)
        ORDER BY created_at DESC
      `, [leadIds])

      // 4. Fetch conversions for only these active leads to optimize performance (avoiding full 100k+ join)
      let conversionPromise: Promise<any> = Promise.resolve([[]])
      if (leadPhones.length > 0 || leadEmails.length > 0) {
        const queryParams: any[] = []
        let conversionQuery = `
          SELECT mobile, email, booking_status, conversion_amount
          FROM conversion_updates_employeewise
          WHERE booking_status IS NOT NULL
            AND LOWER(booking_status) NOT IN ('booking cancelled', 'cancelled', 'no show', 'voucher', 'complimentary')
            AND (
        `
        const clauses: string[] = []
        if (leadPhones.length > 0) {
          clauses.push(`mobile IN (?)`)
          queryParams.push(leadPhones)
        }
        if (leadEmails.length > 0) {
          clauses.push(`email IN (?)`)
          queryParams.push(leadEmails)
        }
        conversionQuery += clauses.join(' OR ') + ' )'
        conversionPromise = pool.query(conversionQuery, queryParams)
      }

      const [[followupsRaw], [activitiesRaw], [conversionsRaw]]: any = await Promise.all([
        followupsPromise,
        activitiesPromise,
        conversionPromise,
      ])

      followupsRaw.forEach((f: any) => {
        if (f.last_assistant_followup) {
          assistantFollowupsMap.set(f.lead_id, new Date(f.last_assistant_followup))
        }
      })

      const activitiesMap = new Map<string, any[]>()
      activitiesRaw.forEach((act: any) => {
        const list = activitiesMap.get(act.lead_id) || []
        list.push(act)
        activitiesMap.set(act.lead_id, list)
      })

      let convertedPhones = new Set<string>()
      let convertedEmails = new Set<string>()
      conversionsRaw.forEach((c: any) => {
        const norm = normalizePhone(c.mobile)
        if (norm) convertedPhones.add(norm)
        if (c.email) convertedEmails.add(c.email.toLowerCase().trim())
      })

      // Process leads
      const now = new Date()
      const stalledDeals: any[] = []

      const stats = {
        totalStalled: 0,
        stageCounts: {
          new: 0,
          qualified: 0,
          proposal_sent: 0,
          negotiating: 0,
          payment_pending: 0,
          won: 0,
          lost: 0,
        } as Record<string, number>,
        pipelineCounts: {
          new: 0,
          qualified: 0,
          proposal_sent: 0,
          negotiating: 0,
          payment_pending: 0,
          won: 0,
          lost: 0,
        } as Record<string, number>,
        totalPipelineValueAtRisk: 0,
        averageHealthScore: 0,
        pipelineCountsTotal: 0,
        summary: '',
      }

      let healthScoreSum = 0

      for (const lead of leadsRaw) {
        // Check if closed_won in conversion table
        const leadPhoneNorm = normalizePhone(lead.phone)
        const leadEmailNorm = lead.email ? lead.email.toLowerCase().trim() : ''

        const isWon = (leadPhoneNorm && convertedPhones.has(leadPhoneNorm)) ||
          (leadEmailNorm && convertedEmails.has(leadEmailNorm)) ||
          (lead.converted_amount && parseFloat(lead.converted_amount) > 0)

        const activities = activitiesMap.get(lead.lead_id) || []

        // Find stage and last attempt reachable flag
        let stage: PipelineStage = isWon ? 'won' : 'new'
        let lastAttemptUnreachable = false
        let latestNote = lead.notes || ''
        let latestContactDate: Date | null = null

        if (!isWon && activities.length > 0) {
          const latestAct = activities[0]

          // Latest interaction date
          const actDate = latestAct.latest_called_at || latestAct.created_at
          if (actDate) {
            latestContactDate = new Date(actDate)
          }

          // Check if latest attempt was unreachable
          const latestDisp = latestAct.Full_Disposition
          if (['busy auto', 'not connected', 'disconnected number auto'].includes(String(latestDisp).toLowerCase())) {
            lastAttemptUnreachable = true
          }

          // Call notes
          latestNote = latestAct.Call_Notes || latestAct.Comment || lead.notes || ''

          // Resolve stage from history (scan for first non-unreachable disposition)
          let resolved = false
          for (const act of activities) {
            const disp = normalizeText(act.Full_Disposition)
            const noteText = `${normalizeText(act.Call_Notes)} ${normalizeText(act.Comment)}`
            const stageCandidate = determinePipelineStage({
              isWon,
              latestDisp: disp,
              latestNote: noteText,
              hasActivity: true,
              quoteAmount: lead.converted_amount ? parseFloat(lead.converted_amount) : 0,
            })
            if (stageCandidate === 'lost') {
              stage = 'lost'
              resolved = true
              break
            }
            if (stageCandidate !== 'new') {
              stage = stageCandidate
              resolved = true
              break
            }
          }
          if (!resolved) {
            stage = 'new'
          }
        } else if (!isWon) {
          stage = 'new'
        }

        // Compute last_contact_date
        const assistantFollowup = assistantFollowupsMap.get(lead.lead_id)
        const fallbackUpdateDate = lead.last_update_date ? parseCRMDate(lead.last_update_date) : null
        const fallbackAssignedDate = lead.assigned_date ? parseCRMDate(lead.assigned_date) : null

        const dateCandidates = [
          assistantFollowup,
          latestContactDate,
          fallbackUpdateDate,
          fallbackAssignedDate
        ].filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))

        const finalLastContactDate = dateCandidates.length > 0
          ? new Date(Math.max(...dateCandidates.map(d => d.getTime())))
          : now

        const diffTime = Math.abs(now.getTime() - finalLastContactDate.getTime())
        const daysStalled = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        // Get threshold for current stage
        const threshold = STAGE_THRESHOLDS[stage] || 5

        const quoteAmount = lead.converted_amount ? parseFloat(lead.converted_amount) : 0
        const healthScore = calculateHealthScore({
          stage,
          daysStalled,
          unreachable: lastAttemptUnreachable,
          quoteAmount,
          hasNotes: Boolean(latestNote),
        })
        const nextBestAction = getNextBestAction(stage, lastAttemptUnreachable, daysStalled)

        stats.pipelineCounts[stage] = (stats.pipelineCounts[stage] || 0) + 1
        stats.pipelineCountsTotal += 1
        healthScoreSum += healthScore

        if (daysStalled >= threshold) {
          const trimmedNotes = trimText(latestNote, 180)
          stalledDeals.push({
            id: lead.lead_id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            package_interested: lead.package_interested,
            assigned_sales_rep: lead.assigned_sales_rep || 'unassigned',
            assigned_date: lead.assigned_date,
            stage,
            pipeline_stage: stage,
            last_contact_date: finalLastContactDate.toISOString(),
            daysStalled,
            quote_amount: quoteAmount || null,
            notes: trimmedNotes,
            last_attempt_unreachable: lastAttemptUnreachable,
            company: lead.company || 'KTAHV'
            ,
            health_score: healthScore,
            next_best_action: nextBestAction
          })

          // Update stats
          stats.totalStalled += 1
          stats.stageCounts[stage] = (stats.stageCounts[stage] || 0) + 1
          stats.totalPipelineValueAtRisk += quoteAmount
        }
      }

      stats.averageHealthScore = stats.pipelineCountsTotal > 0
        ? Math.round(healthScoreSum / stats.pipelineCountsTotal)
        : 0
      stats.summary = buildSummary(stats)

      // Sort stalled deals by assigned_date descending (latest first)
      stalledDeals.sort((a, b) => {
        const da = a.assigned_date ? (parseCRMDate(a.assigned_date)?.getTime() || 0) : 0
        const db = b.assigned_date ? (parseCRMDate(b.assigned_date)?.getTime() || 0) : 0
        return db - da
      })

      const payload: CachedPayload = {
        success: true,
        stalledDeals,
        stats
      }

      stalledDealsCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      })

      return NextResponse.json(payload)

    } finally {
      connection.release()
    }
  } catch {
    console.error('[stalled-deals API] request failed')
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stalled deals' },
      { status: 500 }
    )
  }
}
