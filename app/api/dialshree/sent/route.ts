import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUserResult, hasAnyPermission } from "@/lib/authz";
import fs from "fs";
import path from "path";
import os from "os";

// ─── Cache Config ─────────────────────────────────────────────────────────────
let memoryCache: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

const MAX_SCAN_ROWS = 25000;

function hasDialShreeSentAccess(user: any): boolean {
    if (!user) return false;
    const roleStr = String(user?.role || "").trim().toLowerCase();
    if (roleStr === "super_admin" || roleStr === "super admin" || roleStr === "admin") return true;
    return hasAnyPermission(user, ["dialshree_sent.view", "dialshree_menu.view", "ai_voice_sent.view", "all"]);
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
        if (str.startsWith("0000-00-00")) return "";
        const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
        const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}T${m2[4]}:${m2[5]}:${m2[6]}`;
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
    return "KAC";
}

function deriveStatus(code: string, responseResult: string): { label: string; dot: "g" | "o" | "r" | "b" | "x"; color: "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink" } {
    const c = String(code || "").toLowerCase().trim();
    const r = String(responseResult || "").toLowerCase().trim();

    if (c === "200" || c === "success" || r.includes("success") || r.includes("200 ok") || r.includes("lead has been added")) {
        return { label: "Success", dot: "g", color: "green" };
    }
    if (c === "failed" || c === "fail" || c.startsWith("4") || c.startsWith("5") || r.includes("error") || r.includes("failed") || r.includes("exception")) {
        return { label: c ? `Failed (${c})` : "Failed", dot: "r", color: "red" };
    }
    if (c === "pending" || r.includes("pending") || (!c && !r)) {
        return { label: "Pending", dot: "o", color: "yellow" };
    }
    if (c) {
        return { label: code, dot: "b", color: "blue" };
    }
    return { label: "Processed", dot: "g", color: "teal" };
}

// ─── Row → Frontend Shape ─────────────────────────────────────────────────────

function mapRow(row: any): object {
    const websiteName = safeStr(row.website_name);
    const dataSource = safeStr(row.data_source);
    const campaignName = safeStr(row.campaign_name);
    const responseResult = safeStr(row.response_result);
    const code = safeStr(row.code);
    const status = deriveStatus(code, responseResult);
    const geo = safeStr(row.geo);
    const regionDerived = geo.toLowerCase().includes("domestic") ? "DOMESTIC" : "INTERNATIONAL";

    return {
        id: row.id,
        timestamp: safeDate(row.timestamp),
        enquiry_date_time: safeDate(row.enquiry_date_time),
        lead_id: safeStr(row.lead_id),
        name_of_client: safeStr(row.name_of_client),
        mobile: safeStr(row.mobile),
        email_id: safeStr(row.email_id),
        subjects: safeStr(row.subjects),
        notes: safeStr(row.notes),
        url: safeStr(row.url),
        website_name: websiteName,
        data_source: dataSource,
        assign_to: safeStr(row.assign_to),
        remarks_history: safeStr(row.remarks_history),
        sqv_lead_intent: safeStr(row.sqv_lead_intent),
        campaign_name: campaignName,
        list_id: safeStr(row.list_id),
        sqv_remarks: safeStr(row.sqv_remarks),
        alt_mobile: safeStr(row.alt_mobile),
        alt_email_id: safeStr(row.alt_email_id),
        geo: geo,
        response_result: responseResult,
        timestamp_sent_not_sent: safeDate(row.timestamp_sent_not_sent),
        action_after_getting_exception: safeStr(row.action_after_getting_exception),
        timestamp_after_action: safeDate(row.timestamp_after_action),
        location: safeStr(row.location),
        timezone: safeStr(row.timezone),
        utc_offset: safeStr(row.utc_offset),
        business_hours_start: safeStr(row.business_hours_start),
        business_hours_end: safeStr(row.business_hours_end),
        weekdays_config: safeStr(row.weekdays_config),
        code: code,
        region: regionDerived,
        raw_region: safeStr(row.region),
        location_2: safeStr(row.location_2),
        created_at: safeDate(row.created_at),
        updated_at: safeDate(row.updated_at),
        company: mapCompany(websiteName, dataSource, campaignName),
        status: status,
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
                { success: false, error: "Access denied: Insufficient permissions to view DialShree sent leads" },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "1";
        const leadId = searchParams.get("leadId");

        const pool = await getPool();

        // Query by specific lead_id if requested
        if (leadId) {
            const [rows]: any = await pool.query(`
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
                WHERE lead_id = ?
                ORDER BY id DESC
                LIMIT 100
            `, [leadId]);
            return NextResponse.json((rows as any[]).map(mapRow), { headers: noStoreHeaders });
        }

        const now = Date.now();
        const tmpFile = path.join(os.tmpdir(), "dialshree_sent_cache_v2.json");

        // 1. In-memory cache
        if (!force && memoryCache && memoryCache.length > 0 && now - lastFetchTime < CACHE_TTL) {
            return NextResponse.json(memoryCache);
        }

        // 2. Temp file cache
        if (!force) {
            try {
                if (fs.existsSync(tmpFile)) {
                    const stat = fs.statSync(tmpFile);
                    if (now - stat.mtimeMs < CACHE_TTL) {
                        const fileData = JSON.parse(fs.readFileSync(tmpFile, "utf8"));
                        if (Array.isArray(fileData) && fileData.length > 0) {
                            memoryCache = fileData;
                            lastFetchTime = stat.mtimeMs;
                            return NextResponse.json(fileData);
                        }
                    }
                }
            } catch (e) {
                console.warn("[dialshree-sent] File cache read error:", e);
            }
        }

        // 3. Query MySQL for ALL records
        const [rows]: any = await pool.query(`
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
        `);

        const mapped = (rows as any[]).map(mapRow);

        // 4. Save to cache
        memoryCache = mapped;
        lastFetchTime = Date.now();
        try {
            fs.writeFileSync(tmpFile, JSON.stringify(mapped));
        } catch (e) {
            console.warn("[dialshree-sent] File cache write error:", e);
        }

        return NextResponse.json(mapped, { headers: noStoreHeaders });

    } catch (error: any) {
        console.error("[dialshree-sent] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch DialShree sent leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
