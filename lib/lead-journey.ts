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

const JOURNEY_SELECT = `
  SELECT
    mb.lead_id,
    mb.Name_of_Client,
    mb.Mobile,
    mb.Email_Id,
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
}

async function loadBulkEnrichment(pool: any, leadIds: string[], mobiles: string[]): Promise<BulkLeadEnrichment> {
  const kserve = new Map<string, any>()
  const fmsLatest = new Map<string, any>()
  const actLatest = new Map<string, any>()
  const callTotals = new Map<string, number>()

  if (!leadIds.length) return { kserve, fmsLatest, actLatest, callTotals }

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
  }

  // Populate FMS Latest (newest row per lead_id wins)
  for (const r of (fmsIdRows[0] || [])) {
    const k = String(r.lead_id)
    if (!fmsLatest.has(k)) fmsLatest.set(k, r)
  }

  // Then by Mobile if not already present
  for (const r of (fmsMobRows[0] || [])) {
    const mobKey = String(r.Mobile || '').trim()
    const idKey = String(r.lead_id || '')
    if (mobKey && !fmsLatest.has(mobKey)) fmsLatest.set(mobKey, r)
    if (idKey && !fmsLatest.has(idKey)) fmsLatest.set(idKey, r)
  }

  // Populate Activity Latest
  for (const r of (actRows[0] || [])) {
    const k = String(r.lead_id)
    if (!actLatest.has(k)) actLatest.set(k, r)
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

  return { kserve, fmsLatest, actLatest, callTotals }
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
  const { kserve, fmsLatest, actLatest, callTotals } = await loadBulkEnrichment(pool, leadIds, mobiles)

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

    results.push({
      leadId,
      clientName: safeStr(row.Name_of_Client),
      mobile,
      altMobile: altMobile && altMobile !== mobile ? altMobile : '',
      email: safeStr(row.Email_Id),
      bufferArrival: safeDate(row.buffer_arrival),
      leadSource: safeStr(row.Verified_Source || row.Data_Source),
      category: safeStr(row.Lead_Category),
      company: safeStr(row.KAPPL_KTAHV || row.Lead_Relates_to_which_company),
      assignedTo: safeStr(row.assigned_to),
      currentHolder,
      assignedDate: safeDate(row.assigned_date || row.sent_status),
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
      latestDisposition,
      conversionAmount,
      convertedDate: safeDate(row.converted_date),
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
  page?: number
  limit?: number
}

function getIstDates() {
  const now = new Date()
  const toIstYmd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  
  const today = toIstYmd(now)
  
  const yDate = new Date(now)
  yDate.setDate(yDate.getDate() - 1)
  const yesterday = toIstYmd(yDate)

  const d7 = new Date(now)
  d7.setDate(d7.getDate() - 7)
  const last7DaysStart = toIstYmd(d7)

  const thisMonthStart = today.slice(0, 7) + '-01'

  const parts = today.split('-')
  let lmYear = parseInt(parts[0], 10)
  let lmMonth = parseInt(parts[1], 10) - 1
  if (lmMonth === 0) { lmMonth = 12; lmYear -= 1 }
  const lmMonthStr = String(lmMonth).padStart(2, '0')
  const lastMonthStart = `${lmYear}-${lmMonthStr}-01`
  const lastDayOfLm = new Date(lmYear, lmMonth, 0).getDate()
  const lastMonthEnd = `${lmYear}-${lmMonthStr}-${String(lastDayOfLm).padStart(2, '0')}`

  return { today, yesterday, last7DaysStart, thisMonthStart, lastMonthStart, lastMonthEnd }
}

export function buildDateWhereClause(options: DateFilterOptions): { whereSql: string; params: any[] } {
  const preset = options.preset || 'today'
  const timeExpr = "DATE(CONVERT_TZ(COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time), '+00:00', '+05:30'))"
  const { today, yesterday, last7DaysStart, thisMonthStart, lastMonthStart, lastMonthEnd } = getIstDates()

  if (preset === 'yesterday') {
    return {
      whereSql: `${timeExpr} = ?`,
      params: [yesterday]
    }
  }

  if (preset === 'last7days') {
    return {
      whereSql: `${timeExpr} BETWEEN ? AND ?`,
      params: [last7DaysStart, today]
    }
  }

  if (preset === 'thisMonth') {
    return {
      whereSql: `${timeExpr} BETWEEN ? AND ?`,
      params: [thisMonthStart, today]
    }
  }

  if (preset === 'lastMonth') {
    return {
      whereSql: `${timeExpr} BETWEEN ? AND ?`,
      params: [lastMonthStart, lastMonthEnd]
    }
  }

  if (preset === 'custom' && options.startDate && options.endDate) {
    return {
      whereSql: `${timeExpr} BETWEEN ? AND ?`,
      params: [options.startDate, options.endDate]
    }
  }

  // Default: today
  return {
    whereSql: `${timeExpr} = ?`,
    params: [today]
  }
}

export async function fetchLeadsByDateRange(pool: any, options: DateFilterOptions = {}) {
  const page = Math.max(1, Number(options.page) || 1)
  const limit = Math.min(200, Math.max(10, Number(options.limit) || 50))
  const offset = (page - 1) * limit

  const { whereSql, params } = buildDateWhereClause(options)

  const [cntRows]: any = await pool.query(
    `SELECT COUNT(*) as total FROM master_buffer mb WHERE ${whereSql}`,
    params
  )
  const total = Number(cntRows[0]?.total || 0)

  let idRows: any[] = []
  if (total > 0) {
    const [rows]: any = await pool.query(
      `SELECT mb.lead_id 
         FROM master_buffer mb 
        WHERE ${whereSql} 
        ORDER BY COALESCE(mb.actual_time, mb.Timestamp, mb.Date_Time) DESC 
        LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    idRows = rows
  }

  const ids = idRows.map((r: any) => String(r.lead_id))
  const results = ids.length > 0 ? await fetchBulkLeadJourneys(pool, ids) : []

  return {
    results,
    totalCount: total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  }
}

export async function fetchTodayLeadJourneys(pool: any) {
  const { results } = await fetchLeadsByDateRange(pool, { preset: 'today', page: 1, limit: 50 })
  return results
}
