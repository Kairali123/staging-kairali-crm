import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUserResult, hasAdminRole, hasAnyPermission } from "@/lib/authz";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Cache Config ─────────────────────────────────────────────────────────────
let memoryCache: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

export function clearDialShreeSentMemoryCache() {
    memoryCache = null;
    lastFetchTime = 0;
}

const noStoreHeaders = {
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

const MAX_SCAN_ROWS = 25000;
const MAX_LEAD_LOOKUP_ROWS = 100;

export function hasDialShreeSentAccess(user: any): boolean {
    if (!user) return false;
    if (hasAdminRole(user, 'lower')) return true;
    const roleStr = String(user?.role || "").trim().toLowerCase();
    if (roleStr === "super_admin" || roleStr === "super admin" || roleStr === "admin") return true;
    return hasAnyPermission(user, ["dialshree_sent.view", "dialshree.view", "all"]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: any, fallback = ""): string {
    if (val === null || val === undefined) return fallback;
    if (val instanceof Date) return safeDate(val);
    const s = String(val).trim();
    return s === "" ? fallback : s;
}

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
    } catch {
        return "";
    }
}

function mapCompany(websiteName: string, dataSource: string, campaignName: string): string {
    const s = `${websiteName || ""} ${dataSource || ""} ${campaignName || ""}`.toUpperCase();

    if (s.includes("VILLARAAG") || s.includes("VILLA RAAG")) return "VILLARAAG";
    if (s.includes("KTAHV") || s.includes("HEALING VILLAGE") || s.includes("AHV")) return "KTAHV";
    if (s.includes("KAPPL") || s.includes("PRODUCTS") || s.includes("KAP") || s.includes("AYURVEDIC PRODUCTS")) return "KAPPL";
    if (s.includes("CRR")) return "CRR";
    return "KAC";
}

export function parseDeliveryStatus(responseResult: string | null, actionAfterException: string | null): {
    label: string;
    category: "sent" | "exception" | "pending";
    color: "green" | "red" | "orange" | "blue" | "gray";
} {
    const raw = (responseResult || "").trim();
    const ex = (actionAfterException || "").trim();

    if (ex && ex.toLowerCase() !== "none" && ex.toLowerCase() !== "null") {
        return { label: "Exception Handled", category: "exception", color: "red" };
    }

    if (!raw || raw.toLowerCase() === "null") {
        return { label: "Pending", category: "pending", color: "orange" };
    }

    if (raw.toLowerCase().startsWith("sent to -")) {
        const dest = raw.replace(/^sent to -\s*/i, "").trim();
        return { label: `Sent (${dest || "Agent"})`, category: "sent", color: "green" };
    }

    // Try parsing JSON response from DialShree API
    if (raw.startsWith("{") && raw.endsWith("}")) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed.status === true || String(parsed.message || "").toLowerCase().includes("added")) {
                return { label: "Sent (API Success)", category: "sent", color: "green" };
            }
            if (parsed.status === false || parsed.error) {
                return { label: "API Error", category: "exception", color: "red" };
            }
        } catch {
            // Not valid JSON
        }
    }

    const lower = raw.toLowerCase();
    if (lower.includes("error") || lower.includes("fail") || lower.includes("exception") || lower.includes("invalid")) {
        return { label: "Failed", category: "exception", color: "red" };
    }

    if (lower.includes("success") || lower.includes("sent") || lower.includes("delivered")) {
        return { label: "Sent", category: "sent", color: "green" };
    }

    return { label: "Processed", category: "sent", color: "blue" };
}

// ─── Row → Frontend Shape ─────────────────────────────────────────────────────

