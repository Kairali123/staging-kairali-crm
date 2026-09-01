import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

// ─── Helpers (same as route.ts) ─────────────────────────────────────────────

function safeDate(val: any, fallback = ''): string {
    if (val === null || val === undefined || val === '') return fallback
    try {
        const p = (n: number) => String(n).padStart(2, '0')
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return fallback
            return `${p(val.getDate())}/${p(val.getMonth() + 1)}/${val.getFullYear()} ${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`
        }
        const str = String(val).trim()
        if (!str) return fallback
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`
        return str
    } catch {
        return fallback
    }
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

function mapPriority(val: any): 'high' | 'medium' | 'low' {
    if (!val) return 'medium'
    const v = String(val).toLowerCase().trim()
    if (v === 'high') return 'high'
    if (v === 'low') return 'low'
    return 'medium'
}

function mapUrgency(val: any): 'urgent' | 'normal' | 'low' {
    if (!val) return 'normal'
    const v = String(val).toLowerCase().trim()
    if (v === 'yes' || v === 'urgent') return 'urgent'
    if (v === 'low') return 'low'
    return 'normal'
}

function mapStatus(val: any) {
    if (!val) return 'new' as const
    const v = String(val).toLowerCase().trim()
    if (v.includes('convert')) return 'converted' as const
    if (v.includes('hot') || v.includes('interested')) return 'contacted' as const
    if (v.includes('warm') || v.includes('callback') || v.includes('follow')) return 'follow_up' as const
    if (v.includes('cold')) return 'cold' as const
    if (v.includes('not connect') || v.includes('no answer') || v.includes('busy')) return 'not_connected' as const
    return 'new' as const
}

// ─── Exact DB values per company ─────────────────────────────────────────────
const VILLARAAG_DB_VALUES = ['VILLARAAG', 'Villaraag']
const KTAHV_DB_VALUES = [
    'Kairali The Ayurvedic Healing Village',
    'Kairali Ayurvedic Centers',
    'Kairali Ayurvedic Center',
    'Kairali Ayurvedic Healing Village',
]

// ─── Frontend label mapper (DB value → KAPPL | KTAHV | VILLARAAG) ────────────
function mapCompanyLabel(val: any): 'KAPPL' | 'KTAHV' | 'VILLARAAG' {
    if (!val) return 'KAPPL'
    // trim + normalize multiple spaces
    const v = String(val).trim().replace(/\s+/g, ' ')

    // Case-insensitive check
    if (VILLARAAG_DB_VALUES.some(x => x.toLowerCase() === v.toLowerCase())) return 'VILLARAAG'
    if (KTAHV_DB_VALUES.some(x => x.toLowerCase() === v.toLowerCase())) return 'KTAHV'

    // Debug log — remove after confirming fix
    console.log('[mapCompanyLabel] Unknown value → KAPPL:', JSON.stringify(v))

    return 'KAPPL'
}

// ─── Company code → SQL WHERE clause ─────────────────────────────────────────
function companyCondition(code: string): { clause: string; params: any[] } {
    const c = code.toUpperCase().trim()
    if (!c || c === 'ALL') return { clause: '1=1', params: [] }

    if (c === 'VILLARAAG') {
        const ph = VILLARAAG_DB_VALUES.map(() => 's.Lead_Relates_to_which_company = ?').join(' OR ')
        return { clause: `(${ph})`, params: [...VILLARAAG_DB_VALUES] }
    }

    if (c === 'KTAHV') {
        const ph = KTAHV_DB_VALUES.map(() => 's.Lead_Relates_to_which_company = ?').join(' OR ')
        return { clause: `(${ph})`, params: [...KTAHV_DB_VALUES] }
    }

    // KAPPL — every row that is NOT VILLARAAG and NOT KTAHV
    const allExcluded = [...VILLARAAG_DB_VALUES, ...KTAHV_DB_VALUES]
    const notClauses = allExcluded.map(() => 's.Lead_Relates_to_which_company != ?').join(' AND ')
    return { clause: `(${notClauses})`, params: allExcluded }
}

// ─── Date condition builder ───────────────────────────────────────────────────
// date_filter: all | today | yesterday | this_week | last_week |
//              this_month | last_month | this_year | last_year | custom
function dateCondition(
    dateFilter: string,
    dateFrom: string,
    dateTo: string
): { clause: string; params: any[] } {
    switch (dateFilter) {
        case 'today':
            return { clause: 'DATE(m.Timestamp) = CURDATE()', params: [] }
        case 'yesterday':
            return { clause: 'DATE(m.Timestamp) = CURDATE() - INTERVAL 1 DAY', params: [] }
        case 'this_week':
            return { clause: 'YEARWEEK(m.Timestamp, 1) = YEARWEEK(CURDATE(), 1)', params: [] }
        case 'last_week':
            return { clause: 'YEARWEEK(m.Timestamp, 1) = YEARWEEK(CURDATE(), 1) - 1', params: [] }
        case 'this_month':
            return {
                clause: 'MONTH(m.Timestamp) = MONTH(CURDATE()) AND YEAR(m.Timestamp) = YEAR(CURDATE())',
                params: []
            }
        case 'last_month':
            return {
                clause: 'MONTH(m.Timestamp) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(m.Timestamp) = YEAR(CURDATE() - INTERVAL 1 MONTH)',
                params: []
            }
        case 'this_year':
            return { clause: 'YEAR(m.Timestamp) = YEAR(CURDATE())', params: [] }
        case 'last_year':
            return { clause: 'YEAR(m.Timestamp) = YEAR(CURDATE()) - 1', params: [] }
        case 'custom':
            if (dateFrom && dateTo) {
                // frontend sends YYYY-MM-DD; DB stores DATETIME
                return {
                    clause: 'm.Timestamp BETWEEN ? AND ?',
                    params: [`${dateFrom} 00:00:00`, `${dateTo} 23:59:59`]
                }
            }
            return { clause: '1=1', params: [] }
        default:
            return { clause: '1=1', params: [] }
    }
}

// ─── Row transformer ──────────────────────────────────────────────────────────
function transformRow(row: any) {
    return {
        id: safeStr(row.lead_id),
        name: safeStr(row.Name_of_Client),
        email: safeStr(row.Email_Id),
        phone: safeStr(row.Mobile),
        company: mapCompanyLabel(row.Lead_Relates_to_which_company),
        source: safeStr(row.Data_Source),
        vSrc: safeStr(row.Verified_Source || row.Data_Source),
        category: safeStr(row.Lead_Category),
        status: mapStatus(row.Enquiry_Status_Last ?? row.status),
        priority: mapPriority(row.Priority),
        urgency: mapUrgency(row.Urgency_YES_NO),
        tatBreached: false,

        createdAt: safeDate(row.Timestamp),
        updatedAt: safeDate(row.Timestamp),

        subject: safeStr(row.Subjects),
        notes: safeStr(row.Notes),
        websiteName: safeStr(row.WebSite_Name),
        remarks: [],

        // Staging fields
        assignedTo: safeStr(row.Timestamp_2)
            ? safeStr(row.Assign_To_MR_Main)
            : 'unassigned',
        sentStatus: safeStr(row.Timestamp_2),
        'NBD/CRR': safeStr(row.NBD_CRR),
        transcription: safeStr(row.Transcription),
        userName: safeStr(row.Name_of_User),
        userPhone: safeStr(row.Phone_Number_of_User),
        userEmail: safeStr(row.Email_of_User),
        country: safeStr(row.Country),
        contactTime: safeStr(row.Contact_Time),
        conversationSummary: safeStr(row.Summary_of_Conversation),
        leadOutcome: safeStr(row.Lead_Outcome),
        preferredContact: safeStr(row.Preferred_Way_to_Contact),
        convertedAmount: safeFloat(row.Converted_Amount),
        convertedAt: safeDate(row.Converted_Date),
        utmCampaign: safeStr(row.UTM_Campaign_Name),
    }
}

// ─── GET /api/leads/filter ────────────────────────────────────────────────────
// Query params:
//   search       — free text (lead_id / name / mobile / email / subject)
//   date_filter  — all | today | yesterday | this_week | last_week |
//                  this_month | last_month | this_year | last_year | custom
//   date_from    — YYYY-MM-DD  (required when date_filter=custom)
//   date_to      — YYYY-MM-DD  (required when date_filter=custom)
//   company      — ALL | KTAHV | KAPPL | VILLARAAG
//   lead_source  — raw Verified_Source value (empty = all)
//   assigned_to  — raw Assign_To_MR_Main value (empty = all)
//   priority     — all | high | medium | low  (case-insensitive)
//   urgency      — all | yes | no
//   page         — default 1
//   limit        — default 500
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const pool = await getPool()
        const sp = new URL(req.url).searchParams

        // ── Parse params ──────────────────────────────────────────────────
        const search = (sp.get('search') ?? '').trim()
        const dateFilter = (sp.get('date_filter') ?? 'all').trim()
        const dateFrom = (sp.get('date_from') ?? '').trim()
        const dateTo = (sp.get('date_to') ?? '').trim()
        const company = (sp.get('company') ?? '').trim()
        const leadSource = (sp.get('lead_source') ?? '').trim()
        const assignedTo = (sp.get('assigned_to') ?? '').trim()
        const priority = (sp.get('priority') ?? '').trim()
        const urgency = (sp.get('urgency') ?? '').trim()
        const page = Math.max(1, parseInt(sp.get('page') ?? '1'))
        const limit = Math.min(10000, Math.max(1, parseInt(sp.get('limit') ?? '500')))
        const offset = (page - 1) * limit

        // ── Build WHERE conditions ────────────────────────────────────────
        const conditions: string[] = []
        const params: any[] = []

        // 🔍 Search — lead_id, name, mobile, email, subject
        if (search) {
            conditions.push(`(
                m.lead_id         LIKE ?
             OR m.Name_of_Client  LIKE ?
             OR m.Mobile          LIKE ?
             OR m.Email_Id        LIKE ?
             OR m.Subjects        LIKE ?
            )`)
            const like = `%${search}%`
            params.push(like, like, like, like, like)
        }

        // 📅 Date
        const { clause: dateCl, params: datePrm } = dateCondition(dateFilter, dateFrom, dateTo)
        if (dateCl !== '1=1') {
            conditions.push(dateCl)
            params.push(...datePrm)
        }

        // 🏢 Company
        const { clause: companyCl, params: companyPrm } = companyCondition(company)
        if (companyCl !== '1=1') {
            conditions.push(companyCl)
            params.push(...companyPrm)
        }

        // 📊 Lead source (Verified_Source)
        if (leadSource && leadSource !== 'all') {
            conditions.push('m.Verified_Source = ?')
            params.push(leadSource)
        }

        // 👤 Assigned to
        if (assignedTo && assignedTo !== 'all' && assignedTo !== 'unassigned') {
            conditions.push('s.Assign_To_MR_Main = ?')
            params.push(assignedTo)
        }
        if (assignedTo === 'unassigned') {
            conditions.push("(s.Assign_To_MR_Main IS NULL OR s.Assign_To_MR_Main = '' OR s.Timestamp_2 IS NULL OR s.Timestamp_2 = '')")
        }

        // 🎯 Priority (DB stores 'High'/'Medium'/'Low' — use LOWER() comparison)
        if (priority && priority !== 'all') {
            conditions.push('LOWER(s.Priority) = ?')
            params.push(priority.toLowerCase())
        }

        // ⚡ Urgency (DB stores 'yes'/'no' in Urgency_YES_NO)
        if (urgency && urgency !== 'all') {
            conditions.push('LOWER(s.Urgency_YES_NO) = ?')
            params.push(urgency.toLowerCase())
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join('\n  AND ')
            : ''

        // ── COUNT query ───────────────────────────────────────────────────
        const countSQL = `
            SELECT COUNT(*) AS total
            FROM master_buffer m
            INNER JOIN staging_buffer_new s
              ON m.lead_id = s.Lead_id
            ${whereClause}
        `

        // ── DATA query ────────────────────────────────────────────────────
        const dataSQL = `
            SELECT
                m.sl_no,
                m.lead_id,
                m.Timestamp,
                m.WebSite_Name,
                m.Verified_Source,
                m.Data_Source,
                m.Name_of_Client,
                m.Mobile,
                m.Email_Id,
                m.Subjects,
                m.Notes,
                s.Assign_To_MR_Main,
                s.Lead_Relates_to_which_company,
                s.Priority,
                s.Urgency_YES_NO,
                s.UTM_Campaign_Name,
                s.status,
                s.Enquiry_Status_Last,
                s.NBD_CRR,
                s.Transcription,
                s.Name_of_User,
                s.Phone_Number_of_User,
                s.Email_of_User,
                s.Country,
                s.Contact_Time,
                s.Summary_of_Conversation,
                s.Lead_Outcome,
                s.Lead_Category,
                s.Preferred_Way_to_Contact,
                s.Timestamp_2,
                s.Converted_Amount,
                s.Converted_Date
            FROM master_buffer m
            INNER JOIN staging_buffer_new s
              ON m.lead_id = s.Lead_id
            ${whereClause}
            ORDER BY m.Timestamp DESC
            LIMIT ? OFFSET ?
        `

        const connection = await pool.getConnection()
        try {
            const [[{ total }]]: any = await connection.query(countSQL, params)
            const [rows]: any = await connection.query(dataSQL, [...params, limit, offset])

            const data = rows.map((row: any) => {
                try { return transformRow(row) }
                catch { return null }
            }).filter(Boolean)

            return NextResponse.json({
                success: true,
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                returned: data.length,
                // Echo back the filters used (useful for debugging)
                filters: { search, dateFilter, dateFrom, dateTo, company, leadSource, assignedTo, priority, urgency }
            })

        } finally {
            connection.release()
        }

    } catch (err: any) {
        console.error('[Leads Filter API Error]', err)
        return NextResponse.json(
            { success: false, error: err?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
