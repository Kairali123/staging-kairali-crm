import { useEffect, useState, useCallback } from "react";
import { getIDBCache, setIDBCache } from "@/lib/idb";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

export interface ReceivedLead {
    timestamp: string;
    dateTime: string;
    _ts_num: number;
    _dt_num: number;
    id: string;
    dbId: number | null;
    clientName: string;
    mobile: string | number;
    email: string;
    subject: string;
    notes: string;
    ivrUrl: string;
    website: string;
    assigned_mr: string;
    assignto: string;
    dataSource: string;
    transcription: string;
    viewUrl: string;
    callSubId: string;
    initialid: string;

    callstarttime: string;
    callendtime: string;
    callduration: string;
    callstatus: string;
    calltype: string;
    callendreason: string;

    aicallcategory: string;
    finalcallstatus: string;
    customerengagementlevel: string;
    interestlevel: string;
    calloutcome: string;
    nextactionrequired: string;
    aicallsummary: string;
    lead_status: string;
    leadstatus: string;
    cutomercontext: string;
    preferreddatetime: string;
    cutomerintent: string;
    additionalnotes: string;
    servicecategory: string;
    finalleadoutcome: string;

    scheduledtime: string;
    scheduledstatus: string;
    company: string;
    company_by_kserve: string;
    calculated_qualification_status: string;
    tat: string | number | null;
    followup_required: string;
    client_category: string;
    next_assigned_to: string;
    sent_status: string;
    sent_status_date: string;
    error_alert_qualified_lead: string;
    repush_status: string;
    response: string;
    verified_source: string;
    created_at: string;
    updated_at: string;
    feedback_date: string;
    feedbackSubmitted: boolean;
    feedbackData: any;
    vtlStatus: string;
    vtlAssignee: string;
    vtlRemarks: string;
    doer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ISO/MySQL datetime string → "DD/MM/YYYY HH:MM" for display */
function formatDate(val: string): string {
    if (!val || val === "—") return "—";
    // Already in DD/MM/YYYY format? return as-is
    if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Convert ISO/MySQL datetime string → timestamp number for filtering/sorting */
function toNum(val: string): number {
    if (!val || val === "—") return 0;
    // ISO string: directly parse
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

function safeStr(val: any, fallback = "—"): string {
    if (val === null || val === undefined || val === "") return fallback;
    const s = String(val).trim();
    return s === "" ? fallback : s;
}

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = "received_leads_cache_idb_v2";
const CACHE_TIME_KEY = "received_leads_cache_time_idb_v2";

export function useReceivedLeads() {
    const [data, setData] = useState<ReceivedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        try {
            setError(null);
            if (data.length === 0) setLoading(true);
            else setIsRefreshing(true);

            const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

            // 1. Load from IndexedDB for instant UI
            const cachedData = await getIDBCache(CACHE_KEY);
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                setData(cachedData);
                setLoading(false);
                if (!force && cacheTime && Date.now() - Number(cacheTime) < CACHE_TTL) {
                    setIsRefreshing(false);
                    return;
                }
                setIsRefreshing(true);
            } else {
                setLoading(true);
            }

            // 2. Fetch from consolidated SQL API
            const res = await fetch("/api/received-leads" + (force ? "?force=1" : ""), {
                cache: force ? "no-store" : "default",
                headers: force ? { "Cache-Control": "no-cache" } : undefined,
            });
            if (!res.ok) {
                let message = `Request failed with HTTP ${res.status}`;
                try {
                    const payload = await res.json();
                    if (payload?.error) message = String(payload.error);
                } catch {
                    // If the server did not return JSON, keep the HTTP-based message.
                }
                throw new Error(message);
            }
            const raw = await res.json();

            if (!Array.isArray(raw)) {
                throw new Error("[useReceivedLeads] Expected array from API");
            }

            const finalData: ReceivedLead[] = raw.map((r: any) => {
                // API already returns ISO strings from safeDate()
                // toNum() parses ISO → timestamp for filtering
                // formatDate() converts ISO → "DD/MM/YYYY HH:MM" for display
                const tsRaw = safeStr(r.timestamp, "");
                const dtRaw = safeStr(r.dateTime, "");

                return {
                    timestamp: formatDate(tsRaw),
                    dateTime: formatDate(dtRaw),
                    _ts_num: toNum(tsRaw),
                    _dt_num: toNum(dtRaw),

                    id: safeStr(r.id),
                    dbId: r.dbId ?? null,
                    clientName: safeStr(r.clientName),
                    mobile: r.mobile !== undefined && r.mobile !== null ? r.mobile : "—",
                    email: safeStr(r.email),
                    subject: safeStr(r.subject),
                    notes: safeStr(r.notes, ""),
                    ivrUrl: safeStr(r.ivrUrl),
                    website: safeStr(r.website),
                    assigned_mr: safeStr(r.assigned_mr),
                    dataSource: safeStr(r.dataSource),
                    assignto: safeStr(r.assignto),
                    transcription: safeStr(r.transcription, ""),
                    viewUrl: safeStr(r.viewUrl),
                    callSubId: safeStr(r.callSubId),
                    initialid: safeStr(r.initialid),

                    callstarttime: formatDate(safeStr(r.callstarttime, "")),
                    callendtime: formatDate(safeStr(r.callendtime, "")),
                    callduration: safeStr(r.callduration, "0"),
                    callstatus: safeStr(r.callstatus),
                    calltype: safeStr(r.calltype),
                    callendreason: safeStr(r.callendreason),

                    aicallcategory: safeStr(r.aicallcategory),
                    finalcallstatus: safeStr(r.finalcallstatus),
                    customerengagementlevel: safeStr(r.customerengagementlevel),
                    interestlevel: safeStr(r.interestlevel),
                    calloutcome: safeStr(r.calloutcome),
                    nextactionrequired: safeStr(r.nextactionrequired),
                    aicallsummary: safeStr(r.aicallsummary, ""),
                    lead_status: safeStr(r.lead_status),
                    leadstatus: safeStr(r.leadstatus),
                    cutomercontext: safeStr(r.cutomercontext, ""),
                    preferreddatetime: formatDate(safeStr(r.preferreddatetime, "")),
                    cutomerintent: safeStr(r.cutomerintent),
                    additionalnotes: safeStr(r.additionalnotes, ""),
                    servicecategory: safeStr(r.servicecategory),
                    finalleadoutcome: safeStr(r.finalleadoutcome),

                    scheduledtime: formatDate(safeStr(r.scheduledtime, "")),
                    scheduledstatus: safeStr(r.scheduledstatus),
                    company: safeStr(r.company),
                    company_by_kserve: safeStr(r.company_by_kserve),
                    calculated_qualification_status: safeStr(r.calculated_qualification_status),
                    tat: r.tat ?? null,
                    followup_required: safeStr(r.followup_required),
                    client_category: safeStr(r.client_category),
                    next_assigned_to: safeStr(r.next_assigned_to),
                    sent_status: safeStr(r.sent_status),
                    sent_status_date: formatDate(safeStr(r.sent_status_date, "")),
                    error_alert_qualified_lead: safeStr(r.error_alert_qualified_lead),
                    repush_status: safeStr(r.repush_status),
                    response: safeStr(r.response, ""),
                    verified_source: safeStr(r.verified_source),
                    created_at: formatDate(safeStr(r.created_at, "")),
                    updated_at: formatDate(safeStr(r.updated_at, "")),
                    feedback_date: safeStr(r.feedback_date),
                    feedbackSubmitted: !!r.feedbackSubmitted,
                    feedbackData: r.feedbackData || {},
                    vtlStatus: safeStr(r.vtlStatus, ""),
                    vtlAssignee: safeStr(r.vtlAssignee, ""),
                    vtlRemarks: safeStr(r.vtlRemarks, ""),
                    doer: safeStr(r.doer),
                };
            });

            setData(finalData);
            await setIDBCache(CACHE_KEY, finalData);
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setError(null);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load received leads";
            console.error("[useReceivedLeads] Error:", err);
            setError(message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data.length]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handleClear = () => { setData([]); fetchData(true); };
        window.addEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
        return () => window.removeEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
    }, [fetchData]);

    return { data, loading, isRefreshing, error, refetch: () => fetchData(true) };
}
