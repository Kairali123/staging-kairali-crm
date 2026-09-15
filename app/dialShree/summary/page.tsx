"use client";

import React, { useState, useMemo, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useDialShreeReceivedLeads, type DialShreeReceivedLead } from "@/hooks/useDialShreeReceivedLeads";
import { useDialShreeSentLeads, type DialShreeSentLead } from "@/hooks/useDialShreeSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search, Loader2, BarChart3, TrendingDown, TrendingUp, CheckCircle,
    XCircle, Clock, PhoneCall, PhoneOutgoing, PhoneIncoming, AlertTriangle,
    Download, Volume2, ExternalLink, X, RefreshCw, Layers, Calendar, ChevronDown,
    ChevronRight, ArrowUpDown, ArrowUp, User, Copy, Check, Filter
} from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

// ─── Center Text Plugin for Doughnut Charts ──────────────────────────────────
const centerTextPlugin = {
    id: "centerText",
    afterDraw: (chart: any) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const { width, height, left, top } = chartArea;
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const dataset = chart.data.datasets?.[0];
        if (!dataset) return;

        const active = chart.getActiveElements?.() || [];
        let mainText = "";
        let subText = "TOTAL";

        if (active.length > 0) {
            const idx = active[0].index;
            mainText = String(dataset.data[idx] || 0);
            subText = String(chart.data.labels?.[idx] ?? "").toUpperCase();
            if (subText.length > 16) subText = subText.slice(0, 14) + "…";
        } else {
            const total = dataset.data.reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);
            mainText = String(total);
        }

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 24px 'Inter', sans-serif";
        ctx.fillStyle = "#0f172a";
        ctx.fillText(mainText, centerX, centerY - 8);
        ctx.font = "600 10px 'Inter', sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(subText, centerX, centerY + 14);
        ctx.restore();
    },
};

// ─── Color & Style Helpers (Matches Received & Sent pages) ────────────────────

type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink";
type DotColor = "g" | "o" | "r" | "b" | "x";

const PILL_STYLES: Record<PillColor, React.CSSProperties> = {
    green: { background: "#d1fae5", color: "#065f46" },
    blue: { background: "#dbeafe", color: "#1e40af" },
    purple: { background: "#ede9fe", color: "#5b21b6" },
    orange: { background: "#ffedd5", color: "#9a3412" },
    red: { background: "#fee2e2", color: "#991b1b" },
    yellow: { background: "#fef3c7", color: "#92400e" },
    gray: { background: "#f1f5f9", color: "#475569" },
    teal: { background: "#ccfbf1", color: "#0f766e" },
    indigo: { background: "#e0e7ff", color: "#3730a3" },
    pink: { background: "#fce7f3", color: "#9d174d" },
};
const DOT: Record<DotColor, string> = { g: "#10b981", o: "#f59e0b", r: "#ef4444", b: "#3b82f6", x: "#94a3b8" };

function Pill({ label, color, dot }: { label: string; color: PillColor; dot?: DotColor }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", ...PILL_STYLES[color] }}>
            {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: DOT[dot], display: "inline-block" }} />}
            {label}
        </span>
    );
}

