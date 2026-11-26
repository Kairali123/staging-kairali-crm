// Lead journey lookup for /lead-search. Column names follow the live schema:
// master_buffer (lead_id, Name_of_Client, Email_Id, Data_Source, …) joined to staging_buffer_new,
// followup_activity by lead_id, and KServe qualification from ai_voice_leads_received.
// KServe is a separate lookup on purpose: that table uses a different collation than master_buffer,
// so joining them throws ER_CANT_AGGREGATE_2COLLATIONS.

export function safeDate(val: any, fallback = ''): string {
  if (val === null || val === undefined || val === '') return fallback
  try {
    const d = val instanceof Date ? val : new Date(String(val))
    if (isNaN(d.getTime())) return fallback
    return d.toISOString()
  } catch { return fallback }
}

export function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  if (val instanceof Date) return safeDate(val)
  return String(val)
}

export function safeFloat(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? undefined : n
}

export type QueryType = 'phone' | 'email' | 'leadId' | 'name'

// Lead ids look like VR_1766928619862-132, KT_…, or -0R3GB44P2: one token with a digit, "_" or "-".
export function detectQueryType(q: string): QueryType {
  const trimmed = q.trim()
  if (trimmed.includes('@')) return 'email'
  if (/^\+?[\d\s-]{7,20}$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 7) return 'phone'
  if (/^[\w-]{4,}$/.test(trimmed) && /[\d_-]/.test(trimmed)) return 'leadId'
  return 'name'
}

/** Digits only, plus the bare 10-digit number when a country code was typed. */
export function phoneVariants(q: string): string[] {
  const digits = q.replace(/\D/g, '')
  return [...new Set([digits, digits.length > 10 ? digits.slice(-10) : ''].filter(Boolean))]
}

export function normalizeCompany(relatesTo?: string | null, kapplKtahv?: string | null): string {
  const r = (relatesTo || '').trim().toLowerCase()
  if (r === 'villaraag' || r === 'villa raag' || r.includes('villaraag') || r.includes('villa raag')) return 'VILLARAAG'
  if (r.includes('ayurvedic center') || r.includes('ayurvedic centre') || r === 'kac') return 'KAC'
  if (r.includes('healing village') || r === 'ktahv' || r === 'katahv') return 'KTAHV'
  if (r.includes('ayurvedic products') || r === 'kappl') return 'KAPPL'
  const k = (kapplKtahv || '').trim().toUpperCase()
  if (k === 'KTAHV' || k === 'KATAHV') return 'KTAHV'
  if (k === 'VILLARAAG' || k === 'VILARAAG') return 'VILLARAAG'
  if (k === 'KAC') return 'KAC'
  if (k === 'KAPPL') return 'KAPPL'
  return (relatesTo || kapplKtahv || '').trim()
}

export function normalizeCompanyFilter(raw?: string | null): string {
  const v = (raw || '').trim().toUpperCase()
  if (!v || v === 'ALL') return 'ALL'
  if (v === 'KATAHV' || v === 'KTAHV') return 'KTAHV'
  if (v === 'VILARAAG' || v === 'VILLARAAG') return 'VILLARAAG'
  if (v === 'KAPPL') return 'KAPPL'
  if (v === 'KAC') return 'KAC'
  return 'ALL'
}

const COMPANY_SQL_EXPR = `
  CASE
    WHEN LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) LIKE '%villa%raag%'
      OR LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) = 'villaraag' THEN 'VILLARAAG'
    WHEN LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) LIKE '%ayurvedic center%'
      OR LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) LIKE '%ayurvedic centre%'
      OR LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) = 'kac' THEN 'KAC'
    WHEN LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) LIKE '%healing village%'
      OR LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) IN ('ktahv', 'katahv') THEN 'KTAHV'
    WHEN LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) LIKE '%ayurvedic products%'
      OR LOWER(TRIM(COALESCE(sbn.Lead_Relates_to_which_company, ''))) = 'kappl' THEN 'KAPPL'
    WHEN UPPER(TRIM(COALESCE(sbn.KAPPL_KTAHV, ''))) IN ('KTAHV', 'KATAHV') THEN 'KTAHV'
    WHEN UPPER(TRIM(COALESCE(sbn.KAPPL_KTAHV, ''))) IN ('VILLARAAG', 'VILARAAG') THEN 'VILLARAAG'
    WHEN UPPER(TRIM(COALESCE(sbn.KAPPL_KTAHV, ''))) = 'KAC' THEN 'KAC'
    WHEN UPPER(TRIM(COALESCE(sbn.KAPPL_KTAHV, ''))) = 'KAPPL' THEN 'KAPPL'
    ELSE ''
  END
`

const DATASOURCE_SQL_EXPR = `COALESCE(NULLIF(TRIM(mb.Verified_Source), ''), NULLIF(TRIM(mb.Data_Source), ''))`

