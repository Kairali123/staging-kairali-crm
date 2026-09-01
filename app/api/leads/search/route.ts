import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

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

function mapCompany(val: any): 'KAPPL' | 'KTAHV' | 'VILLARAAG' {
    if (!val) return 'KTAHV'
    const v = String(val).toUpperCase().trim()
    if (v.includes('KAPPL')) return 'KAPPL'
    if (v.includes('VILLA') || v.includes('RAAG')) return 'VILLARAAG'
    return 'KTAHV'
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

function transformRow(row: any, now: string) {
    return {
        id:                   safeStr(row.lead_id),
        name:                 safeStr(row.Name_of_Client),
        email:                safeStr(row.Email_Id),
        phone:                safeStr(row.Mobile),
        company:              mapCompany(row.KAPPL_KTAHV ?? row.Lead_Relates_to_which_company),
        source:               safeStr(row.Data_Source),
        vSrc:                 safeStr(row.Verified_Source || row.Data_Source),
        category:             safeStr(row.Lead_Category),
        status:               mapStatus(row.Enquiry_Status_Last ?? row.status),
        priority:             mapPriority(row.Priority),
        urgency:              mapUrgency(row.Urgency_YES_NO),
        tatBreached:          false,
        assignedTo:           row.Assign_To_MR_Main ? safeStr(row.Assign_To_MR_Main) : undefined,
        sentStatus:           safeStr(row.Sent_status),
        createdAt:            safeDate(row.actual_time, now),
        updatedAt:            safeDate(row.actual_time, now),
        subject:              safeStr(row.Subjects),
        notes:                safeStr(row.Notes),
        ivrUrl:               row.IVR_URL ? safeStr(row.IVR_URL) : null,
        websiteName:          safeStr(row.WebSite_Name),
        contactTime:          safeStr(row.Contact_Time),
        conversationSummary:  safeStr(row.Summary_of_Conversation),
        leadOutcome:          safeStr(row.Lead_Outcome),
        leadCategory:         safeStr(row.Lead_Category),
        preferredContact:     safeStr(row.Preferred_Way_to_Contact),
        country:              safeStr(row.Country),
        userName:             safeStr(row.Name_of_User),
        userPhone:            safeStr(row.Phone_Number_of_User),
        userEmail:            safeStr(row.Email_of_User),
        gptExtractionStatus:  safeStr(row.gpt_Extraction_Status),
        mailStatus:           safeStr(row.Mail_Status),
        testCol:              safeStr(row.Test_Col),
        reasonAssignOrDelete: safeStr(row.Reason_why_assign_Or_Delete),
        verifiedSource:       safeStr(row.Verified_Source),
        convertedAmount:      safeFloat(row.Converted_Amount),
        convertedAt:          safeDate(row.Converted_Date),
        callRecordingUrl:     null,
        remarks:              [],
    }
}

// ─────────────────────────────────────────────────────────────────────
// Lead ID patterns jo database mein hote hain:
//   VR_1766928619862-132
//   KT_1766928619862-132
//   -0R3GB44P2            ← hyphen se bhi start ho sakta hai!
//   ABC_123-456
//
// Rule: agar alphanumeric + hyphen/underscore hai aur koi space nahi
//       aur @ nahi aur pure number nahi → toh lead_id hai
// ─────────────────────────────────────────────────────────────────────
function detectSearchType(q: string): 'lead_id' | 'mobile' | 'email' | 'name' {
    // Email — @ sign hona chahiye
    if (q.includes('@')) return 'email'

    // Mobile — sirf digits (aur optional +, -, spaces) 7+ characters
    if (/^[\d\s\+\-]{7,}$/.test(q) && /\d{7,}/.test(q.replace(/[\s\+\-]/g, ''))) return 'mobile'

    // Name — agar 2+ words hain (space hai beech mein) aur koi special char nahi
    if (/^[a-zA-Z\s]{3,}$/.test(q) && q.includes(' ')) return 'name'

    // Lead ID — alphanumeric with hyphen/underscore, no spaces
    // Covers: VR_xxx, KT_xxx, -0R3GB44P2, ABC123-456
    if (/^[\w\-]+$/.test(q) && q.length >= 4) return 'lead_id'

    // Default: name search
    return 'name'
}

const BASE_SELECT = `
    SELECT
      mb.lead_id,
      mb.Name_of_Client,
      mb.Mobile,
      mb.Email_Id,
      mb.Subjects,
      mb.Notes,
      mb.IVR_URL,
      mb.WebSite_Name,
      mb.Data_Source,
      mb.Verified_Source,
      mb.actual_time,
      sbn.Assign_To_MR_Main,
      sbn.KAPPL_KTAHV,
      sbn.Lead_Relates_to_which_company,
      sbn.Name_of_User,
      sbn.Phone_Number_of_User,
      sbn.Email_of_User,
      sbn.Country,
      sbn.Priority,
      sbn.Urgency_YES_NO,
      sbn.Contact_Time,
      sbn.Summary_of_Conversation,
      sbn.Lead_Outcome,
      sbn.Lead_Category,
      sbn.Preferred_Way_to_Contact,
      sbn.gpt_Extraction_Status,
      sbn.Sent_status,
      sbn.Mail_Status,
      sbn.Test_Col,
      sbn.Reason_why_assign_Or_Delete,
      sbn.Enquiry_Status_Last,
      sbn.Converted_Amount,
      sbn.Converted_Date,
      sbn.status
    FROM master_buffer mb
    INNER JOIN staging_buffer_new sbn ON mb.lead_id = sbn.lead_id
`

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const q = searchParams.get('q')?.trim() ?? ''

        if (!q || q.length < 3) {
            return NextResponse.json({ success: true, data: [], total: 0 })
        }

        const pool = await getPool()
        const searchType = detectSearchType(q)

        console.log(`[Search] query="${q}" detected as: ${searchType}`)

        let rows: any[]

        if (searchType === 'lead_id') {
            // ✅ Lead ID exact match — INDEX use hoga, instant result
            // Covers: VR_xxx, KT_xxx, -0R3GB44P2, etc.
            const [result]: any = await pool.query(
                BASE_SELECT + `WHERE mb.lead_id = ? ORDER BY sbn.sl_no DESC LIMIT 1`,
                [q]
            )
            rows = result

        } else if (searchType === 'mobile') {
            // ✅ Mobile exact match — instant result
            const [result]: any = await pool.query(
                BASE_SELECT + `WHERE mb.Mobile = ? ORDER BY sbn.sl_no DESC LIMIT 1`,
                [q]
            )
            rows = result

        } else if (searchType === 'email') {
            // ✅ Email exact match — instant result
            const [result]: any = await pool.query(
                BASE_SELECT + `WHERE mb.Email_Id = ? ORDER BY sbn.sl_no DESC LIMIT 1`,
                [q]
            )
            rows = result

        } else {
            // ✅ Name LIKE search — thoda slow ho sakta hai par reasonable
            const [result]: any = await pool.query(
                BASE_SELECT + `WHERE mb.Name_of_Client LIKE ? ORDER BY sbn.sl_no DESC LIMIT 10`,
                [`%${q}%`]
            )
            rows = result
        }

        const now = new Date().toISOString()
        const data = rows.map((row: any) => {
            try { return transformRow(row, now) }
            catch { return null }
        }).filter(Boolean)

        return NextResponse.json({
            success: true,
            data,
            total: data.length,
            query: q,
            searchType,
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Search API Error]', message)
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
