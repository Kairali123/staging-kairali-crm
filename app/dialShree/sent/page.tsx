"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";

import { useDialShreeSentLeads, type DialShreeSentLead } from "@/hooks/useDialShreeSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

// ─── Color Types ─────────────────────────────────────────────────────────────

type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo" | "pink";
type DotColor = "g" | "o" | "r" | "b" | "x";

// ─── Format Date/Time ─────────────────────────────────────────────────────────

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

// ─── Table Primitives ─────────────────────────────────────────────────────────

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
const DOT: { [k in DotColor]: string } = { g: "#10b981", o: "#f59e0b", r: "#ef4444", b: "#3b82f6", x: "#94a3b8" };

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

function colorText(value: string, type: "status" | "intent"): string {
    const v = (value || "").toLowerCase().trim();
    if (type === "intent") {
        if (v.includes("high")) return "#059669";
        if (v.includes("med")) return "#d97706";
        if (v.includes("low")) return "#ea580c";
        return "#64748b";
    }
    if (type === "status") {
        if (v.includes("sent")) return "#059669";
        if (v.includes("exception") || v.includes("error") || v.includes("failed")) return "#dc2626";
        return "#ea580c";
    }
    return "#374151";
}

function ColorTd({ value, type, maxWidth }: { value: string; type: "status" | "intent"; maxWidth?: number }) {
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

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const SendSvg = ({ sz = 14 }: { sz?: number }) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
);

// ─── Sent View Modal ──────────────────────────────────────────────────────────

