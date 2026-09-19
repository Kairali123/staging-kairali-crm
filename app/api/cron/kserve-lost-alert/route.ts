import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { buildKserveLostAlertEmail } from "@/lib/email-triggers/templates/kserve-lead-lost-alert";
import { marketingMailConfig } from "@/lib/marketing-report-email";
import nodemailer from "nodemailer";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

/**
 * GET /api/cron/kserve-lost-alert
 *
 * Intended to be called daily (via Vercel Cron or external scheduler).
 * Add this to vercel.json crons:
 *   { "path": "/api/cron/kserve-lost-alert", "schedule": "0 3 * * *" }
 * (Runs at 03:30 UTC = 09:00 IST)
 *
 * Security: Protected by CRON_SECRET header to prevent public triggering.
 */
export async function GET(request: NextRequest) {
    // ── Auth guard ────────────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    const pool = await getPool();
    const connection = await pool.getConnection();

    try {
        // ── 1. Load settings ──────────────────────────────────────────────────
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS kserve_settings (
                id INT PRIMARY KEY DEFAULT 1,
                lost_days INT NOT NULL DEFAULT 5,
                alert_time VARCHAR(10) NOT NULL DEFAULT '09:00',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        const [settingsRows]: any = await connection.execute(
            `SELECT lost_days, alert_time FROM kserve_settings WHERE id = 1`
        );
        const lostDays: number = settingsRows?.[0]?.lost_days ?? 5;

        // ── 2. Find lost leads ────────────────────────────────────────────────
        // A lead is "lost" when:
        //   • It exists in ai_voice_leads_sent (enquiry_id)
        //   • It has NO matching row in ai_voice_leads_received (initial_id)
        //   • generate_timestamp is older than lostDays
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

        if (!rows || rows.length === 0) {
            return NextResponse.json(
                { success: true, sent: false, reason: "No lost leads found", lostDays },
                { headers: noStoreHeaders }
            );
        }

        // ── 3. Build and send email ───────────────────────────────────────────
        const smtp = marketingMailConfig();
        if (!smtp.configured) {
            return NextResponse.json(
                { success: false, error: "SMTP not configured", lostLeads: rows.length },
                { status: 500, headers: noStoreHeaders }
            );
        }

        const adminEmail = process.env.KSERVE_ALERT_EMAIL ||
            process.env.ADMIN_EMAIL ||
            smtp.user!;

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
        const html = buildKserveLostAlertEmail(rows, lostDays, appUrl);
        const subject = `🚨 KServe Lead Lost Alert — ${rows.length} Lead${rows.length !== 1 ? "s" : ""} Pending (>${lostDays} days)`;

        const transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: { user: smtp.user!, pass: smtp.pass! },
            connectionTimeout: 15000,
            socketTimeout: 30000,
            disableFileAccess: true,
            disableUrlAccess: true,
        });

        try {
            const result = await transport.sendMail({
                from: smtp.user,
                to: adminEmail,
                subject,
                html,
                text: `KServe Lost Lead Alert: ${rows.length} leads have not returned from KServe in more than ${lostDays} days.`,
                disableFileAccess: true,
                disableUrlAccess: true,
            });

            return NextResponse.json({
                success: true,
                sent: true,
                lostLeads: rows.length,
                lostDays,
                accepted: result.accepted?.length ?? 0,
                rejected: result.rejected?.length ?? 0,
            }, { headers: noStoreHeaders });

        } finally {
            transport.close();
        }

    } catch (error: any) {
        console.error("[kserve-lost-alert cron] Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    } finally {
        connection.release();
    }
}
