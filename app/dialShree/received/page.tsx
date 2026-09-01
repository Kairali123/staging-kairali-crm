"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useDialShreeReceivedLeads, type DialShreeReceivedLead } from "@/hooks/useDialShreeReceivedLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, PhoneOutgoing, PhoneIncoming } from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DialShreeRow {
    sl_no: number;
    timeIdKey: string;
    timestamp: string;
    dateTime: string;
    id: string;
    dbId: number | null;
    clientName: string;
    mobile: string | number;
    email: string;
    subject: string;
    notes: string;
    ivrUrl: string;
    latest_recording_url: string;
    website: string;
    assigned_mr?: string;
    assignto: string;
    dataSource: { label: string; color: PillColor };
    transcription: string;
    viewUrl: string;
    callSubId: string;
    initialid: string;

    callstarttime: string;
    callendtime: string;
    callduration: string;
    callstatus: string;
    calltype: string;
    callendreason: string;

    aicallcategory: string;
    finalcallstatus: string;
    customerengagementlevel: string;
    interestlevel: string;
    calloutcome: string;
    nextactionrequired: string;
    aicallsummary: string;
    lead_status?: string;
    leadstatus: string;
    cutomercontext: string;
    preferreddatetime: string;
    cutomerintent: string;
    additionalnotes: string;
    servicecategory: string;
    finalleadoutcome: string;
    scheduledtime: string;
    scheduledstatus: string;

    _ts_num?: number;
    _dt_num?: number;
    finalStatus: { label: string; dot: DotColor; color: PillColor };
    company: string;
    tat?: string | number | null;
    doer?: string;
    agent_Id?: string;
    campaign_name?: string;
    campaign_id?: string;
    leadId_from_dialer?: string;
    created_at?: string;
    updated_at?: string;
}

type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink";
type DotColor = "g" | "o" | "r" | "b" | "x";

// ─── Normalization for Non-Qualified Outcomes ───────────────────────────────

const CANONICAL_NON_QUALIFIED_OUTCOMES = [
    "Cold",
    "Did Not Enquire",
    "DNC Client: Don't Call Further",
    "Do Not Call Back",
    "Duplicate Lead",
    "Junk",
    "Max Auto Dial Attempts Completed",
    "Not Interested",
    "Not Interested AHV",
    "Outreach Stopped",
    "Disconnected Number",
    "Dead Air",
    "Wrong Number",
    "Declined Sale"
];

function normalizeOutcome(val: string): string {
    if (!val || val === "—") return "";
    return val
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/\s*:\s*/g, ":");
}

const CANONICAL_OUTCOME_MAP: Record<string, string> = {};
CANONICAL_NON_QUALIFIED_OUTCOMES.forEach(o => {
    CANONICAL_OUTCOME_MAP[normalizeOutcome(o)] = o;
});

function getCanonicalOutcome(rawVal: string): string | null {
    const norm = normalizeOutcome(rawVal);
    if (!norm) return null;
    if (CANONICAL_OUTCOME_MAP[norm]) return CANONICAL_OUTCOME_MAP[norm];
    for (const [key, val] of Object.entries(CANONICAL_OUTCOME_MAP)) {
        if (norm.includes(key) || key.includes(norm)) return val;
    }
    return null;
}

