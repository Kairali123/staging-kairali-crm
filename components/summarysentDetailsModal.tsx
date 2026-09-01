"use client";

import React, { useState, useEffect, useCallback } from "react";

import { LeadRow, ModalMeta } from "@/hooks/voicecall/useVoiceSummary";

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: ModalMeta | null;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const ROWS_OPTIONS = [5, 10, 25, 50, 100];

const TABLE_COLUMNS = [
  { key: "S.No", label: "S.No", minW: 60 },
  { key: "Timestamp", label: "Timestamp", minW: 160 },
  { key: "Enquiry ID", label: "Enquiry ID", minW: 140 },
  { key: "Name Of Client", label: "Name Of Client", minW: 180 },
  { key: "Mobile", label: "Mobile", minW: 130 },
  { key: "Email ID", label: "Email ID", minW: 180 },
  { key: "Subjects", label: "Subjects", minW: 160 },
  { key: "Notes", label: "Notes", minW: 200 },
  { key: "IVR Url", label: "IVR Url", minW: 120 },
  { key: "Website Name", label: "Website Name", minW: 140 },
  { key: "Data Source", label: "Data Source", minW: 120 },
  { key: "Source", label: "Source", minW: 120 },
  { key: "Company", label: "Company", minW: 140 },
  { key: "Campign ID", label: "Campign ID", minW: 140 },
  { key: "Assign To", label: "Assign To", minW: 140 },
  { key: "Lead Intent", label: "Lead Intent", minW: 120 },
  { key: "Urgency", label: "Urgency", minW: 100 },
];


const LONG_COLS = new Set<string>([
  "Email", "Order/Booking ID", "Name of Client", "Sales Person Name", "Data Source", "remarks"
]);
// ─────────────────────────────────────────────────────────────────
// STYLE HELPERS
// ─────────────────────────────────────────────────────────────────
function priorityStyle(p: string): React.CSSProperties {
  switch (p?.toLowerCase()) {
    case "high": return { background: "#fee2e2", color: "#b91c1c" };
    case "medium": return { background: "#fef3c7", color: "#92400e" };
    case "low": return { background: "#d1fae5", color: "#065f46" };
    default: return { background: "#f1f5f9", color: "#475569" };
  }
}

