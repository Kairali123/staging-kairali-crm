"use client";

import React, { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
export interface WastedRow {
  srNo: number;
  dateTime: string;  // date_and_time
  leadId: string;  // id
  clientName: string;  // name_of_client
  mobile: string;  // mobile
  email: string;  // email
  priority: string;  // priority
  urgency: string;  // urgency
  dataSource: string;  // data_source
  source: string;  // verified_source
  disposition: string;  // disposition
  leadOutcome: string;  // lead_outcome
  leadCategory: string;  // lead_category
  summary: string;  // summary_of_conversation
  agent: string;  // doer
  company: string;  // company
  cancellationRemarks: string; // cancellation_remarks
  lostValue: number; // lost_value
}

export interface WastedModalMeta {
  type: string;
  leads: WastedRow[];
  loading?: boolean;
}

interface WastedDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: WastedModalMeta | null;
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const ROWS_OPTIONS = [5, 10, 25, 50, 100];

const TABLE_COLUMNS = [
  { key: "srNo", label: "S.No", minW: 60 },
  { key: "dateTime", label: "Date & Time", minW: 160 },
  { key: "leadId", label: "Lead ID", minW: 160 },
  { key: "clientName", label: "Name", minW: 180 },
  { key: "mobile", label: "Mobile", minW: 140 },
  { key: "email", label: "Email", minW: 180 },
  { key: "priority", label: "Priority", minW: 100 },
  { key: "urgency", label: "Urgency", minW: 100 },
  { key: "dataSource", label: "Data Source", minW: 140 },
  { key: "source", label: "Source", minW: 140 },
  { key: "disposition", label: "Disposition", minW: 130 },
  { key: "leadOutcome", label: "Lead Outcome", minW: 200 },
  { key: "leadCategory", label: "Lead Category", minW: 140 },
  { key: "summary", label: "Summary", minW: 260 },
  { key: "agent", label: "Agent", minW: 150 },
  { key: "cancellationRemarks", label: "Cancellation Remarks", minW: 260 },
  { key: "lostValue", label: "Lost Value", minW: 120 },
  { key: "company", label: "Company", minW: 120 },
];

const LONG_COLS = new Set<string>([
  "summary", "leadOutcome", "leadId", "email", "clientName", "cancellationRemarks",
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
    case "yes":
    case "high": return { background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fca5a5" };
    case "no":
    case "none": return { background: "#f8fafc", color: "#64748b", border: "1.5px solid #cbd5e1" };
    default: return { background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0" };
  }
}

function dispositionStyle(d: string): React.CSSProperties {
  switch (d?.toLowerCase()) {
    case "cold": return { background: "#dbeafe", color: "#1e40af" };
    case "duplicate": return { background: "#f3e8ff", color: "#6b21a8" };
    case "junk": return { background: "#fef3c7", color: "#92400e" };
    case "wrong": return { background: "#fee2e2", color: "#991b1b" };
    default: return { background: "#f1f5f9", color: "#475569" };
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
  display: "inline-block", padding: "3px 10px", borderRadius: "20px",
  fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px",
};

const tdBase: React.CSSProperties = {
  padding: "9px 8px", textAlign: "center", verticalAlign: "middle",
  color: "#4a5568", borderBottom: "1px solid #e2e8f0", fontSize: "12px",
};

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
// MAIN MODAL
// ─────────────────────────────────────────────────────────────────
export default function WastedDetailModal({ isOpen, onClose, meta }: WastedDetailModalProps) {
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

  const modalWidth = isMobile ? "98vw" : isTablet ? "96vw" : "92vw";
  const modalHeight = isMobile ? "95dvh" : isTablet ? "92dvh" : "88dvh";
  const maxWidth = isDesktop ? "1700px" : "100%";
  const headerPad = isMobile ? "12px 14px" : "16px 26px";
  const metaBarPad = isMobile ? "8px 12px" : "11px 22px";
  const footerPad = isMobile ? "8px 10px" : "10px 20px";
  const headerSize = isMobile ? "15px" : "19px";

  return (
    <>
      <style>{`
        .wdm-footer   { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; width:100%; }
        .wdm-pg-row   { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        .wdm-rpp-go   { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .wdm-meta-bar { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        @media (max-width:639px) {
          .wdm-footer { flex-direction:column; align-items:flex-start; }
          .wdm-pg-row { width:100%; justify-content:center; }
          .wdm-rpp-go { width:100%; justify-content:space-between; }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(15,23,42,0.68)",
        backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)",
        zIndex: 1040, opacity: visible ? 1 : 0, transition: "opacity 0.25s ease",
      }} />

      {/* Modal */}
      <div role="dialog" aria-modal="true" aria-label="Wasted Leads Report" style={{
        position: "fixed", top: "50%", left: "50%",
        transform: visible
          ? "translate(-50%,-50%) scale(1)"
          : "translate(-50%,-47%) scale(0.96)",
        width: modalWidth, maxWidth,
        height: modalHeight, maxHeight: "98dvh",
        background: "#fff",
        borderRadius: isMobile ? "12px" : "16px",
        boxShadow: "0 32px 96px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.05)",
        zIndex: 1050, display: "flex", flexDirection: "column", overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1)",
      }}>

        {/* ── HEADER — red theme ── */}
        <div style={{
          background: "linear-gradient(135deg,#dc2626 0%,#7f1d1d 100%)",
          padding: headerPad, display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "12px", flexShrink: 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0, color: "rgba(255,255,255,0.72)",
              fontSize: isMobile ? "9px" : "10px",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px",
            }}>
              Wasted Leads Report
            </p>
            <h2 style={{
              margin: "3px 0 0", color: "#fff",
              fontSize: headerSize, fontWeight: 700,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {metaParts.map((p) => p.value).join(" · ")}
            </h2>
          </div>
          <button onClick={onClose} style={{
            flexShrink: 0, width: "36px", height: "36px", borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.12)",
            color: "#fff", fontSize: "20px", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.18s ease", fontWeight: 300,
          }}>✕</button>
        </div>

        {/* ── META CARDS BAR ── */}
        <div style={{
          padding: metaBarPad, background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0", flexShrink: 0, overflowX: "auto",
        }}>
          <div className="wdm-meta-bar">
            {metaParts.map((p) => (
              <div key={p.label} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: "8px", padding: "4px 12px",
                display: "flex", flexDirection: "column", flexShrink: 0,
              }}>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {p.label}
                </span>
                <span style={{ fontSize: isMobile ? "12px" : "14px", fontWeight: 700, color: "#1e293b", marginTop: "1px" }}>
                  {p.value}
                </span>
              </div>
            ))}
            <div style={{ marginLeft: "auto", flexShrink: 0 }}>
              <span style={{
                background: "linear-gradient(135deg,#dc2626,#7f1d1d)",
                color: "#fff", borderRadius: "20px", padding: "4px 14px",
                fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap",
              }}>
                {totalRows} Wasted Leads
              </span>
            </div>
          </div>
        </div>

        {/* ── CONTENT BODY ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}>
          {meta.loading ? (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "16px",
              padding: "60px 20px", background: "#fff",
            }}>
              <div style={{
                width: "48px", height: "48px", border: "3px solid #f1f5f9",
                borderTop: "3px solid #dc2626", borderRadius: "50%",
                animation: "wdm-spin 1s linear infinite"
              }} />
              <style>{`
                @keyframes wdm-spin { to { transform: rotate(360deg); } }
              `}</style>
              <p style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>
                Fetching latest lead details...
              </p>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr>
                      {TABLE_COLUMNS.map((col) => (
                        <th key={col.key} style={{
                          background: "linear-gradient(135deg,#7f1d1d 0%,#450a0a 100%)",
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
                    {sliced.length === 0 ? (
                      <tr>
                        <td colSpan={TABLE_COLUMNS.length} style={{
                          textAlign: "center", padding: "60px 20px",
                          color: "#94a3b8", fontSize: "14px",
                        }}>
                          No wasted leads found
                        </td>
                      </tr>
                    ) : (
                      sliced.map((row, idx) => (
                        <tr key={row.leadId + idx}
                          style={{ background: idx % 2 === 0 ? "#fff" : "#fff5f5" }}>
                          {TABLE_COLUMNS.map((col) => {
                            const raw = (row as any)[col.key];
                            const val = raw !== undefined && raw !== null && String(raw).trim() !== ""
                              ? String(raw) : "—";

                            if (col.key === "priority") return (
                              <td key={col.key} style={tdBase}>
                                <span style={{ ...badgePill, ...priorityStyle(val) }}>{val}</span>
                              </td>
                            );

                            if (col.key === "urgency") return (
                              <td key={col.key} style={tdBase}>
                                <span style={{ ...badgePill, ...urgencyStyle(val) }}>{val}</span>
                              </td>
                            );

                            if (col.key === "lostValue") return (
                              <td key={col.key} style={tdBase}>
                                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                                  ₹{Math.floor(Number(val) || 0).toLocaleString("en-IN")}
                                </span>
                              </td>
                            );

                            if (col.key === "disposition") return (
                              <td key={col.key} style={tdBase}>
                                <span style={{ ...badgePill, ...dispositionStyle(val) }}>{val}</span>
                              </td>
                            );

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
                padding: footerPad, background: "#f8fafc",
                borderTop: "1px solid #e2e8f0", flexShrink: 0,
              }}>
                <div className="wdm-footer">

                  <span style={{ fontSize: isMobile ? "11px" : "13px", color: "#374151", whiteSpace: "nowrap" }}>
                    Showing{" "}
                    <strong style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "1px 7px" }}>
                      {showStart}–{showEnd}
                    </strong>
                    {" "}of{" "}
                    <strong style={{ color: "#dc2626" }}>{totalRows}</strong> leads
                  </span>

                  <div className="wdm-pg-row">
                    <button onClick={() => setPage(1)} disabled={safePage === 1} style={navBtn(false, safePage === 1)}>«</button>
                    <button onClick={() => setPage(p => p - 1)} disabled={safePage === 1} style={navBtn(false, safePage === 1)}>‹ Prev</button>
                    {!isMobile && getPageRange(safePage, totalPages).map((p, i) =>
                      p === "..." ? (
                        <span key={`dot${i}`} style={{ padding: "0 3px", color: "#9ca3af", fontSize: "11px" }}>…</span>
                      ) : (
                        <button key={p} onClick={() => setPage(Number(p))} style={navBtn(p === safePage, false)}>{p}</button>
                      )
                    )}
                    {isMobile && (
                      <span style={{ fontSize: "11px", color: "#374151", padding: "0 6px", fontWeight: 600 }}>
                        {safePage} / {totalPages}
                      </span>
                    )}
                    <button onClick={() => setPage(p => p + 1)} disabled={safePage === totalPages} style={navBtn(false, safePage === totalPages)}>Next ›</button>
                    <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} style={navBtn(false, safePage === totalPages)}>»</button>
                  </div>

                  <div className="wdm-rpp-go">
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Rows/page</span>
                      <select value={rpp} onChange={(e) => { setRpp(Number(e.target.value)); setPage(1); }}
                        style={{ border: "1px solid #d1d5db", borderRadius: "7px", padding: "3px 6px", fontSize: "11px", background: "#fff", color: "#374151", cursor: "pointer", outline: "none" }}>
                        {ROWS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>Go to</span>
                      <input type="number" min={1} max={totalPages} value={goVal}
                        onChange={(e) => setGoVal(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && goTo()}
                        placeholder="#"
                        style={{ width: "46px", border: "1px solid #d1d5db", borderRadius: "7px", padding: "3px 6px", fontSize: "11px", textAlign: "center", outline: "none", color: "#374151" }}
                      />
                      <button onClick={goTo} style={{
                        background: "linear-gradient(135deg,#dc2626,#7f1d1d)",
                        color: "#fff", border: "none", borderRadius: "7px",
                        padding: "4px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer",
                      }}>Go</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// NAV BUTTON STYLE HELPER
// ─────────────────────────────────────────────────────────────────
function navBtn(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    height: "30px", padding: "0 10px", borderRadius: "7px",
    border: active ? "none" : "1px solid #d1d5db",
    background: active ? "linear-gradient(135deg,#dc2626,#7f1d1d)" : disabled ? "#f9fafb" : "#fff",
    color: active ? "#fff" : disabled ? "#d1d5db" : "#374151",
    fontSize: "11px", fontWeight: active ? 700 : 500,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap" as const,
  };
}