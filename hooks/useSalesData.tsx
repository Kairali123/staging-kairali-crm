"use client";

import { useEffect, useState } from "react";

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
}

/* ================= HOOK ================= */

export default function useSalesData(): UseSalesDataReturn {
    const [salesData, setSalesData] = useState<SalesRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSales = async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await fetch(
                // "https://script.google.com/macros/s/AKfycbzl525FWFr612hJ_S_QUknj4UUORLESSPAS_b4_n5glD3AEXAXgw3G3H48nAZO8vmvl/exec"
                // "https://script.google.com/macros/s/AKfycbyOfcVtcrDG71Xfz0nGGOhccni9I3IlnlEEzLIqkD7rFYSqUK8yoeFSNndIMqvzjSuY/exec"
                "https://script.google.com/macros/s/AKfycbzl525FWFr612hJ_S_QUknj4UUORLESSPAS_b4_n5glD3AEXAXgw3G3H48nAZO8vmvl/exec"
            );

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const json = await res.json();

            if (!json || Object.keys(json).length === 0)
                throw new Error("No data received from API");

            const formatted: SalesRow[] = [];

            /* ================= CORE MAPPING ================= */
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

            setSalesData(formatted);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Failed to fetch sales data";
            console.error("Sales API error:", err);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    return { salesData, loading, error, refetch: fetchSales };
}
