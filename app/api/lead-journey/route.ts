import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'

export const dynamic = 'force-dynamic'

function safeDate(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback
  try {
    const d = val instanceof Date ? val : new Date(String(val))
    if (isNaN(d.getTime())) return fallback
    return d.toISOString()
  } catch { return fallback }
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  if (val instanceof Date) return safeDate(val)
  return String(val)
}

function safeFloat(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? undefined : n
}

// Auto-detect query type
function detectQueryType(q: string): 'phone' | 'email' | 'leadId' | 'name' {
  const trimmed = q.trim()
  if (/^[0-9]{7,15}$/.test(trimmed)) return 'phone'
  if (trimmed.includes('@')) return 'email'
  if (trimmed.length > 20 && /[-_A-Z0-9]{10,}/i.test(trimmed)) return 'leadId'
  return 'name'
}

async function fetchLeadJourney(pool: any, q: string) {
  const qtype = detectQueryType(q)

  let whereClause = ''
  let params: any[] = []

  if (qtype === 'phone') {
    whereClause = `(mb.Mobile = ? OR mb.Default_Contact_No = ?)`
    params = [q, q]
  } else if (qtype === 'email') {
    whereClause = `mb.Email = ?`
    params = [q]
  } else if (qtype === 'leadId') {
    whereClause = `mb.Lead_ID = ?`
    params = [q]
  } else {
    whereClause = `mb.Client_Name LIKE ?`
    params = [`%${q}%`]
  }

  const sql = `
    SELECT
      mb.Lead_ID,
      mb.Client_Name,
      mb.Mobile,
      mb.Default_Contact_No,
      mb.Email,
      mb.Date_Time         AS buffer_arrival,
      mb.Source            AS lead_source,
      mb.Category,
      mb.Company,
      mb.Assign_To_MR_Main AS assigned_to,
      mb.KServe_Status     AS kserve_status,
      mb.KServe_Route      AS kserve_route,
      mb.Final_Status      AS final_status,
      mb.Conversion_Amount AS conversion_amount,
      mb.Last_FollowUp_Date AS last_followup_date,
      mb.Total_FollowUps   AS total_followups,
      sbn.Date_Time        AS staging_date,
      sbn.Qualification_Status AS qualification_status,
      sbn.Assign_To_MR_Main_Agent_Name AS kserve_agent_name,
      sbn.Call_Disposition AS kserve_disposition
    FROM master_buffer mb
    LEFT JOIN staging_buffer_new sbn ON sbn.Lead_ID = mb.Lead_ID
    WHERE ${whereClause}
    ORDER BY mb.Date_Time DESC
    LIMIT 50
  `

  const [rows]: any = await pool.query(sql, params)

  // For each lead, get followup activity
  const results = []
  for (const row of rows) {
    const leadId = safeStr(row.Lead_ID)
    const mobile = safeStr(row.Mobile) || safeStr(row.Default_Contact_No)

    let followups: any[] = []
    try {
      const followupSql = `
        SELECT
          fa.Date_Time       AS call_date,
          fa.Actual_Time     AS actual_time,
          fa.Assign_To_MR_Main_Agent_Name AS agent_name,
          fa.Full_Disposition AS disposition,
          fa.Call_Notes      AS call_notes,
          fa.call_Count      AS call_count,
          fa.sheet_name      AS sheet_name,
          fa.Planned_Date    AS planned_date
        FROM followup_activity fa
        WHERE fa.Lead_ID = ? OR fa.Mobile = ?
        ORDER BY fa.Date_Time DESC
        LIMIT 50
      `
      const [fuRows]: any = await pool.query(followupSql, [leadId, mobile])
      followups = fuRows.map((fu: any) => ({
        callDate: safeDate(fu.call_date || fu.actual_time || fu.planned_date),
        agentName: safeStr(fu.agent_name || fu.sheet_name),
        disposition: safeStr(fu.disposition),
        callNotes: safeStr(fu.call_notes),
        callCount: fu.call_count ? Number(fu.call_count) : undefined,
      }))
    } catch (_) {}

    results.push({
      leadId,
      clientName: safeStr(row.Client_Name),
      mobile: safeStr(row.Mobile),
      altMobile: safeStr(row.Default_Contact_No),
      email: safeStr(row.Email),
      bufferArrival: safeDate(row.buffer_arrival),
      leadSource: safeStr(row.lead_source),
      category: safeStr(row.Category),
      company: safeStr(row.Company),
      assignedTo: safeStr(row.assigned_to),
      kserveStatus: safeStr(row.kserve_status),
      kserveRoute: safeStr(row.kserve_route),
      kserveAgentName: safeStr(row.kserve_agent_name),
      kserveDisposition: safeStr(row.kserve_disposition),
      qualificationStatus: safeStr(row.qualification_status),
      stagingDate: safeDate(row.staging_date),
      finalStatus: safeStr(row.final_status),
      conversionAmount: safeFloat(row.conversion_amount),
      lastFollowupDate: safeDate(row.last_followup_date),
      totalFollowups: row.total_followups ? Number(row.total_followups) : followups.length,
      followups,
    })
  }

  return results
}

async function fetchBulkLeadJourneys(pool: any, ids: string[]) {
  const safeIds = ids.slice(0, 200).map(id => id.trim()).filter(Boolean)
  if (safeIds.length === 0) return []

  const placeholders = safeIds.map(() => '?').join(',')
  const sql = `
    SELECT
      mb.Lead_ID,
      mb.Client_Name,
      mb.Mobile,
      mb.Default_Contact_No,
      mb.Email,
      mb.Date_Time         AS buffer_arrival,
      mb.Source            AS lead_source,
      mb.Company,
      mb.Assign_To_MR_Main AS assigned_to,
      mb.KServe_Status     AS kserve_status,
      mb.Final_Status      AS final_status,
      mb.Conversion_Amount AS conversion_amount,
      mb.Total_FollowUps   AS total_followups,
      mb.Last_FollowUp_Date AS last_followup_date
    FROM master_buffer mb
    WHERE mb.Lead_ID IN (${placeholders})
    ORDER BY mb.Date_Time DESC
  `
  const [rows]: any = await pool.query(sql, safeIds)

  return rows.map((row: any) => ({
    leadId: safeStr(row.Lead_ID),
    clientName: safeStr(row.Client_Name),
    mobile: safeStr(row.Mobile),
    email: safeStr(row.Email),
    bufferArrival: safeDate(row.buffer_arrival),
    leadSource: safeStr(row.lead_source),
    company: safeStr(row.Company),
    assignedTo: safeStr(row.assigned_to),
    kserveStatus: safeStr(row.kserve_status),
    finalStatus: safeStr(row.final_status),
    conversionAmount: safeFloat(row.conversion_amount),
    totalFollowups: row.total_followups ? Number(row.total_followups) : 0,
    lastFollowupDate: safeDate(row.last_followup_date),
    followups: [],
  }))
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() || ''
    const ids = searchParams.get('ids')?.split(',').map(s => s.trim()).filter(Boolean) || []

    const pool = await getPool()

    if (ids.length > 0) {
      const results = await fetchBulkLeadJourneys(pool, ids)
      return NextResponse.json({ success: true, results, count: results.length })
    }

    if (!q) {
      return NextResponse.json({ success: false, error: 'Query parameter q or ids is required' }, { status: 400 })
    }

    const results = await fetchLeadJourney(pool, q)
    return NextResponse.json({ success: true, results, count: results.length, query: q })
  } catch (err: any) {
    console.error('[lead-journey] error:', err)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