function urgencyStyle(u: string): React.CSSProperties {
  switch (u?.toLowerCase()) {
    case "high":
      return { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" };
    case "medium":
      return { background: "#fffbeb", color: "#d97706", border: "1.5px solid #fcd34d" };
    case "low":
      return { background: "#f0fdf4", color: "#16a34a", border: "1.5px solid #86efac" };
    case "no":
    case "none":
      return { background: "#f8fafc", color: "#64748b", border: "1.5px solid #cbd5e1" };
    default:
      return { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" };
  }
}

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

const badgePill: React.CSSProperties = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: "20px",
  fontSize: "10px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const tdBase: React.CSSProperties = {
  padding: "9px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  color: "#4a5568",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "12px",
};

// ─────────────────────────────────────────────────────────────────
// CLOSE BUTTON — highlighted, animated
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
        flexShrink: 0,
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        border: hovered ? "2px solid #fff" : "2px solid rgba(255,255,255,0.5)",
        background: hovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.12)",
        color: "#fff",
        fontSize: "20px",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.18s ease",
        boxShadow: hovered ? "0 0 0 4px rgba(255,255,255,0.18)" : "none",
        transform: hovered ? "rotate(90deg) scale(1.1)" : "rotate(0deg) scale(1)",
        fontWeight: 300,
      }}
    >
      ✕
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// NAV BUTTON
// ─────────────────────────────────────────────────────────────────
function NavBtn({
  label, active, disabled, onClick,
}: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: "30px",
        padding: "0 10px",
        borderRadius: "7px",
        border: active ? "none" : "1px solid #d1d5db",
        background: active
          ? "linear-gradient(135deg,#667eea,#764ba2)"
          : disabled ? "#f9fafb" : "#fff",
        color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
        fontSize: "11px",
        fontWeight: active ? 700 : 500,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// useWindowSize hook
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
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────
export default function LeadDetailModal({ isOpen, onClose, meta }: LeadDetailModalProps) {
  const [page, setPage] = useState(1);
  const [rpp, setRpp] = useState(10);
  const [goVal, setGoVal] = useState("");
  const [visible, setVisible] = useState(false);
  const { w } = useWindowSize();

  // Breakpoints
  const isMobile = w < 640;
  const isTablet = w >= 640 && w < 1024;
  const isDesktop = w >= 1024;

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else setVisible(false);
  }, [isOpen]);

  useEffect(() => { setPage(1); setGoVal(""); }, [meta]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
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

  // ── Responsive dimensions ──
  const modalWidth = isMobile ? "98vw" : isTablet ? "96vw" : "84vw";
  const modalHeight = isMobile ? "95dvh" : isTablet ? "92dvh" : "88dvh";
  const maxWidth = isDesktop ? "1440px" : "100%";
  const headerPad = isMobile ? "12px 14px" : "16px 26px";
  const metaBarPad = isMobile ? "8px 12px" : "11px 22px";
  const footerPad = isMobile ? "8px 10px" : "10px 20px";
  const headerSize = isMobile ? "15px" : "19px";

  return (
    <>
      {/* ── GLOBAL RESPONSIVE STYLES ── */}
      <style>{`
        .ldm-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          width: 100%;
        }
        .ldm-pg-row {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .ldm-rpp-go {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ldm-meta-card {
          flex: 0 0 auto;
          min-width: 100px;
          box-sizing: border-box;
        }
        .ldm-meta-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 639px) {
          .ldm-footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }
          .ldm-pg-row {
            width: 100%;
            justify-content: center;
          }
          .ldm-rpp-go {
            width: 100%;
            justify-content: space-between;
          }
          .ldm-hide-mobile { display: none !important; }
        }
        @media (max-width: 1023px) {
          .ldm-hide-tablet { display: none !important; }
        }
      `}</style>

      {/* ── BACKDROP ── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(15,23,42,0.68)",
          backdropFilter: "blur(5px)",
          WebkitBackdropFilter: "blur(5px)",
          zIndex: 1040,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* ── MODAL ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lead Detail Report"
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
          borderRadius: isMobile ? "12px" : "16px",
          boxShadow: "0 32px 96px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.05)",
          zIndex: 1050,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >

        {/* ── HEADER ── */}
        <div style={{
          background: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)",
          padding: headerPad,
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "12px",
          flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0, color: "rgba(255,255,255,0.72)",
              fontSize: isMobile ? "9px" : "10px",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px",
            }}>
              Detailed Lead Report
            </p>
            <h2 style={{
              margin: "3px 0 0", color: "#fff",
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
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "64px",
        }}>
          {/* CENTERED CLUSTER */}
          <div className="ldm-meta-bar" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {metaParts.map((p) => (
              <div key={p.label} className="ldm-meta-card" style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: "8px", padding: "4px 12px",
                display: "flex", flexDirection: "column",
                alignItems: "center", textAlign: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {p.label}
                </span>
                <span style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: 700, color: "#1e293b", marginTop: "1px" }}>
                  {p.value}
                </span>
              </div>
            ))}
          </div>

          {/* RIGHT-ALIGNED BADGE */}
          <div style={{ position: "absolute", right: isMobile ? "12px" : "24px", flexShrink: 0 }}>
            <span style={{
              background: "linear-gradient(135deg,#667eea,#764ba2)",
              color: "#fff", borderRadius: "20px", padding: "4px 14px",
              fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
            }}>
              {totalRows} Leads
            </span>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th key={col.key} style={{
                    background: "linear-gradient(135deg,#2d3748 0%,#1a202c 100%)",
                    color: "#fff", padding: "11px 8px",
                    textAlign: "center", fontWeight: 700,
                    fontSize: "10px", textTransform: "uppercase",
                    letterSpacing: "0.5px", whiteSpace: "nowrap",
                    position: "sticky", top: 0, zIndex: 5,
                    minWidth: col.minW,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meta.isSyncing && leads.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} style={{
                    textAlign: "center", padding: "80px 20px",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTopColor: "#667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <p style={{ color: "#475569", fontSize: "14px", fontWeight: 600 }}>Syncing full lead details...</p>
                      <p style={{ color: "#94a3b8", fontSize: "12px" }}>This usually takes a few seconds.</p>
                      <style>{`
                            @keyframes spin { to { transform: rotate(360deg); } }
                        `}</style>
                    </div>
                  </td>
                </tr>
              ) : sliced.length === 0 ? (
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
                    key={idx}
                    style={{ background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}
                  >
                    {TABLE_COLUMNS.map((col) => {
                      const raw = row[col.key];
                      const val = raw !== undefined && raw !== null && String(raw).trim() !== ""
                        ? String(raw) : "—";

                      if (col.key === "IVR Url" && val !== "—") {
                        return (
                          <td key={col.key} style={tdBase}>
                            <a href={val} target="_blank" rel="noreferrer" style={{
                              background: "#0ea5e9", color: "#fff",
                              padding: "3px 12px", borderRadius: "6px",
                              fontSize: "10px", fontWeight: 700, textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}>
                              Listen
                            </a>
                          </td>
                        );
                      }

                      if (col.key === "Lead Intent" || col.key === "Customer Intent" || col.key === "Interest Level") {
                        return (
                          <td key={col.key} style={tdBase}>
                            <span style={{ ...badgePill, ...priorityStyle(val) }}>{val}</span>
                          </td>
                        );
                      }

                      if (col.key === "urgency" || col.key === "Urgency") {
                        return (
                          <td key={col.key} style={tdBase}>
                            <span style={{ ...badgePill, ...urgencyStyle(val) }}>{val}</span>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} style={tdBase}>
                          <span
                            title={val !== "—" && val.length > (LONG_COLS.has(col.key) ? 20 : 24) ? val : undefined}
                            style={{
                              display: "block",
                              maxWidth: `${col.minW - 12}px`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              margin: "0 auto",
                              cursor: val.length > 24 ? "help" : "default",
                            }}
                          >
                            {val}
                          </span>
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
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          flexShrink: 0,
        }}>
          <div className="ldm-footer-inner">

            {/* Showing X–Y of Z */}
            <span style={{ fontSize: isMobile ? "11px" : "13px", color: "#374151", whiteSpace: "nowrap" }}>
              Showing{" "}
              <strong style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: "6px", padding: "1px 7px",
                fontSize: isMobile ? "11px" : "13px",
              }}>
                {showStart}–{showEnd}
              </strong>
              {" "}of{" "}
              <strong style={{ color: "#667eea" }}>{totalRows}</strong> leads
            </span>

            {/* Page navigation */}
            <div className="ldm-pg-row">
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
            <div className="ldm-rpp-go">
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Rows/page</span>
                <select
                  value={rpp}
                  onChange={(e) => { setRpp(Number(e.target.value)); setPage(1); }}
                  style={{
                    border: "1px solid #d1d5db", borderRadius: "7px",
                    padding: "3px 6px", fontSize: "11px",
                    background: "#fff", color: "#374151",
                    cursor: "pointer", outline: "none",
                  }}
                >
                  {ROWS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Go to</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={goVal}
                  onChange={(e) => setGoVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && goTo()}
                  placeholder="#"
                  style={{
                    width: "46px",
                    border: "1px solid #d1d5db", borderRadius: "7px",
                    padding: "3px 6px", fontSize: "11px",
                    textAlign: "center", outline: "none", color: "#374151",
                  }}
                />
                <button
                  onClick={goTo}
                  style={{
                    background: "linear-gradient(135deg,#667eea,#764ba2)",
                    color: "#fff", border: "none", borderRadius: "7px",
                    padding: "4px 12px", fontSize: "11px",
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  Go
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