const JOURNEY_SELECT = `
  SELECT
    mb.lead_id,
    mb.Name_of_Client,
    mb.Mobile,
    mb.Email_Id,
    COALESCE(mb.Date_Time, mb.Timestamp, mb.actual_time) AS enquiry_date,
    COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time) AS buffer_arrival,
    mb.Data_Source,
    mb.Verified_Source,
    sbn.Assign_To_MR_Main   AS assigned_to,
    COALESCE(sbn.Timestamp_2, sbn.Sent_status) AS assigned_date,
    sbn.Sent_status         AS sent_status,
    sbn.Reason_why_assign_Or_Delete AS assign_reason,
    sbn.Sheet_Name          AS sheet_name,
    sbn.KAPPL_KTAHV,
    sbn.Lead_Relates_to_which_company,
    sbn.Lead_Category,
    sbn.Phone_Number_of_User,
    sbn.Enquiry_Status_Last,
    sbn.status              AS staging_status,
    sbn.Converted_Amount,
    sbn.Converted_Date      AS converted_date
  FROM master_buffer mb
  LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
`

interface BulkLeadEnrichment {
  kserve: Map<string, any>
  fmsLatest: Map<string, any>
  actLatest: Map<string, any>
  callTotals: Map<string, number>
  firstCallDates: Map<string, string>
}

export function deriveLeadStatus(params: {
  finalStatus: string
  conversionAmount?: number
  convertedDate?: string
  totalFollowups: number
  kserveStatus?: string
}): 'Converted' | 'Cold' | 'Followup' | 'New' {
  const fs = (params.finalStatus || '').toLowerCase()
  const ks = (params.kserveStatus || '').toLowerCase()
  if (
    (params.conversionAmount && params.conversionAmount > 0) ||
    Boolean(params.convertedDate) ||
    /convert|order|book|paid|won|sale|confirm|enrolled|admission/.test(fs)
  ) {
    return 'Converted'
  }
  if (
    /not interested|cold|lost|invalid|junk|wrong|spam|dnd|duplicate|cancel|disqualif|not qualified|irrelevant|dead|closed lost|fake/.test(fs) ||
    /not qualified|disqualif|junk|invalid|spam|cold/.test(ks)
  ) {
    return 'Cold'
  }
  if (params.totalFollowups > 0 || Boolean(fs.trim())) {
    return 'Followup'
  }
  return 'New'
}

function formatTatDuration(diffMinutes: number): string {
  const m = Math.max(0, Math.round(diffMinutes))
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const remM = m % 60
  if (h < 24) return remM > 0 ? `${h}h ${remM}m` : `${h}h`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return remH > 0 ? `${d}d ${remH}h` : `${d}d`
}

function computeLeadTat(
  startIso: string,
  firstCallIso: string,
  assignedIso: string
): { tatMinutes: number | null; tatLabel: string; tatStage: '1st Call' | 'Assigned' | 'Waiting' | '' } {
  if (!startIso) return { tatMinutes: null, tatLabel: '—', tatStage: '' }
  const startMs = new Date(startIso).getTime()
  if (isNaN(startMs)) return { tatMinutes: null, tatLabel: '—', tatStage: '' }

  if (firstCallIso) {
    const callMs = new Date(firstCallIso).getTime()
    if (!isNaN(callMs) && callMs >= startMs) {
      const mins = (callMs - startMs) / 60000
      return { tatMinutes: Math.round(mins), tatLabel: formatTatDuration(mins), tatStage: '1st Call' }
    }
  }
  if (assignedIso) {
    const asgMs = new Date(assignedIso).getTime()
    if (!isNaN(asgMs) && asgMs >= startMs) {
      const mins = (asgMs - startMs) / 60000
      return { tatMinutes: Math.round(mins), tatLabel: formatTatDuration(mins), tatStage: 'Assigned' }
    }
  }
  const nowMs = Date.now()
  if (nowMs >= startMs) {
    const mins = (nowMs - startMs) / 60000
    return { tatMinutes: Math.round(mins), tatLabel: formatTatDuration(mins), tatStage: 'Waiting' }
  }
  return { tatMinutes: 0, tatLabel: '<1m', tatStage: 'Waiting' }
}

