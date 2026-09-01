import { useEffect, useState, useCallback } from "react";
import { getIDBCache, setIDBCache } from "@/lib/idb";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

export interface DialShreeReceivedLead {
    sl_no: number;
    timeIdKey: string;
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
    latest_recording_url: string;
    website: string;
    dataSource: string;
    verified_source: string;
    assigned_mr: string;
    assignto: string;
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
    doer: string;
    agent_Id: string;
    campaign_name: string;
    campaign_id: string;
    leadId_from_dialer: string;
    created_at: string;
    updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(val: string): string {
    if (!val || val === "—") return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toNum(val: string): number {
    if (!val || val === "—") return 0;
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

function safeStr(val: any, fallback = "—"): string {
    if (val === null || val === undefined || val === "") return fallback;
    const s = String(val).trim();
    return s === "" ? fallback : s;
}

const CACHE_TTL = 3 * 60 * 1000;
const CACHE_KEY = "dialshree_received_cache_idb_v2";
const CACHE_TIME_KEY = "dialshree_received_cache_time_idb_v2";

export function useDialShreeReceivedLeads() {
    const [data, setData] = useState<DialShreeReceivedLead[]>([]);
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

            // 2. Fetch from DialShree API
            const res = await fetch("/api/dialshree/received" + (force ? "?force=1" : ""), {
                cache: force ? "no-store" : "default",
                headers: force ? { "Cache-Control": "no-cache" } : undefined,
            });
            if (!res.ok) {
                let message = `Request failed with HTTP ${res.status}`;
                try {
                    const payload = await res.json();
                    if (payload?.error) message = String(payload.error);
                } catch {
                    // Fallback
                }
                throw new Error(message);
            }
            const raw = await res.json();

            if (!Array.isArray(raw)) {
                throw new Error("[useDialShreeReceivedLeads] Expected array from API");
            }

            const finalData: DialShreeReceivedLead[] = raw.map((r: any) => {
                const tsRaw = safeStr(r.timestamp, "");
                const dtRaw = safeStr(r.dateTime, "");

                return {
                    sl_no: r.sl_no,
                    timeIdKey: safeStr(r.timeIdKey),
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
                    latest_recording_url: safeStr(r.latest_recording_url),
                    website: safeStr(r.website),
                    dataSource: safeStr(r.dataSource),
                    verified_source: safeStr(r.verified_source),
                    assigned_mr: safeStr(r.assigned_mr),
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
                    calculated_qualification_status: safeStr(r.leadstatus),
                    tat: r.tat ?? null,
                    doer: safeStr(r.doer),
                    agent_Id: safeStr(r.agent_Id),
                    campaign_name: safeStr(r.campaign_name),
                    campaign_id: safeStr(r.campaign_id),
                    leadId_from_dialer: safeStr(r.leadId_from_dialer),
                    created_at: formatDate(safeStr(r.created_at, "")),
                    updated_at: formatDate(safeStr(r.updated_at, "")),
                };
            });

            setData(finalData);
            await setIDBCache(CACHE_KEY, finalData);
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setError(null);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load DialShree received leads";
            console.error("[useDialShreeReceivedLeads] Error:", err);
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
