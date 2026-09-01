import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

// ─── Helpers (same pattern as received-leads API) ─────────────────────────────

function safeStr(val: any): string {
    if (val === null || val === undefined) return "";
    if (val instanceof Date) return safeDate(val);
    return String(val).trim();
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

// ─── Heuristics: classify non-qualification reason from AI call log ────────────

function categorizeReason(text: string): string {
    if (!text) return "Unknown / Disconnected";
    const t = text.toLowerCase();

    if (t.includes("wrong number") || t.includes("not the intended recipient")) return "Wrong Number";
    if (t.includes("duplicate") || t.includes("already received a call") || t.includes("previous call") || t.includes("already spoke")) return "Duplicate Lead";
    if (t.includes("budget") || t.includes("cannot afford") || t.includes("price") || t.includes("expensive") || t.includes("cost")) return "Budget / Price Issue";
    if (t.includes("location") || t.includes("pune") || t.includes("palakkad") || t.includes("closer to home") || t.includes("different location") || t.includes("delhi")) return "Location Mismatch";
    if (t.includes("mistakenly") || t.includes("not intended to call") || t.includes("mistake") || t.includes("did not enquire") || t.includes("haven't enquired")) return "Did Not Enquire";
    if (t.includes("job") || t.includes("employment") || t.includes("vacancy") || t.includes("recruitment")) return "Jobs / Employment Enquiry";
    if (t.includes("wedding") || t.includes("girl") || t.includes("garden") || t.includes("rented") || t.includes("spam") || t.includes("dismissive") || t.includes("unrelated")) return "Junk / Unrelated Enquiry";
    if (t.includes("busy") || t.includes("no time") || t.includes("preoccupied") || t.includes("call back later") || t.includes("call later")) return "Busy / Call Later";
    if (t.includes("cannot be called") || t.includes("don't call") || t.includes("remove my number") || t.includes("dnc")) return "DNC / Opt-Out";
    if (t.includes("no response") || t.includes("user did not respond") || t.includes("remained silent") || t.includes("user silence")) return "No Response / Silence";
    if (t.includes("not interested") || t.includes("declined the conversation") || t.includes("disinterest") || t.includes("no need any assistance") || t.includes("did not require any") || t.includes("no interest") || t.includes("rejected") || t.includes("negative") || t.includes("nothing")) return "Not Interested / Declined";
    if (t.includes("attempted to initiate a conversation") && t.includes("no response")) return "No Response / Silence";

    return "Other / Disconnected";
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    try {
        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(`
                SELECT 
                    lead_id as id,
                    initial_id,
                    company,
                    call_end_reason,
                    ai_call_category,
                    final_lead_outcome,
                    calculated_qualification_status,
                    timestamp,
                    client_name,
                    mobile,
                    email,
                    call_start_time,
                    call_end_time
                FROM ai_voice_leads_received
                WHERE calculated_qualification_status = 'Non-Qualified' AND company IS NOT NULL
                ORDER BY timestamp DESC
            `) as any[];

            const processedRows = rows.map((row: any) => ({
                id: safeStr(row.id) || safeStr(row.initial_id) || "Unknown",
                initial_id: safeStr(row.initial_id),
                company: safeStr(row.company) || "Unknown",
                call_end_reason: safeStr(row.call_end_reason) || "Unknown",
                ai_call_category: safeStr(row.ai_call_category) || "No call category text available.",
                final_lead_outcome: safeStr(row.final_lead_outcome) || "Unknown",
                calculated_qualification_status: safeStr(row.calculated_qualification_status) || "Non-Qualified",
                timestamp: safeDate(row.timestamp),
                extracted_reason: categorizeReason(safeStr(row.ai_call_category)),
                client_name: safeStr(row.client_name),
                mobile: safeStr(row.mobile),
                email: safeStr(row.email),
                call_start_time: safeDate(row.call_start_time),
                call_end_time: safeDate(row.call_end_time),
            }));

            return NextResponse.json(processedRows);
        } finally {
            connection.release();
        }
    } catch {
        console.error("[voicecall/non-qualified API] request failed");
        return NextResponse.json(
            { error: "Database connection failed" },
            { status: 500 }
        );
    }
}