async function loadBulkEnrichment(pool: any, leadIds: string[], mobiles: string[]): Promise<BulkLeadEnrichment> {
  const kserve = new Map<string, any>()
  const fmsLatest = new Map<string, any>()
  const actLatest = new Map<string, any>()
  const callTotals = new Map<string, number>()
  const firstCallDates = new Map<string, string>()

  if (!leadIds.length) return { kserve, fmsLatest, actLatest, callTotals, firstCallDates }

  const recordFirstCall = (key: string, rawDate: any) => {
    if (!key) return
    const iso = safeDate(rawDate)
    if (!iso) return
    const existing = firstCallDates.get(key)
    if (!existing || new Date(iso).getTime() < new Date(existing).getTime()) {
      firstCallDates.set(key, iso)
    }
  }

  const validLeadIds = [...new Set(leadIds.map(id => String(id).trim()).filter(Boolean))]
  const validMobiles = [...new Set(mobiles.map(m => String(m || '').trim()).filter(Boolean))]

  const queries: Promise<any>[] = [
    // 1. KServe (ai_voice_leads_received)
    pool.query(
      `SELECT lead_id, calculated_qualification_status, assigned_mr, final_call_status, date_time,
              call_outcome, final_lead_outcome, lead_status
         FROM ai_voice_leads_received
        WHERE lead_id IN (?)
        ORDER BY id DESC`,
      [validLeadIds]
    ).catch((err: any) => {
      console.warn('[lead-journey] KServe bulk lookup error:', err?.message || err)
      return [[]]
    }),

    // 2. Dialer (lead_fms) by lead_id (uses idx_lead_id)
    pool.query(
      `SELECT lead_id, Full_Disposition, Assign_To_MR_Main_Agent_Name,
              COALESCE(actual_time, Timestamp, Date_Time, created_at) AS callDate,
              Order_Sales_Saved_Staus, Lead_Conversion, Conversion_Amount, Call_Notes
         FROM lead_fms
        WHERE lead_id IN (?) AND Full_Disposition IS NOT NULL AND Full_Disposition != ''
        ORDER BY sl_no DESC`,
      [validLeadIds]
    ).catch((err: any) => {
      console.warn('[lead-journey] lead_fms lead_id bulk lookup error:', err?.message || err)
      return [[]]
    }),

    // 3. Dialer (lead_fms) by Mobile (uses idx_mobile)
    validMobiles.length ? pool.query(
      `SELECT lead_id, Mobile, Full_Disposition, Assign_To_MR_Main_Agent_Name,
              COALESCE(actual_time, Timestamp, Date_Time, created_at) AS callDate,
              Order_Sales_Saved_Staus, Lead_Conversion, Conversion_Amount, Call_Notes
         FROM lead_fms
        WHERE Mobile IN (?) AND Full_Disposition IS NOT NULL AND Full_Disposition != ''
        ORDER BY sl_no DESC`,
      [validMobiles]
    ).catch((err: any) => {
      console.warn('[lead-journey] lead_fms mobile bulk lookup error:', err?.message || err)
      return [[]]
    }) : Promise.resolve([[]]),

    // 4. App Sheet Activity (followup_activity) (uses idx on lead_id)
    pool.query(
      `SELECT lead_id, Full_Disposition, Assign_To_MR_Main_Agent_Name,
              COALESCE(latest_called_at, created_at, planned_date) AS callDate,
              Call_Notes
         FROM followup_activity
        WHERE lead_id IN (?) AND Full_Disposition IS NOT NULL AND Full_Disposition != ''
        ORDER BY sl_no DESC`,
      [validLeadIds]
    ).catch((err: any) => {
      console.warn('[lead-journey] followup_activity bulk lookup error:', err?.message || err)
      return [[]]
    }),

    // 5. Total call counts from lead_fms (by lead_id)
    pool.query(
      `SELECT lead_id, COUNT(*) AS total FROM lead_fms WHERE lead_id IN (?) GROUP BY lead_id`,
      [validLeadIds]
    ).catch((err: any) => {
      console.warn('[lead-journey] lead_fms count error:', err?.message || err)
      return [[]]
    }),

    // 6. Total call counts from followup_activity
    pool.query(
      `SELECT lead_id, COUNT(*) AS total FROM followup_activity WHERE lead_id IN (?) GROUP BY lead_id`,
      [validLeadIds]
    ).catch((err: any) => {
      console.warn('[lead-journey] followup_activity count error:', err?.message || err)
      return [[]]
    })
  ]

  const [kRows, fmsIdRows, fmsMobRows, actRows, fmsCounts, actCounts] = await Promise.all(queries)

  // Populate KServe (newest row per lead wins)
  for (const r of (kRows[0] || [])) {
    const k = String(r.lead_id)
    if (!kserve.has(k)) kserve.set(k, r)
    recordFirstCall(k, r.date_time)
  }

  // Populate FMS Latest (newest row per lead_id wins)
  for (const r of (fmsIdRows[0] || [])) {
    const k = String(r.lead_id)
    if (!fmsLatest.has(k)) fmsLatest.set(k, r)
    recordFirstCall(k, r.callDate)
  }

  // Then by Mobile if not already present
  for (const r of (fmsMobRows[0] || [])) {
    const mobKey = String(r.Mobile || '').trim()
    const idKey = String(r.lead_id || '')
    if (mobKey && !fmsLatest.has(mobKey)) fmsLatest.set(mobKey, r)
    if (idKey && !fmsLatest.has(idKey)) fmsLatest.set(idKey, r)
    if (mobKey) recordFirstCall(mobKey, r.callDate)
    if (idKey) recordFirstCall(idKey, r.callDate)
  }

  // Populate Activity Latest
  for (const r of (actRows[0] || [])) {
    const k = String(r.lead_id)
    if (!actLatest.has(k)) actLatest.set(k, r)
    recordFirstCall(k, r.callDate)
  }

  // Aggregate call counts
  for (const r of (fmsCounts[0] || [])) {
    const k = String(r.lead_id)
    callTotals.set(k, (callTotals.get(k) || 0) + Number(r.total || 0))
  }
  for (const r of (actCounts[0] || [])) {
    const k = String(r.lead_id)
    callTotals.set(k, Math.max(callTotals.get(k) || 0, Number(r.total || 0)))
  }

  return { kserve, fmsLatest, actLatest, callTotals, firstCallDates }
}

