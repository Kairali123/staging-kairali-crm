"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
    Search, ChevronDown, ChevronRight,
    ArrowUpDown, ArrowUp, ArrowDown, AlertCircle,
} from "lucide-react";
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// ── Import the two modals ──────────────────────────────────────────────────────
import KServeSentLeadsModal, {
    type KServeSentLeadRow,
    type KServeModalMeta,
} from "@/components/Kservesentleadsmodal";

import KServeRcvdLeadsModal, {
    type KServeRcvdLeadRow,
    type KServeRcvdModalMeta,
} from "@/components/Kservercvdleadsmodal";

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─────────────────────────────────────────────────────────────────────────────
//  Modal state types
// ─────────────────────────────────────────────────────────────────────────────

type ModalStatusType = "SENT" | "RECEIVED" | "QUALIFIED" | "DEAD" | "PENDING";

interface ActiveModalState {
    open: boolean;
    modalType: "sent" | "rcvd" | null;
    sentMeta: KServeModalMeta | null;
    rcvdMeta: KServeRcvdModalMeta | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

interface SourceDayRow {
    date: string;
    displayDate?: string;
    company: string;
    source: string;
    color?: string;
    sent: number;
    sentHigh: number;
    sentMedium: number;
    sentLow: number;
    responses: number;
    respHigh: number;
    respMedium: number;
    respLow: number;
    qualified: number;
    qualHigh: number;
    qualMedium: number;
    qualLow: number;
    dead: number;
    deadHigh: number;
    deadMedium: number;
    deadLow: number;
    pending: number;
    pendingHigh: number;
    pendingMedium: number;
    pendingLow: number;
    tatResponses: number;
    tatRespHigh: number;
    tatRespMedium: number;
    tatRespLow: number;
    tatQualified: number;
    tatQualHigh: number;
    tatQualMedium: number;
    tatQualLow: number;
    tatDead: number;
    tatDeadHigh: number;
    tatDeadMedium: number;
    tatDeadLow: number;
    tatPending: number;
    tatPendingHigh: number;
    tatPendingMedium: number;
    tatPendingLow: number;
    sentLeads?: KServeSentLeadRow[];
    receivedLeads?: KServeRcvdLeadRow[];
}

interface DateGroup {
    date: string;
    displayDate: string;
    sources: SourceDayRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Company colours
// ─────────────────────────────────────────────────────────────────────────────

const COMPANY_COLORS: Record<string, string> = {
    KTAHV: "#059669", "VILLA RAAG": "#d97706", KAPPL: "#be185d", KAC: "#6366f1",
};
const CC_FALLBACK = ["#2563eb", "#7c3aed", "#0891b2", "#b45309", "#4338ca"];

function companyColor(name: string): string {
    if (COMPANY_COLORS[name]) return COMPANY_COLORS[name];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = CC_FALLBACK[Math.abs(hash) % CC_FALLBACK.length];
    COMPANY_COLORS[name] = color;
    return color;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Date helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDateRange(range: string, custom: { start: string; end: string }) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const today = fmt(now);
    let from = "", to = today;

    switch (range) {
        case "all": return { from: "", to: "" };
        case "today": from = today; break;
        case "yesterday": { const d = new Date(now); d.setDate(d.getDate() - 1); from = to = fmt(d); break; }
        case "this_week": {
            const d = new Date(now);
            const daysFromSunday = d.getDay();
            d.setDate(d.getDate() - daysFromSunday);
            from = fmt(d);
            break;
        }
        case "last_week": {
            const d = new Date(now);
            const daysFromSunday = d.getDay();
            const thisSunday = new Date(d);
            thisSunday.setDate(thisSunday.getDate() - daysFromSunday);
            const lastSundayStart = new Date(thisSunday);
            lastSundayStart.setDate(lastSundayStart.getDate() - 7);
            const lastSaturdayEnd = new Date(thisSunday);
            lastSaturdayEnd.setDate(lastSaturdayEnd.getDate() - 1);
            from = fmt(lastSundayStart); to = fmt(lastSaturdayEnd); break;
        }
        case "this_month": from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`; break;
        case "last_month": {
            const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const e = new Date(now.getFullYear(), now.getMonth(), 0);
            from = fmt(d); to = fmt(e); break;
        }
        case "this_year": from = `${now.getFullYear()}-01-01`; break;
        case "last_year": from = `${now.getFullYear() - 1}-01-01`; to = `${now.getFullYear() - 1}-12-31`; break;
        case "custom": from = custom.start; to = custom.end || today; break;
    }
    return { from, to };
}

function formatDisplayDate(iso: string): string {
    if (!iso) return "";
    let dateStr = iso.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr += "T00:00:00";
    else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateStr)) dateStr = dateStr.replace(" ", "T");
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Aggregation helpers
// ─────────────────────────────────────────────────────────────────────────────

const ZERO_SUM = {
    sent: 0, sentHigh: 0, sentMedium: 0, sentLow: 0,
    responses: 0, respHigh: 0, respMedium: 0, respLow: 0,
    qualified: 0, qualHigh: 0, qualMedium: 0, qualLow: 0,
    dead: 0, deadHigh: 0, deadMedium: 0, deadLow: 0,
    pending: 0, pendingHigh: 0, pendingMedium: 0, pendingLow: 0,
    tatResponses: 0, tatRespHigh: 0, tatRespMedium: 0, tatRespLow: 0,
    tatQualified: 0, tatQualHigh: 0, tatQualMedium: 0, tatQualLow: 0,
    tatDead: 0, tatDeadHigh: 0, tatDeadMedium: 0, tatDeadLow: 0,
    tatPending: 0, tatPendingHigh: 0, tatPendingMedium: 0, tatPendingLow: 0,
};

function sumGroup(rows: Partial<SourceDayRow>[] = []): typeof ZERO_SUM {
    const a = { ...ZERO_SUM };
    for (const c of rows) {
        if (!c) continue;
        a.sent += c.sent ?? 0; a.sentHigh += c.sentHigh ?? 0; a.sentMedium += c.sentMedium ?? 0; a.sentLow += c.sentLow ?? 0;
        a.responses += c.responses ?? 0; a.respHigh += c.respHigh ?? 0; a.respMedium += c.respMedium ?? 0; a.respLow += c.respLow ?? 0;
        a.qualified += c.qualified ?? 0; a.qualHigh += c.qualHigh ?? 0; a.qualMedium += c.qualMedium ?? 0; a.qualLow += c.qualLow ?? 0;
        a.dead += c.dead ?? 0; a.deadHigh += c.deadHigh ?? 0; a.deadMedium += c.deadMedium ?? 0; a.deadLow += c.deadLow ?? 0;
        a.pending += c.pending ?? 0; a.pendingHigh += c.pendingHigh ?? 0; a.pendingMedium += c.pendingMedium ?? 0; a.pendingLow += c.pendingLow ?? 0;
        a.tatResponses += c.tatResponses ?? 0; a.tatRespHigh += c.tatRespHigh ?? 0; a.tatRespMedium += c.tatRespMedium ?? 0; a.tatRespLow += c.tatRespLow ?? 0;
        a.tatQualified += c.tatQualified ?? 0; a.tatQualHigh += c.tatQualHigh ?? 0; a.tatQualMedium += c.tatQualMedium ?? 0; a.tatQualLow += c.tatQualLow ?? 0;
        a.tatDead += c.tatDead ?? 0; a.tatDeadHigh += c.tatDeadHigh ?? 0; a.tatDeadMedium += c.tatDeadMedium ?? 0; a.tatDeadLow += c.tatDeadLow ?? 0;
        a.tatPending += c.tatPending ?? 0; a.tatPendingHigh += c.tatPendingHigh ?? 0; a.tatPendingMedium += c.tatPendingMedium ?? 0; a.tatPendingLow += c.tatPendingLow ?? 0;
    }
    return a;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Formatters
// ─────────────────────────────────────────────────────────────────────────────

const fmtPct = (n: number, d: number) => d > 0 ? ((n / d) * 100).toFixed(1) : "0.0";
const normalize = (v?: string) => v?.trim().toLowerCase().replace(/\s+/g, "_") || "";

const formatDelay = (seconds: number) => {
    if (seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const delayColor = (seconds: number) => {
    const mins = seconds / 60;
    if (mins <= 30) return { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" };
    if (mins <= 60) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" };
    return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" };
};




// ─────────────────────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────────────────────

const S = 12;
const icons = {
    chart: (sz = S) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    table: (sz = S) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" /><path d="M3 9h18M3 15h18M9 3v18" strokeWidth="2" strokeLinecap="round" /></svg>,
    trend: (sz = S) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dashboard: (sz = S) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" /></svg>,
    check: (sz = S) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Chart helpers
// ─────────────────────────────────────────────────────────────────────────────

const chartFont = { family: "'Inter', sans-serif" };
const commonBarOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { titleFont: { ...chartFont, size: 11 }, bodyFont: { ...chartFont, size: 11 } } },
    scales: {
        x: { ticks: { font: chartFont, color: "#64748b" }, grid: { display: false }, border: { display: false } },
        y: { ticks: { font: chartFont, color: "#64748b" }, grid: { color: "#f1f5f9" }, border: { display: false } },
    },
    barPercentage: 0.75, categoryPercentage: 0.7,
};

const performanceTooltip = {
    callbacks: {
        label: (ctx: any) => {
            const val = ctx.parsed.y;
            const dsLabel = ctx.dataset.label;
            const dataIndex = ctx.dataIndex;
            const datasets = ctx.chart.data.datasets;
            let pct = "";
            if (dsLabel === "Qualified" || dsLabel === "Non-Qualified") {
                const qual = datasets.find((d: any) => d.label === "Qualified")?.data[dataIndex] || 0;
                const dead = datasets.find((d: any) => d.label === "Non-Qualified")?.data[dataIndex] || 0;
                const resp = Number(qual) + Number(dead);
                if (resp > 0) pct = ` (${((val / resp) * 100).toFixed(1)}%)`;
            } else if (dsLabel === "Pending") {
                const sent = datasets.find((d: any) => d.label === "Sent")?.data[dataIndex] || 0;
                if (Number(sent) > 0) pct = ` (${((val / Number(sent)) * 100).toFixed(1)}%)`;
            } else if (dsLabel === "Sent") { pct = " (100%)"; }
            return `${dsLabel}: ${val}${pct}`;
        }
    }
};

const stackedTooltip = {
    callbacks: {
        label: (ctx: any) => {
            const val = ctx.parsed.y;
            const dataIndex = ctx.dataIndex;
            const datasets = ctx.chart.data.datasets;
            const total = datasets.reduce((acc: number, ds: any) => acc + (Number(ds.data[dataIndex]) || 0), 0);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
            return `${ctx.dataset.label}: ${val} (${pct}%)`;
        }
    }
};

function ChartLegend({ items }: { items: { color: string; label: string; round?: boolean }[] }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
            {items.map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                    <div style={{ width: 8, height: 8, borderRadius: l.round ? "50%" : 2, background: l.color, flexShrink: 0 }} />{l.label}
                </div>
            ))}
        </div>
    );
}

function ChartCard({ title, subtitle, iconBg, iconColor, icon, legend, children }: {
    title: string; subtitle: string; iconBg: string; iconColor: string; icon: React.ReactNode;
    legend?: { color: string; label: string; round?: boolean }[]; children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100">
                <div style={{ width: 24, height: 24, borderRadius: 6, background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                <div>
                    <div className="text-[12.5px] font-bold text-slate-800">{title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{subtitle}</div>
                </div>
            </div>
            <div className="p-4">{children}{legend && <ChartLegend items={legend} />}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Table constants
// ─────────────────────────────────────────────────────────────────────────────

const HDR_BG = "#1e3a5f";
const HDR_BG2 = "#162d4a";
const CELL = {
    H: { bg: "#f0fdf4", count: "#166534", pct: "#15803d" },
    M: { bg: "#fefce8", count: "#92400e", pct: "#a16207" },
    L: { bg: "#fef2f2", count: "#991b1b", pct: "#b91c1c" },
};

const GROUPS = [
    {
        key: "sent", label: "Leads Sent",
        hdrBg: "#ebfffd", hdrText: "#013b37",
        getTotal: (t: typeof ZERO_SUM) => t.sent,
        getH: (t: typeof ZERO_SUM) => t.sentHigh,
        getM: (t: typeof ZERO_SUM) => t.sentMedium,
        getL: (t: typeof ZERO_SUM) => t.sentLow,
        getDenominator: (_t: typeof ZERO_SUM, grand: typeof ZERO_SUM) => grand.sent,
        modalStatus: "SENT" as ModalStatusType,
    },
    {
        key: "resp", label: "Responses Received",
        hdrBg: "#fef3c7", hdrText: "#92400e",
        getTotal: (t: typeof ZERO_SUM) => t.responses,
        getH: (t: typeof ZERO_SUM) => t.respHigh,
        getM: (t: typeof ZERO_SUM) => t.respMedium,
        getL: (t: typeof ZERO_SUM) => t.respLow,
        getDenominator: (t: typeof ZERO_SUM) => t.sent,
        showTAT: true,
        getTAT: (t: typeof ZERO_SUM) => t.responses > 0 ? t.tatResponses / t.responses : 0,
        getTATH: (t: typeof ZERO_SUM) => t.respHigh > 0 ? t.tatRespHigh / t.respHigh : 0,
        getTATM: (t: typeof ZERO_SUM) => t.respMedium > 0 ? t.tatRespMedium / t.respMedium : 0,
        getTATL: (t: typeof ZERO_SUM) => t.respLow > 0 ? t.tatRespLow / t.respLow : 0,
        modalStatus: "RECEIVED" as ModalStatusType,
    },
    {
        key: "qual", label: "Qualified",
        hdrBg: "#dcfce7", hdrText: "#166534",
        getTotal: (t: typeof ZERO_SUM) => t.qualified,
        getH: (t: typeof ZERO_SUM) => t.qualHigh,
        getM: (t: typeof ZERO_SUM) => t.qualMedium,
        getL: (t: typeof ZERO_SUM) => t.qualLow,
        getDenominator: (t: typeof ZERO_SUM) => t.responses,
        showTAT: true,
        getTAT: (t: typeof ZERO_SUM) => t.qualified > 0 ? t.tatQualified / t.qualified : 0,
        getTATH: (t: typeof ZERO_SUM) => t.qualHigh > 0 ? t.tatQualHigh / t.qualHigh : 0,
        getTATM: (t: typeof ZERO_SUM) => t.qualMedium > 0 ? t.tatQualMedium / t.qualMedium : 0,
        getTATL: (t: typeof ZERO_SUM) => t.qualLow > 0 ? t.tatQualLow / t.qualLow : 0,
        modalStatus: "QUALIFIED" as ModalStatusType,
    },
    {
        key: "dead", label: "Dead / Non-Qual",
        hdrBg: "#ffe4e6", hdrText: "#9f1239",
        getTotal: (t: typeof ZERO_SUM) => t.dead,
        getH: (t: typeof ZERO_SUM) => t.deadHigh,
        getM: (t: typeof ZERO_SUM) => t.deadMedium,
        getL: (t: typeof ZERO_SUM) => t.deadLow,
        getDenominator: (t: typeof ZERO_SUM) => t.responses,
        showTAT: true,
        getTAT: (t: typeof ZERO_SUM) => t.dead > 0 ? t.tatDead / t.dead : 0,
        getTATH: (t: typeof ZERO_SUM) => t.deadHigh > 0 ? t.tatDeadHigh / t.deadHigh : 0,
        getTATM: (t: typeof ZERO_SUM) => t.deadMedium > 0 ? t.tatDeadMedium / t.deadMedium : 0,
        getTATL: (t: typeof ZERO_SUM) => t.deadLow > 0 ? t.tatDeadLow / t.deadLow : 0,
        modalStatus: "DEAD" as ModalStatusType,
    },
    {
        key: "pend", label: "Pending / Rescheduled",
        hdrBg: "#f3e8ff", hdrText: "#6b21a8",
        getTotal: (t: typeof ZERO_SUM) => t.pending,
        getH: (t: typeof ZERO_SUM) => t.pendingHigh,
        getM: (t: typeof ZERO_SUM) => t.pendingMedium,
        getL: (t: typeof ZERO_SUM) => t.pendingLow,
        getDenominator: (t: typeof ZERO_SUM) => t.sent,
        showTAT: true,
        getTAT: (t: typeof ZERO_SUM) => t.pending > 0 ? t.tatPending / t.pending : 0,
        getTATH: (t: typeof ZERO_SUM) => t.pendingHigh > 0 ? t.tatPendingHigh / t.pendingHigh : 0,
        getTATM: (t: typeof ZERO_SUM) => t.pendingMedium > 0 ? t.tatPendingMedium / t.pendingMedium : 0,
        getTATL: (t: typeof ZERO_SUM) => t.pendingLow > 0 ? t.tatPendingLow / t.pendingLow : 0,
        modalStatus: "PENDING" as ModalStatusType,
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
//  GroupCells  (with onCellClick that now carries the modal status)
// ─────────────────────────────────────────────────────────────────────────────

const SortIcon = ({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: "asc" | "desc" }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
};

const GroupCells = React.memo(({
    total, H, M, L, denominator = 0,
    tatTotal = 0, tatH = 0, tatM = 0, tatL = 0,
    isDateRow = false, isGrand = false, showTAT = true,
    onCellClick,
}: {
    total: number; H: number; M: number; L: number; denominator?: number;
    tatTotal?: number; tatH?: number; tatM?: number; tatL?: number;
    isDateRow?: boolean; isGrand?: boolean; showTAT?: boolean;
    onCellClick?: (intent: string) => void;
}) => {
    const TatCell = ({ mins, isGrand }: { mins: number; isGrand?: boolean }) => {
        if (!showTAT) return null;
        const dc = delayColor(mins);
        const color = isGrand
            ? (mins > 0 ? "#ffffff" : "rgba(255,255,255,0.2)")
            : (mins > 0 ? dc.text : "text-slate-300");
        return (
            <td className="px-1.5 py-2 text-center whitespace-nowrap"
                style={isGrand ? { borderLeft: "1px solid rgba(255,255,255,0.08)" } : { borderBottom: "1px solid #e5e7eb" }}>
                <div className={`inline-flex items-center ${isGrand ? "" : dc.bg} px-1.5 py-0.5 rounded text-[10px] font-bold`}
                    style={isGrand ? { color } : { color: typeof color === "string" && color.startsWith("text-") ? undefined : color as string }}>
                    {mins > 0 ? formatDelay(mins) : "—"}
                </div>
            </td>
        );
    };

    if (isGrand) return (
        <>
            <td className="px-3 py-2.5 text-center whitespace-nowrap" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{total}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 11, color: "#f3f4f6" }}>{denominator > 0 ? `${fmtPct(total, denominator)}%` : "0%"}</span>
            </td>
            {showTAT && <TatCell mins={tatTotal} isGrand />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: "rgba(22,101,52,0.25)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#86efac" }}>{H}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap" style={{ background: "rgba(22,101,52,0.15)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 11, color: "#86efac" }}>{fmtPct(H, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatH} isGrand />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: "rgba(120,53,15,0.25)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#fcd34d" }}>{M}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: "rgba(120,53,15,0.15)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 11, color: "#fcd34d" }}>{fmtPct(M, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatM} isGrand />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: "rgba(127,29,29,0.25)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>{L}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: "rgba(127,29,29,0.15)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 11, color: "#f87171" }}>{fmtPct(L, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatL} isGrand />}
        </>
    );

    if (isDateRow) return (
        <>
            <td className="px-3 py-2.5 text-center whitespace-nowrap border-l-2 border-slate-300">
                <span className="text-sm font-bold text-slate-800">{total}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap">
                <span className="text-[11px] font-semibold text-slate-500">{denominator > 0 ? `${fmtPct(total, denominator)}%` : "0%"}</span>
            </td>
            {showTAT && <TatCell mins={tatTotal} />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.H.bg, borderLeft: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.H.count }}>{H}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.H.bg }}>
                <span style={{ fontSize: 11, color: CELL.H.pct }}>{fmtPct(H, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatH} />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.M.bg, borderLeft: "1px solid #fde68a" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.M.count }}>{M}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.M.bg }}>
                <span style={{ fontSize: 11, color: CELL.M.pct }}>{fmtPct(M, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatM} />}
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.L.bg, borderLeft: "1px solid #fca5a5" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.L.count }}>{L}</span>
            </td>
            <td className="px-2 py-2.5 text-center whitespace-nowrap" style={{ background: CELL.L.bg }}>
                <span style={{ fontSize: 11, color: CELL.L.pct }}>{fmtPct(L, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatL} />}
        </>
    );

    const cs = (count: number): React.CSSProperties => onCellClick && count > 0
        ? { cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "2px" }
        : {};

    return (
        <>
            <td className="px-3 py-2 text-center whitespace-nowrap border-l-2 border-slate-200 border-b border-slate-100"
                onClick={() => total > 0 && onCellClick?.("ALL")}>
                <span className="text-[13px] font-semibold text-slate-800" style={cs(total)}>{total}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100">
                <span className="text-[11px] text-slate-500">{denominator > 0 ? `${fmtPct(total, denominator)}%` : "0%"}</span>
            </td>
            {showTAT && <TatCell mins={tatTotal} />}
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100"
                style={{ background: CELL.H.bg, borderLeft: "1px solid #dcfce7" }}
                onClick={() => H > 0 && onCellClick?.("HIGH")}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.H.count, ...cs(H) }}>{H}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100" style={{ background: CELL.H.bg }}>
                <span style={{ fontSize: 11, color: CELL.H.pct }}>{fmtPct(H, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatH} />}
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100"
                style={{ background: CELL.M.bg, borderLeft: "1px solid #fef9c3" }}
                onClick={() => M > 0 && onCellClick?.("MEDIUM")}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.M.count, ...cs(M) }}>{M}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100" style={{ background: CELL.M.bg }}>
                <span style={{ fontSize: 11, color: CELL.M.pct }}>{fmtPct(M, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatM} />}
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100"
                style={{ background: CELL.L.bg, borderLeft: "1px solid #ffe4e6" }}
                onClick={() => L > 0 && onCellClick?.("LOW")}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CELL.L.count, ...cs(L) }}>{L}</span>
            </td>
            <td className="px-2 py-2 text-center whitespace-nowrap border-b border-slate-100" style={{ background: CELL.L.bg }}>
                <span style={{ fontSize: 11, color: CELL.L.pct }}>{fmtPct(L, total)}%</span>
            </td>
            {showTAT && <TatCell mins={tatL} />}
        </>
    );
});
GroupCells.displayName = "GroupCells";

// ─────────────────────────────────────────────────────────────────────────────
//  Loading / Error / Empty
// ─────────────────────────────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="p-6 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}
        </div>
    );
}
function TableError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm font-semibold text-slate-600">Failed to load data</p>
            <p className="text-xs text-slate-400 max-w-sm">{message}</p>
            <button onClick={onRetry} className="mt-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition">Retry</button>
        </div>
    );
}
function TableEmpty() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">{icons.table(22)}</div>
            <p className="text-sm font-semibold text-slate-500">No data available</p>
            <p className="text-xs text-slate-400">No records found for the selected filters.</p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Breakdown Table — receives onCellInteract from parent
// ─────────────────────────────────────────────────────────────────────────────

function CompanyBreakdownTable({
    company, sourceFilter, dateGroups, search, priority,
    onCellInteract,
}: {
    company: string; sourceFilter: string; dateGroups: DateGroup[]; search: string; priority: string;
    onCellInteract: (params: { date: string; company: string; src: string; intent: string; statusParam: ModalStatusType }) => void;
}) {
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState("date");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [gotoInput, setGotoInput] = useState("");

    useEffect(() => {
        if (dateGroups.length > 0) setExpandedDates(new Set([dateGroups[0].date]));
    }, [dateGroups.length]);

    useEffect(() => { setCurrentPage(1); }, [company, sourceFilter, dateGroups]);

    const toggle = (date: string) => setExpandedDates(prev => {
        const next = new Set(prev);
        next.has(date) ? next.delete(date) : next.add(date);
        return next;
    });

    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("desc"); }
    };

    const sorted = useMemo(() => [...dateGroups].sort((a, b) => {
        const tA = sumGroup(a.sources), tB = sumGroup(b.sources);
        let vA: any, vB: any;
        if (sortField === "date") { vA = a.date; vB = b.date; }
        else {
            const map: Record<string, keyof typeof ZERO_SUM> = { sent: "sent", resp: "responses", qual: "qualified", dead: "dead", pend: "pending" };
            const key = map[sortField];
            vA = key ? tA[key] : 0; vB = key ? tB[key] : 0;
        }
        return sortDir === "asc" ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    }), [dateGroups, sortField, sortDir]);

    const grand = useMemo(() => sumGroup(dateGroups.flatMap(dg => dg.sources)), [dateGroups]);
    const totalDates = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalDates / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * rowsPerPage;
    const paginated = sorted.slice(startIdx, startIdx + rowsPerPage);

    const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
    const handleRowsChange = (val: number) => { setRowsPerPage(val); setCurrentPage(1); };
    const handleGoto = () => { const n = parseInt(gotoInput, 10); if (!isNaN(n)) goToPage(n); setGotoInput(""); };

    if (totalDates === 0) return <TableEmpty />;

    const PriSubHdr = ({ label, showTAT = true }: { label: string; showTAT?: boolean }) => (
        <th colSpan={showTAT ? 3 : 2}
            className="px-2 py-2.5 text-center text-xs font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: HDR_BG, color: "#fff", borderLeft: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="flex flex-col items-center gap-0.5">
                <span>{label}</span>
                <div className="flex gap-2 text-[10px] font-semibold normal-case mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <span>Count</span><span style={{ opacity: 0.4 }}>|</span><span>%</span>
                    {showTAT && <><span style={{ opacity: 0.4 }}>|</span><span>TAT</span></>}
                </div>
            </div>
        </th>
    );

    return (
        <div>
            {/* ── Clickable cell hint ── */}
            {/* <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                    <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
                        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Click any <strong>count number</strong> in the source rows to view individual lead records
                </span>
            </div> */}

            <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full" style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ backgroundColor: HDR_BG }}>
                                <th rowSpan={2}
                                    className="sticky left-0 z-20 px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10"
                                    style={{ backgroundColor: HDR_BG, minWidth: 200, borderRight: "2px solid rgba(255,255,255,0.15)" }}
                                    onClick={() => handleSort("date")}>
                                    <div className="flex items-center gap-1.5">
                                        Date / Source
                                        <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                                    </div>
                                </th>
                                {GROUPS.map(g => (
                                    <th key={g.key} colSpan={g.key === "sent" ? 8 : 12}
                                        className="px-3 py-2.5 text-center text-xs font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                                        style={{ backgroundColor: g.hdrBg, color: g.hdrText, borderLeft: `2px solid ${g.hdrText}33` }}
                                        onClick={() => handleSort(g.key)}>
                                        <div className="flex items-center justify-center gap-1.5">
                                            {g.label}
                                            <SortIcon field={g.key} sortField={sortField} sortDir={sortDir} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            <tr style={{ backgroundColor: HDR_BG2 }}>
                                {GROUPS.map((g, i) => (
                                    <React.Fragment key={g.key}>
                                        <th colSpan={g.key === "sent" ? 2 : 3}
                                            className="px-3 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap"
                                            style={{ backgroundColor: HDR_BG2, borderLeft: i === 0 ? "none" : "2px solid rgba(255,255,255,0.2)" }}>
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span>Total</span>
                                                <div className="flex gap-2 text-[10px] font-semibold normal-case mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                                                    <span>Count</span><span style={{ opacity: 0.4 }}>|</span><span>%</span>
                                                    {g.key !== "sent" && <><span style={{ opacity: 0.4 }}>|</span><span>TAT</span></>}
                                                </div>
                                            </div>
                                        </th>
                                        <PriSubHdr label="High" showTAT={g.key !== "sent"} />
                                        <PriSubHdr label="Medium" showTAT={g.key !== "sent"} />
                                        <PriSubHdr label="Low" showTAT={g.key !== "sent"} />
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(dg => {
                                const t = sumGroup(dg.sources);
                                const expanded = expandedDates.has(dg.date);
                                return (
                                    <React.Fragment key={dg.date}>
                                        {/* Date row — not clickable for modal */}
                                        <tr className="cursor-pointer hover:bg-slate-50 transition-colors border-b-2 border-slate-200"
                                            style={{ background: expanded ? "#f8fafc" : "#ffffff" }}
                                            onClick={() => toggle(dg.date)}>
                                            <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap"
                                                style={{ background: expanded ? "#f8fafc" : "#ffffff", borderRight: "2px solid #e2e8f0" }}>
                                                <div className="flex items-center gap-2">
                                                    {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                                                    <div>
                                                        <div className="text-[13px] font-bold text-slate-800">{dg.displayDate}</div>
                                                        <div className="text-[10px] text-slate-400">{dg.sources.length} source{dg.sources.length !== 1 ? "s" : ""}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            {GROUPS.map(g => {
                                                const showTAT = (g as any).showTAT ?? false;
                                                return (
                                                    <GroupCells key={g.key}
                                                        total={g.getTotal(t)} H={g.getH(t)} M={g.getM(t)} L={g.getL(t)}
                                                        denominator={g.getDenominator(t, t)}
                                                        tatTotal={(g as any).getTAT ? (g as any).getTAT(t) : 0}
                                                        tatH={(g as any).getTATH ? (g as any).getTATH(t) : 0}
                                                        tatM={(g as any).getTATM ? (g as any).getTATM(t) : 0}
                                                        tatL={(g as any).getTATL ? (g as any).getTATL(t) : 0}
                                                        showTAT={showTAT}
                                                        isDateRow />
                                                );
                                            })}
                                        </tr>

                                        {/* Source sub-rows — cells ARE clickable */}
                                        {expanded && dg.sources.map(s => {
                                            const buildClick = (statusParam: ModalStatusType) => (intent: string) => {
                                                const companyParam = s.company?.toUpperCase() || "ALL";
                                                onCellInteract({
                                                    date: dg.date,
                                                    company: companyParam,
                                                    src: s.source?.toUpperCase() || "ALL",
                                                    intent,
                                                    statusParam,
                                                });
                                            };

                                            return (
                                                <tr key={`${dg.date}-${s.source}-${s.company}`}
                                                    className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="sticky left-0 z-10 pl-10 pr-4 py-2 whitespace-nowrap border-b border-slate-100"
                                                        style={{ background: "white", borderRight: "2px solid #e2e8f0" }}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color || companyColor(s.company) }} />
                                                            <div>
                                                                <span className="text-[13px] font-semibold text-slate-700">{s.source}</span>
                                                                <span className="ml-2 text-[10px] text-slate-400">{s.company}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {GROUPS.map(g => {
                                                        const st = sumGroup([s]);
                                                        if (g.key === "sent") return (
                                                            <GroupCells key={g.key}
                                                                total={s.sent ?? 0} H={s.sentHigh ?? 0} M={s.sentMedium ?? 0} L={s.sentLow ?? 0}
                                                                denominator={t.sent ?? 0}
                                                                showTAT={false}
                                                                onCellClick={buildClick("SENT")} />
                                                        );
                                                        return (
                                                            <GroupCells key={g.key}
                                                                total={g.getTotal(st)} H={g.getH(st)} M={g.getM(st)} L={g.getL(st)}
                                                                denominator={g.getDenominator(st, t)}
                                                                tatTotal={(g as any).getTAT ? (g as any).getTAT(st) : 0}
                                                                tatH={(g as any).getTATH ? (g as any).getTATH(st) : 0}
                                                                tatM={(g as any).getTATM ? (g as any).getTATM(st) : 0}
                                                                tatL={(g as any).getTATL ? (g as any).getTATL(st) : 0}
                                                                onCellClick={buildClick(g.modalStatus)} />
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: "#1e293b", borderTop: "3px solid #0f172a" }}>
                                <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap" style={{ background: "#1e293b", borderRight: "2px solid #0f172a" }}>
                                    <span className="text-[12px] font-extrabold text-white uppercase tracking-wider">Grand Total</span>
                                    <span className="ml-2 text-[11px] text-gray-300">({totalDates} dates)</span>
                                </td>
                                {GROUPS.map(g => (
                                    <GroupCells key={g.key}
                                        total={g.getTotal(grand)} H={g.getH(grand)} M={g.getM(grand)} L={g.getL(grand)}
                                        denominator={g.getDenominator(grand, grand)}
                                        tatTotal={(g as any).getTAT ? (g as any).getTAT(grand) : 0}
                                        tatH={(g as any).getTATH ? (g as any).getTATH(grand) : 0}
                                        tatM={(g as any).getTATM ? (g as any).getTATM(grand) : 0}
                                        tatL={(g as any).getTATL ? (g as any).getTATL(grand) : 0}
                                        showTAT={g.key !== "sent"}
                                        isGrand />
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3 px-3 sm:px-4 py-3 border-t border-slate-200 bg-slate-50 text-[12px] text-slate-600 select-none">
                <span>Showing <strong className="text-slate-800">{totalDates === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + rowsPerPage, totalDates)}`}</strong> of <strong className="text-slate-800">{totalDates}</strong> date{totalDates !== 1 ? "s" : ""}</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => goToPage(1)} disabled={safePage === 1} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">«</button>
                    <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} className="h-7 px-2 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap">‹ Prev</button>
                    {(() => {
                        const pages: (number | "…")[] = [];
                        if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
                        else {
                            pages.push(1);
                            if (safePage > 3) pages.push("…");
                            for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
                            if (safePage < totalPages - 2) pages.push("…");
                            pages.push(totalPages);
                        }
                        return pages.map((p, idx) => p === "…"
                            ? <span key={`e${idx}`} className="w-7 text-center text-slate-400">…</span>
                            : <button key={p} onClick={() => goToPage(p as number)}
                                className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-semibold border transition ${safePage === p ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>{p}</button>
                        );
                    })()}
                    <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} className="h-7 px-2 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap">Next ›</button>
                    <button onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition">»</button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 whitespace-nowrap">Rows/page</span>
                        <select value={rowsPerPage} onChange={e => handleRowsChange(Number(e.target.value))}
                            className="h-7 rounded border border-slate-300 bg-white text-slate-700 text-[11px] font-semibold px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                            {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 whitespace-nowrap">Go to</span>
                        <input type="number" min={1} max={totalPages} value={gotoInput}
                            onChange={e => setGotoInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleGoto()}
                            placeholder="#"
                            className="w-12 h-7 rounded border border-slate-300 bg-white text-slate-700 text-[11px] text-center font-semibold px-1 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button onClick={handleGoto} className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition">Go</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  API → DateGroup[] transformer
// ─────────────────────────────────────────────────────────────────────────────

function transformApiData(apiData: any): DateGroup[] {
    if (Array.isArray(apiData)) {
        return apiData.map(dg => {
            const sources: SourceDayRow[] = (dg.sources || []).map((s: any) => {
                let cName = (s.company || "").trim().toUpperCase();
                if (cName === "VILLARAAG") cName = "VILLA RAAG";
                return {
                    ...s,
                    date: dg.date,
                    company: cName,
                    source: s.source || "Others",
                    color: companyColor(cName),
                    responses: (s.qualified ?? 0) + (s.dead ?? 0),
                    respHigh: (s.qualHigh ?? 0) + (s.deadHigh ?? 0),
                    respMedium: (s.qualMedium ?? 0) + (s.deadMedium ?? 0),
                    respLow: (s.qualLow ?? 0) + (s.deadLow ?? 0),
                    tatResponses: (s.tatQualified ?? 0) + (s.tatDead ?? 0),
                    tatRespHigh: (s.tatQualHigh ?? 0) + (s.tatDeadHigh ?? 0),
                    tatRespMedium: (s.tatQualMedium ?? 0) + (s.tatDeadMedium ?? 0),
                    tatRespLow: (s.tatQualLow ?? 0) + (s.tatDeadLow ?? 0),
                    sentLeads: s.sentLeads || [],
                    receivedLeads: s.receivedLeads || [],
                };
            });
            return { date: dg.date, displayDate: formatDisplayDate(dg.date), sources };
        }).sort((a, b) => (a.date < b.date ? 1 : -1));
    }

    return Object.entries(apiData)
        .map(([date, companies]: [string, any]) => {
            const sources: SourceDayRow[] = [];
            Object.entries(companies).forEach(([company, srcs]: [string, any]) => {
                Object.entries(srcs).forEach(([source, slot]: [string, any]) => {
                    const q = slot.qualified ?? 0, d = slot.dead ?? 0, r = q + d;
                    const qH = slot.qualHigh ?? 0, dH = slot.deadHigh ?? 0;
                    const qM = slot.qualMedium ?? 0, dM = slot.deadMedium ?? 0;
                    const qL = slot.qualLow ?? 0, dL = slot.deadLow ?? 0;
                    const tq = slot.tatQualified ?? 0, td = slot.tatDead ?? 0;
                    const tqH = slot.tatQualHigh ?? 0, tdH = slot.tatDeadHigh ?? 0;
                    const tqM = slot.tatQualMedium ?? 0, tdM = slot.tatDeadMedium ?? 0;
                    const tqL = slot.tatQualLow ?? 0, tdL = slot.tatDeadLow ?? 0;
                    let cName = company.trim().toUpperCase();
                    if (cName === "VILLARAAG") cName = "VILLA RAAG";
                    sources.push({
                        date, company: cName, source, color: companyColor(cName),
                        sent: slot.sent ?? 0, sentHigh: slot.sentHigh ?? 0, sentMedium: slot.sentMedium ?? 0, sentLow: slot.sentLow ?? 0,
                        responses: r, respHigh: qH + dH, respMedium: qM + dM, respLow: qL + dL,
                        qualified: q, qualHigh: qH, qualMedium: qM, qualLow: qL,
                        dead: d, deadHigh: dH, deadMedium: dM, deadLow: dL,
                        pending: slot.pending ?? 0, pendingHigh: slot.pendingHigh ?? 0, pendingMedium: slot.pendingMedium ?? 0, pendingLow: slot.pendingLow ?? 0,
                        tatResponses: tq + td, tatRespHigh: tqH + tdH, tatRespMedium: tqM + tdM, tatRespLow: tqL + tdL,
                        tatQualified: tq, tatQualHigh: tqH, tatQualMedium: tqM, tatQualLow: tqL,
                        tatDead: td, tatDeadHigh: tdH, tatDeadMedium: tdM, tatDeadLow: tdL,
                        tatPending: slot.tatPending ?? 0, tatPendingHigh: slot.tatPendingHigh ?? 0, tatPendingMedium: slot.tatPendingMedium ?? 0, tatPendingLow: slot.tatPendingLow ?? 0,
                    });
                });
            });
            return { date, displayDate: formatDisplayDate(date), sources };
        })
        .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Modal loading overlay
// ─────────────────────────────────────────────────────────────────────────────

function ModalLoader() {
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 1060,
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "4px solid rgba(255,255,255,0.15)",
                borderTop: "4px solid #4f46e5",
                animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Loading lead records…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AIVoiceSummaryReportPage() {

    // ── Filter state ──────────────────────────────────────────────────────────
    const [dateFilter, setDateFilter] = useState("this_week");
    const [company, setCompany] = useState("all");
    const [source, setSource] = useState("all");
    const [priority, setPriority] = useState("all");
    const [customDate, setCustomDate] = useState({ start: "", end: "" });
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [view, setView] = useState<"table" | "charts">("table");

    // ── Fetch state ───────────────────────────────────────────────────────────
    const [rawDateGroups, setRawDateGroups] = useState<DateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Modal state ───────────────────────────────────────────────────────────
    const [modalState, setModalState] = useState<ActiveModalState>({
        open: false, modalType: null, sentMeta: null, rcvdMeta: null,
    });
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    // ── Fetch summary from API ────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { from, to } = getDateRange(dateFilter, customDate);
            const params = new URLSearchParams({ company, source });
            if (from) params.set("dateFrom", from);
            if (to) params.set("dateTo", to);

            const res = await fetch(`/api/voice-summary?${params.toString()}`);
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const json = await res.json();
            if (!json.success && json.status !== "success") throw new Error(json.message || "Unknown API error");
            setRawDateGroups(transformApiData(json.data));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [dateFilter, customDate, company, source]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const clearFilters = () => {
        setSearch(""); setDebouncedSearch(""); setDateFilter("all");
        setCompany("all"); setSource("all"); setPriority("all");
        setCustomDate({ start: "", end: "" });
    };

    // ── Handle cell click → fetch leads → open modal ──────────────────────────
    const handleCellInteract = useCallback(async (params: {
        date: string; company: string; src: string; intent: string; statusParam: ModalStatusType;
    }) => {
        setModalLoading(true);
        setModalError(null);
        try {
            const matchedDay = rawDateGroups.find(dg => dg.date === params.date);
            let sentRows: KServeSentLeadRow[] = [];
            let rcvdRows: KServeRcvdLeadRow[] = [];

            if (matchedDay) {
                const matchedSources = matchedDay.sources.filter(s => {
                    const cMatch = params.company === "ALL"
                        || params.company.split(",").map(c => c.trim().toUpperCase()).includes(s.company.toUpperCase());
                    const sMatch = params.src === "ALL" || s.source.toUpperCase() === params.src;
                    return cMatch && sMatch;
                });

                matchedSources.forEach(s => {
                    if (s.sentLeads) sentRows.push(...s.sentLeads);
                    if (s.receivedLeads) rcvdRows.push(...s.receivedLeads);
                });

            }

            if (params.statusParam === "SENT") {
                if (params.intent !== "ALL") {
                    sentRows = sentRows.filter(r => {
                        const intent = (r.leadIntent || "").toLowerCase();
                        if (params.intent === "HIGH") return intent === "high";
                        if (params.intent === "MEDIUM") return intent === "medium";
                        return intent !== "high" && intent !== "medium";
                    });
                }
            } else {
                rcvdRows = rcvdRows.filter(r => {
                    const qStatus = (r.calculatedstatus || "").trim().toLowerCase();;
                    const cIntent = (r.customerIntent || "").toLowerCase();

                    if (params.statusParam === "QUALIFIED" && qStatus !== "qualified") return false;
                    if (params.statusParam === "DEAD" && qStatus !== "non-qualified") return false;
                    if (params.statusParam === "PENDING" && qStatus !== "pending" && qStatus !== "pending/rescheduled") return false;
                    if (params.statusParam === "RECEIVED" && qStatus !== "qualified" && qStatus !== "non-qualified") return false;

                    if (params.intent === "HIGH" && !cIntent.includes("high")) return false;
                    if (params.intent === "MEDIUM" && !cIntent.includes("medium")) return false;
                    if (params.intent === "LOW" && (cIntent.includes("high") || cIntent.includes("medium"))) return false;

                    return true;
                });
            }

            const intentLabel = params.intent === "ALL" ? "All Priorities"
                : params.intent === "HIGH" ? "High Priority"
                    : params.intent === "MEDIUM" ? "Medium Priority"
                        : "Low Priority";

            const statusLabel =
                params.statusParam === "SENT" ? "Leads Sent"
                    : params.statusParam === "RECEIVED" ? "Responses Received"
                        : params.statusParam === "QUALIFIED" ? "Qualified"
                            : params.statusParam === "DEAD" ? "Dead / Non-Qualified"
                                : "Pending / Rescheduled";

            const displayDate = formatDisplayDate(params.date);
            const typeStr = `Date: ${displayDate} | Company: ${params.company} | Source: ${params.src} | Status: ${statusLabel} | Intent: ${intentLabel}`;

            if (params.statusParam === "SENT") {
                setModalState({
                    open: true,
                    modalType: "sent",
                    sentMeta: { type: typeStr, leads: sentRows },
                    rcvdMeta: null,
                });
            } else {
                setModalState({
                    open: true,
                    modalType: "rcvd",
                    sentMeta: null,
                    rcvdMeta: { type: typeStr, leads: rcvdRows },
                });
            }
        } catch (e) {
            setModalError(e instanceof Error ? e.message : "Failed to load leads");
        } finally {
            setModalLoading(false);
        }
    }, [rawDateGroups]);

    const closeModal = useCallback(() => {
        setModalState({ open: false, modalType: null, sentMeta: null, rcvdMeta: null });
        setModalError(null);
    }, []);

    // ── Client-side filtering ─────────────────────────────────────────────────
    const stats = useMemo(() => {
        const lSearch = debouncedSearch.trim().toLowerCase();
        const dateFilteredGroups: DateGroup[] = [];
        const kpiSum = { ...ZERO_SUM };
        const companyMap: Record<string, any> = {};
        const sourceMap: Record<string, any> = {};

        ["KTAHV", "KAPPL", "VILLA RAAG", "KAC"].forEach(name => {
            companyMap[name] = { ...ZERO_SUM, name, color: companyColor(name) };
        });

        rawDateGroups.forEach(dg => {
            const daySourceMap = new Map<string, SourceDayRow>();

            dg.sources.forEach(s => {
                const mp = priority === "all"
                    || (priority === "high" && (s.sentHigh > 0 || s.qualHigh > 0))
                    || (priority === "medium" && (s.sentMedium > 0 || s.qualMedium > 0))
                    || (priority === "low" && (s.sentLow > 0 || s.qualLow > 0));

                const mSearch = !lSearch
                    || s.company?.toLowerCase().includes(lSearch)
                    || s.source?.toLowerCase().includes(lSearch);

                if (!mp || !mSearch) return;

                const r = (s.qualified ?? 0) + (s.dead ?? 0);
                kpiSum.sent += s.sent; kpiSum.sentHigh += s.sentHigh; kpiSum.sentMedium += s.sentMedium; kpiSum.sentLow += s.sentLow;
                kpiSum.responses += r;
                kpiSum.respHigh += (s.qualHigh ?? 0) + (s.deadHigh ?? 0);
                kpiSum.respMedium += (s.qualMedium ?? 0) + (s.deadMedium ?? 0);
                kpiSum.respLow += (s.qualLow ?? 0) + (s.deadLow ?? 0);
                kpiSum.qualified += s.qualified; kpiSum.qualHigh += s.qualHigh; kpiSum.qualMedium += s.qualMedium; kpiSum.qualLow += s.qualLow;
                kpiSum.dead += s.dead; kpiSum.deadHigh += s.deadHigh; kpiSum.deadMedium += s.deadMedium; kpiSum.deadLow += s.deadLow;
                kpiSum.pending += s.pending; kpiSum.pendingHigh += s.pendingHigh; kpiSum.pendingMedium += s.pendingMedium; kpiSum.pendingLow += s.pendingLow;
                const tr = (s.tatQualified ?? 0) + (s.tatDead ?? 0);
                kpiSum.tatResponses += tr; kpiSum.tatQualified += s.tatQualified; kpiSum.tatDead += s.tatDead; kpiSum.tatPending += s.tatPending;

                let cName = s.company?.trim().toUpperCase() || "UNKNOWN";
                if (cName === "VILLARAAG") cName = "VILLA RAAG";
                if (!companyMap[cName]) companyMap[cName] = { ...ZERO_SUM, name: cName, color: companyColor(cName) };
                const cm = companyMap[cName];
                cm.sent += s.sent; cm.responses += r;
                cm.qualified += s.qualified; cm.dead += s.dead; cm.pending += s.pending;
                cm.tatResponses += tr; cm.tatQualified += s.tatQualified; cm.tatDead += s.tatDead; cm.tatPending += s.tatPending;

                if (!sourceMap[s.source]) sourceMap[s.source] = { ...ZERO_SUM, name: s.source };
                const sm = sourceMap[s.source];
                sm.sent += s.sent; sm.responses += r;
                sm.qualified += s.qualified; sm.dead += s.dead; sm.pending += s.pending;

                const existing = daySourceMap.get(s.source);
                if (existing) {
                    const sComp = s.company.trim();
                    if (!existing.company.split(",").some(c => c.trim() === sComp)) existing.company += "," + sComp;
                    existing.sent += s.sent; existing.sentHigh += s.sentHigh; existing.sentMedium += s.sentMedium; existing.sentLow += s.sentLow;
                    existing.responses += s.responses; existing.respHigh += s.respHigh; existing.respMedium += s.respMedium; existing.respLow += s.respLow;
                    existing.qualified += s.qualified; existing.qualHigh += s.qualHigh; existing.qualMedium += s.qualMedium; existing.qualLow += s.qualLow;
                    existing.dead += s.dead; existing.deadHigh += s.deadHigh; existing.deadMedium += s.deadMedium; existing.deadLow += s.deadLow;
                    existing.pending += s.pending; existing.pendingHigh += s.pendingHigh; existing.pendingMedium += s.pendingMedium; existing.pendingLow += s.pendingLow;
                    existing.tatResponses += s.tatResponses; existing.tatQualified += s.tatQualified; existing.tatDead += s.tatDead; existing.tatPending += s.tatPending;
                } else {
                    daySourceMap.set(s.source, { ...s });
                }
            });

            if (daySourceMap.size > 0) {
                dateFilteredGroups.push({ ...dg, sources: Array.from(daySourceMap.values()) });
            }
        });

        const companyAgg = Object.values(companyMap).sort((a: any, b: any) => (b.sent ?? 0) - (a.sent ?? 0));
        const sourceAgg = Object.values(sourceMap).sort((a: any, b: any) => b.sent - a.sent).slice(0, 8);

        const last14 = [...dateFilteredGroups].slice(0, 14).reverse();
        const trendData = {
            labels: last14.map(d => d.displayDate),
            datasets: [
                { label: "Sent", data: last14.map(d => sumGroup(d.sources).sent), borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,.08)", fill: true, tension: 0.4, pointBackgroundColor: "#6366f1", pointRadius: 4, borderWidth: 2 },
                { label: "Qualified", data: last14.map(d => sumGroup(d.sources).qualified), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,.08)", fill: true, tension: 0.4, pointBackgroundColor: "#10b981", pointRadius: 4, borderWidth: 2 },
            ],
        };

        const barCompanyData = {
            labels: companyAgg.map((c: any) => c.name),
            datasets: [
                { label: "Sent", data: companyAgg.map((c: any) => c.sent), backgroundColor: "#6366f1", borderRadius: 4 },
                { label: "Qualified", data: companyAgg.map((c: any) => c.qualified), backgroundColor: "#10b981", borderRadius: 4 },
                { label: "Non-Qualified", data: companyAgg.map((c: any) => c.dead), backgroundColor: "#f87171", borderRadius: 4 },
                { label: "Pending", data: companyAgg.map((c: any) => c.pending), backgroundColor: "#c084fc", borderRadius: 4 },
            ],
        };
        const barSourceData = {
            labels: sourceAgg.map((s: any) => s.name),
            datasets: [
                { label: "Sent", data: sourceAgg.map((s: any) => s.sent), backgroundColor: "#6366f1", borderRadius: 4 },
                { label: "Qualified", data: sourceAgg.map((s: any) => s.qualified), backgroundColor: "#10b981", borderRadius: 4 },
                { label: "Non-Qualified", data: sourceAgg.map((s: any) => s.dead), backgroundColor: "#f87171", borderRadius: 4 },
                { label: "Pending", data: sourceAgg.map((s: any) => s.pending), backgroundColor: "#c084fc", borderRadius: 4 },
            ],
        };
        const barQualPct = {
            labels: companyAgg.map((c: any) => c.name),
            datasets: [
                { label: "Qualified %", data: companyAgg.map((c: any) => c.responses > 0 ? +((c.qualified / c.responses) * 100).toFixed(1) : 0), backgroundColor: "#10b981", borderRadius: 4 },
                { label: "Non-Qualified %", data: companyAgg.map((c: any) => c.responses > 0 ? +((c.dead / c.responses) * 100).toFixed(1) : 0), backgroundColor: "#f87171", borderRadius: 4 },
                { label: "Pending %", data: companyAgg.map((c: any) => c.sent > 0 ? +((c.pending / c.sent) * 100).toFixed(1) : 0), backgroundColor: "#c084fc", borderRadius: 4 },
            ],
        };
        const barSourceStacked = {
            labels: sourceAgg.map((s: any) => s.name),
            datasets: [
                { label: "Qualified", data: sourceAgg.map((s: any) => s.qualified), backgroundColor: "#10b981", borderRadius: 0 },
                { label: "Non-Qualified", data: sourceAgg.map((s: any) => s.dead), backgroundColor: "#f87171", borderRadius: 0 },
                { label: "Pending", data: sourceAgg.map((s: any) => s.pending), backgroundColor: "#c084fc", borderRadius: 0 },
            ],
        };

        const dynamicSources = Array.from(new Set(
            rawDateGroups.flatMap(dg => dg.sources.map(s => s.source))
        )).filter(n => n?.trim()).sort().map(n => ({ value: normalize(n), label: n, raw: n }));

        const dynamicCompanies = Array.from(new Set(
            rawDateGroups.flatMap(dg => dg.sources.map(s => s.company?.trim()).filter(Boolean))
        )).filter(n => n?.trim()).sort();

        return {
            dateFilteredGroups, kpi: kpiSum, companyAgg, sourceAgg,
            trendData, barCompanyData, barSourceData, barQualPct, barSourceStacked,
            dynamicSources, dynamicCompanies,
        };
    }, [rawDateGroups, priority, debouncedSearch, company, source]);

    const {
        dateFilteredGroups, kpi, companyAgg, sourceAgg,
        trendData, barCompanyData, barSourceData, barQualPct, barSourceStacked,
        dynamicSources, dynamicCompanies,
    } = stats;

    const kpiQualRate = kpi.responses > 0 ? ((kpi.qualified / kpi.responses) * 100).toFixed(1) + "%" : "0%";

    const doughnutPriority = useMemo(() => ({
        labels: ["High", "Medium", "Low"],
        datasets: [{ data: [kpi.sentHigh, kpi.sentMedium, kpi.sentLow], backgroundColor: ["#f87171", "#fbbf24", "#34d399"], borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }],
    }), [kpi]);

    // ── Loading screen ────────────────────────────────────────────────────────
    if (loading && rawDateGroups.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center min-h-[60vh]">
                <Image src="/grouploader.gif" alt="Loading" width={200} height={200} priority className="animate-pulse" />
                <p className="mt-4 text-base font-bold text-emerald-600 animate-pulse">Fetching latest AI Voice Call Summary...</p>
            </div>
        );
    }

    // ── Modal error toast ─────────────────────────────────────────────────────
    const ModalErrorToast = modalError ? (
        <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1070, background: "#991b1b", color: "#fff",
            padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        }}>
            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {modalError}
            <button onClick={() => setModalError(null)} style={{ marginLeft: 8, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, padding: "2px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                Dismiss
            </button>
        </div>
    ) : null;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="font-sans bg-[#f0f2f8] min-h-full text-slate-800">

            {/* ── Modals ─────────────────────────────────────────────────────── */}
            {modalLoading && <ModalLoader />}
            {ModalErrorToast}

            <KServeSentLeadsModal
                isOpen={modalState.open && modalState.modalType === "sent"}
                onClose={closeModal}
                meta={modalState.sentMeta}
            />

            <KServeRcvdLeadsModal
                isOpen={modalState.open && modalState.modalType === "rcvd"}
                onClose={closeModal}
                meta={modalState.rcvdMeta}
            />

            {/* ── Banner ── */}
            <div style={{ background: "linear-gradient(110deg,#1e1b4b 0%,#3730a3 40%,#4f46e5 75%,#6366f1 100%)", padding: "16px 20px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden", flexWrap: "wrap", gap: 12 }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}>{icons.chart(22)}</div>
                <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>AI Voice Lead Qualification — Summary Report</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 3 }}>KServe AI · Company-wise Performance Analysis &amp; Lead Qualification Insights</div>
                </div>

