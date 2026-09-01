"use client";
import React, { useState, useMemo, Fragment, useEffect } from "react";
import { Search, ChevronDown, ChevronRight, BarChart2, ChevronsUpDown, Download, Printer, UserCheck, Users, TrendingUp, DollarSign, Target, ArrowUpDown, ArrowUp, ArrowDown, BarChart3, TableIcon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface AgentRow {
  name: string; date: string; campaign: string;
  dialerLoginTime: string; dialerLogoutTime: string; dialerWorkTime: string;
  dialerCallsDone: number; dialerPausePct: number; dialerWaitPct: number;
  asFutureFU: number; asAssignedDone: number; asDayLimit: number;
  asLoggedIn: boolean; asLoginTime: string; asLogoutTime: string;
  asFreshCalls: number; asFUCalls: number; asTotalCalls: number;
  asUploadCount: number; asTalkTime: string; asAHT: number;
  totalCallsDone: number;
  nbdPending: number; crrPending: number; bufferPending: number;
  freshPending: number; fuPending: number; totalPending: number;
  convQtyOrder: number; convAmtOrder: number; convQtyInvoice: number; convAmtInvoice: number; conversionPct: number;
  dataSourceUrl: string;
}

const DATA: AgentRow[] = [];

function groupByDate(rows: AgentRow[]) { return rows.reduce((a, r) => { (a[r.date] = a[r.date] || []).push(r); return a; }, {} as Record<string, AgentRow[]>); }
function parseTime(t: string): number { if (!t || t === "—" || t === "0:00:00") return 0; const p = t.split(":").map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + (p[1] || 0); }
function fmtTime(s: number): string { if (!s) return "0:00:00"; return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
const ALL_DATES: string[] = [];

function downloadCSV(date: string, agents: AgentRow[]) {
  const headers = [
    "#", "Agent Name", "Company", "Dialer Login", "Dialer Logout", "Dialer Work Time",
    "Dialer Calls Done", "Pause %", "Wait %", "Today Login", "AS Login Time", "AS Logout Time",
    "Fresh Calls", "FU Calls", "AS Total Calls", "Upload Count", "Total Talk Time", "AHT",
    "Future FU", "Assigned Done", "Day Limit", "Total Calls (D+AS)",
    "NBD Pending", "CRR Pending", "Buffer Pending", "Fresh Pending", "FU Pending", "Total Pending",
    "Order Qty", "Order Amt", "Invoice Qty", "Invoice Amt", "Conv %"
  ];
  const rowsData = agents.map((r, i) => [
    i + 1, r.name, r.campaign.includes("KAPPL") ? "KAPPL" : "KTAHV",
    r.dialerLoginTime, r.dialerLogoutTime, r.dialerWorkTime,
    r.dialerCallsDone, r.dialerPausePct, r.dialerWaitPct,
    r.asLoggedIn ? "YES" : "NO", r.asLoginTime, r.asLogoutTime,
    r.asFreshCalls, r.asFUCalls, r.asTotalCalls, r.asUploadCount, r.asTalkTime, r.asAHT,
    r.asFutureFU, r.asAssignedDone, r.asDayLimit, r.totalCallsDone,
    r.nbdPending, r.crrPending, r.bufferPending, r.freshPending, r.fuPending, r.totalPending,
    r.convQtyOrder, r.convAmtOrder, r.convQtyInvoice, r.convAmtInvoice, r.conversionPct
  ]);
  const csv = [headers, ...rowsData]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales_report_${date.replace(/\//g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printDateReport(date: string, agents: AgentRow[]) {
  const trs = agents.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
      <td>${i + 1}</td><td>${r.name}</td>
      <td>${r.campaign.includes("KAPPL") ? "KAPPL" : "KTAHV"}</td>
      <td>${r.dialerLoginTime}</td><td>${r.dialerCallsDone}</td>
      <td>${r.dialerPausePct}%</td><td>${r.asLoggedIn ? "YES" : "NO"}</td>
      <td>${r.asFreshCalls}</td><td>${r.asFUCalls}</td><td>${r.asTotalCalls}</td>
      <td>${r.asTalkTime}</td><td>${r.totalCallsDone}</td><td>${r.totalPending}</td>
      <td>${r.convQtyOrder > 0 ? r.convQtyOrder : "—"}</td>
      <td>${r.convAmtOrder > 0 ? "₹" + r.convAmtOrder.toLocaleString("en-IN") : "—"}</td>
      <td>${r.conversionPct > 0 ? r.conversionPct + "%" : "—"}</td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html><head><title>Sales Report – ${date}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:20px}
    h2{color:#1e40af;margin-bottom:4px}p{color:#64748b;margin-bottom:12px}
    table{border-collapse:collapse;width:100%}
    th{background:#1e3a5f;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
    @media print{body{padding:0}}
  </style></head><body>
  <h2>Sales Calling Hub – Daily Report</h2>
  <p>Date: <strong>${date}</strong> | Total Agents: <strong>${agents.length}</strong></p>
  <table><thead><tr>
    <th>#</th><th>Agent</th><th>Co.</th><th>Dialer Login</th><th>Dialer Calls</th>
    <th>Pause%</th><th>Logged In</th><th>Fresh</th><th>FU</th><th>AS Total</th>
    <th>Talk Time</th><th>Total Calls</th><th>Total Pending</th>
    <th>Order Qty</th><th>Order Amt</th><th>Conv%</th>
  </tr></thead><tbody>${trs}</tbody></table>
  <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>
  </body></html>`;
  const win = window.open("", "_blank", "width=1100,height=700");
  if (win) { win.document.write(html); win.document.close(); }
}


// ── border classes — only group boundaries, no within-group borders ──────────
const GB: Record<string, string> = {
  id: "border-r border-slate-200",
  d: "",
  dE: "border-r border-slate-200",
  a: "",
  aE: "border-r border-slate-200",
  c: "",
  cE: "border-r border-slate-200",
  t: "border-r border-slate-200",
  p: "",
  pE: "border-r border-slate-200",
  gS: "border-l border-slate-200",
  g: "",
  gE: "border-r border-slate-200",
  src: ""
};

// ── GH: bold group heading with gradient + bottom accent border ──────────────
function GH({ label, cols, bg, color = "#ffffff" }: { label: string; cols: number; bg: string; color?: string }) {
  return (
    <th colSpan={cols}
      style={{ backgroundColor: bg, color }}
      className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/20 border-b border-white/10">
      {label}
    </th>
  );
}

// ── SH: column sub-heading ───────────────────────────────────────────────────
function SH({ children, bg = "#1e3a5f", w = "w-[100px]", bdr = "border-r border-white/10", align = "text-center", sortKey, currentSort, onSort, rowSpan }: { children: React.ReactNode; bg?: string; w?: string; bdr?: string; align?: string; sortKey?: string; currentSort?: { field: string; direction: "asc" | "desc" }; onSort?: (key: string) => void, rowSpan?: number }) {
  const isSorted = currentSort?.field === sortKey;
  return (
    <th style={{ backgroundColor: bg }}
      rowSpan={rowSpan}
      onClick={() => sortKey && onSort && onSort(sortKey)}
      className={`${w} px-4 py-3 ${align} text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight ${bdr} align-bottom ${sortKey ? "cursor-pointer hover:bg-opacity-80 transition-colors" : ""}`}>
      <div className={`flex flex-col ${align === 'text-left' ? 'items-start' : 'items-center'} gap-1`}>
        <span>{children}</span>
        {sortKey ? (
          <div className="flex items-center gap-0.5">
            {isSorted ? (
              currentSort?.direction === "asc" ? <ArrowUp size={10} className="text-yellow-400" /> : <ArrowDown size={10} className="text-yellow-400" />
            ) : (
              <ChevronsUpDown size={8} className="opacity-40" />
            )}
          </div>
        ) : (
          <ChevronsUpDown size={8} className="opacity-40" />
        )}
      </div>
    </th>
  );
}

// ── TD: data cell ─────────────────────────────────────────────────────────────
// pass totalCol=true for the TOTAL column → indigo bg + white bold text
function TD({ children, b = "", totalCol = false, className = "" }: { children: React.ReactNode; b?: string; totalCol?: boolean; className?: string }) {
  return (
    <td
      className={`px-4 py-3 text-center text-sm text-slate-900 border-b border-slate-200 ${GB[b] || ""} ${totalCol ? "font-bold" : ""} ${className}`}>
      {children}
    </td>
  );
}

function FSel({ label, value, onChange, opts, placeholder = "Select..." }: { label: string; value: string; onChange: (v: string) => void; opts: { v: string; l: string }[]; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <Select value={value || "ALL"} onValueChange={(val) => onChange(val === "ALL" ? "" : val)}>
        <SelectTrigger className="h-10 w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {opts.map(o => <SelectItem key={o.v} value={o.v || "ALL"}>{o.l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function dtot(a: AgentRow[]) {
  const avg = (arr: number[]) => { const f = arr.filter(n => n > 0); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0; };
  return {
    dialerCalls: a.reduce((s, r) => s + r.dialerCallsDone, 0), pauseAvg: avg(a.map(r => r.dialerPausePct)),
    waitAvg: avg(a.map(r => r.dialerWaitPct)), active: a.filter(r => r.asLoggedIn).length,
    fresh: a.reduce((s, r) => s + r.asFreshCalls, 0), fu: a.reduce((s, r) => s + r.asFUCalls, 0),
    asTotal: a.reduce((s, r) => s + r.asTotalCalls, 0), upload: a.reduce((s, r) => s + r.asUploadCount, 0),
    talkSec: a.reduce((s, r) => s + parseTime(r.asTalkTime), 0), futureFU: a.reduce((s, r) => s + r.asFutureFU, 0),
    assigned: a.reduce((s, r) => s + r.asAssignedDone, 0), dayLimitAvg: Math.round(a.reduce((s, r) => s + r.asDayLimit, 0) / a.length),
    combined: a.reduce((s, r) => s + r.totalCallsDone, 0), nbd: a.reduce((s, r) => s + r.nbdPending, 0),
    crr: a.reduce((s, r) => s + r.crrPending, 0), buf: a.reduce((s, r) => s + r.bufferPending, 0),
    freshP: a.reduce((s, r) => s + r.freshPending, 0), fuP: a.reduce((s, r) => s + r.fuPending, 0),
    totalP: a.reduce((s, r) => s + r.totalPending, 0), ordQty: a.reduce((s, r) => s + r.convQtyOrder, 0),
    ordAmt: a.reduce((s, r) => s + r.convAmtOrder, 0), invQty: a.reduce((s, r) => s + r.convQtyInvoice, 0),
    invAmt: a.reduce((s, r) => s + r.convAmtInvoice, 0), convAvg: avg(a.map(r => r.conversionPct)),
  };
}

export default function App() {
  const [agentData, setAgentData] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [name, setName] = useState(""); const [dateRange, setDateRange] = useState("THIS_WEEK");
  const [customFrom, setCustomFrom] = useState(""); const [customTo, setCustomTo] = useState("");
  const [comp, setComp] = useState(""); const [login, setLogin] = useState("ALL");
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: "asc" | "desc" }>({ field: "", direction: "asc" });

  // Initialize expanded state when agentData is loaded
  useEffect(() => {
    if (agentData.length > 0) {
      setExpanded(prev => {
        const next = { ...prev };
        agentData.forEach(r => {
          if (next[r.date] === undefined) {
            next[r.date] = true;
          }
        });
        return next;
      });
    }
  }, [agentData]);

  // Fetch live API data on component mount
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/sales-calling");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const rawJson = await res.json();
        const list = rawJson && Array.isArray(rawJson.data) ? rawJson.data : (Array.isArray(rawJson) ? rawJson : []);

        const parseNum = (val: any): number => {
          if (val === null || val === undefined || val === "") return 0;
          const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
          return isNaN(parsed) ? 0 : parsed;
        };

        const parseApiDateToDMY = (dateStr: any): string => {
          if (!dateStr) return "—";
          const cleanStr = String(dateStr).trim().split(" ")[0];

          let day = 0, month = 0, year = 0;
          if (cleanStr.includes("/")) {
            const parts = cleanStr.split("/");
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                day = +parts[0];
                month = +parts[1];
                year = +parts[2];
              } else if (parts[0].length === 4) {
                year = +parts[0];
                month = +parts[1];
                day = +parts[2];
              }
            }
          } else if (cleanStr.includes("-")) {
            const parts = cleanStr.split("-");
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                year = +parts[0];
                month = +parts[1];
                day = +parts[2];
              } else if (parts[2].length === 4) {
                day = +parts[0];
                month = +parts[1];
                year = +parts[2];
              }
            }
          }

          if (day > 0 && month > 0 && year > 0) {
            return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
          }

          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          }

          return cleanStr || "—";
        };

        const mapped: AgentRow[] = list.map((item: any) => {
          const itemDate = parseApiDateToDMY(item["Date"]);
          const rawCampaign = item["Dialer - Last Loggedin Campaign"] || "";

          return {
            name: item["Name"] || "—",
            date: itemDate,
            campaign: rawCampaign || "—",
            dialerLoginTime: item["Dialer - Login Time"] || "—",
            dialerLogoutTime: item["Dialer - Logout Time"] || "—",
            dialerWorkTime: item["Dialer - Total Work Time"] || "—",
            dialerCallsDone: parseNum(item["Dialer - Total Calls Done"]),
            dialerPausePct: parseNum(item["Actual Pause %"]),
            dialerWaitPct: parseNum(item["Actual Wait %"]),
            asFutureFU: parseNum(item["Appsheet - Total Future Follow Up"]),
            asAssignedDone: parseNum(item["Appsheet - Total Assigned Done"]),
            asDayLimit: parseNum(item["Appsheet - Per Day Assign Limit"]),
            asLoggedIn: String(item["Appsheet - Today Login"]).toUpperCase() === "YES",
            asLoginTime: item["Appsheet - Login time"] || "—",
            asLogoutTime: item["Appsheet - Logout Time"] || "—",
            asFreshCalls: parseNum(item["Appsheet - Calls Done (Fresh)"]),
            asFUCalls: parseNum(item["Appsheet - Calls Done (Follow Up)"]),
            asTotalCalls: parseNum(item["Appsheet - Total Calls Done"]),
            asUploadCount: parseNum(item["Appsheet - Call Upload Count"]),
            asTalkTime: item["Appsheet - Total Talk Time"] || "0:00:00",
            asAHT: parseTime(item["Appsheet - Average Handling Time"] || "00:00:00"),
            totalCallsDone: parseNum(item["Total Calls Done (Dialer+Appsheet)"]),
            nbdPending: parseNum(item["NBD - Dialer - Pending Hooper Calls (Till Today)"]),
            crrPending: parseNum(item["CRR - Dialer - Pending Hooper Calls (Till Today)"]),
            bufferPending: parseNum(item["Pending Transfer to User or Dialer (Pending in Buffer)"]),
            freshPending: parseNum(item["Appsheet - Fresh Calls Pending (Till Today)"]),
            fuPending: parseNum(item["Appsheet - Followup Calls Pending(Till Today)"]),
            totalPending: parseNum(item["Appsheet - Total Calls Pending (Till Today)"]),
            convQtyOrder: parseNum(item["Coversion Quantity - Order Placed"]),
            convAmtOrder: parseNum(item["Coversion Amount - Order Placed"]),
            convQtyInvoice: parseNum(item["Coversion Quantity - Invoice Generated"]),
            convAmtInvoice: parseNum(item["Coversion Amount - Invoice Generated"]),
            conversionPct: parseNum(item["Conversion %"]),
            dataSourceUrl: item["Data Source - Link"] || "#"
          };
        });

        if (active) {
          setAgentData(mapped);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        if (active) {
          setError(err.message || "Failed to fetch calling report data.");
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const clear = () => {
    setName(""); setDateRange("ALL"); setCustomFrom(""); setCustomTo(""); setComp(""); setLogin("ALL");
    setSortConfig({ field: "", direction: "asc" });
  };

  const handleSort = (field: string) => {
    if (sortConfig.field === field) {
      if (sortConfig.direction === "asc") {
        setSortConfig({ field, direction: "desc" });
      } else {
        setSortConfig({ field: "", direction: "asc" });
      }
    } else {
      setSortConfig({ field, direction: "asc" });
    }
  };

  // Parse dd/MM/yyyy date string to Date object
  const parseDMY = (s: string): Date | null => {
    const p = s.split("/");
    if (p.length !== 3) return null;
    return new Date(+p[2], +p[1] - 1, +p[0]);
  };

  // Get date range boundaries based on preset
  const getDateBounds = (): { from: Date | null; to: Date | null } => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const dayOfWeek = today.getDay(); // 0=Sun
    const thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - dayOfWeek);
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart); lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const thisYearStart = new Date(today.getFullYear(), 0, 1);
    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);

    switch (dateRange) {
      case "TODAY": return { from: today, to: today };
      case "YESTERDAY": return { from: yesterday, to: yesterday };
      case "THIS_WEEK": return { from: thisWeekStart, to: today };
      case "LAST_WEEK": return { from: lastWeekStart, to: lastWeekEnd };
      case "THIS_MONTH": return { from: thisMonthStart, to: today };
      case "LAST_MONTH": return { from: lastMonthStart, to: lastMonthEnd };
      case "THIS_YEAR": return { from: thisYearStart, to: today };
      case "LAST_YEAR": return { from: lastYearStart, to: lastYearEnd };
      case "CUSTOM": return {
        from: customFrom ? (() => { const d = new Date(customFrom); d.setHours(0, 0, 0, 0); return d; })() : null,
        to: customTo ? (() => { const d = new Date(customTo); d.setHours(0, 0, 0, 0); return d; })() : null,
      };
      default: return { from: null, to: null };
    }
  };

  const rows = useMemo(() => {
    const { from, to } = getDateBounds();
    let filtered = agentData.filter(r => {
      const matchName = !name || r.name.toLowerCase().includes(name.toLowerCase());
      let matchDate = true;
      if (dateRange !== "ALL") {
        const rd = parseDMY(r.date);
        if (!rd) {
          matchDate = false;
        } else {
          if (from && rd < from) matchDate = false;
          if (to && rd > to) matchDate = false;
        }
      }
      let matchComp = true;
      if (comp) {
        if (comp === "KAPPL") {
          matchComp = r.campaign.includes("KAPPL");
        } else if (comp === "KTAHV") {
          // Anything that doesn't contain KAPPL defaults to KTAHV in the UI
          matchComp = !r.campaign.includes("KAPPL");
        } else {
          matchComp = r.campaign.includes(comp);
        }
      }

      // Let's check login logic: 
      // If login is "ALL", matches everything.
      // If login is "YES", matches if r.asLoggedIn is true.
      // If login is "NO", matches if r.asLoggedIn is false.
      const matchLogin = login === "ALL" || (login === "YES" ? r.asLoggedIn : !r.asLoggedIn);

      const isMatch = matchName && matchDate && matchComp && matchLogin;
      return isMatch;
    });

    if (sortConfig.field) {
      filtered.sort((a, b) => {
        let aVal: any = a[sortConfig.field as keyof AgentRow];
        let bVal: any = b[sortConfig.field as keyof AgentRow];

        // Custom logic for special columns
        if (sortConfig.field === "campaign") {
          aVal = a.campaign.includes("KAPPL") ? "KAPPL" : "KTAHV";
          bVal = b.campaign.includes("KAPPL") ? "KAPPL" : "KTAHV";
        } else if (["dialerWorkTime", "asTalkTime", "dialerLoginTime", "dialerLogoutTime", "asLoginTime", "asLogoutTime"].includes(sortConfig.field)) {
          aVal = parseTime(String(aVal));
          bVal = parseTime(String(bVal));
        }

        // Handle null/empty
        if (aVal === "—" || aVal === null || aVal === undefined) aVal = typeof bVal === "number" ? -1 : "";
        if (bVal === "—" || bVal === null || bVal === undefined) bVal = typeof aVal === "number" ? -1 : "";

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, dateRange, customFrom, customTo, comp, login, sortConfig]);

  const grouped = groupByDate(rows);
  const GT = dtot(rows);
  const total = rows.length;
  const kappl = rows.filter(r => r.campaign.includes("KAPPL")).length;
  const ktahv = total - kappl;
  const dialerKA = rows.filter(r => r.campaign.includes("KAPPL")).reduce((s, r) => s + r.dialerCallsDone, 0);
  const dialerK = rows.reduce((s, r) => s + r.dialerCallsDone, 0) - dialerKA;
  const p = (n: number, d: number) => d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "0%";
  const inr = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—";

  // grand total cell style
  const GTC = "px-4 py-3 text-center text-sm font-bold text-white border-r border-white/10";
  const GTCT = "px-4 py-3 text-center text-sm font-bold text-white border-r border-white/10"; // total col

  return (
    <div className="space-y-6">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-10 mb-6">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
          >
            ← Back
          </button>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left Section - Title */}
            <div className="space-y-3 w-full">
              <div className="flex items-start sm:items-center gap-4">
                {/* Icon Container */}
                <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                    Sales Calling Hub
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                    Monitor agent performance and calling activities
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section - KPI Card */}
            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
              <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                  Total Agents
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                  {total}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                Filters & Search
              </h3>
              <p className="text-xs text-slate-500">
                Refine and locate agents efficiently
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
          >
            Clear Filters
          </Button>
        </div>

        <div className="px-4 sm:px-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5 lg:col-span-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Search Leads
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name, email, phone, Id, subject..."
                  className="h-10 w-full pl-9 pr-3 text-sm border-gray-300"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-10 w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Dates</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                  <SelectItem value="THIS_WEEK">This Week</SelectItem>
                  <SelectItem value="LAST_WEEK">Last Week</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="THIS_YEAR">This Year</SelectItem>
                  <SelectItem value="LAST_YEAR">Last Year</SelectItem>
                  <SelectItem value="CUSTOM">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FSel label="Company" value={comp} onChange={setComp} opts={[{ v: "", l: "All" }, { v: "KTAHV", l: "KTAHV" }, { v: "KAPPL", l: "KAPPL" }, { v: "VILLA RAAG", l: "VILLA RAAG" }]} />
            <FSel label="Lead Source" value="ALL" onChange={() => { }} opts={[{ v: "ALL", l: "All" }]} />
            <FSel label="Intent" value="ALL" onChange={() => { }} opts={[{ v: "ALL", l: "All" }]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            <FSel label="Urgency" value="ALL" onChange={() => { }} opts={[{ v: "ALL", l: "All" }]} />
            <FSel label="Assigned To" value={login} onChange={setLogin} opts={[{ v: "ALL", l: "All" }, { v: "YES", l: "Logged In" }, { v: "NO", l: "Not Logged In" }]} />
          </div>

          {dateRange === "CUSTOM" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="h-10 w-full border-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="h-10 w-full border-gray-300"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ── KPI ── */}
      <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
              <BarChart2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                Key Performance Indicators
              </h3>
              <p className="text-[11px] text-slate-500">
                Overview of agent metrics & performance
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Agent Distribution
              </h4>
              {/* <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-1 rounded-full">
                ✓ All data loaded
              </span> */}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { bc: "border-blue-300", tc: "text-blue-700", label: "TOTAL AGENTS", val: total, s1: <><span className="text-green-700">KTAHV: {ktahv}</span> <span className="text-slate-400">({p(ktahv, total)})</span></>, s2: <><span className="text-purple-700">KAPPL: {kappl}</span> <span className="text-slate-400">({p(kappl, total)})</span></> },
                { bc: "border-slate-300", tc: "text-slate-700", label: "DIALER CALLS DONE", val: GT.dialerCalls, s1: <><span className="text-green-700">KTAHV: {dialerK}</span> <span className="text-slate-400">({p(dialerK, GT.dialerCalls)})</span></>, s2: <><span className="text-purple-700">KAPPL: {dialerKA}</span> <span className="text-slate-400">({p(dialerKA, GT.dialerCalls)})</span></> },
                { bc: "border-emerald-300", tc: "text-emerald-700", label: "APPSHEET CALLS DONE", val: GT.asTotal, s1: <><span className="text-green-700">Fresh: {GT.fresh}</span> <span className="text-slate-400">({p(GT.fresh, GT.asTotal)})</span></>, s2: <><span className="text-blue-700">Follow Up: {GT.fu}</span> <span className="text-slate-400">({p(GT.fu, GT.asTotal)})</span></> },
                { bc: "border-cyan-300", tc: "text-cyan-700", label: "COMBINED TOTAL CALLS", val: GT.combined, s1: <><span className="text-green-700">Logged In: {GT.active}</span> <span className="text-slate-400">({p(GT.active, total)})</span></>, s2: <><span className="text-slate-500">Inactive: {total - GT.active}</span> <span className="text-slate-400">({p(total - GT.active, total)})</span></> },
                { bc: "border-red-300", tc: "text-red-700", label: "TOTAL PENDING LEADS", val: GT.totalP, s1: <><span className="text-orange-700">Fresh: {GT.freshP}</span> <span className="text-slate-400">({p(GT.freshP, GT.totalP)})</span></>, s2: <><span className="text-red-600">FU: {GT.fuP}</span> <span className="text-slate-400">({p(GT.fuP, GT.totalP)})</span></> },
                { bc: "border-orange-300", tc: "text-orange-700", label: "INVOICE GENERATED", val: GT.invQty, icon: <UserCheck size={11} className="text-orange-600" />, s1: <span className="text-green-700">Orders: {inr(GT.ordAmt)}</span>, s2: <span className="text-emerald-700">Invoice: {inr(GT.invAmt)}</span> },
              ].map((k, i) => (
                <div key={i} className={`bg-white border-2 ${k.bc} rounded-lg p-3 shadow-sm hover:shadow-md transition`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${k.tc} mb-2 leading-tight flex items-center justify-between`}>{k.label}{k.icon && k.icon}</p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">{k.val}</p>
                  <p className="text-[10px] font-semibold">{k.s1}</p>
                  <p className="text-[10px] font-semibold mt-0.5">{k.s2}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Data Source Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Overview of agent performance by data source – All Companies
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-700 shadow border border-blue-200 transition-all">
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700/80 hover:bg-white/50 hover:text-blue-800 transition-all">
              <BarChart3 className="w-3.5 h-3.5" /> Charts
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="border-collapse" style={{ width: "3200px", fontSize: "14px", tableLayout: "fixed" }}>
            <thead>
              {/* ── GROUP HEADERS ROW ── */}
              <tr>
                <SH bg="#1e3a5f" w="w-[50px]" rowSpan={2}>#</SH>
                <SH bg="#1e3a5f" w="w-[200px]" align="text-left" sortKey="name" currentSort={sortConfig} onSort={handleSort} rowSpan={2}>AGENT NAME</SH>
                <SH bg="#1e3a5f" w="w-[120px]" sortKey="campaign" currentSort={sortConfig} onSort={handleSort} rowSpan={2}>COMPANY</SH>
                <GH label="DIALER" cols={6} bg="#1e3a8a" />
                <GH label="APPSHEET ACTIVITY" cols={9} bg="#0c4a6e" />
                <GH label="APPSHEET CONFIG" cols={3} bg="#374151" />
                <GH label="TOTAL" cols={1} bg="#1e3a5f" />
                <GH label="PENDING (TILL TODAY)" cols={6} bg="#7f1d1d" />
                <GH label="CONVERSION" cols={5} bg="#14532d" />
                <GH label="SOURCE" cols={1} bg="#374151" />
              </tr>
              {/* ── COLUMN NAMES ROW ── */}
              <tr style={{ backgroundColor: '#1e3a5f' }}>
                {/* DIALER */}
                <SH bg="#1e3a8a" w="w-[110px]" sortKey="dialerLoginTime" currentSort={sortConfig} onSort={handleSort}>DIALER LOGIN TIME</SH>
                <SH bg="#1e3a8a" w="w-[115px]" sortKey="dialerLogoutTime" currentSort={sortConfig} onSort={handleSort}>DIALER LOGOUT TIME</SH>
                <SH bg="#1e3a8a" w="w-[110px]" sortKey="dialerWorkTime" currentSort={sortConfig} onSort={handleSort}>DIALER WORK TIME</SH>
                <SH bg="#1e3a8a" w="w-[100px]" sortKey="dialerCallsDone" currentSort={sortConfig} onSort={handleSort}>DIALER CALLS DONE</SH>
                <SH bg="#1e3a8a" w="w-[100px]" sortKey="dialerPausePct" currentSort={sortConfig} onSort={handleSort}>ACTUAL PAUSE %</SH>
                <SH bg="#1e3a8a" w="w-[100px]" sortKey="dialerWaitPct" currentSort={sortConfig} onSort={handleSort}>ACTUAL WAIT %</SH>
                {/* APPSHEET */}
                <SH bg="#0c4a6e" w="w-[85px]" sortKey="asLoggedIn" currentSort={sortConfig} onSort={handleSort}>TODAY LOGIN</SH>
                <SH bg="#0c4a6e" w="w-[100px]" sortKey="asLoginTime" currentSort={sortConfig} onSort={handleSort}>LOGIN TIME</SH>
                <SH bg="#0c4a6e" w="w-[105px]" sortKey="asLogoutTime" currentSort={sortConfig} onSort={handleSort}>LOGOUT TIME</SH>
                <SH bg="#0c4a6e" w="w-[105px]" sortKey="asFreshCalls" currentSort={sortConfig} onSort={handleSort}>CALLS DONE (FRESH)</SH>
                <SH bg="#0c4a6e" w="w-[95px]" sortKey="asFUCalls" currentSort={sortConfig} onSort={handleSort}>CALLS DONE (FU)</SH>
                <SH bg="#0c4a6e" w="w-[90px]" sortKey="asTotalCalls" currentSort={sortConfig} onSort={handleSort}>AS TOTAL CALLS</SH>
                <SH bg="#0c4a6e" w="w-[90px]" sortKey="asUploadCount" currentSort={sortConfig} onSort={handleSort}>UPLOAD COUNT</SH>
                <SH bg="#0c4a6e" w="w-[110px]" sortKey="asTalkTime" currentSort={sortConfig} onSort={handleSort}>TOTAL TALK TIME</SH>
                <SH bg="#0c4a6e" w="w-[110px]" sortKey="asAHT" currentSort={sortConfig} onSort={handleSort}>AVG HANDLING TIME</SH>
                {/* CONFIG */}
                <SH bg="#374151" w="w-[100px]" sortKey="asFutureFU" currentSort={sortConfig} onSort={handleSort}>FUTURE FOLLOW UP</SH>
                <SH bg="#374151" w="w-[100px]" sortKey="asAssignedDone" currentSort={sortConfig} onSort={handleSort}>ASSIGNED DONE</SH>
                <SH bg="#374151" w="w-[90px]" sortKey="asDayLimit" currentSort={sortConfig} onSort={handleSort}>DAY LIMIT</SH>
                {/* TOTAL */}
                <SH bg="#1e3a5f" w="w-[100px]" sortKey="totalCallsDone" currentSort={sortConfig} onSort={handleSort}>TOTAL CALLS (D+AS)</SH>
                {/* PENDING */}
                <SH bg="#7f1d1d" w="w-[110px]" sortKey="nbdPending" currentSort={sortConfig} onSort={handleSort}>NBD DIALER PENDING</SH>
                <SH bg="#7f1d1d" w="w-[110px]" sortKey="crrPending" currentSort={sortConfig} onSort={handleSort}>CRR DIALER PENDING</SH>
                <SH bg="#7f1d1d" w="w-[95px]" sortKey="bufferPending" currentSort={sortConfig} onSort={handleSort}>BUFFER PENDING</SH>
                <SH bg="#7f1d1d" w="w-[110px]" sortKey="freshPending" currentSort={sortConfig} onSort={handleSort}>FRESH CALLS PENDING</SH>
                <SH bg="#7f1d1d" w="w-[95px]" sortKey="fuPending" currentSort={sortConfig} onSort={handleSort}>FU CALLS PENDING</SH>
                <SH bg="#7f1d1d" w="w-[100px]" sortKey="totalPending" currentSort={sortConfig} onSort={handleSort}>TOTAL PENDING</SH>
                {/* CONVERSION — left-border accent on first col */}
                <SH bg="#14532d" w="w-[90px]" sortKey="convQtyOrder" currentSort={sortConfig} onSort={handleSort}>ORDER QTY</SH>
                <SH bg="#14532d" w="w-[120px]" sortKey="convAmtOrder" currentSort={sortConfig} onSort={handleSort}>ORDER AMOUNT</SH>
                <SH bg="#14532d" w="w-[90px]" sortKey="convQtyInvoice" currentSort={sortConfig} onSort={handleSort}>INVOICE QTY</SH>
                <SH bg="#14532d" w="w-[120px]" sortKey="convAmtInvoice" currentSort={sortConfig} onSort={handleSort}>INVOICE AMOUNT</SH>
                <SH bg="#14532d" w="w-[85px]" sortKey="conversionPct" currentSort={sortConfig} onSort={handleSort}>CONV %</SH>
                <SH bg="#374151" w="w-[60px]" bdr="">SOURCE</SH>
              </tr>
            </thead>

            <tbody>
              {Object.entries(grouped).map(([d, agents]) => {
                const isOpen = expanded[d] !== false;
                const T = dtot(agents);
                return (
                  <React.Fragment key={d}>
                    {/* ── DATE SUMMARY ROW ── */}
                    <tr onClick={() => setExpanded(p => ({ ...p, [d]: !p[d] }))} className="cursor-pointer bg-blue-50/50 hover:bg-blue-100 transition-colors border-b border-blue-200">
                      <td className="px-2 py-2 text-center border-r border-blue-200">
                        <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto">{isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}</div>
                      </td>
                      <td className="px-2 py-2 text-left border-r border-blue-200" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{d}</span>
                          <div className="relative group/dl">
                            <button onClick={e => { e.stopPropagation(); downloadCSV(d, agents); }} className="flex items-center justify-center w-6 h-6 rounded bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-sm transition-all duration-150 hover:scale-110">
                              <Download size={11} />
                            </button>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded whitespace-nowrap opacity-0 group-hover/dl:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                              Download Data
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                            </div>
                          </div>
                          <div className="relative group/pr">
                            <button onClick={e => { e.stopPropagation(); printDateReport(d, agents); }} className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-sm transition-all duration-150 hover:scale-110">
                              <Printer size={11} />
                            </button>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-slate-800 text-white text-[9px] font-medium rounded whitespace-nowrap opacity-0 group-hover/pr:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-lg">
                              Print Report
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <TD b="d" className="text-slate-400">—</TD><TD b="d" className="text-slate-400">—</TD><TD b="d" className="text-slate-400">—</TD>
                      <TD b="d" className="font-bold text-blue-700">{T.dialerCalls}</TD>
                      <TD b="d" className={T.pauseAvg > 10 ? "text-red-500 font-bold" : "text-slate-500"}>{T.pauseAvg > 0 ? `${T.pauseAvg.toFixed(2)}%` : "0%"}</TD>
                      <TD b="dE" className={T.waitAvg > 50 ? "text-orange-500 font-semibold" : "text-slate-500"}>{T.waitAvg > 0 ? `${T.waitAvg.toFixed(2)}%` : "0%"}</TD>
                      <TD b="a" className="font-semibold text-green-600">{T.active}/{agents.length}</TD>
                      <TD b="a" className="text-slate-400">—</TD><TD b="a" className="text-slate-400">—</TD>
                      <TD b="a" className="font-semibold text-green-600">{T.fresh}</TD>
                      <TD b="a" className="font-semibold text-blue-600">{T.fu}</TD>
                      <TD b="a" className="font-bold text-slate-700">{T.asTotal}</TD>
                      <TD b="a" className="text-slate-500">{T.upload}</TD>
                      <TD b="a" className="text-indigo-600 font-semibold">{fmtTime(T.talkSec)}</TD>
                      <TD b="aE" className="text-slate-400">—</TD>
                      <TD b="c" className="text-slate-500">{T.futureFU}</TD>
                      <TD b="c" className="text-slate-500">{T.assigned}</TD>
                      <TD b="cE" className="text-slate-400">~{T.dayLimitAvg}</TD>
                      {/* TOTAL col — no special bg */}
                      <TD b="t" totalCol className="text-slate-800 font-black">{T.combined}</TD>
                      <TD b="p" className="font-bold text-red-500">{T.nbd}</TD>
                      <TD b="p" className="font-bold text-red-500">{T.crr}</TD>
                      <TD b="p" className="text-orange-500">{T.buf}</TD>
                      <TD b="p" className="text-orange-500">{T.freshP}</TD>
                      <TD b="p" className="text-orange-500">{T.fuP}</TD>
                      <TD b="pE" className="font-bold text-red-600">{T.totalP}</TD>
                      {/* SALE group — left thick border on first col */}
                      <TD b="gS" className="text-green-600">{T.ordQty > 0 ? T.ordQty : "—"}</TD>
                      <TD b="g" className="text-slate-700">{T.ordAmt > 0 ? `₹${T.ordAmt.toLocaleString("en-IN")}` : "—"}</TD>
                      <TD b="g" className="text-emerald-600">{T.invQty > 0 ? T.invQty : "—"}</TD>
                      <TD b="g" className="font-bold text-emerald-700">{T.invAmt > 0 ? `₹${T.invAmt.toLocaleString("en-IN")}` : "—"}</TD>
                      <TD b="gE">{T.convAvg > 0 ? <span className="font-bold text-green-600">{T.convAvg.toFixed(2)}%</span> : "—"}</TD>
                      <TD className="text-slate-300">—</TD>
                    </tr>

                    {/* ── AGENT ROWS ── */}
                    {isOpen && agents.map((r, i) => (
                      <tr key={`${d}-${i}`} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${!r.asLoggedIn && r.totalCallsDone === 0 ? "opacity-60" : ""}`}>
                        <TD className="text-slate-400 pl-6">{i + 1}</TD>
                        <td className="px-2 py-1.5 text-left border-b border-slate-100 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.asLoggedIn ? "bg-green-500" : "bg-slate-300"}`} />
                            <span className={`font-medium ${!r.asLoggedIn && r.totalCallsDone === 0 ? "text-slate-400" : "text-slate-800"}`}>{r.name}</span>
                          </div>
                        </td>
                        <td className="px-1.5 py-1.5 text-center border-b border-slate-100 border-r-[3px] border-slate-300">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.campaign.includes("KAPPL") ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {r.campaign.includes("KAPPL") ? "KAPPL" : "KTAHV"}
                          </span>
                        </td>
                        {/* DIALER */}
                        <TD b="d" className="text-slate-600">{r.dialerLoginTime}</TD>
                        <TD b="d" className="text-slate-600">{r.dialerLogoutTime}</TD>
                        <TD b="d" className="font-medium text-slate-700">{r.dialerWorkTime}</TD>
                        <TD b="d" className="font-bold text-blue-700">{r.dialerCallsDone > 0 ? r.dialerCallsDone : <span className="text-slate-300">0</span>}</TD>
                        <TD b="d">{r.dialerPausePct > 0 ? <span className={r.dialerPausePct > 10 ? "text-red-500 font-bold" : "text-slate-600"}>{r.dialerPausePct.toFixed(2)}%</span> : <span className="text-slate-300">0%</span>}</TD>
                        <TD b="dE" className={r.dialerWaitPct > 50 ? "text-orange-500 font-semibold" : "text-slate-600"}>{r.dialerWaitPct > 0 ? `${r.dialerWaitPct.toFixed(2)}%` : <span className="text-slate-300">—</span>}</TD>
                        {/* APPSHEET */}
                        <TD b="a"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.asLoggedIn ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>{r.asLoggedIn ? "YES" : "NO"}</span></TD>
                        <TD b="a" className="text-slate-600">{r.asLoginTime}</TD>
                        <TD b="a" className="text-slate-600">{r.asLogoutTime}</TD>
                        <TD b="a" className="font-semibold text-green-600">{r.asFreshCalls > 0 ? r.asFreshCalls : <span className="text-slate-300">0</span>}</TD>
                        <TD b="a" className="font-semibold text-blue-600">{r.asFUCalls > 0 ? r.asFUCalls : <span className="text-slate-300">0</span>}</TD>
                        <TD b="a" className="font-semibold text-slate-700">{r.asTotalCalls > 0 ? r.asTotalCalls : <span className="text-slate-300">0</span>}</TD>
                        <TD b="a" className="text-slate-500">{r.asUploadCount > 0 ? r.asUploadCount : <span className="text-slate-300">0</span>}</TD>
                        <TD b="a" className={r.asTalkTime !== "0:00:00" ? "font-semibold text-indigo-600" : "text-slate-300"}>{r.asTalkTime}</TD>
                        <TD b="aE" className="text-slate-500">{r.asAHT > 0 ? r.asAHT : <span className="text-slate-300">—</span>}</TD>
                        {/* CONFIG */}
                        <TD b="c" className="text-slate-500">{r.asFutureFU > 0 ? r.asFutureFU : <span className="text-slate-300">0</span>}</TD>
                        <TD b="c" className="text-slate-500">{r.asAssignedDone > 0 ? r.asAssignedDone : <span className="text-slate-300">0</span>}</TD>
                        <TD b="cE" className="text-slate-500">{r.asDayLimit}</TD>
                        {/* TOTAL — no special bg */}
                        <TD b="t" totalCol className="text-slate-800">{r.totalCallsDone > 0 ? r.totalCallsDone : <span className="text-slate-400">0</span>}</TD>
                        {/* PENDING */}
                        <TD b="p" className={r.nbdPending > 100 ? "font-bold text-red-500" : "text-orange-500"}>{r.nbdPending > 0 ? r.nbdPending : <span className="text-slate-300">0</span>}</TD>
                        <TD b="p" className={r.crrPending > 100 ? "font-bold text-red-500" : "text-orange-500"}>{r.crrPending > 0 ? r.crrPending : <span className="text-slate-300">0</span>}</TD>
                        <TD b="p" className={r.bufferPending > 0 ? "font-bold text-orange-600" : "text-slate-300"}>{r.bufferPending > 0 ? r.bufferPending : "0"}</TD>
                        <TD b="p" className="text-orange-500">{r.freshPending > 0 ? r.freshPending : <span className="text-slate-300">0</span>}</TD>
                        <TD b="p" className="text-orange-500">{r.fuPending > 0 ? r.fuPending : <span className="text-slate-300">0</span>}</TD>
                        <TD b="pE"><span className={`font-bold ${r.totalPending > 200 ? "text-red-600" : r.totalPending > 50 ? "text-orange-500" : r.totalPending > 0 ? "text-yellow-600" : "text-slate-300"}`}>{r.totalPending}</span></TD>
                        {/* CONVERSION — thick left border on first col */}
                        <TD b="gS" className="text-green-600">{r.convQtyOrder > 0 ? r.convQtyOrder : <span className="text-slate-300">—</span>}</TD>
                        <TD b="g" className="text-slate-700">{r.convAmtOrder > 0 ? `₹${r.convAmtOrder.toLocaleString("en-IN")}` : <span className="text-slate-300">—</span>}</TD>
                        <TD b="g" className="text-emerald-600">{r.convQtyInvoice > 0 ? r.convQtyInvoice : <span className="text-slate-300">—</span>}</TD>
                        <TD b="g" className="font-semibold text-emerald-700">{r.convAmtInvoice > 0 ? `₹${r.convAmtInvoice.toLocaleString("en-IN")}` : <span className="text-slate-300">—</span>}</TD>
                        <TD b="gE">{r.conversionPct > 0 ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${r.conversionPct >= 10 ? "bg-green-100 text-green-700" : r.conversionPct >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>{r.conversionPct.toFixed(2)}%</span> : <span className="text-slate-300">—</span>}</TD>
                        <TD><a href={r.dataSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-700 text-[9px] underline">VIEW ↗</a></TD>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* ── GRAND TOTAL ── */}
              <tr style={{ backgroundColor: "#111827" }} className="border-t-2 border-slate-600">
                <td colSpan={3} className="px-4 py-3 text-sm font-bold text-white uppercase tracking-wider border-r border-white/10">GRAND TOTAL</td>
                <td colSpan={3} className={GTC + " text-slate-500"}>—</td>
                <td className={GTC + " text-yellow-300"}>{GT.dialerCalls}</td>
                <td className={GTC + " text-slate-400"}>{GT.pauseAvg > 0 ? `${GT.pauseAvg.toFixed(2)}%` : "—"}</td>
                <td className={GTC + " text-slate-400 border-r-[3px] border-blue-400"}>{GT.waitAvg > 0 ? `${GT.waitAvg.toFixed(2)}%` : "—"}</td>
                <td className={GTC + " text-green-400"}>{GT.active}/{rows.length}</td>
                <td colSpan={2} className={GTC + " text-slate-500"}>—</td>
                <td className={GTC + " text-green-400"}>{GT.fresh}</td>
                <td className={GTC + " text-blue-400"}>{GT.fu}</td>
                <td className={GTC + " text-slate-300"}>{GT.asTotal}</td>
                <td className={GTC + " text-slate-300"}>{GT.upload}</td>
                <td className={GTC + " text-indigo-300"}>{fmtTime(GT.talkSec)}</td>
                <td className={GTC + " text-slate-500 border-r-[3px] border-cyan-400"}>—</td>
                <td className={GTC + " text-slate-300"}>{GT.futureFU}</td>
                <td className={GTC + " text-slate-300"}>{GT.assigned}</td>
                <td className={GTC + " text-slate-500 border-r-[3px] border-slate-400"}>—</td>
                {/* TOTAL col grand total */}
                <td className={GTCT + " text-yellow-200"}>{GT.combined}</td>
                <td className={GTC + " text-red-300"}>{GT.nbd}</td>
                <td className={GTC + " text-red-300"}>{GT.crr}</td>
                <td className={GTC + " text-orange-300"}>{GT.buf}</td>
                <td className={GTC + " text-orange-300"}>{GT.freshP}</td>
                <td className={GTC + " text-orange-300"}>{GT.fuP}</td>
                <td className={GTC + " text-red-300 border-r-[3px] border-red-400"}>{GT.totalP}</td>
                {/* SALE group grand total — left thick border */}
                <td className={GTC + " text-green-400 border-l-[3px] border-l-emerald-400"}>{GT.ordQty > 0 ? GT.ordQty : "—"}</td>
                <td className={GTC + " text-slate-300"}>{GT.ordAmt > 0 ? `₹${GT.ordAmt.toLocaleString("en-IN")}` : "—"}</td>
                <td className={GTC + " text-emerald-400"}>{GT.invQty > 0 ? GT.invQty : "—"}</td>
                <td className={GTC + " text-emerald-300"}>{GT.invAmt > 0 ? `₹${GT.invAmt.toLocaleString("en-IN")}` : "—"}</td>
                <td className={GTC + " text-green-400 border-r-[3px] border-emerald-400"}>{GT.convAvg > 0 ? `${GT.convAvg.toFixed(2)}%` : "—"}</td>
                <td className={GTC + " text-slate-500"}>—</td>
              </tr>

              {loading && <tr><td colSpan={34} className="py-16 text-center text-blue-600 font-semibold text-xs">Loading live data from API...</td></tr>}
              {error && <tr><td colSpan={34} className="py-16 text-center text-red-500 font-semibold text-xs">Error loading data: {error}</td></tr>}
              {!loading && !error && rows.length === 0 && <tr><td colSpan={34} className="py-16 text-center text-slate-400 text-xs">No records match current filters</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/30">
          <span>Showing 1-{Object.keys(grouped).length} of {Object.keys(grouped).length} dates</span>
          <div className="flex items-center gap-1">
            {["«", "‹ Prev"].map(l => <button key={l} className="border border-slate-200 rounded px-2.5 py-1 hover:bg-white transition-colors">{l}</button>)}
            <button className="bg-blue-600 text-white rounded px-2.5 py-1">1</button>
            {["Next ›", "»"].map(l => <button key={l} className="border border-slate-200 rounded px-2.5 py-1 hover:bg-white transition-colors">{l}</button>)}
          </div>
          <div className="flex items-center gap-2">
            <span>Rows/page:</span>
            <select className="border border-slate-200 rounded px-2 py-1 text-[11px] bg-white"><option>5</option><option>10</option><option>20</option></select>
            <span>Go to</span>
            <input className="border border-slate-200 rounded px-2 py-1 text-[11px] w-10 text-center" />
            <button className="bg-blue-600 text-white rounded px-3 py-1 text-[11px] font-semibold">Go</button>
          </div>
        </div>
      </div>
    </div>
  );
}
