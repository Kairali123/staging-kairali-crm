import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getSessionUserResult, hasAdminRole, hasAnyPermission } from "@/lib/authz";
import { formatIsoIST } from "@/lib/lead-date";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// ─── Config ───────────────────────────────────────────────────────────────────
// DialShree reconciliation: Sent = dialshree_kairali_sent, Received = lead_fms
// (sheet_name = 'DailShree Received Sheet'), matched on lead_id.

const RECEIVED_SHEET = "DailShree Received Sheet";

/** Kept for API-shape parity with the KServe tracker; DialShree has one method. */
type Mode = "outcome" | "an";

const KSERVE_TZ = "Asia/Kolkata";

function hasDialShreeAccess(user: any): boolean {
    if (!user) return false;
    // Super admin always; everyone else (admin and "all" included) needs the explicit view permission.
    const roleStr = String(user?.role || "").trim().toLowerCase();
    if (roleStr === "super_admin" || roleStr === "super admin") return true;
    return Array.isArray(user?.permissions) && user.permissions.includes("dialshree_lead_lost.view");
}

/** Sent = response_result is the dialer's JSON reply with "status": true. */
function isDelivered(responseResult: any): boolean {
    const raw = norm(responseResult);
    if (!raw.startsWith("{")) return false;
    try {
        return JSON.parse(raw).status === true;
    } catch {
        return false;
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

// ─── Types ────────────────────────────────────────────────────────────────────

type LogClass = "COMPLETED" | "PENDING";

const CLASS_LABEL: Record<LogClass, "Completed" | "Pending"> = {
    COMPLETED: "Completed",
    PENDING: "Pending",
};

/** Final outcomes (Full_Disposition) that mean the call is Completed, in lower case.
 *  Every other outcome, including a blank one, is Pending. */
const COMPLETED_OUTCOMES = new Set([
    "cold", "converted", "converted in magento", "conveted in magento", "doctor consultation required",
    "langauge barrier", "language barrier", "not interested", "sample", "test",
    "transfer to bhuvaneshwari", "transfer to dr. taniya singh", "transfer to harpal singh", "transfer to hr",
    "transfer to kac", "transfer to kacd", "transfer to manoj nair fom", "transfer to mohit mehra",
    "transfer to mr", "transfer to non user", "transfer to other user", "transfer to pawan kamra",
    "transfer to payal", "transfer to puneet endlay", "transfer to pushpanshu kumar", "transfer to rishabh gupta",
    "transfer to sadik rehman", "transfer to sana albi", "transfer to vidisha bahukhandi", "transfer to zaki ahmed",
]);

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
    dispositions: string[];
    methodAgreement: { total: number; agree: number };
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const norm = (v: any): string => (v === null || v === undefined ? "" : String(v).trim());

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

/** Completed / Pending from Full_Disposition only. */
function classifyLog(r: any, _mode?: Mode): LogClass {
    return COMPLETED_OUTCOMES.has(norm(r.Full_Disposition).replace(/\s+/g, " ").toLowerCase()) ? "COMPLETED" : "PENDING";
}

/** classifyKServeLead_: matches Google Sheets reconciliation & backfill rule. */
function classifyLead(logs: LogItem[]): Verdict {
    if (logs.length === 0) {
        return { status: "LOST", reason: REASON_NO_LOG, deciding: null };
    }

    // The latest call (logs are sorted by call start) decides: Completed = Received.
    // A Pending latest call leaves the lead unresolved (Retry Pending), and it becomes
    // Critical Lost once 72 real hours have elapsed since it was sent.
    const last = logs[logs.length - 1];
    return last.cls === "COMPLETED"
        ? { status: "FOUND", reason: "", deciding: last }
        : { status: "LOST", reason: REASON_NOT_FINAL, deciding: last };
}

/** Aggregates totals + a per-day summary from a given lead subset. Used both for
 *  the whole-window cache-level totals and, when Company/Data Source/Day/Search
 *  filters are active, recomputed on just the filtered scope — so the KPI cards,
 *  tab labels and Daily Summary table always agree with the leads actually listed
 *  instead of always reporting the unfiltered whole-window numbers. */
function aggregateTotals(leadsSubset: any[], startIso: string, lastDayIso: string) {
    const dailyMap: Record<string, any> = {};
    listDays(startIso, lastDayIso).forEach(iso => {
        dailyMap[iso] = {
            iso, dayKey: dayKeyFromIso(iso),
            sent: 0, found: 0, lost: 0, noLog: 0, notFinal: 0,
            retryPending: 0, criticalLost: 0,
        };
    });
    const totals = { sent: 0, found: 0, lost: 0, noLog: 0, notFinal: 0, retryPending: 0, criticalLost: 0 };

    leadsSubset.forEach(r => {
        if (!dailyMap[r.dayIso]) {
            dailyMap[r.dayIso] = {
                iso: r.dayIso, dayKey: r.dayKey,
                sent: 0, found: 0, lost: 0, noLog: 0, notFinal: 0,
                retryPending: 0, criticalLost: 0,
            };
        }
        const day = dailyMap[r.dayIso];
        const v: Verdict = r.verdict;
        day.sent++; totals.sent++;

        if (v.status === "FOUND") {
            day.found++; totals.found++;
        } else {
            // Unresolved (Retry Pending). Critical Lost is a subset of this same
            // bucket once 72 real hours have elapsed since the send timestamp —
            // it is never added on top of Total Sent again.
            if (v.reason === REASON_NO_LOG) { day.noLog++; totals.noLog++; }
            else { day.notFinal++; totals.notFinal++; }
            day.lost++; totals.lost++;
            day.retryPending++; totals.retryPending++;
            if (r.isCriticalLost) { day.criticalLost++; totals.criticalLost++; }
        }
    });

    const dailySummary = Object.values(dailyMap).sort((a: any, b: any) =>
        a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0);

    return { totals, dailySummary };
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = getSessionUserResult(request);
        if (session.state === "missing" || session.state === "invalid") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: noStoreHeaders });
        }
        if (!hasDialShreeAccess(session.user)) {
            return NextResponse.json({ error: "Access denied: Insufficient permissions" }, { status: 403, headers: noStoreHeaders });
        }

        const { searchParams } = new URL(request.url);
        const view = searchParams.get("view") || "reconciliation";
        const enquiryId = searchParams.get("enquiryId");
        const mode: Mode = searchParams.get("mode") === "outcome" ? "outcome" : "an";

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            // ── Mode A: Specific Lead Call Logs Inspector ────────────────────
            if (view === "lead_logs" && enquiryId) {
                const [rawLogs]: any = await connection.execute(`
                    SELECT
                        sl_no, lead_id, Name_of_Client, Mobile,
                        actual_time, send_lead_Date_Time, call_recording_duration,
                        Full_Disposition, HangUp_Reason, Call_Type, Followup,
                        Followup_Date, IVR_URL, latest_recording_url,
                        lead_category, Timestamp,
                        Remarks_History, Comment, Call_Notes, doer, agent_Id
                    FROM lead_fms
                    WHERE sheet_name = ? AND lead_id = ?
                    ORDER BY COALESCE(actual_time, Timestamp) ASC, sl_no ASC
                `, [RECEIVED_SHEET, enquiryId.trim()]);

                const logs = (rawLogs as any[]).map(r => ({
                    id: r.sl_no,
                    lead_id: r.lead_id,
                    initial_id: r.lead_id,
                    client_name: r.Name_of_Client || "",
                    mobile: r.Mobile || "",
                    call_start_time: safeDateStr(r.actual_time),
                    call_end_time: safeDateStr(r.send_lead_Date_Time || r.actual_time),
                    duration_sec: Number(r.call_recording_duration) || 0,
                    call_status: CLASS_LABEL[classifyLog(r)],
                    call_type: r.Call_Type || "",
                    call_end_reason: r.HangUp_Reason || "",
                    final_call_status: r.Full_Disposition || "",
                    outcome: r.Full_Disposition || "",
                    followup_status: r.Followup || "",
                    followup_required: r.Followup || "",
                    followup_time: safeDateStr(r.Followup_Date),
                    ivr_url: r.latest_recording_url || r.IVR_URL || "",
                    transcription_view_url: "",
                    doer: norm(r.doer) || norm(r.agent_Id),
                    remarks: norm(r.Remarks_History) || norm(r.Comment) || norm(r.Call_Notes),
                    calculated_qualification_status: r.lead_category || "",
                    classification: CLASS_LABEL[classifyLog(r, mode)],
                    timestamp: safeDateStr(r.Timestamp),
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

            let reconciled: CacheEntry;

            // Computed fresh on every request (no cache): always current data.
            {
                // a. Sent rows: in window, code_status = success, oldest first
                // Sent and received are independent: fetch them in parallel on the pool.
                // Received uses the indexed Timestamp column (a 2-day buffer covers calls whose
                // actual_time is a little earlier than their Timestamp); the exact per-send
                // time check still happens below. Rows with a NULL Timestamp are picked up
                // by the second branch.
                const [[sentRowsAll], [rcvRows]]: any = await Promise.all([pool.execute(`
                    SELECT
                        s.id AS sent_row_id,
                        s.lead_id AS enquiry_id,
                        s.name_of_client,
                        s.mobile,
                        s.email_id,
                        s.subjects,
                        s.website_name AS company,
                        s.data_source,
                        s.campaign_name,
                        s.timestamp_sent_not_sent AS generate_timestamp,
                        s.response_result
                    FROM dialshree_kairali_sent s
                    WHERE s.timestamp_sent_not_sent >= ?
                      AND s.timestamp_sent_not_sent < ?
                      AND s.lead_id IS NOT NULL AND s.lead_id <> ''
                      AND s.response_result REGEXP '"status"[[:space:]]*:[[:space:]]*true'
                    ORDER BY generate_timestamp ASC, s.id ASC
                `, [startDate, endDate]),
                pool.execute(`
                    SELECT
                        sl_no, lead_id, Name_of_Client, Mobile,
                        actual_time, send_lead_Date_Time, call_recording_duration,
                        Full_Disposition, Followup, IVR_URL, latest_recording_url,
                        lead_category, Timestamp
                    FROM lead_fms
                    WHERE sheet_name = ? AND Timestamp >= DATE_SUB(?, INTERVAL 2 DAY)
                    UNION ALL
                    SELECT
                        sl_no, lead_id, Name_of_Client, Mobile,
                        actual_time, send_lead_Date_Time, call_recording_duration,
                        Full_Disposition, Followup, IVR_URL, latest_recording_url,
                        lead_category, Timestamp
                    FROM lead_fms
                    WHERE sheet_name = ? AND Timestamp IS NULL AND actual_time >= ?
                `, [RECEIVED_SHEET, startDate, RECEIVED_SHEET, startDate])]);

                // Only rows whose response_result JSON has status:true count as Sent.
                const sentRows = (sentRowsAll as any[]).filter(r =>
                    isDelivered(r.response_result));

                // b. Index by enquiry id (MATCH_MODE = ENQUIRY_ID). Lists stay in ascending send order.
                const byEnquiryId = new Map<string, any[]>();
                const allLeads: any[] = [];
                const companiesSet = new Set<string>();

                (sentRows as any[]).forEach(r => {
                    const enq = norm(r.enquiry_id);
                    const sentDate = new Date(r.generate_timestamp);
                    const sentMs = sentDate.getTime();
                    const dayIso = isoDayIST(sentDate);

                    const comp = mapCompany(norm(r.company), norm(r.data_source), norm(r.campaign_name));
                    const ds = norm(r.data_source);
                    if (comp) companiesSet.add(comp);

                    const item = {
                        sent_row_id: Number(r.sent_row_id) || 0,
                        id: enq,
                        sentTaskId: "",
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

                // d. Attribute every log to the latest send whose time is <= the log time
                const agreement = { total: 0, agree: 0 };

                (rcvRows as any[]).forEach(r => {
                    const initialId = norm(r.lead_id);
                    if (!initialId) return;
                    const candidates = byEnquiryId.get(initialId);
                    if (!candidates || candidates.length === 0) return;

                    const tsMs = toMs(r.actual_time || r.Timestamp);
                    let best: any = null;
                    for (let i = candidates.length - 1; i >= 0; i--) {
                        if (candidates[i].sentMs <= tsMs) {
                            best = candidates[i];
                            break;
                        }
                    }
                    if (!best) return;

                    const cls = classifyLog(r, mode);

                    agreement.total++;
                    agreement.agree++;

                    best.logs.push({
                        rowId: Number(r.sl_no) || 0,
                        lead_id: r.lead_id || "",
                        initial_id: r.lead_id || "",
                        rcvTaskId: "",
                        taskIdMatch: false,
                        tsMs,
                        callStartMs: toMs(r.actual_time),
                        callEndMs: toMs(r.send_lead_Date_Time || r.actual_time),
                        call_start_time: safeDateStr(r.actual_time),
                        call_end_time: safeDateStr(r.send_lead_Date_Time || r.actual_time),
                        duration_sec: Number(r.call_recording_duration) || 0,
                        call_status: CLASS_LABEL[cls],
                        outcome: r.Full_Disposition || "",
                        followup_status: r.Followup || "",
                        followup_required: r.Followup || "",
                        calc_status: r.lead_category || "",
                        ivr_url: r.latest_recording_url || r.IVR_URL || "",
                        transcription_view_url: "",
                        received_date: safeDateStr(r.actual_time || r.Timestamp),
                        cls,
                        classification: CLASS_LABEL[cls],
                    } as LogItem);
                });

                const nowMs = Date.now();

                // f. Per-lead verdict
                allLeads.forEach(r => {
                    // Ascending by Call Start; logs with no start fall back to the log timestamp.
                    r.logs.sort((a: LogItem, b: LogItem) =>
                        ((a.callStartMs || a.tsMs) - (b.callStartMs || b.tsMs)) || (a.rowId - b.rowId));

                    const verdict = classifyLead(r.logs);
                    r.verdict = verdict;

                    if (verdict.status === "LOST") {
                        const hoursSinceSent = (nowMs - r.sentMs) / 3600000;
                        r.isCriticalLost = hoursSinceSent >= CRITICAL_LOST_HOURS;
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

                const { totals, dailySummary } = aggregateTotals(allLeads, startIso, lastDayIso);

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
                    dispositions: Array.from(new Set(allLeads.map(r => r.verdict?.deciding?.outcome).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
                    methodAgreement: agreement,
                };

            }

            // ── Client Filter & Pagination ───────────────────────────────────
            const filterDay = searchParams.get("day"); // "01-Sep-2026"
            const filterStatus = searchParams.get("status") || "all";
            const filterCompany = searchParams.get("company") || "all";
            const filterDisposition = searchParams.get("disposition") || "all";
            const search = (searchParams.get("search") || "").toLowerCase().trim();
            const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
            const perPage = Math.min(200, Math.max(10, parseInt(searchParams.get("perPage") || "25")));

            // Scope filters (Day / Company / Data Source / Search) narrow both the
            // leads table AND the KPI totals / Daily Summary below, so the "Retry
            // Pending" count shown always matches what the Retry Pending tab lists.
            // Only the tab's own status filter (applied after) is excluded from the
            // scope — the KPI cards must keep showing every status's count even
            // while a single status tab is active.
            let scopedLeads = reconciled.leads;

            if (filterDay && filterDay !== "all") {
                scopedLeads = scopedLeads.filter(r => r.dayKey === filterDay);
            }
            if (filterCompany !== "all") {
                scopedLeads = scopedLeads.filter(r => r.company === filterCompany);
            }
            if (filterDisposition !== "all") {
                // Matches the lead's deciding call (the "Deciding Outcome" column); NO_CALL = no call logged yet.
                scopedLeads = scopedLeads.filter(r => filterDisposition === "NO_CALL"
                    ? !r.verdict.deciding
                    : norm(r.verdict.deciding?.outcome) === filterDisposition);
            }
            if (search) {
                scopedLeads = scopedLeads.filter(r => {
                    const text = `${r.name_of_client} ${r.mobile} ${r.email_id} ${r.id} ${r.sentTaskId} ${r.subjects} ${r.company} ${r.data_source} ${r.campaign_name}`.toLowerCase();
                    return text.includes(search);
                });
            }

            const scopeIsFiltered = scopedLeads !== reconciled.leads;
            const { totals: responseTotals, dailySummary: responseDailySummary } = scopeIsFiltered
                ? aggregateTotals(scopedLeads, startIso, lastDayIso)
                : { totals: reconciled.totals, dailySummary: reconciled.dailySummary };

            let filteredLeads = scopedLeads;

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
                totals: responseTotals,
                dailySummary: responseDailySummary,
                leads: paginated,
                pagination: { total, page, perPage, totalPages },
                companies: reconciled.companies,
                dispositions: reconciled.dispositions,
                methodAgreement: reconciled.methodAgreement,
            }, { headers: noStoreHeaders });

        } finally {
            connection.release();
        }

    } catch (error: any) {
        console.error("[dialshree-lead-lost] Error:", error);
        return NextResponse.json(
            { error: "Failed to reconcile DialShree leads", detail: error?.message },
            { status: 500, headers: noStoreHeaders }
        );
    }
}