export function isAudioUrl(url: any): boolean {
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

/** Format ISO or MySQL date/time strings into "DD/MM/YYYY HH:MM" */
export function formatDisplayDateTime(val: any): string {
    if (!val || val === "—" || val === "null" || val === "undefined") return "—";
    const s = String(val).trim();
    if (!s) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
        const year = m[1];
        const month = m[2];
        const day = m[3];
        const hours = m[4];
        const mins = m[5];
        if (hours !== undefined && mins !== undefined && (hours !== "00" || mins !== "00")) {
            return `${day}/${month}/${year} ${hours}:${mins}`;
        }
        return `${day}/${month}/${year}`;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        const hours = p(d.getHours());
        const mins = p(d.getMinutes());
        if (hours !== "00" || mins !== "00") {
            return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${hours}:${mins}`;
        }
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    }
    return s;
}

export function formatDate(val: any): string {
    return formatDisplayDateTime(val);
}

export function formatCallDateTime(val: any): string {
    if (!val || val === "—" || val === "null" || val === "undefined") return "—";
    const s = String(val).trim();
    if (!s) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;

    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
        const year = m[1];
        const month = m[2];
        const day = m[3];
        const hours = m[4] || "00";
        const mins = m[5] || "00";
        return `${day}/${month}/${year} ${hours}:${mins}`;
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }
    return s;
}

// ─── Table Primitives ─────────────────────────────────────────────────────────

const PILL_STYLES: Record<PillColor, React.CSSProperties> = {
    green: { background: "#d1fae5", color: "#065f46" }, blue: { background: "#dbeafe", color: "#1e40af" },
    purple: { background: "#ede9fe", color: "#5b21b6" }, orange: { background: "#ffedd5", color: "#9a3412" },
    red: { background: "#fee2e2", color: "#991b1b" }, yellow: { background: "#fef3c7", color: "#92400e" },
    gray: { background: "#f1f5f9", color: "#475569" }, teal: { background: "#ccfbf1", color: "#0f766e" },
    indigo: { background: "#e0e7ff", color: "#3730a3" }, pink: { background: "#fce7f3", color: "#9d174d" },
};
const DOT: { [k in DotColor]: string } = { g: "#10b981", o: "#f59e0b", r: "#ef4444", b: "#3b82f6", x: "#94a3b8" };

function Pill({ label, color, dot }: { label: string; color: PillColor; dot?: DotColor }) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", ...PILL_STYLES[color] }}>{dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: DOT[dot], display: "inline-block" }} />}{label}</span>;
}

function Td({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    return <td className={className} style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>{children}</td>;
}

function Th({ children, style: extraStyle, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    return <th className={className} style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", ...extraStyle }}>{children}</th>;
}

function SortableTh({ children, colKey, sortKey, sortDir, onSort, style: extraStyle, className }: {
    children: React.ReactNode; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void; style?: React.CSSProperties; className?: string;
}) {
    const active = sortKey === colKey;
    return (
        <th className={className} onClick={() => onSort(colKey)} style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", cursor: "pointer", userSelect: "none", background: active ? "rgba(255,255,255,.12)" : undefined, ...extraStyle }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {children}
                <span className="sort-arrows" style={{ display: "inline-flex", flexDirection: "column", gap: 1, opacity: active ? 1 : 0.4 }}>
                    <span style={{ fontSize: 7, lineHeight: 1, color: active && sortDir === "asc" ? "#fff" : "rgba(255,255,255,.5)" }}>▲</span>
                    <span style={{ fontSize: 7, lineHeight: 1, color: active && sortDir === "desc" ? "#fff" : "rgba(255,255,255,.5)" }}>▼</span>
                </span>
            </span>
        </th>
    );
}

function HLabel({ full, short }: { full: string; short: string }) {
    return <>
        <span className="lbl-full">{full}</span>
        <span className="lbl-short">{short}</span>
    </>;
}

function TooltipTd({ children, label, maxWidth = 140, mono = false }: { children: string; label: string; maxWidth?: number; mono?: boolean }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const isEmpty = !children || children === "—";
    return (
        <td onMouseEnter={isEmpty ? undefined : e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left, y: r.bottom + 8 }); setShow(true); }} onMouseLeave={() => setShow(false)}
            style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontFamily: mono ? "monospace" : undefined }}>
            {children}
            {show && !isEmpty && (
                <div style={{ position: "fixed", left: Math.min(pos.x, window.innerWidth - 340), top: pos.y, zIndex: 9999, background: "#1e2a4a", color: "#f1f5f9", fontSize: 12, padding: "10px 14px", borderRadius: 9, maxWidth: 400, whiteSpace: "pre-wrap", wordBreak: "break-word", boxShadow: "0 8px 24px rgba(0,0,0,.28)", lineHeight: 1.6, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", top: -6, left: 16, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid #1e2a4a" }} />
                    <span style={{ fontWeight: 700, color: "#a5b4fc", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: ".6px", display: "block", marginBottom: 5 }}>{label}</span>
                    <span style={{ fontFamily: mono ? "monospace" : undefined }}>{children}</span>
                </div>
            )}
        </td>
    );
}

function CopyTd({ value, style: extraStyle, className }: { value: string; style?: React.CSSProperties; className?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };
    const { background: extraBg, ...restExtra } = extraStyle || {};

    return (
        <td className={`${className || ''} ${copied ? 'copied-active' : ''}`} onClick={handleCopy} title={value} style={{ padding: "8px 11px", fontSize: 11, borderRight: "1px solid #f1f5f9", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", cursor: "pointer", fontFamily: "monospace", color: copied ? "#059669" : "#475569", background: copied ? "#f0fdf4" : (extraBg || undefined), transition: "background .2s, color .2s", userSelect: "all", ...restExtra }}>
            {copied ? "✓ Copied!" : value}
        </td>
    );
}

const NOT_CONNECTED_COLOR = "#64748b";
const CONNECTED_COLOR = "#059669";

function colorText(value: string, type: "status" | "finalcallstatus" | "interest" | "outcome" | "intent" | "finalleadoutcome" | "leadstatus"): string {
    const v = (value || "").toLowerCase().trim();
    const colors: Record<string, Record<string, string>> = {
        status: { completed: CONNECTED_COLOR, "sale made": CONNECTED_COLOR, converted: CONNECTED_COLOR, "transfer to mr": "#2563eb", failed: "#dc2626", "not connected": NOT_CONNECTED_COLOR, "no answer": NOT_CONNECTED_COLOR, busy: "#ea580c" },
        finalcallstatus: { interested: CONNECTED_COLOR, "sale made": CONNECTED_COLOR, drop: "#dc2626", "call back": "#2563eb", callback: "#2563eb", "not connected": NOT_CONNECTED_COLOR },
        interest: { high: CONNECTED_COLOR, "high intent": CONNECTED_COLOR, medium: "#d97706", low: "#ea580c", "low intent": "#ea580c", "not interested": "#dc2626" },
        outcome: { "follow-up needed": "#ea580c", "call back hold": "#2563eb", "sale made": CONNECTED_COLOR, "transfer to mr": "#2563eb" },
        intent: { high: CONNECTED_COLOR, medium: "#d97706", low: "#ea580c", unqualified: "#dc2626" },
        leadstatus: { qualified: CONNECTED_COLOR, "non qualified": "#dc2626", "non-qualified": "#dc2626", "not qualified": "#dc2626", unqualified: "#dc2626", "not connected": NOT_CONNECTED_COLOR, open: "#2563eb", pending: "#ea580c" },
        finalleadoutcome: {
            "did not enquire": "#dc2626", "junk": "#dc2626", "not interested": "#dc2626", "not interested ahv": "#dc2626", "cold": "#dc2626", "duplicate lead": "#dc2626", "dnc client": "#dc2626", "disconnected number": "#dc2626", "declined sale": "#dc2626", "do not call": "#dc2626",
            "not connected": NOT_CONNECTED_COLOR, "no answer": NOT_CONNECTED_COLOR, "busy": NOT_CONNECTED_COLOR, "dead air": NOT_CONNECTED_COLOR, "language barrier": NOT_CONNECTED_COLOR,
            "sale made": CONNECTED_COLOR, "converted": CONNECTED_COLOR, "transfer to mr": "#2563eb", "call transferred": "#2563eb", "converted in magento": CONNECTED_COLOR
        },
    };
    const map = colors[type] || {};
    if (map[v]) return map[v];
    for (const [key, color] of Object.entries(map)) { if (v.includes(key) || key.includes(v)) return color; }
    return "#374151";
}

function ColorTd({ value, type, maxWidth }: { value: string; type: "status" | "finalcallstatus" | "interest" | "outcome" | "intent" | "finalleadoutcome" | "leadstatus"; maxWidth?: number }) {
    if (!value || value === "—") return <Td>{value || "—"}</Td>;
    return (
        <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", maxWidth, overflow: maxWidth ? "hidden" : undefined, textOverflow: maxWidth ? "ellipsis" : undefined }}>
            <span style={{ color: colorText(value, type), fontWeight: 700 }} title={value}>{value}</span>
        </td>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ total, page, perPage, onPage, onPerPage }: { total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total);
    const to = Math.min(page * perPage, total);
    const [goInput, setGoInput] = useState("");
    const handleGo = () => { const n = parseInt(goInput); if (!isNaN(n) && n >= 1 && n <= totalPages) { onPage(n); setGoInput(""); } };
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
        <button key={key} onClick={onClick} disabled={disabled} style={{ height: 30, minWidth: 30, padding: "0 8px", border: active ? "none" : "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff", color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}>{label}</button>
    );
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fafbfe" }}>
            <div style={{ fontSize: 12.5, color: "#64748b", whiteSpace: "nowrap" }}>Showing <strong style={{ color: "#1e2a4a" }}>{from}–{to}</strong> of <strong style={{ color: "#1e2a4a" }}>{total}</strong> leads</div>
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
                    <select aria-label="Rows per page" value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} style={{ height: 30, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", cursor: "pointer" }}>
                        {[10, 25, 50, 100, 500].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Go to</span>
                    <input aria-label="Go to page" type="number" min={1} max={totalPages} value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGo()} placeholder="Page" style={{ height: 30, width: 56, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", textAlign: "center", outline: "none" }} />
                    <button onClick={handleGo} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Go</button>
                </div>
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const RecvSvg = ({ sz = 13 }: { sz?: number }) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="4 17 10 11 4 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="12" y1="19" x2="20" y2="19" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const MicSvg = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 10a7 7 0 01-14 0M12 19v3M8 22h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const PhoneSvg = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.05 1.2 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

// ─── Status Config & Helpers ──────────────────────────────────────────────────

type StatusKey = "total_received" | "qualified" | "not_qualified" | "reschedule";

const STATUS_CFG: { key: StatusKey; label: string; color: string; bgColor: string; borderColor: string }[] = [
    { key: "total_received", label: "Total Received", color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#93c5fd" },
    { key: "qualified", label: "Qualified", color: "#047857", bgColor: "#ecfdf5", borderColor: "#6ee7b7" },
    { key: "not_qualified", label: "Not Qualified", color: "#b91c1c", bgColor: "#fef2f2", borderColor: "#fca5a5" },
    { key: "reschedule", label: "Pending / Reschedule", color: "#7c3aed", bgColor: "#f5f3ff", borderColor: "#c4b5fd" },
];

const StatusIcons: Record<string, React.ReactNode> = {
    total_received: <span>📊</span>, qualified: <span>✅</span>, not_qualified: <span>❌</span>, reschedule: <span>🕒</span>,
};

function buildConsistentReceivedCounts(rows: DialShreeRow[]) {
    const init = () => ({ total: 0, high: 0, medium: 0, low: 0 });
    const counts: Record<StatusKey, { total: number; high: number; medium: number; low: number }> = {
        total_received: init(), qualified: init(), not_qualified: init(), reschedule: init()
    };

    rows.forEach(r => {
        const intent = (r.cutomerintent || "").toLowerCase().trim();

        const addIntent = (stats: { total: number; high: number; medium: number; low: number }) => {
            stats.total++;
            if (intent.includes("high")) stats.high++;
            else if (intent.includes("medium")) stats.medium++;
            else stats.low++;
        };

        addIntent(counts.total_received);

        const ls = (r.leadstatus || "").toLowerCase().trim();
        if (ls.includes("qualified") && !ls.includes("non") && !ls.includes("not") && !ls.includes("un")) {
            addIntent(counts.qualified);
        } else if (ls.includes("non") || ls.includes("not") || ls.includes("un") || ls.includes("junk") || ls.includes("cold")) {
            addIntent(counts.not_qualified);
        } else {
            addIntent(counts.reschedule);
        }
    });

    return counts;
}

// ─── Signed / Dialer Audio Player ─────────────────────────────────────────────

function DialShreeAudioPlayer({ url, dateTime, duration }: { url: string; dateTime: string; duration?: string | number }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #c4b5fd", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#3c23bb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Dialer Call Recording</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{dateTime}{duration ? ` · ${duration}` : ""}</div>
                </div>
            </div>
            {error && <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca", marginBottom: 8 }}>⚠️ {error}</div>}
            <audio controls src={url} onError={() => setError("Could not load direct stream. Please click below to open/download.")} style={{ width: "100%", height: 36, accentColor: "#6366f1", display: "block" }} />
            <div style={{ marginTop: 8, textAlign: "right" }}>
                <a href={url} target="_blank" rel="noreferrer" download style={{ fontSize: 11, color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>Download Recording File ↗</a>
            </div>
        </div>
    );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

const CALL_INFO_KEYS = ["callSubId", "initialid", "calltype", "callstatus", "callduration", "callendreason", "callstarttime", "callendtime"];
const LEAD_INFO_KEYS = ["clientName", "mobile", "email", "company", "website", "subject", "assignto"];
const SENTIMENT_KEYS = ["customerengagementlevel", "interestlevel", "calloutcome", "leadstatus", "cutomerintent", "servicecategory", "finalleadoutcome", "finalcallstatus"];
const TIMING_KEYS = ["preferreddatetime", "scheduledtime", "scheduledstatus", "timestamp", "dateTime"];
const DETAILED_KEYS = ["aicallsummary", "cutomercontext", "notes", "additionalnotes", "aicallcategory", "nextactionrequired", "transcription"];
const KEYS_TO_HIDE = ["finalStatus", "dataSource", "viewUrl", "ivrUrl", "latest_recording_url", "_ts_num", "_dt_num", "dbId", "created_at", "updated_at", "sl_no", "timeIdKey"];

const KEY_LABELS: Record<string, string> = {
    id: "ID", initialid: "Initial ID", callSubId: "List ID", callstarttime: "Call Start", callendtime: "Call End",
    callduration: "Duration", callstatus: "Call Status", calltype: "Call Type", callendreason: "Hangup Reason",
    aicallcategory: "Lead Category", finalcallstatus: "Disposition", customerengagementlevel: "Engagement",
    interestlevel: "Intent / Priority", calloutcome: "Outcome", nextactionrequired: "Follow-up Action",
    aicallsummary: "Remarks & History", leadstatus: "Lead Status", cutomercontext: "Call Notes",
    preferreddatetime: "Follow-up Date", cutomerintent: "Customer Intent", additionalnotes: "Comments",
    servicecategory: "Sheet / Campaign", finalleadoutcome: "Final Disposition", scheduledtime: "Planned Date",
    scheduledstatus: "Followup Status", company: "Company", website: "Website", clientName: "Client Name",
    mobile: "Mobile", email: "Email", subject: "Subject", notes: "Notes", timestamp: "Gen. Timestamp",
    dateTime: "Enquiry D/T", transcription: "Remarks History", doer: "Doer Name", agent_Id: "Agent ID",
    campaign_name: "Campaign Name"
};

function ViewModal({ row, onClose, onCallHistory }: { row: DialShreeRow; onClose: () => void; onCallHistory: () => void }) {
    const toTitleCase = (str: string) => KEY_LABELS[str] || str.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
    const val = (v: any, key?: string) => {
        if (v === null || v === undefined) return "—";
        const t = String(v).trim();
        if (t === "" || t === "0" || t === "—") return "—";
        if (key && (TIMING_KEYS.includes(key) || key.toLowerCase().includes("time") || key.toLowerCase().includes("date"))) {
            return formatDisplayDateTime(t);
        }
        return t;
    };

    const Field = ({ label, value, fieldKey, color = "#4f46e5" }: { label: string; value: any; fieldKey?: string; color?: string }) => (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".8px", textTransform: "uppercase", color, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ fontSize: 12.5, color: "#1e293b", fontWeight: 500, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{val(value, fieldKey)}</div>
        </div>
    );
    const Section = ({ title, icon, color, children, style }: { title: string; icon: string; color: string; children: React.ReactNode; style?: React.CSSProperties }) => (
        <div style={{ paddingBottom: 18, ...style }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <span style={{ fontSize: 13 }}>{icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color }}>{title}</span>
                <div style={{ flex: 1, height: 1, background: `${color}15`, marginLeft: 8 }} />
            </div>
            {children}
        </div>
    );
    const filterFields = (keys: string[]) => keys.map(k => ({ key: k, label: toTitleCase(k), value: row[k as keyof DialShreeRow] }));
    const allDefined = [...CALL_INFO_KEYS, ...LEAD_INFO_KEYS, ...SENTIMENT_KEYS, ...TIMING_KEYS, ...DETAILED_KEYS, ...KEYS_TO_HIDE];
    const generalFields = Object.entries(row).filter(([k, v]) => !allDefined.includes(k) && typeof v !== "object").map(([k, v]) => ({ key: k, label: toTitleCase(k), value: v }));

    const recordingUrl = row.latest_recording_url || row.ivrUrl;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>DialShree Complete Lead Analysis</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4 }}>{row.clientName}</span>
                                <span style={{ opacity: 0.5 }}>•</span>
                                <span>{row.mobile}</span>
                                {row.id && <><span style={{ opacity: 0.5 }}>•</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>ID: {row.id}</span></>}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>×</button>
                </div>
                {/* Content */}
                <div style={{ overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px 48px" }}>
                        <Section title="Call Management" icon="📞" color="#0891b2">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(CALL_INFO_KEYS).map(f => <Field key={f.key} fieldKey={f.key} label={f.label} value={f.value} color="#0891b2" />)}
                            </div>
                        </Section>
                        <Section title="Lead & Business" icon="🏢" color="#4f46e5">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(LEAD_INFO_KEYS).map(f => <Field key={f.key} fieldKey={f.key} label={f.label} value={f.value} color="#4f46e5" />)}
                            </div>
                        </Section>
                        <Section title="Sentiment & Outcome" icon="📈" color="#7c3aed">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(SENTIMENT_KEYS).map(f => <Field key={f.key} fieldKey={f.key} label={f.label} value={f.value} color="#7c3aed" />)}
                            </div>
                        </Section>
                        <Section title="Timeline & System" icon="🕒" color="#d946ef">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(TIMING_KEYS).map(f => <Field key={f.key} fieldKey={f.key} label={f.label} value={f.value} color="#d946ef" />)}
                            </div>
                        </Section>
                    </div>
                    {generalFields.length > 0 && (
                        <Section title="General Information" icon="📁" color="#64748b" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px 20px" }}>
                                {generalFields.map(f => <Field key={f.key} fieldKey={f.key} label={f.label} value={f.value} color="#64748b" />)}
                            </div>
                        </Section>
                    )}
                    {recordingUrl && recordingUrl !== "—" && (
                        <div style={{ padding: "20px", background: "#f8fafc", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
                            <DialShreeAudioPlayer url={recordingUrl} dateTime={row.dateTime} duration={row.callduration} />
                        </div>
                    )}
                    <Section title="Remarks & Detailed Observations" icon="🧠" color="#03412f" style={{ borderTop: "2px solid #f1f5f9", paddingTop: 32 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            <div style={{ background: "#f0fdfa", borderRadius: 16, border: "1px solid #ccfbf1", padding: "20px 24px" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#0f766e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Remarks History</div>
                                <div style={{ fontSize: 14, color: "#134e4a", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{val(row.aicallsummary)}</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Customer Context / Call Notes</div>
                                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.cutomercontext)}</div>
                                </div>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Original Enquiry Notes</div>
                                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.notes)}</div>
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>
                {/* Footer */}
                <div style={{ borderTop: "1px solid #e2e8f0", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "flex-end", background: "#f8fafc", flexShrink: 0 }}>
                    <button onClick={onClose} style={{ padding: "12px 36px", borderRadius: 12, border: "none", background: "#4338ca", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(67,56,202,0.25)" }}>Close Analysis</button>
                </div>
            </div>
        </div>
    );
}

// ─── Call History Modal ───────────────────────────────────────────────────────

function getRowSortTime(row: DialShreeRow): number {
    const explicit = Math.max(row._ts_num || 0, row._dt_num || 0);
    if (explicit > 0) return explicit;
    const candidates = [row.dateTime, row.timestamp, row.callstarttime].filter(Boolean) as string[];
    for (const c of candidates) {
        const t = new Date(c).getTime();
        if (!isNaN(t) && t > 0) return t;
    }
    return 0;
}

function formatCallDateTimeJSX(dt: string) {
    if (!dt || dt === "—") return <span style={{ color: "#94a3b8" }}>—</span>;
    const formatted = formatCallDateTime(dt);
    if (!formatted || formatted === "—") return <span style={{ color: "#94a3b8" }}>—</span>;
    const parts = formatted.split(" ");
    if (parts.length < 2) return <span>{formatted}</span>;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{parts[0]}</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>{parts[1]}</span>
        </div>
    );
}

function CallHistoryModal({ selectedRow, allData, onClose }: { selectedRow: DialShreeRow; allData: DialShreeRow[]; onClose: () => void }) {
    const searchId = selectedRow.initialid || selectedRow.id || selectedRow.timeIdKey;

    const preloaded = useMemo(() => {
        return allData
            .filter(r => (r.initialid === searchId || r.id === searchId || r.timeIdKey === searchId))
            .sort((a, b) => getRowSortTime(b) - getRowSortTime(a));
    }, [allData, searchId]);

    const [calls, setCalls] = useState<DialShreeRow[]>(preloaded);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [showNotes, setShowNotes] = useState(false);

    useEffect(() => {
        if (preloaded.length > 0) setCalls(preloaded);
    }, [preloaded]);

    useEffect(() => {
        if (!selectedRow) return;
        setHistoryLoading(true);
        fetch(`/api/dialshree/received?leadId=${encodeURIComponent(searchId)}&allRows=1`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    const mapped = data.map((r: any) => ({
                        ...r,
                        dateTime: formatDisplayDateTime(r.dateTime),
                        timestamp: formatDisplayDateTime(r.timestamp),
                        callstarttime: formatCallDateTime(r.callstarttime),
                        callendtime: formatCallDateTime(r.callendtime),
                        scheduledtime: formatDisplayDateTime(r.scheduledtime),
                        preferreddatetime: formatDisplayDateTime(r.preferreddatetime),
                    }));
                    setCalls(mapped.sort((a: DialShreeRow, b: DialShreeRow) => getRowSortTime(b) - getRowSortTime(a)));
                }
            })
            .catch(() => { })
            .finally(() => setHistoryLoading(false));
    }, [selectedRow, searchId]);

    const getStatusStyle = (s: string): { bg: string; fg: string; dot: string } => {
        const v = (s || "").toLowerCase().trim();
        const RED = { bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" };
        const ORANGE = { bg: "#fff7ed", fg: "#ea580c", dot: "#f59e0b" };
        const GREEN = { bg: "#d1fae5", fg: "#065f46", dot: "#10b981" };

        const nonQualified = ["did not enquire", "junk", "not interested", "cold", "duplicate lead", "outreach stopped", "dnc", "disconnected number", "declined sale", "do not call", "dead air"];
        const retryPending = ["not connected", "not reachable", "no answer", "busy", "language barrier", "call failed"];

        if (nonQualified.some(k => v.includes(k))) return RED;
        if (retryPending.some(k => v.includes(k))) return ORANGE;
        return GREEN;
    };

    const initials = (name: string) => (name || "").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "–";

    const activeCall = (calls && calls[activeIndex]) ? calls[activeIndex] : (calls?.[0] ?? null);
    const ac = activeCall;
    const acStatus = ac ? (ac.finalleadoutcome || ac.callstatus || ac.finalStatus?.label || "") : "";
    const acSt = getStatusStyle(acStatus);
    const rawRec = ac ? (ac.latest_recording_url || ac.ivrUrl || "").trim() : "";
    const recordingUrl = isAudioUrl(rawRec) ? rawRec : "";

    const chipStyle: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #9ca6b4", boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 0 0 1px rgba(99,102,241,0.12)", display: "flex", flexDirection: "column", gap: 4 };
    const chipLbl: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".8px" };
    const chipVal: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#0f172a", wordBreak: "break-all" };

    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div className="bg-white rounded-2xl w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl mx-1 sm:mx-4 relative">
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                    {/* Left Panel */}
                    <div className="w-full md:w-[320px] lg:w-[350px] flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col bg-white overflow-hidden max-h-[40vh] md:max-h-full shadow-sm md:shadow-none z-10">
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e8edf5", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#6366f1", flexShrink: 0 }}>{initials(selectedRow.clientName)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{selectedRow.clientName || "N/A"}</div>
                                    <div style={{ fontSize: 12, color: "#0858c9", marginTop: 1 }}>{String(selectedRow.mobile)}</div>
                                    <div style={{ fontSize: 11, color: "#2876d4", marginTop: 1 }}>{selectedRow.email || "(No Email Address)"}</div>
                                    <div style={{ fontSize: 11, color: "#6b07b8", fontWeight: 700, marginTop: 1 }}>{selectedRow.dataSource?.label || "(N/A)"}</div>
                                    <div style={{ marginTop: 6 }}>
                                        <button style={{ fontSize: 11, padding: "4px 10px", background: "#515f80", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                                            onClick={() => setShowNotes(true)}>View Notes</button>
                                    </div>
                                    <div style={{ fontSize: 11, color: "#ee0808", fontWeight: 700, marginTop: 4, background: "#ecfeff", padding: "2px 8px", borderRadius: 4, width: "fit-content" }}>ID: {selectedRow.initialid || selectedRow.id || "—"}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ padding: "10px 0 0", overflowY: "auto", flex: 1 }}>
                            <div style={{ padding: "0 16px 8px", fontSize: 10, fontWeight: 800, letterSpacing: ".6px", color: "#94a3b8", textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: 8 }}>
                                <span>Call History · {`${calls.length} call${calls.length !== 1 ? "s" : ""}`}</span>
                                {historyLoading && (
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 700, color: "#6366f1", background: "#eef2ff", padding: "2px 7px", borderRadius: 20, letterSpacing: ".3px" }}>
                                        <span style={{ display: "inline-block", width: 8, height: 8, border: "1.5px solid #c7d2fe", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                        Refreshing
                                    </span>
                                )}
                            </div>
                            {calls.map((call, ci) => {
                                const status = call.finalleadoutcome || call.callstatus || call.finalStatus?.label || "";
                                const st = getStatusStyle(status);
                                const isFirst = ci === 0;
                                const ctype = (call.calltype || "").toLowerCase();
                                const isOutbound = ctype.includes("outbound");
                                const isInbound = ctype.includes("inbound");
                                const callRaw = (call.latest_recording_url || call.ivrUrl || "").trim();
                                const hasCallAudio = isAudioUrl(callRaw);
                                const callDisplayTime = formatDisplayDateTime(call.dateTime || call.timestamp);

                                return (
                                    <div key={String(call.sl_no) + ci} onClick={() => setActiveIndex(ci)}
                                        style={{ display: "flex", gap: 10, padding: "10px 16px", cursor: "pointer", borderLeft: `3px solid ${activeIndex === ci ? "#6366f1" : "transparent"}`, background: activeIndex === ci ? "#f0f4ff" : "transparent", transition: "background .15s" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: isFirst ? "#10b981" : activeIndex === ci ? "#6366f1" : "#cbd5e1", border: `2px solid ${isFirst ? "#10b981" : activeIndex === ci ? "#6366f1" : "#e2e8f0"}`, flexShrink: 0, marginTop: 3 }} />
                                            {ci < calls.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>{callDisplayTime}</span>
                                                {(isOutbound || isInbound) && (
                                                    <span title={isOutbound ? "Outbound call" : "Inbound call"} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: isOutbound ? "#e0e7ff" : "#d1fae5", border: `1.5px solid ${isOutbound ? "#6366f1" : "#10b981"}`, flexShrink: 0 }}>
                                                            {isOutbound
                                                                ? <PhoneOutgoing size={13} color="#4338ca" strokeWidth={2.75} />
                                                                : <PhoneIncoming size={13} color="#047857" strokeWidth={2.75} />}
                                                        </span>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: isOutbound ? "#4338ca" : "#047857" }}>{isOutbound ? "Outgoing" : "Incoming"}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>ID: {call.id}</div>
                                            <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
                                                {status && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.fg }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />{status}</span>}
                                                {call.callduration && call.callduration !== "0" && <span style={{ fontSize: 10, color: "#94a3b8" }}>{call.callduration}</span>}
                                                {hasCallAudio && (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 800, padding: "2px 7px", borderRadius: 12, background: "#ede9fe", color: "#6d28d9", border: "1px solid #ddd6fe" }}>
                                                        <span>🎧</span> Audio
                                                    </span>
                                                )}
                                                {isFirst && <span style={{ fontSize: 9, fontWeight: 800, color: "#10b981", letterSpacing: ".3px" }}>LATEST</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Right Panel */}
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-5">
                        {!ac ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#cbd5e1", fontSize: 13 }}>Select a call to view details</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 relative shadow-sm">
                                    <button onClick={onClose} className="absolute top-3 right-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors md:hidden">✕</button>
                                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.05 1.2 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" /></svg>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1526c4", flex: 1 }}>{formatDisplayDateTime(ac.dateTime || ac.timestamp)}</span>
                                    {acStatus && (
                                        <div className="flex items-center gap-2 sm:ml-auto pr-8 sm:pr-0">
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: acSt.bg, color: acSt.fg, whiteSpace: "nowrap", border: `1px solid ${acSt.fg}` }}>
                                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: acSt.dot }} />{acStatus}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#510dcecb", textTransform: "uppercase" as const, display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                        <span style={{ display: "inline-block", width: 3, height: 12, borderRadius: 0, background: "#0891b2" }} />Call Information
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {[
                                            { label: "Lead ID", value: ac.id },
                                            { label: "Call Type", value: ac.calltype },
                                            { label: "Call Start", value: formatCallDateTime(ac.callstarttime) },
                                            { label: "Call End", value: formatCallDateTime(ac.callendtime) },
                                            { label: "Duration", value: ac.callduration },
                                            { label: "Call Recording", value: recordingUrl ? "Available" : "Not Recorded" },
                                            { label: "Hangup Reason", value: ac.callendreason },
                                            { label: "Lead Status", value: ac.leadstatus },
                                            { label: "Intent", value: ac.cutomerintent },
                                            { label: "Company", value: ac.company },
                                            { label: "Agent ID", value: ac.agent_Id },
                                            { label: "Campaign", value: ac.campaign_name },
                                            { label: "Doer", value: ac.doer },
                                        ].filter(f => f.value && String(f.value).trim() && String(f.value).trim() !== "0" && String(f.value).trim() !== "—")
                                            .map(f => (
                                                <div key={f.label} style={chipStyle}>
                                                    <div style={chipLbl}>{f.label}</div>
                                                    <div style={{ ...chipVal, color: f.label === "Lead Status" ? colorText(String(f.value), "leadstatus") : f.label === "Call Recording" ? (recordingUrl ? "#059669" : "#64748b") : chipVal.color }}>
                                                        {f.label === "Call Recording" && recordingUrl ? (
                                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#059669" }}>
                                                                <span>🎧 Available</span>
                                                            </span>
                                                        ) : String(f.value)}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {/* Audio Recording Player */}
                                {recordingUrl ? (
                                    <DialShreeAudioPlayer url={recordingUrl} dateTime={formatDisplayDateTime(ac.dateTime || ac.timestamp)} duration={ac.callduration} />
                                ) : (
                                    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px dashed #cbd5e1", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🔇</div>
                                        <div>
                                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>No audio recording file for this call attempt</div>
                                            <div style={{ fontSize: 11, color: "#94a3b8" }}>Disposition: {acStatus || "N/A"} · Duration: {ac.callduration || "0"}</div>
                                        </div>
                                    </div>
                                )}

                                {ac.aicallsummary && (
                                    <div style={{ background: "#fff", borderRadius: "0 12px 12px 0", border: "1.5px solid #e2e8f0", borderLeft: "4px solid #21228d", padding: "14px 16px" }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", color: "#e6281a", textTransform: "uppercase" as const, marginBottom: 8 }}>Remarks History</div>
                                        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ac.aicallsummary}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                {/* Footer */}
                <div className="border-t border-slate-100 p-3 sm:p-5 flex flex-col sm:flex-row items-center justify-between bg-white flex-shrink-0 gap-4">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-3 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enquiry Date</span>
                            <span className="text-xs font-bold text-slate-700">{calls.length > 0 ? formatDisplayDateTime(calls[calls.length - 1].dateTime || calls[calls.length - 1].timestamp) : "—"}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Interaction</span>
                            <span className="text-xs font-bold text-slate-700">{calls.length > 0 ? formatDisplayDateTime(calls[0].dateTime || calls[0].timestamp) : "—"}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 transition-all active:scale-95">Close Dashboard</button>
                </div>
                {/* Notes sub-modal */}
                {showNotes && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
                        onClick={e => { if (e.target === e.currentTarget) setShowNotes(false); }}>
                        <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: "95%", maxWidth: 400, maxHeight: "80%", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
                            <h3 style={{ marginBottom: 10, fontWeight: 700 }}>Notes</h3>
                            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{selectedRow.notes || selectedRow.cutomercontext || "No notes available."}</div>
                            <button style={{ marginTop: 15, padding: "5px 12px", background: "#e11d48", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} onClick={() => setShowNotes(false)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Call Status Breakdown (Received) ────────────────────────────────────────

function CallStatusBreakdown({ counts, total, loading }: { counts: Record<StatusKey, { total: number; high: number; medium: number; low: number }>; total: number; loading: boolean }) {
    const respondedTotal = counts.total_received.total;
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg, #f8faff 0%, #ffffff 100%)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #05966928" }}><PhoneSvg /></div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>DialShree Lead Outreach & Response Status</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>DialShree Calling Performance — Status & Outcome Breakdown</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {loading && <div style={{ width: 14, height: 14, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 12px", color: "#059669", fontSize: 11.5, fontWeight: 600 }}>
                        <span style={{ display: "flex" }}><RecvSvg sz={11} /></span>
                        <span>Received</span>
                        <span style={{ background: "#059669", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{loading ? "…" : total}</span>
                    </div>
                </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
                <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#6366f1", textTransform: "uppercase" as const, marginBottom: 14 }}>Callback Response Analysis</div>
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {[...Array(4)].map((_, i) => <div key={i} style={{ height: 86, borderRadius: 10, background: "#e9ecef", animation: "kpi-pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {STATUS_CFG.map(cfg => {
                                const stats = counts[cfg.key] || { total: 0, high: 0, medium: 0, low: 0 };
                                const count = stats.total;
                                const calculatePercent = (value: number, totalAmount: number) =>
                                    totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : "0.0";
                                const denom = total > 0 ? total : 1;
                                const pct = calculatePercent(count, denom);
                                const isEmpty = count === 0;
                                return (
                                    <div key={cfg.key} style={{ background: cfg.bgColor, border: `1.5px solid ${cfg.borderColor}`, borderRadius: 10, padding: "13px 15px 12px", display: "flex", flexDirection: "column", gap: 8, transition: "box-shadow .18s, transform .18s", cursor: "default" }}
                                        onMouseEnter={e => { if (!isEmpty) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; } }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0, display: "inline-block" }} />
                                                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: cfg.color, lineHeight: 1 }}>{cfg.label}</span>
                                            </div>
                                            <div style={{ fontSize: 16, opacity: 0.9, display: "flex", alignItems: "center", justifyContent: "center" }}>{StatusIcons[cfg.key]}</div>
                                        </div>
                                        <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", lineHeight: 1, letterSpacing: "-1.5px" }}>{count}</div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{ display: "inline-flex", alignItems: "center", background: cfg.color + "18", borderRadius: 20, padding: "2px 9px", width: "fit-content" }}>
                                                <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color }}>{pct}%</span>
                                            </div>
                                        </div>

                                        {/* Intent Breakdown */}
                                        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: 8 }}>
                                            {[
                                                { label: "High Intent", val: stats.high, color: "#f87171" },
                                                { label: "Medium Intent", val: stats.medium, color: "#fbbf24" },
                                                { label: "Low Intent", val: stats.low, color: "#34d399" }
                                            ].map(i => (
                                                <div key={i.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                                                    <span style={{ color: "#64748b" }}>{i.label}:</span>
                                                    <span style={{ color: i.color }}>
                                                        {i.val} ({calculatePercent(i.val, count)}%)
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Received Table ───────────────────────────────────────────────────────────

function DialShreeTableInner({ data, allData, refetchReceived }: { data: DialShreeRow[]; allData: DialShreeRow[]; refetchReceived: () => Promise<void> }) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [viewRow, setViewRow] = useState<DialShreeRow | null>(null);
    const [historyRow, setHistoryRow] = useState<DialShreeRow | null>(null);
    const [sortKey, setSortKey] = useState("timestamp");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (k: string) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } setPage(1); };
    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            let av: string | number = "", bv: string | number = "";
            if (sortKey === "timestamp") { av = a._ts_num ?? 0; bv = b._ts_num ?? 0; }
            else if (sortKey === "dateTime") { av = a._dt_num ?? 0; bv = b._dt_num ?? 0; }
            else if (sortKey === "clientName") { av = a.clientName.toLowerCase(); bv = b.clientName.toLowerCase(); }
            else if (sortKey === "mobile") { av = String(a.mobile); bv = String(b.mobile); }
            else if (sortKey === "callduration") { av = String(a.callduration); bv = String(b.callduration); }
            else if (sortKey === "callstatus") { av = a.callstatus.toLowerCase(); bv = b.callstatus.toLowerCase(); }
            else if (sortKey === "cutomerintent") { av = a.cutomerintent.toLowerCase(); bv = b.cutomerintent.toLowerCase(); }
            else if (sortKey === "finalleadoutcome") { av = a.finalleadoutcome.toLowerCase(); bv = b.finalleadoutcome.toLowerCase(); }
            else if (sortKey === "leadstatus") { av = a.leadstatus.toLowerCase(); bv = b.leadstatus.toLowerCase(); }
            else if (sortKey === "website") { av = a.website.toLowerCase(); bv = b.website.toLowerCase(); }
            else if (sortKey === "company") { av = a.company.toLowerCase(); bv = b.company.toLowerCase(); }
            else if (sortKey === "assignto") { av = (a.assignto || "").toLowerCase(); bv = (b.assignto || "").toLowerCase(); }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
        if (page > totalPages) {
            setPage(1);
        }
    }, [sorted.length, perPage, page]);

    const paged = sorted.slice((page - 1) * perPage, page * perPage);
    const sp = { sortKey, sortDir, onSort: handleSort };

    return (
        <>
            {viewRow && <ViewModal row={allData.find(r => r.sl_no === viewRow.sl_no) ?? viewRow} onClose={() => setViewRow(null)} onCallHistory={() => setHistoryRow(viewRow)} />}
            {historyRow && <CallHistoryModal selectedRow={historyRow} allData={allData} onClose={() => setHistoryRow(null)} />}

            <style>{`
                .received-table-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background .12s, box-shadow .12s;
                }
                .received-table-row:hover {
                    background: #e0e7ff !important;
                    box-shadow: inset 3px 0 0 #4f46e5 !important;
                }
                .lbl-short { display: none; }
                @media (min-width: 1024px) {
                    .sticky-header-1 { position: sticky; left: 0; z-index: 20; background: #1e2a4a !important; min-width: 120px; }
                    .sticky-header-2 { position: sticky; left: 120px; z-index: 20; background: #1e2a4a !important; min-width: 130px; }
                    .sticky-header-3 { position: sticky; left: 250px; z-index: 20; background: #1e2a4a !important; min-width: 160px; }
                    .sticky-header-4 { position: sticky; left: 410px; z-index: 20; background: #1e2a4a !important; min-width: 180px; box-shadow: 4px 0 8px -2px rgba(0,0,0,0.15); border-right: none !important; }
                    
                    .sticky-cell-1 { position: sticky; left: 0; z-index: 10; background: #fff; min-width: 120px; }
                    .sticky-cell-2 { position: sticky; left: 120px; z-index: 10; background: #fff; min-width: 130px; }
                    .sticky-cell-3 { position: sticky; left: 250px; z-index: 10; background: #fff; min-width: 160px; }
                    .sticky-cell-4 { position: sticky; left: 410px; z-index: 10; background: #fff; min-width: 180px; box-shadow: 4px 0 8px -2px rgba(0,0,0,0.1); border-right: none !important; }
                    
                    .received-table-row:hover .sticky-cell-1,
                    .received-table-row:hover .sticky-cell-2,
                    .received-table-row:hover .sticky-cell-3,
                    .received-table-row:hover .sticky-cell-4 {
                        background: #e0e7ff !important;
                    }
                    .sticky-cell-3.copied-active { background: #f0fdf4 !important; color: #059669 !important; }
                }
                @media (max-width: 1023.98px) {
                    .sticky-header-1, .sticky-cell-1 { left: 0; min-width: 64px; max-width: 64px; }
                    .sticky-header-2, .sticky-cell-2 { left: 64px; min-width: 76px; max-width: 76px; }
                    .sticky-header-3, .sticky-cell-3 { left: 140px; min-width: 58px; max-width: 58px; }
                    .sticky-header-4, .sticky-cell-4 { left: 198px; min-width: 104px; max-width: 104px; }
                    .sticky-header-1, .sticky-header-2, .sticky-header-3, .sticky-header-4 {
                        position: sticky; z-index: 20; background: #1e2a4a !important; overflow: hidden;
                    }
                    .sticky-cell-1, .sticky-cell-2, .sticky-cell-3, .sticky-cell-4 {
                        position: sticky; z-index: 10; background: #fff;
                    }
                    .sticky-header-4, .sticky-cell-4 {
                        box-shadow: 4px 0 8px -2px rgba(0,0,0,0.15) !important; border-right: none !important;
                    }
                    .sticky-header-1, .sticky-header-2, .sticky-header-3, .sticky-header-4,
                    .sticky-cell-1, .sticky-cell-2, .sticky-cell-3, .sticky-cell-4 {
                        padding: 6px 5px !important; font-size: 9.5px !important;
                    }
                    .lbl-full { display: none; }
                    .lbl-short { display: inline; }
                    .sticky-header-1 .sort-arrows, .sticky-header-2 .sort-arrows { display: none; }
                    .sticky-cell-2 { white-space: normal !important; overflow-wrap: break-word; line-height: 1.3; }
                    .sticky-cell-4 > div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .sticky-cell-4 > div:first-child { font-size: 10px !important; }
                    .sticky-cell-4 > div:not(:first-child) { font-size: 8.5px !important; }
                    .received-table-row:hover .sticky-cell-1,
                    .received-table-row:hover .sticky-cell-2,
                    .received-table-row:hover .sticky-cell-3,
                    .received-table-row:hover .sticky-cell-4 {
                        background: #e0e7ff !important;
                    }
                    .sticky-cell-3.copied-active { background: #f0fdf4 !important; color: #059669 !important; }
                }
                @media (max-width: 639.98px) {
                    .sticky-header-1, .sticky-cell-1,
                    .sticky-header-2, .sticky-cell-2,
                    .sticky-header-3, .sticky-cell-3 {
                        position: static !important; left: auto !important; min-width: 90px; max-width: none; box-shadow: none !important;
                    }
                    .sticky-header-4, .sticky-cell-4 { left: 0 !important; min-width: 130px; max-width: 130px; }
                }
                .received-table-scroll {
                    overflow-x: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
                }
            `}</style>
            <div className="received-table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#1e2a4a" }}>
                            <SortableTh colKey="timestamp" {...sp} className="sticky-header-1"><HLabel full="Gen Timestamp" short="Gen TS" /></SortableTh>
                            <SortableTh colKey="dateTime" {...sp} className="sticky-header-2"><HLabel full="Enq Date & Time" short="Enq D&T" /></SortableTh>
                            <Th className="sticky-header-3">Lead ID</Th>
                            <SortableTh colKey="clientName" {...sp} className="sticky-header-4"><HLabel full="Client Details" short="Client" /></SortableTh>
                            <Th>Subject</Th>
                            <Th>Call Recording</Th>
                            <SortableTh colKey="website" {...sp}>Data Source</SortableTh>
                            <SortableTh colKey="company" {...sp}>Company</SortableTh>
                            <Th>Call Start</Th>
                            <Th>Call End</Th>
                            <SortableTh colKey="callduration" {...sp}>Duration</SortableTh>
                            <SortableTh colKey="callstatus" {...sp}>Status / Disposition</SortableTh>
                            <Th>Remarks & History</Th>
                            <SortableTh colKey="leadstatus" {...sp}>Lead Status</SortableTh>
                            <Th>Scheduled / Planned</Th>
                            <SortableTh colKey="cutomerintent" {...sp}>Customer Intent</SortableTh>
                            <SortableTh colKey="finalleadoutcome" {...sp}>Final Outcome</SortableTh>
                            <SortableTh colKey="assignto" {...sp}>Assign To</SortableTh>
                            <Th>Doer Name</Th>
                            <Th>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr><td colSpan={20} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No records found</td></tr>
                        ) : paged.map((row, i) => {
                            const recordingUrl = (row.latest_recording_url || row.ivrUrl || "").trim();
                            const hasRecording = isAudioUrl(recordingUrl);

                            return (
                                <tr key={String(row.sl_no) + i} className="received-table-row">
                                    <Td className="sticky-cell-1">{row.timestamp}</Td>
                                    <Td className="sticky-cell-2">{row.dateTime}</Td>
                                    <CopyTd value={row.id} className="sticky-cell-3" />
                                    <Td className="sticky-cell-4">
                                        <div title={row.clientName} style={{ fontWeight: 600, color: "#1e293b" }}>{row.clientName}</div>
                                        {row.mobile && <div title={String(row.mobile)} style={{ fontSize: 11.5, color: "#1e293b", marginTop: 2 }}>{row.mobile}</div>}
                                        {row.email && <div title={row.email} style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{row.email}</div>}
                                    </Td>
                                    <TooltipTd label="Subject" maxWidth={110}>{row.subject}</TooltipTd>
                                    <Td>
                                        {hasRecording ? (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                <a href={recordingUrl} target="_blank" rel="noreferrer" download style={{ cursor: "pointer", color: "#059669", fontWeight: 600, fontSize: 10.5, textDecoration: "none" }}>Download</a>
                                                <span onClick={() => setViewRow(row)} style={{ cursor: "pointer", color: "#4f46e5", fontWeight: 600, fontSize: 10.5 }}>Play Audio</span>
                                            </div>
                                        ) : <span style={{ color: "#94a3b8" }}>—</span>}
                                    </Td>
                                    <TooltipTd label="Data Source" maxWidth={90}>{row.dataSource.label}</TooltipTd>
                                    <Td>{row.company}</Td>
                                    <Td>{formatCallDateTimeJSX(row.callstarttime)}</Td>
                                    <Td>{formatCallDateTimeJSX(row.callendtime)}</Td>
                                    <Td>{row.callduration || "—"}</Td>
                                    <ColorTd value={row.callstatus} type="status" maxWidth={120} />
                                    <TooltipTd label="Remarks History" maxWidth={140}>{row.aicallsummary}</TooltipTd>
                                    <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
                                        <span style={{ color: colorText(row.leadstatus, "leadstatus"), fontWeight: 700 }} title={row.leadstatus}>{row.leadstatus || "—"}</span>
                                    </td>
                                    <TooltipTd label="Scheduled Time" maxWidth={130}>{row.scheduledtime}</TooltipTd>
                                    <ColorTd value={row.cutomerintent} type="intent" maxWidth={120} />
                                    <ColorTd value={row.finalleadoutcome} type="finalleadoutcome" maxWidth={140} />
                                    <Td>{row.assignto || "—"}</Td>
                                    {/* Doer Name cell */}
                                    <td style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        {row.doer ? (
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#ede9fe", color: "#6d28d9", fontWeight: 800, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    {row.doer.charAt(0).toUpperCase()}
                                                </span>
                                                <span style={{ fontWeight: 600, color: "#4c1d95", fontSize: 11.5 }}>{row.doer}</span>
                                            </span>
                                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "6px 10px", borderRight: "none", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <button onClick={() => setViewRow(row)}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, border: "1.5px solid #4f46e5", background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4f46e5"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#eef2ff"; (e.currentTarget as HTMLButtonElement).style.color = "#4f46e5"; }}>
                                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                View
                                            </button>
                                            <button onClick={() => setHistoryRow(row)}
                                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, border: "1.5px solid #0891b2", background: "#ecfeff", color: "#0891b2", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#0891b2"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#ecfeff"; (e.currentTarget as HTMLButtonElement).style.color = "#0891b2"; }}>
                                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.05 1.2 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" /></svg>
                                                Call History
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Pagination total={data.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </>
    );
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getDateRange(filter: string): { from: Date | null; to: Date | null } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (filter) {
        case "today": return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
        case "yesterday": { const y = new Date(today.getTime() - 86400000); return { from: y, to: new Date(today.getTime() - 1) }; }
        case "this_week": { const dow = today.getDay(); const mon = new Date(today.getTime() - ((dow === 0 ? 6 : dow - 1) * 86400000)); return { from: mon, to: new Date(mon.getTime() + 7 * 86400000 - 1) }; }
        case "last_week": { const dow = today.getDay(); const thisMonday = new Date(today.getTime() - ((dow === 0 ? 6 : dow - 1) * 86400000)); const lastMon = new Date(thisMonday.getTime() - 7 * 86400000); return { from: lastMon, to: new Date(thisMonday.getTime() - 1) }; }
        case "this_month": return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
        case "last_month": return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
        case "this_year": return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
        case "last_year": return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
        default: return { from: null, to: null };
    }
}

// ─── Main Page Component ──────────────────────────────────────────────────────

function DialShreeReceivedPageInner() {
    const { user, isLoading, hasPermission } = useAuth();
    const router = useRouter();

    const isSuperAdmin = Boolean(
        user?.role === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super admin"
    );

    useEffect(() => {
        if (!isLoading && user && !isSuperAdmin) {
            router.replace("/access-denied");
        }
    }, [isLoading, user, isSuperAdmin, router]);

    const { data: receivedApiData, loading: receivedLoading, isRefreshing: hookRefreshing, error: receivedError, refetch: refetchReceived } = useDialShreeReceivedLeads();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingAny = isRefreshing || hookRefreshing;
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchReceived();
        setIsRefreshing(false);
    };

    const hasReceivedPermission = isSuperAdmin;

    const tableRef = useRef<HTMLDivElement>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(h);
    }, [search]);

    const [dateFilter, setDateFilter] = useState("all");
    const [company, setCompany] = useState("all");
    const [dataSource, setDataSource] = useState("all");
    const [status, setStatus] = useState("all");
    const [intent, setIntent] = useState("all");
    const [leadStatus, setLeadStatus] = useState("all");
    const [nonQualifiedOutcome, setNonQualifiedOutcome] = useState("all");
    const [customDate, setCustomDate] = useState({ start: "", end: "" });

    useEffect(() => {
        if (leadStatus !== "Non-Qualified") {
            setNonQualifiedOutcome("all");
        }
    }, [leadStatus]);

    const clearFilters = () => {
        setSearch(""); setDateFilter("all"); setCompany("all");
        setDataSource("all"); setStatus("all"); setIntent("all"); setLeadStatus("all");
        setNonQualifiedOutcome("all");
        setCustomDate({ start: "", end: "" });
    };

    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [dateFilter, company, dataSource, status, intent, leadStatus, nonQualifiedOutcome]);

    const dateWindow = useMemo(() => {
        if (dateFilter === "custom") return { from: customDate.start ? new Date(customDate.start) : null, to: customDate.end ? new Date(customDate.end + "T23:59:59") : null };
        return getDateRange(dateFilter);
    }, [dateFilter, customDate]);

    const companyMatch = (n: string) => company === "all" || n === company;
    const dsMatch = (l: string) => dataSource === "all" || l === dataSource;

    // ── Transform ─────────────────────────────────────────────────────────────
    const transformedReceived: DialShreeRow[] = useMemo(() => {
        if (!receivedApiData?.length) return [];
        return receivedApiData.map((r: DialShreeReceivedLead): DialShreeRow => ({
            ...r,
            _ts_num: r._ts_num ?? 0,
            _dt_num: r._dt_num ?? 0,
            dataSource: { label: r.dataSource || "—", color: "gray" as const },
            finalStatus: {
                label: r.callstatus || "—",
                dot: (r.callstatus === "Sale Made" || r.callstatus === "Converted" ? "g" : r.callstatus === "Cold" || r.callstatus === "Not Interested" ? "r" : "o") as DotColor,
                color: (r.callstatus === "Sale Made" || r.callstatus === "Converted" ? "green" : r.callstatus === "Cold" || r.callstatus === "Not Interested" ? "red" : "orange") as PillColor,
            },
        }));
    }, [receivedApiData]);

    // ── Latest record per lead for main view (preserving recordings) ─────────
    const processedReceived: DialShreeRow[] = useMemo(() => {
        const latestByInitialId = new Map<string, DialShreeRow>();
        transformedReceived.forEach(r => {
            const key = (r.initialid || r.id || r.timeIdKey || "").trim();
            if (!key || key === "—") {
                latestByInitialId.set(String(r.sl_no), { ...r });
                return;
            }
            const existing = latestByInitialId.get(key);
            if (!existing) {
                latestByInitialId.set(key, { ...r });
            } else {
                const rTime = r._ts_num ?? 0;
                const existTime = existing._ts_num ?? 0;
                const base = rTime >= existTime ? { ...r } : { ...existing };
                
                const recCandidate = isAudioUrl(r.latest_recording_url) ? r.latest_recording_url : isAudioUrl(r.ivrUrl) ? r.ivrUrl : null;
                const existCandidate = isAudioUrl(existing.latest_recording_url) ? existing.latest_recording_url : isAudioUrl(existing.ivrUrl) ? existing.ivrUrl : null;
                const bestRec = recCandidate || existCandidate;
                
                if (bestRec) {
                    base.ivrUrl = bestRec;
                    base.latest_recording_url = bestRec;
                    if ((!base.callduration || base.callduration === "0") && existing.callduration && existing.callduration !== "0") {
                        base.callduration = existing.callduration;
                    }
                }
                latestByInitialId.set(key, base);
            }
        });
        return Array.from(latestByInitialId.values());
    }, [transformedReceived]);

    // ── Filter Options ────────────────────────────────────────────────────────
    const companyOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.company))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const dataSourceOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.dataSource.label))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const statusOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.callstatus))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const leadStatusOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.leadstatus))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const nonQualifiedOutcomeOptions = useMemo(() => {
        const presentOutcomes = new Set<string>();
        processedReceived.forEach(r => {
            if (r.leadstatus === "Non-Qualified") {
                const canonical = getCanonicalOutcome(r.finalleadoutcome);
                if (canonical) {
                    presentOutcomes.add(canonical);
                }
            }
        });
        return CANONICAL_NON_QUALIFIED_OUTCOMES.filter(o => presentOutcomes.has(o));
    }, [processedReceived]);

    // ── Filtered Data ─────────────────────────────────────────────────────────
    const filteredReceived = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        return processedReceived.filter(r => {
            if (q && !(
                r.clientName.toLowerCase().includes(q) ||
                String(r.mobile).includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.id.toLowerCase().includes(q) ||
                r.subject.toLowerCase().includes(q) ||
                r.website.toLowerCase().includes(q) ||
                r.aicallsummary.toLowerCase().includes(q) ||
                r.transcription.toLowerCase().includes(q) ||
                r.notes.toLowerCase().includes(q)
            )) return false;
            if (dateWindow.from || dateWindow.to) {
                const ts = r._ts_num || 0;
                if (!ts) return false;
                if (dateWindow.from && ts < dateWindow.from.getTime()) return false;
                if (dateWindow.to && ts > dateWindow.to.getTime()) return false;
            }
            if (!companyMatch(r.company)) return false;
            if (!dsMatch(r.dataSource.label)) return false;
            if (status !== "all" && r.callstatus !== status) return false;
            if (intent !== "all" && !r.cutomerintent.toLowerCase().includes(intent.toLowerCase())) return false;
            if (nonQualifiedOutcome !== "all") {
                if (r.leadstatus !== "Non-Qualified") return false;
                const canonicalVal = getCanonicalOutcome(r.finalleadoutcome);
                if (canonicalVal !== nonQualifiedOutcome) return false;
            } else {
                if (leadStatus !== "all" && r.leadstatus !== leadStatus) return false;
            }
            return true;
        });
    }, [debouncedSearch, dateWindow, company, dataSource, status, intent, leadStatus, nonQualifiedOutcome, processedReceived]);

    const receivedCounts = useMemo(() => buildConsistentReceivedCounts(filteredReceived), [filteredReceived]);

    if (receivedLoading && receivedApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Image src="/grouploader.gif" alt="Loading" width={200} height={200} priority className="animate-pulse" />
                    <p className="mt-4 text-base font-bold text-indigo-600 animate-pulse">Fetching latest DialShree Leads Data...</p>
                </div>
            </div>
        );
    }

    if (!hasReceivedPermission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Access Restricted</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>You don't have permission to view DialShree received calls.</div>
                </div>
            </div>
        );
    }

    if (receivedError && receivedApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4">
                <div style={{ maxWidth: 560, width: "100%", background: "#fff", border: "1px solid #fecaca", borderRadius: 16, padding: "22px 24px", boxShadow: "0 12px 30px rgba(220,38,38,.08)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 800 }}>!</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>Could not load DialShree leads</div>
                            <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 6, lineHeight: 1.6 }}>{receivedError}</div>
                            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                                <button onClick={handleRefresh} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                                    Retry now
                                </button>
                                <button onClick={() => window.location.reload()} style={{ background: "#fff", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                                    Reload page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="font-sans bg-[#f0f2f8] min-h-full text-slate-800">
            <style>{`
                @keyframes spin      { to { transform: rotate(360deg); } }
                @keyframes kpi-pulse { 0%,100% { opacity:1; } 50% { opacity:0.38; } }
            `}</style>

            {/* Banner */}
            <div style={{ background: "linear-gradient(110deg,#3730a3 0%,#4f46e5 45%,#6366f1 100%)", padding: "14px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}><MicSvg /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>DialShree Lead Qualification</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>DialShree Calling Portal · Received Calls — Real-time DialShree Lead Log</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {hookRefreshing && !isRefreshing && (
                        <div className="hidden md:flex items-center gap-2 text-white/60 text-[11px] font-medium animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Background Syncing...
                        </div>
                    )}
                    <button onClick={handleRefresh} disabled={isRefreshingAny}
                        style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, height: 42, padding: "0 16px", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: isRefreshingAny ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .2s" }}
                        onMouseEnter={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
                        onMouseLeave={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.15)")}>
                        <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: isRefreshingAny ? "spin 0.8s linear infinite" : "none" }} />
                        {isRefreshingAny ? "Refreshing..." : "Sync Data"}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-3 mx-2 sm:mx-4 lg:mx-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Filters &amp; Search</h3>
                                <p className="text-xs text-slate-500">Refine and locate DialShree leads efficiently</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50">Clear Filters</Button>
                    </div>
                    <div className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                            <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-2">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search Leads</label>
                                <Input
                                    placeholder="Name, email, phone, ID, subject, remarks..."
                                    value={search}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === "Enter") {
                                            tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                        }
                                    }}
                                    className="h-10 w-full rounded-md border-gray-300"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</label>
                                <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="Select range" /></SelectTrigger>
                                    <SelectContent>
                                        {[["all", "All Time"], ["today", "Today"], ["yesterday", "Yesterday"], ["this_week", "This Week"], ["last_week", "Last Week"], ["this_month", "This Month"], ["last_month", "Last Month"], ["this_year", "This Year"], ["last_year", "Last Year"], ["custom", "Custom"]].map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</label>
                                <Select value={company} onValueChange={setCompany}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        {companyOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Data Source</label>
                                <Select value={dataSource} onValueChange={setDataSource}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Sources" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sources</SelectItem>
                                        {dataSourceOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Call Disposition</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Dispositions" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Dispositions</SelectItem>
                                        {statusOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Lead Intent</label>
                                <Select value={intent} onValueChange={setIntent}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Intent" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Intent</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Lead Status</label>
                                <Select value={leadStatus} onValueChange={setLeadStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        {leadStatusOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Non Qualified Outcome</label>
                                <Select value={nonQualifiedOutcome} onValueChange={(val) => {
                                    setNonQualifiedOutcome(val);
                                    if (val !== "all") {
                                        setLeadStatus("Non-Qualified");
                                    }
                                }}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Outcomes" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Outcomes</SelectItem>
                                        {nonQualifiedOutcomeOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom date range */}
                        {dateFilter === "custom" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</label>
                                    <Input type="date" value={customDate.start} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate({ ...customDate, start: e.target.value })} className="h-10 w-full rounded-md border-gray-300" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</label>
                                    <Input type="date" value={customDate.end} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomDate({ ...customDate, end: e.target.value })} className="h-10 w-full rounded-md border-gray-300" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Breakdown */}
            <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                <CallStatusBreakdown counts={receivedCounts} total={filteredReceived.length} loading={receivedLoading} />
            </div>

            {/* Table */}
            <div ref={tableRef} className="mx-2 sm:mx-4 lg:mx-5 mt-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#d1fae5", color: "#059669" }}>
                            <RecvSvg />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>DialShree Received Responses — Lead Outreach & Callback Log</span>
                    </div>
                    {(receivedLoading && filteredReceived.length === 0)
                        ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}><div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 10, verticalAlign: "middle" }} />Loading DialShree received data...</div>
                        : <DialShreeTableInner data={filteredReceived} allData={transformedReceived} refetchReceived={refetchReceived} />
                    }
                </div>
            </div>
        </div>
    );
}

export default function DialShreeReceivedPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading DialShree Received...</div>}>
            <DialShreeReceivedPageInner />
        </Suspense>
    );
}
