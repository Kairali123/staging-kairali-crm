/**
 * LeadGuard Lead Lost Monitor — SQL query library
 *
 * Data source: ai_voice_leads_sent (sent) vs ai_voice_leads_received (returned)
 * A lead is "lost" when it was sent to KServe but never returned (no matching
 * row in ai_voice_leads_received) and the send date is older than `lostDays`.
 *
 * This lib provides:
 *   - leadLostParams()          — validate & build SQL param array
 *   - LeadLostRow               — row type for the detail table
 *   - LeadLostSummaryRow        — row type for the aggregation table
 *   - LEAD_LOST_DETAIL_QUERY    — full lost-lead detail (name, mobile, company …)
 *   - LEAD_LOST_AGGREGATE_QUERY — grouped summary (by company / source)
 *   - LEAD_LOST_DIAGNOSTICS_QUERY — row counts and date bounds
 */

function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date format — use YYYY-MM-DD')
  const d = new Date(date + 'T00:00:00Z')
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== date)
    throw new Error('Invalid date value')
}

const ALLOWED_COMPANIES = ['ALL', 'KTAHV', 'KAPPL', 'VILLARAAG'] as const
const ALLOWED_SOURCES = ['ALL'] as const // dynamic — we filter client-side or pass 'ALL'

export function leadLostParams(
  from: string,
  to: string,
  company: string,
  lostDays: number
): [string, string, string, string, number] {
  validateDate(from)
  validateDate(to)
  if (from > to) throw new Error('from must not be after to')
  const daySpan = (Date.parse(to) - Date.parse(from)) / 86_400_000
  if (daySpan > 93) throw new Error('Date range must be 93 days or less')
  const co = ALLOWED_COMPANIES.includes(company as any) ? company : 'ALL'
  const safeLostDays = Number.isFinite(lostDays) && lostDays > 0 ? Math.floor(lostDays) : 5
  // to is inclusive end-of-day — add one day for SQL range
  const toExclusive = new Date(Date.parse(to) + 86_400_000).toISOString().slice(0, 10)
  return [from, toExclusive, co, co, safeLostDays]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadLostRow {
  id: string
  name_of_client: string
  mobile: string
  email_id: string
  subjects: string
  company: string
  data_source: string
  campaign_name: string
  sent_date: string // ISO datetime string
  days_pending: number
}

export interface LeadLostSummaryRow {
  company: string
  data_source: string
  total_sent: number
  total_received: number
  total_lost: number
  loss_rate: number // 0–100
}

export interface LeadLostDiagnostics {
  total_sent: number
  total_received: number
  total_lost: number
  first_sent: string | null
  last_sent: string | null
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Full detail of lost leads (sent but NOT received, older than lostDays).
 * Params: [from, toExclusive, company, company, lostDays]
 */
export const LEAD_LOST_DETAIL_QUERY = `
  SELECT
    s.enquiry_id          AS id,
    s.name_of_client,
    s.mobile,
    s.email_id,
    s.subjects,
    s.website_name        AS company,
    s.data_source,
    COALESCE(s.campaign_name, '') AS campaign_name,
    s.generate_timestamp  AS sent_date,
    DATEDIFF(NOW(), s.generate_timestamp) AS days_pending
  FROM ai_voice_leads_sent s
  LEFT JOIN ai_voice_leads_received r ON s.enquiry_id = r.initial_id
  WHERE r.initial_id IS NULL
    AND s.generate_timestamp >= ?
    AND s.generate_timestamp <  ?
    AND (? = 'ALL' OR s.website_name = ?)
    AND DATEDIFF(NOW(), s.generate_timestamp) >= ?
  ORDER BY s.generate_timestamp DESC
  LIMIT 2000
`

/**
 * Aggregated summary: sent vs received vs lost, grouped by company + data_source.
 * Params: [from, toExclusive, company, company, lostDays]
 */
export const LEAD_LOST_AGGREGATE_QUERY = `
  SELECT
    COALESCE(NULLIF(TRIM(s.website_name), ''), 'Unattributed')  AS company,
    COALESCE(NULLIF(TRIM(s.data_source), ''), 'Unattributed')   AS data_source,
    COUNT(*)                                                      AS total_sent,
    COUNT(r.initial_id)                                           AS total_received,
    SUM(CASE WHEN r.initial_id IS NULL
             AND DATEDIFF(NOW(), s.generate_timestamp) >= ?       THEN 1 ELSE 0 END) AS total_lost
  FROM ai_voice_leads_sent s
  LEFT JOIN ai_voice_leads_received r ON s.enquiry_id = r.initial_id
  WHERE s.generate_timestamp >= ?
    AND s.generate_timestamp <  ?
    AND (? = 'ALL' OR s.website_name = ?)
  GROUP BY company, data_source
  ORDER BY total_lost DESC, total_sent DESC
`

/**
 * Diagnostic counts.
 * Params: [from, toExclusive, company, company, lostDays]
 */
export const LEAD_LOST_DIAGNOSTICS_QUERY = `
  SELECT
    COUNT(*)                                                AS total_sent,
    COUNT(r.initial_id)                                     AS total_received,
    SUM(CASE WHEN r.initial_id IS NULL
             AND DATEDIFF(NOW(), s.generate_timestamp) >= ? THEN 1 ELSE 0 END) AS total_lost,
    MIN(s.generate_timestamp)                               AS first_sent,
    MAX(s.generate_timestamp)                               AS last_sent
  FROM ai_voice_leads_sent s
  LEFT JOIN ai_voice_leads_received r ON s.enquiry_id = r.initial_id
  WHERE s.generate_timestamp >= ?
    AND s.generate_timestamp <  ?
    AND (? = 'ALL' OR s.website_name = ?)
`
