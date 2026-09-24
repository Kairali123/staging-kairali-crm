import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifySessionCookieValue } from "@/lib/session";
import { formatIsoIST } from "@/lib/lead-date";

const noStoreHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

// ─── In-memory Cache ──────────────────────────────────────────────────────────
// Cache reconciled dataset per window for 3 minutes to make UI filtering instant (<10ms).
interface CacheEntry {
    timestamp: number;
    windowLabel: string;
    startDate: string;
    endDate: string;
    totals: any;
    dailySummary: any[];
    leads: any[];
    companies: string[];
    dataSources: string[];
}

const reconciliationCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 3 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSentTaskId(response: any): string {
    const m = String(response || "").match(/T[0-9a-f]{32}/i);
    return m ? m[0] : "";
}

function safeDateStr(val: any): string {
    if (!val) return "";
    return formatIsoIST(val, "");
}

function formatDayKey(d: Date): string {
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    }).replace(/ /g, "-");
}

function classifyLog(log: any): "Qualified" | "Non-Qualified" | "Pending" {
    // Only calculated_qualification_status is used to define Qualified or Non-Qualified
    const status = String(log.calculated_qualification_status || "").trim().toLowerCase();
    if (status === "qualified") return "Qualified";
    if (status === "non-qualified" || status === "non qualified" || status === "unqualified") return "Non-Qualified";
    return "Pending";
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

        const pool = await getPool();
        const connection = await pool.getConnection();

        try {
            // ── Mode A: Specific Lead Call Logs Inspector ────────────────────
            if (view === "lead_logs" && enquiryId) {
                const taskId = searchParams.get("taskId") || "";
                let logQuery = `
                    SELECT
                        r.id,
                        r.lead_id,
                        r.initial_id,
                        r.client_name,
                        r.mobile,
                        r.call_start_time,
                        r.call_end_time,
                        r.call_duration_sec,
                        r.call_status,
                        r.call_type,
                        r.call_end_reason,
                        r.final_call_status,
                        r.final_lead_outcome,
                        r.followup_status,
                        r.followup_required,
                        r.followup_time,
                        r.ivr_url,
                        r.transcription_view_url,
                        r.calculated_qualification_status,
                        r.lead_status,
                        r.timestamp
                    FROM ai_voice_leads_received r
                    WHERE r.initial_id = ?
                `;
                const params: any[] = [enquiryId];

                if (taskId) {
                    logQuery += ` OR r.lead_id LIKE ?`;
                    params.push(`%${taskId}%`);
                }
                logQuery += ` ORDER BY COALESCE(r.call_start_time, r.timestamp) ASC`;

                const [rawLogs]: any = await connection.execute(logQuery, params);
                const logs = (rawLogs as any[]).map(r => {
                    const classification = classifyLog(r);
                    return {
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
                        classification,
                        timestamp: safeDateStr(r.timestamp),
                    };
                });

                return NextResponse.json({ logs }, { headers: noStoreHeaders });
            }

            // ── Mode B: Full Reconciliation ───────────────────────────────────
            // 1. Resolve window (month or custom dates)
            const monthParam = searchParams.get("month"); // e.g. "2026-09"
            const dateFromParam = searchParams.get("dateFrom"); // "YYYY-MM-DD"
            const dateToParam = searchParams.get("dateTo"); // "YYYY-MM-DD"

            let startDate: string;
            let endDate: string;
            let windowLabel: string;

            const now = new Date();
            if (dateFromParam && dateToParam) {
                startDate = `${dateFromParam} 00:00:00`;
                endDate = `${dateToParam} 23:59:59`;
                windowLabel = `${dateFromParam} to ${dateToParam}`;
            } else if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
                const [y, m] = monthParam.split("-").map(Number);
                const startD = new Date(y, m - 1, 1);
                const nextMonth = new Date(y, m, 1);
                const p = (n: number) => String(n).padStart(2, "0");
                startDate = `${startD.getFullYear()}-${p(startD.getMonth() + 1)}-01 00:00:00`;
                endDate = `${nextMonth.getFullYear()}-${p(nextMonth.getMonth() + 1)}-01 00:00:00`;
                windowLabel = startD.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            } else {
                // Default to current month
                const y = now.getFullYear();
                const m = now.getMonth();
                const startD = new Date(y, m, 1);
                const nextMonth = new Date(y, m + 1, 1);
                const p = (n: number) => String(n).padStart(2, "0");
                startDate = `${startD.getFullYear()}-${p(startD.getMonth() + 1)}-01 00:00:00`;
                endDate = `${nextMonth.getFullYear()}-${p(nextMonth.getMonth() + 1)}-01 00:00:00`;
                windowLabel = startD.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            }

            const cacheKey = `${startDate}_${endDate}`;
            const cached = reconciliationCache[cacheKey];

            let reconciled: CacheEntry;

            if (!force && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
                reconciled = cached;
            } else {
                // Perform fresh reconciliation for the window
                // a. Read sent leads in window where code_status = 'success'
                const [sentRows]: any = await connection.execute(`
                    SELECT
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
                    ORDER BY s.generate_timestamp ASC
                `, [startDate, endDate]);

                const byEnquiryId = new Map<string, any[]>();
                const byTaskId = new Map<string, any[]>();
                const allLeads: any[] = [];
                const companiesSet = new Set<string>();
                const dataSourcesSet = new Set<string>();

                (sentRows as any[]).forEach(r => {
                    const enq = String(r.enquiry_id || "").trim();
                    const taskId = extractSentTaskId(r.response_from_kserve);
                    const sentDate = new Date(r.generate_timestamp);
                    const sentMs = sentDate.getTime();
                    const dayKey = formatDayKey(sentDate);

                    const comp = String(r.company || "").trim();
                    const ds = String(r.data_source || "").trim();
                    if (comp) companiesSet.add(comp);
                    if (ds) dataSourcesSet.add(ds);

                    const item = {
                        id: enq,
                        sentTaskId: taskId,
                        name_of_client: r.name_of_client || "",
                        mobile: r.mobile || "",
                        email_id: r.email_id || "",
                        subjects: r.subjects || "",
                        company: comp,
                        data_source: ds,
                        campaign_name: r.campaign_name || "",
                        sent_date: safeDateStr(r.generate_timestamp),
                        sentMs,
                        dayKey,
                        logs: [] as any[],
                        verdict: null as any,
                    };

                    allLeads.push(item);
                    if (enq) {
                        if (!byEnquiryId.has(enq)) byEnquiryId.set(enq, []);
                        byEnquiryId.get(enq)!.push(item);
                    }
                    if (taskId) {
                        if (!byTaskId.has(taskId)) byTaskId.set(taskId, []);
                        byTaskId.get(taskId)!.push(item);
                    }
                });

                // b. Read received logs starting at startDate
                const [rcvRows]: any = await connection.execute(`
                    SELECT
                        r.lead_id,
                        r.initial_id,
                        r.client_name,
                        r.mobile,
                        r.call_start_time,
                        r.call_end_time,
                        r.call_duration_sec,
                        r.call_status,
                        r.call_type,
                        r.call_end_reason,
                        r.final_call_status,
                        r.final_lead_outcome,
                        r.followup_status,
                        r.followup_required,
                        r.followup_time,
                        r.ivr_url,
                        r.transcription_view_url,
                        r.calculated_qualification_status,
                        r.lead_status,
                        r.timestamp
                    FROM ai_voice_leads_received r
                    WHERE r.timestamp >= ?
                `, [startDate]);

                // c. Attribute each received log to the appropriate sent lead
                (rcvRows as any[]).forEach(r => {
                    const fullId = String(r.lead_id || "").trim();
                    const initialId = String(r.initial_id || "").trim();
                    const rcvTaskId = fullId ? fullId.split("-").pop() || "" : "";
                    const tsMs = new Date(r.timestamp).getTime();

                    const candidates = (rcvTaskId ? byTaskId.get(rcvTaskId) : null) || byEnquiryId.get(initialId);
                    if (!candidates || candidates.length === 0) return;

                    // Attribute to latest send with sentMs <= tsMs
                    let best: any = null;
                    for (let i = candidates.length - 1; i >= 0; i--) {
                        if (candidates[i].sentMs <= tsMs) {
                            best = candidates[i];
                            break;
                        }
                    }
                    if (!best) return;

                    const classification = classifyLog(r);
                    best.logs.push({
                        lead_id: r.lead_id,
                        initial_id: r.initial_id,
                        rcvTaskId,
                        tsMs,
                        callStartMs: r.call_start_time ? new Date(r.call_start_time).getTime() : tsMs,
                        call_start_time: safeDateStr(r.call_start_time),
                        call_end_time: safeDateStr(r.call_end_time),
                        duration_sec: r.call_duration_sec || 0,
                        call_status: r.call_status || "",
                        outcome: r.final_lead_outcome || "",
                        followup_status: r.followup_status || "",
                        followup_required: r.followup_required || "",
                        ivr_url: r.ivr_url || "",
                        transcription_view_url: r.transcription_view_url || "",
                        classification,
                    });
                });

                // d. Per-lead verdict & Daily Summary calculation
                const dailyMap: Record<string, any> = {};
                const totals = { sent: 0, found: 0, lost: 0, q: 0, nq: 0, noLog: 0, notFinal: 0 };
                const nowDate = Date.now();

                allLeads.forEach(r => {
                    // Sort logs chronologically
                    r.logs.sort((a: any, b: any) => a.callStartMs - b.callStartMs);

                    if (!dailyMap[r.dayKey]) {
                        dailyMap[r.dayKey] = {
                            dayKey: r.dayKey,
                            sent: 0,
                            found: 0,
                            lost: 0,
                            q: 0,
                            nq: 0,
                            noLog: 0,
                            notFinal: 0,
                        };
                    }
                    dailyMap[r.dayKey].sent++;
                    totals.sent++;

                    if (r.logs.length === 0) {
                        r.verdict = {
                            status: "LOST",
                            reason: "No log received",
                            qualification: "Pending",
                            deciding: null,
                        };
                        dailyMap[r.dayKey].noLog++;
                        dailyMap[r.dayKey].lost++;
                        totals.noLog++;
                        totals.lost++;
                    } else {
                        let deciding: any = null;
                        let hasQ = false;
                        let hasNQ = false;

                        for (const log of r.logs) {
                            if (log.classification === "Qualified") {
                                hasQ = true;
                                deciding = log;
                                break;
                            } else if (log.classification === "Non-Qualified") {
                                hasNQ = true;
                                deciding = log;
                            }
                        }

                        if (hasQ) {
                            r.verdict = {
                                status: "FOUND",
                                reason: "Qualified",
                                qualification: "Qualified",
                                deciding,
                            };
                            dailyMap[r.dayKey].q++;
                            dailyMap[r.dayKey].found++;
                            totals.q++;
                            totals.found++;
                        } else if (hasNQ) {
                            r.verdict = {
                                status: "FOUND",
                                reason: "Non-Qualified",
                                qualification: "Non-Qualified",
                                deciding,
                            };
                            dailyMap[r.dayKey].nq++;
                            dailyMap[r.dayKey].found++;
                            totals.nq++;
                            totals.found++;
                        } else {
                            r.verdict = {
                                status: "LOST",
                                reason: "Received but not judged",
                                qualification: "Pending",
                                deciding: r.logs[r.logs.length - 1],
                            };
                            dailyMap[r.dayKey].notFinal++;
                            dailyMap[r.dayKey].lost++;
                            totals.notFinal++;
                            totals.lost++;
                        }
                    }

                    // Compute days pending
                    const refTime = r.verdict.deciding ? r.verdict.deciding.callStartMs : nowDate;
                    r.daysPending = Math.max(0, Math.floor((refTime - r.sentMs) / 86400000));
                });

                const dailySummary = Object.values(dailyMap).sort((a: any, b: any) => {
                    const da = new Date(a.dayKey.replace(/-/g, " ")).getTime();
                    const db = new Date(b.dayKey.replace(/-/g, " ")).getTime();
                    return da - db;
                });

                reconciled = {
                    timestamp: Date.now(),
                    windowLabel,
                    startDate,
                    endDate,
                    totals,
                    dailySummary,
                    leads: allLeads,
                    companies: Array.from(companiesSet).sort(),
                    dataSources: Array.from(dataSourcesSet).sort(),
                };

                reconciliationCache[cacheKey] = reconciled;
            }

            // ── Client Filter & Pagination ───────────────────────────────────
            const filterDay = searchParams.get("day"); // e.g. "01-Sep-2026"
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
            } else if (filterStatus === "LOST") {
                filteredLeads = filteredLeads.filter(r => r.verdict.status === "LOST");
            } else if (filterStatus === "LOST_NO_LOG") {
                filteredLeads = filteredLeads.filter(r => r.verdict.reason === "No log received");
            } else if (filterStatus === "LOST_NOT_FINAL") {
                filteredLeads = filteredLeads.filter(r => r.verdict.reason === "Received but not judged");
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
            const paginated = filteredLeads.slice((page - 1) * perPage, page * perPage).map(r => ({
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
                status: r.verdict.status,
                qualification: r.verdict.qualification,
                reason: r.verdict.reason,
                callCount: r.logs.length,
                receivedCount: r.logs.length,
                receivedStatuses: r.logs.length === 0 ? "No Log" : Array.from(new Set(r.logs.map((l: any) => l.calculated_qualification_status || l.classification || "Pending"))).join(", "),
                daysPending: r.daysPending,
                deciding: r.verdict.deciding ? {
                    call_start_time: r.verdict.deciding.call_start_time,
                    call_end_time: r.verdict.deciding.call_end_time,
                    duration_sec: r.verdict.deciding.duration_sec,
                    call_status: r.verdict.deciding.call_status,
                    outcome: r.verdict.deciding.outcome,
                    followup_status: r.verdict.deciding.followup_status,
                    classification: r.verdict.deciding.classification,
                    calculated_qualification_status: r.verdict.deciding.calculated_qualification_status || r.verdict.deciding.classification,
                    ivr_url: r.verdict.deciding.ivr_url,
                    transcription_view_url: r.verdict.deciding.transcription_view_url,
                } : null,
            }));

            // Return response matching the Apps Script reconciliation model
            return NextResponse.json({
                window: {
                    label: reconciled.windowLabel,
                    startDate: reconciled.startDate,
                    endDate: reconciled.endDate,
                },
                totals: reconciled.totals,
                dailySummary: reconciled.dailySummary,
                leads: paginated,
                pagination: {
                    total,
                    page,
                    perPage,
                    totalPages,
                },
                companies: reconciled.companies,
                dataSources: reconciled.dataSources,
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
