"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useDialShreeSentLeads, type DialShreeSentLead, type PillColor, type DotColor } from "@/hooks/useDialShreeSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Eye, Phone, Mail, MapPin, Clock, Calendar, CheckCircle2, AlertCircle, X, ExternalLink, Play, Pause } from "lucide-react";
import Image from "next/image";

// ─── Table Primitives & Styles ────────────────────────────────────────────────

const PILL_STYLES: Record<PillColor, React.CSSProperties> = {
    green: { background: "#d1fae5", color: "#065f46" }, blue: { background: "#dbeafe", color: "#1e40af" },
    purple: { background: "#ede9fe", color: "#5b21b6" }, orange: { background: "#ffedd5", color: "#9a3412" },
    red: { background: "#fee2e2", color: "#991b1b" }, yellow: { background: "#fef3c7", color: "#92400e" },
    gray: { background: "#f1f5f9", color: "#475569" }, teal: { background: "#ccfbf1", color: "#0f766e" },
    indigo: { background: "#e0e7ff", color: "#3730a3" }, pink: { background: "#fce7f3", color: "#9d174d" },
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

function IdCell({ children, error }: { children: React.ReactNode; error?: boolean }) {
    return (
        <span style={{ fontFamily: "monospace", fontSize: 10.5, background: "#f8fafc", padding: "2px 6px", borderRadius: 4, color: error ? "#dc2626" : "#475569", border: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
            {children}
        </span>
    );
}

function Td({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
    return <td className={className} style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>{children}</td>;
}

function TruncTd({ children, maxWidth = 140 }: { children: React.ReactNode; maxWidth?: number }) {
    return <td style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>{children}</td>;
}

function Th({ children, style: extraStyle }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return <th style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", ...extraStyle }}>{children}</th>;
}

function SortableTh({ children, colKey, sortKey, sortDir, onSort, style: extraStyle }: {
    children: React.ReactNode; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void; style?: React.CSSProperties;
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
            style={{ padding: "9px 11px", fontSize: 10, fontWeight: 700, color: active ? "#fff" : "rgba(255,255,255,.78)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.06)", cursor: "pointer", userSelect: "none", background: active ? "rgba(255,255,255,.12)" : undefined, outline: "none", ...extraStyle }}
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
    const isEmpty = !children || children === "—" || children === "-";
    return (
        <td
            onMouseEnter={isEmpty ? undefined : e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left, y: r.bottom + 8 }); setShow(true); }}
            onMouseLeave={() => setShow(false)}
            style={{ padding: "8px 11px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", maxWidth, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle", fontFamily: mono ? "monospace" : undefined }}
        >
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

function NotesTd({ children, label = "Notes" }: { children: string; label?: string }) {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const isEmpty = !children || children === "—" || children === "-";
    return (
        <td
            onMouseEnter={isEmpty ? undefined : e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left, y: r.bottom + 8 }); setShow(true); }}
            onMouseLeave={() => setShow(false)}
            style={{ padding: "8px 11px", fontSize: 11.5, color: "#64748b", borderRight: "1px solid #f1f5f9", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}
        >
            {children}
            {show && !isEmpty && (
                <div style={{ position: "fixed", left: Math.min(pos.x, window.innerWidth - 340), top: pos.y, zIndex: 9999, background: "#1e2a4a", color: "#f1f5f9", fontSize: 12, padding: "10px 14px", borderRadius: 9, maxWidth: 340, whiteSpace: "pre-wrap", wordBreak: "break-word", boxShadow: "0 8px 24px rgba(0,0,0,.28)", lineHeight: 1.6, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", top: -6, left: 16, width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid #1e2a4a" }} />
                    <span style={{ fontWeight: 700, color: "#a5b4fc", fontSize: 10, textTransform: "uppercase" as const, letterSpacing: ".6px", display: "block", marginBottom: 5 }}>{label}</span>
                    {children}
                </div>
            )}
        </td>
    );
}

// ─── Audio Helpers & Mini Player ──────────────────────────────────────────────

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

function MiniAudioButton({ url }: { url: string }) {
    const [playing, setPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!audioRef.current) {
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => setPlaying(false);
            audioRef.current.onerror = () => setPlaying(false);
        }
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            audioRef.current.play().catch(() => setPlaying(false));
            setPlaying(true);
        }
    };

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <button
                type="button"
                onClick={togglePlay}
                style={{ background: playing ? "#ef4444" : "#4f46e5", color: "#fff", border: "none", borderRadius: 4, width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .15s" }}
                title={playing ? "Pause" : "Play Recording"}
            >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
            </button>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#4f46e5", textDecoration: "underline", fontSize: 11 }}
            >
                Link
            </a>
        </div>
    );
}

// ─── Modal: View Full Lead Analysis ───────────────────────────────────────────

function LeadDetailsModal({ row, onClose }: { row: DialShreeSentLead; onClose: () => void }) {
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(15,23,42,.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ background: "#fff", width: "100%", maxWidth: 860, maxHeight: "90vh", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(110deg,#1e2a4a 0%,#2d3a6d 100%)", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📤</div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>{row.name_of_client || "Lead Details"}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2 }}>
                                Lead ID: <span style={{ fontFamily: "monospace", color: "#93c5fd" }}>{row.lead_id || `#${row.id}`}</span> · DialShree Sent Outreach Log
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Pill label={row.status.label} color={row.status.color} dot={row.status.dot} />
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ background: "rgba(255,255,255,.12)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, background: "#f8fafc" }}>
                    {/* Section 1: Contact Info */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".7px", color: "#4f46e5", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <Phone className="w-3.5 h-3.5" /> Client &amp; Contact Details
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Client Name</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.name_of_client || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Primary Mobile</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.mobile || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Alt Mobile</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.alt_mobile || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Primary Email</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.email_id || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Alt Email</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.alt_email_id || "—"}</strong></div>
                        </div>
                    </div>

                    {/* Section 2: Enquiry & Qualification */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".7px", color: "#0891b2", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <Calendar className="w-3.5 h-3.5" /> Enquiry &amp; Qualification Details
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Enquiry Date &amp; Time</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.enquiry_date_time || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Lead Intent</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.sqv_lead_intent || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Subject</span><div style={{ fontSize: 12, color: "#334155" }}>{row.subjects || "—"}</div></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Notes</span><div style={{ fontSize: 12, color: "#334155" }}>{row.notes || "—"}</div></div>
                            <div style={{ gridColumn: "1 / -1" }}><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>SQV Remarks</span><div style={{ fontSize: 12, color: "#334155" }}>{row.sqv_remarks || "—"}</div></div>
                            <div style={{ gridColumn: "1 / -1" }}><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Remarks History</span><div style={{ fontSize: 12, color: "#334155", background: "#f8fafc", padding: "8px 10px", borderRadius: 6, border: "1px solid #f1f5f9" }}>{row.remarks_history || "—"}</div></div>
                        </div>
                    </div>

                    {/* Section 3: Campaign & Dispatch Config */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".7px", color: "#7c3aed", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <ExternalLink className="w-3.5 h-3.5" /> Campaign, Source &amp; Dispatch
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Website Name</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.website_name || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Company</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.company || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Data Source</span><Pill label={row.dataSourcePill.label} color={row.dataSourcePill.color} /></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Campaign Name</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.campaign_name || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>List ID</span><span style={{ fontFamily: "monospace", fontSize: 12, color: "#334155" }}>{row.list_id || "—"}</span></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Assigned To</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.assign_to || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>URL / Recording</span>
                                {row.url && row.url !== "—" ? (
                                    <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", textDecoration: "underline", fontSize: 12, wordBreak: "break-all" }}>{row.url}</a>
                                ) : "—"}
                            </div>
                        </div>
                    </div>

                    {/* Section 4: DialShree Response & System Actions */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".7px", color: "#ea580c", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> DialShree Response &amp; Exception Handling
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Status Code</span><IdCell>{row.code || "—"}</IdCell></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Response Result</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.response_result || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Timestamp Sent/Not Sent</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.timestamp_sent_not_sent || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Action After Exception</span><div style={{ fontSize: 12, color: "#334155" }}>{row.action_after_getting_exception || "—"}</div></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Timestamp After Action</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.timestamp_after_action || "—"}</strong></div>
                        </div>
                    </div>

                    {/* Section 5: Geo, Timezone & Operating Hours */}
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".7px", color: "#059669", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                            <MapPin className="w-3.5 h-3.5" /> Geo, Timezone &amp; Schedule
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Location</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.location || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Location 2</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.location_2 || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Region</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.region || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Geo</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.geo || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Timezone / UTC</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.timezone || "—"} ({row.utc_offset || "+00:00"})</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Business Hours</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.business_hours_start || "—"} - {row.business_hours_end || "—"}</strong></div>
                            <div><span style={{ fontSize: 10.5, color: "#64748b", display: "block" }}>Weekdays Config</span><strong style={{ fontSize: 12.5, color: "#1e293b" }}>{row.weekdays_config || "—"}</strong></div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        Created: {row.created_at || "—"} · Updated: {row.updated_at || "—"}
                    </div>
                    <Button onClick={onClose} variant="outline" size="sm" className="bg-slate-800 text-white hover:bg-slate-700 hover:text-white border-none px-5">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── KPI Breakdown ────────────────────────────────────────────────────────────

function buildSentCounts(rows: DialShreeSentLead[]) {
    const res = {
        total: rows.length,
        ktahv: { total: 0, dom: 0, intl: 0 },
        kappl: { total: 0, dom: 0, intl: 0 },
        villaraag: { total: 0, dom: 0, intl: 0 },
        kac: { total: 0, dom: 0, intl: 0 },
        success: 0,
        failed: 0,
        pending: 0
    };
    rows.forEach(r => {
        const c = String(r.company || "").toUpperCase();
        const geoStr = String(r.geo || "").toLowerCase().trim();
        const isDom = geoStr.includes("domestic");
        const isIntl = !isDom;
        const s = String(r.status.label || "").toLowerCase();

        if (s.includes("success")) res.success++;
        else if (s.includes("fail") || s.includes("error")) res.failed++;
        else res.pending++;

        if (c.includes("KTAHV")) {
            res.ktahv.total++; if (isIntl) res.ktahv.intl++; else res.ktahv.dom++;
        } else if (c.includes("KAPPL")) {
            res.kappl.total++; if (isIntl) res.kappl.intl++; else res.kappl.dom++;
        } else if (c.includes("VILLARAAG") || c.includes("VILLA RAAG")) {
            res.villaraag.total++; if (isIntl) res.villaraag.intl++; else res.villaraag.dom++;
        } else {
            res.kac.total++; if (isIntl) res.kac.intl++; else res.kac.dom++;
        }
    });
    return res;
}

function CallStatusBreakdown({ counts, total, loading }: { counts: ReturnType<typeof buildSentCounts>; total: number; loading: boolean }) {
    const CompanyCard = ({ label, stats, icon, color }: { label: string; stats: { total: number; dom: number; intl: number }; icon: string; color: string }) => {
        const getPctOfCompany = (val: number) => stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) : "0.0";
        const getPctOfGlobal = () => total > 0 ? ((stats.total / total) * 100).toFixed(1) : "0.0";
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
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e0e7ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 7px #4f46e528" }}>
                        <Phone className="w-4 h-4" />
                    </div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>DialShree Outbound Outreach &amp; Dispatch Status</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Sent Performance — Company &amp; Regional Breakdown</div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {loading && <div style={{ width: 14, height: 14, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#e0e7ff", border: "1px solid #c7d2fe", borderRadius: 20, padding: "4px 12px", color: "#4f46e5", fontSize: 11.5, fontWeight: 600 }}>
                        <span>Sent Leads</span>
                        <span style={{ background: "#4f46e5", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 800, marginLeft: 2 }}>{loading ? "…" : total}</span>
                    </div>
                </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
                <div style={{ background: "#f8faff", border: "1px solid #e8edf8", borderRadius: 12, padding: "14px 16px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "#6366f1", textTransform: "uppercase" as const, marginBottom: 14 }}>Outreach Distribution by Entity</div>
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                            {[...Array(5)].map((_, i) => <div key={i} style={{ height: 86, borderRadius: 10, background: "#e9ecef", animation: "kpi-pulse 1.4s ease-in-out infinite" }} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))", gap: 14 }}>
                            {/* Total Sent Card */}
                            <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)", borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.25)", position: "relative" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Leads Sent</div>
                                <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", lineHeight: 1, margin: "8px 0" }}>{counts.total}</div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>DialShree Outbound Queue</div>
                                <div style={{ position: "absolute", top: 18, right: 20, fontSize: 18, opacity: 0.6 }}>📊</div>
                            </div>
                            <CompanyCard label="KTAHV" stats={counts.ktahv} icon="🏨" color="#0369a1" />
                            <CompanyCard label="KAPPL" stats={counts.kappl} icon="🌿" color="#059669" />
                            <CompanyCard label="VILLARAAG" stats={counts.villaraag} icon="🏡" color="#7c3aed" />
                            <CompanyCard label="KAC" stats={counts.kac} icon="🏢" color="#ea580c" />
                        </div>
                    )}
                </div>
            </div>
        </div>
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
        <button key={key} type="button" onClick={onClick} disabled={disabled} style={{ height: 30, minWidth: 30, padding: "0 8px", border: active ? "none" : "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff", color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}>{label}</button>
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
                        {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Go to</span>
                    <input aria-label="Go to page" type="number" min={1} max={totalPages} value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGo()} placeholder="Page" style={{ height: 30, width: 56, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontFamily: "inherit", background: "#fff", color: "#374151", textAlign: "center", outline: "none" }} />
                    <button type="button" onClick={handleGo} style={{ height: 30, padding: "0 14px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" }}>Go</button>
                </div>
            </div>
        </div>
    );
}

// ─── Table Component ──────────────────────────────────────────────────────────

function DialShreeSentTableInner({ data }: { data: DialShreeSentLead[] }) {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortKey, setSortKey] = useState("enquiry_date_time");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedModalRow, setSelectedModalRow] = useState<DialShreeSentLead | null>(null);

    const handleSort = (k: string) => {
        if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(k); setSortDir("asc"); }
        setPage(1);
    };

    const sorted = useMemo(() => {
        return [...data].sort((a, b) => {
            let av: string | number = "", bv: string | number = "";
            if (sortKey === "enquiry_date_time") {
                av = a._dt_num || 0;
                bv = b._dt_num || 0;
            } else if (sortKey === "timestamp") {
                av = a._ts_num || 0;
                bv = b._ts_num || 0;
            } else if (sortKey === "name_of_client") {
                av = (a.name_of_client || "").toLowerCase();
                bv = (b.name_of_client || "").toLowerCase();
            } else if (sortKey === "website_name") {
                av = (a.website_name || "").toLowerCase();
                bv = (b.website_name || "").toLowerCase();
            } else if (sortKey === "data_source") {
                av = (a.data_source || "").toLowerCase();
                bv = (b.data_source || "").toLowerCase();
            } else if (sortKey === "campaign_name") {
                av = (a.campaign_name || "").toLowerCase();
                bv = (b.campaign_name || "").toLowerCase();
            } else if (sortKey === "company") {
                av = (a.company || "").toLowerCase();
                bv = (b.company || "").toLowerCase();
            } else if (sortKey === "assign_to") {
                av = (a.assign_to || "").toLowerCase();
                bv = (b.assign_to || "").toLowerCase();
            } else if (sortKey === "status") {
                av = (a.status.label || "").toLowerCase();
                bv = (b.status.label || "").toLowerCase();
            }
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
                    <thead>
                        <tr style={{ background: "#1e2a4a" }}>
                            <Th>Gen. Timestamp</Th>
                            <SortableTh colKey="enquiry_date_time" {...sp}>Enq. Date &amp; Time</SortableTh>
                            <Th>Lead ID</Th>
                            <SortableTh colKey="name_of_client" {...sp}>Client Details</SortableTh>
                            <Th>Subject</Th>
                            <Th>Notes</Th>
                            <Th>SQV Remarks</Th>
                            <Th>Recording / URL</Th>
                            <SortableTh colKey="website_name" {...sp}>Website Name</SortableTh>
                            <SortableTh colKey="data_source" {...sp}>Data Source</SortableTh>
                            <SortableTh colKey="campaign_name" {...sp}>Campaign / List</SortableTh>
                            <SortableTh colKey="company" {...sp}>Company</SortableTh>
                            <SortableTh colKey="assign_to" {...sp}>Assign To</SortableTh>
                            <Th>Response / Result</Th>
                            <SortableTh colKey="status" {...sp}>Status</SortableTh>
                            <Th style={{ textAlign: "center" }}>Action</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan={16} style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                    No DialShree sent outreach records found.
                                </td>
                            </tr>
                        ) : (
                            paged.map((row, i) => (
                                <tr
                                    key={row.lead_id + "-" + row.id + "-" + i}
                                    style={{ borderBottom: i < paged.length - 1 ? "1px solid #f1f5f9" : "none", transition: "background .12s" }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#e0e7ff"; (e.currentTarget as HTMLTableRowElement).style.boxShadow = "inset 3px 0 0 #4f46e5"; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = ""; (e.currentTarget as HTMLTableRowElement).style.boxShadow = ""; }}
                                >
                                    <Td>{row.timestamp}</Td>
                                    <Td>{row.enquiry_date_time}</Td>
                                    <Td><IdCell>{row.lead_id || `#${row.id}`}</IdCell></Td>
                                    <Td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                            <strong style={{ color: "#1e293b" }}>{row.name_of_client}</strong>
                                            <span style={{ fontSize: 11, color: "#64748b" }}>{row.mobile}</span>
                                            {row.email_id && row.email_id !== "—" && (
                                                <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{row.email_id}</span>
                                            )}
                                        </div>
                                    </Td>
                                    <TooltipTd label="Subject">{row.subjects}</TooltipTd>
                                    <NotesTd label="Notes">{row.notes}</NotesTd>
                                    <NotesTd label="SQV Remarks">{row.sqv_remarks}</NotesTd>
                                    <td style={{ padding: "8px 11px", fontSize: 11.5, borderRight: "1px solid #f1f5f9", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {row.url && row.url !== "—" ? (
                                            isAudioUrl(row.url) ? (
                                                <MiniAudioButton url={row.url} />
                                            ) : (
                                                <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }}>
                                                    Link
                                                </a>
                                            )
                                        ) : (
                                            <span style={{ color: "#94a3b8" }}>—</span>
                                        )}
                                    </td>
                                    <TruncTd>{row.website_name}</TruncTd>
                                    <Td><Pill label={row.dataSourcePill.label} color={row.dataSourcePill.color} /></Td>
                                    <Td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                            <span>{row.campaign_name}</span>
                                            {row.list_id && row.list_id !== "—" && (
                                                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>ID: {row.list_id}</span>
                                            )}
                                        </div>
                                    </Td>
                                    <Td><strong style={{ color: "#334155" }}>{row.company}</strong></Td>
                                    <Td>{row.assign_to}</Td>
                                    <TooltipTd label="DialShree Response Result">{row.response_result || row.code || "—"}</TooltipTd>
                                    <Td><Pill label={row.status.label} color={row.status.color} dot={row.status.dot} /></Td>
                                    <td style={{ padding: "8px 11px", textAlign: "center", verticalAlign: "middle" }}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedModalRow(row)}
                                            style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}
                                        >
                                            <Eye className="w-3 h-3" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <Pagination total={data.length} page={page} perPage={perPage} onPage={setPage} onPerPage={setPerPage} />

            {selectedModalRow && (
                <LeadDetailsModal row={selectedModalRow} onClose={() => setSelectedModalRow(null)} />
            )}
        </>
    );
}

// ─── Date Range Helpers ───────────────────────────────────────────────────────

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

// ─── Main Inner Page Component ────────────────────────────────────────────────

function DialShreeSentPageInner() {
    const { data: sentApiData, loading: sentLoading, isRefreshing: hookRefreshing, error: sentError, refetch } = useDialShreeSentLeads();
    const { hasPermission } = useAuth();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const isRefreshingAny = isRefreshing || hookRefreshing;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const hasSentPermission = hasPermission("dialshree_sent.view") || hasPermission("dialshree_menu.view") || hasPermission("all");

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
    const [customDate, setCustomDate] = useState({ start: "", end: "" });

    const clearFilters = () => {
        setSearch(""); setDateFilter("all"); setCompany("all");
        setDataSource("all"); setStatus("all");
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
    }, [dateFilter, company, dataSource, status]);

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

    // Distinct Filter Options
    const companyOptions = useMemo(() => Array.from(new Set(sentApiData.map(r => r.company))).filter(v => v && v !== "—").sort(), [sentApiData]);
    const dataSourceOptions = useMemo(() => Array.from(new Set(sentApiData.map(r => r.dataSourcePill?.label || r.data_source))).filter(v => v && v !== "—").sort(), [sentApiData]);
    const statusOptions = useMemo(() => Array.from(new Set(sentApiData.map(r => r.status?.label))).filter(v => v && v !== "—").sort(), [sentApiData]);

    // Filtered Data
    const filteredSent = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        return sentApiData.filter(r => {
            if (q) {
                const matchName = (r.name_of_client || "").toLowerCase().includes(q);
                const matchMob = String(r.mobile || "").includes(q);
                const matchAltMob = String(r.alt_mobile || "").includes(q);
                const matchEmail = (r.email_id || "").toLowerCase().includes(q);
                const matchId = String(r.lead_id || "").toLowerCase().includes(q) || String(r.id || "").includes(q);
                const matchSub = (r.subjects || "").toLowerCase().includes(q);
                const matchNotes = (r.notes || "").toLowerCase().includes(q);
                const matchAssign = (r.assign_to || "").toLowerCase().includes(q);
                const matchCamp = (r.campaign_name || "").toLowerCase().includes(q);
                const matchComp = (r.company || "").toLowerCase().includes(q);
                if (!matchName && !matchMob && !matchAltMob && !matchEmail && !matchId && !matchSub && !matchNotes && !matchAssign && !matchCamp && !matchComp) {
                    return false;
                }
            }
            if (!inRange(r._dt_num || r._ts_num, dateWindow.from, dateWindow.to)) return false;
            if (company !== "all" && r.company !== company) return false;
            if (dataSource !== "all" && (r.dataSourcePill?.label !== dataSource && r.data_source !== dataSource)) return false;
            if (status !== "all" && r.status?.label !== status) return false;
            return true;
        }).sort((a, b) => (b._dt_num || b._ts_num || 0) - (a._dt_num || a._ts_num || 0));
    }, [debouncedSearch, dateWindow, company, dataSource, status, sentApiData]);

    const sentCounts = useMemo(() => buildSentCounts(filteredSent), [filteredSent]);

    if (sentLoading && sentApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Image src="/grouploader.gif" alt="Loading" width={200} height={200} priority className="animate-pulse" />
                    <p className="mt-4 text-base font-bold text-indigo-600 animate-pulse">Fetching latest DialShree Sent Outreach Data...</p>
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
                    <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>You don't have permission to view DialShree sent outreach leads.</div>
                </div>
            </div>
        );
    }

    if (sentError && sentApiData.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4">
                <div style={{ maxWidth: 560, width: "100%", background: "#fff", border: "1px solid #fecaca", borderRadius: 16, padding: "22px 24px", boxShadow: "0 12px 30px rgba(220,38,38,.08)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, fontWeight: 800 }}>!</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#991b1b" }}>Could not load DialShree sent leads</div>
                            <div style={{ fontSize: 13, color: "#7f1d1d", marginTop: 6, lineHeight: 1.6 }}>{sentError}</div>
                            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                                <button type="button" onClick={handleRefresh} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                                    Retry now
                                </button>
                                <button type="button" onClick={() => window.location.reload()} style={{ background: "#fff", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
        <div className="font-sans bg-[#f0f2f8] min-h-full text-slate-800 pb-10">
            <style>{`
                @keyframes spin      { to { transform: rotate(360deg); } }
                @keyframes kpi-pulse { 0%,100% { opacity:1; } 50% { opacity:0.38; } }
            `}</style>

            {/* ── Banner ── */}
            <div style={{ background: "linear-gradient(110deg,#3730a3 0%,#4f46e5 45%,#6366f1 100%)", padding: "14px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -60, top: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, color: "#fff" }}>
                    <Phone className="w-5 h-5" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-.3px", lineHeight: 1.2 }}>DialShree Sent Outreach Leads</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 2 }}>DialShree Outbound · Sent Calls — Automated Lead Dispatch &amp; Outreach Log</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    {isRefreshingAny && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.7)", fontSize: 11, fontWeight: 500 }}>
                            <div style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Syncing...
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isRefreshingAny}
                        aria-label={isRefreshingAny ? "Refreshing data" : "Sync data"}
                        style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, height: 38, padding: "0 14px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: isRefreshingAny ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all .2s" }}
                        onMouseEnter={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
                        onMouseLeave={e => !isRefreshingAny && (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
                    >
                        <div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: isRefreshingAny ? "spin 0.8s linear infinite" : "none" }} />
                        {isRefreshingAny ? "Refreshing..." : "Sync Data"}
                    </button>
                    <div style={{ textAlign: "right", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, padding: "6px 14px", flexShrink: 0, zIndex: 1 }}>
                        <div style={{ fontSize: 9.5, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: ".8px", fontWeight: 600 }}>Total Records</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1.1, marginTop: 2 }}>{filteredSent.length}</div>
                    </div>
                </div>
            </div>

            {sentError && sentApiData.length > 0 && (
                <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "12px 14px", color: "#9a3412" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#ffedd5", color: "#c2410c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900 }}>!</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>Background refresh warning</div>
                            <div style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.6 }}>{sentError}</div>
                        </div>
                        <button type="button" onClick={handleRefresh} style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* ── Filters & Search ── */}
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
                                <Input
                                    placeholder="Name, phone, alt phone, email, lead ID, notes, subject..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
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
                                        <SelectItem value="all">All Companies</SelectItem>
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

                        {/* Custom date range inputs */}
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

            {/* ── KPI Status Breakdown ── */}
            <div className="mx-2 sm:mx-4 lg:mx-5 mt-4">
                <CallStatusBreakdown counts={sentCounts} total={filteredSent.length} loading={sentLoading} />
            </div>

            {/* ── Table Container ── */}
            <div ref={tableRef} className="mx-2 sm:mx-4 lg:mx-5 mt-4 mb-6">
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid #e8edf5", background: "#fff" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#e0e7ff", color: "#4f46e5" }}>
                            <Phone className="w-4 h-4" />
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1e2a4a" }}>DialShree Sent Outreach Leads — Automated Dispatch Log</span>
                    </div>
                    {sentLoading && filteredSent.length === 0 ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                            <div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #e2e8f0", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 10, verticalAlign: "middle" }} />
                            Loading DialShree sent data...
                        </div>
                    ) : (
                        <DialShreeSentTableInner data={filteredSent} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DialShreeSentPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading DialShree Sent...</div>}>
            <DialShreeSentPageInner />
        </Suspense>
    );
}
