import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { buildKserveLostAlertEmail } from "@/lib/email-triggers/templates/kserve-lead-lost-alert";
import { verifySessionCookieValue } from "@/lib/session";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET(request: NextRequest) {
    // ── Auth guard ────────────────────────────────────────────────────────────
    let session: any = null;
    try {
        const userCookie = request.cookies.get("kairali_user")?.value;
        session = userCookie ? verifySessionCookieValue(userCookie) : null;
    } catch { }

    if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const pool = await getPool();
    const connection = await pool.getConnection();

    try {
        // 1. Get Settings
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS kserve_settings (
                id INT PRIMARY KEY DEFAULT 1,
                lost_days INT NOT NULL DEFAULT 5,
                alert_time VARCHAR(10) NOT NULL DEFAULT '09:00',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const [settingsRows]: any = await connection.execute(
            `SELECT lost_days FROM kserve_settings WHERE id = 1`
        );
        const lostDays: number = settingsRows?.[0]?.lost_days ?? 5;

        // 2. Get Leads
        const [rows]: any = await connection.execute(`
            SELECT
                s.enquiry_id   AS id,
                s.name_of_client,
                s.mobile,
                s.email_id,
                s.subjects,
                s.website_name AS company,
                s.data_source,
                s.generate_timestamp AS sent_date,
                DATEDIFF(NOW(), s.generate_timestamp) AS days_pending
            FROM ai_voice_leads_sent s
            LEFT JOIN ai_voice_leads_received r ON s.enquiry_id = r.initial_id
            WHERE r.initial_id IS NULL
              AND s.generate_timestamp <= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY s.generate_timestamp ASC
        `, [lostDays]);

        // 3. Build HTML
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        
        // If no leads, just return a simple message instead of a blank table
        if (!rows || rows.length === 0) {
            const emptyHtml = buildKserveLostAlertEmail([], lostDays, appUrl);
            return new NextResponse(emptyHtml, {
                headers: { ...noStoreHeaders, "Content-Type": "text/html" }
            });
        }

        const html = buildKserveLostAlertEmail(rows, lostDays, appUrl);
        
        return new NextResponse(html, {
            headers: { ...noStoreHeaders, "Content-Type": "text/html" }
        });

    } catch (error: any) {
        console.error("[kserve-alert-preview] Error:", error);
        return new NextResponse(`Error generating preview: ${error?.message}`, { status: 500 });
    } finally {
        connection.release();
    }
}
