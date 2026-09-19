import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifySessionCookieValue } from "@/lib/session";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

function safeDate(val: any): string {
    if (!val) return "";
    try {
        if (val instanceof Date) {
            if (isNaN(val.getTime())) return "";
            const p = (n: number) => String(n).padStart(2, "0");
            return `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())}T${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`;
        }
        const str = String(val).trim();
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
        return str;
    } catch { return ""; }
}

export async function GET(request: NextRequest) {
    try {
        let session: any = null;
        try {
            const userCookie = request.cookies.get("kairali_user")?.value;
            session = userCookie ? verifySessionCookieValue(userCookie) : null;
        } catch { }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            // ── 1. Load settings ──────────────────────────────────────────────
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS kserve_settings (
                    id INT PRIMARY KEY DEFAULT 1,
                    lost_days INT NOT NULL DEFAULT 5,
                    alert_time VARCHAR(10) NOT NULL DEFAULT '09:00',
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            const [settingsRows]: any = await connection.execute(`SELECT lost_days FROM kserve_settings WHERE id = 1`);
            const lostDays = settingsRows?.[0]?.lost_days || 5;

            // ── 2. ALL sent leads (lightweight) — for client-side KPI filtering
            // Returns: id, sent_date, company, data_source so the UI can apply
            // the same date/company/source filters and compute Sent & Received counts.
            const [allSentRows]: any = await connection.execute(`
                SELECT
                    s.enquiry_id          AS id,
                    s.generate_timestamp  AS sent_date,
                    s.website_name        AS company,
                    s.data_source
                FROM ai_voice_leads_sent s
                ORDER BY s.generate_timestamp DESC
            `);

            // ── 3. Set of all enquiry_ids that have come back (received) ──────
            // We join on enquiry_id = initial_id to know which sent leads returned.
            const [receivedRows]: any = await connection.execute(`
                SELECT DISTINCT r.initial_id AS enquiry_id
                FROM ai_voice_leads_received r
                INNER JOIN ai_voice_leads_sent s ON r.initial_id = s.enquiry_id
            `);
            const receivedSet: Set<string> = new Set(
                (receivedRows as any[]).map((r: any) => String(r.enquiry_id))
            );

            // ── 4. Lost leads (full detail) — sent but NOT received, older than lostDays
            const [lostRows]: any = await connection.execute(`
                SELECT
                    s.enquiry_id          AS id,
                    s.name_of_client,
                    s.mobile,
                    s.email_id,
                    s.subjects,
                    s.data_source,
                    s.campaign_name,
                    s.website_name        AS company,
                    s.generate_timestamp  AS sent_date,
                    DATEDIFF(NOW(), s.generate_timestamp) AS days_pending
                FROM ai_voice_leads_sent s
                LEFT JOIN ai_voice_leads_received r ON s.enquiry_id = r.initial_id
                WHERE r.initial_id IS NULL
                  AND s.generate_timestamp <= DATE_SUB(NOW(), INTERVAL ? DAY)
                ORDER BY s.generate_timestamp DESC
            `, [lostDays]);

            // ── 5. Build allSent payload (with normalised date string) ────────
            const allSent = (allSentRows as any[]).map((r: any) => ({
                id: String(r.id || ""),
                sent_date: safeDate(r.sent_date),
                company: String(r.company || ""),
                data_source: String(r.data_source || ""),
                // pre-compute whether this lead was received
                received: receivedSet.has(String(r.id || "")),
            }));

            return NextResponse.json({
                lostDays,
                // allSent lets the frontend recalculate Sent / Received KPIs
                // for any date range / company / source filter combination.
                allSent,
                // data = full detail of LOST (not received) leads older than lostDays
                data: (lostRows as any[]).map((r: any) => ({
                    id: String(r.id || ""),
                    name_of_client: String(r.name_of_client || ""),
                    mobile: String(r.mobile || ""),
                    email_id: String(r.email_id || ""),
                    subjects: String(r.subjects || ""),
                    data_source: String(r.data_source || ""),
                    campaign_name: String(r.campaign_name || ""),
                    company: String(r.company || ""),
                    sent_date: safeDate(r.sent_date),
                    days_pending: Number(r.days_pending) || 0,
                })),
            }, { headers: noStoreHeaders });

        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error("[kserve-lost-leads] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch lost leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
