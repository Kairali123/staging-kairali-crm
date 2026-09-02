"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";

/* ================= TYPES ================= */

export interface SalesSummary {
    totalPlanned: number;
    totalActual: number;
    totalUnverified: number;
    totalCancelled: number;
    totalVariance: number;
    achievementPercentage: string;
}

export interface SalesRow {
    empName: string;
    company: string;
    date: string;       // "03-01-2026"  (dd-mm-yyyy, raw key)
    day: string;        // "03"
    month: string;      // "01"
    year: string;       // "2026"

    plannedSalesAmount: number;
    plannedNewClients: number;
    plannedOldClients: number;

    actualSalesAmount: number;
    actualNewClients: number;
    actualOldClients: number;

    unverifiedSalesAmount: number;
    unverifiedNewClients: number;
    unverifiedOldClients: number;

    cancelledSalesAmount: number;
    cancelledNewClients: number;
    cancelledOldClients: number;

    collectionAmount: number;
    collectionNewClients: number;
    collectionOldClients: number;

    varianceAmount: number;
    variancePercent: number;
}

interface UseSalesDataReturn {
    salesData: SalesRow[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
    isRevalidating?: boolean;
    cachedAt?: Date | null;
}

const CACHE_KEY = "leads_sales_data_cache";
const CACHE_TIME_KEY = "leads_sales_data_cache_time";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory module cache for instant sub-millisecond route transitions
let inMemorySalesData: SalesRow[] | null = null;
let inMemoryFetchPromise: Promise<SalesRow[]> | null = null;

function getCachedSalesData(): SalesRow[] | null {
    if (inMemorySalesData && inMemorySalesData.length > 0) {
        return inMemorySalesData;
    }
    if (typeof window !== "undefined") {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    inMemorySalesData = parsed;
                    return parsed;
                }
            }
        } catch (e) {
            console.warn("Failed to read sales cache from localStorage:", e);
        }
    }
    return null;
}

function parseAndFormat(json: any): SalesRow[] {
    const formatted: SalesRow[] = [];

    // Top-level keys are dates: "dd-mm-yyyy"
    Object.entries(json).forEach(([dateKey, empMap]: [string, any]) => {
        const [day, month, year] = dateKey.split("-"); // "03","01","2026"

        // Second-level keys are employee names
        Object.entries(empMap).forEach(([empName, empData]: [string, any]) => {
            const rawCompany = empData.companyName ?? "N/A";
            const company = rawCompany.toString().trim().toUpperCase().replace(/\s+/g, "");

            const planned = empData.plannedData ?? {};
            const actual = empData.actualData ?? {};
            const unverified = empData.unverifiedData ?? {};
            const cancelled = empData.cancelledData ?? {};
            const collection = empData.collectionData ?? {};

            const plannedAmount = Number(planned.totalPlannedAmount) || 0;
            const actualAmount = Number(actual.totalActualAmount) || 0;
            const unverifiedAmount = Number(unverified.totalUnverifiedAmount) || 0;
            const cancelledAmount = Number(cancelled.totalCancelledAmount) || 0;
            const collectionAmt = Number(collection.totalCollectionAmount) || 0;

            // Skip fully empty rows
            if (
                plannedAmount === 0 &&
                actualAmount === 0 &&
                unverifiedAmount === 0 &&
                cancelledAmount === 0 &&
                collectionAmt === 0
            ) return;

            const variance = actualAmount - plannedAmount;
            const variancePercent =
                plannedAmount !== 0 ? (variance / plannedAmount) * 100 : 0;

            formatted.push({
                empName,
                company,
                date: dateKey,
                day,
                month,
                year,

                plannedSalesAmount: plannedAmount,
                plannedNewClients: Number(planned.breakdown?.newClients) || 0,
                plannedOldClients: Number(planned.breakdown?.oldClients) || 0,

                actualSalesAmount: Number(actualAmount),
                actualNewClients: Number(actual.breakdown?.newClients) || 0,
                actualOldClients: Number(actual.breakdown?.oldClients) || 0,

                unverifiedSalesAmount: Number(unverifiedAmount),
                unverifiedNewClients: Number(unverified.breakdown?.newClients) || 0,
                unverifiedOldClients: Number(unverified.breakdown?.oldClients) || 0,

                cancelledSalesAmount: Number(cancelledAmount),
                cancelledNewClients: Number(cancelled.breakdown?.newClients) || 0,
                cancelledOldClients: Number(cancelled.breakdown?.oldClients) || 0,

                collectionAmount: Number(collectionAmt),
                collectionNewClients: Number(collection.breakdown?.newClients) || 0,
                collectionOldClients: Number(collection.breakdown?.oldClients) || 0,

                varianceAmount: variance,
                variancePercent,
            });
        });
    });

    // Sort chronologically: yyyy-mm-dd order
    formatted.sort((a, b) => {
        const da = `${a.year}-${a.month}-${a.day}`;
        const db = `${b.year}-${b.month}-${b.day}`;
        return da.localeCompare(db);
    });

    return formatted;
}

