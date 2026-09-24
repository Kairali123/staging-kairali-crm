import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUserResult, hasAdminRole, hasAnyPermission } from "@/lib/authz";
import { formatIsoIST } from "@/lib/lead-date";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Cache Config ─────────────────────────────────────────────────────────────
// Namespaced per date-range bucket so different filter windows don't collide.
let memoryCache: Record<string, any[]> = {};
let lastFetchTime: Record<string, number> = {};
const CACHE_TTL = 3 * 60 * 1000; // 5 minutes

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};
// When no date range is requested, only look at the most recently created rows
// instead of grouping the whole (200k+ row) table — keeps the fallback query fast
// and its response small. See the `dateFrom`/`dateTo` path for scoped requests.
const RECENT_SCAN_ROWS = 4000;
const RECENT_ROW_CAP = 1000;
const MAX_HISTORY_ROWS = 200000;

function hasReceivedLeadsAccess(user: any): boolean {
    return (
        hasAnyPermission(user, ["ai_voice_received.view"]) ||
        hasAdminRole(user, "lower")
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return safeDate(val);
    return String(val).trim();
}

function safeDate(val: any): string {
    return formatIsoIST(val, "");
}

function mapCompany(dbCompany: string, websiteName: string): string {
    const c = (dbCompany || "").toUpperCase();
    const w = (websiteName || "").toLowerCase();

    // 1. Check for Villaraag
    if (c.includes("VILLARAAG") || w.includes("villaraag")) return "VILLARAAG";

    // 2. Check for KTAHV / Healing Village
    if (
        c.includes("KTAHV") ||
        c.includes("HEALING VILLAGE") ||
        c.includes("AHV") ||
        w.includes("healing village") ||
        w.includes("ktahv")
    ) return "KTAHV";

    // 3. Check for KAPPL / Products
    if (
        c.includes("KAPPL") ||
        c.includes("AYURVEDIC PRODUCTS") ||
        c.includes("KAP") ||
        w.includes("ayurvedic products") ||
        w.includes("kappl")
    ) return "KAPPL";

    // 4. Default to KAC
    return "KAC";
}

function resolveLeadStatus(
    calculatedStatus: string,
    leadStatus: string,
    finalOutcome?: string,
    callStatus?: string,
    finalCallStatus?: string,
    followupStatus?: string,
    followupTime?: string
): string {
    const calc = (calculatedStatus || "").trim().toLowerCase();
    const ls = (leadStatus || "").trim().toLowerCase();
    const fcs = (finalCallStatus || "").trim().toLowerCase();
    const cs = (callStatus || "").trim().toLowerCase();
    const outcome = (finalOutcome || "").trim().toLowerCase();
    const fs = (followupStatus || "").trim().toLowerCase();

    // 1. Explicitly Qualified or Verified
    if (ls === "verified") return "Verified";
    if (calc === "qualified" || ls === "qualified" || fcs === "interested") return "Qualified";
    if (outcome && ["sale made", "converted", "product distributor", "product stockists", "individual products buying", "individual resort booking", "treatment package for resort", "treatment package for kairali centres", "ayurveda training", "yoga training", "order status enquiry", "expert required"].some(k => outcome.includes(k))) {
        return "Qualified";
    }

    // 2. Exhausted retries -> Non-Qualified
    if (fs.includes("max_followup_attempt_reached") || fs.includes("exhausted") || fs.includes("failed_to_schedule") || outcome.includes("max auto dial")) {
        return "Non-Qualified";
    }

    // 3. Scheduled, Callback, or Unconnected Attempt -> Pending
    if (
        fcs === "call back" ||
        fcs === "callback" ||
        fs.includes("call_scheduled") ||
        (followupTime && followupTime !== "" && followupTime !== "—") ||
        cs === "notconnected" ||
        cs === "not connected" ||
        fcs.includes("not connected") ||
        fcs.includes("notconnected") ||
        outcome.includes("no answer") ||
        outcome.includes("call rejected") ||
        outcome.includes("not connected")
    ) {
        return "Pending";
    }

    // 4. Disqualified / Non-Qualified
    if (
        calc === "non-qualified" ||
        calc === "unqualified" ||
        ls === "unqualified" ||
        fcs === "cold" ||
        fcs === "not interested" ||
        fcs === "dropped" ||
        fcs === "junk" ||
        fcs.includes("error") ||
        fcs.includes("do not call") ||
        outcome.includes("not interested") ||
        outcome.includes("junk") ||
        outcome.includes("did not enquire") ||
        outcome.includes("dnc") ||
        outcome.includes("cold")
    ) {
        return "Non-Qualified";
    }

    return "Pending";
}

// ─── Row → Frontend Shape ─────────────────────────────────────────────────────

function mapRow(row: any): object {
    const websiteName = safeStr(row.website_name);
    const dbCompany = safeStr(row.company);
    const resolvedStatus = resolveLeadStatus(
        safeStr(row.calculated_qualification_status),
        safeStr(row.lead_status),
        safeStr(row.final_lead_outcome),
        safeStr(row.call_status),
        safeStr(row.final_call_status),
        safeStr(row.followup_status),
        safeStr(row.followup_time)
    );

    return {
        id: safeStr(row.lead_id),
        dbId: row.id ?? null,
        timestamp: safeDate(row.timestamp),
        dateTime: safeDate(row.date_time),
        clientName: safeStr(row.client_name),
        mobile: safeStr(row.mobile),
        email: safeStr(row.email),
        subject: safeStr(row.subject),
        notes: safeStr(row.notes),
        ivrUrl: safeStr(row.ivr_url),
        website: websiteName,
        dataSource: safeStr(row.data_source),
        assigned_mr: safeStr(row.assigned_mr),
        assignto: safeStr(row.next_assigned_to),
        transcription: safeStr(row.transcription), // Still included but we'll limit rows for efficiency
        viewUrl: safeStr(row.transcription_view_url),
        callSubId: safeStr(row.call_sub_id),
        initialid: safeStr(row.initial_id),
        callstarttime: safeDate(row.call_start_time),
        callendtime: safeDate(row.call_end_time),
        callduration: safeStr(row.call_duration_sec),
        callstatus: safeStr(row.call_status),
        calltype: safeStr(row.call_type),
        callendreason: safeStr(row.call_end_reason),
        aicallcategory: safeStr(row.ai_call_category),
        finalcallstatus: safeStr(row.final_call_status),
        customerengagementlevel: safeStr(row.customer_engagement_level),
        interestlevel: safeStr(row.interest_level),
        calloutcome: safeStr(row.call_outcome),
        nextactionrequired: safeStr(row.next_action_required),
        aicallsummary: safeStr(row.ai_call_summary),
        lead_status: safeStr(row.lead_status),
        leadstatus: resolvedStatus,
        cutomercontext: safeStr(row.customer_context),
        preferreddatetime: safeDate(row.preferred_datetime),
        cutomerintent: safeStr(row.customer_intent),
        additionalnotes: safeStr(row.additional_notes),
        servicecategory: safeStr(row.service_category),
        finalleadoutcome: safeStr(row.final_lead_outcome),
        scheduledtime: safeDate(row.followup_time),
        scheduledstatus: safeStr(row.followup_status),
        company: mapCompany(dbCompany, websiteName),
        company_by_kserve: safeStr(row.company_by_kserve),
        calculated_qualification_status: resolvedStatus,
        tat: row.tat ?? null,
        followup_required: safeStr(row.followup_required),
        client_category: safeStr(row.client_category),
        next_assigned_to: safeStr(row.next_assigned_to),
        sent_status: safeStr(row.sent_status),
        sent_status_date: safeDate(row.sent_status_date),
        error_alert_qualified_lead: safeStr(row.error_alert_qualified_lead),
        repush_status: safeStr(row.repush_status),
        response: safeStr(row.response),
        verified_source: safeStr(row.verified_source),
        created_at: safeDate(row.created_at),
        updated_at: safeDate(row.updated_at),
        feedback_date: safeStr(row.feedback_date),
        feedbackSubmitted: row.feedback_submitted === 1,
        feedbackData: row.feedback_data ? JSON.parse(row.feedback_data) : {},
        vtlStatus: safeStr(row.status),
        vtlAssignee: safeStr(row.assign_to_app_sheet_or_dialer),
        vtlRemarks: safeStr(row.remarks),
        doer: safeStr(row.doer),
    };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        // Same cookie, same verifier as before; the result keeps "no cookie" and
        // "cookie did not verify" apart so the two 401 bodies below stay distinct.
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

        const user = session.user;

        if (!hasReceivedLeadsAccess(user)) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "1";
        const initialId = searchParams.get("initialId");
        const allRows = searchParams.get("allRows") === "1";
        const isValidDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
        const dateFromParam = searchParams.get("dateFrom");
        const dateToParam = searchParams.get("dateTo");
        const dateFrom = isValidDate(dateFromParam) ? dateFromParam : null;
        const dateTo = isValidDate(dateToParam) ? dateToParam : null;
        const hasDateRange = !!(dateFrom || dateTo);

        if (initialId && allRows) {
            const pool = await getPool();
            const connection = await pool.getConnection();
            try {
                const [rows] = await connection.execute(`
                    SELECT * FROM ai_voice_leads_received
                    WHERE initial_id = ?
                    ORDER BY id DESC
                    LIMIT ${MAX_HISTORY_ROWS}
                `, [initialId]) as any[];
                return NextResponse.json((rows as any[]).map(mapRow));
            } finally {
                connection.release();
            }
        }
        const now = Date.now();
        // Cache is namespaced per date-range so different filter windows don't collide.
        const cacheBucket = hasDateRange ? `${dateFrom || ""}_${dateTo || ""}` : "recent";
        const tmpFile = path.join(os.tmpdir(), `received_leads_cache_v8_${cacheBucket}.json`);

        // 1. Memory cache — fastest
        if (!force && memoryCache[cacheBucket]?.length && now - (lastFetchTime[cacheBucket] || 0) < CACHE_TTL) {
            return NextResponse.json(memoryCache[cacheBucket]);
        }

        // 2. File cache
        if (!force) {
            try {
                if (fs.existsSync(tmpFile)) {
                    const stat = fs.statSync(tmpFile);
                    if (now - stat.mtimeMs < CACHE_TTL) {
                        const fileData = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
                        if (Array.isArray(fileData) && fileData.length > 0) {
                            memoryCache[cacheBucket] = fileData;
                            lastFetchTime[cacheBucket] = stat.mtimeMs;
                            return NextResponse.json(fileData);
                        }
                    }
                }
            } catch (e) {
                console.warn("[received-leads] File cache read error:", e);
            }
        }

        // 3. Query MySQL
        // - With a date range: scope the "latest row per initial_id" grouping to that
        //   window so it never has to touch the full historical table. (Needs an index
        //   on `timestamp` to be fast — see ops notes; without it this still returns
        //   correct results, just slower for wide ranges.)
        // - Without a date range: fall back to scanning only the most recently created
        //   rows (RECENT_SCAN_ROWS) instead of the whole table.
        // Either way, a final LIMIT caps the result so a heavy window degrades to
        // "most recent N" instead of a multi-MB response a serverless function can't return.
        const pool = await getPool();
        const connection = await pool.getConnection();
        let rows: any[];
        const groupParams: any[] = [];
        let innerSql: string;
        if (hasDateRange) {
            let whereClause = "initial_id IS NOT NULL";
            if (dateFrom) { whereClause += " AND timestamp >= ?"; groupParams.push(`${dateFrom} 00:00:00`); }
            if (dateTo) { whereClause += " AND timestamp < DATE_ADD(?, INTERVAL 1 DAY)"; groupParams.push(`${dateTo} 00:00:00`); }
            innerSql = `SELECT MAX(id) AS max_id FROM ai_voice_leads_received WHERE ${whereClause} GROUP BY initial_id`;
        } else {
            innerSql = `SELECT MAX(id) AS max_id FROM (SELECT id, initial_id FROM ai_voice_leads_received ORDER BY id DESC LIMIT ${RECENT_SCAN_ROWS}) t GROUP BY initial_id`;
        }

        try {
            [rows] = await connection.execute(`
                SELECT
    a.id, a.timestamp, a.date_time, a.lead_id, a.client_name,
    a.mobile, a.email, a.subject, a.notes, a.ivr_url,
    a.website_name, a.data_source, a.assigned_mr,
    a.transcription, a.transcription_view_url,
    a.call_sub_id, a.initial_id,
    a.call_start_time, a.call_end_time, a.call_duration_sec,
    a.call_status, a.call_type, a.call_end_reason,
    a.ai_call_category, a.final_call_status,
    a.customer_engagement_level, a.interest_level,
    a.call_outcome, a.next_action_required,
    a.ai_call_summary, a.lead_status, a.customer_context,
    a.preferred_datetime, a.customer_intent,
    a.additional_notes, a.service_category,
    a.final_lead_outcome, a.followup_time,
    a.followup_status, a.company_by_kserve,
    a.calculated_qualification_status,
    a.company, a.tat, a.followup_required,
    a.client_category, a.next_assigned_to,
    a.sent_status, a.repush_status,
    a.verified_source, a.feedback_submitted,
    a.feedback_data, a.sent_status_date,
    a.error_alert_qualified_lead, a.response,
    a.feedback_date, a.created_at, a.updated_at,
    a.status, a.assign_to_app_sheet_or_dialer, a.remarks, a.doer
FROM    ai_voice_leads_received a
INNER JOIN (${innerSql}) b ON a.id = b.max_id
ORDER BY a.id DESC
${hasDateRange ? `LIMIT ${MAX_HISTORY_ROWS}` : `LIMIT ${RECENT_ROW_CAP}`};
            `, groupParams) as any[];
        } finally {
            connection.release();
        }

        const truncated = !hasDateRange ? rows.length >= RECENT_ROW_CAP : rows.length >= MAX_HISTORY_ROWS;
        const mapped = (rows as any[]).map(mapRow);

        // 4. Save to cache
        memoryCache[cacheBucket] = mapped;
        lastFetchTime[cacheBucket] = Date.now();
        try {
            fs.writeFileSync(tmpFile, JSON.stringify(mapped));
        } catch (e) {
            console.warn("[received-leads] File cache write error:", e);
        }

        return NextResponse.json(mapped, {
            headers: { ...noStoreHeaders, "X-Leads-Truncated": truncated ? "1" : "0", "X-Leads-Count": String(mapped.length) },
        });

    } catch (error: any) {
        console.error("[received-leads] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch received leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
