"use client";

import { useEffect, useState, useCallback } from "react";

export interface SourceDayRow {
    source: string;
    company: string;
    color: string;
    sent: number; sentHigh: number; sentMedium: number; sentLow: number;
    responses: number; respHigh: number; respMedium: number; respLow: number;
    qualified: number; qualHigh: number; qualMedium: number; qualLow: number;
    dead: number; deadHigh: number; deadMedium: number; deadLow: number;
    pending: number; pendingHigh: number; pendingMedium: number; pendingLow: number;
    tatResponses: number; tatRespHigh: number; tatRespMedium: number; tatRespLow: number;
    tatQualified: number; tatQualHigh: number; tatQualMedium: number; tatQualLow: number;
    tatDead: number; tatDeadHigh: number; tatDeadMedium: number; tatDeadLow: number;
    tatPending: number; tatPendingHigh: number; tatPendingMedium: number; tatPendingLow: number;
}

export interface DateGroup {
    date: string;        // YYYY-MM-DD — used for sorting
    displayDate: string; // DD-MM-YYYY — shown in UI
    sources: SourceDayRow[];
}

export type LeadRow = Record<string, string | number | boolean | null | undefined>;

export interface ModalMeta {
    type: string;
    leads: LeadRow[];
    isSyncing?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
    IVR: "#059669", Facebook: "#2563eb", WhatsApp: "#16a34a",
    "Google Ads": "#d97706", "Chatbase AI": "#7c3aed", Others: "#64748b",
};
const FALLBACK = ["#0891b2", "#be185d", "#b45309", "#4338ca", "#0f766e"];

const CACHE_KEY = "voice_summary_cache";
const CACHE_TIME_KEY = "voice_summary_cache_time";
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

function resolveColor(name: string): string {
    if (SOURCE_COLORS[name]) return SOURCE_COLORS[name];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    SOURCE_COLORS[name] = FALLBACK[Math.abs(hash) % FALLBACK.length];
    return SOURCE_COLORS[name];
}

function safe(n: any): number { const v = Number(n); return isNaN(v) ? 0 : v; }

function toDisplayDate(yyyymmdd: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return yyyymmdd;
    const [y, m, d] = yyyymmdd.split("-");
    return `${d}-${m}-${y}`;
}