async function loadFollowups(pool: any, leadId: string, mobile = '') {
  const items: any[] = []
  try {
    const [rows]: any = await pool.query(
      `SELECT latest_called_at, created_at, planned_date,
              Assign_To_MR_Main_Agent_Name AS agent_name, agent_Id, Full_Disposition, Call_Notes, Remarks_History,
              call_Count, sheet_name, Transfer_To, Call_Type, HangUp_Reason, latest_recording_url,
              call_recording_duration, lead_priority
         FROM followup_activity
        WHERE lead_id = ?
        ORDER BY sl_no DESC
        LIMIT 50`,
      [leadId]
    )
    for (const fu of rows) {
      items.push({
        callDate: safeDate(fu.latest_called_at || fu.created_at || fu.planned_date),
        agentName: safeStr(fu.agent_name || fu.sheet_name),
        agentId: safeStr(fu.agent_Id),
        disposition: safeStr(fu.Full_Disposition),
        callNotes: safeStr(fu.Call_Notes || fu.Remarks_History),
        callCount: fu.call_Count ? Number(fu.call_Count) : undefined,
        callType: safeStr(fu.Call_Type),
        hangupReason: safeStr(fu.HangUp_Reason),
        recordingUrl: safeStr(fu.latest_recording_url),
        duration: safeStr(fu.call_recording_duration),
        priority: safeStr(fu.lead_priority),
        plannedDate: safeDate(fu.planned_date),
        transferTo: safeStr(fu.Transfer_To),
        source: 'activity',
      })
    }
  } catch (err) {
    console.warn('[lead-journey] followup_activity lookup skipped:', err instanceof Error ? err.message : err)
  }

  // Check lead_fms table for calling records
  try {
    const queries = [
      pool.query(
        `SELECT actual_time, Date_Time, Timestamp, created_at, planned_date,
                Assign_To_MR_Main_Agent_Name AS agent_name, agent_Id, Full_Disposition, Call_Notes, Remarks_History,
                call_Count, sheet_name, Transfer_To, Call_Type, HangUp_Reason, latest_recording_url,
                call_recording_duration, lead_priority, lead_category
           FROM lead_fms
          WHERE lead_id = ?
          ORDER BY sl_no DESC
          LIMIT 50`,
        [leadId]
      )
    ]
    if (mobile) {
      queries.push(
        pool.query(
          `SELECT actual_time, Date_Time, Timestamp, created_at, planned_date,
                  Assign_To_MR_Main_Agent_Name AS agent_name, agent_Id, Full_Disposition, Call_Notes, Remarks_History,
                  call_Count, sheet_name, Transfer_To, Call_Type, HangUp_Reason, latest_recording_url,
                  call_recording_duration, lead_priority, lead_category
             FROM lead_fms
            WHERE Mobile = ?
            ORDER BY sl_no DESC
            LIMIT 50`,
          [mobile]
        )
      )
    }

    const fmsResults = await Promise.all(queries)
    for (const res of fmsResults) {
      const fmsRows: any[] = res[0] || []
      for (const f of fmsRows) {
        const callDate = safeDate(f.actual_time || f.Timestamp || f.Date_Time || f.created_at)
        if (!items.some(it => it.callDate === callDate && it.disposition === safeStr(f.Full_Disposition))) {
          items.push({
            callDate,
            agentName: safeStr(f.agent_name || f.sheet_name),
            agentId: safeStr(f.agent_Id),
            disposition: safeStr(f.Full_Disposition),
            callNotes: safeStr(f.Call_Notes || f.Remarks_History),
            callCount: f.call_Count ? Number(f.call_Count) : undefined,
            callType: safeStr(f.Call_Type),
            hangupReason: safeStr(f.HangUp_Reason),
            recordingUrl: safeStr(f.latest_recording_url),
            duration: safeStr(f.call_recording_duration),
            priority: safeStr(f.lead_priority),
            plannedDate: safeDate(f.planned_date),
            transferTo: safeStr(f.Transfer_To),
            source: 'lead_fms',
          })
        }
      }
    }
  } catch (err) {
    console.warn('[lead-journey] lead_fms lookup skipped:', err instanceof Error ? err.message : err)
  }

  // Sort ascending by callDate so chronological order is clear (Call #1 -> Call #2 -> Call #3)
  items.sort((a, b) => new Date(a.callDate).getTime() - new Date(b.callDate).getTime())
  return items
}

