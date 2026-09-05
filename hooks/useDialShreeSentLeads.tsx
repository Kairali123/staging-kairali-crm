import { useEffect, useState, useCallback } from "react";
import { getIDBCache, setIDBCache } from "@/lib/idb";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

export interface DialShreeSentLead {
    id: number;
    leadId: string;
    timestamp: string;
    enquiryDateTime: string;
    timestampSentNotSent: string;
    timestampAfterAction: string;
    createdAt: string;
    updatedAt: string;

    clientName: string;
    mobile: string;
    altMobile: string;
    email: string;
    altEmail: string;

    subjects: string;
    notes: string;
    url: string;
    websiteName: string;
    dataSource: string;
    assignTo: string;
    remarksHistory: string;

    campaignName: string;
    listId: string;
    sqvLeadIntent: string;
    sqvRemarks: string;

    responseResult: string;
    actionAfterException: string;
    deliveryStatus: {
        label: string;
        category: "sent" | "exception" | "pending";
        color: "green" | "red" | "orange" | "blue" | "gray";
    };

    location: string;
    location2: string;
    region: string;
    code: string;
    geo: string;
    timezone: string;
    utcOffset: string;
    businessHoursStart: string;
    businessHoursEnd: string;
    weekdaysConfig: string;

    company: string;
    _ts_num?: number;
    _enq_num?: number;
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

            const cacheTime = typeof window !== "undefined" ? localStorage.getItem(CACHE_TIME_KEY) : null;

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
                const enqRaw = safeStr(r.enquiryDateTime, "");

                return {
                    id: Number(r.id),
                    leadId: safeStr(r.leadId),
                    timestamp: formatDate(tsRaw),
                    enquiryDateTime: formatDate(enqRaw),
                    timestampSentNotSent: formatDate(safeStr(r.timestampSentNotSent, "")),
                    timestampAfterAction: formatDate(safeStr(r.timestampAfterAction, "")),
                    createdAt: formatDate(safeStr(r.createdAt, "")),
                    updatedAt: formatDate(safeStr(r.updatedAt, "")),

                    _ts_num: toNum(tsRaw),
                    _enq_num: toNum(enqRaw),

                    clientName: safeStr(r.clientName),
                    mobile: safeStr(r.mobile),
                    altMobile: safeStr(r.altMobile, ""),
                    email: safeStr(r.email),
                    altEmail: safeStr(r.altEmail, ""),

                    subjects: safeStr(r.subjects, ""),
                    notes: safeStr(r.notes, ""),
                    url: safeStr(r.url, ""),
                    websiteName: safeStr(r.websiteName),
                    dataSource: safeStr(r.dataSource),
                    assignTo: safeStr(r.assignTo),
                    remarksHistory: safeStr(r.remarksHistory, ""),

                    campaignName: safeStr(r.campaignName),
                    listId: safeStr(r.listId, ""),
                    sqvLeadIntent: safeStr(r.sqvLeadIntent),
                    sqvRemarks: safeStr(r.sqvRemarks, ""),

                    responseResult: safeStr(r.responseResult, ""),
                    actionAfterException: safeStr(r.actionAfterException, ""),
                    deliveryStatus: r.deliveryStatus || {
                        label: "Pending",
                        category: "pending",
                        color: "orange",
                    },

                    location: safeStr(r.location, ""),
                    location2: safeStr(r.location2, ""),
                    region: safeStr(r.region, ""),
                    code: safeStr(r.code, ""),
                    geo: safeStr(r.geo, ""),
                    timezone: safeStr(r.timezone, ""),
                    utcOffset: safeStr(r.utcOffset, ""),
                    businessHoursStart: safeStr(r.businessHoursStart, ""),
                    businessHoursEnd: safeStr(r.businessHoursEnd, ""),
                    weekdaysConfig: safeStr(r.weekdaysConfig, ""),

                    company: safeStr(r.company),
                };
            });

            setData(finalData);

            // 3. Save to IndexedDB
            try {
                await setIDBCache(CACHE_KEY, finalData);
                if (typeof window !== "undefined") {
                    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
                }
            } catch (idbErr) {
                console.warn("[useDialShreeSentLeads] IDB save error:", idbErr);
            }

        } catch (err: any) {
            console.error("[useDialShreeSentLeads] Fetch error:", err);
            setError(err.message || "Failed to load DialShree sent outreach leads");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleClear = () => {
            setData([]);
            fetchData(true);
        };
        window.addEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
        return () => window.removeEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
    }, [fetchData]);

    return {
        data,
        loading,
        isRefreshing,
        error,
        refetch: () => fetchData(true),
    };
}
