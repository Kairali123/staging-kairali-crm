"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useReceivedLeads, type ReceivedLead } from "@/hooks/useReceivedLeads";
import { useSentLeads } from "@/hooks/useSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MessageSquare, Lock, Eye, PhoneOutgoing, PhoneIncoming } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import VerifyTransferLeadModal from "@/components/Verifytransferleadmodal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentRow {
    enquiryId: string;
    notes: string;
}

interface ReceivedRow {
    timestamp: string;
    dateTime: string;
    id: string;
    clientName: string;
    mobile: string | number;
    email: string;
    subject: string;
    notes: string;
    ivrUrl: string;
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
    company_by_kserve?: string;
    calculated_qualification_status?: string;
    tat?: string | number | null;
    followup_required?: string;
    client_category?: string;
    next_assigned_to?: string;
    sent_status?: string;
    sent_status_date?: string;
    error_alert_qualified_lead?: string;
    repush_status?: string;
    response?: string;
    verified_source?: string;
    created_at?: string;
    updated_at?: string;
    feedback_date?: string;
    feedbackSubmitted?: boolean;
    feedbackData?: any;
    vtlStatus?: string;
    vtlAssignee?: string;
    vtlRemarks?: string;
    doer?: string;
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
    "Outreach Stopped"
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

const CANONICAL_ALIASES: Record<string, string> = {
    "dnc client:don't call furthur": "DNC Client: Don't Call Further",
    "dnc client: don't call furthur": "DNC Client: Don't Call Further"
};

function getCanonicalOutcome(rawVal: string): string | null {
    const norm = normalizeOutcome(rawVal);
    if (!norm) return null;
    if (CANONICAL_ALIASES[norm]) return CANONICAL_ALIASES[norm];
    if (CANONICAL_OUTCOME_MAP[norm]) return CANONICAL_OUTCOME_MAP[norm];
    return null;
}

// ─── Mock / Fallback Data ─────────────────────────────────────────────────────

const RECEIVED_DATA: ReceivedRow[] = [
    { timestamp: "20/03/2026", dateTime: "16/03/2026 07:11", id: "Test_Ticket_001-T4b3935632", clientName: "Satyam", mobile: "+91 73006 16307", email: "satyam@kairali.com", subject: "Enquiry From Chat", notes: "KServe AI callback received.", ivrUrl: "unpod.ai/aK…", website: "KServe API", assignto: "", dataSource: { label: "Outcomes", color: "indigo" }, transcription: "[ASSISTANT] Hello, this is KServe AI.", viewUrl: "View", callSubId: "—", initialid: "", callstarttime: "", callendtime: "", callduration: "0", callstatus: "", calltype: "", callendreason: "", aicallcategory: "", finalcallstatus: "", customerengagementlevel: "", interestlevel: "", calloutcome: "", nextactionrequired: "", aicallsummary: "", leadstatus: "", cutomercontext: "", preferreddatetime: "", cutomerintent: "", additionalnotes: "", servicecategory: "", finalleadoutcome: "", scheduledtime: "", scheduledstatus: "", finalStatus: { label: "Received", dot: "g", color: "green" }, company: "Kairali" },
    { timestamp: "20/03/2026", dateTime: "17/03/2026 09:45", id: "Ticket_002-T5c4820543", clientName: "Priya Sharma", mobile: "+91 98765 43210", email: "priya@example.com", subject: "IVR Call Response", notes: "IVR callback completed.", ivrUrl: "unpod.ai/bM…", website: "KServe API", assignto: "", dataSource: { label: "IVR Callback", color: "blue" }, transcription: "[USER] Hi, I got a call from Kairali.", viewUrl: "View", callSubId: "SUB-4920", initialid: "", callstarttime: "", callendtime: "", callduration: "0", callstatus: "", calltype: "", callendreason: "", aicallcategory: "", finalcallstatus: "", customerengagementlevel: "", interestlevel: "", calloutcome: "", nextactionrequired: "", aicallsummary: "", leadstatus: "", cutomercontext: "", preferreddatetime: "", cutomerintent: "", additionalnotes: "", servicecategory: "", finalleadoutcome: "", scheduledtime: "", scheduledstatus: "", finalStatus: { label: "Received", dot: "g", color: "green" }, company: "Kairali" },
];

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
function IdCell({ children, error }: { children: React.ReactNode; error?: boolean }) {
    return <span style={{ fontFamily: "monospace", fontSize: 10.5, background: "#f8fafc", padding: "2px 6px", borderRadius: 4, color: error ? "#dc2626" : "#475569", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{children}</span>;
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
        <th className={className} onClick={() => onSort(colKey)} style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", cursor: "pointer", userSelect: "none", background: active ? "rgba(255,255,255,.12)" : undefined, ...extraStyle, ...(active && extraStyle?.background ? {} : {}) }}>
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
// Shows `full` on desktop and a shorter `short` label on mobile, so frozen sticky headers
// (which only have ~60-100px to work with on a phone) don't overflow into the next column.
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
function NotesTd({ children }: { children: string }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const isEmpty = !children || children === "—";
    return (
        <td onMouseEnter={isEmpty ? undefined : e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left, y: r.bottom + 8 }); setShow(true); }} onMouseLeave={() => setShow(false)}
            style={{ padding: "8px 11px", fontSize: 11.5, color: "#94a3b8", borderRight: "1px solid #f1f5f9", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
            {children}
            {show && !isEmpty && (
                <div style={{ position: "fixed", left: Math.min(pos.x, window.innerWidth - 340), top: pos.y, zIndex: 9999, background: "#1e2a4a", color: "#f1f5f9", fontSize: 12, padding: "10px 14px", borderRadius: 9, maxWidth: 340, whiteSpace: "pre-wrap", wordBreak: "break-word", boxShadow: "0 8px 24px rgba(0,0,0,.28)", lineHeight: 1.6, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", top: -6, left: 16, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid #1e2a4a" }} />
                    <span style={{ fontWeight: 700, color: "#a5b4fc", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: ".6px", display: "block", marginBottom: 5 }}>Notes</span>
                    {children}
                </div>
            )}
        </td>
    );
}
function CopyTd({ value, style: extraStyle, className }: { value: string; style?: React.CSSProperties; className?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };

    // Extract background from extraStyle if it exists so we can override it when copied
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
        status: { completed: CONNECTED_COLOR, failed: "#dc2626", "not connected": NOT_CONNECTED_COLOR },
        finalcallstatus: { interested: CONNECTED_COLOR, drop: "#dc2626", "call back": "#2563eb", callback: "#2563eb", "not connected": NOT_CONNECTED_COLOR },
        interest: { interested: CONNECTED_COLOR, "non interested": "#dc2626", "not interested": "#dc2626", maybe: "#d97706" },
        outcome: { "follow-up needed": "#ea580c", "follow up needed": "#ea580c", "callback requested": "#2563eb", "callback scheduled": "#2563eb" },
        intent: { high: CONNECTED_COLOR, medium: "#d97706", low: "#ea580c", unqualified: "#dc2626" },
        leadstatus: { qualified: CONNECTED_COLOR, "non qualified": "#dc2626", "non-qualified": "#dc2626", "not qualified": "#dc2626", unqualified: "#dc2626", "not connected": NOT_CONNECTED_COLOR, open: "#2563eb", pending: "#ea580c" },
        finalleadoutcome: {
            "did not enquire": "#dc2626", "did not enquiry": "#dc2626", "junk": "#dc2626", "not interested": "#dc2626", "not interested ahv": "#dc2626", "not reachable": "#dc2626", "not rechable": "#dc2626", "cold": "#dc2626", "duplicate lead": "#dc2626", "dnc client": "#dc2626", "don't call furthur": "#dc2626", "outreach stopped": "#dc2626",
            "not connected": NOT_CONNECTED_COLOR, "no answer": NOT_CONNECTED_COLOR, "busy": NOT_CONNECTED_COLOR, "technical error": NOT_CONNECTED_COLOR, "language issue": NOT_CONNECTED_COLOR, "other cases": "#94a3b8", "other/misc enquiry": "#94a3b8",
            "product distributor": CONNECTED_COLOR, "product stockists": CONNECTED_COLOR, "individual products buying": CONNECTED_COLOR, "individual resort booking": CONNECTED_COLOR, "group resort booking": CONNECTED_COLOR, "treatment package for resort": CONNECTED_COLOR, "single therapy for individual": CONNECTED_COLOR, "treatment package for kairali centres": CONNECTED_COLOR, "franchise": CONNECTED_COLOR, "sanitizers enquiry": CONNECTED_COLOR, "ayurveda training": CONNECTED_COLOR, "yoga training": CONNECTED_COLOR, "ayurveda and yoga training": CONNECTED_COLOR, "prevention_rejuvenation": CONNECTED_COLOR, "ayurvedic doctor_panchakarma center": CONNECTED_COLOR, "group resort booking_yoga retreat": CONNECTED_COLOR, "pharmacy_retail": CONNECTED_COLOR, "online sales": CONNECTED_COLOR, "export_import": CONNECTED_COLOR, "treatment package for resort ahv": CONNECTED_COLOR, "prevention_rejuvenation ahv": CONNECTED_COLOR, "group resort booking ahv yoga retreat": CONNECTED_COLOR, "ayurvedic training ahv": CONNECTED_COLOR, "yoga training ahv": CONNECTED_COLOR, "panchkarma training": CONNECTED_COLOR, "contract manufacturing": CONNECTED_COLOR,
            "order status enquiry": "#2563eb", "already spoken": "#2563eb", "reverify": "#2563eb", "expert required": "#2563eb", "assign to mr": "#2563eb", "travel agent": "#2563eb", "wants details over email": "#2563eb",
            "jobs enquiry": "#ea580c", "doctor consultation required": "#ea580c", "ayurvedic doctor_panchakarma centre": "#7c3aed",
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

type StatusKey = "total_received" | "qualified" | "not_qualified" | "reschedule" | "completed" | "not_connected" | "failed" | "busy" | "in_progress" | "scheduled" | "pending";

const STATUS_CFG: { key: StatusKey; label: string; color: string; bgColor: string; borderColor: string; matchFn: (s: string) => boolean }[] = [
    { key: "total_received", label: "Total Received", color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#93c5fd", matchFn: () => false },
    { key: "qualified", label: "Qualified", color: "#047857", bgColor: "#ecfdf5", borderColor: "#6ee7b7", matchFn: () => false },
    { key: "not_qualified", label: "Not Qualified", color: "#b91c1c", bgColor: "#fef2f2", borderColor: "#fca5a5", matchFn: () => false },
    { key: "reschedule", label: "Pending / Reschedule", color: "#7c3aed", bgColor: "#f5f3ff", borderColor: "#c4b5fd", matchFn: () => false },
    /*
    { key: "total_received", label: "Total Received", color: "#6366f1", bgColor: "#eef2ff", borderColor: "#c7d2fe", matchFn: () => false },
    { key: "completed", label: "Completed", color: "#059669", bgColor: "#f0fdf4", borderColor: "#bbf7d0", matchFn: s => /complet|success|received|done/i.test(s) },
    { key: "not_connected", label: "Not Connected", color: "#64748b", bgColor: "#f8fafc", borderColor: "#e2e8f0", matchFn: s => /not.?connect|no.?answer|unanswered|unreachable/i.test(s) },
    { key: "failed", label: "Failed", color: "#dc2626", bgColor: "#fff5f5", borderColor: "#fecaca", matchFn: s => /fail|error|reject|invalid/i.test(s) },
    { key: "busy", label: "Busy", color: "#ea580c", bgColor: "#fff7ed", borderColor: "#ffedd5", matchFn: s => /busy/i.test(s) },
    { key: "in_progress", label: "In Progress", color: "#2563eb", bgColor: "#eff6ff", borderColor: "#bfdbfe", matchFn: s => /in.?progress|inprogress|processing|queued/i.test(s) },
    { key: "scheduled", label: "Scheduled", color: "#d97706", bgColor: "#fffbeb", borderColor: "#fde68a", matchFn: s => /schedul/i.test(s) },
    */
];

const StatusIcons: Record<string, React.ReactNode> = {
    total_received: <span>📊</span>, qualified: <span>✅</span>, not_qualified: <span>❌</span>, reschedule: <span>🕒</span>,
    scheduled: <span>🕒</span>, pending: <span>⏳</span>, in_progress: <span>🔄</span>,
    completed: <span>✅</span>, not_connected: <span>📵</span>, failed: <span>❌</span>, busy: <span>📞</span>,
};

function getRowStatus(r: ReceivedRow): StatusKey {
    const cs = (r.callstatus || "").toLowerCase();
    const hasScheduledTime = r.scheduledtime && r.scheduledtime !== "" && r.scheduledtime !== "—";
    const finalOutcome = (r.finalleadoutcome || "").toLowerCase();
    const scheduleOutcomeList = ["not connected", "busy", "not reachable", "no answer", "reverify", "—", ""];

    if (hasScheduledTime && scheduleOutcomeList.includes(finalOutcome)) return "scheduled";
    if (finalOutcome === "busy") return "busy";
    if (cs.includes("notconnected") || cs.includes("no answer") || cs.includes("unanswered") || cs.includes("unreachable")) return "not_connected";
    if (cs.includes("fail") || cs.includes("error") || cs.includes("rejected") || cs.includes("invalid")) return "failed";
    if (cs.includes("in progress") || cs.includes("inprogress") || cs.includes("processing") || cs.includes("queued")) return "in_progress";

    return "completed";
}

function buildReceivedCounts(rows: ReceivedRow[], pendingCount: number) {
    const init = () => ({ total: 0, high: 0, medium: 0, low: 0 });
    const counts: Record<StatusKey, { total: number; high: number; medium: number; low: number }> = {
        total_received: init(), qualified: init(), not_qualified: init(), reschedule: init(),
        completed: init(), not_connected: init(), failed: init(), busy: init(), in_progress: init(), scheduled: init(), pending: init()
    };

    rows.forEach(r => {
        const ls = (r.leadstatus || "").toLowerCase();
        const finalOutcome = (r.finalleadoutcome || "").toLowerCase();
        const hasScheduledTime = r.scheduledtime && r.scheduledtime !== "" && r.scheduledtime !== "—";
        const intent = (r.cutomerintent || "").toLowerCase().trim();

        const addIntent = (stats: { total: number; high: number; medium: number; low: number }) => {
            stats.total++;
            if (intent.includes("high")) stats.high++;
            else if (intent.includes("medium")) stats.medium++;
            else stats.low++;
        };

        if (ls.includes("qualified") && !ls.includes("not") && !ls.includes("non") && !ls.includes("un")) {
            addIntent(counts.qualified);
            addIntent(counts.total_received);
        } else if (ls.includes("not qualified") || ls.includes("non qualified") || ls.includes("unqualified") || ls.includes("non-qualified") || ls.includes("junk") || finalOutcome === "junk") {
            addIntent(counts.not_qualified);
            addIntent(counts.total_received);
        } else {
            // Everything else (Pending, Scheduled, Open, etc.) goes to Pending / Reschedule
            addIntent(counts.reschedule);
        }
    });
    return counts;
}

function getQualificationBucket(row: ReceivedRow): "qualified" | "not_qualified" | "pending" {
    const status = (row.calculated_qualification_status || row.leadstatus || "").toLowerCase().trim();
    if (status === "qualified") return "qualified";
    if (status === "non-qualified" || status === "non qualified" || status === "not qualified" || status === "unqualified" || status === "junk") {
        return "not_qualified";
    }
    return "pending";
}

function buildConsistentReceivedCounts(rows: ReceivedRow[]) {
    const init = () => ({ total: 0, high: 0, medium: 0, low: 0 });
    const counts: Record<StatusKey, { total: number; high: number; medium: number; low: number }> = {
        total_received: init(), qualified: init(), not_qualified: init(), reschedule: init(),
        completed: init(), not_connected: init(), failed: init(), busy: init(), in_progress: init(), scheduled: init(), pending: init()
    };

    rows.forEach(r => {
        const intent = (r.cutomerintent || "").toLowerCase().trim();

        const addIntent = (stats: { total: number; high: number; medium: number; low: number }) => {
            stats.total++;
            if (intent.includes("high")) stats.high++;
            else if (intent.includes("medium")) stats.medium++;
            else stats.low++;
        };

        const qualificationBucket = getQualificationBucket(r);
        if (qualificationBucket === "qualified") {
            addIntent(counts.qualified);
            addIntent(counts.total_received);
        } else if (qualificationBucket === "not_qualified") {
            addIntent(counts.not_qualified);
            addIntent(counts.total_received);
        } else {
            addIntent(counts.reschedule);
        }
    });

    return counts;
}

// ─── View Modal Constants ─────────────────────────────────────────────────────

const CALL_INFO_KEYS = ["callSubId", "initialid", "calltype", "callstatus", "callduration", "callendreason", "callstarttime", "callendtime"];
const LEAD_INFO_KEYS = ["clientName", "mobile", "email", "company", "website", "subject", "assignto"];
const SENTIMENT_KEYS = ["customerengagementlevel", "interestlevel", "calloutcome", "leadstatus", "cutomerintent", "servicecategory", "finalleadoutcome", "finalcallstatus"];
const TIMING_KEYS = ["preferreddatetime", "scheduledtime", "scheduledstatus", "timestamp", "dateTime"];
const DETAILED_KEYS = ["aicallsummary", "cutomercontext", "notes", "additionalnotes", "aicallcategory", "nextactionrequired", "transcription"];
const KEYS_TO_HIDE = ["finalStatus", "dataSource", "viewUrl", "ivrUrl", "_ts_num", "_dt_num", "dbId", "created_at", "updated_at", "vtlStatus", "vtlAssignee", "vtlRemarks"];

const KEY_LABELS: Record<string, string> = {
    id: "ID", initialid: "Initial ID", callSubId: "Call Sub ID", callstarttime: "Call Start", callendtime: "Call End",
    callduration: "Duration", callstatus: "Call Status", calltype: "Call Type", callendreason: "End Reason",
    aicallcategory: "AI Call Category", finalcallstatus: "Final Call Status", customerengagementlevel: "Engagement",
    interestlevel: "Interest Level", calloutcome: "Call Outcome", nextactionrequired: "Next Action",
    aicallsummary: "AI Call Summary", leadstatus: "Lead Status", cutomercontext: "Customer Context",
    preferreddatetime: "Preferred D/T", cutomerintent: "Customer Intent", additionalnotes: "Add. Notes",
    servicecategory: "Service Category", finalleadoutcome: "Final Lead Outcome", scheduledtime: "Scheduled Time",
    scheduledstatus: "Sched. Status", company: "Company", website: "Website", clientName: "Client Name",
    mobile: "Mobile", email: "Email", subject: "Subject", notes: "Notes", timestamp: "Gen. Timestamp",
    dateTime: "Enquiry D/T", transcription: "Call Transcription",
};

// ─── View Modal ───────────────────────────────────────────────────────────────

// ─── Feedback Modal ──────────────────────────────────────────────────────────
function FeedbackModal({ row, currentUser, onClose, onRefresh }: { row: ReceivedRow; currentUser?: any; onClose: () => void; onRefresh: (submitted: { rating: number; comment: string }) => void }) {
    const isReadOnly = row.feedbackSubmitted;
    const [rating, setRating] = useState<number>(row.feedbackData?.rating || 0);
    const [comment, setComment] = useState<string>(row.feedbackData?.comment || "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please provide a rating");
            return;
        }
        if (!comment.trim()) {
            toast.error("Please provide additional comments");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/received-leads/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leadId: row.id,
                    feedbackData: {
                        rating,
                        comment,
                        submittedBy: currentUser ? {
                            id: currentUser.id || currentUser.employeeId || "",
                            name: currentUser.name || "",
                            email: currentUser.email || ""
                        } : undefined
                    }
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Feedback submitted successfully");
                onRefresh({ rating, comment });
                onClose();
            } else {
                toast.error(data.error || "Failed to submit feedback");
            }
        } catch (err) {
            toast.error("An error occurred while submitting feedback");
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                <div style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {isReadOnly ? <Lock size={20} /> : <MessageSquare size={20} />}
                        <div style={{ fontSize: 18, fontWeight: 800 }}>{isReadOnly ? "View Feedback" : "Submit Feedback"}</div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>×</button>
                </div>
                <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
                    {isReadOnly && row.feedbackData?.submittedBy && (
                        <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#475569" }}>
                            <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: 8, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>Submitted By</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                <div>Name: <strong style={{ color: "#0f172a" }}>{row.feedbackData.submittedBy.name || "—"}</strong></div>
                                <div>Email: <span style={{ color: "#4f46e5", fontWeight: 600 }}>{row.feedbackData.submittedBy.email || "—"}</span></div>
                                {row.feedbackData.submittedBy.id && <div>ID: <code style={{ fontSize: 11, background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace", color: "#0f172a" }}>{row.feedbackData.submittedBy.id}</code></div>}
                                {row.feedback_date && (
                                    <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>Submitted at: {row.feedback_date}</div>
                                )}
                            </div>
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>How would you rate this lead? <span style={{ color: "#ef4444" }}>*</span></div>
                        <div style={{ display: "flex", gap: 10 }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} onClick={() => !isReadOnly && setRating(star)} disabled={isReadOnly}
                                    style={{ background: "none", border: "none", cursor: isReadOnly ? "default" : "pointer", fontSize: 32, color: star <= rating ? "#f59e0b" : "#e2e8f0", transition: "transform 0.1s" }}
                                    onMouseEnter={e => !isReadOnly && (e.currentTarget.style.transform = "scale(1.2)")}
                                    onMouseLeave={e => !isReadOnly && (e.currentTarget.style.transform = "scale(1)")}>★</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Additional Comments <span style={{ color: "#ef4444" }}>*</span></div>
                        <textarea value={comment} onChange={e => !isReadOnly && setComment(e.target.value)} readOnly={isReadOnly}
                            placeholder="Share your thoughts about this lead..."
                            style={{ width: "100%", height: 120, padding: 16, borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", background: isReadOnly ? "#f8fafc" : "#fff" }} />
                    </div>
                </div>
                <div style={{ padding: "20px 32px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{isReadOnly ? "Close" : "Cancel"}</button>
                    {!isReadOnly && (
                        <button onClick={handleSubmit} disabled={submitting || rating === 0 || !comment.trim()}
                            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (submitting || rating === 0 || !comment.trim()) ? "not-allowed" : "pointer", opacity: (submitting || rating === 0 || !comment.trim()) ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            Submit Feedback
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ViewModal({ row, onClose, onCallHistory }: { row: ReceivedRow; onClose: () => void; onCallHistory: () => void }) {
    const toTitleCase = (str: string) => KEY_LABELS[str] || str.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
    const val = (v: any) => { if (v === null || v === undefined) return "—"; const t = String(v).trim(); return (t === "" || t === "0" || t === "—") ? "—" : t; };

    const Field = ({ label, value, color = "#4f46e5" }: { label: string; value: any; color?: string }) => (
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".8px", textTransform: "uppercase", color, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
            <div style={{ fontSize: 12.5, color: "#1e293b", fontWeight: 500, lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "anywhere" }}>{val(value)}</div>
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
    const filterFields = (keys: string[]) => keys.map(k => ({ key: k, label: toTitleCase(k), value: row[k as keyof ReceivedRow] }));
    const allDefined = [...CALL_INFO_KEYS, ...LEAD_INFO_KEYS, ...SENTIMENT_KEYS, ...TIMING_KEYS, ...DETAILED_KEYS, ...KEYS_TO_HIDE];
    const generalFields = Object.entries(row).filter(([k, v]) => !allDefined.includes(k) && typeof v !== "object").map(([k, v]) => ({ key: k, label: toTitleCase(k), value: v }));

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Complete Call Analysis</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4 }}>{row.clientName}</span>
                                <span style={{ opacity: 0.5 }}>•</span>
                                <span>{row.mobile}</span>
                                {row.initialid && <><span style={{ opacity: 0.5 }}>•</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>ID: {row.initialid}</span></>}
                            </div>
                        </div>
                        {/* <button onClick={() => { onClose(); onCallHistory(); }}
                            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all .2s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            View Call History
                        </button> */}
                    </div>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>×</button>
                </div>
                {/* Content */}
                <div style={{ overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px 48px" }}>
                        <Section title="Call Management" icon="📞" color="#0891b2">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(CALL_INFO_KEYS).map(f => <Field key={f.key} label={f.label} value={f.value} color="#0891b2" />)}
                            </div>
                        </Section>
                        <Section title="Lead & Business" icon="🏢" color="#4f46e5">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(LEAD_INFO_KEYS).map(f => <Field key={f.key} label={f.label} value={f.value} color="#4f46e5" />)}
                            </div>
                        </Section>
                        <Section title="Sentiment & Outcome" icon="📈" color="#7c3aed">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(SENTIMENT_KEYS).map(f => <Field key={f.key} label={f.label} value={f.value} color="#7c3aed" />)}
                            </div>
                        </Section>
                        <Section title="Timeline & System" icon="🕒" color="#d946ef">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                {filterFields(TIMING_KEYS).map(f => <Field key={f.key} label={f.label} value={f.value} color="#d946ef" />)}
                            </div>
                        </Section>
                    </div>
                    {generalFields.length > 0 && (
                        <Section title="General Information" icon="📁" color="#64748b" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px 20px" }}>
                                {generalFields.map(f => <Field key={f.key} label={f.label} value={f.value} color="#64748b" />)}
                            </div>
                        </Section>
                    )}
                    {(row.ivrUrl || row.viewUrl) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: "20px", background: "#f8fafc", borderRadius: 16, border: "1px dashed #e2e8f0" }}>
                            {row.ivrUrl && row.ivrUrl !== "—" && (
                                <button onClick={() => hasNonZeroDuration(row.callduration) && window.open(row.ivrUrl)} disabled={!hasNonZeroDuration(row.callduration)} style={{ flex: "1 1 240px", padding: "12px 20px", borderRadius: 12, border: hasNonZeroDuration(row.callduration) ? "1px solid #4338ca" : "1px solid #cbd5e1", background: hasNonZeroDuration(row.callduration) ? "#4338ca" : "#e5e7eb", color: hasNonZeroDuration(row.callduration) ? "#fff" : "#94a3b8", fontSize: 13, fontWeight: 700, cursor: hasNonZeroDuration(row.callduration) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14m0 0l-4-4m4 4l4-4" /><path d="M4 19h16" /></svg>
                                    Download / Play Audio Recording
                                </button>
                            )}
                            {row.viewUrl && row.viewUrl !== "—" && (
                                <button onClick={() => hasNonZeroDuration(row.callduration) && window.open(row.viewUrl)} disabled={!hasNonZeroDuration(row.callduration)} style={{ flex: "1 1 240px", padding: "12px 20px", borderRadius: 12, border: hasNonZeroDuration(row.callduration) ? "1px solid #4338ca" : "1px solid #cbd5e1", background: hasNonZeroDuration(row.callduration) ? "#fff" : "#e5e7eb", color: hasNonZeroDuration(row.callduration) ? "#4338ca" : "#94a3b8", fontSize: 13, fontWeight: 700, cursor: hasNonZeroDuration(row.callduration) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    View Full Analysis Report
                                </button>
                            )}
                        </div>
                    )}
                    <Section title="AI Analysis & Detailed Context" icon="🧠" color="#03412f" style={{ borderTop: "2px solid #f1f5f9", paddingTop: 32 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            <div style={{ background: "#f0fdfa", borderRadius: 16, border: "1px solid #ccfbf1", padding: "20px 24px" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#0f766e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>AI Call Summary</div>
                                <div style={{ fontSize: 14, color: "#134e4a", lineHeight: 1.7, wordBreak: "break-word" }}>{val(row.aicallsummary)}</div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Customer Context</div>
                                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.cutomercontext)}</div>
                                </div>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>Notes & Observations</div>
                                    <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.notes)}</div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                                {[{ lbl: "Additional Notes", v: row.additionalnotes }, { lbl: "AI Call Category", v: row.aicallcategory }, { lbl: "Next Action Required", v: row.nextactionrequired }].map(({ lbl, v }) => (
                                    <div key={lbl} style={{ background: "#f1f5f9", borderRadius: 12, padding: "14px 20px" }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>{lbl}</div>
                                        <div style={{ fontSize: 12, color: "#334155" }}>{val(v)}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                <div style={{ background: "#f8fafc", padding: "12px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 14 }}>🎙️</span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px" }}>Call Transcription</span>
                                </div>
                                <div style={{ padding: "24px", maxHeight: "300px", overflowY: "auto", fontSize: 13.5, color: "#334155", lineHeight: 1.85, whiteSpace: "pre-wrap", wordBreak: "break-word", background: "linear-gradient(to bottom, #ffffff, #fafafa)" }}>
                                    {val(row.transcription)}
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

// ─── Call History Modal Helpers ───────────────────────────────────────────────

function parseDateTime(dt: string): number {
    if (!dt || dt === "—") return 0;
    const a = dt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (a) {
        const first = parseInt(a[1]), second = parseInt(a[2]);
        const [day, mon] = first > 12 ? [first, second] : [second, first];
        return new Date(`${a[3]}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}T${a[4].padStart(2, "0")}:${a[5]}:${a[6] || "00"}`).getTime();
    }
    return new Date(dt).getTime() || 0;
}
function formatDate(dt: string): string {
    if (!dt || dt === "—") return "—";
    // Handle ISO format: 2026-06-16T04:44:40 or 2026-06-16T04:44:40.000Z
    const isoMatch = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
        const [, yr, mo, day, hr, min, sec] = isoMatch;
        const h = parseInt(hr);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${day}/${mo}/${yr} ${String(h12).padStart(2, "0")}:${min}${sec ? ":" + sec : ""} ${ampm}`;
    }
    return dt;
}

function getRowSortTime(row: ReceivedRow): number {
    const explicit = Math.max(row._ts_num || 0, row._dt_num || 0);
    if (explicit > 0) return explicit;
    // Fallback: _ts_num/_dt_num aren't always set (e.g. fresh data fetched directly
    // from the API inside CallHistoryModal) — derive the timestamp from whichever
    // date/time field is actually populated, so ordering is never wrong.
    const candidates = [row.dateTime, row.timestamp, row.callstarttime].filter(Boolean) as string[];
    for (const c of candidates) {
        const t = parseDateTime(c);
        if (t > 0) return t;
    }
    return 0;
}

function formatCallDateTime(dt: string) {
    if (!dt || dt === "—") return <span style={{ color: "#94a3b8" }}>—</span>;
    const parts = dt.split(" ");
    if (parts.length < 2) return <span>{dt}</span>;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 600 }}>{parts[0]}</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>{parts[1]}</span>
        </div>
    );
}

// ─── Signed Audio Player ──────────────────────────────────────────────────────

function SignedAudioPlayer({ url, dateTime, duration }: { url: string; dateTime: string; duration?: string | number }) {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const blobRef = useRef<string | null>(null);

    useEffect(() => {
        if (!url || url === "—") return;
        setLoading(true);
        setError(null);
        fetch(`/api/audio-proxy?url=${encodeURIComponent(url)}`)
            .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                blobRef.current = objectUrl;
                setBlobUrl(objectUrl);
                setLoading(false);
            })
            .catch(err => { console.error("Audio fetch failed:", err); setError("Could not load recording. The link may have expired."); setLoading(false); });
        return () => { if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current = null; } };
    }, [url]);

    return (
        <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #c4b5fd", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "#3c23bb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                </div>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Call Recording</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{dateTime}{duration ? ` · ${duration}s` : ""}</div>
                </div>
            </div>
            {loading && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: "#6366f1", fontSize: 12 }}><div style={{ width: 14, height: 14, border: "2px solid #e0e7ff", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Loading recording...</div>}
            {error && <div style={{ fontSize: 12, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca" }}>⚠️ {error}<a href={url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}>Open directly ↗</a></div>}
            {blobUrl && <audio controls src={blobUrl} style={{ width: "100%", height: 36, accentColor: "#6366f1", display: "block" }} />}
        </div>
    );
}

// ─── Call History Modal ───────────────────────────────────────────────────────

function CallHistoryModal({ selectedRow, allData, sentData, onClose }: { selectedRow: ReceivedRow; allData: ReceivedRow[]; sentData: SentRow[]; onClose: () => void }) {
    const searchId = (selectedRow.initialid && selectedRow.initialid !== "—")
        ? selectedRow.initialid
        : selectedRow.id;

    const preloaded = useMemo(() => {
        return allData
            .filter(r => r.initialid === searchId)
            .sort((a, b) => getRowSortTime(b) - getRowSortTime(a));
    }, [allData, searchId]);

    const [calls, setCalls] = useState<ReceivedRow[]>(preloaded);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState("");

    const sentNote = useMemo(() => {
        const found = sentData.find(s => s.enquiryId === searchId);
        return found ? found.notes : (selectedRow.notes || "");
    }, [sentData, searchId, selectedRow.notes]);

    useEffect(() => {
        if (preloaded.length > 0) setCalls(preloaded);
    }, [preloaded]);

    useEffect(() => {
        if (!selectedRow) return;
        setHistoryLoading(true);
        fetch(`/api/received-leads?initialId=${encodeURIComponent(searchId)}&allRows=1`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setCalls(data.sort((a: ReceivedRow, b: ReceivedRow) => getRowSortTime(b) - getRowSortTime(a)));
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

        // Non-Qualified outcomes → red
        const nonQualified = [
            "did not enquire", "junk", "not interested", "not interested ahv", "cold",
            "duplicate lead", "outreach stopped", "dnc client: don't call further",
            "dnc client: dont call further", "max auto dial attempts completed", "do not call back",
        ];
        // Retry / Pending / Schedule outcomes → orange
        const retryPending = [
            "not connected", "not reachable", "no answer", "technical error",
            "call disconnected", "call rejected", "conversational ai error",
            "busy", "language issue", "call failed",
        ];

        if (nonQualified.some(k => v === k || v.includes(k))) return RED;
        if (retryPending.some(k => v === k || v.includes(k))) return ORANGE;
        // Everything else falls under Qualified → green
        return GREEN;
    };


    const initials = (name: string) => (name || "").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "–";

    const calcVariance = (): string => {
        if (calls.length < 2) return "—";
        const oldest = getRowSortTime(calls[calls.length - 1]);
        const latest = getRowSortTime(calls[0]);
        const diffSec = Math.abs((latest - oldest) / 1000);
        const h = Math.floor(diffSec / 3600), m = Math.floor((diffSec % 3600) / 60), s = Math.floor(diffSec % 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };

    const getFullTime = (c: ReceivedRow) => {
        if (!c) return "—";
        let dt = c.dateTime || "";
        if (!dt.includes(":") && c.callstarttime && c.callstarttime.includes(":")) {
            if (c.callstarttime.length > 10) return c.callstarttime;
            return dt + " " + c.callstarttime;
        }
        return dt;
    };

    const activeCall = (calls && calls[activeIndex]) ? calls[activeIndex] : (calls?.[0] ?? null);
    const ac = activeCall;
    const acFullTime = ac ? getFullTime(ac) : "—";
    const acStatus = ac ? (ac.finalleadoutcome || ac.callstatus || ac.finalStatus?.label || "") : "";
    const acSt = getStatusStyle(acStatus);

    const chipStyle: React.CSSProperties = { background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1.5px solid #9ca6b4", boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 0 0 1px rgba(99,102,241,0.12)", display: "flex", flexDirection: "column", gap: 4 };
    const chipLbl: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: ".8px" };
    const chipVal: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#0f172a", wordBreak: "break-all" };

    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div className="bg-white rounded-2xl w-full max-w-5xl h-full md:h-auto md:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl mx-1 sm:mx-4 relative">
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
                    {/* ── Left Panel ── */}
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
                                            onClick={() => { setNotes(sentNote); setShowNotes(true); }}>View Notes</button>
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
                                const isOutbound = ctype === "outbound";
                                const isInbound = ctype === "inbound";
                                return (
                                    <div key={call.id + ci} onClick={() => setActiveIndex(ci)}
                                        style={{ display: "flex", gap: 10, padding: "10px 16px", cursor: "pointer", borderLeft: `3px solid ${activeIndex === ci ? "#6366f1" : "transparent"}`, background: activeIndex === ci ? "#f0f4ff" : "transparent", transition: "background .15s" }}>
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: isFirst ? "#10b981" : activeIndex === ci ? "#6366f1" : "#cbd5e1", border: `2px solid ${isFirst ? "#10b981" : activeIndex === ci ? "#6366f1" : "#e2e8f0"}`, flexShrink: 0, marginTop: 3 }} />
                                            {ci < calls.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 24, background: "#e2e8f0", marginTop: 4 }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#334155" }}>{formatDate(getFullTime(call))}</span>
                                                {(isOutbound || isInbound) && (
                                                    <span title={isOutbound ? "Outbound (outgoing) call" : "Inbound (incoming) call"} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: isOutbound ? "#e0e7ff" : "#d1fae5", border: `1.5px solid ${isOutbound ? "#6366f1" : "#10b981"}`, boxShadow: `0 0 0 2px ${isOutbound ? "#eef2ff" : "#ecfdf5"}`, flexShrink: 0 }}>
                                                            {isOutbound
                                                                ? <PhoneOutgoing size={13} color="#4338ca" strokeWidth={2.75} />
                                                                : <PhoneIncoming size={13} color="#047857" strokeWidth={2.75} />}
                                                        </span>
                                                        <span style={{ fontSize: 10, fontWeight: 800, color: isOutbound ? "#4338ca" : "#047857" }}>{isOutbound ? "Outgoing" : "Incoming"}</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{call.id}</div>
                                            <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" as const, alignItems: "center" }}>
                                                {status && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.fg }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: st.dot }} />{status}</span>}
                                                {Number(call.callduration) > 0 && <span style={{ fontSize: 10, color: "#94a3b8" }}>{call.callduration}s</span>}
                                                {isFirst && <span style={{ fontSize: 9, fontWeight: 800, color: "#10b981", letterSpacing: ".3px" }}>LATEST</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* ── Right Panel ── */}
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
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1526c4", flex: 1 }}>{formatDate(acFullTime)}</span>
                                    {acStatus && (
                                        <div className="flex items-center gap-2 sm:ml-auto pr-8 sm:pr-0">
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: acSt.bg, color: acSt.fg, whiteSpace: "nowrap", border: `1px solid ${acSt.fg}`, boxShadow: `0 0 0 1px ${acSt.fg}20` }}>
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
                                            { label: "Initial ID", value: ac.initialid },
                                            { label: "Call ID", value: ac.id },
                                            { label: "Call Start Time", value: formatDate(acFullTime) },
                                            { label: "Call Duration", value: ac.callduration ? `${ac.callduration}` : "" },
                                            { label: "Call Type", value: ac.calltype },
                                            { label: "Call Start", value: formatDate(ac.callstarttime) },
                                            { label: "Call End", value: formatDate(ac.callendtime) },
                                            { label: "Call End Reason", value: ac.callendreason },
                                            { label: "Lead Status", value: ac.leadstatus },
                                            { label: "Lead Intent", value: ac.cutomerintent },
                                            { label: "Company", value: ac.company },
                                            { label: "Call Transcription", value: ac.transcription && ac.ivrUrl ? "View Transcription" : "" },
                                        ].filter(f => f.value && String(f.value).trim() && String(f.value).trim() !== "0" && String(f.value).trim() !== "—")
                                            .map(f => (
                                                <div key={f.label} style={chipStyle}>
                                                    <div style={chipLbl}>{f.label}</div>
                                                    {f.label === "Call Transcription" ? (
                                                        <div style={{ ...chipVal, color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }} onClick={() => window.open(ac.viewUrl || ac.transcription)}>{f.value}</div>
                                                    ) : (
                                                        <div style={{ ...chipVal, color: f.label === "Lead Status" ? colorText(String(f.value), "leadstatus") : (f.label === "Lead Intent" && String(f.value).toLowerCase() === "high") ? "#ef4444" : chipVal.color }}>{String(f.value)}</div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                                {ac.ivrUrl && ac.ivrUrl !== "—" && ac.ivrUrl !== "-" && (
                                    <SignedAudioPlayer url={ac.ivrUrl} dateTime={ac.dateTime} duration={ac.callduration} />
                                )}
                                {ac.aicallsummary && (
                                    <div style={{ background: "#fff", borderRadius: "0 12px 12px 0", border: "1.5px solid #e2e8f0", borderLeft: "4px solid #21228d", padding: "14px 16px" }}>
                                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1px", color: "#e6281a", textTransform: "uppercase" as const, marginBottom: 8 }}>AI Summary</div>
                                        <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7 }}>{ac.aicallsummary}</div>
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
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enquiry Created</span>
                            <span className="text-xs font-bold text-slate-700">{calls.length > 0 ? formatDate(calls[calls.length - 1].dateTime) : "—"}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Called</span>
                            <span className="text-xs font-bold text-slate-700">{calls.length > 0 ? formatDate(calls[0].dateTime) : "—"}</span>
                        </div>
                        <div className="hidden sm:block w-px h-4 bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Variance</span>
                            <span className="text-xs font-extrabold text-rose-500 font-mono">{calcVariance()}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 focus:ring-2 focus:ring-indigo-500 transition-all active:scale-95">Close Dashboard</button>
                </div>
                {/* Notes sub-modal */}
                {showNotes && (
                    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
                        onClick={e => { if (e.target === e.currentTarget) setShowNotes(false); }}>
                        <div style={{ background: "#fff", padding: 20, borderRadius: 12, width: "95%", maxWidth: 400, maxHeight: "80%", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
                            <h3 style={{ marginBottom: 10 }}>Notes</h3>
                            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{notes}</div>
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
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>Lead Outreach & Response Status</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Callback Performance — Status & Outcome Breakdown</div>
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
                            {[...Array(6)].map((_, i) => <div key={i} style={{ height: 86, borderRadius: 10, background: "#e9ecef", animation: "kpi-pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {STATUS_CFG.map(cfg => {
                                const stats = counts[cfg.key] || { total: 0, high: 0, medium: 0, low: 0 };
                                const count = stats.total;
                                const calculatePercent = (value: number, totalAmount: number) =>
                                    totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : "0.0";
                                const denom = (cfg.key === "qualified" || cfg.key === "not_qualified" || cfg.key === "total_received") ? respondedTotal : total;
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
                                        {cfg.key !== "reschedule" && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                <div style={{ display: "inline-flex", alignItems: "center", background: cfg.color + "18", borderRadius: 20, padding: "2px 9px", width: "fit-content" }}>
                                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color }}>{pct}%</span>
                                                </div>
                                            </div>
                                        )}

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

function formatSeconds(s: string | number) {
    const sec = parseInt(String(s));
    if (isNaN(sec) || sec <= 0) return s || "—";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const rs = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(rs).padStart(2, '0')}`;
    return `${m}:${String(rs).padStart(2, '0')}`;
}

function hasNonZeroDuration(duration: string | number) {
    if (typeof duration === "number") return duration > 0;

    const raw = String(duration || "").trim();
    if (!raw || raw === "—") return false;

    if (/^\d+:\d{2}:\d{2}$/.test(raw)) {
        const [hours, minutes, seconds] = raw.split(":").map(Number);
        return (hours * 3600) + (minutes * 60) + seconds > 0;
    }

    if (/^\d+:\d{2}$/.test(raw)) {
        const [minutes, seconds] = raw.split(":").map(Number);
        return (minutes * 60) + seconds > 0;
    }

    const sec = parseInt(raw, 10);
    return !isNaN(sec) && sec > 0;
}

// ─── Received Table ───────────────────────────────────────────────────────────

function ReceivedTableInnerNoHeader({ data, allData, sentData, currentUser, refetchReceived }: { data: ReceivedRow[]; allData: ReceivedRow[]; sentData: SentRow[]; currentUser?: any; refetchReceived: () => Promise<void> }) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [viewRow, setViewRow] = useState<ReceivedRow | null>(null);
    const [historyRow, setHistoryRow] = useState<ReceivedRow | null>(null);
    const [feedbackRow, setFeedbackRow] = useState<ReceivedRow | null>(null);
    const [transferRow, setTransferRow] = useState<ReceivedRow | null>(null);
    // Row ids whose feedback was just submitted and are awaiting fresh data from server.
    // Stores the submitted {rating, comment} so we can confirm the refetched row actually
    // reflects this submission before unlocking the button (not just that a refetch happened).
    const [pendingFeedback, setPendingFeedback] = useState<Record<string, { rating: number; comment: string; startedAt: number }>>({});
    const [pendingTransfer, setPendingTransfer] = useState<Record<string, { status: string; assignee: string; remarks: string; startedAt: number }>>({});
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
            else if (sortKey === "callduration") { av = parseInt(String(a.callduration)) || 0; bv = parseInt(String(b.callduration)) || 0; }
            else if (sortKey === "callstatus") { av = a.callstatus.toLowerCase(); bv = b.callstatus.toLowerCase(); }
            else if (sortKey === "finalcallstatus") { av = a.finalcallstatus.toLowerCase(); bv = b.finalcallstatus.toLowerCase(); }
            else if (sortKey === "interestlevel") { av = a.interestlevel.toLowerCase(); bv = b.interestlevel.toLowerCase(); }
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
    // Row visibility: non-admin users only see Non-Qualified rows assigned to them
    const isCurrentUserAdmin = ["super_admin", "admin"].includes((currentUser?.role || "").toLowerCase());
    const currentUserMe = (currentUser?.name || currentUser?.email || "").trim().toLowerCase();
    const visibleData = useMemo(() => {
        if (isCurrentUserAdmin) return sorted;
        return sorted.filter(r => {
            const isNQRow = (r.leadstatus === "Non-Qualified" || !!r.vtlStatus);
            if (!isNQRow) return true;
            const doer = (r.doer || r.vtlAssignee || "").trim().toLowerCase();
            if (!doer) return true;
            return doer === currentUserMe;
        });
    }, [sorted, isCurrentUserAdmin, currentUserMe]);
    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(visibleData.length / perPage));
        if (page > totalPages) {
            setPage(1);
        }
    }, [visibleData.length, perPage, page]);
    const paged = visibleData.slice((page - 1) * perPage, page * perPage);
    const sp = { sortKey, sortDir, onSort: handleSort };

    // Keep polling the server every few seconds while any feedback/transfer submission is pending,
    // so the lock clears as soon as fresh data actually arrives instead of relying on a fixed wait.
    const pendingIds = Object.keys(pendingFeedback);
    const pendingTransferIds = Object.keys(pendingTransfer);
    const pendingKey = pendingIds.join(",");
    const pendingTransferKey = pendingTransferIds.join(",");
    const pollingIntervalRef = useRef<number | null>(null);
    useEffect(() => {
        if (pendingIds.length === 0 && pendingTransferIds.length === 0) return;
        const stopPolling = () => {
            if (pollingIntervalRef.current !== null) {
                window.clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
        const shouldPausePolling = () => document.hidden || document.visibilityState !== "visible" || !document.hasFocus();
        const startPolling = () => {
            if (shouldPausePolling() || pollingIntervalRef.current !== null) {
                return;
            }
            pollingIntervalRef.current = window.setInterval(() => {
                if (shouldPausePolling()) {
                    stopPolling();
                    return;
                }
                refetchReceived();
            }, 5000) as unknown as number;
        };
        const syncPolling = () => {
            if (pendingIds.length === 0 && pendingTransferIds.length === 0) {
                stopPolling();
                return;
            }
            if (shouldPausePolling()) {
                stopPolling();
                return;
            }
            startPolling();
        };
        const handleVisibilityChange = () => {
            syncPolling();
            if (!shouldPausePolling()) {
                refetchReceived();
            }
        };
        const handleWindowBlur = () => {
            syncPolling();
        };
        const handleWindowFocus = () => {
            syncPolling();
            if (!shouldPausePolling()) {
                refetchReceived();
            }
        };
        const handlePageHide = () => {
            syncPolling();
        };
        const handlePageShow = () => {
            syncPolling();
            if (!shouldPausePolling()) {
                refetchReceived();
            }
        };
        const handleFreeze = () => {
            syncPolling();
        };
        const handleResume = () => {
            syncPolling();
            if (!shouldPausePolling()) {
                refetchReceived();
            }
        };
        syncPolling();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("freeze", handleFreeze as EventListener);
        document.addEventListener("resume", handleResume as EventListener);
        window.addEventListener("blur", handleWindowBlur);
        window.addEventListener("focus", handleWindowFocus);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("pageshow", handlePageShow);
        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("freeze", handleFreeze as EventListener);
            document.removeEventListener("resume", handleResume as EventListener);
            window.removeEventListener("blur", handleWindowBlur);
            window.removeEventListener("focus", handleWindowFocus);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("pageshow", handlePageShow);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingKey, pendingTransferKey]);

    // Whenever fresh allData comes in, check pending rows: only unlock once the row's feedbackData
    // genuinely matches what was just submitted (confirms the refresh actually picked it up).
    useEffect(() => {
        if (pendingIds.length === 0) return;
        setPendingFeedback(prev => {
            let changed = false;
            const next = { ...prev };
            for (const id of Object.keys(prev)) {
                const expected = prev[id];
                const fresh = allData.find(r => r.id === id);
                const matches = !!fresh?.feedbackSubmitted
                    && String(fresh.feedbackData?.comment ?? "").trim() === expected.comment.trim()
                    && Number(fresh.feedbackData?.rating) === Number(expected.rating);
                // Safety valve: if it's been stuck for over 12 minutes, unlock anyway so the
                // button never stays disabled forever even if something upstream is off.
                const timedOut = Date.now() - expected.startedAt > 12 * 60 * 1000;
                if (matches || timedOut) { delete next[id]; changed = true; }
            }
            return changed ? next : prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allData, pendingKey]);

    // Same pattern for pending transfers: unlock once the row's vtlStatus matches what was submitted.
    useEffect(() => {
        if (pendingTransferIds.length === 0) return;
        setPendingTransfer(prev => {
            let changed = false;
            const next = { ...prev };
            for (const id of Object.keys(prev)) {
                const expected = prev[id];
                const fresh = allData.find(r => r.id === id);
                const matches = !!fresh?.vtlStatus
                    && String(fresh.vtlStatus ?? "").trim() === expected.status.trim()
                    && String(fresh.vtlAssignee ?? "").trim() === expected.assignee.trim();
                const timedOut = Date.now() - expected.startedAt > 12 * 60 * 1000;
                if (matches || timedOut) { delete next[id]; changed = true; }
            }
            return changed ? next : prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allData, pendingTransferKey]);

    return (
        <>
            {viewRow && <ViewModal row={allData.find(r => r.id === viewRow.id) ?? viewRow} onClose={() => setViewRow(null)} onCallHistory={() => setHistoryRow(viewRow)} />}
            {historyRow && <CallHistoryModal selectedRow={historyRow} allData={allData} sentData={sentData} onClose={() => setHistoryRow(null)} />}
            {feedbackRow && <FeedbackModal row={allData.find(r => r.id === feedbackRow.id) ?? feedbackRow} currentUser={currentUser} onClose={() => setFeedbackRow(null)} onRefresh={(submitted) => {
                const rowId = feedbackRow.id;
                setPendingFeedback(prev => ({ ...prev, [rowId]: { ...submitted, startedAt: Date.now() } }));
                refetchReceived();
            }} />}
            {transferRow && (
                <VerifyTransferLeadModal
                    isOpen={!!transferRow}
                    row={allData.find(r => r.id === transferRow.id) ?? transferRow}
                    onClose={() => setTransferRow(null)}
                    onRefresh={(submitted: any) => {
                        const rowId = transferRow.id;
                        setPendingTransfer(prev => ({ ...prev, [rowId]: { ...submitted, startedAt: Date.now() } }));
                        refetchReceived();
                    }}
                />
            )}
            <style>{`
                .received-table-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background .12s, box-shadow .12s;
                }
                .received-table-row:hover {
                    background: #e0e7ff !important;
                    box-shadow: inset 3px 0 0 #4f46e5 !important;
                }
                /* Default: full header label shown, short one hidden. Flipped on mobile below. */
                .lbl-short { display: none; }
                /* Desktop / laptop / big screens — freeze all 4 lead-identifier columns */
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

                /* Mobile / tablet (<1024px) — same 4 frozen columns as desktop, just compacted.
                   At desktop widths (590px total) there'd be nothing left to scroll on a phone,
                   so widths/padding/font-size are cut down here to ~300px total, leaving a
                   small but real scrollable strip for the remaining columns. */
                @media (max-width: 1023.98px) {
                    .sticky-header-1, .sticky-cell-1 { left: 0; min-width: 64px; max-width: 64px; }
                    .sticky-header-2, .sticky-cell-2 { left: 64px; min-width: 76px; max-width: 76px; }
                    .sticky-header-3, .sticky-cell-3 { left: 140px; min-width: 58px; max-width: 58px; }
                    .sticky-header-4, .sticky-cell-4 { left: 198px; min-width: 104px; max-width: 104px; }

                    .sticky-header-1, .sticky-header-2, .sticky-header-3, .sticky-header-4 {
                        position: sticky; z-index: 20; background: #1e2a4a !important;
                        overflow: hidden; /* clip instead of bleeding into the next column if anything still doesn't fit */
                    }
                    .sticky-cell-1, .sticky-cell-2, .sticky-cell-3, .sticky-cell-4 {
                        position: sticky; z-index: 10; background: #fff;
                    }
                    .sticky-header-4, .sticky-cell-4 {
                        box-shadow: 4px 0 8px -2px rgba(0,0,0,0.15) !important;
                        border-right: none !important;
                    }

                    /* Tighter padding/font so 4 columns actually fit in ~300px combined */
                    .sticky-header-1, .sticky-header-2, .sticky-header-3, .sticky-header-4,
                    .sticky-cell-1, .sticky-cell-2, .sticky-cell-3, .sticky-cell-4 {
                        padding: 6px 5px !important;
                        font-size: 9.5px !important;
                    }

                    /* Swap to the short header label (e.g. "Gen TS" instead of "Gen Timestamp") —
                       there isn't room for the full label once the column is squeezed to 60-100px. */
                    .lbl-full { display: none; }
                    .lbl-short { display: inline; }

                    /* Sort arrows cost ~14px we don't have on the two tightest frozen columns;
                       the header is still tappable to sort even without the indicator visible. */
                    .sticky-header-1 .sort-arrows,
                    .sticky-header-2 .sort-arrows {
                        display: none;
                    }

                    /* "20/03/2026" fits on one line at this width; "16/03/2026 07:11" needs to
                       wrap onto two (date / time) since there's no room for it on one line. */
                    .sticky-cell-2 {
                        white-space: normal !important;
                        overflow-wrap: break-word;
                        line-height: 1.3;
                    }

                    .sticky-cell-4 > div {
                        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                    }
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

                /* True phones (<640px) — 4 frozen columns (302px) leave almost nothing to
                   scroll on a ~375-414px screen, so the remaining 19 columns become
                   effectively invisible. Un-freeze the first 3 here and keep only
                   Client Details (the one column users actually need pinned) sticky. */
                @media (max-width: 639.98px) {
                    .sticky-header-1, .sticky-cell-1,
                    .sticky-header-2, .sticky-cell-2,
                    .sticky-header-3, .sticky-cell-3 {
                        position: static !important;
                        left: auto !important;
                        min-width: 90px;
                        max-width: none;
                        box-shadow: none !important;
                    }
                    .sticky-header-4, .sticky-cell-4 {
                        left: 0 !important;
                        min-width: 130px;
                        max-width: 130px;
                    }
                }

                /* Smooth momentum scrolling on iOS Safari + stop the page itself from
                   scrolling sideways when the user reaches the edge of the table. */
                .received-table-scroll {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior-x: contain;
                }
            `}</style>
            <div className="received-table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#1e2a4a" }}>
                            <SortableTh colKey="timestamp" {...sp} className="sticky-header-1"><HLabel full="Gen Timestamp" short="Gen TS" /></SortableTh>
                            <SortableTh colKey="dateTime" {...sp} className="sticky-header-2"><HLabel full="Enq Date & Time" short="Enq D&T" /></SortableTh>
                            <Th className="sticky-header-3">ID</Th>
                            <SortableTh colKey="clientName" {...sp} className="sticky-header-4"><HLabel full="Client Details" short="Client" /></SortableTh>
                            <Th>Subject</Th><Th>Call Recording</Th>
                            <SortableTh colKey="website" {...sp}>Data Source</SortableTh>
                            <SortableTh colKey="company" {...sp}>Company</SortableTh>
                            <Th>Call Start</Th><Th>Call End</Th>
                            <SortableTh colKey="callduration" {...sp}>Duration (H:M:S)</SortableTh>
                            <SortableTh colKey="callstatus" {...sp}>Status</SortableTh>
                            <Th>Call End Reason</Th>
                            {/* <SortableTh colKey="interestlevel" {...sp}>Interest</SortableTh> */}
                            <Th>AI Summary</Th>
                            <SortableTh colKey="leadstatus" {...sp}>Lead Status</SortableTh>
                            {/* <Th>Customer Context</Th> */}
                            <Th>Scheduled Time</Th>
                            <SortableTh colKey="cutomerintent" {...sp}>Customer Intent</SortableTh>
                            <SortableTh colKey="finalleadoutcome" {...sp}>Final Lead Outcome</SortableTh>
                            <SortableTh colKey="assignto" {...sp}>Assign To</SortableTh>
                            <Th>Doer Name</Th>
                            <Th>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr><td colSpan={23} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No records found</td></tr>
                        ) : paged.map((row, i) => (
                            <tr key={row.id + i} className="received-table-row">
                                <Td className="sticky-cell-1">{row.timestamp}</Td>
                                <Td className="sticky-cell-2">{row.dateTime}</Td>
                                <CopyTd value={row.initialid} className="sticky-cell-3" />
                                <Td className="sticky-cell-4">
                                    <div title={row.clientName} style={{ fontWeight: 600, color: "#1e293b" }}>{row.clientName}</div>
                                    {row.mobile && <div title={String(row.mobile)} style={{ fontSize: 11.5, color: "#1e293b", marginTop: 2 }}>{row.mobile}</div>}
                                    {row.email && <div title={row.email} style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{row.email}</div>}
                                </Td>
                                <TooltipTd label="Subject" maxWidth={100}>{row.subject}</TooltipTd>
                                <Td>
                                    {row.ivrUrl ? <div style={{ cursor: hasNonZeroDuration(row.callduration) ? "pointer" : "not-allowed", color: hasNonZeroDuration(row.callduration) ? "#059669" : "#94a3b8", fontWeight: 600, fontSize: 10.5, opacity: hasNonZeroDuration(row.callduration) ? 1 : 0.7 }} onClick={hasNonZeroDuration(row.callduration) ? () => window.open(row.ivrUrl) : undefined}>Download</div> : null}
                                    {row.viewUrl ? <div style={{ cursor: hasNonZeroDuration(row.callduration) ? "pointer" : "not-allowed", color: hasNonZeroDuration(row.callduration) ? "#4f46e5" : "#94a3b8", marginTop: 4, fontWeight: 600, fontSize: 10.5, opacity: hasNonZeroDuration(row.callduration) ? 1 : 0.7 }} onClick={hasNonZeroDuration(row.callduration) ? () => window.open(row.viewUrl) : undefined}>View Transcription</div> : null}
                                    {!row.ivrUrl && !row.viewUrl && "—"}
                                </Td>
                                <TooltipTd label="Data Source" maxWidth={80}>{row.dataSource.label}</TooltipTd>
                                <Td>{row.company}</Td>
                                <Td>{formatCallDateTime(row.callstarttime)}</Td>
                                <Td>{formatCallDateTime(row.callendtime)}</Td>
                                <Td>{formatSeconds(row.callduration)}</Td>
                                <ColorTd value={row.callstatus} type="status" maxWidth={120} />
                                <Td>{row.callendreason}</Td>
                                {/* <ColorTd value={row.interestlevel} type="interest" maxWidth={100} /> */}
                                <TooltipTd label="AI Summary" maxWidth={140}>{row.aicallsummary}</TooltipTd>
                                <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis" }}>
                                    <span style={{ color: colorText(row.leadstatus, "leadstatus"), fontWeight: 700 }} title={row.leadstatus}>{row.leadstatus || "—"}</span>
                                </td>
                                {/* <TooltipTd label="Customer Context" maxWidth={140}>{row.cutomercontext}</TooltipTd> */}
                                <TooltipTd label="Scheduled Time" maxWidth={130}>{row.scheduledtime}</TooltipTd>
                                <ColorTd value={row.cutomerintent} type="intent" maxWidth={120} />
                                <ColorTd value={row.finalleadoutcome} type="finalleadoutcome" maxWidth={140} />
                                <Td>{row.assignto || "—"}</Td>
                                {/* ── Doer Name cell ── */}
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
                                        {(row.leadstatus === "Non-Qualified" || !!row.vtlStatus) && (() => {
                                            const isTransferPending = !!pendingTransfer[row.id];
                                            return (
                                                <button onClick={() => { if (!isTransferPending) setTransferRow(row); }}
                                                    disabled={isTransferPending}
                                                    style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: 5,
                                                        padding: "5px 11px",
                                                        borderRadius: 6,
                                                        border: isTransferPending ? "1.5px solid #cbd5e1" : (row.vtlStatus ? "1.5px solid #059669" : "1.5px solid #f59e0b"),
                                                        background: isTransferPending ? "#f1f5f9" : (row.vtlStatus ? "#059669" : "#fffbeb"),
                                                        color: isTransferPending ? "#94a3b8" : (row.vtlStatus ? "#fff" : "#d97706"),
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        cursor: isTransferPending ? "not-allowed" : "pointer",
                                                        fontFamily: "inherit",
                                                        transition: "all .15s",
                                                        opacity: isTransferPending ? 0.8 : 1
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (isTransferPending) return;
                                                        (e.currentTarget as HTMLButtonElement).style.background = row.vtlStatus ? "#047857" : "#f59e0b";
                                                        (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (isTransferPending) return;
                                                        (e.currentTarget as HTMLButtonElement).style.background = row.vtlStatus ? "#059669" : "#fffbeb";
                                                        (e.currentTarget as HTMLButtonElement).style.color = row.vtlStatus ? "#fff" : "#d97706";
                                                    }}>
                                                    {isTransferPending ? <Loader2 size={11} strokeWidth={2.5} className="animate-spin" /> : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>}
                                                    {isTransferPending ? "Updating..." : (row.vtlStatus ? "Verify & Transfer Done" : "Verify & Transfer")}
                                                </button>
                                            );
                                        })()}

                                        {(() => { const ls = (row.leadstatus || "").toLowerCase().trim(); return (ls.includes("qualified") || ls.includes("pending")); })() && (() => {
                                            const isPending = !!pendingFeedback[row.id];
                                            return (
                                                <button onClick={() => { if (!isPending) setFeedbackRow(row); }}
                                                    disabled={isPending}
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, border: isPending ? "1.5px solid #cbd5e1" : (row.feedbackSubmitted ? "1.5px solid #059669" : "1.5px solid #7c3aed"), background: isPending ? "#f1f5f9" : (row.feedbackSubmitted ? "#059669" : "#f5f3ff"), color: isPending ? "#94a3b8" : (row.feedbackSubmitted ? "#fff" : "#7c3aed"), fontSize: 11, fontWeight: 700, cursor: isPending ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: isPending ? 0.8 : 1 }}
                                                    onMouseEnter={e => { if (isPending) return; (e.currentTarget as HTMLButtonElement).style.background = row.feedbackSubmitted ? "#047857" : "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                                    onMouseLeave={e => { if (isPending) return; (e.currentTarget as HTMLButtonElement).style.background = row.feedbackSubmitted ? "#059669" : "#f5f3ff"; (e.currentTarget as HTMLButtonElement).style.color = row.feedbackSubmitted ? "#fff" : "#7c3aed"; }}>
                                                    {isPending ? <Loader2 size={11} strokeWidth={2.5} className="animate-spin" /> : (row.feedbackSubmitted ? <Eye size={11} strokeWidth={2.5} /> : <MessageSquare size={11} strokeWidth={2.5} />)}
                                                    {isPending ? "Updating..." : (row.feedbackSubmitted ? "Feedback Done" : "Feedback")}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination total={visibleData.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
        </>
    );
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function parseDMY(str: string): Date | null {
    if (!str || str === "—") return null;
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return null;
    return new Date(`${m[3]}-${m[2]}-${m[1]}`);
}
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

// ─── Main Page ────────────────────────────────────────────────────────────────

function ReceivedDataPageInner() {
    const { data: receivedApiData, loading: receivedLoading, isRefreshing: hookRefreshing, error: receivedError, refetch: refetchReceived } = useReceivedLeads();
    const { data: sentApiData, loading: sentLoading, refetch: refetchSent } = useSentLeads();
    const { hasPermission, user } = useAuth();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingAny = isRefreshing || hookRefreshing;
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([refetchReceived(), refetchSent()]);
        setIsRefreshing(false);
    };

    const hasReceivedPermission = hasPermission("ai_voice_received.view");

    const tableRef = useRef<HTMLDivElement>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(h);
    }, [search]);

    const [dateFilter, setDateFilter] = useState("this_week");
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
    const transformedReceived: ReceivedRow[] = useMemo(() => {
        if (!receivedApiData?.length) return receivedLoading ? RECEIVED_DATA : [];
        return receivedApiData.map((r: ReceivedLead): ReceivedRow => ({
            ...r,
            // _ts_num/_dt_num already computed in hook from ISO strings — use directly
            _ts_num: r._ts_num ?? 0,
            _dt_num: r._dt_num ?? 0,
            dataSource: { label: r.dataSource || "—", color: "gray" as const },
            finalStatus: {
                label: r.callstatus || "—",
                dot: (r.callstatus === "completed" ? "g" : r.callstatus === "failed" ? "r" : "o") as DotColor,
                color: (r.callstatus === "completed" ? "green" : r.callstatus === "failed" ? "red" : "orange") as PillColor,
            },
        }));
    }, [receivedApiData, receivedLoading]);

    // Minimal sent transform — only enquiryId + notes needed for call history notes lookup
    const transformedSent: SentRow[] = useMemo(() => {
        if (!sentApiData?.length) return [];
        return sentApiData.map((r: { enquiryId: string; notes?: string }) => ({ enquiryId: r.enquiryId, notes: r.notes || "—" }));
    }, [sentApiData]);

    // ── Show all records without deduplication ──────────────────────────────
    // const processedReceived: ReceivedRow[] = useMemo(() => {
    //     return transformedReceived;
    // }, [transformedReceived]);

    const processedReceived: ReceivedRow[] = useMemo(() => {
        const latestByInitialId = new Map<string, ReceivedRow>();
        transformedReceived.forEach(r => {
            const key = (r.initialid || "").trim();
            if (!key || key === "—") {
                latestByInitialId.set(r.id, r);
                return;
            }
            const existing = latestByInitialId.get(key);
            if (!existing || (r._ts_num ?? 0) > (existing._ts_num ?? 0)) {
                latestByInitialId.set(key, r);
            }
        });
        return Array.from(latestByInitialId.values());
    }, [transformedReceived]);

    // pendingCount = sent total − received processed total

    // ── Filter Options ────────────────────────────────────────────────────────
    const companyOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.company))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const dataSourceOptions = useMemo(() => Array.from(new Set(processedReceived.map(r => r.dataSource.label))).filter(v => v && v !== "—").sort(), [processedReceived]);
    const statusOptions = useMemo(() => {
        const keys = new Set<StatusKey>();
        processedReceived.forEach(r => keys.add(getRowStatus(r)));
        return STATUS_CFG.filter(c => keys.has(c.key)).map(c => c.label);
    }, [processedReceived]);
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
                if (!ts) return false; // exclude records with no timestamp from date-filtered views
                if (dateWindow.from && ts < dateWindow.from.getTime()) return false;
                if (dateWindow.to && ts > dateWindow.to.getTime()) return false;
            }
            if (!companyMatch(r.company)) return false;
            if (!dsMatch(r.dataSource.label)) return false;
            if (status !== "all") {
                const cfg = STATUS_CFG.find(c => c.label === status);
                if (cfg && getRowStatus(r) !== cfg.key) return false;
            }
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
                    <p className="mt-4 text-base font-bold text-emerald-600 animate-pulse">Fetching latest AI Voice Call Data...</p>
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
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>You don't have permission to view received calls.</div>
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
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>Could not load received calls</div>
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

            {/* ── Banner ── */}
            <div style={{ background: "linear-gradient(110deg,#3730a3 0%,#4f46e5 45%,#6366f1 100%)", padding: "14px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}><MicSvg /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>AI Voice Lead Qualification</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>KServe AI · Received Calls — Real-time Lead Scoring Log</div>
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

            {/* ── Filters ── */}
            {receivedError && receivedApiData.length > 0 && (
                <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "12px 14px", color: "#9a3412" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900 }}>!</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>Background refresh failed</div>
                            <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>{receivedError}</div>
                        </div>
                        <button onClick={handleRefresh} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-3 mx-2 sm:mx-4 lg:mx-5">
                <div className="rounded-xl border border-slate-200 bg-white shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                <Search className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Filters &amp; Search</h3>
                                <p className="text-xs text-slate-500">Refine and locate leads efficiently</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50">Clear Filters</Button>
                    </div>
                    <div className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                            <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-2">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search Leads</label>
                                <Input
                                    placeholder="Name, email, phone, ID, subject..."
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
                            {/* Status filter hidden by user request */}
                            {/* <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        {statusOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div> */}

                            {/* Lead Intent & Lead Status — received-only filters */}
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

            {/* ── KPI Breakdown ── */}
            <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                <CallStatusBreakdown counts={receivedCounts} total={filteredReceived.length} loading={receivedLoading} />
            </div>

            {/* ── Table ── */}
            <div ref={tableRef} className="mx-2 sm:mx-4 lg:mx-5 mt-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#d1fae5", color: "#059669" }}>
                            <RecvSvg />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>Received Voice Responses — KServe Callback Log</span>
                    </div>
                    {(receivedLoading && filteredReceived.length === 0)
                        ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}><div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 10, verticalAlign: "middle" }} />Loading received data from KServe...</div>
                        : <ReceivedTableInnerNoHeader data={filteredReceived} allData={transformedReceived} sentData={transformedSent} currentUser={user} refetchReceived={refetchReceived} />
                    }
                </div>
            </div>
        </div>
    );
}

export default function ReceivedDataPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading...</div>}>
            <ReceivedDataPageInner />
        </Suspense>
    );
}