// staging_buffer_new can hold several rows per lead; the newest row wins.
function newestPerLead(rows: any[]) {
  const seen = new Set<string>()
  return rows.filter(r => {
    const id = String(r.lead_id)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

async function toJourneys(pool: any, rows: any[], withFollowups: boolean) {
  const leadIds = rows.map(r => String(r.lead_id))
  const mobiles = rows.map(r => String(r.Mobile || ''))
  const { kserve, fmsLatest, actLatest, callTotals, firstCallDates } = await loadBulkEnrichment(pool, leadIds, mobiles)

  const results = []
  for (const row of rows) {
    const leadId = safeStr(row.lead_id)
    const mobile = safeStr(row.Mobile)
    const altMobile = safeStr(row.Phone_Number_of_User)
    const followups = withFollowups ? await loadFollowups(pool, leadId, mobile) : []

    const k = kserve.get(leadId)
    const fms = fmsLatest.get(leadId) || (mobile ? fmsLatest.get(mobile) : null)
    const act = actLatest.get(leadId)

    const isDirectRoute = !k?.calculated_qualification_status && !k?.assigned_mr && !k?.date_time && !k?.final_call_status
    const routingType = isDirectRoute ? 'Direct Route (Bypassed KServe)' : 'KServe Route'

    const lastFu = followups.length > 0 ? followups[followups.length - 1] : null

    // Determine latest followup call date, agent, and disposition
    let latestCallDate = lastFu?.callDate || ''
    let latestCallAgent = lastFu?.agentName || ''
    let latestCallDisp = lastFu?.disposition || ''

    if (!latestCallDisp) {
      if (fms && act) {
        const fmsTime = new Date(fms.callDate).getTime()
        const actTime = new Date(act.callDate).getTime()
        if (fmsTime >= actTime) {
          latestCallDate = safeDate(fms.callDate)
          latestCallAgent = safeStr(fms.Assign_To_MR_Main_Agent_Name)
          latestCallDisp = safeStr(fms.Full_Disposition)
        } else {
          latestCallDate = safeDate(act.callDate)
          latestCallAgent = safeStr(act.Assign_To_MR_Main_Agent_Name)
          latestCallDisp = safeStr(act.Full_Disposition)
        }
      } else if (fms) {
        latestCallDate = safeDate(fms.callDate)
        latestCallAgent = safeStr(fms.Assign_To_MR_Main_Agent_Name)
        latestCallDisp = safeStr(fms.Full_Disposition)
      } else if (act) {
        latestCallDate = safeDate(act.callDate)
        latestCallAgent = safeStr(act.Assign_To_MR_Main_Agent_Name)
        latestCallDisp = safeStr(act.Full_Disposition)
      }
    }

    // Determine finalStatus hierarchy:
    // 1. Dialer (lead_fms) or App Sheet activity (followup_activity) latest disposition
    // 2. Dialer converted / sales status (Order_Sales_Saved_Staus, Lead_Conversion)
    // 3. KServe received status (final_call_status, calculated_qualification_status, final_lead_outcome, call_outcome)
    // 4. App Sheet staging status (Enquiry_Status_Last, staging_status)
    // 5. Blank if new lead with no communication
    let finalStatus = ''
    if (latestCallDisp) {
      finalStatus = latestCallDisp
    } else if (fms?.Order_Sales_Saved_Staus || fms?.Lead_Conversion) {
      finalStatus = safeStr(fms.Order_Sales_Saved_Staus || fms.Lead_Conversion)
    } else if (k?.final_call_status || k?.calculated_qualification_status || k?.final_lead_outcome || k?.call_outcome) {
      finalStatus = safeStr(k.final_call_status || k.calculated_qualification_status || k.final_lead_outcome || k.call_outcome)
    } else if (row.Enquiry_Status_Last || row.staging_status) {
      finalStatus = safeStr(row.Enquiry_Status_Last || row.staging_status)
    }

    const currentHolder = latestCallAgent || safeStr(row.assigned_to) || safeStr(k?.assigned_mr)
    const latestDisposition = latestCallDisp || finalStatus
    const conversionAmount = safeFloat(row.Converted_Amount || fms?.Conversion_Amount)
    const totalFollowups = Math.max(callTotals.get(leadId) || 0, followups.length)
    const enquiryDate = safeDate(row.enquiry_date || row.buffer_arrival)
    const bufferArrival = safeDate(row.buffer_arrival)
    const assignedDate = safeDate(row.assigned_date || row.sent_status)
    const convertedDate = safeDate(row.converted_date)
    const firstCallIso =
      (followups.length > 0 ? followups[0].callDate : '') ||
      firstCallDates.get(leadId) ||
      (mobile ? firstCallDates.get(mobile) || '' : '')
    const { tatMinutes, tatLabel, tatStage } = computeLeadTat(enquiryDate || bufferArrival, firstCallIso, assignedDate)
    const leadStatus = deriveLeadStatus({
      finalStatus,
      conversionAmount,
      convertedDate,
      totalFollowups,
      kserveStatus: safeStr(k?.calculated_qualification_status),
    })
    const salesPerson = latestCallAgent || safeStr(row.assigned_to) || safeStr(k?.assigned_mr)

    results.push({
      leadId,
      clientName: safeStr(row.Name_of_Client),
      mobile,
      altMobile: altMobile && altMobile !== mobile ? altMobile : '',
      email: safeStr(row.Email_Id),
      enquiryDate,
      bufferArrival,
      dataSource: safeStr(row.Data_Source),
      verifiedSource: safeStr(row.Verified_Source),
      leadSource: safeStr(row.Verified_Source || row.Data_Source),
      category: safeStr(row.Lead_Category),
      company: normalizeCompany(row.Lead_Relates_to_which_company, row.KAPPL_KTAHV),
      companyRaw: safeStr(row.Lead_Relates_to_which_company || row.KAPPL_KTAHV),
      assignedTo: safeStr(row.assigned_to),
      salesPerson,
      currentHolder,
      assignedDate,
      assignReason: safeStr(row.assign_reason),
      isDirectRoute,
      routingType,
      kserveStatus: safeStr(k?.calculated_qualification_status),
      kserveRoute: routingType,
      kserveAgentName: safeStr(k?.assigned_mr),
      kserveDisposition: safeStr(k?.final_call_status),
      qualificationStatus: safeStr(k?.calculated_qualification_status),
      stagingDate: safeDate(k?.date_time),
      finalStatus,
      leadStatus,
      latestDisposition,
      tatMinutes,
      tatLabel,
      tatStage,
      conversionAmount,
      convertedDate,
      lastFollowupDate: latestCallDate || (k?.date_time ? safeDate(k.date_time) : ''),
      totalFollowups,
      followups,
    })
  }
  return results
}

export async function fetchLeadJourney(pool: any, q: string) {
  const qtype = detectQueryType(q)
  let where: string
  let params: any[]
  if (qtype === 'phone') { where = 'mb.Mobile IN (?)'; params = [phoneVariants(q)] }
  else if (qtype === 'email') { where = 'mb.Email_Id = ?'; params = [q] }
  else if (qtype === 'leadId') { where = 'mb.lead_id = ?'; params = [q] }
  else { where = 'mb.Name_of_Client LIKE ?'; params = [`%${q}%`] }

  const [rows]: any = await pool.query(
    `${JOURNEY_SELECT} WHERE ${where} ORDER BY mb.Date_Time DESC, sbn.sl_no DESC LIMIT 100`,
    params
  )
  return toJourneys(pool, newestPerLead(rows).slice(0, 50), true)
}

export async function fetchBulkLeadJourneys(pool: any, ids: string[]) {
  const safeIds = [...new Set(ids.slice(0, 200).map(id => id.trim()).filter(Boolean))]
  if (!safeIds.length) return []
  const [rows]: any = await pool.query(
    `${JOURNEY_SELECT} WHERE mb.lead_id IN (?) ORDER BY COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time) DESC, sbn.sl_no DESC`,
    [safeIds]
  )
  return toJourneys(pool, newestPerLead(rows), false)
}

export interface DateFilterOptions {
  preset?: 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth' | 'custom'
  startDate?: string
  endDate?: string
  company?: string
  datasource?: string
  page?: number
  limit?: number
}

export interface KpiMetric {
  current: number
  previous: number
  delta: number
  pctChange: number
}

export interface LeadKpiSummary {
  comparisonLabel: string
  totalLeads: KpiMetric
  assignedLeads: KpiMetric
  contactedLeads: KpiMetric
  untouchedLeads: KpiMetric
  convertedLeads: KpiMetric
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return dt.toISOString().slice(0, 10)
}

function getIstDates() {
  const now = new Date()
  const toIstYmd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  
  const today = toIstYmd(now)
  const yesterday = addDaysYmd(today, -1)
  const dayBeforeYesterday = addDaysYmd(today, -2)
  const last7DaysStart = addDaysYmd(today, -6)
  const prev7DaysEnd = addDaysYmd(last7DaysStart, -1)
  const prev7DaysStart = addDaysYmd(prev7DaysEnd, -6)

  const thisMonthStart = today.slice(0, 7) + '-01'

  const parts = today.split('-')
  const curDay = parseInt(parts[2], 10)
  let lmYear = parseInt(parts[0], 10)
  let lmMonth = parseInt(parts[1], 10) - 1
  if (lmMonth === 0) { lmMonth = 12; lmYear -= 1 }
  const lmMonthStr = String(lmMonth).padStart(2, '0')
  const lastMonthStart = `${lmYear}-${lmMonthStr}-01`
  const lastDayOfLm = new Date(lmYear, lmMonth, 0).getDate()
  const lastMonthEnd = `${lmYear}-${lmMonthStr}-${String(lastDayOfLm).padStart(2, '0')}`
  const lastMonthSameDay = `${lmYear}-${lmMonthStr}-${String(Math.min(curDay, lastDayOfLm)).padStart(2, '0')}`

  let pmYear = lmYear
  let pmMonth = lmMonth - 1
  if (pmMonth === 0) { pmMonth = 12; pmYear -= 1 }
  const pmMonthStr = String(pmMonth).padStart(2, '0')
  const prevMonthStart = `${pmYear}-${pmMonthStr}-01`
  const lastDayOfPm = new Date(pmYear, pmMonth, 0).getDate()
  const prevMonthEnd = `${pmYear}-${pmMonthStr}-${String(lastDayOfPm).padStart(2, '0')}`

  return {
    today,
    yesterday,
    dayBeforeYesterday,
    last7DaysStart,
    prev7DaysStart,
    prev7DaysEnd,
    thisMonthStart,
    lastMonthStart,
    lastMonthEnd,
    lastMonthSameDay,
    prevMonthStart,
    prevMonthEnd,
  }
}

export function buildDateWhereClause(options: DateFilterOptions): { whereSql: string; params: any[] } {
  const preset = options.preset || 'today'
  const timeExpr = "DATE(CONVERT_TZ(COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time), '+00:00', '+05:30'))"
  const { today, yesterday, last7DaysStart, thisMonthStart, lastMonthStart, lastMonthEnd } = getIstDates()

  if (preset === 'yesterday') {
    return { whereSql: `${timeExpr} = ?`, params: [yesterday] }
  }
  if (preset === 'last7days') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [last7DaysStart, today] }
  }
  if (preset === 'thisMonth') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [thisMonthStart, today] }
  }
  if (preset === 'lastMonth') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [lastMonthStart, lastMonthEnd] }
  }
  if (preset === 'custom' && options.startDate && options.endDate) {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [options.startDate, options.endDate] }
  }
  return { whereSql: `${timeExpr} = ?`, params: [today] }
}

