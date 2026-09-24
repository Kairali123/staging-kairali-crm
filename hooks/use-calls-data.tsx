"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallsReport, CallsRow, CallsDateGroup } from "@/lib/calls-report";

// Types live in lib/calls-report (shared with the API route); re-exported so existing imports keep working.
export type { CallsEmployeeRow, CallsDateGroup, CallsRow, CallsReport } from "@/lib/calls-report";

interface UseCallsDataReturn {
  callsData: CallsRow[];
  dateGroups: CallsDateGroup[];
  /** True only while there is nothing to show yet. Background refreshes do not set it. */
  loading: boolean;
  /** True while a request is in flight, including background refreshes of data already on screen. */
  refreshing: boolean;
  error: string | null;
  /** ISO time the server last pulled the data from its source. */
  fetchedAt: string | null;
  refetch: () => void;
}

type Snapshot = { report: CallsReport; fetchedAt: string };

// Survives client-side navigation: coming back to the page renders immediately from here.
let snapshot: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

// Stable references so memoised filters do not re-run while there is no data.
const EMPTY_ROWS: CallsRow[] = [];
const EMPTY_GROUPS: CallsDateGroup[] = [];

async function requestReport(force: boolean): Promise<Snapshot> {
  if (!force && inflight) return inflight;
  const run = (async () => {
    const res = await fetch(force ? "/api/calls-report?refresh=1" : "/api/calls-report", { credentials: "same-origin" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) throw new Error(json?.error || `Request failed (${res.status})`);
    return { report: json.data as CallsReport, fetchedAt: json.fetchedAt as string };
  })();
  inflight = run;
  try {
    return await run;
  } finally {
    if (inflight === run) inflight = null;
  }
}

export default function useCallsData(): UseCallsDataReturn {
  const [data, setData] = useState<Snapshot | null>(snapshot);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async (force: boolean) => {
    setRefreshing(true);
    setError(null);
    try {
      const next = await requestReport(force);
      snapshot = next;
      if (alive.current) setData(prev => (prev && prev.fetchedAt === next.fetchedAt ? prev : next));
    } catch (err) {
      console.error("Calls API error:", err);
      if (alive.current) setError(err instanceof Error ? err.message : "Failed to fetch calls data");
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load(false);
    return () => { alive.current = false; };
  }, [load]);

  return {
    callsData: data?.report.callsData ?? EMPTY_ROWS,
    dateGroups: data?.report.dateGroups ?? EMPTY_GROUPS,
    loading: !data && refreshing,
    refreshing,
    error,
    fetchedAt: data?.fetchedAt ?? null,
    refetch: () => { load(true); },
  };
}