/* ================= HOOK ================= */

export default function useSalesData(): UseSalesDataReturn {
    // 1. Synchronously initialize from cache for instant 0ms initial page render
    const initialCache = getCachedSalesData();
    const [salesData, setSalesData] = useState<SalesRow[]>(() => initialCache || []);
    const [loading, setLoading] = useState<boolean>(() => !initialCache || initialCache.length === 0);
    const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [cachedAt, setCachedAt] = useState<Date | null>(() => {
        if (typeof window !== "undefined") {
            const time = localStorage.getItem(CACHE_TIME_KEY);
            if (time) return new Date(Number(time));
        }
        return null;
    });

    const isFetchingRef = useRef(false);

    const fetchSales = useCallback(async (force = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            setError(null);

            const currentCache = getCachedSalesData();
            if (!currentCache || currentCache.length === 0) {
                setLoading(true);
            } else {
                setIsRevalidating(true);
            }

            // If not forcing and cache is still fresh, skip network fetch
            if (!force && typeof window !== "undefined") {
                const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
                if (cacheTime && Date.now() - Number(cacheTime) < CACHE_TTL && currentCache && currentCache.length > 0) {
                    setSalesData(currentCache);
                    setLoading(false);
                    setIsRevalidating(false);
                    isFetchingRef.current = false;
                    return;
                }
            }

            // De-duplicate concurrent network requests
            if (!inMemoryFetchPromise || force) {
                inMemoryFetchPromise = (async () => {
                    const res = await fetch(
                        "https://script.google.com/macros/s/AKfycbzl525FWFr612hJ_S_QUknj4UUORLESSPAS_b4_n5glD3AEXAXgw3G3H48nAZO8vmvl/exec"
                    );

                    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

                    const json = await res.json();

                    if (!json || Object.keys(json).length === 0)
                        throw new Error("No data received from API");

                    return parseAndFormat(json);
                })();
            }

            const formatted = await inMemoryFetchPromise;

            inMemorySalesData = formatted;
            setSalesData(formatted);
            const now = Date.now();
            setCachedAt(new Date(now));

            // Write to localStorage for persistence across reloads
            if (typeof window !== "undefined") {
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
                    localStorage.setItem(CACHE_TIME_KEY, now.toString());
                } catch (e) {
                    console.warn("Failed to cache sales data in localStorage:", e);
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch sales data";
            console.error("Sales API error:", err);
            setError(msg);
        } finally {
            inMemoryFetchPromise = null;
            isFetchingRef.current = false;
            setLoading(false);
            setIsRevalidating(false);
        }
    }, []);

    useEffect(() => {
        fetchSales();

        // Listen for global cache clear events
        const handleCacheClear = () => {
            inMemorySalesData = null;
            if (typeof window !== "undefined") {
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem(CACHE_TIME_KEY);
            }
            fetchSales(true);
        };

        window.addEventListener(LEADS_CACHE_CLEARED_EVENT, handleCacheClear);
        return () => {
            window.removeEventListener(LEADS_CACHE_CLEARED_EVENT, handleCacheClear);
        };
    }, [fetchSales]);

    return {
        salesData,
        loading,
        error,
        refetch: () => fetchSales(true),
        isRevalidating,
        cachedAt,
    };
}