export function buildPreviousDateWhereClause(options: DateFilterOptions): { whereSql: string; params: any[]; comparisonLabel: string } {
  const preset = options.preset || 'today'
  const timeExpr = "DATE(CONVERT_TZ(COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time), '+00:00', '+05:30'))"
  const d = getIstDates()

  if (preset === 'yesterday') {
    return { whereSql: `${timeExpr} = ?`, params: [d.dayBeforeYesterday], comparisonLabel: 'vs Day Before' }
  }
  if (preset === 'last7days') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [d.prev7DaysStart, d.prev7DaysEnd], comparisonLabel: 'vs Prev 7 Days' }
  }
  if (preset === 'thisMonth') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [d.lastMonthStart, d.lastMonthSameDay], comparisonLabel: 'vs Last Month (MTD)' }
  }
  if (preset === 'lastMonth') {
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [d.prevMonthStart, d.prevMonthEnd], comparisonLabel: 'vs Prior Month' }
  }
  if (preset === 'custom' && options.startDate && options.endDate) {
    const s = new Date(options.startDate + 'T00:00:00Z').getTime()
    const e = new Date(options.endDate + 'T00:00:00Z').getTime()
    const spanDays = Math.max(0, Math.round((e - s) / 86400000))
    const prevEnd = addDaysYmd(options.startDate, -1)
    const prevStart = addDaysYmd(prevEnd, -spanDays)
    return { whereSql: `${timeExpr} BETWEEN ? AND ?`, params: [prevStart, prevEnd], comparisonLabel: 'vs Prev Period' }
  }
  return { whereSql: `${timeExpr} = ?`, params: [d.yesterday], comparisonLabel: 'vs Yesterday' }
}

