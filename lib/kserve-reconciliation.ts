import { getPool } from '@/lib/db'
import ExcelJS from 'exceljs'

export interface ReconciledLostLead {
  sent_id: number | string
  enquiry_id: string
  name_of_client: string
  mobile: string
  email_id: string
  subjects: string
  data_source: string
  company: string
  sent_date: string | Date
  days_pending: number
  is_found: number
  received_count: number
  received_statuses: string | null
}

export interface KserveReconciliationStats {
  totalLost: number
  tier6to9Days: number
  tier10PlusDays: number
  noLogCount: number
  notFinalCount: number
}

/**
 * Executes the D3 reconciliation query matching sent leads to received logs,
 * filtering ONLY those that do not have Qualified or Non-Qualified in calculated_qualification_status,
 * and have been pending for at least `minDays` (e.g., 5 full days so 6th day onwards).
 */
export async function getKserveReconciledLostLeads(options?: {
  minDays?: number
  windowStart?: string
  windowEnd?: string
}): Promise<{ leads: ReconciledLostLead[]; stats: KserveReconciliationStats }> {
  const minDays = options?.minDays ?? 5
  const pool = await getPool()
  const connection = await pool.getConnection()

  try {
    let dateFilter = 'AND s.generate_timestamp <= DATE_SUB(NOW(), INTERVAL ? DAY)'
    const params: any[] = [minDays]

    if (options?.windowStart && options?.windowEnd) {
      dateFilter = 'AND s.generate_timestamp >= ? AND s.generate_timestamp < ?'
      params.splice(0, 1, options.windowStart, options.windowEnd)
    }

    const query = `
      SELECT
        s.id AS sent_id,
        s.enquiry_id,
        s.name_of_client,
        s.mobile,
        s.email_id,
        s.subjects,
        s.data_source,
        s.website_name AS company,
        s.generate_timestamp AS sent_date,
        DATEDIFF(NOW(), s.generate_timestamp) AS days_pending,
        COALESCE(MAX(r.calculated_qualification_status IN ('Qualified', 'Non-Qualified')), 0) AS is_found,
        COUNT(DISTINCT r.id) AS received_count,
        GROUP_CONCAT(DISTINCT r.calculated_qualification_status) AS received_statuses
      FROM ai_voice_leads_sent s
      LEFT JOIN ai_voice_leads_received r
        ON  r.initial_id = s.enquiry_id
        AND COALESCE(r.call_start_time, r.timestamp) >= s.generate_timestamp
        AND COALESCE(r.call_start_time, r.timestamp) < COALESCE(
              (SELECT MIN(s2.generate_timestamp) FROM ai_voice_leads_sent s2
               WHERE s2.enquiry_id = s.enquiry_id
                 AND s2.generate_timestamp > s.generate_timestamp
                 AND s2.code_status = 'success'),
              '9999-12-31')
      WHERE s.code_status = 'success'
        ${dateFilter}
      GROUP BY s.id
      HAVING is_found = 0
      ORDER BY s.generate_timestamp ASC
    `

    const [rows]: any = await connection.execute(query, params)
    const leads: ReconciledLostLead[] = (rows || []).map((r: any) => ({
      sent_id: r.sent_id,
      enquiry_id: r.enquiry_id || '',
      name_of_client: r.name_of_client || '',
      mobile: r.mobile || '',
      email_id: r.email_id || '',
      subjects: r.subjects || '',
      data_source: r.data_source || '',
      company: r.company || '',
      sent_date: r.sent_date,
      days_pending: Number(r.days_pending) || 0,
      is_found: Number(r.is_found) || 0,
      received_count: Number(r.received_count) || 0,
      received_statuses: r.received_statuses || null,
    }))

    let tier6to9Days = 0
    let tier10PlusDays = 0
    let noLogCount = 0
    let notFinalCount = 0

    for (const lead of leads) {
      if (lead.days_pending >= 10) {
        tier10PlusDays++
      } else if (lead.days_pending >= 6) {
        tier6to9Days++
      }

      if (lead.received_count === 0) {
        noLogCount++
      } else {
        notFinalCount++
      }
    }

    const stats: KserveReconciliationStats = {
      totalLost: leads.length,
      tier6to9Days,
      tier10PlusDays,
      noLogCount,
      notFinalCount,
    }

    return { leads, stats }
  } finally {
    connection.release()
  }
}

