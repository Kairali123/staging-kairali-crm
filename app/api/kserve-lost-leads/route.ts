import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifySessionCookieValue } from "@/lib/session";
import { formatIsoIST } from "@/lib/lead-date";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// ─── Config (mirrors KServeConfig.js) ─────────────────────────────────────────

/** Master!T values that count as a completed call. Verify against real data:
 *  SELECT call_status, COUNT(*) FROM ai_voice_leads_received GROUP BY 1; */
const COMPLETED_CALL_STATUSES = ["completed", "connected"];

/** "outcome" = outcome maps (getDataForKServe). "an" = calculated_qualification_status (getDataForKServeFromAN). */
type Mode = "outcome" | "an";

const KSERVE_TZ = "Asia/Kolkata";
const CACHE_TTL_MS = 3 * 60 * 1000;

// ─── Outcome maps (lowercase; lookups are trimmed + lowercased) ───────────────

const QUALIFIED_OUTCOMES = new Set([
    "product distributor", "product stockists", "individual products buying",
    "order status enquiry", "sanitizers enquiry", "contract manufacturing",
    "pharmacy retail", "pharmacy_retail", "online sales", "export & import",
    "export_import", "assign to mr", "single therapy for individual",
    "treatment package for kairali centres", "franchise", "individual resort booking",
    "group resort booking", "treatment package for resort", "doctor consultation required",
    "travel agent", "panchakarma training", "panchkarma training",
    "prevention rejuvenation", "prevention_rejuvenation", "ayurveda training",
    "yoga training", "ayurveda and yoga training", "group resort booking_yoga retreat",
    "treatment package for resort ahv", "prevention_rejuvenation ahv",
    "group resort booking ahv yoga retreat", "ayurvedic training ahv", "yoga training ahv",
    "individual booking", "couple booking", "family booking",
    "small group / corporate retreat", "entire villa booking", "jobs enquiry",
    "other/misc enquiry", "other cases", "reverify", "expert required",
    "already spoken", "ayurvedic doctor_panchakarma center", "wants details over email",
]);

const NON_QUALIFIED_OUTCOMES = new Set([
    "did not enquire", "junk", "not interested", "cold",
    "dnc client : don't call further", "dnc client: don't call further",
    "dnc client : don't call furthur", "duplicate lead",
    "max auto dial attempts completed", "outreach stopped", "do not call back",
    "not interested ahv",
]);