function transformApiToUI(raw: any): DateGroup[] {
    if (!raw || typeof raw !== "object") return [];

    const result: DateGroup[] = [];

    for (const [dateKey, dateVal] of Object.entries(raw)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
        if (!dateVal || typeof dateVal !== "object") continue;

        const rowMap = new Map<string, SourceDayRow>();

        const companyEntries = Object.entries(dateVal as object);
        for (let i = 0; i < companyEntries.length; i++) {
            const [companyName, companyVal] = companyEntries[i];
            if (!companyVal || typeof companyVal !== "object") continue;

            const sourceEntries = Object.entries(companyVal as object);
            for (let j = 0; j < sourceEntries.length; j++) {
                const [sourceName, metrics] = sourceEntries[j];
                const m = metrics as any;
                const key = `${companyName}|${sourceName}`;

                const incoming: SourceDayRow = {
                    source: sourceName,
                    company: companyName,
                    color: resolveColor(sourceName),

                    sent: safe(m?.sentApiData?.totalsendleads),
                    sentHigh: safe(m?.sentApiData?.breakdown?.high),
                    sentMedium: safe(m?.sentApiData?.breakdown?.medium),
                    sentLow: safe(m?.sentApiData?.breakdown?.low),

                    responses: safe(m?.receivedApiData?.totalreceivedleads),
                    respHigh: safe(m?.receivedApiData?.breakdown?.high),
                    respMedium: safe(m?.receivedApiData?.breakdown?.medium),
                    respLow: safe(m?.receivedApiData?.breakdown?.low),

                    qualified: safe(m?.qualifiedApiData?.totalqualifiedleads),
                    qualHigh: safe(m?.qualifiedApiData?.breakdown?.high),
                    qualMedium: safe(m?.qualifiedApiData?.breakdown?.medium),
                    qualLow: safe(m?.qualifiedApiData?.breakdown?.low),

                    dead: safe(m?.deadApiData?.totalDeadleads ?? m?.deadApiData?.totaldeadleads),
                    deadHigh: safe(m?.deadApiData?.breakdown?.high),
                    deadMedium: safe(m?.deadApiData?.breakdown?.medium),
                    deadLow: safe(m?.deadApiData?.breakdown?.low),

                    pending: safe(m?.pendingApiData?.totalPendingleads ?? m?.pendingApiData?.totalpendingleads ?? m?.rescheduledApiData?.totalrescheduledleads),
                    pendingHigh: safe(m?.pendingApiData?.breakdown?.high ?? m?.rescheduledApiData?.breakdown?.high),
                    pendingMedium: safe(m?.pendingApiData?.breakdown?.medium ?? m?.rescheduledApiData?.breakdown?.medium),
                    pendingLow: safe(m?.pendingApiData?.breakdown?.low ?? m?.rescheduledApiData?.breakdown?.low),

                    tatResponses: safe(m?.receivedApiData?.totalreceivedTat ?? m?.receivedApiData?.totalreceivedtat),
                    tatRespHigh: safe(m?.receivedApiData?.tatbreakdown?.high),
                    tatRespMedium: safe(m?.receivedApiData?.tatbreakdown?.medium),
                    tatRespLow: safe(m?.receivedApiData?.tatbreakdown?.low),

                    tatQualified: safe(m?.qualifiedApiData?.totalqualifiedtat),
                    tatQualHigh: safe(m?.qualifiedApiData?.tatbreakdown?.high),
                    tatQualMedium: safe(m?.qualifiedApiData?.tatbreakdown?.medium),
                    tatQualLow: safe(m?.qualifiedApiData?.tatbreakdown?.low),

                    tatDead: safe(m?.deadApiData?.totalDeadtat),
                    tatDeadHigh: safe(m?.deadApiData?.tatbreakdown?.high),
                    tatDeadMedium: safe(m?.deadApiData?.tatbreakdown?.medium),
                    tatDeadLow: safe(m?.deadApiData?.tatbreakdown?.low),

                    tatPending: safe(m?.pendingApiData?.totalPendingtat),
                    tatPendingHigh: safe(m?.pendingApiData?.tatbreakdown?.high),
                    tatPendingMedium: safe(m?.pendingApiData?.tatbreakdown?.medium),
                    tatPendingLow: safe(m?.pendingApiData?.tatbreakdown?.low),
                };

                const existing = rowMap.get(key);
                if (existing) {
                    existing.sent += incoming.sent;
                    existing.sentHigh += incoming.sentHigh;
                    existing.sentMedium += incoming.sentMedium;
                    existing.sentLow += incoming.sentLow;
                    existing.responses += incoming.responses;
                    existing.respHigh += incoming.respHigh;
                    existing.respMedium += incoming.respMedium;
                    existing.respLow += incoming.respLow;
                    existing.qualified += incoming.qualified;
                    existing.qualHigh += incoming.qualHigh;
                    existing.qualMedium += incoming.qualMedium;
                    existing.qualLow += incoming.qualLow;
                    existing.dead += incoming.dead;
                    existing.deadHigh += incoming.deadHigh;
                    existing.deadMedium += incoming.deadMedium;
                    existing.deadLow += incoming.deadLow;
                    existing.pending += incoming.pending;
                    existing.pendingHigh += incoming.pendingHigh;
                    existing.pendingMedium += incoming.pendingMedium;
                    existing.pendingLow += incoming.pendingLow;

                    existing.tatResponses += incoming.tatResponses;
                    existing.tatRespHigh += incoming.tatRespHigh;
                    existing.tatRespMedium += incoming.tatRespMedium;
                    existing.tatRespLow += incoming.tatRespLow;
                    existing.tatQualified += incoming.tatQualified;
                    existing.tatQualHigh += incoming.tatQualHigh;
                    existing.tatQualMedium += incoming.tatQualMedium;
                    existing.tatQualLow += incoming.tatQualLow;
                    existing.tatDead += incoming.tatDead;
                    existing.tatDeadHigh += incoming.tatDeadHigh;
                    existing.tatDeadMedium += incoming.tatDeadMedium;
                    existing.tatDeadLow += incoming.tatDeadLow;
                    existing.tatPending += incoming.tatPending;
                    existing.tatPendingHigh += incoming.tatPendingHigh;
                    existing.tatPendingMedium += incoming.tatPendingMedium;
                    existing.tatPendingLow += incoming.tatPendingLow;
                } else {
                    rowMap.set(key, incoming);
                }
            }
        }

        result.push({
            date: dateKey,
            displayDate: toDisplayDate(dateKey),
            sources: Array.from(rowMap.values()),
        });
    }

    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
}

export function useVoiceSummary() {
    const [data, setData] = useState<DateGroup[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.warn("Failed to load voice summary cache", e);
            }
        }
        return [];
    });
    const [loading, setLoading] = useState(data.length === 0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        try {
            const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
            const isExpired = !cacheTime || (Date.now() - Number(cacheTime) > CACHE_EXPIRY);
            
            if (force || isExpired || data.length === 0) {
                if (data.length === 0) setLoading(true);
                else setIsRefreshing(true);
                setError(null);

                const res = await fetch(
                    "https://script.google.com/macros/s/AKfycbwSMoJW2b5FIeRIy430COug-Kup0KkNhFlmlWCYVk-LbsvzCcGuWXl6r5QMHYFO6PIA/exec"
                );

                if (!res.ok) throw new Error(`API error: ${res.status}`);

                const json = await res.json();
                const payload = json?.data ?? json;
                const transformed = transformApiToUI(payload);
                
                setData(transformed);
                
                // Safe caching
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(transformed));
                    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                } catch (cacheErr) {
                    console.warn("[useVoiceSummary] Cache quota exceeded, proceeding without cache updates", cacheErr);
                    // Optionally clear old cache if it's full to prevent stale data
                    // but since setItem failed, the old one is still there or it's just full.
                }
            }
        } catch (err: any) {
            console.error("[useVoiceSummary]", err);
            setError(err.message || "Something went wrong");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [data.length]);

    useEffect(() => { fetchData(); }, []);

    return { data, loading, isRefreshing, error, refetch: () => fetchData(true) };
}
