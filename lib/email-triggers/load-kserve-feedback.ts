import { getPool } from '@/lib/db'
import {
  getSampleKserveFeedback,
  type KserveFeedbackItem,
} from './templates/kserve-daily-call-audit-feedback-alert'

const CREATE_LOG_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS kserve_feedback_email_log (
  lead_id VARCHAR(191) NOT NULL PRIMARY KEY,
  row_id BIGINT NULL,
  trigger_id VARCHAR(64) NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  subject VARCHAR(255) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent',
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`

function parseFeedbackData(raw: any): {
  rating: number
  comment: string
  submittedByName?: string | null
  submittedByEmail?: string | null
  submittedById?: string | null
} {
  if (!raw) return { rating: 0, comment: '' }
  let obj: any = raw
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw)
    } catch {
      return { rating: 0, comment: raw }
    }
  }
  return {
    rating: Number(obj?.rating) || 0,
    comment: String(obj?.comment ?? '').trim(),
    submittedByName: obj?.submittedBy?.name ? String(obj.submittedBy.name) : null,
    submittedByEmail: obj?.submittedBy?.email ? String(obj.submittedBy.email) : null,
    submittedById: obj?.submittedBy?.id ? String(obj.submittedBy.id) : null,
  }
}

function mapFeedbackRow(r: any): KserveFeedbackItem {
  const parsed = parseFeedbackData(r.feedback_data)
  return {
    rowId: Number(r.id) || 0,
    leadId: String(r.lead_id || r.id || ''),
    initialId: r.initial_id ? String(r.initial_id) : null,
    clientName: r.client_name ? String(r.client_name) : null,
    mobile: r.mobile ? String(r.mobile) : null,
    email: r.email ? String(r.email) : null,
    company: r.company ? String(r.company) : null,
    companyByKserve: r.company_by_kserve ? String(r.company_by_kserve) : null,
    websiteName: r.website_name ? String(r.website_name) : null,
    dataSource: r.data_source ? String(r.data_source) : null,
    callStatus: r.call_status ? String(r.call_status) : null,
    finalCallStatus: r.final_call_status ? String(r.final_call_status) : null,
    callOutcome: r.call_outcome ? String(r.call_outcome) : null,
    finalLeadOutcome: r.final_lead_outcome ? String(r.final_lead_outcome) : null,
    callDuration: r.call_duration_sec ? String(r.call_duration_sec) : null,
    callStartTime: r.call_start_time ? String(r.call_start_time) : null,
    transcriptionViewUrl: r.transcription_view_url ? String(r.transcription_view_url) : null,
    ivrUrl: r.ivr_url ? String(r.ivr_url) : null,
    aiCallSummary: r.ai_call_summary ? String(r.ai_call_summary) : null,
    feedbackDate: r.feedback_date ? String(r.feedback_date) : null,
    rating: parsed.rating,
    comment: parsed.comment,
    submittedByName: parsed.submittedByName,
    submittedByEmail: parsed.submittedByEmail,
    submittedById: parsed.submittedById,
  }
}

/**
 * Loads all submitted voice-call feedbacks that have NOT been emailed yet.
 * Uses kserve_feedback_email_log (PRIMARY KEY lead_id) to guarantee zero repeat emails.
 */
export async function loadPendingKserveFeedbacks(options: {
  sinceDate?: string
  company?: string
  limit?: number
} = {}): Promise<KserveFeedbackItem[]> {
  const pool = await getPool()
  const conn = await pool.getConnection()
  try {
    await conn.execute(CREATE_LOG_TABLE_SQL)

    const where: string[] = [
      'a.feedback_submitted = 1',
      'a.lead_id IS NOT NULL',
      "a.lead_id <> ''",
      'l.lead_id IS NULL',
    ]
    const params: any[] = []

    if (options.sinceDate && /^\d{4}-\d{2}-\d{2}$/.test(options.sinceDate)) {
      where.push('a.feedback_date >= ?')
      params.push(`${options.sinceDate} 00:00:00`)
    }

    if (options.company && options.company !== 'All companies' && options.company !== 'ALL') {
      const normalized = options.company === 'VILARAAG' ? 'VILLARAAG' : options.company
      where.push('(UPPER(TRIM(a.company)) = ? OR UPPER(TRIM(a.company)) = ?)')
      params.push(options.company.toUpperCase(), normalized.toUpperCase())
    }

    const limit = Math.max(1, Math.min(100, Number(options.limit) || 50))

    const [rows] = await conn.execute(
      `SELECT
        a.id, a.lead_id, a.initial_id, a.client_name, a.mobile, a.email,
        a.company, a.company_by_kserve, a.website_name, a.data_source,
        a.call_status, a.final_call_status, a.call_outcome, a.final_lead_outcome,
        a.call_duration_sec, a.call_start_time, a.transcription_view_url,
        a.ivr_url, a.ai_call_summary, a.feedback_date, a.feedback_data
       FROM ai_voice_leads_received a
       LEFT JOIN kserve_feedback_email_log l ON l.lead_id = a.lead_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.feedback_date ASC, a.id ASC
       LIMIT ${limit}`,
      params
    ) as any[]

    // Deduplicate by lead_id in case ai_voice_leads_received has multiple rows for the same lead_id
    const seen = new Set<string>()
    const items: KserveFeedbackItem[] = []
    for (const r of rows || []) {
      const item = mapFeedbackRow(r)
      if (!item.leadId || seen.has(item.leadId)) continue
      seen.add(item.leadId)
      items.push(item)
    }
    return items
  } finally {
    conn.release()
  }
}

/**
 * Records a feedback lead_id as emailed immediately after provider acceptance
 * so the same feedback is NEVER emailed twice.
 */
export async function markKserveFeedbackEmailSent(
  item: KserveFeedbackItem,
  meta: { triggerId: string; recipientCount: number; subject: string }
): Promise<void> {
  const pool = await getPool()
  const conn = await pool.getConnection()
  try {
    await conn.execute(CREATE_LOG_TABLE_SQL)
    await conn.execute(
      `INSERT IGNORE INTO kserve_feedback_email_log
        (lead_id, row_id, trigger_id, recipient_count, subject, status, sent_at)
       VALUES (?, ?, ?, ?, ?, 'sent', NOW())`,
      [
        item.leadId,
        item.rowId || null,
        meta.triggerId,
        meta.recipientCount,
        meta.subject.slice(0, 250),
      ]
    )
  } finally {
    conn.release()
  }
}

/**
 * Fetches the latest submitted feedback for email template preview in Settings.
 * Falls back to a realistic sample if no row exists or DB is unavailable.
 */
export async function loadLatestKserveFeedbackForPreview(company?: string): Promise<KserveFeedbackItem> {
  try {
    const pool = await getPool()
    const conn = await pool.getConnection()
    try {
      const where: string[] = ['feedback_submitted = 1']
      const params: any[] = []
      if (company && company !== 'All companies' && company !== 'ALL') {
        const normalized = company === 'VILARAAG' ? 'VILLARAAG' : company
        where.push('(UPPER(TRIM(company)) = ? OR UPPER(TRIM(company)) = ?)')
        params.push(company.toUpperCase(), normalized.toUpperCase())
      }
      const [rows] = await conn.execute(
        `SELECT
          id, lead_id, initial_id, client_name, mobile, email,
          company, company_by_kserve, website_name, data_source,
          call_status, final_call_status, call_outcome, final_lead_outcome,
          call_duration_sec, call_start_time, transcription_view_url,
          ivr_url, ai_call_summary, feedback_date, feedback_data
         FROM ai_voice_leads_received
         WHERE ${where.join(' AND ')}
         ORDER BY feedback_date DESC, id DESC
         LIMIT 1`,
        params
      ) as any[]
      if (rows && rows.length > 0) {
        return mapFeedbackRow(rows[0])
      }
    } finally {
      conn.release()
    }
  } catch (err) {
    console.warn('[kserve-feedback-preview] Falling back to sample feedback:', err)
  }
  return getSampleKserveFeedback()
}
