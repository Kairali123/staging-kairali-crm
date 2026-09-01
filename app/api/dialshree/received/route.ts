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

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};
const MAX_SCAN_ROWS = 25000;
const MAX_HISTORY_ROWS = 2000;

function hasDialShreeAccess(user: any): boolean {
    const roleStr = String(user?.role || "").trim().toLowerCase();
    return roleStr === "super_admin" || roleStr === "super admin";
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

function mapCompany(websiteName: string, dataSource: string, sheetName: string): string {
    const s = `${websiteName || ""} ${dataSource || ""} ${sheetName || ""}`.toUpperCase();

    // 1. Villaraag
    if (s.includes("VILLARAAG") || s.includes("VILLA RAAG")) return "VILLARAAG";

    // 2. KTAHV / Healing Village
    if (
        s.includes("KTAHV") ||
        s.includes("HEALING VILLAGE") ||
        s.includes("AHV")
    ) return "KTAHV";

    // 3. KAPPL / Products
    if (
        s.includes("KAPPL") ||
        s.includes("PRODUCTS") ||
        s.includes("KAP") ||
        s.includes("AYURVEDIC PRODUCTS")
    ) return "KAPPL";

    // 4. Default to KAC
    return "KAC";
}

function deriveLeadStatus(category: string, disposition: string): string {
    if (category) {
        const cat = category.toLowerCase().trim();
        if (cat.includes("qualified") && !cat.includes("non") && !cat.includes("not") && !cat.includes("un")) {
            return "Qualified";
        }
        if (cat.includes("non") || cat.includes("not") || cat.includes("un") || cat.includes("junk") || cat.includes("cold")) {
            return "Non-Qualified";
        }
    }
    if (disposition) {
        const d = disposition.toLowerCase().trim();
        if (["sale made", "converted", "transfer to mr", "call transferred", "product distributor", "product stockists"].some(k => d.includes(k))) {
            return "Qualified";
        }
        if (["cold", "not interested", "declined sale", "junk", "disconnected number", "do not call", "dead air", "wrong number", "dnc"].some(k => d.includes(k))) {
            return "Non-Qualified";
        }
    }
    return "Pending";
}

function isAudioUrl(url: any): boolean {
    if (!url) return false;
    const u = String(url).toLowerCase().trim();
    if (!u.startsWith("http")) return false;
    return (
        u.includes(".mp3") ||
        u.includes(".wav") ||
        u.includes("kstorage") ||
        u.includes("squadiq") ||
        u.includes("recording") ||
        u.includes("knowlarity") ||
        u.includes("dialer") ||
        u.includes("/recordings/") ||
        u.includes("s3.amazonaws.com")
    );
}

// ─── Row → Frontend Shape ─────────────────────────────────────────────────────

function mapRow(row: any): object {
    const websiteName = safeStr(row.WebSite_Name);
    const dataSource = safeStr(row.Data_Source);
    const sheetName = safeStr(row.sheet_name);
    const clientName = safeStr(row.Name_of_Client) || safeStr(row.customer_name);
    const mobile = safeStr(row.Mobile) || safeStr(row.Default_Contact_No);
    const email = safeStr(row.Email_Id) || safeStr(row.Default_Email_ID);
    const rawLatestRec = safeStr(row.latest_recording_url);
    const rawIvr = safeStr(row.IVR_URL);
    const audioUrl = isAudioUrl(rawLatestRec) ? rawLatestRec : isAudioUrl(rawIvr) ? rawIvr : rawLatestRec || rawIvr;
    const disposition = safeStr(row.Full_Disposition);
    const leadCategory = safeStr(row.lead_category);
    const intent = safeStr(row.sqv_lead_intent) || safeStr(row.lead_priority);

    return {
        id: safeStr(row.lead_id) || safeStr(row.sl_no),
        dbId: row.sl_no ?? null,
        sl_no: row.sl_no,
        timeIdKey: safeStr(row.timeIdKey),
        timestamp: safeDate(row.Timestamp),
        dateTime: safeDate(row.Date_Time),
        clientName: clientName || "—",
        mobile: mobile || "—",
        email: email || "—",
        subject: safeStr(row.Subjects),
        notes: safeStr(row.Notes),
        ivrUrl: audioUrl,
        latest_recording_url: isAudioUrl(rawLatestRec) ? rawLatestRec : audioUrl,
        website: websiteName,
        dataSource: dataSource,
        verified_source: safeStr(row.Verified_Source),
        assigned_mr: safeStr(row.Assign_To_MR_Main_Agent_Name),
        assignto: safeStr(row.Assign_To_MR_Main_Agent_Name) || safeStr(row.Transfer_To),
        transcription: safeStr(row.Remarks_History) || safeStr(row.Comment),
        viewUrl: safeStr(row.Sample_New_Order_Form_Link),
        callSubId: safeStr(row.list_id),
        initialid: safeStr(row.lead_id) || safeStr(row.timeIdKey),
        callstarttime: safeDate(row.actual_time || row.Timestamp),
        callendtime: safeDate(row.send_lead_Date_Time || row.actual_time),
        callduration: safeStr(row.call_recording_duration, "0"),
        callstatus: disposition,
        calltype: safeStr(row.Call_Type),
        callendreason: safeStr(row.HangUp_Reason),
        aicallcategory: leadCategory,
        finalcallstatus: disposition,
        customerengagementlevel: safeStr(row.call_Count ? `${row.call_Count} calls` : ""),
        interestlevel: intent,
        calloutcome: disposition,
        nextactionrequired: safeStr(row.Followup),
        aicallsummary: safeStr(row.Remarks_History) || safeStr(row.Comment) || safeStr(row.Call_Notes),
        lead_status: leadCategory || disposition,
        leadstatus: deriveLeadStatus(leadCategory, disposition),
        cutomercontext: safeStr(row.Call_Notes) || safeStr(row.Notes),
        preferreddatetime: safeDate(row.Followup_Date),
        cutomerintent: intent,
        additionalnotes: safeStr(row.Comment),
        servicecategory: safeStr(row.from_sheet),
        finalleadoutcome: disposition,
        scheduledtime: safeDate(row.planned_date || row.Followup_Date),
        scheduledstatus: safeStr(row.Followup),
        company: mapCompany(websiteName, dataSource, sheetName),
        company_by_kserve: "",
        tat: safeStr(row.Time_Delay),
        doer: safeStr(row.doer),
        agent_Id: safeStr(row.agent_Id),
        campaign_name: safeStr(row.campaign_name),
        campaign_id: safeStr(row.campaign_id),
        leadId_from_dialer: safeStr(row.leadId_from_dialer),
        created_at: safeDate(row.created_at),
        updated_at: safeDate(row.created_at),
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

        if (!hasDialShreeAccess(user)) {
            return NextResponse.json(
                { success: false, error: "Access denied: Insufficient permissions" },
                { status: 403, headers: noStoreHeaders }
            );
        }

        const { searchParams } = new URL(request.url);
        const force = searchParams.get("force") === "1";
        const leadId = searchParams.get("leadId") || searchParams.get("initialId");
        const allRows = searchParams.get("allRows") === "1";

        // Query Call History for a single lead
        if (leadId && allRows) {
            const pool = await getPool();
            const connection = await pool.getConnection();
            try {
                const [rows] = await connection.execute(`
                    SELECT
                        sl_no, timeIdKey, lead_id, Timestamp, Date_Time,
                        Name_of_Client, Mobile, Email_Id, Subjects, Notes,
                        IVR_URL, WebSite_Name, Data_Source, Verified_Source,
                        actual_time, Assign_To_MR_Main_Agent_Name, Remarks_History,
                        call_Count, agent_Id, Full_Disposition, HangUp_Reason,
                        Call_Type, Comment, Call_Notes, Time_Delay, Transfer_To,
                        Sample_New_Order_Form_Link, created_at, latest_recording_url,
                        sqv_lead_intent, lead_category, lead_priority, doer,
                        call_recording_duration, planned_date, campaign_name,
                        customer_name, list_id, leadId_from_dialer, campaign_id,
                        from_sheet, Followup, Followup_Date, Lead_Conversion,
                        Conversion_Amount, send_lead_Date_Time, sheet_name
                    FROM lead_fms
                    WHERE lead_id = ? OR timeIdKey = ? OR timeIdKey LIKE CONCAT(?, '@%')
                    ORDER BY sl_no DESC
                    LIMIT ${MAX_HISTORY_ROWS}
                `, [leadId, leadId, leadId]) as any[];
                return NextResponse.json((rows as any[]).map(mapRow), { headers: noStoreHeaders });
            } finally {
                connection.release();
            }
        }

        const now = Date.now();
        const tmpFile = path.join(os.tmpdir(), "dialshree_received_cache_v1.json");

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
                console.warn("[dialshree-received] File cache read error:", e);
            }
        }

        // 3. Query MySQL
        const pool = await getPool();
        const connection = await pool.getConnection();
        let rows: any[];

        try {
            [rows] = await connection.execute(`
                SELECT
                    sl_no, timeIdKey, lead_id, Timestamp, Date_Time,
                    Name_of_Client, Mobile, Email_Id, Subjects, Notes,
                    IVR_URL, WebSite_Name, Data_Source, Verified_Source,
                    actual_time, Assign_To_MR_Main_Agent_Name, Remarks_History,
                    call_Count, agent_Id, Full_Disposition, HangUp_Reason,
                    Call_Type, Comment, Call_Notes, Time_Delay, Transfer_To,
                    Sample_New_Order_Form_Link, created_at, latest_recording_url,
                    sqv_lead_intent, lead_category, lead_priority, doer,
                    call_recording_duration, planned_date, campaign_name,
                    customer_name, list_id, leadId_from_dialer, campaign_id,
                    from_sheet, Followup, Followup_Date, Lead_Conversion,
                    Conversion_Amount, send_lead_Date_Time, sheet_name
                FROM lead_fms
                ORDER BY sl_no DESC
            `) as any[];
        } finally {
            connection.release();
        }

        const mapped = (rows as any[]).map(mapRow);

        // 4. Save to cache
        memoryCache = mapped;
        lastFetchTime = Date.now();
        try {
            fs.writeFileSync(tmpFile, JSON.stringify(mapped));
        } catch (e) {
            console.warn("[dialshree-received] File cache write error:", e);
        }

        return NextResponse.json(mapped, { headers: noStoreHeaders });

    } catch (error: any) {
        console.error("[dialshree-received] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch DialShree received leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}
