"use client";

import { useEffect, useState, useMemo } from "react";

export interface PPCRawRow {
    date: string;
    campaign: string;
    company: string;
    leads: number;
    conversions: number;
    conversionAmount: number;
    expense: number;
}

export interface PPCData {
    campaign: string;
    company: string;
    totalLeads: number;
    conversions: number;
    conversionAmount: number;
    expense: number;
    conversionRate: number;
    roas: number;
}

type ApiCampaignMetrics = {
    leadCount?: number | string;
    conversionCount?: number | string;
    conversionAmount?: number | string;
    expenseAmount?: number | string;
};

type ApiResponse = {
    data?: {
        [company: string]: {
            [date: string]: {
                [campaign: string]: ApiCampaignMetrics;
            };
        };
    };
};

type ApiData = NonNullable<ApiResponse["data"]>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const extractApiData = (json: unknown): ApiData => {
    const payload = isRecord(json) && isRecord(json.data) ? json.data : json;
    if (!isRecord(payload)) {
        throw new Error("Facebook PPC API returned an invalid payload");
    }
    return payload as ApiData;
};

const num = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
};

export default function useFacebookPPCData() {
    const [rawData, setRawData] = useState<PPCRawRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const res = await fetch("https://script.google.com/macros/s/AKfycbxdh66fFhos61D7ymM-6zIuBcwE4rCgNuzpJqUczqn3do4sk86SKkndgVgTXsuxKBAu/exec");
                if (!res.ok) throw new Error("API failed");

                const json: unknown = await res.json();
                const apiData = extractApiData(json);


                const rows: PPCRawRow[] = [];

                Object.entries(apiData).forEach(([company, dates]) => {
                    Object.entries(dates).forEach(([date, campaigns]) => {
                        Object.entries(campaigns).forEach(([campaign, m]) => {
                            rows.push({
                                date,
                                company: company.toUpperCase(),
                                campaign,
                                leads: num(m.leadCount),
                                conversions: num(m.conversionCount),
                                conversionAmount: num(m.conversionAmount),
                                expense: num(m.expenseAmount),
                            });
                        });
                    });
                });

                setRawData(rows);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Something went wrong");
                setRawData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const aggregatedData: PPCData[] = useMemo(() => {
        const map = new Map<string, PPCData>();

        rawData.forEach((r) => {
            const key = `${r.company}__${r.campaign}`;

            if (!map.has(key)) {
                map.set(key, {
                    company: r.company,
                    campaign: r.campaign,
                    totalLeads: 0,
                    conversions: 0,
                    conversionAmount: 0,
                    expense: 0,
                    conversionRate: 0,
                    roas: 0,
                });
            }

            const curr = map.get(key)!;
            curr.totalLeads += r.leads;
            curr.conversions += r.conversions;
            curr.conversionAmount += r.conversionAmount;
            curr.expense += r.expense;
        });

        return Array.from(map.values()).map((v) => ({
            ...v,
            conversionRate: v.totalLeads
                ? +(v.conversions / v.totalLeads * 100).toFixed(2)
                : 0,
            roas: v.expense
                ? +(v.conversionAmount / v.expense).toFixed(2)
                : 0,
        }));
    }, [rawData]);

    return { rawData, aggregatedData, loading, error };
}
