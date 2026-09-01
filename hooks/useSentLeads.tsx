import { useEffect, useState, useCallback } from "react";
import { getIDBCache, setIDBCache } from "@/lib/idb";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

export interface SentLead {
    genTimestamp: string;
    enqDateTime: string;
    _ts_num: number;
    _dt_num: number;
    enquiryId: string;
    clientName: string;
    mobile: string;
    email: string;
    subject: string;
    notes: string;
    ivrUrl: string;
    websiteName: string;
    dataSource: { label: string; color: any };
    campaignId: string;
    campaignName: string;
    assignTo: string;
    kserveResponse: string;
    kserveError: boolean;
    transferTo: string;
    statusCode: string;
    status: { label: string; dot: any; color: any };
    company: string;
    region: string;
    leadIntent: string;
    urgency: string;
    newMobile: string;
    maySentTo: string;
    location: string;
    timezone: string;
    utcOffset: string;
    businessHoursStart: string;
    businessHoursEnd: string;
    weekdaysConfig: string;
    received: string;
    receivedDate: string;
    totalCallCount: number;
    callOutcome: string;
    callStatus: string;
    callHistoryLink: string;
    totalTimeToCallComplete: string;
    id: number | null;
    createdAt: string;
    updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value: any): string {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMobile(raw: any): string {
    if (!raw) return "—";
    const digits = String(raw).replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
        const n = digits.slice(2);
        return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
    }
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    return String(raw);
}

function parseNotes(raw: string): string {
    if (!raw) return "—";
    try {
        const obj = JSON.parse(raw);
        const summary =
            obj?.aiExtractionDetails?.summaryOfConvo ||
            obj?.notes ||
            null;
        if (summary) {
            const priority = obj?.aiExtractionDetails?.prority;
            const interact = obj?.aiExtractionDetails?.preffered_way_to_interact;
            const extras = [
                priority && `Priority: ${priority}`,
                interact && `Preferred: ${interact}`,
            ].filter(Boolean).join(" · ");
            return extras ? `${summary} [${extras}]` : summary;
        }
        return raw;
    } catch {
        return raw;
    }
}

function parseKserveResponse(raw: string): { display: string; isError: boolean } {
    if (!raw) return { display: "—", isError: false };
    try {
        let str = raw.trim();
        if (str.startsWith('"') && str.endsWith('"')) {
            str = JSON.parse(str);
        }
        const obj = JSON.parse(str);
        const code = obj?.status_code ?? obj?.statusCode;
        const message = obj?.message || "";
        const isError = code !== undefined ? Number(code) >= 400 : false;
        return {
            display: code !== undefined
                ? `${code}${message ? " — " + message : ""}`.trim()
                : raw,
            isError,
        };
    } catch {
        const isError = /error|fail/i.test(raw) || /^[45]\d\d/.test(raw.trim());
        return { display: raw, isError };
    }
}

function mapDataSource(value: string): { label: string; color: string } {
    const v = (value || "").toLowerCase();
    if (v.includes("facebook") || v.includes("fb")) return { label: value, color: "purple" };
    if (v.includes("whatsapp") || v.includes("wa")) return { label: value, color: "teal" };
    if (v.includes("google")) return { label: value, color: "orange" };
    if (v.includes("ivr")) return { label: value, color: "blue" };
    if (v.includes("ai")) return { label: value, color: "indigo" };
    return { label: value || "Unknown", color: "gray" };
}

