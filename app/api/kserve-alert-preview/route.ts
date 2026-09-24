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

        // 2. Get Reconciled Leads & Stats
        const { getKserveReconciledLostLeads } = await import("@/lib/kserve-reconciliation");
        const { leads, stats } = await getKserveReconciledLostLeads({ minDays: lostDays });

        // 3. Build HTML
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const html = buildKserveLostAlertEmail(leads, stats, appUrl);
        
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
