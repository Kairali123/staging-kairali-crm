import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifySessionCookieValue } from "@/lib/session";
import { formatIsoIST } from "@/lib/lead-date";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Cache Config ─────────────────────────────────────────────────────────────
// Namespaced per date-range bucket so different filter windows don't collide.
let memoryCache: Record<string, any[]> = {};
let lastFetchTime: Record<string, number> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};
// `generate_timestamp` is indexed, so date-scoped queries are fast. When no range
// is given (e.g. a bare cross-reference lookup), fall back to the most recent rows
// instead of the entire table. Either way, a final LIMIT caps the response so it
// always fits well under a serverless function's response-size limit.
const RECENT_ROW_CAP = 1200;
const RANGED_ROW_CAP = 1500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return safeDate(val);
    return String(val);
}

function safeDate(val: any): string {
    return formatIsoIST(val, "");
}

// ─── Row → Frontend Shape ─────────────────────────────────────────────────────
// Maps SQL columns → exact keys that useSentLeads.tsx expects (r.xxx)

function mapRow(row: any): object {
    return {
        // Required by hook: r.enqid (filter key)
        enqid: safeStr(row.enquiry_id),

        // Timestamps
        genratetimestamp: safeDate(row.generate_timestamp),
        datetime: safeDate(row.enquiry_date_time),

        // Client info
        nameofclient: safeStr(row.name_of_client),
        moblie: safeStr(row.mobile),          // hook spells it "moblie"
        emailid: safeStr(row.email_id),

        // Content
        subject: safeStr(row.subjects),        // SQL: subjects → hook: subject
        notes: safeStr(row.notes),
        ivrurl: safeStr(row.ivr_url),
        websitename: safeStr(row.website_name),

        // Source / Campaign
        datasource: safeStr(row.data_source),
        campaignid: safeStr(row.campaign_id),
        campaignname: safeStr(row.campaign_name),

        // Assignment & Response
        assignto: safeStr(row.assign_to),
        responsefromkserve: safeStr(row.response_from_kserve),
        transfertokservestatus: safeDate(row.transfer_to_kserve_status),
        stauscode: safeStr(row.code_status),     // hook spells it "stauscode"

        // Extra SQL fields (available for future use / new UI features)
        company: safeStr(row.website_name ?? ""),
        region: safeStr(row.region ?? ""),
        lead_intent: safeStr(row.lead_intent),
        urgency: safeStr(row.urgency),
        new_mobile: safeStr(row.new_mobile),
        may_sent_to: safeStr(row.may_sent_to),
        location: safeStr(row.location),
        timezone: safeStr(row.timezone),
        utc_offset: safeStr(row.utc_offset),
        business_hours_start: safeStr(row.business_hours_start),
        business_hours_end: safeStr(row.business_hours_end),
        weekdays_config: safeStr(row.weekdays_config),
        received: safeStr(row.received),
        received_date: safeDate(row.received_date),
        total_call_count: row.total_call_count ?? 0,
        call_outcome: safeStr(row.call_outcome),
        call_status: safeStr(row.call_status),
        call_history_link: safeStr(row.call_history_link),
        Total_time_to_call_complete: safeStr(row.Total_time_to_call_complete),
        id: row.id ?? null,
        created_at: safeDate(row.created_at),
        updated_at: safeDate(row.updated_at),
    };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        // Authenticate session
        let session: any = null;
        try {
            const userCookie = request.cookies.get("kairali_user")?.value;
            session = userCookie ? verifySessionCookieValue(userCookie) : null;
        } catch {
            session = null;
        }
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }

        // Authorize RBAC permission
        const permissions = session.permissions || [];
        if (!permissions.includes("ai_voice_sent.view") && !permissions.includes("all")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: noStoreHeaders });
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "1";
        const isValidDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
        const dateFromParam = searchParams.get("dateFrom");
        const dateToParam = searchParams.get("dateTo");
        const dateFrom = isValidDate(dateFromParam) ? dateFromParam : null;
        const dateTo = isValidDate(dateToParam) ? dateToParam : null;
        const hasDateRange = !!(dateFrom || dateTo);
        const now = Date.now();
        const cacheBucket = hasDateRange ? `${dateFrom || ""}_${dateTo || ""}` : "recent";
        const tmpFile = path.join(os.tmpdir(), `sent_leads_cache_v2_${cacheBucket}.json`);

        // ── 1. Memory cache ──────────────────────────────────────────────────
        if (!force && memoryCache[cacheBucket]?.length && now - (lastFetchTime[cacheBucket] || 0) < CACHE_TTL) {
            return NextResponse.json(memoryCache[cacheBucket]);
        }

        // ── 2. File cache (survives serverless warm reboots) ─────────────────
        if (!force) {
            try {
                if (fs.existsSync(tmpFile)) {
                    const stat = fs.statSync(tmpFile);
                    if (now - stat.mtimeMs < CACHE_TTL) {
                        const data = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
                        memoryCache[cacheBucket] = data;
                        lastFetchTime[cacheBucket] = stat.mtimeMs;
                        return NextResponse.json(data);
                    }
                }
            } catch (e) {
                console.warn("[sent-leads] File cache read error:", e);
            }
        }

        // ── 3. Query MySQL ────────────────────────────────────────────────────
        // `idx_generate_timestamp` makes the date-scoped WHERE fast. Without a range,
        // fall back to the most recent rows. Either way, LIMIT caps the payload.
        const pool = await getPool();
        const connection = await pool.getConnection();

        let rows: any[];
        const whereParts: string[] = [];
        const whereParams: any[] = [];
        if (dateFrom) { whereParts.push("generate_timestamp >= ?"); whereParams.push(`${dateFrom} 00:00:00`); }
        if (dateTo) { whereParts.push("generate_timestamp < DATE_ADD(?, INTERVAL 1 DAY)"); whereParams.push(`${dateTo} 00:00:00`); }
        const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
        const rowCap = hasDateRange ? RANGED_ROW_CAP : RECENT_ROW_CAP;

        try {
            [rows] = await connection.execute(`
                SELECT
                    id,
                    generate_timestamp,
                    enquiry_date_time,
                    enquiry_id,
                    name_of_client,
                    mobile,
                    email_id,
                    subjects,
                    notes,
                    ivr_url,
                    website_name,
                    data_source,
                    campaign_id,
                    campaign_name,
                    assign_to,
                    response_from_kserve,
                    transfer_to_kserve_status,
                    code_status,
                    lead_intent,
                    urgency,
                    new_mobile,
                    may_sent_to,
                    location,
                    timezone,
                    utc_offset,
                    business_hours_start,
                    business_hours_end,
                    weekdays_config,
                    received,
                    received_date,
                    total_call_count,
                    call_outcome,
                    call_status,
                    call_history_link,
                    Total_time_to_call_complete,
                    created_at,
                    updated_at
                FROM ai_voice_leads_sent
                ${whereSql}
                ORDER BY generate_timestamp DESC
                LIMIT ${rowCap}
            `, whereParams) as any[];
        } finally {
            connection.release();
        }

        const truncated = rows.length >= rowCap;
        const mapped = (rows as any[]).map(mapRow);

        // ── 4. Save to cache ──────────────────────────────────────────────────
        memoryCache[cacheBucket] = mapped;
        lastFetchTime[cacheBucket] = Date.now();
        try {
            fs.writeFileSync(tmpFile, JSON.stringify(mapped));
        } catch (e) {
            console.warn("[sent-leads] File cache write error:", e);
        }

        return NextResponse.json(mapped, {
            headers: { ...noStoreHeaders, "X-Leads-Truncated": truncated ? "1" : "0", "X-Leads-Count": String(mapped.length) },
        });

    } catch (error: any) {
        console.error("[sent-leads] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch sent leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}