function mapStatus(raw: string): { label: string; dot: string; color: string } {
    const s = (raw || "").toLowerCase().trim();
    if (s === "success") return { label: "Success", dot: "g", color: "green" };
    if (s === "failed" || s === "fail") return { label: "Failed", dot: "r", color: "red" };
    if (s === "pending") return { label: "Pending", dot: "o", color: "yellow" };
    if (s === "in progress") return { label: "In Progress", dot: "o", color: "yellow" };
    if (s === "no input") return { label: "No Input", dot: "x", color: "gray" };
    if (s) return { label: raw, dot: "o", color: "yellow" };
    return { label: "Pending", dot: "o", color: "yellow" };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache on client
const CACHE_KEY = "sent_leads_cache_idb";
const CACHE_TIME_KEY = "sent_leads_cache_time_idb";

export function useSentLeads() {
    const [data, setData] = useState<SentLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        try {
            setError(null);
            if (data.length === 0) setLoading(true);
            else setIsRefreshing(true);

            const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
            let hasFreshCache = false;

            // 1. Try to load from IndexedDB immediately for instant UI
            const cachedData = await getIDBCache(CACHE_KEY);
            if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
                setData(cachedData);
                setLoading(false); // Instantly stop loading indicator
                
                // If it's fresh and we're not forcing, we can stop here
                if (!force && cacheTime && Date.now() - Number(cacheTime) < CACHE_TTL) {
                    setIsRefreshing(false);
                    return;
                }
                // Otherwise, it's stale (or forced). We continue to fetch in the background!
                hasFreshCache = true;
                setIsRefreshing(true);
            } else {
                setLoading(true); // Only show hard loading if we have NO data
            }

            // 2. Fetch from fast API Route proxy (runs in background if we already showed cached data)
            const res = await fetch("/api/sent-leads" + (force ? "?force=1" : ""), {
                cache: force ? "no-store" : "default",
                headers: force ? { "Cache-Control": "no-cache" } : undefined,
            });
            if (!res.ok) {
                let message = `Request failed with HTTP ${res.status}`;
                try {
                    const payload = await res.json();
                    if (payload?.error) message = String(payload.error);
                } catch {
                    // Keep the HTTP status message if the response body is not JSON.
                }
                throw new Error(message);
            }
            const raw = await res.json();

            if (!Array.isArray(raw)) {
                throw new Error("Expected array from sent leads API");
            }

            const parseDT = (val: string) => {
                if (!val || val === "—") return 0;
                const a = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
                if (a) {
                    const day = parseInt(a[1], 10), mon = parseInt(a[2], 10), year = parseInt(a[3], 10);
                    const hr = parseInt(a[4], 10), min = parseInt(a[5], 10), sec = parseInt(a[6] || "0", 10);
                    return new Date(year, mon - 1, day, hr, min, sec).getTime();
                }
                return new Date(val).getTime() || 0;
            };

            const mapped: SentLead[] = raw
                .filter(r => r && typeof r === "object" && !!r.enqid)
                .map(r => {
                    const kserve = parseKserveResponse(r.responsefromkserve || "");
                    const genTs = formatDate(r.genratetimestamp);
                    const enqDt = formatDate(r.datetime);
                    return {
                        genTimestamp: genTs,
                        enqDateTime: enqDt,
                        _ts_num: parseDT(genTs),
                        _dt_num: parseDT(enqDt),
                        enquiryId: r.enqid || "—",
                        clientName: r.nameofclient || "N/A",
                        mobile: formatMobile(r.moblie),
                        email: r.emailid || "—",
                        subject: r.subject || "—",
                        notes: parseNotes(r.notes || ""),
                        ivrUrl: r.ivrurl || "—",
                        websiteName: r.websitename || "—",
                        dataSource: mapDataSource(r.datasource || ""),
                        campaignId: r.campaignid || "—",
                        campaignName: r.campaignname || r.datasource || "—",
                        assignTo: r.assignto || "—",
                        kserveResponse: kserve.display,
                        kserveError: kserve.isError,
                        transferTo: r.transfertokservestatus ? formatDate(r.transfertokservestatus) : "—",
                        statusCode: r.stauscode || "—",
                        status: mapStatus(r.stauscode || ""),
                        company: String(r.company ?? "—"),
                        region: String(r.region ?? "—"),
                        leadIntent: String(r.lead_intent ?? "—"),
                        urgency: String(r.urgency ?? "—"),
                        newMobile: String(r.new_mobile ?? "—"),
                        maySentTo: String(r.may_sent_to ?? "—"),
                        location: String(r.location ?? "—"),
                        timezone: String(r.timezone ?? "—"),
                        utcOffset: String(r.utc_offset ?? "—"),
                        businessHoursStart: String(r.business_hours_start ?? "—"),
                        businessHoursEnd: String(r.business_hours_end ?? "—"),
                        weekdaysConfig: String(r.weekdays_config ?? "—"),
                        received: String(r.received ?? "—"),
                        receivedDate: String(r.received_date ?? "—"),
                        totalCallCount: Number(r.total_call_count ?? 0),
                        callOutcome: String(r.call_outcome ?? "—"),
                        callStatus: String(r.call_status ?? "—"),
                        callHistoryLink: String(r.call_history_link ?? "—"),
                        totalTimeToCallComplete: String(r.Total_time_to_call_complete ?? "—"),
                        id: r.id ?? null,
                        createdAt: String(r.created_at ?? "—"),
                        updatedAt: String(r.updated_at ?? "—"),
                    };
                });

            setData(mapped);

            await setIDBCache(CACHE_KEY, mapped);
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
            setError(null);

        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load sent leads";
            console.error("Sent API Error:", err);
            setError(message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data.length]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handleClear = () => {
            setData([]);
            fetchData(true);
        };

        window.addEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
        return () => window.removeEventListener(LEADS_CACHE_CLEARED_EVENT, handleClear);
    }, [fetchData]);

    return { data, loading, isRefreshing, error, refetch: () => fetchData(true) };
}