function SentViewModal({ row, onClose }: { row: DialShreeSentLead; onClose: () => void }) {
    const val = (v: any) => {
        if (v === null || v === undefined) return "—";
        const t = String(v).trim();
        return t === "" || t === "0" || t === "—" ? "—" : t;
    };

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

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 1100, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>DialShree Outbound Lead Details</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4 }}>{row.clientName}</span>
                            <span style={{ opacity: 0.5 }}>•</span>
                            <span>{row.mobile}</span>
                            {row.leadId && <><span style={{ opacity: 0.5 }}>•</span><span style={{ fontFamily: "monospace", fontSize: 11 }}>ID: {row.leadId}</span></>}
                            <span style={{ opacity: 0.5 }}>•</span>
                            <Pill label={row.deliveryStatus.label} color={row.deliveryStatus.color as PillColor} dot={row.deliveryStatus.category === "sent" ? "g" : row.deliveryStatus.category === "exception" ? "r" : "o"} />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}>×</button>
                </div>
                {/* Content */}
                <div style={{ overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: 32 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px 48px" }}>
                        <Section title="Client Information" icon="👤" color="#0891b2">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                <Field label="Client Name" value={row.clientName} color="#0891b2" />
                                <Field label="Primary Mobile" value={row.mobile} color="#0891b2" />
                                <Field label="Alternate Mobile" value={row.altMobile} color="#0891b2" />
                                <Field label="Email ID" value={row.email} color="#0891b2" />
                                <Field label="Alternate Email" value={row.altEmail} color="#0891b2" />
                                <Field label="Lead ID" value={row.leadId} color="#0891b2" />
                            </div>
                        </Section>
                        <Section title="Campaign & Outreach" icon="🎯" color="#4f46e5">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                <Field label="Campaign Name" value={row.campaignName} color="#4f46e5" />
                                <Field label="List ID" value={row.listId} color="#4f46e5" />
                                <Field label="Target Company" value={row.company} color="#4f46e5" />
                                <Field label="Website / Source" value={row.websiteName} color="#4f46e5" />
                                <Field label="Assign To" value={row.assignTo} color="#4f46e5" />
                                <Field label="Data Source" value={row.dataSource} color="#4f46e5" />
                            </div>
                        </Section>
                        <Section title="Lead Qualification & Intent" icon="📈" color="#7c3aed">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                <Field label="Lead Intent" value={row.sqvLeadIntent} color="#7c3aed" />
                                <Field label="Delivery Status" value={row.deliveryStatus.label} color="#7c3aed" />
                                <Field label="Subject" value={row.subjects} color="#7c3aed" />
                                <Field label="Intent Remarks" value={row.sqvRemarks} color="#7c3aed" />
                            </div>
                        </Section>
                        <Section title="Location & Business Hours" icon="🕒" color="#d946ef">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "16px 20px" }}>
                                <Field label="Location" value={[row.location, row.geo].filter(Boolean).join(", ")} color="#d946ef" />
                                <Field label="Region / Code" value={[row.region, row.code].filter(Boolean).join(" · ")} color="#d946ef" />
                                <Field label="Timezone" value={row.timezone} color="#d946ef" />
                                <Field label="Business Hours" value={`${row.businessHoursStart || '—'} to ${row.businessHoursEnd || '—'}`} color="#d946ef" />
                                <Field label="Weekdays Config" value={row.weekdaysConfig} color="#d946ef" />
                                <Field label="Enquiry D/T" value={row.enquiryDateTime} color="#d946ef" />
                            </div>
                        </Section>
                    </div>

                    <Section title="Outreach Response & Action" icon="📤" color="#03412f" style={{ borderTop: "2px solid #f1f5f9", paddingTop: 28 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Dialer Response Result</div>
                                <div style={{ fontSize: 13.5, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>{val(row.responseResult)}</div>
                            </div>
                            {row.actionAfterException && (
                                <div style={{ background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca", padding: "18px 22px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Exception Action / Remediation</div>
                                    <div style={{ fontSize: 13.5, color: "#991b1b", lineHeight: 1.6, wordBreak: "break-word" }}>{row.actionAfterException}</div>
                                </div>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Remarks History</div>
                                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.remarksHistory)}</div>
                                </div>
                                <div style={{ background: "#f8fafc", borderRadius: 16, border: "1px solid #e2e8f0", padding: "18px 22px" }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Original Notes</div>
                                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>{val(row.notes)}</div>
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>
                {/* Footer */}
                <div style={{ borderTop: "1px solid #e2e8f0", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "flex-end", background: "#f8fafc", flexShrink: 0 }}>
                    <button onClick={onClose} style={{ padding: "12px 36px", borderRadius: 12, border: "none", background: "#4338ca", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(67,56,202,0.25)" }}>Close Details</button>
                </div>
            </div>
        </div>
    );
}

// ─── Status Breakdown Config ──────────────────────────────────────────────────

type SentStatusKey = "total_sent" | "dispatched" | "exception" | "pending";

const SENT_STATUS_CFG: { key: SentStatusKey; label: string; color: string; bgColor: string; borderColor: string }[] = [
    { key: "total_sent", label: "Total Outbound", color: "#1d4ed8", bgColor: "#eff6ff", borderColor: "#93c5fd" },
    { key: "dispatched", label: "Sent / Dispatched", color: "#047857", bgColor: "#ecfdf5", borderColor: "#6ee7b7" },
    { key: "exception", label: "Exceptions / Errors", color: "#b91c1c", bgColor: "#fef2f2", borderColor: "#fca5a5" },
    { key: "pending", label: "Pending Outreach", color: "#7c3aed", bgColor: "#f5f3ff", borderColor: "#c4b5fd" },
];

function SentStatusBreakdown({ counts, total, loading }: {
    counts: Record<SentStatusKey, { total: number; high: number; medium: number; low: number }>;
    total: number;
    loading: boolean;
}) {
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg, #f8faff 0%, #ffffff 100%)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #1d4ed828" }}>
                        <SendSvg sz={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>DialShree Outbound Outreach Status</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>DialShree Dispatch Performance — Delivery & Exception Breakdown</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {loading && <div style={{ width: 14, height: 14, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 20, padding: "4px 12px", color: "#1d4ed8", fontSize: 11.5, fontWeight: 600 }}>
                        <span>Outbound</span>
                        <span style={{ background: "#1d4ed8", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{loading ? "…" : total}</span>
                    </div>
                </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#6366f1", textTransform: "uppercase" as const, marginBottom: 14 }}>Outreach Dispatch Analysis</div>
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {[...Array(4)].map((_, i) => <div key={i} style={{ height: 86, borderRadius: 10, background: "#e9ecef", animation: "kpi-pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {SENT_STATUS_CFG.map(cfg => {
                                const stats = counts[cfg.key] || { total: 0, high: 0, medium: 0, low: 0 };
                                const count = stats.total;
                                const calculatePercent = (value: number, totalAmount: number) =>
                                    totalAmount > 0 ? ((value / totalAmount) * 100).toFixed(1) : "0.0";
                                const pct = calculatePercent(count, total);
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
                                            <div style={{ fontSize: 15, opacity: 0.85 }}>
                                                {cfg.key === "dispatched" ? "✅" : cfg.key === "exception" ? "⚠️" : cfg.key === "pending" ? "🕒" : "📤"}
                                            </div>
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

// ─── Sent Table Inner Component ───────────────────────────────────────────────

function DialShreeSentTableInner({ data }: { data: DialShreeSentLead[] }) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [viewRow, setViewRow] = useState<DialShreeSentLead | null>(null);
    const [sortKey, setSortKey] = useState("timestamp");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const handleSort = (k: string) => {
        if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(k); setSortDir("asc"); }
        setPage(1);
    };

    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            let av: string | number = "", bv: string | number = "";
            if (sortKey === "id") { av = a.id; bv = b.id; }
            else if (sortKey === "timestamp") { av = a._ts_num ?? 0; bv = b._ts_num ?? 0; }
            else if (sortKey === "enquiryDateTime") { av = a._enq_num ?? 0; bv = b._enq_num ?? 0; }
            else if (sortKey === "clientName") { av = a.clientName.toLowerCase(); bv = b.clientName.toLowerCase(); }
            else if (sortKey === "mobile") { av = String(a.mobile); bv = String(b.mobile); }
            else if (sortKey === "campaignName") { av = a.campaignName.toLowerCase(); bv = b.campaignName.toLowerCase(); }
            else if (sortKey === "company") { av = a.company.toLowerCase(); bv = b.company.toLowerCase(); }
            else if (sortKey === "sqvLeadIntent") { av = a.sqvLeadIntent.toLowerCase(); bv = b.sqvLeadIntent.toLowerCase(); }
            else if (sortKey === "deliveryStatus") { av = a.deliveryStatus.label.toLowerCase(); bv = b.deliveryStatus.label.toLowerCase(); }
            else if (sortKey === "assignTo") { av = (a.assignTo || "").toLowerCase(); bv = (b.assignTo || "").toLowerCase(); }

            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
        if (page > totalPages) setPage(1);
    }, [sorted.length, perPage, page]);

    const paged = sorted.slice((page - 1) * perPage, page * perPage);
    const sp = { sortKey, sortDir, onSort: handleSort };

    return (
        <>
            {viewRow && <SentViewModal row={viewRow} onClose={() => setViewRow(null)} />}

            <style>{`
                .sent-table-row {
                    border-bottom: 1px solid #f1f5f9;
                    transition: background .12s, box-shadow .12s;
                }
                .sent-table-row:hover {
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
                    
                    .sent-table-row:hover .sticky-cell-1,
                    .sent-table-row:hover .sticky-cell-2,
                    .sent-table-row:hover .sticky-cell-3,
                    .sent-table-row:hover .sticky-cell-4 {
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
                    .sent-table-row:hover .sticky-cell-1,
                    .sent-table-row:hover .sticky-cell-2,
                    .sent-table-row:hover .sticky-cell-3,
                    .sent-table-row:hover .sticky-cell-4 {
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
                .sent-table-scroll {
                    overflow-x: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain;
                }
            `}</style>
            <div className="sent-table-scroll">
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ background: "#1e2a4a" }}>
                            <SortableTh colKey="timestamp" {...sp} className="sticky-header-1"><HLabel full="Sent Timestamp" short="Sent TS" /></SortableTh>
                            <SortableTh colKey="enquiryDateTime" {...sp} className="sticky-header-2"><HLabel full="Enq Date & Time" short="Enq D&T" /></SortableTh>
                            <Th className="sticky-header-3">Lead ID</Th>
                            <SortableTh colKey="clientName" {...sp} className="sticky-header-4"><HLabel full="Client Details" short="Client" /></SortableTh>
                            <Th>Subject</Th>
                            <SortableTh colKey="campaignName" {...sp}>Campaign</SortableTh>
                            <SortableTh colKey="company" {...sp}>Company</SortableTh>
                            <Th>Data Source</Th>
                            <SortableTh colKey="deliveryStatus" {...sp}>Outreach Status</SortableTh>
                            <Th>Response / Result</Th>
                            <SortableTh colKey="sqvLeadIntent" {...sp}>Intent</SortableTh>
                            <SortableTh colKey="assignTo" {...sp}>Assign To</SortableTh>
                            <Th>Location / Geo</Th>
                            <Th>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr><td colSpan={14} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No records found</td></tr>
                        ) : paged.map((row, i) => {
                            return (
                                <tr key={String(row.id) + i} className="sent-table-row">
                                    <Td className="sticky-cell-1">{formatDisplayDateTime(row.timestamp)}</Td>
                                    <Td className="sticky-cell-2">{formatDisplayDateTime(row.enquiryDateTime)}</Td>
                                    <CopyTd value={row.leadId} className="sticky-cell-3" />
                                    <Td className="sticky-cell-4">
                                        <div title={row.clientName} style={{ fontWeight: 600, color: "#1e293b" }}>{row.clientName}</div>
                                        {row.mobile && <div title={String(row.mobile)} style={{ fontSize: 11.5, color: "#1e293b", marginTop: 2 }}>{row.mobile}</div>}
                                        {row.email && <div title={row.email} style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{row.email}</div>}
                                    </Td>
                                    <TooltipTd label="Subject" maxWidth={120}>{row.subjects}</TooltipTd>
                                    <TooltipTd label="Campaign" maxWidth={130}>{row.campaignName}</TooltipTd>
                                    <Td>{row.company}</Td>
                                    <TooltipTd label="Data Source" maxWidth={110}>{row.dataSource}</TooltipTd>
                                    <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <Pill
                                            label={row.deliveryStatus.label}
                                            color={row.deliveryStatus.color as PillColor}
                                            dot={row.deliveryStatus.category === "sent" ? "g" : row.deliveryStatus.category === "exception" ? "r" : "o"}
                                        />
                                    </td>
                                    <TooltipTd label="Response Result" maxWidth={140} mono>{row.responseResult}</TooltipTd>
                                    <ColorTd value={row.sqvLeadIntent} type="intent" maxWidth={90} />
                                    <Td>{row.assignTo || "—"}</Td>
                                    <Td>{[row.location, row.geo].filter(Boolean).join(", ") || "—"}</Td>
                                    <td style={{ padding: "6px 10px", borderRight: "none", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                                        <button onClick={() => setViewRow(row)}
                                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 6, border: "1.5px solid #4f46e5", background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4f46e5"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#eef2ff"; (e.currentTarget as HTMLButtonElement).style.color = "#4f46e5"; }}>
                                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            View
                                        </button>
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

// ─── Main Page Inner Component ────────────────────────────────────────────────

function DialShreeSentPageInner() {
    const { user, isLoading, hasPermission } = useAuth();
    const router = useRouter();

    const isSuperAdmin = Boolean(
        user?.role === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super admin"
    );

    const isAuthorized = Boolean(
        isSuperAdmin ||
        user?.role === "admin" ||
        String(user?.role || "").trim().toLowerCase() === "admin" ||
        hasPermission("dialshree_sent.view") ||
        hasPermission("dialshree.view") ||
        hasPermission("all")
    );

    useEffect(() => {
        if (!isLoading && user && !isAuthorized) {
            router.replace("/access-denied");
        }
    }, [isLoading, user, isAuthorized, router]);

    const { data: sentApiData, loading: sentLoading, isRefreshing: hookRefreshing, error: sentError, refetch: refetchSent } = useDialShreeSentLeads();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingAny = isRefreshing || hookRefreshing;
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetchSent();
        setIsRefreshing(false);
    };

    const tableRef = useRef<HTMLDivElement>(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(h);
    }, [search]);

    const [dateFilter, setDateFilter] = useState("all");
    const [company, setCompany] = useState("all");
    const [campaign, setCampaign] = useState("all");
    const [status, setStatus] = useState("all");
    const [intent, setIntent] = useState("all");
    const [customDate, setCustomDate] = useState({ start: "", end: "" });

    const clearFilters = () => {
        setSearch("");
        setDateFilter("all");
        setCompany("all");
        setCampaign("all");
        setStatus("all");
        setIntent("all");
        setCustomDate({ start: "", end: "" });
    };

    const dateWindow = useMemo(() => {
        if (dateFilter === "custom") {
            const from = customDate.start ? new Date(customDate.start) : null;
            const to = customDate.end ? new Date(`${customDate.end}T23:59:59.999`) : null;
            return { from, to };
        }
        return getDateRange(dateFilter);
    }, [dateFilter, customDate]);

    // ── Filter Options ────────────────────────────────────────────────────────
    const companyOptions = useMemo(() => Array.from(new Set(sentApiData.map(r => r.company))).filter(v => v && v !== "—").sort(), [sentApiData]);
    const campaignOptions = useMemo(() => Array.from(new Set(sentApiData.map(r => r.campaignName))).filter(v => v && v !== "—").sort(), [sentApiData]);

    // ── Filtered Data ─────────────────────────────────────────────────────────
    const filteredSent = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        return sentApiData.filter(r => {
            if (q && !(
                r.clientName.toLowerCase().includes(q) ||
                String(r.mobile).includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.leadId.toLowerCase().includes(q) ||
                r.subjects.toLowerCase().includes(q) ||
                r.campaignName.toLowerCase().includes(q) ||
                r.dataSource.toLowerCase().includes(q) ||
                r.responseResult.toLowerCase().includes(q) ||
                r.notes.toLowerCase().includes(q)
            )) return false;

            if (dateWindow.from || dateWindow.to) {
                const ts = r._ts_num || r._enq_num || 0;
                if (!ts) return false;
                if (dateWindow.from && ts < dateWindow.from.getTime()) return false;
                if (dateWindow.to && ts > dateWindow.to.getTime()) return false;
            }

            if (company !== "all" && r.company !== company) return false;
            if (campaign !== "all" && r.campaignName !== campaign) return false;

            if (status !== "all") {
                if (status === "sent" && r.deliveryStatus.category !== "sent") return false;
                if (status === "exception" && r.deliveryStatus.category !== "exception") return false;
                if (status === "pending" && r.deliveryStatus.category !== "pending") return false;
            }

            if (intent !== "all" && !r.sqvLeadIntent.toLowerCase().includes(intent.toLowerCase())) return false;

            return true;
        });
    }, [debouncedSearch, dateWindow, company, campaign, status, intent, sentApiData]);

    // ── Counts Breakdown ──────────────────────────────────────────────────────
    const sentCounts = useMemo(() => {
        const init = () => ({ total: 0, high: 0, medium: 0, low: 0 });
        const counts: Record<SentStatusKey, { total: number; high: number; medium: number; low: number }> = {
            total_sent: init(),
            dispatched: init(),
            exception: init(),
            pending: init(),
        };

        filteredSent.forEach(r => {
            const intRaw = (r.sqvLeadIntent || "").toLowerCase().trim();
            const addIntent = (stats: { total: number; high: number; medium: number; low: number }) => {
                stats.total++;
                if (intRaw.includes("high")) stats.high++;
                else if (intRaw.includes("med")) stats.medium++;
                else stats.low++;
            };

            addIntent(counts.total_sent);
            if (r.deliveryStatus.category === "sent") {
                addIntent(counts.dispatched);
            } else if (r.deliveryStatus.category === "exception") {
                addIntent(counts.exception);
            } else {
                addIntent(counts.pending);
            }
        });

        return counts;
    }, [filteredSent]);

    if (sentLoading && sentApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div style={{ width: 44, height: 44, border: "3px solid #e0e7ff", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginBottom: 16 }} />
                    <p className="text-base font-bold text-indigo-600 animate-pulse">Fetching latest DialShree Sent Outreach Leads...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Access Restricted</div>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>You do not have permission to view DialShree sent outreach records.</div>
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
            <div style={{ background: "linear-gradient(110deg,#1e1b4b 0%,#312e81 45%,#4338ca 100%)", padding: "14px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}>
                    <SendSvg sz={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>DialShree Sent Outreach Log</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>DialShree Calling Portal · Sent Leads — Real-time DialShree Outbound Queue</div>
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

            {/* Error banner if any */}
            {sentError && sentApiData.length === 0 && (
                <div className="mt-3 mx-2 sm:mx-4 lg:mx-5">
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>⚠️ {sentError}</div>
                        <Button onClick={handleRefresh} size="sm" variant="outline" className="border-rose-300 text-rose-800 bg-white">Retry</Button>
                    </div>
                </div>
            )}

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
                                <p className="text-xs text-slate-500">Refine and locate DialShree sent outreach leads efficiently</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={clearFilters} className="bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50">Clear Filters</Button>
                    </div>
                    <div className="px-3 sm:px-5 py-3 sm:py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                            <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-2">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search Leads</label>
                                <Input placeholder="Name, email, phone, ID, subject, remarks..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} className="h-10 w-full rounded-md border-gray-300" />
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
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Campaign</label>
                                <Select value={campaign} onValueChange={setCampaign}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Campaigns</SelectItem>
                                        {campaignOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Outreach Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Status" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="sent">Sent / Dispatched</SelectItem>
                                        <SelectItem value="exception">Exceptions / Errors</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
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
                <SentStatusBreakdown counts={sentCounts} total={filteredSent.length} loading={sentLoading} />
            </div>

            {/* Table */}
            <div ref={tableRef} className="mx-2 sm:mx-4 lg:mx-5 mt-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#dbeafe", color: "#1d4ed8" }}>
                            <SendSvg sz={14} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e2a4a" }}>DialShree Sent Outreach — Outbound Log &amp; Queue</span>
                    </div>
                    {(sentLoading && filteredSent.length === 0)
                        ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}><div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 10, verticalAlign: "middle" }} />Loading DialShree sent outreach data...</div>
                        : <DialShreeSentTableInner data={filteredSent} />
                    }
                </div>
            </div>
        </div>
    );
}

export default function DialShreeSentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading DialShree Sent Outreach...</div>}>
            <DialShreeSentPageInner />
        </Suspense>
    );
}
