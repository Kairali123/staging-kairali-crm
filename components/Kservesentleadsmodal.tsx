"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export interface KServeSentLeadRow {
    srNo: number;
    timestamp: string;
    enquiryId: string;
    nameOfClient: string;
    mobile: string;
    emailId: string;
    subjects: string;
    notes: string;
    ivrUrl: string;
    websiteName: string;
    dataSource: string;
    source: string;
    company: string;
    campaignId: string;
    campaignName: string;
    assignTo: string;
    responseFromKserve: string;
    codeStatus: string;
    leadIntent: string;
    urgency: string;
}

export interface KServeModalMeta {
    /** Pipe-separated e.g. "Date: 2026-04-23 | Source: IVR | Type: NBD" */
    type: string;
    leads: KServeSentLeadRow[];
}

interface KServeSentLeadsModalProps {
    isOpen: boolean;
    onClose: () => void;
    meta: KServeModalMeta | null;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const ROWS_OPTIONS = [5, 10, 25, 50, 100];

const TABLE_COLUMNS: { key: keyof KServeSentLeadRow; label: string; minW: number }[] = [
    { key: "srNo", label: "S.No", minW: 55 },
    { key: "timestamp", label: "Timestamp", minW: 140 },
    { key: "enquiryId", label: "Enquiry ID", minW: 145 },
    { key: "nameOfClient", label: "Name of Client", minW: 135 },
    { key: "mobile", label: "Mobile", minW: 115 },
    { key: "emailId", label: "Email ID", minW: 160 },
    { key: "subjects", label: "Subjects", minW: 145 },
    { key: "notes", label: "Notes", minW: 165 },
    { key: "ivrUrl", label: "IVR URL", minW: 90 },
    { key: "websiteName", label: "Website Name", minW: 120 },
    { key: "dataSource", label: "Data Source", minW: 110 },
    { key: "source", label: "Source", minW: 100 },
    { key: "company", label: "Company", minW: 125 },
    { key: "campaignId", label: "Campaign ID", minW: 115 },
    { key: "campaignName", label: "Campaign Name", minW: 180 },
    { key: "assignTo", label: "Assign To", minW: 130 },
    { key: "responseFromKserve", label: "Response From KServe", minW: 175 },
    { key: "codeStatus", label: "Code Status", minW: 115 },
    { key: "leadIntent", label: "Lead Intent", minW: 115 },
    { key: "urgency", label: "Urgency", minW: 110 },
];

const LONG_COLS = new Set<keyof KServeSentLeadRow>([
    "notes", "subjects", "emailId", "enquiryId", "campaignName",
    "responseFromKserve", "campaignId",
]);

// ─────────────────────────────────────────────────────────────────
// CODE STATUS CONFIG
// ─────────────────────────────────────────────────────────────────
interface StatusConfig {
    bg: string;
    color: string;
    border: string;
    dot: string;
    label?: string;
}

function codeStatusStyle(status: string): StatusConfig {
    const s = status?.toLowerCase().trim();
    if (s === "200" || s === "success" || s === "sent" || s === "ok")
        return { bg: "#f0fdf4", color: "#15803d", border: "#86efac", dot: "#22c55e" };
    if (s === "pending" || s === "queued" || s === "processing")
        return { bg: "#fffbeb", color: "#b45309", border: "#fcd34d", dot: "#f59e0b" };
    if (s === "failed" || s === "error" || s === "400" || s === "500" || s === "404")
        return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5", dot: "#ef4444" };
    if (s === "new" || s === "received")
        return { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd", dot: "#3b82f6" };
    return { bg: "#f8fafc", color: "#475569", border: "#cbd5e1", dot: "#94a3b8" };
}

function leadIntentStyle(intent: string): React.CSSProperties {
    const i = intent?.toLowerCase().trim();
    if (i === "high" || i === "hot")
        return { background: "#fff1f2", color: "#be123c", border: "1.5px solid #fda4af" };
    if (i === "medium" || i === "warm")
        return { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" };
    if (i === "low" || i === "cold")
        return { background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac" };
    return { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" };
}

function urgencyStyle(urgency: string): React.CSSProperties {
    const u = urgency?.toLowerCase().trim();
    if (u === "critical" || u === "urgent")
        return { background: "#fff1f2", color: "#be123c", border: "1.5px solid #fda4af" };
    if (u === "high")
        return { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" };
    if (u === "medium" || u === "normal")
        return { background: "#fefce8", color: "#a16207", border: "1.5px solid #fde047" };
    if (u === "low")
        return { background: "#f0fdf4", color: "#166534", border: "1.5px solid #86efac" };
    return { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" };
}

function responseStyle(resp: string): React.CSSProperties {
    const r = resp?.toLowerCase().trim();
    if (r === "yes" || r === "responded" || r === "replied" || r === "acknowledged")
        return { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" };
    if (r === "no" || r === "pending" || r === "not yet" || r === "awaiting")
        return { background: "#fefce8", color: "#a16207", border: "1.5px solid #fde047" };
    return { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" };
}

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

// ─────────────────────────────────────────────────────────────────
// SHARED STYLE TOKENS
// ─────────────────────────────────────────────────────────────────
// Teal-to-emerald KServe brand gradient
const HEADER_GRADIENT = "linear-gradient(135deg, #0f766e 0%, #059669 50%, #0d9488 100%)";
const ACCENT_GRADIENT = "linear-gradient(135deg, #0f766e, #059669)";

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
    borderBottom: "1px solid #e5e7eb",
    fontSize: "12px",
};

// ─────────────────────────────────────────────────────────────────
// CLOSE BUTTON
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// NAV BUTTON
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// useWindowSize
// ─────────────────────────────────────────────────────────────────
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
// STATUS DOT BADGE
// ─────────────────────────────────────────────────────────────────
function StatusDotBadge({ value }: { value: string }) {
    const cfg = codeStatusStyle(value);
    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: "5px",
            padding: "3px 10px", borderRadius: "20px", fontSize: "10px",
            fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px",
            background: cfg.bg, color: cfg.color,
            border: `1.5px solid ${cfg.border}`,
        }}>
            <span style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: cfg.dot, flexShrink: 0,
                boxShadow: `0 0 4px ${cfg.dot}`,
            }} />
            {value}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────
export default function KServeSentLeadsModal({
    isOpen, onClose, meta,
}: KServeSentLeadsModalProps) {
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

    // Conditionally show campaignId / campaignName based on source
    const sourcePart = metaParts.find(p => p.label.toLowerCase() === "source");
    const sourceVal = sourcePart?.value?.toLowerCase() || "";
    const showCampaignCols = sourceVal === "google" || sourceVal === "facebook" || !sourcePart;

    const currentColumns = TABLE_COLUMNS.filter(col => {
        if (col.key === "campaignId" || col.key === "campaignName") return showCampaignCols;
        return true;
    });

    function goTo() {
        const n = parseInt(goVal, 10);
        if (!isNaN(n) && n >= 1 && n <= totalPages) { setPage(n); setGoVal(""); }
    }

    // ── Responsive dimensions ──
    const modalWidth = isMobile ? "98vw" : isTablet ? "97vw" : "88vw";
    const modalHeight = isMobile ? "95dvh" : isTablet ? "92dvh" : "88dvh";
    const maxWidth = isDesktop ? "1520px" : "100%";
    const headerPad = isMobile ? "12px 14px" : "16px 24px";
    const metaBarPad = isMobile ? "8px 12px" : "10px 20px";
    const footerPad = isMobile ? "8px 10px" : "10px 20px";
    const headerSize = isMobile ? "14px" : "18px";

    return (
        <>
            {/* ── GLOBAL STYLES ── */}
            <style>{`
        .ks-footer-inner {
          display: flex; align-items: center;
          justify-content: space-between; flex-wrap: wrap; gap: 8px; width: 100%;
        }
        .ks-pg-row {
          display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
        }
        .ks-rpp-go {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .ks-meta-bar {
          display: flex; gap: 8px; flex-wrap: wrap;
          align-items: center; justify-content: center;
        }
        .ks-meta-card {
          flex: 1 1 0; min-width: 80px; max-width: 170px; box-sizing: border-box;
        }
        /* Subtle col hover */
        .ks-tbody tr:hover td {
          background: #f0fdf4 !important;
        }
        /* Teal scrollbar */
        .ks-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .ks-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .ks-scroll::-webkit-scrollbar-thumb {
          background: #0d9488; border-radius: 4px;
        }
        .ks-scroll::-webkit-scrollbar-thumb:hover { background: #0f766e; }
        @media (max-width: 639px) {
          .ks-footer-inner { flex-direction: column; align-items: flex-start; }
          .ks-pg-row { width: 100%; justify-content: center; }
          .ks-rpp-go { width: 100%; justify-content: space-between; }
        }
      `}</style>

            {/* ── BACKDROP ── */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0,
                    background: "rgba(6, 30, 28, 0.72)",
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
                aria-label="KServe Sent Leads Detail Report"
                style={{
                    position: "fixed",
                    top: "50%", left: "50%",
                    transform: visible
                        ? "translate(-50%,-50%) scale(1)"
                        : "translate(-50%,-47%) scale(0.96)",
                    width: modalWidth,
                    maxWidth,
                    height: modalHeight,
                    maxHeight: "98dvh",
                    background: "#fff",
                    borderRadius: isMobile ? "12px" : "18px",
                    boxShadow: "0 36px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(13,148,136,0.15)",
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
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                }}>
                    {/* Decorative circles */}
                    <div style={{
                        position: "absolute", top: "-18px", right: "60px",
                        width: "80px", height: "80px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.06)", pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", bottom: "-22px", right: "20px",
                        width: "60px", height: "60px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)", pointerEvents: "none",
                    }} />

                    <div style={{ minWidth: 0, flex: 1, zIndex: 1 }}>
                        {/* KServe badge + label row */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{
                                background: "rgba(255,255,255,0.18)",
                                border: "1px solid rgba(255,255,255,0.35)",
                                borderRadius: "6px",
                                padding: "2px 8px",
                                fontSize: "9px",
                                fontWeight: 800,
                                color: "#fff",
                                letterSpacing: "1.2px",
                                textTransform: "uppercase",
                            }}>KServe</span>
                            <span style={{
                                color: "rgba(255,255,255,0.65)",
                                fontSize: isMobile ? "9px" : "10px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                            }}>Sent Leads — Detailed Report</span>
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
                    background: "#f0fdf9",
                    borderBottom: "1px solid #d1fae5",
                    flexShrink: 0,
                    overflowX: "auto",
                }}>
                    <div className="ks-meta-bar">
                        {metaParts.map((p) => (
                            <div key={p.label} className="ks-meta-card" style={{
                                background: "#fff",
                                border: "1px solid #d1fae5",
                                borderRadius: "8px",
                                padding: "5px 12px",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", textAlign: "center",
                                flexShrink: 0,
                                boxShadow: "0 1px 3px rgba(13,148,136,0.07)",
                            }}>
                                <span style={{
                                    fontSize: "9px", fontWeight: 700, color: "#6ee7b7",
                                    textTransform: "uppercase", letterSpacing: "0.5px",
                                }}>{p.label}</span>
                                <span style={{
                                    fontSize: isMobile ? "12px" : "14px", fontWeight: 700,
                                    color: "#065f46", marginTop: "1px",
                                }}>{p.value}</span>
                            </div>
                        ))}

                        {/* Total Leads badge */}
                        <div style={{ flexShrink: 0 }}>
                            <span style={{
                                background: ACCENT_GRADIENT,
                                color: "#fff", borderRadius: "20px",
                                padding: "5px 16px",
                                fontSize: "11px", fontWeight: 700,
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 8px rgba(13,148,136,0.3)",
                            }}>
                                {totalRows} Leads Sent
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── TABLE ── */}
                <div className="ks-scroll" style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead>
                            <tr>
                                {currentColumns.map((col) => (
                                    <th key={col.key} style={{
                                        background: "linear-gradient(135deg, #134e4a 0%, #0f3d39 100%)",
                                        color: "#6ee7b7",
                                        padding: "11px 8px",
                                        textAlign: "center",
                                        fontWeight: 700,
                                        fontSize: "10px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        whiteSpace: "nowrap",
                                        position: "sticky", top: 0, zIndex: 5,
                                        minWidth: col.minW,
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                        borderRight: "1px solid rgba(110,231,183,0.08)",
                                    }}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="ks-tbody">
                            {sliced.length === 0 ? (
                                <tr>
                                    <td colSpan={currentColumns.length} style={{
                                        textAlign: "center", padding: "60px 20px",
                                        color: "#94a3b8", fontSize: "14px",
                                    }}>
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                sliced.map((row, idx) => (
                                    <tr key={row.enquiryId + idx} style={{
                                        background: idx % 2 === 0 ? "#fff" : "#f8fffe",
                                        transition: "background 0.12s",
                                    }}>
                                        {currentColumns.map((col) => {
                                            const raw = row[col.key];
                                            const val = raw !== undefined && raw !== null && String(raw).trim() !== ""
                                                ? String(raw) : "—";

                                            // ── IVR URL ──
                                            if (col.key === "ivrUrl" && val !== "—") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <a href={val} target="_blank" rel="noreferrer" style={{
                                                            background: ACCENT_GRADIENT,
                                                            color: "#fff", padding: "3px 12px",
                                                            borderRadius: "6px", fontSize: "10px",
                                                            fontWeight: 700, textDecoration: "none",
                                                            whiteSpace: "nowrap",
                                                            boxShadow: "0 1px 4px rgba(13,148,136,0.3)",
                                                        }}>▶ Listen</a>
                                                    </td>
                                                );
                                            }

                                            // ── CODE STATUS ──
                                            if (col.key === "codeStatus") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <StatusDotBadge value={val} />
                                                    </td>
                                                );
                                            }

                                            // ── LEAD INTENT ──
                                            if (col.key === "leadIntent") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...leadIntentStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── URGENCY ──
                                            if (col.key === "urgency") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...urgencyStyle(val) }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── RESPONSE FROM KSERVE ──
                                            if (col.key === "responseFromKserve") {
                                                const isLong = val.length > 22;
                                                if (isLong) {
                                                    return (
                                                        <td key={col.key} style={tdBase}>
                                                            <span
                                                                title={val}
                                                                style={{
                                                                    display: "block",
                                                                    maxWidth: `${col.minW - 12}px`,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                    margin: "0 auto",
                                                                    cursor: "help",
                                                                    ...responseStyle(val),
                                                                    padding: "3px 8px",
                                                                    borderRadius: "6px",
                                                                    fontSize: "11px",
                                                                    fontWeight: 500,
                                                                }}
                                                            >{val}</span>
                                                        </td>
                                                    );
                                                }
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{
                                                            ...badgePill, ...responseStyle(val),
                                                            textTransform: "none",
                                                            fontWeight: 600,
                                                            fontSize: "11px",
                                                            letterSpacing: 0,
                                                        }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── SOURCE ──
                                            if (col.key === "source") {
                                                const srcColors: Record<string, React.CSSProperties> = {
                                                    google: { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" },
                                                    facebook: { background: "#eff6ff", color: "#1d4ed8", border: "1.5px solid #93c5fd" },
                                                    ivr: { background: "#fdf4ff", color: "#7e22ce", border: "1.5px solid #d8b4fe" },
                                                    website: { background: "#f0fdf4", color: "#15803d", border: "1.5px solid #86efac" },
                                                    walk_in: { background: "#fff7ed", color: "#c2410c", border: "1.5px solid #fdba74" },
                                                };
                                                const sc = srcColors[val.toLowerCase()] || {
                                                    background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0"
                                                };
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{ ...badgePill, ...sc }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── CAMPAIGN NAME ──
                                            if (col.key === "campaignName") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span
                                                            title={val !== "—" && val.length > 20 ? val : undefined}
                                                            style={{
                                                                display: "block",
                                                                maxWidth: `${col.minW - 12}px`,
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                margin: "0 auto",
                                                                cursor: val.length > 20 ? "help" : "default",
                                                                color: "#0f766e",
                                                                fontWeight: 600,
                                                                fontSize: "11px",
                                                            }}
                                                        >{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── CAMPAIGN ID ──
                                            if (col.key === "campaignId") {
                                                return (
                                                    <td key={col.key} style={tdBase}>
                                                        <span style={{
                                                            fontFamily: "monospace",
                                                            fontSize: "11px",
                                                            background: "#f0fdf4",
                                                            color: "#065f46",
                                                            padding: "2px 7px",
                                                            borderRadius: "5px",
                                                            border: "1px solid #bbf7d0",
                                                            letterSpacing: "0.3px",
                                                        }}>{val}</span>
                                                    </td>
                                                );
                                            }

                                            // ── S.NO ──
                                            if (col.key === "srNo") {
                                                return (
                                                    <td key={col.key} style={{ ...tdBase, fontWeight: 700, color: "#6b7280" }}>
                                                        {showStart + idx}
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
                    background: "#f0fdf9",
                    borderTop: "1px solid #d1fae5",
                    flexShrink: 0,
                }}>
                    <div className="ks-footer-inner">

                        {/* Showing X–Y of Z */}
                        <span style={{ fontSize: isMobile ? "11px" : "13px", color: "#374151", whiteSpace: "nowrap" }}>
                            Showing{" "}
                            <strong style={{
                                background: "#fff", border: "1px solid #d1fae5",
                                borderRadius: "6px", padding: "1px 7px",
                                fontSize: isMobile ? "11px" : "13px", color: "#065f46",
                            }}>
                                {showStart}–{showEnd}
                            </strong>
                            {" "}of{" "}
                            <strong style={{ color: "#0d9488" }}>{totalRows}</strong> sent leads
                        </span>

                        {/* Page navigation */}
                        <div className="ks-pg-row">
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
                        <div className="ks-rpp-go">
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Rows/page</span>
                                <select
                                    value={rpp}
                                    onChange={(e) => { setRpp(Number(e.target.value)); setPage(1); }}
                                    style={{
                                        border: "1px solid #d1fae5", borderRadius: "7px",
                                        padding: "3px 6px", fontSize: "11px",
                                        background: "#fff", color: "#065f46",
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
                                        width: "46px", border: "1px solid #d1fae5",
                                        borderRadius: "7px", padding: "3px 6px",
                                        fontSize: "11px", textAlign: "center",
                                        outline: "none", color: "#065f46",
                                    }}
                                />
                                <button
                                    onClick={goTo}
                                    style={{
                                        background: ACCENT_GRADIENT,
                                        color: "#fff", border: "none", borderRadius: "7px",
                                        padding: "4px 12px", fontSize: "11px",
                                        fontWeight: 700, cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        boxShadow: "0 1px 4px rgba(13,148,136,0.3)",
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