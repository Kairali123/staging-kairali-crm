"use client";

import { useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface CallsEmployeeRow {
  empName: string;
  company: string;
  plannedCalls: number;
  actualCalls: number;
  varianceCalls: number;
  variancePercent: number;
  newClientsPlanned: number;
  newClientsActual: number;
  oldClientsPlanned: number;
  oldClientsActual: number;
}

export interface CallsDateGroup {
  date: string;          // "2024-02-21"
  displayDate: string;   // "21 Feb 2024"
  month: string;         // "FEBRUARY"
  year: string;          // "2024"
  employees: CallsEmployeeRow[];
  totalPlanned: number;
  totalActual: number;
  totalVariance: number;
  totalNewPlanned: number;
  totalNewActual: number;
  totalOldPlanned: number;
  totalOldActual: number;
}

// Legacy flat row — kept for filters, KPIs, graph view
export interface CallsRow {
  empName: string;
  company: string;
  month: string;
  year: string;
  plannedCalls: number;
  actualCalls: number;
  varianceCalls: number;
  variancePercent: number;
  newClientsActual: number;
  oldClientsActual: number;
  rank?: number;
}

interface UseCallsDataReturn {
  callsData: CallsRow[];
  dateGroups: CallsDateGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${abbr[parseInt(m, 10) - 1]} ${y}`;
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export default function useCallsData(): UseCallsDataReturn {
  const [callsData, setCallsData] = useState<CallsRow[]>([]);
  const [dateGroups, setDateGroups] = useState<CallsDateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbydzH-IMa6XAwjjmJmy6yfDjnuu2Rfc8n2OUHYPYp5gQjNoqjjc5BrtLxB83torBcU/exec"
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      if (!json || Object.keys(json).length === 0)
        throw new Error("No data received from API");

      const groups: CallsDateGroup[] = [];
      const flatMap = new Map<string, CallsRow>();

      // Sort dates ascending
      Object.keys(json).sort().forEach((dateStr) => {
        const [y, m] = dateStr.split("-");
        const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
        const year = y;

        const employees: CallsEmployeeRow[] = [];

        Object.entries(json[dateStr]).forEach(([empName, data]: [string, any]) => {
          const company = (data.companyName ?? "")
            .toString().trim().toUpperCase().replace(/\s+/g, "");

          const plannedCalls = data.plannedData?.totalPlannedCalls ?? 0;
          const actualCalls = data.actualData?.totalActualCalls ?? 0;
          const newClientsPlanned = data.plannedData?.breakdown?.newClientCalls ?? 0;
          const oldClientsPlanned = data.plannedData?.breakdown?.oldClientCalls ?? 0;
          const newClientsActual = data.actualData?.breakdown?.newClientCalls ?? 0;
          const oldClientsActual = data.actualData?.breakdown?.oldClientCalls ?? 0;
          const varianceCalls = actualCalls - plannedCalls;
          const variancePercent = plannedCalls !== 0
            ? (varianceCalls / plannedCalls) * 100 : 0;

          employees.push({
            empName, company,
            plannedCalls, actualCalls, varianceCalls, variancePercent,
            newClientsPlanned, newClientsActual,
            oldClientsPlanned, oldClientsActual,
          });

          // Accumulate flat row per employee+month+year
          const key = `${empName}||${monthName}||${year}||${company}`;
          const ex = flatMap.get(key);
          if (ex) {
            ex.plannedCalls += plannedCalls;
            ex.actualCalls += actualCalls;
            ex.newClientsActual += newClientsActual;
            ex.oldClientsActual += oldClientsActual;
            ex.varianceCalls = ex.actualCalls - ex.plannedCalls;
            ex.variancePercent = ex.plannedCalls !== 0
              ? (ex.varianceCalls / ex.plannedCalls) * 100 : 0;
          } else {
            flatMap.set(key, {
              empName, company, month: monthName, year,
              plannedCalls, actualCalls, varianceCalls, variancePercent,
              newClientsActual, oldClientsActual,
            });
          }
        });

        groups.push({
          date: dateStr,
          displayDate: formatDisplayDate(dateStr),
          month: monthName,
          year,
          employees,
          totalPlanned: employees.reduce((s, e) => s + e.plannedCalls, 0),
          totalActual: employees.reduce((s, e) => s + e.actualCalls, 0),
          totalVariance: employees.reduce((s, e) => s + e.varianceCalls, 0),
          totalNewPlanned: employees.reduce((s, e) => s + e.newClientsPlanned, 0),
          totalNewActual: employees.reduce((s, e) => s + e.newClientsActual, 0),
          totalOldPlanned: employees.reduce((s, e) => s + e.oldClientsPlanned, 0),
          totalOldActual: employees.reduce((s, e) => s + e.oldClientsActual, 0),
        });
      });

      setDateGroups(groups);
      setCallsData(Array.from(flatMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch calls data");
      console.error("Calls API error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCalls(); }, []);

  return { callsData, dateGroups, loading, error, refetch: fetchCalls };
}
