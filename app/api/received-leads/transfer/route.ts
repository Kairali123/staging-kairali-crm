import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUserResult, hasReceivedLeadsAccess } from "@/lib/authz";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function POST(request: NextRequest) {
    try {
        const session = getSessionUserResult(request);
        if (session.state === "missing") {
            return NextResponse.json(
                { success: false, error: "Access denied: Not logged in" },
                { status: 401, headers: noStoreHeaders }
            );
        }
        if (session.state === "invalid") {
            return NextResponse.json(
                { success: false, error: "Access denied: Invalid session" },
                { status: 401, headers: noStoreHeaders }
            );
        }
        if (!hasReceivedLeadsAccess(session.user)) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const body = await request.json();
        const { leadId, status, assignee, remarks } = body;

        // ── Validation ──────────────────────────────────────────────────────
        if (!leadId || typeof leadId !== "string" || leadId.trim() === "") {
            return NextResponse.json(
                { success: false, error: "leadId is required" },
                { status: 400, headers: noStoreHeaders }
            );
        }
        if (!status || typeof status !== "string" || status.trim() === "") {
            return NextResponse.json(
                { success: false, error: "status is required" },
                { status: 400, headers: noStoreHeaders }
            );
        }
        if (!assignee || typeof assignee !== "string" || assignee.trim() === "") {
            return NextResponse.json(
                { success: false, error: "assignee is required" },
                { status: 400, headers: noStoreHeaders }
            );
        }
        if (!remarks || typeof remarks !== "string" || remarks.trim() === "") {
            return NextResponse.json(
                { success: false, error: "remarks is required" },
                { status: 400, headers: noStoreHeaders }
            );
        }

        // ── Write to DB ─────────────────────────────────────────────────────
        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            const [result]: any = await connection.execute(
                `UPDATE ai_voice_leads_received
                 SET
                   status = ?,
                   assign_to_app_sheet_or_dialer = ?,
                   remarks = ?,
                   updated_at = NOW()
                 WHERE lead_id = ?`,
                [status.trim(), assignee.trim(), remarks.trim(), leadId.trim()]
            );

            if (result.affectedRows === 0) {
                return NextResponse.json(
                    { success: false, error: "Lead not found — no rows updated" },
                    { status: 404, headers: noStoreHeaders }
                );
            }

            return NextResponse.json(
                { success: true, affectedRows: result.affectedRows },
                { headers: noStoreHeaders }
            );
        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error("[received-leads/transfer] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to save transfer data", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