function makeKpiMetric(current: number, previous: number): KpiMetric {
  const delta = current - previous
  let pctChange = 0
  if (previous > 0) {
    pctChange = Math.round(((current - previous) / previous) * 1000) / 10
  } else if (current > 0) {
    pctChange = 100
  }
  return { current, previous, delta, pctChange }
}

async function fetchPeriodCounts(
  pool: any,
  whereSql: string,
  params: any[],
  companyCode: string,
  datasourceFilter: string
): Promise<{ totalLeads: number; assignedLeads: number; contactedLeads: number; convertedLeads: number }> {
  const companyFilterSql = companyCode !== 'ALL' ? ` AND (${COMPANY_SQL_EXPR}) = ?` : ''
  const dsFilterSql = datasourceFilter !== 'ALL' ? ` AND (${DATASOURCE_SQL_EXPR}) = ?` : ''
  const queryParams = [
    ...params,
    ...(companyCode !== 'ALL' ? [companyCode] : []),
    ...(datasourceFilter !== 'ALL' ? [datasourceFilter] : []),
  ]
  try {
    const [rows]: any = await pool.query(
      `SELECT
        COUNT(DISTINCT mb.lead_id) AS totalLeads,
        COUNT(DISTINCT CASE WHEN COALESCE(sbn.Assign_To_MR_Main, '') != '' THEN mb.lead_id END) AS assignedLeads,
        COUNT(DISTINCT CASE
          WHEN COALESCE(sbn.Enquiry_Status_Last, '') != ''
            OR COALESCE(sbn.status, '') != ''
            OR EXISTS (SELECT 1 FROM lead_fms f WHERE f.lead_id = (mb.lead_id COLLATE utf8mb4_unicode_ci) LIMIT 1)
            OR EXISTS (SELECT 1 FROM followup_activity fa WHERE fa.lead_id = mb.lead_id LIMIT 1)
          THEN mb.lead_id END) AS contactedLeads,
        COUNT(DISTINCT CASE
          WHEN COALESCE(sbn.Converted_Amount, 0) > 0
            OR COALESCE(sbn.Converted_Date, '') != ''
            OR LOWER(COALESCE(sbn.Enquiry_Status_Last, '')) LIKE '%convert%'
            OR LOWER(COALESCE(sbn.Enquiry_Status_Last, '')) LIKE '%order%'
            OR LOWER(COALESCE(sbn.Enquiry_Status_Last, '')) LIKE '%book%'
          THEN mb.lead_id END) AS convertedLeads
       FROM master_buffer mb
       LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
       WHERE ${whereSql}${companyFilterSql}${dsFilterSql}`,
      queryParams
    )
    const r = rows[0] || {}
    return {
      totalLeads: Number(r.totalLeads || 0),
      assignedLeads: Number(r.assignedLeads || 0),
      contactedLeads: Number(r.contactedLeads || 0),
      convertedLeads: Number(r.convertedLeads || 0),
    }
  } catch (err: any) {
    console.warn('[lead-journey] KPI count error:', err?.message || err)
    return { totalLeads: 0, assignedLeads: 0, contactedLeads: 0, convertedLeads: 0 }
  }
}