function mapSentRow(row: any): object {
    const websiteName = safeStr(row.website_name);
    const dataSource = safeStr(row.data_source);
    const campaignName = safeStr(row.campaign_name);
    const responseResult = safeStr(row.response_result);
    const actionException = safeStr(row.action_after_getting_exception);
    const delivery = parseDeliveryStatus(responseResult, actionException);

    return {
        id: Number(row.id),
        leadId: safeStr(row.lead_id) || `SENT-${row.id}`,
        timestamp: safeDate(row.timestamp),
        enquiryDateTime: safeDate(row.enquiry_date_time),
        timestampSentNotSent: safeDate(row.timestamp_sent_not_sent),
        timestampAfterAction: safeDate(row.timestamp_after_action),
        createdAt: safeDate(row.created_at),
        updatedAt: safeDate(row.updated_at),

        clientName: safeStr(row.name_of_client) || "—",
        mobile: safeStr(row.mobile) || "—",
        altMobile: safeStr(row.alt_mobile),
        email: safeStr(row.email_id) || "—",
        altEmail: safeStr(row.alt_email_id),

        subjects: safeStr(row.subjects),
        notes: safeStr(row.notes),
        url: safeStr(row.url),
        websiteName: websiteName || "—",
        dataSource: dataSource || "—",
        assignTo: safeStr(row.assign_to) || "—",
        remarksHistory: safeStr(row.remarks_history),

        campaignName: campaignName || "—",
        listId: safeStr(row.list_id),
        sqvLeadIntent: safeStr(row.sqv_lead_intent) || "—",
        sqvRemarks: safeStr(row.sqv_remarks),

        responseResult: responseResult,
        actionAfterException: actionException,
        deliveryStatus: delivery,

        location: safeStr(row.location),
        location2: safeStr(row.location_2),
        region: safeStr(row.region),
        code: safeStr(row.code),
        geo: safeStr(row.geo),
        timezone: safeStr(row.timezone),
        utcOffset: safeStr(row.utc_offset),
        businessHoursStart: safeStr(row.business_hours_start),
        businessHoursEnd: safeStr(row.business_hours_end),
        weekdaysConfig: safeStr(row.weekdays_config),

        company: mapCompany(websiteName, dataSource, campaignName),
    };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
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

        const user = session.user;

        if (!hasDialShreeSentAccess(user)) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "1";
        const leadId = searchParams.get("leadId") || searchParams.get("id");

        // 1. Query by specific Lead ID or Primary ID
        if (leadId) {
            const pool = await getPool();
            const connection = await pool.getConnection();
            try {
                const [rows] = await connection.execute(`
                    SELECT
                        id, timestamp, enquiry_date_time, lead_id, name_of_client,
                        mobile, email_id, subjects, notes, url, website_name,
                        data_source, assign_to, remarks_history, sqv_lead_intent,
                        campaign_name, list_id, sqv_remarks, alt_mobile, alt_email_id,
                        geo, response_result, timestamp_sent_not_sent,
                        action_after_getting_exception, timestamp_after_action,
                        location, timezone, utc_offset, business_hours_start,
                        business_hours_end, weekdays_config, code, region,
                        location_2, created_at, updated_at
                    FROM dialshree_kairali_sent
                    WHERE lead_id = ? OR id = ?
                    ORDER BY id DESC
                    LIMIT ${MAX_LEAD_LOOKUP_ROWS}
                `, [leadId, leadId]) as any[];

                return NextResponse.json(
                    (rows as any[]).map(mapSentRow),
                    { headers: noStoreHeaders }
                );
            } finally {
                connection.release();
            }
        }

        const now = Date.now();
        const tmpFile = path.join(os.tmpdir(), "dialshree_sent_cache_v1.json");

        // 2. In-memory cache check
        if (!force && memoryCache && memoryCache.length > 0 && now - lastFetchTime < CACHE_TTL) {
            return NextResponse.json(memoryCache, { headers: noStoreHeaders });
        }

        // 3. Temp file cache check
        if (!force) {
            try {
                if (fs.existsSync(tmpFile)) {
                    const stat = fs.statSync(tmpFile);
                    if (now - stat.mtimeMs < CACHE_TTL) {
                        const fileData = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
                        if (Array.isArray(fileData) && fileData.length > 0) {
                            memoryCache = fileData;
                            lastFetchTime = stat.mtimeMs;
                            return NextResponse.json(fileData, { headers: noStoreHeaders });
                        }
                    }
                }
            } catch (e) {
                console.warn("[dialshree-sent] File cache read error:", e);
            }
        }

        // 4. Query MySQL Database with explicit column projection
        const pool = await getPool();
        const connection = await pool.getConnection();
        let rows: any[];

        try {
            [rows] = await connection.query(`
                SELECT
                    id, timestamp, enquiry_date_time, lead_id, name_of_client,
                    mobile, email_id, subjects, notes, url, website_name,
                    data_source, assign_to, remarks_history, sqv_lead_intent,
                    campaign_name, list_id, sqv_remarks, alt_mobile, alt_email_id,
                    geo, response_result, timestamp_sent_not_sent,
                    action_after_getting_exception, timestamp_after_action,
                    location, timezone, utc_offset, business_hours_start,
                    business_hours_end, weekdays_config, code, region,
                    location_2, created_at, updated_at
                FROM dialshree_kairali_sent
                ORDER BY id DESC
                LIMIT ${MAX_SCAN_ROWS}
            `) as any[];
        } finally {
            connection.release();
        }

        const mapped = (rows as any[]).map(mapSentRow);

        // 5. Update caches
        memoryCache = mapped;
        lastFetchTime = Date.now();
        try {
            fs.writeFileSync(tmpFile, JSON.stringify(mapped));
        } catch (e) {
            console.warn("[dialshree-sent] File cache write error:", e);
        }

        return NextResponse.json(mapped, { headers: noStoreHeaders });

    } catch (error: any) {
        console.error("[dialshree-sent] Database error:", error?.message);
        return NextResponse.json(
            { success: false, error: "Database error fetching DialShree sent outreach records" },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
