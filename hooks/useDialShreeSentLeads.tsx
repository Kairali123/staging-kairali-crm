import { useEffect, useState, useCallback } from "react";
import { getIDBCache, setIDBCache } from "@/lib/idb";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

export type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink";
export type DotColor = "g" | "o" | "r" | "b" | "x";

export interface DialShreeSentLead {
    id: number;
    timestamp: string;
    enquiry_date_time: string;
    _ts_num: number;
    _dt_num: number;
    lead_id: string;
    name_of_client: string;
    mobile: string;
    email_id: string;
    subjects: string;
    notes: string;
    url: string;
    website_name: string;
    data_source: string;
    dataSourcePill: { label: string; color: PillColor };
    assign_to: string;
    remarks_history: string;
    sqv_lead_intent: string;
    campaign_name: string;
    list_id: string;
    sqv_remarks: string;
    alt_mobile: string;
    alt_email_id: string;
    geo: string;
    response_result: string;
    timestamp_sent_not_sent: string;
    action_after_getting_exception: string;
    timestamp_after_action: string;
    location: string;
    timezone: string;
    utc_offset: string;
    business_hours_start: string;
    business_hours_end: string;
    weekdays_config: string;
    code: string;
    region: string;
    location_2: string;
    created_at: string;
    updated_at: string;
    company: string;
    status: { label: string; dot: DotColor; color: PillColor };
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
    const a = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (a) {
        const day = parseInt(a[1], 10), mon = parseInt(a[2], 10), year = parseInt(a[3], 10);
        const hr = parseInt(a[4], 10), min = parseInt(a[5], 10), sec = parseInt(a[6] || "0", 10);
        return new Date(year, mon - 1, day, hr, min, sec).getTime();
    }
    const t = new Date(val).getTime();
    return isNaN(t) ? 0 : t;
}

function safeStr(val: any, fallback = "—"): string {
    if (val === null || val === undefined || val === "") return fallback;
    const s = String(val).trim();
    return s === "" ? fallback : s;
}

function formatMobile(raw: any): string {
    if (!raw || raw === "—") return "—";
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
        const n = digits.slice(2);
        return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
    }
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return String(raw);
}

function mapDataSource(value: string): { label: string; color: PillColor } {
    const v = (value || "").toLowerCase();
    if (v.includes("facebook") || v.includes("fb")) return { label: value || "Facebook", color: "purple" };
    if (v.includes("whatsapp") || v.includes("wa")) return { label: value || "WhatsApp", color: "teal" };
    if (v.includes("google")) return { label: value || "Google", color: "orange" };
    if (v.includes("ivr")) return { label: value || "IVR", color: "blue" };
    if (v.includes("ai") || v.includes("doctor")) return { label: value || "AI", color: "indigo" };
    if (v.includes("website") || v.includes("organic")) return { label: value || "Website", color: "teal" };
    return { label: value || "Unknown", color: "gray" };
}

const CACHE_TTL = 3 * 60 * 1000; // 3 mins
const CACHE_KEY = "dialshree_sent_cache_idb_v2";
const CACHE_TIME_KEY = "dialshree_sent_cache_time_idb_v2";

export function useDialShreeSentLeads() {
    const [data, setData] = useState<DialShreeSentLead[]>([]);
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

            // 2. Fetch from DialShree Sent API
            const res = await fetch("/api/dialshree/sent" + (force ? "?force=1" : ""), {
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
                throw new Error("[useDialShreeSentLeads] Expected array from API");
            }

            const finalData: DialShreeSentLead[] = raw.map((r: any) => {
                const tsRaw = safeStr(r.timestamp, "");
                const dtRaw = safeStr(r.enquiry_date_time, "");
                const formattedTs = formatDate(tsRaw);
                const formattedDt = formatDate(dtRaw);

                return {
                    id: r.id,
                    timestamp: formattedTs,
                    enquiry_date_time: formattedDt,
                    _ts_num: toNum(formattedTs),
                    _dt_num: toNum(formattedDt),
                    lead_id: safeStr(r.lead_id),
                    name_of_client: safeStr(r.name_of_client, "N/A"),
                    mobile: formatMobile(r.mobile),
                    email_id: safeStr(r.email_id),
                    subjects: safeStr(r.subjects),
                    notes: safeStr(r.notes, ""),
                    url: safeStr(r.url),
                    website_name: safeStr(r.website_name),
                    data_source: safeStr(r.data_source),
                    dataSourcePill: mapDataSource(r.data_source),
                    assign_to: safeStr(r.assign_to),
                    remarks_history: safeStr(r.remarks_history, ""),
                    sqv_lead_intent: safeStr(r.sqv_lead_intent),
                    campaign_name: safeStr(r.campaign_name),
                    list_id: safeStr(r.list_id),
                    sqv_remarks: safeStr(r.sqv_remarks, ""),
                    alt_mobile: formatMobile(r.alt_mobile),
                    alt_email_id: safeStr(r.alt_email_id),
                    geo: safeStr(r.geo),
                    response_result: safeStr(r.response_result),
                    timestamp_sent_not_sent: formatDate(safeStr(r.timestamp_sent_not_sent, "")),
                    action_after_getting_exception: safeStr(r.action_after_getting_exception, ""),
                    timestamp_after_action: formatDate(safeStr(r.timestamp_after_action, "")),
                    location: safeStr(r.location),
                    timezone: safeStr(r.timezone),
                    utc_offset: safeStr(r.utc_offset),
                    business_hours_start: safeStr(r.business_hours_start),
                    business_hours_end: safeStr(r.business_hours_end),
                    weekdays_config: safeStr(r.weekdays_config),
                    code: safeStr(r.code),
                    region: safeStr(r.geo).toLowerCase().includes("domestic") ? "DOMESTIC" : "INTERNATIONAL",
                    location_2: safeStr(r.location_2),
                    created_at: formatDate(safeStr(r.created_at, "")),
                    updated_at: formatDate(safeStr(r.updated_at, "")),
                    company: safeStr(r.company, "KAC"),
                    status: r.status || { label: "Pending", dot: "o", color: "yellow" },
                };
            });

            setData(finalData);
            await setIDBCache(CACHE_KEY, finalData);
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setError(null);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load DialShree sent leads";
            console.error("[useDialShreeSentLeads] Error:", err);
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