                <div className="hidden sm:flex" style={{ alignItems: "center", gap: 10, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                    {[
                        { val: String(kpi.sent), lbl: "Total Leads", color: "#fff" },
                        { val: String(kpi.qualified), lbl: "Qualified", color: "#6ee7b7" },
                        { val: String(kpi.dead), lbl: "Non-Qualified", color: "#fca5a5" },
                        { val: String(kpi.pending), lbl: "Pending", color: "#c084fc" },
                        { val: kpiQualRate, lbl: "Qual. Rate", color: "#fde68a" },
                    ].map(s => (
                        <div key={s.lbl} style={{ textAlign: "center", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "7px 12px", minWidth: 72 }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: 9, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 600, marginTop: 3 }}>{s.lbl}</div>
                        </div>
                    ))}
                </div>
                <div className="grid sm:hidden grid-cols-3 gap-2 mt-1 w-full" style={{ position: "relative", zIndex: 1 }}>
                    {[
                        { val: String(kpi.sent), lbl: "Leads", color: "#fff" },
                        { val: String(kpi.qualified), lbl: "Qual.", color: "#6ee7b7" },
                        { val: String(kpi.dead), lbl: "Dead", color: "#fca5a5" },
                        { val: String(kpi.pending), lbl: "Pend.", color: "#c084fc" },
                        { val: kpiQualRate, lbl: "Rate", color: "#fde68a" },
                    ].map(s => (
                        <div key={s.lbl} className="text-center" style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 7, padding: "6px 4px" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: 8.5, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600, marginTop: 2 }}>{s.lbl}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="mt-3 mx-3 sm:mx-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                                <p className="text-xs text-slate-500">Refine results by date, company, source and priority</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50">Clear Filters</Button>
                    </div>
                    <div className="px-5 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="flex flex-col gap-1.5 lg:col-span-2">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search</label>
                                <Input placeholder="Search company or source..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full rounded-md border-gray-300" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</label>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="Select range" /></SelectTrigger>
                                    <SelectContent>
                                        {[["all", "All"], ["today", "Today"], ["yesterday", "Yesterday"], ["this_week", "This Week"], ["last_week", "Last Week"], ["this_month", "This Month"], ["last_month", "Last Month"], ["this_year", "This Year"], ["last_year", "Last Year"], ["custom", "Custom"]].map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {dateFilter === "custom" && (
                                <div className="flex flex-col gap-1.5 lg:col-span-2">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Custom Range</label>
                                    <div className="flex gap-2">
                                        <Input type="date" value={customDate.start} onChange={e => setCustomDate(p => ({ ...p, start: e.target.value }))} className="h-10 rounded-md border-gray-300" />
                                        <Input type="date" value={customDate.end} onChange={e => setCustomDate(p => ({ ...p, end: e.target.value }))} className="h-10 rounded-md border-gray-300" />
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</label>
                                <Select value={company} onValueChange={setCompany}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Companies" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        {dynamicCompanies.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Source</label>
                                <Select value={source} onValueChange={setSource}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Sources" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        {dynamicSources.map(s => <SelectItem key={s.value} value={s.raw}>{s.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
                                <Select value={priority} onValueChange={setPriority}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Priorities</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            {!loading && (
                <div className="mx-3 sm:mx-5 mt-3">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { label: "Leads Sent", val: kpi.sent, pctOf: undefined, bg: "bg-blue-50/70", border: "border-blue-300", lc: "text-blue-700" },
                                { label: "Responses Received", val: kpi.responses, pctOf: kpi.sent, bg: "bg-amber-50/70", border: "border-amber-300", lc: "text-amber-700" },
                                { label: "Qualified", val: kpi.qualified, pctOf: kpi.responses, bg: "bg-emerald-50/70", border: "border-emerald-300", lc: "text-emerald-700" },
                                { label: "Dead / Non-Qualified", val: kpi.dead, pctOf: kpi.responses, bg: "bg-red-50/70", border: "border-red-300", lc: "text-red-700" },
                                { label: "Pending / Rescheduled", val: kpi.pending, pctOf: kpi.sent, bg: "bg-violet-50/70", border: "border-violet-300", lc: "text-violet-700" },
                            ].map((card, ci) => (
                                <div key={card.label} className={`${card.bg} border-2 ${card.border} rounded-lg p-3 shadow-sm hover:shadow-md transition relative`}>
                                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${card.lc} leading-tight mb-2`}>{card.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2 flex items-baseline gap-2 flex-wrap">
                                        {card.val ?? 0}
                                        {(card.pctOf ?? 0) > 0 && (
                                            <span className="text-sm font-semibold text-slate-800">
                                                ({(((card.val ?? 0) / (card.pctOf ?? 1)) * 100).toFixed(1)}%)
                                            </span>
                                        )}
                                        {ci !== 0 && (() => {
                                            const tatVals = [0, kpi.tatResponses, kpi.tatQualified, kpi.tatDead, kpi.tatPending];
                                            const counts = [kpi.sent, kpi.responses, kpi.qualified, kpi.dead, kpi.pending];
                                            const avgTat = counts[ci] > 0 ? tatVals[ci] / counts[ci] : 0;
                                            if (avgTat <= 0) return null;
                                            const dc = delayColor(avgTat);
                                            return (
                                                <span className={`inline-flex items-center ${dc.bg} border ${dc.border} rounded-full px-2 py-0.5`}>
                                                    <span className={`text-[10px] font-semibold ${dc.text}`}>{formatDelay(avgTat)}</span>
                                                </span>
                                            );
                                        })()}
                                    </p>
                                    <div className="flex flex-col gap-1 text-[10px]">
                                        {companyAgg.map((c: any) => {
                                            const vals = [c.sent, c.responses, c.qualified, c.dead, c.pending];
                                            const v = vals[ci] ?? 0;
                                            return (
                                                <div key={c.name} className="flex items-center justify-between gap-1">
                                                    <span className="font-medium" style={{ color: c.color }}>{c.name}:</span>
                                                    <span className="font-semibold flex items-center gap-1" style={{ color: c.color }}>
                                                        {(card.val ?? 0) > 0 ? `${v} (${((v / (card.val ?? 1)) * 100).toFixed(1)}%)` : String(v)}
                                                        {ci !== 0 && (() => {
                                                            const tatVals = [0, c.tatResponses, c.tatQualified, c.tatDead, c.tatPending];
                                                            const counts = [c.sent, c.responses, c.qualified, c.dead, c.pending];
                                                            const avgTat = counts[ci] > 0 ? tatVals[ci] / counts[ci] : 0;
                                                            if (avgTat <= 0) return null;
                                                            const dc = delayColor(avgTat);
                                                            return (
                                                                <span className={`text-[9px] font-semibold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                                                    {formatDelay(avgTat)}
                                                                </span>
                                                            );
                                                        })()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Source Breakdown ── */}
            <div className="mx-3 sm:mx-5 mt-3 mb-5">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md flex-shrink-0">{icons.dashboard(18)}</div>
                            <div>
                                <h3 className="text-[14px] font-bold text-slate-900 leading-tight">Source-wise Breakdown</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Date-wise Call performance — High · Medium · Low quality across all metrics</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                {(["table", "charts"] as const).map(v => (
                                    <button key={v} onClick={() => setView(v)}
                                        className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold transition-all"
                                        style={{ background: view === v ? "#4f46e5" : "#fff", color: view === v ? "#fff" : "#64748b", borderRight: v === "table" ? "1px solid #e2e8f0" : "none", fontFamily: "inherit", cursor: "pointer" }}>
                                        {v === "table" ? icons.table(12) : icons.chart(12)}
                                        {v === "table" ? "Table View" : "Analytics"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {view === "table" && (
                        loading
                            ? <TableSkeleton />
                            : error
                                ? <TableError message={error} onRetry={fetchData} />
                                : <CompanyBreakdownTable
                                    company={company}
                                    sourceFilter={source}
                                    dateGroups={dateFilteredGroups}
                                    search={debouncedSearch}
                                    priority={priority}
                                    onCellInteract={handleCellInteract}
                                />
                    )}

                    {view === "charts" && (
                        loading
                            ? <TableSkeleton />
                            : error
                                ? <TableError message={error} onRetry={fetchData} />
                                : (
                                    <div className="p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <ChartCard title="Company-wise Lead Performance" subtitle="Sent vs Qualified vs Non-Qualified vs Pending per company" iconBg="#eef2ff" iconColor="#4f46e5" icon={icons.dashboard()} legend={[{ color: "#6366f1", label: "Sent" }, { color: "#10b981", label: "Qualified" }, { color: "#f87171", label: "Non-Qualified" }, { color: "#c084fc", label: "Pending" }]}>
                                                <div style={{ position: "relative", height: 220 }}><Bar data={barCompanyData} options={{ ...commonBarOpts, plugins: { ...commonBarOpts.plugins, tooltip: { ...commonBarOpts.plugins.tooltip, ...performanceTooltip } } }} /></div>
                                            </ChartCard>
                                            <ChartCard title="Source-wise Lead Performance" subtitle="Sent vs Qualified vs Non-Qualified vs Pending per source" iconBg="#fef3c7" iconColor="#d97706" icon={<svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>} legend={[{ color: "#6366f1", label: "Sent" }, { color: "#10b981", label: "Qualified" }, { color: "#f87171", label: "Non-Qualified" }, { color: "#c084fc", label: "Pending" }]}>
                                                <div style={{ position: "relative", height: 220 }}><Bar data={barSourceData} options={{ ...commonBarOpts, plugins: { ...commonBarOpts.plugins, tooltip: { ...commonBarOpts.plugins.tooltip, ...performanceTooltip } } }} /></div>
                                            </ChartCard>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <ChartCard title="Priority Distribution" subtitle="All leads by priority level" iconBg="#fee2e2" iconColor="#dc2626" icon={<svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path d="M12 8v4l3 3" strokeWidth="2" strokeLinecap="round" /></svg>}>
                                                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <div style={{ maxWidth: 160, width: "100%" }}>
                                                        <Doughnut data={doughnutPriority} options={{ responsive: true, maintainAspectRatio: true, cutout: "68%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => { const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0"; return `${ctx.label}: ${ctx.parsed} leads (${pct}%)`; } } } } }} />
                                                    </div>
                                                </div>
                                                <ChartLegend items={[{ color: "#f87171", label: `High (${fmtPct(kpi.sentHigh, kpi.sent)}%)`, round: true }, { color: "#fbbf24", label: `Medium (${fmtPct(kpi.sentMedium, kpi.sent)}%)`, round: true }, { color: "#34d399", label: `Low (${fmtPct(kpi.sentLow, kpi.sent)}%)`, round: true }]} />
                                            </ChartCard>
                                            <ChartCard title="Qualification % by Company" subtitle="Qualified & Non-Qualified (% of Responses) vs Pending (% of Sent)" iconBg="#d1fae5" iconColor="#059669" icon={icons.check()} legend={[{ color: "#10b981", label: "Qualified %" }, { color: "#f87171", label: "Non-Qualified %" }, { color: "#c084fc", label: "Pending %" }]}>
                                                <div style={{ position: "relative", height: 220 }}><Bar data={barQualPct} options={{ ...commonBarOpts, indexAxis: "y" as const, scales: { x: { stacked: true, max: 100, ticks: { callback: (v: any) => v + "%", font: chartFont, color: "#64748b" }, grid: { color: "#f1f5f9" }, border: { display: false } }, y: { stacked: true, ticks: { font: chartFont, color: "#1e293b" }, grid: { display: false }, border: { display: false } } }, barPercentage: 0.6, categoryPercentage: 0.7 }} /></div>
                                            </ChartCard>
                                            <ChartCard title="Daily Qualification Trend" subtitle="Leads sent & qualified over time" iconBg="#ede9fe" iconColor="#7c3aed" icon={icons.trend()} legend={[{ color: "#6366f1", label: "Sent", round: true }, { color: "#10b981", label: "Qualified", round: true }]}>
                                                <div style={{ position: "relative", height: 220 }}><Line data={trendData} options={commonBarOpts} /></div>
                                            </ChartCard>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <ChartCard title="Qualification % by Source (Stacked)" subtitle="Qualified & Non-Qualified split across sources" iconBg="#dbeafe" iconColor="#2563eb" icon={<svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" /><path d="M3 9h18M9 21V9" strokeWidth="2" strokeLinecap="round" /></svg>} legend={[{ color: "#10b981", label: "Qualified" }, { color: "#f87171", label: "Non-Qualified" }, { color: "#c084fc", label: "Pending" }]}>
                                                <div style={{ position: "relative", height: 260 }}><Bar data={barSourceStacked} options={{ ...commonBarOpts, plugins: { ...commonBarOpts.plugins, tooltip: { ...commonBarOpts.plugins.tooltip, ...stackedTooltip } }, scales: { x: { stacked: true, ticks: { font: chartFont, color: "#64748b" }, grid: { display: false }, border: { display: false } }, y: { stacked: true, ticks: { font: chartFont, color: "#64748b" }, grid: { color: "#f1f5f9" }, border: { display: false } } }, barPercentage: 0.6, categoryPercentage: 0.7 }} /></div>
                                            </ChartCard>
                                            <ChartCard title="Overall Lead Status Split" subtitle={`${kpi.responses} total finalized responses — qualification outcome`} iconBg="#fce7f3" iconColor="#be185d" icon={<svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" /><path d="M12 8v4l3 3" strokeWidth="2" strokeLinecap="round" /></svg>}>
                                                <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <div style={{ maxWidth: 180, width: "100%" }}>
                                                        <Doughnut data={{ labels: ["Qualified", "Non-Qualified"], datasets: [{ data: [kpi.qualified, kpi.dead], backgroundColor: ["#10b981", "#f87171"], borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] }} options={{ responsive: true, maintainAspectRatio: true, cutout: "65%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => { const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0); const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0"; return `${ctx.label}: ${ctx.parsed} (${pct}%)`; } } } } }} />
                                                    </div>
                                                </div>
                                                <ChartLegend items={[
                                                    { color: "#10b981", label: `Qualified — ${kpi.qualified} (${fmtPct(kpi.qualified, kpi.responses)}%)`, round: true },
                                                    { color: "#f87171", label: `Non-Qualified — ${kpi.dead} (${fmtPct(kpi.dead, kpi.responses)}%)`, round: true },
                                                ]} />
                                            </ChartCard>
                                        </div>
                                    </div>
                                )
                    )}
                </div>
            </div>
        </div>
    );
}