const PENDING_OUTCOMES = new Set([
    "not connected", "no answer", "technical error", "call disconnected",
    "call rejected", "conversational ai error", "not reachable", "busy",
    "no response", "voice mail", "busy on another call", "unqualified",
    "call failed", "language issue",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

type LogClass = "QUALIFIED" | "NON_QUALIFIED" | "PENDING" | "UNKNOWN_OUTCOME";

const CLASS_LABEL: Record<LogClass, string> = {
    QUALIFIED: "Qualified",
    NON_QUALIFIED: "Non-Qualified",
    PENDING: "Pending",
    UNKNOWN_OUTCOME: "Unknown Outcome",
};

const REASON_NO_LOG = "No log received";
const REASON_NOT_FINAL = "Logs received, none final";

/** A sent lead that is still unresolved (Retry Pending) becomes Critical Lost
 *  once this many hours have elapsed since it was sent, using the real
 *  send timestamp rather than a calendar-day difference. */
const CRITICAL_LOST_HOURS = 72;

interface LogItem {
    rowId: number;
    lead_id: string;
    initial_id: string;
    rcvTaskId: string;
    taskIdMatch: boolean;
    tsMs: number;
    callStartMs: number;
    callEndMs: number;
    call_start_time: string;
    call_end_time: string;
    duration_sec: any;
    call_status: string;
    outcome: string;
    followup_status: string;
    followup_required: string;
    calc_status: string;
    ivr_url: string;
    transcription_view_url: string;
    received_date: string;
    cls: LogClass;
    classification: string;
}

interface Verdict {
    status: "FOUND" | "LOST";
    reason: string;
    qualification: "Qualified" | "Non-Qualified" | "";
    deciding: LogItem | null;
}

interface CacheEntry {
    timestamp: number;
    mode: Mode;
    windowLabel: string;
    startDate: string;
    endDate: string;
    lastDay: string;
    totals: any;
    dailySummary: any[];
    leads: any[];
    companies: string[];
    dataSources: string[];
    methodAgreement: { total: number; agree: number };
}

const reconciliationCache: Record<string, CacheEntry> = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const norm = (v: any): string => (v === null || v === undefined ? "" : String(v).trim());

function extractSentTaskId(response: any): string {
    const m = String(response || "").match(/T[0-9a-f]{32}/i);
    return m ? m[0] : "";
}

function safeDateStr(val: any): string {
    if (!val) return "";
    return formatIsoIST(val, "");
}

function toMs(v: any): number {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return isNaN(t) ? 0 : t;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const istDayFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KSERVE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});

/** "YYYY-MM-DD" of an instant, in IST. */
function isoDayIST(d: Date): string {
    return istDayFormatter.format(d);
}

/** "2026-09-01" -> "01-Sep-2026" (fixed month names, independent of ICU locale data). */
function dayKeyFromIso(iso: string): string {
    const [y, m, d] = iso.split("-");
    return `${d}-${MONTH_SHORT[Number(m) - 1]}-${y}`;
}

function addDaysIso(iso: string, n: number): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function listDays(fromIso: string, toIsoInclusive: string): string[] {
    const out: string[] = [];
    for (let d = fromIso; d <= toIsoInclusive; d = addDaysIso(d, 1)) out.push(d);
    return out;
}

// ─── Classification (exact rules of classifyKServeLog_ / classifyFromCalcStatus_) ─

/** Master!AN method. */
function classifyFromCalcStatus(calcStatus: any): LogClass {
    const v = norm(calcStatus).toLowerCase();
    if (v === "qualified") return "QUALIFIED";
    if (v === "non-qualified") return "NON_QUALIFIED";
    if (v === "pending" || v === "") return "PENDING";
    return "UNKNOWN_OUTCOME";
}

/** Outcome-map method: first matching rule wins. */
function classifyFromOutcome(callStatus: any, outcome: any, followupRequired: any): LogClass {
    const status = norm(callStatus).toLowerCase();
    const out = norm(outcome).toLowerCase();
    const fuOpen = followupRequired === true || norm(followupRequired).toUpperCase() === "TRUE";
    const done = COMPLETED_CALL_STATUSES.includes(status);

    if (!out) return "PENDING";
    if (PENDING_OUTCOMES.has(out)) return "PENDING";

    const isQ = QUALIFIED_OUTCOMES.has(out);
    const isNQ = NON_QUALIFIED_OUTCOMES.has(out);
    if (!isQ && !isNQ) return "UNKNOWN_OUTCOME";

    if (done && !fuOpen) return isQ ? "QUALIFIED" : "NON_QUALIFIED";
    return "PENDING";
}

function normalizePhoneNumber(mobileNum: any): string {
    const cleaned = String(mobileNum || "").replace(/[-\s()]/g, "");
    const digitsOnly = cleaned.replace(/\D/g, "");
    if (digitsOnly.indexOf("91") === 0 && digitsOnly.length > 10) return digitsOnly.slice(-10);
    if (digitsOnly.indexOf("0") === 0 && digitsOnly.length === 11) return digitsOnly.substring(1);
    return digitsOnly;
}

function classifyLog(r: any, mode: Mode): LogClass {
    const calc = classifyFromCalcStatus(r.calculated_qualification_status);
    if (calc === "QUALIFIED") return "QUALIFIED";

    const outcome = norm(r.final_lead_outcome).toLowerCase();
    if (outcome && QUALIFIED_OUTCOMES.has(outcome)) return "QUALIFIED";

    if (calc === "NON_QUALIFIED") return "NON_QUALIFIED";
    if (outcome && NON_QUALIFIED_OUTCOMES.has(outcome)) return "NON_QUALIFIED";

    return "PENDING";
}

/** classifyKServeLead_: matches Google Sheets reconciliation & backfill rule. */
function classifyLead(logs: LogItem[], isDuplicateMobile = false): Verdict {
    const q = logs.find(l => l.cls === "QUALIFIED");
    if (q) return { status: "FOUND", reason: "", qualification: "Qualified", deciding: q };

    if (logs.length === 0) {
        return { status: "LOST", reason: REASON_NO_LOG, qualification: "", deciding: null };
    }

    // Google Sheets backfill rule:
    // Duplicate mobiles in the batch stay in LOST (Pending / Not final)
    if (isDuplicateMobile) {
        return { status: "LOST", reason: "Duplicate mobile in this batch", qualification: "", deciding: logs[logs.length - 1] };
    }

    // A genuine Non-Qualified log finalizes the lead as Received.
    const nonQualified = logs.find(l => l.cls === "NON_QUALIFIED");
    if (nonQualified) {
        return { status: "FOUND", reason: "", qualification: "Non-Qualified", deciding: nonQualified };
    }

    // Every log received so far is only Pending / Unknown-outcome — the lead
    // has not received a final Qualified or Non-Qualified status. It stays
    // unresolved (Retry Pending), and becomes Critical Lost once 72 real
    // hours have elapsed since it was sent without a final status arriving.
    return { status: "LOST", reason: REASON_NOT_FINAL, qualification: "", deciding: logs[logs.length - 1] };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        let session: any = null;
        try {
            const userCookie = request.cookies.get("kairali_user")?.value;
            session = userCookie ? verifySessionCookieValue(userCookie) : null;
        } catch { }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }

        const { searchParams } = new URL(request.url);
        const view = searchParams.get("view") || "reconciliation";
        const enquiryId = searchParams.get("enquiryId");
        const force = searchParams.get("force") === "1" || searchParams.get("refresh") === "1";
        const mode: Mode = searchParams.get("mode") === "outcome" ? "outcome" : "an";

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            // ── Mode A: Specific Lead Call Logs Inspector ────────────────────
            if (view === "lead_logs" && enquiryId) {
                const [rawLogs]: any = await connection.execute(`
                    SELECT
                        r.id, r.lead_id, r.initial_id, r.client_name, r.mobile,
                        r.call_start_time, r.call_end_time, r.call_duration_sec,
                        r.call_status, r.call_type, r.call_end_reason,
                        r.final_call_status, r.final_lead_outcome,
                        r.followup_status, r.followup_required, r.followup_time,
                        r.ivr_url, r.transcription_view_url,
                        r.calculated_qualification_status, r.lead_status, r.timestamp
                    FROM ai_voice_leads_received r
                    WHERE TRIM(r.initial_id) = ?
                    ORDER BY COALESCE(r.call_start_time, r.timestamp) ASC, r.id ASC
                `, [enquiryId.trim()]);

                const logs = (rawLogs as any[]).map(r => ({
                    id: r.id,
                    lead_id: r.lead_id,
                    initial_id: r.initial_id,
                    client_name: r.client_name || "",
                    mobile: r.mobile || "",
                    call_start_time: safeDateStr(r.call_start_time),
                    call_end_time: safeDateStr(r.call_end_time),
                    duration_sec: r.call_duration_sec || 0,
                    call_status: r.call_status || "",
                    call_type: r.call_type || "",
                    call_end_reason: r.call_end_reason || "",
                    final_call_status: r.final_call_status || "",
                    outcome: r.final_lead_outcome || "",
                    followup_status: r.followup_status || "",
                    followup_required: r.followup_required || "",
                    followup_time: safeDateStr(r.followup_time),
                    ivr_url: r.ivr_url || "",
                    transcription_view_url: r.transcription_view_url || "",
                    calculated_qualification_status: r.calculated_qualification_status || "",
                    classification: CLASS_LABEL[classifyLog(r, mode)],
                    timestamp: safeDateStr(r.timestamp),
                }));

                return NextResponse.json({ logs, mode }, { headers: noStoreHeaders });
            }

            // ── Mode B: Full Reconciliation ───────────────────────────────────
            // 1. Resolve the window (all in IST calendar days)
            const monthParam = searchParams.get("month");       // "2026-09"
            const dateFromParam = searchParams.get("dateFrom"); // "YYYY-MM-DD"
            const dateToParam = searchParams.get("dateTo");     // "YYYY-MM-DD"
            const isoRe = /^\d{4}-\d{2}-\d{2}$/;

            let startIso: string;
            let endExclusiveIso: string;
            let lastDayIso: string;
            let windowLabel: string;

            if (dateFromParam && dateToParam) {
                if (!isoRe.test(dateFromParam) || !isoRe.test(dateToParam)) {
                    return NextResponse.json({ error: "dateFrom/dateTo must be YYYY-MM-DD" }, { status: 400, headers: noStoreHeaders });
                }
                if (dateToParam < dateFromParam) {
                    return NextResponse.json({ error: "dateTo is before dateFrom" }, { status: 400, headers: noStoreHeaders });
                }
                startIso = dateFromParam;
                lastDayIso = dateToParam;
                endExclusiveIso = addDaysIso(dateToParam, 1);
                windowLabel = `${dateFromParam} to ${dateToParam}`;
            } else {
                const todayIso = isoDayIST(new Date());
                const ym = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : todayIso.slice(0, 7);
                const [y, m] = ym.split("-").map(Number);
                startIso = `${ym}-01`;
                endExclusiveIso = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
                const lastOfMonth = addDaysIso(endExclusiveIso, -1);
                // Current month runs through today; any other month runs in full.
                lastDayIso = todayIso.slice(0, 7) === ym ? todayIso : lastOfMonth;
                windowLabel = `${MONTH_LONG[m - 1]} ${y}`;
            }

            const startDate = `${startIso} 00:00:00`;
            const endDate = `${endExclusiveIso} 00:00:00`; // exclusive

            const cacheKey = `${mode}_${startDate}_${endDate}_${lastDayIso}`;
            const cached = reconciliationCache[cacheKey];

            let reconciled: CacheEntry;

            if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
                reconciled = cached;
            } else {
                // a. Sent rows: in window, code_status = success, oldest first
                const [sentRows]: any = await connection.execute(`
                    SELECT
                        s.id AS sent_row_id,
                        s.enquiry_id,
                        s.name_of_client,
                        s.mobile,
                        s.email_id,
                        s.subjects,
                        s.website_name AS company,
                        s.data_source,
                        s.campaign_name,
                        s.generate_timestamp,
                        s.code_status,
                        s.response_from_kserve
                    FROM ai_voice_leads_sent s
                    WHERE s.generate_timestamp >= ? AND s.generate_timestamp < ?
                      AND LOWER(TRIM(COALESCE(s.code_status, ''))) = 'success'
                    ORDER BY s.generate_timestamp ASC, s.id ASC
                `, [startDate, endDate]);

                // b. Index by enquiry id (MATCH_MODE = ENQUIRY_ID). Lists stay in ascending send order.
                const byEnquiryId = new Map<string, any[]>();
                const allLeads: any[] = [];
                const companiesSet = new Set<string>();
                const dataSourcesSet = new Set<string>();

                (sentRows as any[]).forEach(r => {
                    const enq = norm(r.enquiry_id);
                    const sentDate = new Date(r.generate_timestamp);
                    const sentMs = sentDate.getTime();
                    const dayIso = isoDayIST(sentDate);

                    const comp = norm(r.company);
                    const ds = norm(r.data_source);
                    if (comp) companiesSet.add(comp);
                    if (ds) dataSourcesSet.add(ds);

                    const item = {
                        sent_row_id: Number(r.sent_row_id) || 0,
                        id: enq,
                        sentTaskId: extractSentTaskId(r.response_from_kserve),
                        name_of_client: r.name_of_client || "",
                        mobile: r.mobile || "",
                        email_id: r.email_id || "",
                        subjects: r.subjects || "",
                        company: comp,
                        data_source: ds,
                        campaign_name: r.campaign_name || "",
                        sent_date: safeDateStr(r.generate_timestamp),
                        sentMs,
                        dayIso,
                        dayKey: dayKeyFromIso(dayIso),
                        logs: [] as LogItem[],
                        verdict: null as Verdict | null,
                        daysPending: 0,
                        minutesToReceive: null as number | null,
                        isCriticalLost: false,
                    };

                    allLeads.push(item);
                    if (enq) {
                        if (!byEnquiryId.has(enq)) byEnquiryId.set(enq, []);
                        byEnquiryId.get(enq)!.push(item);
                    }
                });

                // c. Received logs. A log can never predate the send it belongs to,
                //    so anything older than the window start cannot match.
                const [rcvRows]: any = await connection.execute(`
                    SELECT
                        r.id, r.lead_id, r.initial_id, r.client_name, r.mobile,
                        r.call_start_time, r.call_end_time, r.call_duration_sec,
                        r.call_status, r.call_type, r.call_end_reason,
                        r.final_call_status, r.final_lead_outcome,
                        r.followup_status, r.followup_required, r.followup_time,
                        r.ivr_url, r.transcription_view_url,
                        r.calculated_qualification_status, r.lead_status, r.timestamp
                    FROM ai_voice_leads_received r
                    WHERE r.timestamp >= ?
                `, [startDate]);

                // d. Attribute every log to the latest send whose time is <= the log time
                const agreement = { total: 0, agree: 0 };

                (rcvRows as any[]).forEach(r => {
                    const initialId = norm(r.initial_id);
                    if (!initialId) return;
                    const candidates = byEnquiryId.get(initialId);
                    if (!candidates || candidates.length === 0) return;

                    const tsMs = toMs(r.timestamp);
                    let best: any = null;
                    for (let i = candidates.length - 1; i >= 0; i--) {
                        if (candidates[i].sentMs <= tsMs) {
                            best = candidates[i];
                            break;
                        }
                    }
                    if (!best) return;

                    const fullId = norm(r.lead_id);
                    const rcvTaskId = fullId ? fullId.split("-").pop() || "" : "";
                    const cls = classifyLog(r, mode);

                    agreement.total++;
                    if (cls === classifyFromCalcStatus(r.calculated_qualification_status)) agreement.agree++;

                    best.logs.push({
                        rowId: Number(r.id) || 0,
                        lead_id: r.lead_id || "",
                        initial_id: r.initial_id || "",
                        rcvTaskId,
                        taskIdMatch: !!rcvTaskId && !!best.sentTaskId && rcvTaskId === best.sentTaskId,
                        tsMs,
                        callStartMs: toMs(r.call_start_time),
                        callEndMs: toMs(r.call_end_time),
                        call_start_time: safeDateStr(r.call_start_time),
                        call_end_time: safeDateStr(r.call_end_time),
                        duration_sec: r.call_duration_sec || 0,
                        call_status: r.call_status || "",
                        outcome: r.final_lead_outcome || "",
                        followup_status: r.followup_status || "",
                        followup_required: r.followup_required || "",
                        calc_status: r.calculated_qualification_status || "",
                        ivr_url: r.ivr_url || "",
                        transcription_view_url: r.transcription_view_url || "",
                        received_date: safeDateStr(r.timestamp),
                        cls,
                        classification: CLASS_LABEL[cls],
                    } as LogItem);
                });

                // e. Daily summary skeleton: every day in the window, even with zero sends
                const dailyMap: Record<string, any> = {};
                listDays(startIso, lastDayIso).forEach(iso => {
                    dailyMap[iso] = {
                        iso, dayKey: dayKeyFromIso(iso),
                        sent: 0, found: 0, lost: 0, q: 0, nq: 0, noLog: 0, notFinal: 0,
                        retryPending: 0, criticalLost: 0,
                    };
                });
                const totals = { sent: 0, found: 0, lost: 0, q: 0, nq: 0, noLog: 0, notFinal: 0, retryPending: 0, criticalLost: 0 };
                const nowMs = Date.now();

                // Google Sheets batch transfer rule: newest mobile first, older duplicates are skipped and stay in Pending
                const seenMobiles = new Set<string>();
                const sortedByDateDesc = [...allLeads].sort((a, b) => b.sentMs - a.sentMs);
                const duplicateRowIds = new Set<number>();

                sortedByDateDesc.forEach(lead => {
                    const normPhone = normalizePhoneNumber(lead.mobile);
                    if (normPhone && normPhone.length >= 10) {
                        if (seenMobiles.has(normPhone)) {
                            duplicateRowIds.add(lead.sent_row_id);
                        } else {
                            seenMobiles.add(normPhone);
                        }
                    }
                });

                // f. Per-lead verdict
                allLeads.forEach(r => {
                    // Ascending by Call Start; logs with no start fall back to the log timestamp.
                    r.logs.sort((a: LogItem, b: LogItem) =>
                        ((a.callStartMs || a.tsMs) - (b.callStartMs || b.tsMs)) || (a.rowId - b.rowId));

                    const isDup = duplicateRowIds.has(r.sent_row_id);
                    const verdict = classifyLead(r.logs, isDup);
                    r.verdict = verdict;

                    if (!dailyMap[r.dayIso]) {
                        dailyMap[r.dayIso] = {
                            iso: r.dayIso, dayKey: r.dayKey,
                            sent: 0, found: 0, lost: 0, q: 0, nq: 0, noLog: 0, notFinal: 0,
                            retryPending: 0, criticalLost: 0,
                        };
                    }
                    const day = dailyMap[r.dayIso];
                    day.sent++; totals.sent++;

                    if (verdict.qualification === "Qualified") {
                        day.q++; day.found++; totals.q++; totals.found++;
                    } else if (verdict.qualification === "Non-Qualified") {
                        day.nq++; day.found++; totals.nq++; totals.found++;
                    } else {
                        // Unresolved (Retry Pending). Critical Lost is a subset of this same
                        // bucket once 72 real hours have elapsed since the send timestamp —
                        // it is never added on top of Total Sent again.
                        if (verdict.reason === REASON_NO_LOG) { day.noLog++; totals.noLog++; }
                        else { day.notFinal++; totals.notFinal++; }
                        day.lost++; totals.lost++;
                        day.retryPending++; totals.retryPending++;

                        const hoursSinceSent = (nowMs - r.sentMs) / 3600000;
                        r.isCriticalLost = hoursSinceSent >= CRITICAL_LOST_HOURS;
                        if (r.isCriticalLost) { day.criticalLost++; totals.criticalLost++; }
                    }

                    // Time to receive: FOUND leads only, send -> deciding log's Call End (else log timestamp)
                    if (verdict.status === "FOUND" && verdict.deciding) {
                        const endMs = verdict.deciding.callEndMs || verdict.deciding.tsMs;
                        if (endMs && endMs >= r.sentMs) {
                            r.minutesToReceive = Math.round((endMs - r.sentMs) / 60000);
                            r.daysPending = Math.floor((endMs - r.sentMs) / 86400000);
                        }
                    } else {
                        r.daysPending = Math.max(0, Math.floor((nowMs - r.sentMs) / 86400000));
                    }
                });

                const dailySummary = Object.values(dailyMap).sort((a: any, b: any) =>
                    a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);

                reconciled = {
                    timestamp: Date.now(),
                    mode,
                    windowLabel,
                    startDate,
                    endDate,
                    lastDay: lastDayIso,
                    totals,
                    dailySummary,
                    leads: allLeads,
                    companies: Array.from(companiesSet).sort(),
                    dataSources: Array.from(dataSourcesSet).sort(),
                    methodAgreement: agreement,
                };

                reconciliationCache[cacheKey] = reconciled;
            }

            // ── Client Filter & Pagination ───────────────────────────────────
            const filterDay = searchParams.get("day"); // "01-Sep-2026"
            const filterStatus = searchParams.get("status") || "all";
            const filterCompany = searchParams.get("company") || "all";
            const filterDataSource = searchParams.get("dataSource") || "all";
            const search = (searchParams.get("search") || "").toLowerCase().trim();
            const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
            const perPage = Math.min(200, Math.max(10, parseInt(searchParams.get("perPage") || "25")));

            let filteredLeads = reconciled.leads;

            if (filterDay && filterDay !== "all") {
                filteredLeads = filteredLeads.filter(r => r.dayKey === filterDay);
            }
            if (filterCompany !== "all") {
                filteredLeads = filteredLeads.filter(r => r.company === filterCompany);
            }
            if (filterDataSource !== "all") {
                filteredLeads = filteredLeads.filter(r => r.data_source === filterDataSource);
            }

            if (filterStatus === "FOUND") {
                filteredLeads = filteredLeads.filter(r => r.verdict.status === "FOUND");
            } else if (filterStatus === "LOST" || filterStatus === "RETRY_PENDING") {
                filteredLeads = filteredLeads.filter(r => r.verdict.status === "LOST");
            } else if (filterStatus === "CRITICAL_LOST") {
                filteredLeads = filteredLeads.filter(r => r.verdict.status === "LOST" && r.isCriticalLost);
            } else if (filterStatus === "LOST_NO_LOG") {
                filteredLeads = filteredLeads.filter(r => r.verdict.reason === REASON_NO_LOG);
            } else if (filterStatus === "LOST_NOT_FINAL") {
                filteredLeads = filteredLeads.filter(r => r.verdict.reason === REASON_NOT_FINAL);
            } else if (filterStatus === "QUALIFIED") {
                filteredLeads = filteredLeads.filter(r => r.verdict.qualification === "Qualified");
            } else if (filterStatus === "NON_QUALIFIED") {
                filteredLeads = filteredLeads.filter(r => r.verdict.qualification === "Non-Qualified");
            }

            if (search) {
                filteredLeads = filteredLeads.filter(r => {
                    const text = `${r.name_of_client} ${r.mobile} ${r.email_id} ${r.id} ${r.sentTaskId} ${r.subjects} ${r.company} ${r.data_source} ${r.campaign_name}`.toLowerCase();
                    return text.includes(search);
                });
            }

            const total = filteredLeads.length;
            const totalPages = Math.max(1, Math.ceil(total / perPage));
            const paginated = filteredLeads.slice((page - 1) * perPage, page * perPage).map(r => {
                const v: Verdict = r.verdict;
                const d = v.deciding;
                return {
                    id: r.id,
                    sentTaskId: r.sentTaskId,
                    name_of_client: r.name_of_client,
                    mobile: r.mobile,
                    email_id: r.email_id,
                    subjects: r.subjects,
                    company: r.company,
                    data_source: r.data_source,
                    campaign_name: r.campaign_name,
                    sent_date: r.sent_date,
                    dayKey: r.dayKey,
                    status: v.status,
                    qualification: v.qualification,                 // "" when not Qualified / Non-Qualified
                    finalStatus: v.qualification || "Pending",      // Lead Final Status as in KServeCallLogs
                    reason: v.reason,
                    // Subset classification within the unresolved (LOST) bucket — never
                    // counted separately from Retry Pending, just a >=72h flag on it.
                    retryStage: v.status === "LOST" ? (r.isCriticalLost ? "CRITICAL_LOST" : "RETRY_PENDING") : null,
                    callCount: r.logs.length,
                    receivedCount: r.logs.length,
                    receivedStatuses: r.logs.length === 0
                        ? "No Log"
                        : Array.from(new Set(r.logs.map((l: LogItem) => l.classification))).join(", "),
                    receivedDate: d ? d.received_date : "",
                    minutesToReceive: r.minutesToReceive,
                    daysPending: r.daysPending,
                    deciding: d ? {
                        call_start_time: d.call_start_time,
                        call_end_time: d.call_end_time,
                        duration_sec: d.duration_sec,
                        call_status: d.call_status,
                        outcome: d.outcome,
                        followup_status: d.followup_status,
                        classification: d.classification,
                        calculated_qualification_status: d.calc_status,
                        ivr_url: d.ivr_url,
                        transcription_view_url: d.transcription_view_url,
                    } : null,
                };
            });

            return NextResponse.json({
                mode: reconciled.mode,
                window: {
                    label: reconciled.windowLabel,
                    startDate: reconciled.startDate,
                    endDate: reconciled.endDate, // exclusive
                    lastDay: reconciled.lastDay, // inclusive, YYYY-MM-DD
                },
                totals: reconciled.totals,
                dailySummary: reconciled.dailySummary,
                leads: paginated,
                pagination: { total, page, perPage, totalPages },
                companies: reconciled.companies,
                dataSources: reconciled.dataSources,
                methodAgreement: reconciled.methodAgreement,
            }, { headers: noStoreHeaders });

        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error("[kserve-reconciliation] Error:", error);
        return NextResponse.json(
            { error: "Failed to reconcile KServe leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}