function Td({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    return <td className={className} style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>{children}</td>;
}

function Th({ children, style: extraStyle, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    return <th className={className} style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", ...extraStyle }}>{children}</th>;
}

function parseDurationSecs(val: any): number {
    if (!val || val === "—") return 0;
    if (typeof val === "number") return val;
    const s = String(val).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const parts = s.split(":").map(Number);
    if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
    return 0;
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m >= 60) {
        const h = Math.floor(m / 60);
        const remM = m % 60;
        return `${h}h ${remM}m ${s}s`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDisplayDate(val: any): string {
    if (!val || val === "—" || val === "null") return "—";
    const s = String(val).trim();
    if (!s) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        return `${m[3]}/${m[2]}/${m[1]}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
    return s;
}

function formatDisplayDateTime(val: any): string {
    if (!val || val === "—" || val === "null") return "—";
    const s = String(val).trim();
    if (!s) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(s)) return s;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (m) {
        const timePart = m[4] && m[5] ? ` ${m[4]}:${m[5]}` : "";
        return `${m[3]}/${m[2]}/${m[1]}${timePart}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    return s;
}

function getDateRange(range: string, custom?: { start: string; end: string }) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const now = new Date();
    const today = fmt(now);
    let from = "", to = today;

    switch (range) {
        case "all": return { from: null, to: null };
        case "today": from = today; break;
        case "yesterday": {
            const d = new Date(now);
            d.setDate(d.getDate() - 1);
            from = to = fmt(d);
            break;
        }
        case "this_week": {
            const d = new Date(now);
            const dayOfWeek = d.getDay();
            d.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            from = fmt(d);
            break;
        }
        case "last_week": {
            const d = new Date(now);
            const dayOfWeek = d.getDay();
            const thisMonday = new Date(d);
            thisMonday.setDate(thisMonday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(lastMonday.getDate() - 7);
            const lastSunday = new Date(thisMonday);
            lastSunday.setDate(lastSunday.getDate() - 1);
            from = fmt(lastMonday);
            to = fmt(lastSunday);
            break;
        }
        case "this_month":
            from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
            break;
        case "last_month": {
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last = new Date(now.getFullYear(), now.getMonth(), 0);
            from = fmt(first);
            to = fmt(last);
            break;
        }
        case "this_year":
            from = `${now.getFullYear()}-01-01`;
            break;
        case "last_year":
            from = `${now.getFullYear() - 1}-01-01`;
            to = `${now.getFullYear() - 1}-12-31`;
            break;
        case "custom":
            from = custom?.start || "";
            to = custom?.end || today;
            break;
        default:
            return { from: null, to: null };
    }

    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    return { from: fromDate, to: toDate };
}

// ─── Canonical Lost Categorization ────────────────────────────────────────────

const CANONICAL_LOST_CATEGORIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    "not_interested": { label: "Not Interested", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
    "max_dial_attempts": { label: "Max Auto Dial Attempts", color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
    "unreachable_disconnected": { label: "Wrong / Disconnected", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
    "cold_junk": { label: "Cold / Junk Lead", color: "#78716c", bg: "#f5f5f4", border: "#e7e5e4" },
    "declined_sale": { label: "Declined Sale / Budget", color: "#be185d", bg: "#fdf2f8", border: "#fbcfe8" },
    "dnc": { label: "DNC (Do Not Call)", color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
    "other_lost": { label: "Other Non-Qualified", color: "#854d0e", bg: "#fefce8", border: "#fef08a" },
};

function categorizeLostReason(outcome: string, notes?: string, endReason?: string): {
    key: string;
    label: string;
    color: string;
    bg: string;
    border: string;
} {
    const text = `${outcome || ""} ${notes || ""} ${endReason || ""}`.toLowerCase();

    if (text.includes("max auto dial") || text.includes("max attempt") || text.includes("dial attempts completed")) {
        return { key: "max_dial_attempts", ...CANONICAL_LOST_CATEGORIES["max_dial_attempts"] };
    }
    if (text.includes("dnc") || text.includes("do not call") || text.includes("don't call")) {
        return { key: "dnc", ...CANONICAL_LOST_CATEGORIES["dnc"] };
    }
    if (text.includes("wrong number") || text.includes("disconnected") || text.includes("dead air") || text.includes("invalid number") || text.includes("not reachable")) {
        return { key: "unreachable_disconnected", ...CANONICAL_LOST_CATEGORIES["unreachable_disconnected"] };
    }
    if (text.includes("declined sale") || text.includes("too costly") || text.includes("budget") || text.includes("price high")) {
        return { key: "declined_sale", ...CANONICAL_LOST_CATEGORIES["declined_sale"] };
    }
    if (text.includes("cold") || text.includes("junk") || text.includes("did not enquire") || text.includes("fake")) {
        return { key: "cold_junk", ...CANONICAL_LOST_CATEGORIES["cold_junk"] };
    }
    if (text.includes("not interested") || text.includes("not_interested") || text.includes("disinterested") || text.includes("no interest")) {
        return { key: "not_interested", ...CANONICAL_LOST_CATEGORIES["not_interested"] };
    }

    return {
        key: "other_lost",
        label: outcome ? outcome.slice(0, 24) : "Non-Qualified",
        color: "#854d0e",
        bg: "#fefce8",
        border: "#fef08a"
    };
}

function isAudioUrl(url: any): boolean {
    if (!url) return false;
    const u = String(url).toLowerCase().trim();
    if (!u.startsWith("http")) return false;
    return (
        u.includes(".mp3") ||
        u.includes(".wav") ||
        u.includes("kstorage") ||
        u.includes("squadiq") ||
        u.includes("recording") ||
        u.includes("knowlarity") ||
        u.includes("dialer") ||
        u.includes("/recordings/") ||
        u.includes("s3.amazonaws.com")
    );
}

// ─── Pagination Component (Identical to Received/Sent pages) ──────────────────

function Pagination({ total, page, perPage, onPage, onPerPage, itemLabel = "records" }: {
    total: number;
    page: number;
    perPage: number;
    onPage: (p: number) => void;
    onPerPage: (n: number) => void;
    itemLabel?: string;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total);
    const to = Math.min(page * perPage, total);
    const [goInput, setGoInput] = useState("");

    const handleGo = () => {
        const n = parseInt(goInput);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            onPage(n);
            setGoInput("");
        }
    };

    const getPages = (): (number | "…")[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "…")[] = [1];
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
        return pages;
    };

    const btn = (label: React.ReactNode, onClick: () => void, disabled: boolean, active = false, key?: string): React.ReactNode => (
        <button
            key={key}
            onClick={onClick}
            disabled={disabled}
            style={{
                height: 30,
                minWidth: 30,
                padding: "0 8px",
                border: active ? "none" : "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff",
                color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .12s"
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fafbfe" }}>
            <div style={{ fontSize: 12.5, color: "#64748b", whiteSpace: "nowrap" }}>
                Showing <strong style={{ color: "#1e2a4a" }}>{from}–{to}</strong> of <strong style={{ color: "#1e2a4a" }}>{total}</strong> {itemLabel}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {btn("«", () => onPage(1), page === 1, false, "first")}
                {btn("‹ Prev", () => onPage(page - 1), page === 1, false, "prev")}
                {getPages().map((p, i) => p === "…" ? <span key={`e${i}`} style={{ fontSize: 12.5, color: "#94a3b8", padding: "0 4px" }}>…</span> : btn(p, () => onPage(p as number), false, p === page, `page-${p}`))}
                {btn("Next ›", () => onPage(page + 1), page === totalPages, false, "next")}
                {btn("»", () => onPage(totalPages), page === totalPages, false, "last")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "#64748b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Rows/page</span>
                    <select
                        aria-label="Rows per page"
                        value={perPage}
                        onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
                        style={{ height: 30, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", cursor: "pointer" }}
                    >
                        {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Go to</span>
                    <input
                        aria-label="Go to page"
                        type="number"
                        min={1}
                        max={totalPages}
                        value={goInput}
                        onChange={e => setGoInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleGo()}
                        placeholder="Page"
                        style={{ height: 30, width: 56, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", textAlign: "center", outline: "none" }}
                    />
                    <button
                        onClick={handleGo}
                        style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}
                    >
                        Go
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page Inner Component ────────────────────────────────────────────────

function DialShreeSummaryPageInner() {
    const { user, hasPermission } = useAuth();

    // Data hooks
    const {
        data: receivedData,
        loading: receivedLoading,
        isRefreshing: receivedRefreshing,
        error: receivedError,
        refetch: refetchReceived
    } = useDialShreeReceivedLeads();

    const {
        data: sentData,
        loading: sentLoading,
        isRefreshing: sentRefreshing,
        error: sentError,
        refetch: refetchSent
    } = useDialShreeSentLeads();

    // View tab
    const [activeTab, setActiveTab] = useState<"summary" | "lost">("summary");

    // Global Filters
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("this_month");
    const [customDate, setCustomDate] = useState({ start: "", end: "" });
    const [companyFilter, setCompanyFilter] = useState("all");
    const [campaignFilter, setCampaignFilter] = useState("all");

    // Lost report specific filter
    const [lostCategoryFilter, setLostCategoryFilter] = useState("all");

    // Summary matrix grouping & pagination
    const [matrixGroupBy, setMatrixGroupBy] = useState<"company" | "date" | "campaign">("company");
    const [matrixPage, setMatrixPage] = useState(1);
    const [matrixPerPage, setMatrixPerPage] = useState(10);

    // Pagination for Lost Leads Table
    const [lostPage, setLostPage] = useState(1);
    const [lostPerPage, setLostPerPage] = useState(25);

    // Reset pagination when primary filters change
    useEffect(() => {
        setMatrixPage(1);
        setLostPage(1);
    }, [search, dateFilter, customDate, companyFilter, campaignFilter, matrixGroupBy]);

    // Modal drawer for lead inspection
    const [selectedLead, setSelectedLead] = useState<DialShreeReceivedLead | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Refresh handlers
    const isRefreshingAny = receivedRefreshing || sentRefreshing;
    const isLoading = (receivedLoading && receivedData.length === 0) || (sentLoading && sentData.length === 0);

    const handleSync = async () => {
        await Promise.allSettled([refetchReceived(), refetchSent()]);
    };

    const clearFilters = () => {
        setSearch("");
        setDateFilter("this_month");
        setCustomDate({ start: "", end: "" });
        setCompanyFilter("all");
        setCampaignFilter("all");
        setLostCategoryFilter("all");
        setLostPage(1);
        setMatrixPage(1);
    };

    // Date range calculation
    const dateWindow = useMemo(() => {
        return getDateRange(dateFilter, customDate);
    }, [dateFilter, customDate]);

    // Unique filter options
    const companyOptions = useMemo(() => {
        const set = new Set<string>();
        receivedData.forEach(r => { if (r.company && r.company !== "—") set.add(r.company); });
        sentData.forEach(s => { if (s.company && s.company !== "—") set.add(s.company); });
        return Array.from(set).sort();
    }, [receivedData, sentData]);

    const campaignOptions = useMemo(() => {
        const set = new Set<string>();
        receivedData.forEach(r => { if (r.campaign_name && r.campaign_name !== "—") set.add(r.campaign_name); });
        sentData.forEach(s => { if (s.campaignName && s.campaignName !== "—") set.add(s.campaignName); });
        return Array.from(set).sort();
    }, [receivedData, sentData]);

    // ─── Filtered Data Sets ───────────────────────────────────────────────────

    const filteredSent = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sentData.filter(s => {
            if (q) {
                const match =
                    (s.clientName && s.clientName.toLowerCase().includes(q)) ||
                    (s.mobile && String(s.mobile).includes(q)) ||
                    (s.email && s.email.toLowerCase().includes(q)) ||
                    (s.leadId && s.leadId.toLowerCase().includes(q)) ||
                    (s.campaignName && s.campaignName.toLowerCase().includes(q)) ||
                    (s.subjects && s.subjects.toLowerCase().includes(q));
                if (!match) return false;
            }

            if (dateWindow.from || dateWindow.to) {
                const ts = s._ts_num || s._enq_num || 0;
                if (!ts) return false;
                if (dateWindow.from && ts < dateWindow.from.getTime()) return false;
                if (dateWindow.to && ts > dateWindow.to.getTime()) return false;
            }

            if (companyFilter !== "all" && s.company !== companyFilter) return false;
            if (campaignFilter !== "all" && s.campaignName !== campaignFilter) return false;

            return true;
        });
    }, [sentData, search, dateWindow, companyFilter, campaignFilter]);

    const filteredReceived = useMemo(() => {
        const q = search.trim().toLowerCase();
        return receivedData.filter(r => {
            if (q) {
                const match =
                    (r.clientName && r.clientName.toLowerCase().includes(q)) ||
                    (r.mobile && String(r.mobile).includes(q)) ||
                    (r.email && r.email.toLowerCase().includes(q)) ||
                    (r.id && r.id.toLowerCase().includes(q)) ||
                    (r.campaign_name && r.campaign_name.toLowerCase().includes(q)) ||
                    (r.callstatus && r.callstatus.toLowerCase().includes(q)) ||
                    (r.transcription && r.transcription.toLowerCase().includes(q)) ||
                    (r.notes && r.notes.toLowerCase().includes(q));
                if (!match) return false;
            }

            if (dateWindow.from || dateWindow.to) {
                const ts = r._ts_num || r._dt_num || 0;
                if (!ts) return false;
                if (dateWindow.from && ts < dateWindow.from.getTime()) return false;
                if (dateWindow.to && ts > dateWindow.to.getTime()) return false;
            }

            if (companyFilter !== "all" && r.company !== companyFilter) return false;
            if (campaignFilter !== "all" && r.campaign_name !== campaignFilter) return false;

            return true;
        });
    }, [receivedData, search, dateWindow, companyFilter, campaignFilter]);

    // ─── Filtered Lost Leads ──────────────────────────────────────────────────

    const filteredLostLeads = useMemo(() => {
        return filteredReceived.filter(r => {
            const isNonQual =
                r.leadstatus === "Non-Qualified" ||
                (r.finalcallstatus && [
                    "cold", "not interested", "declined sale", "junk", "disconnected number",
                    "do not call", "dead air", "wrong number", "dnc", "max auto dial"
                ].some(k => r.finalcallstatus.toLowerCase().includes(k)));

            if (!isNonQual) return false;

            if (lostCategoryFilter !== "all") {
                const cat = categorizeLostReason(r.finalleadoutcome || r.callstatus, r.notes, r.callendreason);
                if (cat.key !== lostCategoryFilter) return false;
            }

            return true;
        });
    }, [filteredReceived, lostCategoryFilter]);

    // ─── High Level KPIs ──────────────────────────────────────────────────────

    const summaryKPIs = useMemo(() => {
        const totalSent = filteredSent.length;
        const totalReceived = filteredReceived.length;

        let totalQualified = 0;
        let totalLost = 0;
        let totalPending = 0;
        let totalCallDurationSecs = 0;
        let durationCount = 0;

        filteredReceived.forEach(r => {
            if (r.leadstatus === "Qualified") {
                totalQualified++;
            } else if (r.leadstatus === "Non-Qualified") {
                totalLost++;
            } else {
                totalPending++;
            }

            const d = parseDurationSecs(r.callduration);
            if (d > 0) {
                totalCallDurationSecs += d;
                durationCount++;
            }
        });

        const responseRate = totalSent > 0 ? ((totalReceived / totalSent) * 100).toFixed(1) : "0.0";
        const qualRate = totalReceived > 0 ? ((totalQualified / totalReceived) * 100).toFixed(1) : "0.0";
        const lostRate = totalReceived > 0 ? ((totalLost / totalReceived) * 100).toFixed(1) : "0.0";
        const pendingRate = totalSent > 0 ? ((totalPending / totalSent) * 100).toFixed(1) : "0.0";
        const avgDuration = durationCount > 0 ? Math.round(totalCallDurationSecs / durationCount) : 0;

        return {
            totalSent,
            totalReceived,
            totalQualified,
            totalLost,
            totalPending,
            responseRate,
            qualRate,
            lostRate,
            pendingRate,
            avgDuration,
        };
    }, [filteredSent, filteredReceived]);

    // ─── Lost Specific KPIs ───────────────────────────────────────────────────

    const lostKPIs = useMemo(() => {
        const counts: Record<string, number> = {
            total: filteredLostLeads.length,
            not_interested: 0,
            max_dial_attempts: 0,
            unreachable_disconnected: 0,
            cold_junk: 0,
            declined_sale: 0,
            dnc: 0,
            other_lost: 0
        };

        filteredLostLeads.forEach(r => {
            const cat = categorizeLostReason(r.finalleadoutcome || r.callstatus, r.notes, r.callendreason);
            counts[cat.key] = (counts[cat.key] || 0) + 1;
        });

        return counts;
    }, [filteredLostLeads]);

    // ─── Grouped Matrix for Summary Tab ───────────────────────────────────────

    interface MatrixRow {
        key: string;
        label: string;
        sent: number;
        received: number;
        qualified: number;
        lost: number;
        pending: number;
        avgDurationSecs: number;
        qualRate: string;
        lostRate: string;
        responseRate: string;
    }

    const matrixData = useMemo<MatrixRow[]>(() => {
        const map = new Map<string, {
            label: string;
            sent: number;
            received: number;
            qualified: number;
            lost: number;
            pending: number;
            totalDuration: number;
            durCount: number;
        }>();

        const getRowKey = (dateStr: string, company: string, campaign: string) => {
            if (matrixGroupBy === "date") return dateStr || "Unknown Date";
            if (matrixGroupBy === "company") return company || "Unassigned";
            return campaign || "Standard Campaign";
        };

        filteredSent.forEach(s => {
            const dateStr = formatDisplayDate(s.timestamp || s.enquiryDateTime);
            const k = getRowKey(dateStr, s.company, s.campaignName);
            const existing = map.get(k) || {
                label: k, sent: 0, received: 0, qualified: 0, lost: 0, pending: 0, totalDuration: 0, durCount: 0
            };
            existing.sent++;
            map.set(k, existing);
        });

        filteredReceived.forEach(r => {
            const dateStr = formatDisplayDate(r.timestamp || r.dateTime);
            const k = getRowKey(dateStr, r.company, r.campaign_name);
            const existing = map.get(k) || {
                label: k, sent: 0, received: 0, qualified: 0, lost: 0, pending: 0, totalDuration: 0, durCount: 0
            };
            existing.received++;

            if (r.leadstatus === "Qualified") existing.qualified++;
            else if (r.leadstatus === "Non-Qualified") existing.lost++;
            else existing.pending++;

            const d = parseDurationSecs(r.callduration);
            if (d > 0) {
                existing.totalDuration += d;
                existing.durCount++;
            }
            map.set(k, existing);
        });

        const rows: MatrixRow[] = Array.from(map.values()).map(v => {
            const qualRate = v.received > 0 ? ((v.qualified / v.received) * 100).toFixed(1) : "0.0";
            const lostRate = v.received > 0 ? ((v.lost / v.received) * 100).toFixed(1) : "0.0";
            const responseRate = v.sent > 0 ? ((v.received / v.sent) * 100).toFixed(1) : "0.0";
            const avgDurationSecs = v.durCount > 0 ? Math.round(v.totalDuration / v.durCount) : 0;

            return {
                key: v.label,
                label: v.label,
                sent: v.sent,
                received: v.received,
                qualified: v.qualified,
                lost: v.lost,
                pending: v.pending,
                avgDurationSecs,
                qualRate,
                lostRate,
                responseRate,
            };
        });

        return rows.sort((a, b) => (b.sent + b.received) - (a.sent + a.received));
    }, [filteredSent, filteredReceived, matrixGroupBy]);

    // ─── Chart Data ───────────────────────────────────────────────────────────

    const outcomeChartData = useMemo(() => {
        return {
            labels: ["Qualified", "Lost / Non-Qualified", "Pending / In-Hopper"],
            datasets: [
                {
                    data: [summaryKPIs.totalQualified, summaryKPIs.totalLost, summaryKPIs.totalPending],
                    backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
                    hoverBackgroundColor: ["#059669", "#dc2626", "#d97706"],
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            ],
        };
    }, [summaryKPIs]);

    const companyChartData = useMemo(() => {
        const companies = Array.from(new Set([...filteredReceived.map(r => r.company), ...filteredSent.map(s => s.company)]))
            .filter(Boolean)
            .slice(0, 6);

        const qualCounts = companies.map(c => filteredReceived.filter(r => r.company === c && r.leadstatus === "Qualified").length);
        const lostCounts = companies.map(c => filteredReceived.filter(r => r.company === c && r.leadstatus === "Non-Qualified").length);
        const sentCounts = companies.map(c => filteredSent.filter(s => s.company === c).length);

        return {
            labels: companies,
            datasets: [
                {
                    label: "Sent",
                    data: sentCounts,
                    backgroundColor: "#6366f1",
                    borderRadius: 4,
                },
                {
                    label: "Qualified",
                    data: qualCounts,
                    backgroundColor: "#10b981",
                    borderRadius: 4,
                },
                {
                    label: "Lost",
                    data: lostCounts,
                    backgroundColor: "#f43f5e",
                    borderRadius: 4,
                },
            ],
        };
    }, [filteredReceived, filteredSent]);

    const lostReasonChartData = useMemo(() => {
        const labels: string[] = [];
        const data: number[] = [];
        const colors: string[] = [
            "#ef4444", "#f97316", "#64748b", "#78716c", "#ec4899", "#dc2626", "#eab308"
        ];

        Object.entries(CANONICAL_LOST_CATEGORIES).forEach(([key, info]) => {
            const count = lostKPIs[key] || 0;
            if (count > 0) {
                labels.push(info.label);
                data.push(count);
            }
        });

        return {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: "#ffffff",
                },
            ],
        };
    }, [lostKPIs]);

    // ─── CSV Download Handler ─────────────────────────────────────────────────

    const handleDownloadCSV = () => {
        if (activeTab === "summary") {
            const headers = ["Dimension", "Leads Sent", "Responses Received", "Response %", "Qualified", "Qual %", "Lost / Non-Qual", "Lost %", "Pending", "Avg Duration"];
            const rows = matrixData.map(m => [
                m.label,
                m.sent,
                m.received,
                `${m.responseRate}%`,
                m.qualified,
                `${m.qualRate}%`,
                m.lost,
                `${m.lostRate}%`,
                m.pending,
                formatDuration(m.avgDurationSecs),
            ]);
            const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dialer_summary_${matrixGroupBy}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            const headers = ["#", "Lead ID", "Client Name", "Mobile", "Email", "Company", "Campaign", "Date Time", "Lost Reason", "Call End Reason", "Duration (s)", "Recording URL", "Notes"];
            const rows = filteredLostLeads.map((r, i) => [
                i + 1,
                r.id,
                r.clientName,
                r.mobile,
                r.email,
                r.company,
                r.campaign_name,
                r.callstarttime || r.dateTime,
                r.finalleadoutcome || r.callstatus,
                r.callendreason,
                r.callduration,
                r.latest_recording_url || r.ivrUrl,
                r.transcription || r.notes,
            ]);
            const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `dialer_lost_leads_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    // ─── Pagination Slicing ──────────────────────────────────────────────────

    const paginatedMatrixData = useMemo(() => {
        const start = (matrixPage - 1) * matrixPerPage;
        return matrixData.slice(start, start + matrixPerPage);
    }, [matrixData, matrixPage, matrixPerPage]);

    const paginatedLostLeads = useMemo(() => {
        const start = (lostPage - 1) * lostPerPage;
        return filteredLostLeads.slice(start, start + lostPerPage);
    }, [filteredLostLeads, lostPage, lostPerPage]);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(key);
        setTimeout(() => setCopiedId(null), 1800);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col items-center justify-center p-6">
                <Image src="/grouploader.gif" alt="Loading" width={180} height={180} priority className="animate-pulse" />
                <p className="mt-4 text-base font-bold text-indigo-600 animate-pulse">
                    Aggregating DialShree Performance &amp; Lost Call Logs...
                </p>
                <p className="text-xs text-slate-500 mt-1">Synchronizing live records from database</p>
            </div>
        );
    }

    return (
        <div className="font-sans bg-[#f0f2f8] min-h-full text-slate-800 pb-12">
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes kpi-pulse { 0%,100% { opacity:1; } 50% { opacity:0.38; } }
                .summary-table-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background .12s;
                }
                .summary-table-row:hover {
                    background: #e0e7ff !important;
                }
            `}</style>

            {/* 1. Header Banner (Full width matching DialShree Received/Sent) */}
            <div style={{ background: "linear-gradient(110deg,#3730a3 0%,#4f46e5 45%,#6366f1 100%)", padding: "14px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}>
                    <BarChart3 className="w-5 h-5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>DialShree Dialer Analytics &amp; Reports</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>DialShree Calling Portal · Performance Summary &amp; Lost Call Analysis</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {isRefreshingAny && (
                        <div className="hidden md:flex items-center gap-2 text-white/70 text-[11px] font-medium animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Background Syncing...
                        </div>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={isRefreshingAny}
                        style={{
                            background: "rgba(255,255,255,.15)",
                            border: "1px solid rgba(255,255,255,.2)",
                            borderRadius: 8,
                            height: 38,
                            padding: "0 14px",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: isRefreshingAny ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            transition: "all .2s"
                        }}
                        onMouseEnter={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
                        onMouseLeave={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
                    >
                        <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: isRefreshingAny ? "spin 0.8s linear infinite" : "none" }} />
                        {isRefreshingAny ? "Refreshing..." : "Sync Data"}
                    </button>
                    <button
                        onClick={handleDownloadCSV}
                        style={{
                            background: "#fff",
                            border: "1px solid #fff",
                            borderRadius: 8,
                            height: 38,
                            padding: "0 14px",
                            color: "#3730a3",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            transition: "all .2s"
                        }}
                    >
                        <Download className="w-3.5 h-3.5 text-indigo-700" />
                        Export {activeTab === "summary" ? "Summary" : "Lost"} CSV
                    </button>
                </div>
            </div>

            {/* Error banner if any */}
            {(receivedError || sentError) && (
                <div className="mt-3 mx-2 sm:mx-4 lg:mx-5">
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 16px", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>⚠️ {receivedError || sentError}</div>
                        <Button onClick={handleSync} size="sm" variant="outline" className="border-rose-300 text-rose-800 bg-white h-7 text-xs">Retry</Button>
                    </div>
                </div>
            )}

            {/* 2. Filters & Search Box (Identical signature CRM layout from Received/Sent) */}
            <div className="mt-3 mx-2 sm:mx-4 lg:mx-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-sm border border-blue-700/30">
                                <Search className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Filters &amp; Search</h3>
                                <p className="text-[11px] text-slate-500">Refine metrics and locate dialed calls and lost opportunities</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50 h-8 text-xs">
                            Clear Filters
                        </Button>
                    </div>

                    <div className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                            {/* Search Leads */}
                            <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Search Leads</label>
                                <Input
                                    placeholder="Name, email, phone, lead ID, campaign, remarks..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                    className="h-9 w-full rounded-md border-gray-300 text-xs"
                                />
                            </div>

                            {/* Date Range */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date Range</label>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="h-9 w-full rounded-md border-gray-300 text-xs"><SelectValue placeholder="Select range" /></SelectTrigger>
                                    <SelectContent>
                                        {[["all", "All Time"], ["today", "Today"], ["yesterday", "Yesterday"], ["this_week", "This Week"], ["last_week", "Last Week"], ["this_month", "This Month"], ["last_month", "Last Month"], ["this_year", "This Year"], ["last_year", "Last Year"], ["custom", "Custom Range"]].map(([v, l]) => (
                                            <SelectItem key={v} value={v}>{l}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Company */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company</label>
                                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                                    <SelectTrigger className="h-9 w-full rounded-md border-gray-300 text-xs"><SelectValue placeholder="All Companies" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        {companyOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campaign */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Campaign</label>
                                <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                                    <SelectTrigger className="h-9 w-full rounded-md border-gray-300 text-xs"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Campaigns</SelectItem>
                                        {campaignOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom date row */}
                        {dateFilter === "custom" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Start Date</label>
                                    <Input type="date" value={customDate.start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate({ ...customDate, start: e.target.value })} className="h-9 w-full rounded-md border-gray-300 text-xs" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">End Date</label>
                                    <Input type="date" value={customDate.end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate({ ...customDate, end: e.target.value })} className="h-9 w-full rounded-md border-gray-300 text-xs" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Tab Switcher Navigation Bar (Matches CRM design) */}
            <div className="mt-4 mx-2 sm:mx-4 lg:mx-5">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "8px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                            onClick={() => setActiveTab("summary")}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "7px 16px",
                                borderRadius: 8,
                                border: "none",
                                background: activeTab === "summary" ? "#4f46e5" : "transparent",
                                color: activeTab === "summary" ? "#fff" : "#475569",
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all .15s"
                            }}
                        >
                            <BarChart3 className="w-4 h-4" />
                            <span>Dialer Summary Report</span>
                            <span style={{
                                background: activeTab === "summary" ? "rgba(255,255,255,0.22)" : "#f1f5f9",
                                color: activeTab === "summary" ? "#fff" : "#475569",
                                borderRadius: 20,
                                padding: "1px 7px",
                                fontSize: 11,
                                fontWeight: 800
                            }}>
                                {summaryKPIs.totalReceived}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("lost")}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 7,
                                padding: "7px 16px",
                                borderRadius: 8,
                                border: "none",
                                background: activeTab === "lost" ? "#e11d48" : "transparent",
                                color: activeTab === "lost" ? "#fff" : "#475569",
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all .15s"
                            }}
                        >
                            <TrendingDown className="w-4 h-4" />
                            <span>Lost / Non-Qualified Report</span>
                            <span style={{
                                background: activeTab === "lost" ? "rgba(255,255,255,0.22)" : "#ffe4e6",
                                color: activeTab === "lost" ? "#fff" : "#9f1239",
                                borderRadius: 20,
                                padding: "1px 7px",
                                fontSize: 11,
                                fontWeight: 800
                            }}>
                                {summaryKPIs.totalLost}
                            </span>
                        </button>
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b" }}>
                        {activeTab === "summary" ? (
                            <span>Combined throughput, response rates &amp; qualification waterfall</span>
                        ) : (
                            <span>Detailed analysis and audit register of dropped call leads</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: DIALER SUMMARY REPORT                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "summary" && (
                <div className="mt-4 mx-2 sm:mx-4 lg:mx-5 space-y-4">
                    {/* KPI Breakdown Container (Signature DialShree Status Breakdown design) */}
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg, #f8faff 0%, #ffffff 100%)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e0e7ff", color: "#4338ca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #4338ca28" }}>
                                    <BarChart3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>Dialer Performance &amp; Throughput Overview</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Outbound Queue Dispatch, Response Rate &amp; Conversion Ratios</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "4px 12px", color: "#1d4ed8", fontSize: 11.5, fontWeight: 600 }}>
                                    <span>Total Handled</span>
                                    <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{summaryKPIs.totalReceived}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: "16px 20px" }}>
                            <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#6366f1", textTransform: "uppercase" as const, marginBottom: 14 }}>
                                    Key Performance Indicators
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                                    {/* Card: Outbound Sent */}
                                    <div style={{ background: "#eef2ff", border: "1.5px solid #c7d2fe", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4f46e5", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#4f46e5" }}>Outbound Sent</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>📤</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-1.5px" }}>{summaryKPIs.totalSent.toLocaleString()}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#4f46e518", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5" }}>100% Leads Sent</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Calls Handled */}
                                    <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#2563eb" }}>Calls Handled</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>📞</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-1.5px" }}>{summaryKPIs.totalReceived.toLocaleString()}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#2563eb18", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#2563eb" }}>{summaryKPIs.responseRate}% Response</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Qualified */}
                                    <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#059669" }}>Qualified</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>✅</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#065f46", lineHeight: 1, letterSpacing: "-1.5px" }}>{summaryKPIs.totalQualified.toLocaleString()}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#05966918", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#059669" }}>{summaryKPIs.qualRate}% Conversion</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Lost */}
                                    <div style={{ background: "#fff1f2", border: "1.5px solid #fecdd3", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e11d48", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#e11d48" }}>Lost / Non-Qual</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>❌</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#9f1239", lineHeight: 1, letterSpacing: "-1.5px" }}>{summaryKPIs.totalLost.toLocaleString()}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#e11d4818", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#e11d48" }}>{summaryKPIs.lostRate}% Drop-off</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Pending */}
                                    <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d97706", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#d97706" }}>Pending / Queue</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>🕒</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#92400e", lineHeight: 1, letterSpacing: "-1.5px" }}>{summaryKPIs.totalPending.toLocaleString()}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#d9770618", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>{summaryKPIs.pendingRate}% In Hopper</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card: Avg Duration */}
                                    <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#475569", display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "#475569" }}>Avg Duration</span>
                                            </div>
                                            <span style={{ fontSize: 15 }}>⏱️</span>
                                        </div>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-1.5px" }}>{formatDuration(summaryKPIs.avgDuration)}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: "#47556918", borderRadius: 20, padding: "2px 9px" }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>Average Talk Time</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Doughnut: Conversion Funnel Outcome */}
                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Call Outcome Distribution</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Disposition breakdown across handled calls</div>
                                </div>
                                <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                    Total: {summaryKPIs.totalReceived}
                                </span>
                            </div>
                            <div className="relative h-56 flex items-center justify-center">
                                {summaryKPIs.totalReceived > 0 ? (
                                    <Doughnut
                                        data={outcomeChartData}
                                        plugins={[centerTextPlugin]}
                                        options={{
                                            maintainAspectRatio: false,
                                            cutout: "70%",
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    callbacks: {
                                                        label: (context) => {
                                                            const val = Number(context.raw) || 0;
                                                            const total = summaryKPIs.totalReceived || 1;
                                                            const pct = ((val / total) * 100).toFixed(1);
                                                            return ` ${context.label}: ${val} (${pct}%)`;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: 12, color: "#94a3b8" }}>No calls recorded for this period</div>
                                )}
                            </div>
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", textAlign: "center" }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{summaryKPIs.totalQualified}</div>
                                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Qualified</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#e11d48" }}>{summaryKPIs.totalLost}</div>
                                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Lost</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#d97706" }}>{summaryKPIs.totalPending}</div>
                                    <div style={{ fontSize: 10.5, color: "#64748b" }}>Pending</div>
                                </div>
                            </div>
                        </div>

                        {/* Bar Chart: Company Throughput & Outcomes */}
                        <div className="lg:col-span-2" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Company Throughput &amp; Outcomes</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Sent vs Qualified vs Lost volume by entity</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#64748b" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#6366f1" }} /> Sent</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#10b981" }} /> Qualified</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f43f5e" }} /> Lost</span>
                                </div>
                            </div>
                            <div className="relative h-64">
                                <Bar
                                    data={companyChartData}
                                    options={{
                                        maintainAspectRatio: false,
                                        responsive: true,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { grid: { display: false } },
                                            y: { grid: { color: "#f1f5f9" } }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Matrix Table (Matches signature DialShree dark-header table) */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#dbeafe", color: "#1d4ed8" }}>
                                    <BarChart3 className="w-4 h-4" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>Summary Performance Matrix</div>
                                    <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Aggregated dialer delivery and outcome ratios</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Group by:</span>
                                <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2 }}>
                                    {(["company", "date", "campaign"] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => setMatrixGroupBy(mode)}
                                            style={{
                                                padding: "4px 12px",
                                                borderRadius: 6,
                                                border: "none",
                                                background: matrixGroupBy === mode ? "#4f46e5" : "transparent",
                                                color: matrixGroupBy === mode ? "#fff" : "#475569",
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                textTransform: "capitalize",
                                                transition: "all .12s"
                                            }}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#1e2a4a" }}>
                                        <Th style={{ minWidth: 150 }}>{matrixGroupBy === "date" ? "Date" : matrixGroupBy === "company" ? "Company" : "Campaign"}</Th>
                                        <Th style={{ textAlign: "right" }}>Sent Leads</Th>
                                        <Th style={{ textAlign: "right" }}>Calls Handled</Th>
                                        <Th style={{ textAlign: "right" }}>Response %</Th>
                                        <Th style={{ textAlign: "right" }}>Qualified</Th>
                                        <Th style={{ textAlign: "right" }}>Qual %</Th>
                                        <Th style={{ textAlign: "right" }}>Lost / Non-Qual</Th>
                                        <Th style={{ textAlign: "right" }}>Lost %</Th>
                                        <Th style={{ textAlign: "right" }}>Pending</Th>
                                        <Th style={{ textAlign: "right", paddingRight: 16 }}>Avg Duration</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedMatrixData.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                                No matrix records match the selected filters
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedMatrixData.map((row, i) => (
                                            <tr key={row.key + i} className="summary-table-row">
                                                <Td style={{ fontWeight: 700, color: "#1e293b" }}>{row.label}</Td>
                                                <Td style={{ textAlign: "right", fontWeight: 600 }}>{row.sent.toLocaleString()}</Td>
                                                <Td style={{ textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>{row.received.toLocaleString()}</Td>
                                                <Td style={{ textAlign: "right", color: "#1d4ed8", fontWeight: 800 }}>{row.responseRate}%</Td>
                                                <Td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>{row.qualified.toLocaleString()}</Td>
                                                <Td style={{ textAlign: "right", color: "#059669", fontWeight: 800 }}>{row.qualRate}%</Td>
                                                <Td style={{ textAlign: "right", fontWeight: 700, color: "#e11d48" }}>
                                                    <button
                                                        onClick={() => {
                                                             if (matrixGroupBy === "company") setCompanyFilter(row.label);
                                                             if (matrixGroupBy === "campaign") setCampaignFilter(row.label);
                                                             setActiveTab("lost");
                                                        }}
                                                        style={{ color: "#e11d48", fontWeight: 800, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                                                        title="Click to view lost leads for this group"
                                                    >
                                                        {row.lost.toLocaleString()}
                                                    </button>
                                                </Td>
                                                <Td style={{ textAlign: "right", color: "#e11d48", fontWeight: 800 }}>{row.lostRate}%</Td>
                                                <Td style={{ textAlign: "right", fontWeight: 600, color: "#b45309" }}>{row.pending.toLocaleString()}</Td>
                                                <Td style={{ textAlign: "right", paddingRight: 16, fontFamily: "monospace", color: "#475569" }}>{formatDuration(row.avgDurationSecs)}</Td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {matrixData.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: "#f8fafc", fontWeight: 800, borderTop: "2px solid #e2e8f0" }}>
                                            <Td style={{ fontWeight: 800, color: "#0f172a" }}>Grand Total</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800 }}>{summaryKPIs.totalSent.toLocaleString()}</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#1d4ed8" }}>{summaryKPIs.totalReceived.toLocaleString()}</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#1d4ed8" }}>{summaryKPIs.responseRate}%</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#059669" }}>{summaryKPIs.totalQualified.toLocaleString()}</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#059669" }}>{summaryKPIs.qualRate}%</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#e11d48" }}>{summaryKPIs.totalLost.toLocaleString()}</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#e11d48" }}>{summaryKPIs.lostRate}%</Td>
                                            <Td style={{ textAlign: "right", fontWeight: 800, color: "#b45309" }}>{summaryKPIs.totalPending.toLocaleString()}</Td>
                                            <Td style={{ textAlign: "right", paddingRight: 16, fontFamily: "monospace" }}>{formatDuration(summaryKPIs.avgDuration)}</Td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>

                        {/* Summary Matrix Pagination */}
                        <Pagination
                            total={matrixData.length}
                            page={matrixPage}
                            perPage={matrixPerPage}
                            onPage={setMatrixPage}
                            onPerPage={setMatrixPerPage}
                            itemLabel="groups"
                        />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: LOST / NON-QUALIFIED REPORT                              */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === "lost" && (
                <div className="mt-4 mx-2 sm:mx-4 lg:mx-5 space-y-4">
                    {/* Lost Status Breakdown Container (Signature DialShree design) */}
                    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg, #fff1f2 0%, #ffffff 100%)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: "#ffe4e6", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #e11d4828" }}>
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>DialShree Lost / Non-Qualified Call Audit</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Dropped Lead Categorization &amp; Reasons for Non-Conversion</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ffe4e6", border: "1px solid #fecdd3", borderRadius: 20, padding: "4px 12px", color: "#9f1239", fontSize: 11.5, fontWeight: 600 }}>
                                    <span>Total Lost</span>
                                    <span style={{ background: "#e11d48", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{lostKPIs.total}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: "16px 20px" }}>
                            <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#e11d48", textTransform: "uppercase" as const, marginBottom: 14 }}>
                                    Lost Reason Categories
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                                    {/* Not Interested */}
                                    <div style={{ background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#b91c1c" }}>Not Interested</span>
                                            <span style={{ fontSize: 14 }}>🚫</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{lostKPIs.not_interested}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c" }}>
                                            {lostKPIs.total > 0 ? ((lostKPIs.not_interested / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>

                                    {/* Max Auto Dial */}
                                    <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#c2410c" }}>Max Auto Dial</span>
                                            <span style={{ fontSize: 14 }}>🔁</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{lostKPIs.max_dial_attempts}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c" }}>
                                            {lostKPIs.total > 0 ? ((lostKPIs.max_dial_attempts / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>

                                    {/* Wrong / Disconnected */}
                                    <div style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#475569" }}>Wrong / Dead Number</span>
                                            <span style={{ fontSize: 14 }}>📵</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{lostKPIs.unreachable_disconnected}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>
                                            {lostKPIs.total > 0 ? ((lostKPIs.unreachable_disconnected / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>

                                    {/* Cold / Junk */}
                                    <div style={{ background: "#f5f5f4", border: "1.5px solid #d6d3d1", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#78716c" }}>Cold / Junk Lead</span>
                                            <span style={{ fontSize: 14 }}>❄️</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{lostKPIs.cold_junk}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#78716c" }}>
                                            {lostKPIs.total > 0 ? ((lostKPIs.cold_junk / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>

                                    {/* Declined Sale / Budget */}
                                    <div style={{ background: "#fdf2f8", border: "1.5px solid #fbcfe8", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#be185d" }}>Declined Sale / Budget</span>
                                            <span style={{ fontSize: 14 }}>💸</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{lostKPIs.declined_sale}</div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#be185d" }}>
                                            {lostKPIs.total > 0 ? ((lostKPIs.declined_sale / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>

                                    {/* DNC & Other */}
                                    <div style={{ background: "#fefce8", border: "1.5px solid #fef08a", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "#854d0e" }}>DNC &amp; Other Lost</span>
                                            <span style={{ fontSize: 14 }}>⚠️</span>
                                        </div>
                                        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                                            {(lostKPIs.dnc || 0) + (lostKPIs.other_lost || 0)}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "#854d0e" }}>
                                            {lostKPIs.total > 0 ? ((((lostKPIs.dnc || 0) + (lostKPIs.other_lost || 0)) / lostKPIs.total) * 100).toFixed(1) : "0"}% of lost
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Visual Charts & Category Filter Chips */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Doughnut: Lost Proportions */}
                        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>Lost Reason Share</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Proportions of drop-off reasons</div>
                                </div>
                                <span style={{ background: "#ffe4e6", color: "#9f1239", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                                    {lostKPIs.total} Lost
                                </span>
                            </div>
                            <div className="relative h-56 flex items-center justify-center">
                                {lostKPIs.total > 0 ? (
                                    <Doughnut
                                        data={lostReasonChartData}
                                        plugins={[centerTextPlugin]}
                                        options={{
                                            maintainAspectRatio: false,
                                            cutout: "70%",
                                            plugins: { legend: { display: false } }
                                        }}
                                    />
                                ) : (
                                    <div style={{ fontSize: 12, color: "#94a3b8" }}>No lost records found</div>
                                )}
                            </div>
                        </div>

                        {/* Interactive Filter Chips */}
                        <div className="lg:col-span-2" style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Filter Table by Lost Category</div>
                                <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 14 }}>Click any pill below to instantly isolate specific failure modes</div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    <button
                                        onClick={() => { setLostCategoryFilter("all"); setLostPage(1); }}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            border: "1px solid #cbd5e1",
                                            background: lostCategoryFilter === "all" ? "#1e2a4a" : "#f8fafc",
                                            color: lostCategoryFilter === "all" ? "#fff" : "#334155",
                                            cursor: "pointer",
                                            transition: "all .12s"
                                        }}
                                    >
                                        All Categories ({lostKPIs.total})
                                    </button>

                                    {Object.entries(CANONICAL_LOST_CATEGORIES).map(([key, info]) => {
                                        const count = lostKPIs[key] || 0;
                                        const active = lostCategoryFilter === key;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => { setLostCategoryFilter(active ? "all" : key); setLostPage(1); }}
                                                style={{
                                                    padding: "6px 12px",
                                                    borderRadius: 8,
                                                    fontSize: 11.5,
                                                    fontWeight: 700,
                                                    border: `1.5px solid ${info.border}`,
                                                    background: active ? info.color : info.bg,
                                                    color: active ? "#ffffff" : info.color,
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                    transition: "all .12s"
                                                }}
                                            >
                                                <span>{info.label}</span>
                                                <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#fff", color: active ? "#fff" : info.color, borderRadius: 12, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px dashed #cbd5e1", fontSize: 11.5, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                <span>Tip: Leads under &ldquo;Max Auto Dial Attempts&rdquo; or &ldquo;Wrong Number&rdquo; can be re-routed to WhatsApp outreach before discarding.</span>
                            </div>
                        </div>
                    </div>

                    {/* Lost Leads Detailed Data Table (Signature DialShree dark-header table) */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#fee2e2", color: "#991b1b" }}>
                                    <TrendingDown className="w-4 h-4" />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>
                                    DialShree Lost Leads Register ({filteredLostLeads.length} records)
                                </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDownloadCSV}
                                    className="h-8 text-xs font-semibold bg-white"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
                                    Export Lost Leads
                                </Button>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#1e2a4a" }}>
                                        <Th style={{ width: 48, textAlign: "center" }}>#</Th>
                                        <Th>Lead ID</Th>
                                        <Th>Client Details</Th>
                                        <Th>Company</Th>
                                        <Th>Campaign</Th>
                                        <Th>Call Date &amp; Time</Th>
                                        <Th>Lost Reason / Outcome</Th>
                                        <Th>Hangup Reason</Th>
                                        <Th style={{ textAlign: "center" }}>Duration</Th>
                                        <Th style={{ textAlign: "center" }}>Recording</Th>
                                        <Th style={{ textAlign: "right", paddingRight: 14 }}>Action</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLostLeads.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} style={{ padding: 36, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                                No lost leads found matching your criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedLostLeads.map((lead, idx) => {
                                            const globalIdx = (lostPage - 1) * lostPerPage + idx + 1;
                                            const cat = categorizeLostReason(lead.finalleadoutcome || lead.callstatus, lead.notes, lead.callendreason);
                                            const hasAudio = isAudioUrl(lead.latest_recording_url || lead.ivrUrl);

                                            return (
                                                <tr key={lead.id || idx} className="summary-table-row">
                                                    <Td style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}>
                                                        {globalIdx}
                                                    </Td>
                                                    <Td>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>{lead.id}</span>
                                                            <button
                                                                onClick={() => handleCopy(lead.id, `id-${lead.id}`)}
                                                                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}
                                                                title="Copy Lead ID"
                                                            >
                                                                {copiedId === `id-${lead.id}` ? (
                                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <div style={{ fontWeight: 700, color: "#1e293b" }}>{lead.clientName || "—"}</div>
                                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{lead.mobile || "—"}</div>
                                                    </Td>
                                                    <Td>
                                                        <Pill label={lead.company || "General"} color="indigo" />
                                                    </Td>
                                                    <Td>
                                                        <span style={{ fontSize: 11.5, color: "#475569" }} title={lead.campaign_name}>
                                                            {lead.campaign_name || "—"}
                                                        </span>
                                                    </Td>
                                                    <Td style={{ fontSize: 11, color: "#64748b" }}>
                                                        {formatDisplayDateTime(lead.callstarttime || lead.timestamp || lead.dateTime)}
                                                    </Td>
                                                    <Td>
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 4,
                                                                padding: "2px 8px",
                                                                borderRadius: 20,
                                                                fontSize: 10.5,
                                                                fontWeight: 700,
                                                                background: cat.bg,
                                                                color: cat.color,
                                                                border: `1px solid ${cat.border}`,
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cat.color }} />
                                                            {lead.finalleadoutcome || lead.callstatus || cat.label}
                                                        </span>
                                                    </Td>
                                                    <Td style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                                                        {lead.callendreason || "—"}
                                                    </Td>
                                                    <Td style={{ textAlign: "center", fontFamily: "monospace", fontWeight: 600, color: "#334155" }}>
                                                        {formatDuration(parseDurationSecs(lead.callduration))}
                                                    </Td>
                                                    <Td style={{ textAlign: "center" }}>
                                                        {hasAudio ? (
                                                            <a
                                                                href={lead.latest_recording_url || lead.ivrUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    width: 26,
                                                                    height: 26,
                                                                    borderRadius: "50%",
                                                                    background: "#e0e7ff",
                                                                    color: "#4338ca",
                                                                    transition: "all .12s"
                                                                }}
                                                                title="Listen to recording"
                                                            >
                                                                <Volume2 className="w-3.5 h-3.5" />
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: "#cbd5e1", fontSize: 11 }}>—</span>
                                                        )}
                                                    </Td>
                                                    <Td style={{ textAlign: "right", paddingRight: 14 }}>
                                                        <button
                                                            onClick={() => setSelectedLead(lead)}
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 5,
                                                                padding: "4px 10px",
                                                                borderRadius: 6,
                                                                border: "1.5px solid #4f46e5",
                                                                background: "#eef2ff",
                                                                color: "#4f46e5",
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                cursor: "pointer",
                                                                fontFamily: "inherit",
                                                                transition: "all .15s"
                                                            }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4f46e5"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#eef2ff"; (e.currentTarget as HTMLButtonElement).style.color = "#4f46e5"; }}
                                                        >
                                                            View
                                                        </button>
                                                    </Td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Signature DialShree Pagination */}
                        <Pagination
                            total={filteredLostLeads.length}
                            page={lostPage}
                            perPage={lostPerPage}
                            onPage={setLostPage}
                            onPerPage={setLostPerPage}
                            itemLabel="leads"
                        />
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* LEAD INSPECTION MODAL (Signature DialShree ViewModal design)     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {selectedLead && (
                <div
                    style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15,23,42,0.6)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) setSelectedLead(null); }}
                >
                    <div style={{ background: "#fff", borderRadius: 20, width: "95%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px -15px rgba(0,0,0,0.3)" }}>
                        {/* Header */}
                        <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                            <div>
                                <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>DialShree Lead Detail Analysis</div>
                                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                                    <span style={{ background: "rgba(255,255,255,0.18)", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>{selectedLead.clientName}</span>
                                    <span style={{ opacity: 0.5 }}>•</span>
                                    <span>{selectedLead.mobile}</span>
                                    {selectedLead.id && <><span style={{ opacity: 0.5 }}>•</span><span style={{ fontFamily: "monospace" }}>ID: {selectedLead.id}</span></>}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLead(null)}
                                style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 18, fontSize: 12 }}>
                            {/* Grid 1 */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", display: "block" }}>Company</span>
                                    <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 12.5 }}>{selectedLead.company || "—"}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", display: "block" }}>Campaign</span>
                                    <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 12.5 }}>{selectedLead.campaign_name || "—"}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", display: "block" }}>Call Status</span>
                                    <span style={{ fontWeight: 700, color: "#e11d48", fontSize: 12.5 }}>{selectedLead.callstatus || selectedLead.finalcallstatus || "—"}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", display: "block" }}>Call Duration</span>
                                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1e293b", fontSize: 12.5 }}>
                                        {formatDuration(parseDurationSecs(selectedLead.callduration))}
                                    </span>
                                </div>
                            </div>

                            {/* Audio Player if available */}
                            {isAudioUrl(selectedLead.latest_recording_url || selectedLead.ivrUrl) && (
                                <div style={{ background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: "14px 16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#3730a3", fontSize: 11.5 }}>
                                            <Volume2 className="w-4 h-4 text-indigo-600" />
                                            Call Recording Playback
                                        </div>
                                        <a
                                            href={selectedLead.latest_recording_url || selectedLead.ivrUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "#4f46e5", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}
                                        >
                                            Open in tab <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <audio controls style={{ width: "100%", height: 36, borderRadius: 6 }} src={selectedLead.latest_recording_url || selectedLead.ivrUrl}>
                                        Your browser does not support audio element.
                                    </audio>
                                </div>
                            )}

                            {/* Remarks History */}
                            {selectedLead.transcription && selectedLead.transcription !== "—" && (
                                <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: 12, padding: "14px 16px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#0f766e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Remarks History / Transcription</div>
                                    <div style={{ color: "#134e4a", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selectedLead.transcription}</div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedLead.notes && selectedLead.notes !== "—" && (
                                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Customer Context &amp; Notes</div>
                                    <div style={{ color: "#1e293b", lineHeight: 1.6 }}>{selectedLead.notes}</div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "14px 24px", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
                            <button
                                onClick={() => setSelectedLead(null)}
                                style={{ padding: "8px 24px", borderRadius: 8, border: "none", background: "#4338ca", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DialShreeSummaryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-500">
                Loading DialShree Summary...
            </div>
        }>
            <DialShreeSummaryPageInner />
        </Suspense>
    );
}
