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
    mb.Date_Time            AS buffer_arrival,
    mb.Data_Source,
    mb.Verified_Source,
    sbn.Assign_To_MR_Main   AS assigned_to,
    sbn.KAPPL_KTAHV,
    sbn.Lead_Relates_to_which_company,
    sbn.Lead_Category,
    sbn.Phone_Number_of_User,
    sbn.Enquiry_Status_Last,
    sbn.status              AS staging_status,
    sbn.Converted_Amount
  FROM master_buffer mb
  LEFT JOIN staging_buffer_new sbn ON sbn.Lead_id = mb.lead_id
`

async function loadKserve(pool: any, leadIds: string[]) {
  const byLead = new Map<string, any>()
  if (!leadIds.length) return byLead
  try {
    const [rows]: any = await pool.query(
      `SELECT lead_id, calculated_qualification_status, assigned_mr, final_call_status, date_time
         FROM ai_voice_leads_received
        WHERE lead_id IN (?)
        ORDER BY id DESC`,
      [leadIds]
    )
    for (const r of rows) if (!byLead.has(String(r.lead_id))) byLead.set(String(r.lead_id), r)
  } catch (err) {
    // KServe details are optional; a lead simply shows as "Direct Route" without them.
    console.warn('[lead-journey] KServe lookup skipped:', err instanceof Error ? err.message : err)
  }
  return byLead
}

async function loadFollowupStats(pool: any, leadIds: string[]) {
  const stats = new Map<string, number>()
  if (!leadIds.length) return stats
  const [rows]: any = await pool.query(
    'SELECT lead_id, COUNT(*) AS total FROM followup_activity WHERE lead_id IN (?) GROUP BY lead_id',
    [leadIds]
  )
  for (const r of rows) stats.set(String(r.lead_id), Number(r.total))
  return stats
}

async function loadFollowups(pool: any, leadId: string) {
  try {
    const [rows]: any = await pool.query(
      `SELECT latest_called_at, created_at, planned_date,
              Assign_To_MR_Main_Agent_Name AS agent_name, Full_Disposition, Call_Notes, call_Count, sheet_name
         FROM followup_activity
        WHERE lead_id = ?
        ORDER BY sl_no DESC
        LIMIT 50`,
      [leadId]
    )
    return rows.map((fu: any) => ({
      callDate: safeDate(fu.latest_called_at || fu.created_at || fu.planned_date),
      agentName: safeStr(fu.agent_name || fu.sheet_name),
      disposition: safeStr(fu.Full_Disposition),
      callNotes: safeStr(fu.Call_Notes),
      callCount: fu.call_Count ? Number(fu.call_Count) : undefined,
    }))
  } catch (err) {
    console.warn('[lead-journey] follow-up lookup skipped:', err instanceof Error ? err.message : err)
    return []
  }
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
  const [kserve, totals] = await Promise.all([loadKserve(pool, leadIds), loadFollowupStats(pool, leadIds)])

  const results = []
  for (const row of rows) {
    const leadId = safeStr(row.lead_id)
    const followups = withFollowups ? await loadFollowups(pool, leadId) : []
    const k = kserve.get(leadId)
    const mobile = safeStr(row.Mobile)
    const altMobile = safeStr(row.Phone_Number_of_User)
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
      kserveStatus: safeStr(k?.calculated_qualification_status),
      kserveRoute: '',
      kserveAgentName: safeStr(k?.assigned_mr),
      kserveDisposition: safeStr(k?.final_call_status),
      qualificationStatus: safeStr(k?.calculated_qualification_status),
      stagingDate: safeDate(k?.date_time),
      finalStatus: safeStr(row.Enquiry_Status_Last || row.staging_status),
      conversionAmount: safeFloat(row.Converted_Amount),
      lastFollowupDate: followups[0]?.callDate || '',
      totalFollowups: totals.get(leadId) ?? followups.length,
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
    `${JOURNEY_SELECT} WHERE mb.lead_id IN (?) ORDER BY mb.Date_Time DESC, sbn.sl_no DESC`,
    [safeIds]
  )
  return toJourneys(pool, newestPerLead(rows), false)
}
