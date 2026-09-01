import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { authorizeApiRequest, isBearerTokenRequest, unauthorizedResponse } from '@/lib/api-auth'

// function safeDate(val: any, fallback = ''): string {
//     if (val === null || val === undefined || val === '') return fallback
//     try {
//         let d: Date
//         if (val instanceof Date) {
//             d = val
//         } else {
//             let str = String(val).trim()
//             if (!/Z$|[+\-]\d{2}:?\d{2}$/.test(str)) {
//                 str = str.replace(' ', 'T') + 'Z'
//             }
//             d = new Date(str)
//         }

//         if (isNaN(d.getTime())) return fallback

//         const p = (n: number) => String(n).padStart(2, '0')
//         return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`

//     } catch {
//         return fallback
//     }
// }

function safeDate(val: any, fallback = ''): string {
    if (val === null || val === undefined || val === '') return fallback
    try {
        const p = (n: number) => String(n).padStart(2, '0')

        if (val instanceof Date) {
            // mysql2 returns DATETIME as Date in server's LOCAL timezone
            // Use getHours() NOT getUTCHours() — works on both local & Vercel
            if (isNaN(val.getTime())) return fallback
            return `${p(val.getDate())}/${p(val.getMonth() + 1)}/${val.getFullYear()} ${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`
        }

        const str = String(val).trim()
        if (!str) return fallback

        // "YYYY-MM-DD HH:MM:SS" string — direct reformat, zero Date parsing
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (m) {
            return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`
        }

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

function parseToDate(val: any): Date | null {
    if (val === null || val === undefined || val === '') return null
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val
    try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d

        const str = String(val).trim()
        const mYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (mYMD) {
            return new Date(Number(mYMD[1]), Number(mYMD[2]) - 1, Number(mYMD[3]), Number(mYMD[4]), Number(mYMD[5]), Number(mYMD[6]))
        }

        const mDMY = str.match(/^(\d{2})\/(\d{2})\/(\d{4})[T ](\d{2}):(\d{2}):(\d{2})/)
        if (mDMY) {
            return new Date(Number(mDMY[3]), Number(mDMY[2]) - 1, Number(mDMY[1]), Number(mDMY[4]), Number(mDMY[5]), Number(mDMY[6]))
        }
    } catch {
        return null
    }
    return null
}

function calculateTAT(candidates: any | any[], dateTime: any): number | null {
    const dt = parseToDate(dateTime)
    if (!dt) return null
    if (dt.getFullYear() < 2024) return null

    const list = Array.isArray(candidates) ? candidates : [candidates]
    for (const val of list) {
        const t2 = parseToDate(val)
        if (t2) {
            if (t2.getFullYear() < 2024) continue
            const diffMs = t2.getTime() - dt.getTime()
            const diffSec = Math.max(0, Math.floor(diffMs / 1000))
            // Cap turn-around time (TAT) at 24 hours (86400 seconds) to prevent 
            // extreme database/historical outliers from inflating the average TAT.
            return Math.min(diffSec, 24 * 3600)
        }
    }
    return null
}


// ─── Exact DB values per company ────────────────────────────────────────────
const VILLARAAG_MAIN_VALUES = ['VILLARAAG', 'Villaraag']
const KTAHV_MAIN_VALUES = [
    'Kairali The Ayurvedic Healing Village',
    'Kairali Ayurvedic Centers',
    'Kairali Ayurvedic Center',
    'Kairali Ayurvedic Healing Village',
]

function mapCompany(val: any): 'KAPPL' | 'KTAHV' | 'VILLARAAG' {
    if (!val) return 'KAPPL'
    // trim + normalize multiple spaces
    const v = String(val).trim().replace(/\s+/g, ' ')

    // Case-insensitive check for VILLARAAG
    if (VILLARAAG_MAIN_VALUES.some(x => x.toLowerCase() === v.toLowerCase())) return 'VILLARAAG'

    // Case-insensitive check for KTAHV
    if (KTAHV_MAIN_VALUES.some(x => x.toLowerCase() === v.toLowerCase())) return 'KTAHV'

    // Debug log — remove after confirming fix
    // console.log('[mapCompany] Unknown value → KAPPL:', JSON.stringify(v))

    // Fallback: everything else → KAPPL
    return 'KAPPL'
}

function mapPriority(val: any): 'high' | 'medium' | 'low' {
    if (!val) return 'medium'
    const v = String(val).toLowerCase().trim()
    if (v === 'high') return 'high'
    if (v === 'low') return 'low'
    return 'medium'
}

function mapUrgency(val: any): string {
    if (!val) return 'No'
    return String(val).trim()
}

function mapStatus(val: any) {
    if (!val) return 'new' as const
    const v = String(val).toLowerCase().trim()

    if (v.includes('convert')) return 'converted'
    if (v.includes('hot') || v.includes('interested')) return 'contacted'
    if (v.includes('warm') || v.includes('callback') || v.includes('follow')) return 'follow_up'
    if (v.includes('cold')) return 'cold'
    if (v.includes('not connect') || v.includes('no answer') || v.includes('busy')) return 'not_connected'

    return 'new'
}

export async function GET(req: NextRequest) {

    if (!(await authorizeApiRequest(req))) {
        return unauthorizedResponse(req)
    }

    // External (bearer-token) callers get a hard-capped page size — the unbounded
    // "load everything" mode below is only for the internal frontend's bulk views.
    const isExternalCaller = isBearerTokenRequest(req)
    const MAX_EXTERNAL_LIMIT = 500

    let pool = null
    let total = 0

    try {

        pool = await getPool()

        const { searchParams } = new URL(req.url)

        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
        let limit = Math.max(1, parseInt(searchParams.get('limit') ?? '500'))
        if (isExternalCaller) {
            limit = Math.min(limit, MAX_EXTERNAL_LIMIT)
        }
        const offset = (page - 1) * limit
        const isForce = searchParams.get('force') === '1'

        // ── ?since=ISO  (delta-poll for auto-refresh) ─────────────────────
        const sinceRaw = searchParams.get('since')
        const sinceDate = sinceRaw ? new Date(sinceRaw) : null
        const sinceValid = sinceDate && !isNaN(sinceDate.getTime())

        // ── ?from=YYYY-MM-DD&to=YYYY-MM-DD  (date-range fetch) ───────────
        // Page sends IST calendar dates; treat them as day boundaries in IST.
        const fromRaw = (searchParams.get('from') ?? '').trim()
        const toRaw = (searchParams.get('to') ?? '').trim()
        // Validate: must be YYYY-MM-DD
        const dateRx = /^\d{4}-\d{2}-\d{2}$/
        const fromValid = dateRx.test(fromRaw)
        const toValid = dateRx.test(toRaw)
        const useRange = fromValid && toValid

        // ── SERVER SIDE CACHE FOR 'ALL' QUERY ──
        const isBgRefresh = searchParams.get('bg_refresh') === '1';
        const isAllQuery = !sinceValid && !useRange && limit >= 10000 && !isBgRefresh && !isForce;
        const tmpFile = require('path').join(require('os').tmpdir(), "leads_all_cache.json");
        const CACHE_TTL = 5 * 60 * 1000; // 5 mins
        const noStoreHeaders = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        }

        if (isAllQuery) {
            try {
                if (require('fs').existsSync(tmpFile)) {
                    const stat = require('fs').statSync(tmpFile);
                    const isStale = Date.now() - stat.mtimeMs > CACHE_TTL;

                    if (isStale) {
                        // Trigger background refresh using a new isolated request
                        const bgUrl = new URL(req.url);
                        bgUrl.searchParams.set('bg_refresh', '1');
                        fetch(bgUrl.toString(), { method: 'GET', headers: { 'x-background': 'true' } }).catch(() => { });
                    }

                    // Return raw string to bypass expensive JSON.parse + JSON.stringify on 160MB file
                    const rawJsonString = require('fs').readFileSync(tmpFile, "utf8");
                    return new NextResponse(rawJsonString, {
                        headers: noStoreHeaders
                    });
                }
            } catch (e) { console.warn("Leads cache read error:", e) }
        }

        const connection = await pool.getConnection()

        try {

            // COUNT — skip for since/range queries (not needed for those flows)
            if (!sinceValid && !useRange) {

                const [countRows]: any = await connection.query(`
                    SELECT COUNT(DISTINCT m.lead_id) as total
                    FROM master_buffer m
                    INNER JOIN staging_buffer_new s
                      ON m.lead_id = s.Lead_id
                    WHERE m.lead_id IS NOT NULL
                      AND m.lead_id != ''
                      AND m.lead_id != '-'
                      AND LOWER(m.WebSite_Name) NOT LIKE '%kserve api outcome%'
                `)
                total = countRows[0].total
            }

            // ── Shared SELECT columns ─────────────────────────────────────
            // ── Deduplicated subquery: ROW_NUMBER keeps only the latest staging row per lead_id ──
            const INNER_QUERY = `
                    SELECT  
                        m.*,
                        s.Assign_To_MR_Main,
                        s.NBD_CRR,
                        s.Transcription,
                        s.Lead_Relates_to_which_company,
                        s.Name_of_User,
                        s.Phone_Number_of_User,
                        s.Email_of_User,
                        s.Country,
                        s.Urgency_YES_NO,
                        s.Contact_Time,
                        s.Summary_of_Conversation,
                        s.Lead_Outcome,
                        s.Lead_Category,
                        s.Preferred_Way_to_Contact,
                        s.Timestamp_2,
                        s.gpt_Extraction_Status,
                        s.Sent_status,
                        s.Mail_Status,
                        s.Test_Col,
                        s.Intent,
                        s.Priority,
                        s.status,
                        s.Enquiry_Status_Last,
                        s.UTM_Campaign_Name,
                        ROW_NUMBER() OVER (
                            PARTITION BY m.lead_id
                            ORDER BY s.Timestamp_2 DESC
                        ) as rn
                    FROM master_buffer m
                    INNER JOIN staging_buffer_new s
                      ON m.lead_id = s.Lead_id`

            let rows: any[]

            // ── BRANCH 1: since= (auto-refresh delta poll) ────────────────
            if (sinceValid) {

                const sinceStr = sinceDate!.toISOString().replace('T', ' ').replace('Z', '')

                const [result]: any = await connection.query(
                    `SELECT * FROM (${INNER_QUERY}
                    WHERE m.Timestamp > ?
                    ) t WHERE t.rn = 1
                    ORDER BY t.Timestamp DESC
                    `, [sinceStr])

                rows = result

                // ── BRANCH 2: from= & to= (date-range, server-side) ──────────
            } else if (useRange) {

                // fromRaw = "2025-11-01", toRaw = "2025-11-15"
                // Use IST boundaries: 00:00:00 → 23:59:59 on those calendar days
                const fromStr = `${fromRaw} 00:00:00`
                const toStr = `${toRaw}   23:59:59`

                const [countRows]: any = await connection.query(`
                    SELECT COUNT(DISTINCT m.lead_id) as total
                    FROM master_buffer m
                    INNER JOIN staging_buffer_new s
                      ON m.lead_id = s.Lead_id
                    WHERE m.Timestamp BETWEEN ? AND ?
                `, [fromStr, toStr])
                total = countRows[0].total

                const [result]: any = await connection.query(
                    `SELECT * FROM (${INNER_QUERY}
                    WHERE m.Timestamp BETWEEN ? AND ?
                    ) t WHERE t.rn = 1
                    ORDER BY t.Timestamp DESC
                    LIMIT ? OFFSET ?
                    `, [fromStr, toStr, limit, offset])

                rows = result

                // ── BRANCH 3: default full paginated load ─────────────────────
            } else {

                const [result]: any = await connection.query(
                    `SELECT * FROM (${INNER_QUERY}
                    WHERE m.lead_id IS NOT NULL
                      AND m.lead_id != ''
                      AND m.lead_id != '-'
                      AND LOWER(m.WebSite_Name) NOT LIKE '%kserve api outcome%'
                    ) t WHERE t.rn = 1
                    ORDER BY t.Timestamp DESC
                    LIMIT ? OFFSET ?
                    `, [limit, offset])

                rows = result
            }
            // console.log(rows);
            const leads: any[] = []

            for (const row of rows) {
                // console.log(safeStr(row.WebSite_Name))
                if (String(safeStr(row.WebSite_Name)).toLowerCase().includes("kserve api outcomes")) {
                    continue;
                }
                leads.push({

                    id: safeStr(row.lead_id),
                    name: safeStr(row.Name_of_Client),
                    email: safeStr(row.Email_Id),
                    phone: safeStr(row.Mobile),

                    // Use staging company field — falls back to master KAPPL_KTAHV
                    company: mapCompany(row.Lead_Relates_to_which_company),

                    source: safeStr(row.Data_Source),
                    vSrc: safeStr(row.Verified_Source),

                    category: safeStr(row.Lead_Category),
                    leadCategory: safeStr(row.Lead_Category),

                    status: mapStatus(row.Enquiry_Status_Last ?? row.status),

                    // Use staging Priority column (set by GAS); Intent as fallback
                    priority: mapPriority(row.Intent),
                    intent: safeStr(row.Intent),
                    urgency: mapUrgency(row.Urgency_YES_NO),

                    createdAt: safeDate(row.Date_Time),
                    updatedAt: safeDate(row.Timestamp),

                    convertedAmount: safeFloat(row.Converted_Amount),
                    convertedAt: safeDate(row.Converted_Date),

                    subject: safeStr(row.Subjects),
                    notes: safeStr(row.Notes),

                    websiteName: safeStr(row.WebSite_Name),
                    campaignName: safeStr(row.UTM_Campaign_Name),
                    remarks: [],

                    assignedTo: safeStr(row.Assign_To_MR_Main) || 'unassigned',
                    "NBD/CRR": safeStr(row.NBD_CRR),
                    transcription: safeStr(row.Transcription),
                    userName: safeStr(row.Name_of_User),
                    userPhone: safeStr(row.Phone_Number_of_User),
                    userEmail: safeStr(row.Email_of_User),
                    country: safeStr(row.Country),
                    contactTime: safeStr(row.Contact_Time),
                    conversationSummary: safeStr(row.Summary_of_Conversation),
                    leadOutcome: safeStr(row.Lead_Outcome),
                    preferredContact: safeStr(row.Preferred_Way_to_Contact),
                    sentStatus: safeDate(row.gpt_Extraction_Status) || safeDate(row.Sent_status) || safeStr(row.Timestamp_2),
                    gptExtractionStatus: safeDate(row.gpt_Extraction_Status),
                    mailStatus: safeStr(row.Mail_Status),
                    testCol: safeStr(row.Test_Col),
                    verifiedSource: safeStr(row.Verified_Source),
                    ivrUrl: safeStr(row.IVR_URL || row.ivrurl || row.ivr_url || ""),
                    callRecordingUrl: safeStr(row.callRecordingUrl || row.call_recording_url || ""),
                    tat: calculateTAT([row.gpt_Extraction_Status, row.Sent_status, row.Timestamp_2], row.Date_Time)
                })
            }

            const totalPages = (sinceValid || useRange)
                ? Math.ceil(total / limit) || 1
                : Math.ceil(total / limit)

            const responseObj = {
                success: true,
                data: leads,
                page,
                limit,
                total,
                totalPages,
                returned: leads.length,
                fetchMode: sinceValid ? 'since' : useRange ? 'range' : 'paginated',
                ...(useRange ? { from: fromRaw, to: toRaw } : {}),
                meta: {
                    next: page < totalPages ? page + 1 : null,
                },
                conversion: {},
                spentAmount: {}
            };

            // Write to cache if it's an ALL query (including bg_refresh)
            if (limit >= 10000 && !sinceValid && !useRange) {
                try {
                    const tmpFile = require('path').join(require('os').tmpdir(), "leads_all_cache.json");
                    require('fs').writeFileSync(tmpFile, JSON.stringify(responseObj));
                } catch (e) { console.warn("Leads cache write error:", e) }
            }

            return NextResponse.json(responseObj, { headers: noStoreHeaders });

        } finally {

            connection.release()
        }

    } catch (err: any) {

        console.error('[Leads API Error]', err)

        return NextResponse.json(
            { success: false, error: err?.message || 'Unknown error' },
            {
                status: 500,
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            }
        )
    }
}
