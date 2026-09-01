"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export interface KServeRcvdLeadRow {
    srNo: number;
    timestamp: string;
    enquiryId: string;
    clientDetails: string;       // Combined: name · mobile · email
    subject: string;
    websiteName: string;
    source: string;
    dataSource: string;
    company: string;
    callSubId: string;
    initialId: string;
    callStartTime: string;
    callEndTime: string;
    callDuration: string;
    callStatus: string;
    callRecording: string;       // URL
    callEndReason: string;
    finalCallStatus: string;
    callOutcome: string;
    finalLeadOutcome: string;
    customerIntent: string;
    customerInterestLevel: string;
    preferredDateTime: string;
    scheduledTime: string;
    scheduledStatus: string;
    aiCallSummary: string;
    assignTo: string;
}

export interface KServeRcvdModalMeta {
    type: string;
    leads: KServeRcvdLeadRow[];
}

interface KServeRcvdLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    meta: KServeRcvdModalMeta | null;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const ROWS_OPTIONS = [5, 10, 25, 50, 100];

const TABLE_COLUMNS: { key: keyof KServeRcvdLeadRow; label: string; minW: number }[] = [
    { key: "srNo", label: "S.No", minW: 55 },
    { key: "timestamp", label: "Timestamp", minW: 150 },
    { key: "enquiryId", label: "Enquiry ID", minW: 150 },
    { key: "clientDetails", label: "Client Details", minW: 190 },
    { key: "subject", label: "Subject", minW: 150 },
    { key: "websiteName", label: "Website Name", minW: 120 },
    { key: "source", label: "Source", minW: 100 },
    { key: "dataSource", label: "Data Source", minW: 110 },
    { key: "company", label: "Company", minW: 125 },
    { key: "callSubId", label: "Call Sub ID", minW: 130 },
    { key: "initialId", label: "Initial ID", minW: 130 },
    { key: "callStartTime", label: "Call Start Time", minW: 150 },
    { key: "callEndTime", label: "Call End Time", minW: 150 },
    { key: "callDuration", label: "Call Duration", minW: 110 },
    { key: "callStatus", label: "Call Status", minW: 115 },
    { key: "callRecording", label: "Call Recording", minW: 110 },
    { key: "callEndReason", label: "Call End Reason", minW: 145 },
    { key: "finalCallStatus", label: "Final Call Status", minW: 135 },
    // { key: "callOutcome", label: "Call Outcome", minW: 130 },           // HIDDEN
    { key: "finalLeadOutcome", label: "Final Lead Outcome", minW: 145 },
    { key: "customerIntent", label: "Customer Intent", minW: 130 },
    // { key: "customerInterestLevel", label: "Customer Interest Level", minW: 160 }, // HIDDEN
    { key: "preferredDateTime", label: "Preferred Date & Time", minW: 155 },
    { key: "scheduledTime", label: "Scheduled Time", minW: 140 },
    { key: "scheduledStatus", label: "Scheduled Status", minW: 135 },
    { key: "aiCallSummary", label: "AI Call Summary", minW: 200 },
    { key: "assignTo", label: "Assign To", minW: 130 },
];

const LONG_COLS = new Set<keyof KServeRcvdLeadRow>([
    "enquiryId", "subject", "aiCallSummary", "callEndReason",
    "callSubId", "initialId", "clientDetails",
]);

// ─────────────────────────────────────────────────────────────────
// BRAND TOKENS  — indigo-violet "received" palette
// ─────────────────────────────────────────────────────────────────
const HEADER_GRADIENT = "linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)";
const ACCENT_GRADIENT = "linear-gradient(135deg, #4f46e5, #7c3aed)";
const THEAD_GRADIENT = "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)";
const THEAD_COLOR = "#c4b5fd";   // soft lavender for col labels
const META_BG = "#f5f3ff";
const META_BORDER = "#ddd6fe";

// ─────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────
const badgePill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    border: "1.5px solid transparent",
};

const tdBase: React.CSSProperties = {
    padding: "9px 8px",
    textAlign: "center",
    verticalAlign: "middle",
    color: "#374151",
    borderBottom: "1px solid #ede9fe",
    fontSize: "12px",
};