export async function fetchLeadsByDateRange(pool: any, options: DateFilterOptions = {}) {
  const page = Math.max(1, Number(options.page) || 1)
  const limit = Math.min(200, Math.max(10, Number(options.limit) || 50))
  const offset = (page - 1) * limit
  const companyCode = normalizeCompanyFilter(options.company)
  const rawDs = (options.datasource || '').trim()
  const datasourceFilter = !rawDs || rawDs.toUpperCase() === 'ALL' ? 'ALL' : rawDs

  const { whereSql, params } = buildDateWhereClause(options)
  const prev = buildPreviousDateWhereClause(options)

  const companyJoinSql = companyCode !== 'ALL' ? 'INNER JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id' : ''
  const companyWhereSql = companyCode !== 'ALL' ? ` AND (${COMPANY_SQL_EXPR}) = ?` : ''
  const dsWhereSql = datasourceFilter !== 'ALL' ? ` AND (${DATASOURCE_SQL_EXPR}) = ?` : ''

  const scopeParams = [...params, ...(companyCode !== 'ALL' ? [companyCode] : [])]
  const listParams = [...scopeParams, ...(datasourceFilter !== 'ALL' ? [datasourceFilter] : [])]

  const [currentCounts, prevCounts, idQueryRes, dsOptionsRes] = await Promise.all([
    fetchPeriodCounts(pool, whereSql, params, companyCode, datasourceFilter),
    fetchPeriodCounts(pool, prev.whereSql, prev.params, companyCode, datasourceFilter),
    pool.query(
      `SELECT DISTINCT mb.lead_id, COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time) AS sort_dt
         FROM master_buffer mb
         ${companyJoinSql}
        WHERE ${whereSql}${companyWhereSql}${dsWhereSql}
        ORDER BY sort_dt DESC
        LIMIT ? OFFSET ?`,
      [...listParams, limit, offset]
    ),
    pool.query(
      `SELECT ${DATASOURCE_SQL_EXPR} AS src, COUNT(DISTINCT mb.lead_id) AS cnt
         FROM master_buffer mb
         ${companyJoinSql}
        WHERE ${whereSql}${companyWhereSql}
        GROUP BY src
        HAVING src IS NOT NULL AND src != ''
        ORDER BY cnt DESC
        LIMIT 50`,
      scopeParams
    ).catch((err: any) => {
      console.warn('[lead-journey] datasource options error:', err?.message || err)
      return [[]]
    }),
  ])

  const total = currentCounts.totalLeads
  const idRows: any[] = idQueryRes[0] || []
  const ids = idRows.map((r: any) => String(r.lead_id))
  const results = ids.length > 0 ? await fetchBulkLeadJourneys(pool, ids) : []
  const availableDatasources: string[] = (dsOptionsRes[0] || [])
    .map((r: any) => safeStr(r.src).trim())
    .filter(Boolean)

  const kpi: LeadKpiSummary = {
    comparisonLabel: prev.comparisonLabel,
    totalLeads: makeKpiMetric(currentCounts.totalLeads, prevCounts.totalLeads),
    assignedLeads: makeKpiMetric(currentCounts.assignedLeads, prevCounts.assignedLeads),
    contactedLeads: makeKpiMetric(currentCounts.contactedLeads, prevCounts.contactedLeads),
    untouchedLeads: makeKpiMetric(
      Math.max(0, currentCounts.totalLeads - currentCounts.contactedLeads),
      Math.max(0, prevCounts.totalLeads - prevCounts.contactedLeads)
    ),
    convertedLeads: makeKpiMetric(currentCounts.convertedLeads, prevCounts.convertedLeads),
  }

  return {
    results,
    totalCount: total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    company: companyCode,
    datasource: datasourceFilter,
    availableDatasources,
    kpi,
  }
}

export async function fetchTodayLeadJourneys(pool: any) {
  const { results } = await fetchLeadsByDateRange(pool, { preset: 'today', page: 1, limit: 50 })
  return results
}