/**
 * Builds an Excel workbook with 2 sheets:
 * 1. Summary: Statistics and counts.
 * 2. Lost Leads: Detailed rows for every lost lead.
 */
export async function generateKserveExcelBuffer(
  leads: ReconciledLostLead[],
  stats: KserveReconciliationStats
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Kairali CRM'
  workbook.created = new Date()

  // ── 1. Summary Sheet ──────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary', {
    views: [{ showGridLines: true }],
  })

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Count', key: 'count', width: 18 },
    { header: 'Description', key: 'desc', width: 50 },
  ]

  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }

  summarySheet.addRows([
    {
      metric: 'Total Lost Leads',
      count: stats.totalLost,
      desc: 'Leads without Qualified / Non-Qualified status (>5 days pending)',
    },
    {
      metric: '6 to 9 Days Pending (Overdue)',
      count: stats.tier6to9Days,
      desc: 'Leads pending between 6 and 9 days since sending',
    },
    {
      metric: '10+ Days Pending (Critical Escalation)',
      count: stats.tier10PlusDays,
      desc: 'Leads pending for 10 or more days since sending',
    },
    {
      metric: 'Lost - No Log Received',
      count: stats.noLogCount,
      desc: 'No response/attempt log received from KServe at all',
    },
    {
      metric: 'Lost - Incomplete / Pending Attempts',
      count: stats.notFinalCount,
      desc: 'Call attempts received but all ended in Pending without conclusion',
    },
  ])

  // ── 2. Lost Leads Sheet ───────────────────────────────────────────────────────
  const leadsSheet = workbook.addWorksheet('Lost Leads', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }],
  })

  leadsSheet.columns = [
    { header: '#', key: 'idx', width: 6 },
    { header: 'Enquiry ID', key: 'enquiry_id', width: 22 },
    { header: 'Client Name', key: 'name_of_client', width: 24 },
    { header: 'Mobile', key: 'mobile', width: 18 },
    { header: 'Email ID', key: 'email_id', width: 26 },
    { header: 'Company', key: 'company', width: 22 },
    { header: 'Data Source', key: 'data_source', width: 20 },
    { header: 'Sent Date', key: 'sent_date', width: 20 },
    { header: 'Days Pending', key: 'days_pending', width: 14 },
    { header: 'Urgency Tier', key: 'urgency', width: 18 },
    { header: 'Call Log Count', key: 'received_count', width: 15 },
    { header: 'Log Statuses Seen', key: 'received_statuses', width: 25 },
    { header: 'Lost Reason', key: 'reason', width: 24 },
  ]

  leadsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  leadsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' },
  }

  leads.forEach((l, i) => {
    const urgency =
      l.days_pending >= 10
        ? '10+ Days (Critical)'
        : l.days_pending >= 6
        ? '6-9 Days (Overdue)'
        : `${l.days_pending} Days`

    const reason =
      l.received_count === 0 ? 'No Log Received' : 'All Attempts Pending'

    const sentDateFormatted = l.sent_date
      ? new Date(l.sent_date).toISOString().replace('T', ' ').slice(0, 19)
      : ''

    const row = leadsSheet.addRow({
      idx: i + 1,
      enquiry_id: l.enquiry_id,
      name_of_client: l.name_of_client || '—',
      mobile: l.mobile || '—',
      email_id: l.email_id || '—',
      company: l.company || '—',
      data_source: l.data_source || '—',
      sent_date: sentDateFormatted,
      days_pending: l.days_pending,
      urgency,
      received_count: l.received_count,
      received_statuses: l.received_statuses || 'None',
      reason,
    })

    if (l.days_pending >= 10) {
      row.getCell('days_pending').font = { bold: true, color: { argb: 'FFDC2626' } }
      row.getCell('urgency').font = { bold: true, color: { argb: 'FFDC2626' } }
    } else if (l.days_pending >= 6) {
      row.getCell('days_pending').font = { bold: true, color: { argb: 'FFD97706' } }
      row.getCell('urgency').font = { bold: true, color: { argb: 'FFD97706' } }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
