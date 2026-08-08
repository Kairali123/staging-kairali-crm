"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSentLeads } from "@/hooks/useSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SentRow {
    genTimestamp: string; enqDateTime: string; enquiryId: string; clientName: string;
    mobile: string | number; email: string; subject: string; notes: string; ivrUrl: string;
    websiteName: string; dataSource: { label: string; color: PillColor };
    campaignId: string; campaignName: string; assignTo: string; kserveResponse: string;
    kserveError?: boolean; transferTo: string;
    statusCode: string;
    _ts_num: number;
    _dt_num: number;
    status: { label: string; dot: DotColor; color: PillColor };
    company: string;
    region: string;
    leadIntent: string;
    urgency: string;
    newMobile: string;
    maySentTo: string;
    location: string;
    timezone: string;
    utcOffset: string;
    businessHoursStart: string;
    businessHoursEnd: string;
    weekdaysConfig: string;
    received: string;
    receivedDate: string;
    totalCallCount: number;
    callOutcome: string;
    callStatus: string;
    callHistoryLink: string;
    totalTimeToCallComplete: string;
    id: number | null;
    createdAt: string;
    updatedAt: string;
}

type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink";
type DotColor = "g" | "o" | "r" | "b" | "x";

// ─── Mock / Fallback Data ─────────────────────────────────────────────────────