// ── Call Status ──
function callStatusStyle(s: string): React.CSSProperties {
    const v = s?.toLowerCase().trim();
    if (v === "completed" || v === "answered" || v === "connected")
        return { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" };
    if (v === "missed" || v === "no answer" || v === "no_answer")
        return { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" };
    if (v === "busy")
        return { background: "#fffbeb", color: "#b45309", border: "1.5px solid #fcd34d" };
    if (v === "in progress" || v === "ringing" || v === "in_progress")
        return { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd" };
    if (v === "voicemail" || v === "left_voicemail")
        return { background: "#fdf4ff", color: "#7e22ce", border: "1.5px solid #d8b4fe" };
    return { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" };
}

// ── Scheduled Status ──
function scheduledStatusStyle(s: string): React.CSSProperties {
    const v = s?.toLowerCase().trim();
    if (v === "scheduled" || v === "confirmed")
        return { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" };
    if (v === "pending" || v === "tentative")
        return { background: "#fffbeb", color: "#b45309", border: "1.5px solid #fcd34d" };
    if (v === "cancelled" || v === "canceled" || v === "not scheduled")
        return { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" };
    if (v === "rescheduled")
        return { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd" };
    return { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" };
}

// ── Interest Level ──
function interestLevelStyle(l: string): { bg: string; color: string; border: string; pct: number } {
    const v = l?.toLowerCase().trim();
    if (v === "very high" || v === "hot")
        return { bg: "#fef2f2", color: "#be123c", border: "#fda4af", pct: 95 };
    if (v === "high")
        return { bg: "#fff7ed", color: "#b45309", border: "#fdba74", pct: 75 };
    if (v === "medium" || v === "moderate")
        return { bg: "#fefce8", color: "#a16207", border: "#fde047", pct: 50 };
    if (v === "low")
        return { bg: "#f0fdf4", color: "#15803d", border: "#86efac", pct: 25 };
    return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", pct: 0 };
}

// ── Customer Intent ──
function intentStyle(i: string): React.CSSProperties {
    const v = i?.toLowerCase().trim();
    if (v === "high" || v === "strong" || v === "buy" || v === "purchase" || v === "book")
        return { background: "#fef2f2", color: "#be123c", border: "1.5px solid #fda4af" };
    if (v === "medium" || v === "considering")
        return { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" };
    if (v === "low" || v === "browsing" || v === "enquiry only")
        return { background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac" };
    return { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" };
}

// ── Outcome ──
function outcomeStyle(o: string): React.CSSProperties {
    const v = o?.toLowerCase().trim();
    if (v === "converted" || v === "booked" || v === "won")
        return { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" };
    if (v === "follow up" || v === "follow-up" || v === "callback" || v === "nurture")
        return { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd" };
    if (v === "lost" || v === "not interested" || v === "disqualified")
        return { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" };
    if (v === "pending" || v === "in progress")
        return { background: "#fffbeb", color: "#b45309", border: "1.5px solid #fcd34d" };
    return { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" };
}

// ── Source colours ──
const SOURCE_COLORS: Record<string, React.CSSProperties> = {
    google: { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" },
    facebook: { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd" },
    ivr: { background: "#fdf4ff", color: "#7e22ce", border: "1.5px solid #d8b4fe" },
    website: { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" },
    walk_in: { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" },
    kserve: { background: "#f5f3ff", color: "#4f46e5", border: "1.5px solid #c4b5fd" },
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function parseType(type: string): { label: string; value: string }[] {
    return type.split("|").map((s) => s.trim()).map((part) => {
        const idx = part.indexOf(":");
        return idx !== -1
            ? { label: part.substring(0, idx).trim(), value: part.substring(idx + 1).trim() }
            : { label: "Info", value: part };
    });
}

function getPageRange(current: number, total: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (current > 3) pages.push("...");
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
}

function fmtDuration(dur: string): string {
    if (!dur || dur === "—") return dur;
    // If already formatted (e.g. "2m 34s") return as-is
    if (dur.includes("m") || dur.includes("s") || dur.includes(":")) return dur;
    // If numeric seconds
    const secs = parseInt(dur, 10);
    if (!isNaN(secs)) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }
    return dur;
}

/**
 * Formats any date/datetime string → IST display.
 * Handles:
 *   - ISO 8601:  "2026-06-27T09:15:43"  "2026-06-27T09:15:43Z"  "2026-06-29T04:00:..."
 *   - Date only: "2026-06-27"
 *   - Already readable strings are returned as-is.
 *
 * Returns two lines: { date: "27 Jun 2026", time: "09:15 AM IST" }
 * or { date: "27 Jun 2026", time: "" } for date-only values.
 */
function parseIST(raw: string): { date: string; time: string } | null {
    if (!raw || raw === "—") return null;

    // Try to build a Date object
    let d: Date | null = null;

    // ISO-like: contains T or looks like "YYYY-MM-DD HH:mm:ss"
    const isoLike = raw.replace(" ", "T").replace(/\.{3,}$/, ""); // strip trailing "..."
    const attempt = new Date(isoLike);
    if (!isNaN(attempt.getTime())) {
        d = attempt;
    }

    if (!d) return null;

    const istOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    };
    const dateStr = d.toLocaleDateString("en-IN", istOptions); // "27 Jun 2026"

    // Check if original had time component
    const hasTime = raw.includes("T") || raw.includes(" ") && raw.split(" ").length > 1;
    if (!hasTime) return { date: dateStr, time: "" };

    const timeStr = d.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }); // "09:15 am"

    return {
        date: dateStr,
        time: timeStr.toUpperCase().replace(/\s?([AP]M)/, " $1") + " IST",
    };
}

const TIME_COLS = new Set<keyof KServeRcvdLeadRow>([
    "callStartTime", "callEndTime", "scheduledTime", "timestamp", "preferredDateTime",
]);

// ─────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

/** Client Details: renders name + mobile + email stacked */
function ClientDetailsCell({ value }: { value: string }) {
    // Expected: "Name · +91XXXXXXXXXX · email@domain.com" or plain text
    const parts = value.split(/[·•|]/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) {
        return (
            <span style={{
                display: "block", maxWidth: "178px", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 auto",
                cursor: value.length > 22 ? "help" : "default",
            }} title={value.length > 22 ? value : undefined}>{value || "—"}</span>
        );
    }
    return (
        <div style={{ textAlign: "left", minWidth: "170px" }}>
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#1e1b4b", lineHeight: 1.3 }}>{parts[0]}</div>
            {parts[1] && (
                <div style={{ fontSize: "11px", color: "#4f46e5", marginTop: "1px", fontWeight: 500 }}>{parts[1]}</div>
            )}
            {parts[2] && (
                <div style={{
                    fontSize: "10px", color: "#6b7280", marginTop: "1px",
                    maxWidth: "175px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }} title={parts[2]}>{parts[2]}</div>
            )}
        </div>
    );
}

/** Interest level — mini horizontal bar */
function InterestBar({ value }: { value: string }) {
    const cfg = interestLevelStyle(value);
    if (cfg.pct === 0) {
        return <span style={{ ...badgePill, background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}` }}>{value || "—"}</span>;
    }
    return (
        <div style={{ minWidth: "120px", textAlign: "center" }}>
            <span style={{ ...badgePill, background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}`, marginBottom: "4px" }}>
                {value}
            </span>
            <div style={{
                width: "100%", height: "4px", background: "#e5e7eb",
                borderRadius: "4px", marginTop: "3px", overflow: "hidden",
            }}>
                <div style={{
                    width: `${cfg.pct}%`, height: "100%",
                    background: `linear-gradient(90deg, ${cfg.color}, ${cfg.border})`,
                    borderRadius: "4px",
                    transition: "width 0.4s ease",
                }} />
            </div>
        </div>
    );
}

/** Duration chip */
function DurationChip({ value }: { value: string }) {
    const fmt = fmtDuration(value);
    if (fmt === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            background: "#f5f3ff", color: "#4f46e5",
            border: "1.5px solid #c4b5fd",
            padding: "3px 10px", borderRadius: "20px",
            fontSize: "11px", fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
        }}>
            <span style={{ fontSize: "9px" }}>⏱</span>
            {fmt}
        </span>
    );
}

/** AI Call Summary — expandable row cell */
function AISummaryCell({ value, maxWidth }: { value: string; maxWidth: number }) {
    const [expanded, setExpanded] = useState(false);
    if (!value || value === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
    const isLong = value.length > 60;
    return (
        <div style={{ maxWidth: `${maxWidth}px`, textAlign: "left" }}>
            <span style={{
                fontSize: "11px", color: "#374151", lineHeight: 1.45,
                whiteSpace: expanded ? "normal" : "nowrap",
                overflow: expanded ? "visible" : "hidden",
                textOverflow: expanded ? "clip" : "ellipsis",
                display: "block",
            }}>{value}</span>
            {isLong && (
                <button
                    onClick={() => setExpanded(e => !e)}
                    style={{
                        marginTop: "3px", background: "none", border: "none",
                        cursor: "pointer", color: "#4f46e5", fontSize: "10px",
                        fontWeight: 700, padding: 0, textDecoration: "underline",
                    }}
                >
                    {expanded ? "Show less" : "Read more"}
                </button>
            )}
        </div>
    );
}

function CloseButton({ onClick }: { onClick: () => void }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label="Close modal"
            style={{
                flexShrink: 0, width: "36px", height: "36px",
                borderRadius: "50%",
                border: hovered ? "2px solid #fff" : "2px solid rgba(255,255,255,0.45)",
                background: hovered ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)",
                color: "#fff", fontSize: "18px", lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.18s ease",
                boxShadow: hovered ? "0 0 0 4px rgba(255,255,255,0.15)" : "none",
                transform: hovered ? "rotate(90deg) scale(1.1)" : "rotate(0deg) scale(1)",
                fontWeight: 300,
            }}
        >✕</button>
    );
}

function NavBtn({ label, active, disabled, onClick }: {
    label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                height: "30px", padding: "0 10px", borderRadius: "7px",
                border: active ? "none" : "1px solid #d1d5db",
                background: active ? ACCENT_GRADIENT : disabled ? "#f9fafb" : "#fff",
                color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
                fontSize: "11px", fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", transition: "all 0.15s",
            }}
        >{label}</button>
    );
}

function useWindowSize() {
    const [size, setSize] = useState({ w: 1200, h: 800 });
    useEffect(() => {
        function update() { setSize({ w: window.innerWidth, h: window.innerHeight }); }
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);
    return size;
}

// ─────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────
export default function KServeRcvdLeadsModal({
    isOpen, onClose, meta,
}: KServeRcvdLeadsModalProps) {
    const [page, setPage] = useState(1);
    const [rpp, setRpp] = useState(10);
    const [goVal, setGoVal] = useState("");
    const [visible, setVisible] = useState(false);
    const { w } = useWindowSize();

    const isMobile = w < 640;
    const isTablet = w >= 640 && w < 1024;
    const isDesktop = w >= 1024;

    useEffect(() => {
        if (isOpen) setTimeout(() => setVisible(true), 10);
        else setVisible(false);
    }, [isOpen]);

    useEffect(() => { setPage(1); setGoVal(""); }, [meta]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const handleKey = useCallback(
        (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]
    );
    useEffect(() => {
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [handleKey]);

    if (!isOpen || !meta) return null;

    const { leads, type } = meta;
    const metaParts = parseType(type);

    const totalRows = leads.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rpp));
    const safePage = Math.min(page, totalPages);
    const sliced = leads.slice((safePage - 1) * rpp, safePage * rpp);
    const showStart = totalRows === 0 ? 0 : (safePage - 1) * rpp + 1;
    const showEnd = Math.min(safePage * rpp, totalRows);

    function goTo() {
        const n = parseInt(goVal, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setGoVal(""); }
    }

    // Responsive dimensions
    const modalWidth = isMobile ? "98vw" : isTablet ? "97vw" : "90vw";
    const modalHeight = isMobile ? "95dvh" : isTablet ? "92dvh" : "88dvh";
    const maxWidth = isDesktop ? "1600px" : "100%";
    const headerPad = isMobile ? "12px 14px" : "16px 24px";
    const metaBarPad = isMobile ? "8px 12px" : "10px 20px";
    const footerPad = isMobile ? "8px 10px" : "10px 20px";
    const headerSize = isMobile ? "14px" : "18px";

    return (
        <>
            <style>{`
        .kr-footer-inner {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px; width: 100%;
        }
        .kr-pg-row {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
        }
        .kr-rpp-go {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .kr-meta-bar {
          display: flex; gap: 8px; flex-wrap: wrap;
          align-items: center; justify-content: center;
        }
        .kr-meta-card {
          flex: 1 1 0; min-width: 80px; max-width: 165px; box-sizing: border-box;
        }
        /* Row hover */
        .kr-tbody tr:hover td {
          background: #f5f3ff !important;
        }
        /* Violet scrollbar */
        .kr-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .kr-scroll::-webkit-scrollbar-track { background: #f5f3ff; }
        .kr-scroll::-webkit-scrollbar-thumb {
          background: #7c3aed; border-radius: 4px;
        }
        .kr-scroll::-webkit-scrollbar-thumb:hover { background: #4f46e5; }
        @media (max-width: 639px) {
          .kr-footer-inner { flex-direction: column; align-items: flex-start; }
          .kr-pg-row { width: 100%; justify-content: center; }
          .kr-rpp-go { width: 100%; justify-content: space-between; }
        }
      `}</style>

            {/* ── BACKDROP ── */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(10, 8, 30, 0.74)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 1040,
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.25s ease",
                }}
            />

            {/* ── MODAL ── */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="KServe Received Leads Detail Report"
                style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: visible
                        ? "translate(-50%,-50%) scale(1)"
                        : "translate(-50%,-47%) scale(0.96)",
                    width: modalWidth, maxWidth,
                    height: modalHeight, maxHeight: "98dvh",
                    background: "#fff",
                    borderRadius: isMobile ? "12px" : "18px",
                    boxShadow: "0 36px 100px rgba(0,0,0,0.3), 0 0 0 1px rgba(124,58,237,0.15)",
                    zIndex: 1050,
                    display: "flex", flexDirection: "column",
                    overflow: "hidden",
                    opacity: visible ? 1 : 0,
                    transition: "opacity 0.25s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }}
            >

                {/* ── HEADER ── */}
                <div style={{
                    background: HEADER_GRADIENT,
                    padding: headerPad,
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: "12px",
                    flexShrink: 0, position: "relative", overflow: "hidden",
                }}>
                    {/* Decorative orbs */}
                    <div style={{
                        position: "absolute", top: "-20px", right: "80px",
                        width: "90px", height: "90px", borderRadius: "50%",
                        background: "rgba(196,181,253,0.08)", pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", bottom: "-25px", right: "25px",
                        width: "65px", height: "65px", borderRadius: "50%",
                        background: "rgba(167,139,250,0.06)", pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", top: "50%", left: "42%",
                        transform: "translateY(-50%)",
                        width: "200px", height: "200px", borderRadius: "50%",
                        background: "rgba(139,92,246,0.05)", pointerEvents: "none",
                    }} />

                    <div style={{ minWidth: 0, flex: 1, zIndex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{
                                background: "rgba(196,181,253,0.2)",
                                border: "1px solid rgba(196,181,253,0.4)",
                                borderRadius: "6px", padding: "2px 8px",
                                fontSize: "9px", fontWeight: 800,
                                color: "#c4b5fd", letterSpacing: "1.2px",
                                textTransform: "uppercase",
                            }}>KServe</span>
                            <span style={{
                                background: "rgba(167,139,250,0.15)",
                                border: "1px solid rgba(167,139,250,0.3)",
                                borderRadius: "6px", padding: "2px 8px",
                                fontSize: "9px", fontWeight: 700,
                                color: "#a78bfa", letterSpacing: "0.8px",
                                textTransform: "uppercase",
                            }}>📥 Received</span>
                            <span style={{
                                color: "rgba(255,255,255,0.55)",
                                fontSize: isMobile ? "9px" : "10px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                            }}>AI Call Leads — Detailed Report</span>
                        </div>
                        <h2 style={{
                            margin: 0, color: "#fff",
                            fontSize: headerSize, fontWeight: 700, letterSpacing: "0.2px",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                            {metaParts.map((p) => p.value).join(" · ")}
                        </h2>
                    </div>
                    <CloseButton onClick={onClose} />
                </div>

                {/* ── META CARDS BAR ── */}
                <div style={{
                    padding: metaBarPad,
                    background: META_BG,
                    borderBottom: `1px solid ${META_BORDER}`,
                    flexShrink: 0, overflowX: "auto",
                }}>
                    <div className="kr-meta-bar">
                        {metaParts.map((p) => (
                            <div key={p.label} className="kr-meta-card" style={{
                                background: "#fff",
                                border: `1px solid ${META_BORDER}`,
                                borderRadius: "8px", padding: "5px 12px",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", textAlign: "center",
                                flexShrink: 0,
                                boxShadow: "0 1px 3px rgba(79,70,229,0.07)",
                            }}>
                                <span style={{
                                    fontSize: "9px", fontWeight: 700, color: "#a78bfa",
                                    textTransform: "uppercase", letterSpacing: "0.5px",
                                }}>{p.label}</span>
                                <span style={{
                                    fontSize: isMobile ? "12px" : "14px",
                                    fontWeight: 700, color: "#1e1b4b", marginTop: "1px",
                                }}>{p.value}</span>
                            </div>
                        ))}
                        <div style={{ flexShrink: 0 }}>
                            <span style={{
                                background: ACCENT_GRADIENT, color: "#fff",
                                borderRadius: "20px", padding: "5px 16px",
                                fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
                                boxShadow: "0 2px 8px rgba(79,70,229,0.3)",
                            }}>
                                {totalRows} Calls Received
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── TABLE ── */}
                <div className="kr-scroll" style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                            <tr>
                                {TABLE_COLUMNS.map((col) => (
                                    <th key={col.key} style={{
                                        background: THEAD_GRADIENT,
                                        color: THEAD_COLOR,
                                        padding: "11px 8px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        whiteSpace: "nowrap",
                                        position: "sticky", top: 0, zIndex: 5,
                                        minWidth: col.minW,
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                                        borderRight: "1px solid rgba(196,181,253,0.08)",
                                    }}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="kr-tbody">
                            {sliced.length === 0 ? (
                                <tr>
                                    <td colSpan={TABLE_COLUMNS.length} style={{
                                        textAlign: "center", padding: "60px 20px",
                                        color: "#94a3b8", fontSize: "14px",
                                    }}>
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                sliced.map((row, idx) => (
                                    <tr
                                        key={row.enquiryId + idx}
                                        style={{
                                            background: idx % 2 === 0 ? "#fff" : "#faf9ff",
                                            transition: "background 0.12s",
                                        }}
                                    >
                                        {TABLE_COLUMNS.map((col) => {
                                            const raw = row[col.key];
                                            const val = raw !== undefined && raw !== null && String(raw).trim() !== ""
                                                ? String(raw) : "—";

                                            // ── S.No ──
                                            if (col.key === "srNo") {
                                                return (
                                                    <td key={col.key} style={{ ...tdBase, fontWeight: 700, color: "#6b7280" }}>
                                                        {showStart + idx}
                                                    </td>
                                                );
                                            }

                                            // ── Client Details ──
                                            if (col.key === "clientDetails") {
                                                return (
                                                    <td key={col.key} style={{ ...tdBase, textAlign: "left", paddingLeft: "12px" }}>
                                                        <ClientDetailsCell value={val} />
                                                    </td>
                                                );
                                            }

                                            // ── Call Recording ──
                                            if (col.key === "callRecording" && val !== "—") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <a href={val} target="_blank" rel="noreferrer" style={{
                                                            background: ACCENT_GRADIENT,
                                                            color: "#fff", padding: "3px 12px",
                                                            borderRadius: "6px", fontSize: "10px",
                                                            fontWeight: 700, textDecoration: "none",
                                                            whiteSpace: "nowrap",
                                                            boxShadow: "0 1px 4px rgba(79,70,229,0.3)",
                                                        }}>▶ Play</a>
                                                    </td>
                                                );
                                            }

                                            // ── Call Duration ──
                                            if (col.key === "callDuration") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <DurationChip value={val} />
                                                    </td>
                                                );
                                            }

                                            // ── Call Status ──
                                            if (col.key === "callStatus" || col.key === "finalCallStatus") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...callStatusStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── Scheduled Status ──
                                            if (col.key === "scheduledStatus") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...scheduledStatusStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── Customer Intent ──
                                            if (col.key === "customerIntent") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...intentStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── Customer Interest Level — HIDDEN ──
                                            // if (col.key === "customerInterestLevel") {
                                            //     return (
                                            //         <td key={col.key} style={{ ...tdBase }}>
                                            //             <InterestBar value={val} />
                                            //         </td>
                                            //     );
                                            // }

                                            // ── Call Outcome — HIDDEN ──
                                            // if (col.key === "callOutcome") {
                                            //     return (
                                            //         <td key={col.key} style={tdBase}>
                                            //             <span style={{ ...badgePill, ...outcomeStyle(val) }}>{val}</span>
                                            //         </td>
                                            //     );
                                            // }

                                            // ── Final Lead Outcome ──
                                            if (col.key === "finalLeadOutcome") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...outcomeStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── Source ──
                                            if (col.key === "source") {
                                                const sc = SOURCE_COLORS[val.toLowerCase()] || {
                                                    background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0"
                                                };
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...sc }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── DateTime columns → IST ──
                                            if (TIME_COLS.has(col.key)) {
                                                if (val === "—") {
                                                    return (
                                                        <td key={col.key} style={tdBase}>
                                                            <span style={{ color: "#9ca3af" }}>—</span>
                                                        </td>
                                                    );
                                                }
                                                const parsed = parseIST(val);
                                                if (!parsed) {
                                                    return (
                                                        <td key={col.key} style={tdBase}>
                                                            <span style={{
                                                                fontSize: "11px", color: "#374151",
                                                                display: "block", maxWidth: `${col.minW - 12}px`,
                                                                overflow: "hidden", textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap", margin: "0 auto",
                                                            }} title={val}>{val}</span>
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={col.key} style={{ ...tdBase }}>
                                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                                                            <span style={{
                                                                fontSize: "11px", fontWeight: 600,
                                                                color: "#1e1b4b", whiteSpace: "nowrap",
                                                            }}>{parsed.date}</span>
                                                            {parsed.time && (
                                                                <span style={{
                                                                    fontSize: "10px", fontWeight: 500,
                                                                    color: "#4f46e5", whiteSpace: "nowrap",
                                                                    background: "#f5f3ff",
                                                                    padding: "1px 6px", borderRadius: "4px",
                                                                    border: "1px solid #ede9fe",
                                                                }}>{parsed.time}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            // ── Call Sub ID / Initial ID ──
                                            if (col.key === "callSubId" || col.key === "initialId") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{
                                                            fontFamily: "monospace",
                                                            fontSize: "11px",
                                                            background: "#f5f3ff",
                                                            color: "#4f46e5",
                                                            padding: "2px 7px",
                                                            borderRadius: "5px",
                                                            border: "1px solid #c4b5fd",
                                                            letterSpacing: "0.2px",
                                                            display: "inline-block",
                                                            maxWidth: `${col.minW - 16}px`,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            verticalAlign: "bottom",
                                                        }} title={val.length > 14 ? val : undefined}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── AI Call Summary ──
                                            if (col.key === "aiCallSummary") {
                                                return (
                                                    <td key={col.key} style={{ ...tdBase, textAlign: "left", paddingLeft: "10px" }}>
                                                        <AISummaryCell value={val} maxWidth={col.minW - 10} />
                                                    </td>
                                                );
                                            }

                                            // ── GENERIC TRUNCATE ──
                                            const truncThreshold = LONG_COLS.has(col.key) ? 20 : 24;
                                            return (
                                                <td key={col.key} style={tdBase}>
                                                    <span
                                                        title={val !== "—" && val.length > truncThreshold ? val : undefined}
                                                        style={{
                                                            display: "block",
                                                            maxWidth: `${col.minW - 12}px`,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                            margin: "0 auto",
                                                            cursor: val.length > truncThreshold ? "help" : "default",
                                                        }}
                                                    >{val}</span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── PAGINATION FOOTER ── */}
                <div style={{
                    padding: footerPad,
                    background: META_BG,
                    borderTop: `1px solid ${META_BORDER}`,
                    flexShrink: 0,
                }}>
                    <div className="kr-footer-inner">

                        {/* Showing X–Y of Z */}
                        <span style={{ fontSize: isMobile ? "11px" : "13px", color: "#374151", whiteSpace: "nowrap" }}>
                            Showing{" "}
                            <strong style={{
                                background: "#fff", border: `1px solid ${META_BORDER}`,
                                borderRadius: "6px", padding: "1px 7px",
                                fontSize: isMobile ? "11px" : "13px", color: "#1e1b4b",
                            }}>
                                {showStart}–{showEnd}
                            </strong>
                            {" "}of{" "}
                            <strong style={{ color: "#4f46e5" }}>{totalRows}</strong> received leads
                        </span>

                        {/* Page navigation */}
                        <div className="kr-pg-row">
                            <NavBtn label="«" disabled={safePage === 1} onClick={() => setPage(1)} />
                            <NavBtn label="‹ Prev" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)} />
                            {!isMobile && getPageRange(safePage, totalPages).map((p, i) =>
                                p === "..." ? (
                                    <span key={`dot${i}`} style={{ padding: "0 3px", color: "#9ca3af", fontSize: "11px" }}>…</span>
                                ) : (
                                    <NavBtn key={p} label={String(p)} active={p === safePage} onClick={() => setPage(Number(p))} />
                                )
                            )}
                            {isMobile && (
                                <span style={{ fontSize: "11px", color: "#374151", padding: "0 6px", fontWeight: 600 }}>
                                    {safePage} / {totalPages}
                                </span>
                            )}
                            <NavBtn label="Next ›" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)} />
                            <NavBtn label="»" disabled={safePage === totalPages} onClick={() => setPage(totalPages)} />
                        </div>

                        {/* Rows/page + Go to */}
                        <div className="kr-rpp-go">
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Rows/page</span>
                                <select
                                    value={rpp}
                                    onChange={(e) => { setRpp(Number(e.target.value)); setPage(1); }}
                                    style={{
                                        border: `1px solid ${META_BORDER}`, borderRadius: "7px",
                                        padding: "3px 6px", fontSize: "11px",
                                        background: "#fff", color: "#1e1b4b",
                                        cursor: "pointer", outline: "none",
                                    }}
                                >
                                    {ROWS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Go to</span>
                                <input
                                    type="number" min={1} max={totalPages}
                                    value={goVal}
                                    onChange={(e) => setGoVal(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && goTo()}
                                    placeholder="#"
                                    style={{
                                        width: "46px", border: `1px solid ${META_BORDER}`,
                                        borderRadius: "7px", padding: "3px 6px",
                                        fontSize: "11px", textAlign: "center",
                                        outline: "none", color: "#1e1b4b",
                                    }}
                                />
                                <button
                                    onClick={goTo}
                                    style={{
                                        background: ACCENT_GRADIENT, color: "#fff",
                                        border: "none", borderRadius: "7px",
                                        padding: "4px 12px", fontSize: "11px",
                                        fontWeight: 700, cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        boxShadow: "0 1px 4px rgba(79,70,229,0.3)",
                                    }}
                                >Go</button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}
