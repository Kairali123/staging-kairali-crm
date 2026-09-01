"use client";

import { useState, useEffect, useMemo } from "react";

export interface PPCRawRow {
  date: string;
  campaign: string;        // decoded (UI use)
  campaignKey: string;     // raw API key (logic + aggregation)
  company: string;
  leads: number;
  conversions: number;
  conversionAmount: number;
  expense: number;
}


export interface PPCAggregatedRow {
  campaign: string;
  company: string;
  totalLeads: number;
  conversions: number;
  conversionAmount: number;
  expense: number;
  conversionRate: number;
  roas: number;
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbwmKA0gqG7tcIjoofKr1FKk5LkPeaNjX7NYM4BmiBrTwf4AIxtLMHgD4-ROjJKLQ3W-/exec";

function parseNumberSafe(value: unknown): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function useGooglePPCData() {
  const [rawData, setRawData] = useState<PPCRawRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPPC = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error(`API failed with status ${res.status}`);
        }

        const json = await res.json();
        const temp: PPCRawRow[] = [];

        // helper: safe campaign decode (UI-friendly)
        const decodeCampaign = (value: string) => {
          try {
            return decodeURIComponent(value)
              .replace(/\+/g, " ")
              .trim();
          } catch {
            return value.replace(/\+/g, " ").trim();
          }
        };

        // Company → Date → Campaign
        Object.keys(json || {}).forEach((companyKey) => {
          const companyBlock = json[companyKey] || {};

          Object.keys(companyBlock).forEach((dateKey) => {
            const dateBlock = companyBlock[dateKey] || {};

            Object.keys(dateBlock).forEach((campaignRaw) => {
              const item = dateBlock[campaignRaw];

              const campaignDecoded = decodeCampaign(campaignRaw);

              temp.push({
                date: dateKey,
                company: companyKey.toUpperCase(),

                campaign: campaignDecoded, // ✅ UI / filters
                campaignKey: campaignRaw,  // ✅ original API key (MOST IMPORTANT)

                leads: parseNumberSafe(item.leadCount),
                conversions: parseNumberSafe(item.conversionCount),
                conversionAmount: parseNumberSafe(item.conversionAmount),
                expense: parseNumberSafe(item.expenseAmount),
              });
            });
          });
        });

        setRawData(temp);
      } catch (err) {
        console.error("Google PPC API Error:", err);
        setRawData([]);
        setError(err instanceof Error ? err.message : "Failed to load Google PPC data");
      } finally {
        setLoading(false);
      }
    };

    fetchPPC();
  }, []);

  // ===============================
  // AGGREGATION (used by page.tsx)
  // ===============================

  const aggregatedData: PPCAggregatedRow[] = useMemo(() => {
    const map = new Map<
      string,
      {
        company: string;
        campaign: string;
        totalLeads: number;
        conversions: number;
        conversionAmount: number;
        expense: number;
      }
    >();

    rawData.forEach((r) => {
      // 🔥 IMPORTANT FIX: aggregation ORIGINAL campaignKey pe
      const key = JSON.stringify([r.company, r.campaignKey]);

      if (!map.has(key)) {
        map.set(key, {
          company: r.company,
          campaign: r.campaign, // decoded name (UI ke liye)
          totalLeads: 0,
          conversions: 0,
          conversionAmount: 0,
          expense: 0,
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
      conversionRate:
        v.totalLeads > 0
          ? Number(((v.conversions / v.totalLeads) * 100).toFixed(2))
          : 0,
      roas:
        v.expense > 0
          ? Number((v.conversionAmount / v.expense).toFixed(2))
          : 0,
    }));
  }, [rawData]);

  return { rawData, aggregatedData, loading, error };
}