const SENT_DATA: SentRow[] = [
    { genTimestamp: "16/03/2026", enqDateTime: "16/03/2026 07:11", enquiryId: "Test_Ticket_001", clientName: "Satyam", mobile: "+91 73006 16307", email: "satyam@kairali.com", subject: "Enquiry From Chatbase AI", notes: "User inquired about Ayurvedic treatments.", ivrUrl: "kairali-dclkqAHV", websiteName: "Kairali AHV", dataSource: { label: "AI-Doctor", color: "indigo" }, campaignId: "Required AHk", campaignName: "AHV Wellness 2026", assignTo: "Pushpanjali K.", kserveResponse: "200 OK", transferTo: "—", statusCode: "success", _ts_num: 1742079060000, _dt_num: 1742079060000, status: { label: "Success", dot: "g", color: "green" }, company: "Kairali", region: "domestic", leadIntent: "", urgency: "", newMobile: "", maySentTo: "", location: "", timezone: "", utcOffset: "", businessHoursStart: "", businessHoursEnd: "", weekdaysConfig: "", received: "", receivedDate: "", totalCallCount: 0, callOutcome: "", callStatus: "", callHistoryLink: "", totalTimeToCallComplete: "", id: 1, createdAt: "", updatedAt: "" },
    { genTimestamp: "17/03/2026", enqDateTime: "17/03/2026 09:22", enquiryId: "Ticket_002-Xa7f", clientName: "Priya Sharma", mobile: "+91 98765 43210", email: "priya@example.com", subject: "Enquiry From IVR", notes: "Call Duration 2m 15s.", ivrUrl: "kairali-xf91bPR", websiteName: "Kairali KTAHV", dataSource: { label: "IVR API", color: "blue" }, campaignId: "WL-Kairali-02", campaignName: "Pain Management Prog.", assignTo: "Harpreet S.", kserveResponse: "200 OK", transferTo: "Sunita R.", statusCode: "success", _ts_num: 1742183520000, _dt_num: 1742183520000, status: { label: "Success", dot: "g", color: "green" }, company: "KTAHV", region: "domestic", leadIntent: "", urgency: "", newMobile: "", maySentTo: "", location: "", timezone: "", utcOffset: "", businessHoursStart: "", businessHoursEnd: "", weekdaysConfig: "", received: "", receivedDate: "", totalCallCount: 0, callOutcome: "", callStatus: "", callHistoryLink: "", totalTimeToCallComplete: "", id: 2, createdAt: "", updatedAt: "" },
    { genTimestamp: "17/03/2026", enqDateTime: "17/03/2026 11:05", enquiryId: "Ticket_003-Bm2k", clientName: "Ramesh Gupta", mobile: "+91 70011 22334", email: "ramesh@example.com", subject: "Enquiry From Facebook", notes: "Diet and detox programs.", ivrUrl: "kairali-fb9cRG", websiteName: "Kairali KTAHV", dataSource: { label: "Facebook", color: "purple" }, campaignId: "FB-AHV-2026", campaignName: "Senior Wellness Camp.", assignTo: "Anoop V.", kserveResponse: "200 OK", transferTo: "—", statusCode: "success", _ts_num: 1742189700000, _dt_num: 1742189700000, status: { label: "Success", dot: "g", color: "green" }, company: "KTAHV", region: "domestic", leadIntent: "", urgency: "", newMobile: "", maySentTo: "", location: "", timezone: "", utcOffset: "", businessHoursStart: "", businessHoursEnd: "", weekdaysConfig: "", received: "", receivedDate: "", totalCallCount: 0, callOutcome: "", callStatus: "", callHistoryLink: "", totalTimeToCallComplete: "", id: 3, createdAt: "", updatedAt: "" },
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
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <td style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>{children}</td>;
}
function TruncTd({ children, maxWidth = 140 }: { children: React.ReactNode; maxWidth?: number }) {
    return <td style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>{children}</td>;
}
function Th({ children }: { children: React.ReactNode }) {
    return <th style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)" }}>{children}</th>;
}
function SortableTh({ children, colKey, sortKey, sortDir, onSort }: {
    children: React.ReactNode; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) {
    const active = sortKey === colKey;
    const ariaSort: React.AriaAttributes["aria-sort"] = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
    return (
        <th
            role="columnheader"
            aria-sort={ariaSort}
            tabIndex={0}
            onClick={() => onSort(colKey)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(colKey); } }}
            style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", cursor: "pointer", userSelect: "none", background: active ? "rgba(255,255,255,.12)" : undefined, outline: "none" }}
            onFocus={e => { e.currentTarget.style.boxShadow = "inset 0 0 0 2px rgba(255,255,255,.5)"; }}
            onBlur={e => { e.currentTarget.style.boxShadow = ""; }}
        >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {children}
                <span aria-hidden="true" style={{ display: "inline-flex", flexDirection: "column", gap: 1, opacity: active ? 1 : 0.4 }}>
                    <span style={{ fontSize: 7, lineHeight: 1, color: active && sortDir === "asc" ? "#fff" : "rgba(255,255,255,.5)" }}>▲</span>
                    <span style={{ fontSize: 7, lineHeight: 1, color: active && sortDir === "desc" ? "#fff" : "rgba(255,255,255,.5)" }}>▼</span>
                </span>
            </span>
        </th>
    );
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
                    <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} style={{ height: 30, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", cursor: "pointer" }}>
                        {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Go to</span>
                    <input type="number" min={1} max={totalPages} value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGo()} placeholder="Page" style={{ height: 30, width: 56, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", textAlign: "center", outline: "none" }} />
                    <button onClick={handleGo} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Go</button>
                </div>
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SendSvg = ({ sz = 13 }: { sz?: number }) => <svg width={sz} height={sz} fill="none" viewBox="0 0 24 24" stroke="currentColor"><line x1="22" y1="2" x2="11" y2="13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><polygon points="22 2 15 22 11 13 2 9 22 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const MicSvg = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 10a7 7 0 01-14 0M12 19v3M8 22h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const PhoneSvg = () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.05 1.2 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

// ─── Sent KPI Helpers ─────────────────────────────────────────────────────────

function buildSentCounts(rows: SentRow[]): any {
    const res = {
        total: rows.length,
        ktahv: { total: 0, dom: 0, intl: 0 },
        kappl: { total: 0, dom: 0, intl: 0 },
        villaraag: { total: 0, dom: 0, intl: 0 },
        kac: { total: 0, dom: 0, intl: 0 },
        pending: 0
    };
    rows.forEach(r => {
        const c = String(r.company || "").toUpperCase();
        const reg = String(r.region || "").toUpperCase();
        const s = String(r.status.label || "").toLowerCase();

        if (s.includes("pending")) res.pending++;

        const isIntl = reg.includes("INTERNATIONAL");

        if (c.includes("KTAHV")) {
            res.ktahv.total++; if (isIntl) res.ktahv.intl++; else res.ktahv.dom++;
        } else if (c.includes("KAPPL")) {
            res.kappl.total++; if (isIntl) res.kappl.intl++; else res.kappl.dom++;
        } else if (c.includes("VILLARAAG") || c.includes("VILLA RAAG")) {
            res.villaraag.total++; if (isIntl) res.villaraag.intl++; else res.villaraag.dom++;
        } else if (c.includes("KAC")) {
            res.kac.total++; if (isIntl) res.kac.intl++; else res.kac.dom++;
        }
    });
    return res;
}

// ─── Call Status Breakdown (Sent) ─────────────────────────────────────────────

function CallStatusBreakdown({ counts, total, loading }: { counts: any; total: number; loading: boolean }) {
    const data = counts as { total: number; ktahv: { total: number; dom: number; intl: number }; kappl: { total: number; dom: number; intl: number }; villaraag: { total: number; dom: number; intl: number }; kac: { total: number; dom: number; intl: number }; pending: number };

    const CompanyCard = ({ label, stats, icon, color }: { label: string; stats: { total: number; dom: number; intl: number }; icon: string; color: string }) => {
        const getPctOfCompany = (val: number) => stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : "0.0";
        const getPctOfGlobal = () => data.total > 0 ? ((stats.total / data.total) * 100).toFixed(1) : "0.0";
        return (
            <div style={{ background: color + "08", border: `1.5px solid ${color}33`, borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(0,0,0,0.03)", transition: "all .2s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".8px" }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color, background: color + "18", padding: "1px 8px", borderRadius: 20 }}>{getPctOfGlobal()}%</span>
                        <div style={{ fontSize: 16, opacity: 0.9 }}>{icon}</div>
                    </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1, marginBottom: 12 }}>{stats.total}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#059669" }}>Domestic:</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{stats.dom} ({getPctOfCompany(stats.dom)}%)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#dc2626" }}>International:</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>{stats.intl} ({getPctOfCompany(stats.intl)}%)</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg, #f8faff 0%, #ffffff 100%)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #4f46e528" }}><PhoneSvg /></div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>Lead Outreach & Response Status</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Sent Performance — Company & Region Breakdown</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {loading && <div style={{ width: 14, height: 14, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#e0e7ff", border: "1px solid #c7d2fe", borderRadius: 20, padding: "4px 12px", color: "#4f46e5", fontSize: 11.5, fontWeight: 600 }}>
                        <span style={{ display: "flex" }}><SendSvg sz={11} /></span>
                        <span>Sent</span>
                        <span style={{ background: "#4f46e5", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{loading ? "…" : total}</span>
                    </div>
                </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
                <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#6366f1", textTransform: "uppercase" as const, marginBottom: 14 }}>Outreach Distribution by Company</div>
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 86, borderRadius: 10, background: "#e9ecef", animation: "kpi-pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))", gap: 14 }}>
                            {/* Total Sent Card */}
                            <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.25)", position: "relative" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Lead Sent</div>
                                <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "8px 0" }}>{data.total}</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>Global Automated Outreach</div>
                                <div style={{ position: "absolute", top: 18, right: 20, fontSize: 18, opacity: 0.6 }}>📊</div>
                            </div>
                            <CompanyCard label="KTAHV" stats={data.ktahv} icon="🏨" color="#0369a1" />
                            <CompanyCard label="KAPPL" stats={data.kappl} icon="🌿" color="#059669" />
                            <CompanyCard label="VILLARAAG" stats={data.villaraag} icon="🏡" color="#7c3aed" />
                            <CompanyCard label="KAC" stats={data.kac} icon="🏢" color="#ea580c" />
                            {/* Pending Card */}
                            <div style={{ background: "#fef2f2", border: "1.5px solid #ef444433", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 2px 10px rgba(239, 68, 68, 0.05)" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: ".8px" }}>Pending</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", background: "#fee2e2", padding: "1px 8px", borderRadius: 20 }}>{data.total > 0 ? ((data.pending / data.total) * 100).toFixed(1) : "0"}%</span>
                                        <div style={{ fontSize: 16 }}>⏳</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{data.pending}</div>
                                <div style={{ fontSize: 11, color: "#991b1b", fontWeight: 700, marginTop: 10 }}>Total Pending Outreach</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sent Table ───────────────────────────────────────────────────────────────

function parseDateTime(dt: string): number {
    if (!dt || dt === "—" || dt === "-") return 0;
    // Pattern: DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM
    const a = dt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (a) {
        const day = parseInt(a[1]), mon = parseInt(a[2]), year = parseInt(a[3]);
        const hr = parseInt(a[4]), min = parseInt(a[5]), sec = parseInt(a[6] || "0");
        return new Date(year, mon - 1, day, hr, min, sec).getTime();
    }
    const parsed = new Date(dt).getTime();
    return isNaN(parsed) ? 0 : parsed;
}

function SentTableInnerNoHeader({ data }: { data: SentRow[] }) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortKey, setSortKey] = useState("enqDateTime");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const handleSort = (k: string) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } setPage(1); };
    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            let av: string | number = "", bv: string | number = "";
            if (sortKey === "enqDateTime") { 
                av = a._dt_num || parseDateTime(a.enqDateTime); 
                bv = b._dt_num || parseDateTime(b.enqDateTime); 
            }
            else if (sortKey === "clientName") { av = a.clientName.toLowerCase(); bv = b.clientName.toLowerCase(); }
            else if (sortKey === "websiteName") { av = a.websiteName.toLowerCase(); bv = b.websiteName.toLowerCase(); }
            else if (sortKey === "dataSource") { av = a.dataSource.label.toLowerCase(); bv = b.dataSource.label.toLowerCase(); }
            else if (sortKey === "assignTo") { av = a.assignTo.toLowerCase(); bv = b.assignTo.toLowerCase(); }
            else if (sortKey === "company") { av = a.company.toLowerCase(); bv = b.company.toLowerCase(); }
            else if (sortKey === "status") { av = a.status.label.toLowerCase(); bv = b.status.label.toLowerCase(); }
            else if (sortKey === "campaignName") { av = a.campaignName.toLowerCase(); bv = b.campaignName.toLowerCase(); }
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);
    useEffect(() => { setPage(1); }, [data]);
    const paged = sorted.slice((page - 1) * perPage, page * perPage);
    const sp = { sortKey, sortDir, onSort: handleSort };
    return (
        <>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: "#1e2a4a" }}>
                        <Th>Gen. Timestamp</Th>
                        <SortableTh colKey="enqDateTime" {...sp}>Enq. Date &amp; Time</SortableTh>
                        <Th>Enquiry ID</Th>
                        <SortableTh colKey="clientName" {...sp}>Client Details</SortableTh>
                        <Th>Subject</Th><Th>Notes</Th><Th>IVR URL</Th>
                        <SortableTh colKey="websiteName" {...sp}>Website Name</SortableTh>
                        <SortableTh colKey="dataSource" {...sp}>Data Source</SortableTh>
                        <Th>Campaign ID</Th>
                        <SortableTh colKey="campaignName" {...sp}>Campaign Name</SortableTh>
                        <SortableTh colKey="company" {...sp}>Company</SortableTh>
                        <SortableTh colKey="assignTo" {...sp}>Assign To</SortableTh>
                        <Th>KServe Response</Th><Th>Transfer To</Th>
                        <SortableTh colKey="status" {...sp}>Status</SortableTh>
                    </tr></thead>
                    <tbody>
                        {paged.length === 0
                            ? <tr><td colSpan={16} style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No records found</td></tr>
                            : paged.map((row, i) => (
                                <tr key={row.enquiryId + i} style={{ borderBottom: i < paged.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background .12s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#e0e7ff"; (e.currentTarget as HTMLTableRowElement).style.boxShadow = "inset 3px 0 0 #4f46e5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; (e.currentTarget as HTMLTableRowElement).style.boxShadow = ""; }}>
                                    <Td>{row.genTimestamp}</Td><Td>{row.enqDateTime}</Td>
                                    <Td><IdCell>{row.enquiryId}</IdCell></Td>
                                    <Td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            <strong>{row.clientName}</strong>
                                            <span>{row.mobile}</span>
                                            <span>{row.email}</span>
                                        </div>
                                    </Td>
                                    <TooltipTd label="Subject">{row.subject}</TooltipTd>
                                    <NotesTd>{row.notes}</NotesTd>
                                    <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {row.ivrUrl && row.ivrUrl !== "—" && row.ivrUrl !== "-" ? (
                                            <a
                                                href={row.ivrUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label="Download IVR recording"
                                                style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }}
                                            >Download</a>
                                        ) : (
                                            <span style={{ color: "#94a3b8" }}>-</span>
                                        )}
                                    </td>
                                    <TruncTd>{row.websiteName}</TruncTd>
                                    <Td><Pill label={row.dataSource.label} color={row.dataSource.color} /></Td>
                                    <Td>{row.campaignId}</Td><TruncTd>{row.campaignName}</TruncTd>
                                    <Td>{row.company}</Td>
                                    <Td>{row.assignTo}</Td>
                                    <Td><IdCell error={row.kserveError}>{row.kserveResponse}</IdCell></Td>
                                    <Td>{row.transferTo}</Td>
                                    <Td><Pill label={row.status.label} color={row.status.color} dot={row.status.dot} /></Td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            <Pagination total={data.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />
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
function inRange(dateNum: number, from: Date | null, to: Date | null): boolean {
    if (!from && !to) return true;
    if (!dateNum) return true;
    if (from && dateNum < from.getTime()) return false;
    if (to && dateNum > to.getTime()) return false;
    return true;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function SentDataPageInner() {
    const { data: sentApiData, loading: sentLoading, isRefreshing: hookRefreshing, refetch } = useSentLeads();
    const { hasPermission } = useAuth();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingAny = isRefreshing || hookRefreshing;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const hasSentPermission = hasPermission("ai_voice_sent.view");

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
    const [customDate, setCustomDate] = useState({ start: "", end: "" });

    const clearFilters = () => {
        setSearch(""); setDateFilter("all"); setCompany("all");
        setDataSource("all"); setStatus("all");
        setCustomDate({ start: "", end: "" });
    };

    useEffect(() => {
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [search, dateFilter, company, dataSource, status]);

    const dateWindow = useMemo(() => {
        if (dateFilter === "custom") {
            const parseLocalDate = (str: string, isEnd = false) => {
                if (!str) return null;
                const parts = str.split("-");
                if (parts.length === 3) {
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    const day = parseInt(parts[2], 10);
                    return isEnd ? new Date(year, month, day, 23, 59, 59, 999) : new Date(year, month, day, 0, 0, 0, 0);
                }
                return new Date(str);
            };
            return { from: parseLocalDate(customDate.start), to: parseLocalDate(customDate.end, true) };
        }
        return getDateRange(dateFilter);
    }, [dateFilter, customDate]);

    const companyMatch = (n: string) => company === "all" || n === company;
    const dsMatch = (l: string) => dataSource === "all" || l === dataSource;
    const statusMatch = (l: string) => status === "all" || l === status;

    // ── Transform ─────────────────────────────────────────────────────────────
    const transformedSent: SentRow[] = useMemo(() => {
        if (!sentApiData?.length) return [];
        return sentApiData.map(r => {
            let rawWebsiteName = String(r.company || "").toLowerCase();
            let finalCompany = "KAC"; // Default for remaining
            
            if (rawWebsiteName.includes("villaraag")) {
                finalCompany = "VILLARAAG";
            } else if (rawWebsiteName.includes("healing village") || rawWebsiteName.includes("ktahv")) {
                finalCompany = "KTAHV";
            } else if (rawWebsiteName.includes("ayurvedic products") || rawWebsiteName.includes("kappl")) {
                finalCompany = "KAPPL";
            }
            
            let finalRegion = r.region || "—";
            
            // Infer region if not provided
            if (!finalRegion || finalRegion === "—") {
                const searchStr = `${r.websiteName || ""} ${r.dataSource?.label || ""} ${r.campaignName || ""} ${r.subject || ""}`.toUpperCase();
                if (searchStr.includes("INTERNATIONAL") || searchStr.includes("INTL")) finalRegion = "INTERNATIONAL";
                else finalRegion = "DOMESTIC";
            }

            return {
                genTimestamp: r.genTimestamp, enqDateTime: r.enqDateTime,
                _ts_num: r._ts_num, _dt_num: r._dt_num,
                enquiryId: r.enquiryId,
                clientName: r.clientName || "N/A", mobile: String(r.mobile || "—"), email: r.email || "—",
                subject: r.subject || "—", notes: r.notes || "—", ivrUrl: r.ivrUrl || "—",
                websiteName: r.websiteName || "—", dataSource: r.dataSource,
                campaignId: r.campaignId || "—", campaignName: r.campaignName || "—",
                assignTo: r.assignTo || "—", kserveResponse: r.kserveResponse || "—",
                kserveError: r.kserveError ?? false, transferTo: r.transferTo || "—",
                statusCode: r.statusCode || "—", status: r.status,
                company: finalCompany,
                region: finalRegion,
                leadIntent: r.leadIntent || "—",
                urgency: r.urgency || "—",
                newMobile: r.newMobile || "—",
                maySentTo: r.maySentTo || "—",
                location: r.location || "—",
                timezone: r.timezone || "—",
                utcOffset: r.utcOffset || "—",
                businessHoursStart: r.businessHoursStart || "—",
                businessHoursEnd: r.businessHoursEnd || "—",
                weekdaysConfig: r.weekdaysConfig || "—",
                received: r.received || "—",
                receivedDate: r.receivedDate || "—",
                totalCallCount: r.totalCallCount || 0,
                callOutcome: r.callOutcome || "—",
                callStatus: r.callStatus || "—",
                callHistoryLink: r.callHistoryLink || "—",
                totalTimeToCallComplete: r.totalTimeToCallComplete || "—",
                id: r.id || null,
                createdAt: r.createdAt || "—",
                updatedAt: r.updatedAt || "—",
            };
        });
    }, [sentApiData]);

    // ── Filter Options ────────────────────────────────────────────────────────
    const companyOptions = useMemo(() => Array.from(new Set(transformedSent.map(r => r.company))).filter(v => v && v !== "—").sort(), [transformedSent]);
    const dataSourceOptions = useMemo(() => Array.from(new Set(transformedSent.map(r => r.dataSource.label))).filter(v => v && v !== "—").sort(), [transformedSent]);
    const statusOptions = useMemo(() => Array.from(new Set(transformedSent.map(r => r.status.label))).filter(v => v && v !== "—").sort(), [transformedSent]);

    // ── Filtered Data ─────────────────────────────────────────────────────────
    const filteredSent = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        return transformedSent.filter(r => {
            if (q && !(r.clientName.toLowerCase().includes(q) || String(r.mobile).includes(q) || r.email.toLowerCase().includes(q) || r.enquiryId.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || r.assignTo.toLowerCase().includes(q) || r.campaignName.toLowerCase().includes(q) || r.company.toLowerCase().includes(q))) return false;
            if (!inRange(r._ts_num, dateWindow.from, dateWindow.to)) return false;
            if (!companyMatch(r.company)) return false;
            if (!dsMatch(r.dataSource.label)) return false;
            if (!statusMatch(r.status.label)) return false;
            return true;
        }).sort((a, b) => (b._ts_num || 0) - (a._ts_num || 0));
    }, [debouncedSearch, dateWindow, company, dataSource, status, transformedSent]);

    const sentCounts = useMemo(() => buildSentCounts(filteredSent), [filteredSent]);

    if (sentLoading && sentApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Image src="/grouploader.gif" alt="Loading" width={200} height={200} priority className="animate-pulse" />
                    <p className="mt-4 text-base font-bold text-emerald-600 animate-pulse">Fetching latest AI Voice Call Data...</p>
                </div>
            </div>
        );
    }

    if (!hasSentPermission) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Access Restricted</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>You don't have permission to view sent calls.</div>
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
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>KServe AI · Sent Calls — Automated Voice Outreach Log</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {isRefreshingAny && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.7)", fontSize: 11, fontWeight: 500 }}>
                            <div style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Syncing...
                        </div>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshingAny}
                        aria-label={isRefreshingAny ? "Refreshing data" : "Sync data"}
                        style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, height: 38, padding: "0 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: isRefreshingAny ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}
                        onMouseEnter={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
                        onMouseLeave={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.15)")}>
                        <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: isRefreshingAny ? "spin 0.8s linear infinite" : "none" }} />
                        {isRefreshingAny ? "Refreshing..." : "Sync Data"}
                    </button>
                    <div style={{ textAlign: "right", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, padding: "6px 14px", flexShrink: 0, zIndex: 1 }}>
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.55)", textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600 }}>Total Records</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 2 }}>{filteredSent.length}</div>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
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
                                <Input placeholder="Name, email, phone, ID, subject..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 w-full rounded-md border-gray-300" />
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
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        {statusOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom date range */}
                        {dateFilter === "custom" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</label>
                                    <Input type="date" value={customDate.start} onChange={e => setCustomDate({ ...customDate, start: e.target.value })} className="h-10 w-full rounded-md border-gray-300" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</label>
                                    <Input type="date" value={customDate.end} onChange={e => setCustomDate({ ...customDate, end: e.target.value })} className="h-10 w-full rounded-md border-gray-300" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── KPI Breakdown ── */}
            <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                <CallStatusBreakdown counts={sentCounts} total={filteredSent.length} loading={sentLoading} />
            </div>

            {/* ── Table ── */}
            <div ref={tableRef} className="mx-2 sm:mx-4 lg:mx-5 mt-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#e0e7ff", color: "#4f46e5" }}>
                            <SendSvg />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>Sent Voice Calls — AI Outreach Log</span>
                    </div>
                    {(sentLoading && filteredSent.length === 0)
                        ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}><div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 10, verticalAlign: "middle" }} />Loading sent data from KServe...</div>
                        : <SentTableInnerNoHeader data={filteredSent} />
                    }
                </div>
            </div>
        </div>
    );
}

export default function SentDataPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading...</div>}>
            <SentDataPageInner />
        </Suspense>
    );
}