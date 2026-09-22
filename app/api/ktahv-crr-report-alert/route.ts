import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasPermission } from "@/lib/authz";
import { loadScheduledCrr } from "@/lib/email-triggers/load-crr-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(req: NextRequest) {
    const user = getSessionUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

    const role = String(user?.role || "").trim().toLowerCase();
    const isSuperAdmin =
        role === "super_admin" ||
        role === "super admin" ||
        user?.permissions?.includes("all") ||
        user?.permissions?.includes("fms.admin");

    const hasReportAccess =
        isSuperAdmin ||
        hasPermission(user, "crr_report_alert.view") ||
        hasPermission(user, "crr_report_alert.viewSelf") ||
        hasPermission(user, "crr_report_alert.viewAll") ||
        hasPermission(user, "crr_report_alert");

    if (!hasReportAccess) {
        return NextResponse.json({ error: "Access denied. Permission required." }, { status: 403, headers });
    }

    const date =
        req.nextUrl.searchParams.get("date") ||
        new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Invalid date parameter. Use YYYY-MM-DD." }, { status: 400, headers });
    }

    try {
        const report = await loadScheduledCrr(date);
        return NextResponse.json(report, { headers });
    } catch (err: any) {
        console.error("[ktahv-crr-report-alert route error]", err);
        return NextResponse.json({ error: err?.message || "Failed to generate CRR report" }, { status: 500, headers });
    }
}
