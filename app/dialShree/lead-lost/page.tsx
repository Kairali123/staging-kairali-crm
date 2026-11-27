"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DecidingLog {
    call_start_time: string;
    call_end_time: string;
    duration_sec: number;
    call_status: string;
    outcome: string;
    followup_status: string;
    classification: string;
    ivr_url: string;
    transcription_view_url: string;
}

interface ReconciledLead {
    id: string;
    sentTaskId: string;
    name_of_client: string;
    mobile: string;
    email_id: string;
    subjects: string;
    company: string;
    data_source: string;
    campaign_name: string;
    sent_date: string;
    dayKey: string;
    status: "FOUND" | "LOST";
    reason: string;
    // Only meaningful when status === "LOST": which side of the 72-hour
    // threshold this unresolved lead falls on. A subset flag, not a
    // separate bucket — see Totals.criticalLost.
    retryStage?: "RETRY_PENDING" | "CRITICAL_LOST" | null;
    callCount: number;
    daysPending: number;
    deciding: DecidingLog | null;
}

interface DailySummaryRow {
    dayKey: string;
    sent: number;
    found: number;
    lost: number;
    noLog: number;
    notFinal: number;
    retryPending: number;
    criticalLost: number;
}

interface Totals {
    sent: number;
    found: number;
    lost: number;
    noLog: number;
    notFinal: number;
    retryPending: number;
    criticalLost: number;
}

interface CallLogItem {
    id: number;
    lead_id: string;
    initial_id: string;
    client_name: string;
    mobile: string;
    call_start_time: string;
    call_end_time: string;
    duration_sec: number;
    call_status: string;
    call_type: string;
    call_end_reason: string;
    final_call_status: string;
    outcome: string;
    followup_status: string;
    followup_required: string;
    followup_time: string;
    ivr_url: string;
    transcription_view_url: string;
    remarks?: string;
    doer?: string;
    classification: "Completed" | "Pending";
    timestamp: string;
}

// ─── Months Generator ─────────────────────────────────────────────────────────

function getAvailableMonths() {
    const list: { label: string; value: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        list.push({ label, value: `${y}-${m}` });
    }
    return list;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-10T16:47:30" -> "10-Nov-2026 16:47:30" (same DD-Mon-YYYY style as the Sent Date). */
function fmtDateTime(v?: string | null): string {
    if (!v) return "—";
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return String(v);
    return `${m[3]}-${MONTHS_SHORT[Number(m[2]) - 1]}-${m[1]} ${m[4]}:${m[5]}:${m[6] ?? "00"}`;
}

function fmtPct(num: number, den: number): string {
    if (!den || den === 0 || !num || num === 0) return "0%";
    const pct = (num / den) * 100;
    return pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`;
}

function Th({ children, style, colSpan, rowSpan }: { children: React.ReactNode; style?: React.CSSProperties; colSpan?: number; rowSpan?: number }) {
    return (
        <th
            colSpan={colSpan}
            rowSpan={rowSpan}
            style={{
                padding: "10px 12px",
                fontSize: 10.5,
                fontWeight: 700,
                color: "rgba(255,255,255,.9)",
                textTransform: "uppercase",
                letterSpacing: ".6px",
                whiteSpace: "nowrap",
                textAlign: "left",
                borderRight: "1px solid rgba(255,255,255,.08)",
                ...style
            }}
        >
            {children}
        </th>
    );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <td style={{
            padding: "9px 12px",
            fontSize: 12,
            color: "#374151",
            borderRight: "1px solid #f1f5f9",
            whiteSpace: "nowrap",
            verticalAlign: "middle",
            ...style
        }}>
            {children}
        </td>
    );
}

function KPICard({ label, value, icon, bg, color, sub, highlight, solidBg }: {
    label: string; value: number | string; icon: string; bg: string; color: string; sub?: string; highlight?: boolean; solidBg?: string;
}) {
    const cardBg = highlight ? (solidBg || color) : bg;
    return (
        <div style={{
            background: cardBg,
            border: `1.5px solid ${highlight ? "rgba(0,0,0,0.06)" : color + "33"}`,
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flex: 1,
            minWidth: 160,
            boxShadow: highlight ? `0 4px 18px ${color}40` : "0 2px 8px rgba(0,0,0,0.03)"
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: highlight ? "rgba(255,255,255,.9)" : color, textTransform: "uppercase", letterSpacing: ".8px" }}>
                    {label}
                </div>
                <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: highlight ? "#fff" : "#111827", lineHeight: 1.1, marginTop: 4 }}>
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,.9)" : color, fontWeight: 600, marginTop: 4 }}>
                    {sub}
                </div>
            )}
        </div>
    );
}

function Pagination({ total, page, perPage, onPage, onPerPage }: {
    total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);
    const [goInput, setGoInput] = useState("");
    const handleGo = () => {
        const n = parseInt(goInput);
        if (!isNaN(n) && n >= 1 && n <= totalPages) {
            onPage(n);
            setGoInput("");
        }
    };

    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }

    const btn = (label: React.ReactNode, onClick: () => void, disabled: boolean, active = false, key?: string) => (
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
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff",
                color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151"
            }}
        >
            {label}
        </button>
    );

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            padding: "10px 16px",
            borderTop: "1px solid #f1f5f9",
            background: "#fafbfe"
        }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>
                Showing <strong style={{ color: "#1e2a4a" }}>{from}–{to}</strong> of <strong style={{ color: "#1e2a4a" }}>{total}</strong> leads
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {btn("«", () => onPage(1), page === 1, false, "first")}
                {btn("‹", () => onPage(page - 1), page === 1, false, "prev")}
                {pages.map((p, i) => p === "…" ? (
                    <span key={`e${i}`} style={{ fontSize: 12, color: "#94a3b8", padding: "0 4px" }}>…</span>
                ) : (
                    btn(p, () => onPage(p as number), false, p === page, `p${p}`)
                ))}
                {btn("›", () => onPage(page + 1), page === totalPages, false, "next")}
                {btn("»", () => onPage(totalPages), page === totalPages, false, "last")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                <span>Rows:</span>
                <select
                    value={perPage}
                    onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }}
                    style={{ height: 28, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, background: "#fff" }}
                >
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <input
                    type="number"
                    value={goInput}
                    onChange={e => setGoInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGo()}
                    placeholder="Go"
                    style={{ height: 28, width: 48, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, textAlign: "center" }}
                />
                <button
                    onClick={handleGo}
                    style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                    Go
                </button>
            </div>
        </div>
    );
}

// ─── Call Logs Modal ──────────────────────────────────────────────────────────

function CallLogsModal({
    lead,
    onClose
}: {
    lead: ReconciledLead;
    onClose: () => void;
}) {
    const [logs, setLogs] = useState<CallLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetch(`/api/dialshree/lead-lost?view=lead_logs&enquiryId=${encodeURIComponent(lead.id)}&mode=an`)
            .then(r => r.json())
            .then(data => {
                if (active) {
                    setLogs(data.logs || []);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (active) {
                    setError(err.message);
                    setLoading(false);
                }
            });
        return () => { active = false; };
    }, [lead]);

    return (
        <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
        }} onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "#fff",
                    borderRadius: 16,
                    width: 1050,
                    maxWidth: "96vw",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    overflow: "hidden"
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "18px 24px",
                    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                            <span>📞 Call Logs History</span>
                            <span style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 12,
                                background: lead.status === "FOUND" ? "#059669" : lead.retryStage === "CRITICAL_LOST" ? "#dc2626" : "#d97706",
                                color: "#fff"
                            }}>
                                {lead.status === "FOUND"
                                    ? "RECEIVED"
                                    : lead.retryStage === "CRITICAL_LOST" ? "CRITICAL LOST" : "RETRY PENDING"}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                            Lead ID: <strong style={{ color: "#fff" }}>{lead.id}</strong> | Client: {lead.name_of_client || "Unknown"} ({lead.mobile})
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.15)",
                            border: "none",
                            color: "#fff",
                            fontSize: 18,
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            cursor: "pointer"
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
                    {loading && (
                        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                border: "3px solid #e2e8f0",
                                borderTopColor: "#4f46e5",
                                borderRadius: "50%",
                                animation: "spin 0.8s linear infinite",
                                margin: "0 auto 10px"
                            }} />
                            Loading received call logs...
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: 20, background: "#fef2f2", color: "#991b1b", borderRadius: 8, textAlign: "center" }}>
                            ❌ Failed to load logs: {error}
                        </div>
                    )}

                    {!loading && !error && logs.length === 0 && (
                        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>No received call logs found</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                                This lead was successfully sent to DialShree but no call records have been logged back yet
                                ({lead.retryStage === "CRITICAL_LOST" ? "CRITICAL LOST — unresolved 72h+" : "RETRY PENDING"}).
                            </div>
                        </div>
                    )}

                    {!loading && !error && logs.length > 0 && (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#1e293b" }}>
                                        <Th>#</Th>
                                        <Th>Call Start</Th>
                                        <Th>Duration</Th>
                                        <Th>Call Status</Th>
                                        <Th>Call Type</Th>
                                        <Th>Call End Reason</Th>
                                        <Th>Outcome</Th>
                                        <Th>Deciding Log?</Th>
                                        <Th>Doer</Th>
                                        <Th>Remarks</Th>
                                        <Th>Recording / Transcript</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, idx) => {
                                        const isDeciding = !!lead.deciding && lead.deciding.call_start_time === log.call_start_time && lead.deciding.outcome === log.outcome;
                                        return (
                                            <tr
                                                key={log.id || idx}
                                                style={{
                                                    background: isDeciding ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#f8fafc",
                                                    borderLeft: isDeciding ? "4px solid #16a34a" : "none"
                                                }}
                                            >
                                                <Td style={{ fontWeight: 600, color: "#94a3b8" }}>{idx + 1}</Td>
                                                <Td style={{ fontWeight: 600 }}>{fmtDateTime(log.call_start_time || log.timestamp)}</Td>
                                                <Td>{log.duration_sec ? `${log.duration_sec}s` : "0s"}</Td>
                                                <Td>
                                                    <span style={{
                                                        padding: "2px 8px",
                                                        borderRadius: 12,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: log.call_status.toLowerCase() === "completed" ? "#dcfce7" : "#f1f5f9",
                                                        color: log.call_status.toLowerCase() === "completed" ? "#166534" : "#475569"
                                                    }}>
                                                        {log.call_status || "—"}
                                                    </span>
                                                </Td>
                                                <Td>{log.call_type || "—"}</Td>
                                                <Td>{log.call_end_reason || "—"}</Td>
                                                <Td style={{ fontWeight: 600 }}>{log.outcome || "—"}</Td>
                                                <Td>
                                                    {isDeciding ? (
                                                        <span style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: 4,
                                                            padding: "3px 9px",
                                                            borderRadius: 12,
                                                            fontSize: 11,
                                                            fontWeight: 800,
                                                            background: "#16a34a",
                                                            color: "#fff"
                                                        }}>
                                                            ⭐ DECIDING
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                </Td>
                                                <Td style={{ fontWeight: 600 }}>{log.doer || <span style={{ color: "#94a3b8" }}>—</span>}</Td>
                                                <Td style={{ whiteSpace: "normal", minWidth: 220, maxWidth: 360, fontSize: 11.5 }}>
                                                    {log.remarks ? log.remarks : <span style={{ color: "#94a3b8" }}>—</span>}
                                                </Td>
                                                <Td>
                                                    <div style={{ display: "flex", gap: 6 }}>
                                                        {log.ivr_url && (
                                                            <a
                                                                href={log.ivr_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#2563eb",
                                                                    textDecoration: "none",
                                                                    padding: "2px 6px",
                                                                    background: "#eff6ff",
                                                                    borderRadius: 4,
                                                                    border: "1px solid #bfdbfe"
                                                                }}
                                                            >
                                                                🎵 Audio
                                                            </a>
                                                        )}
                                                        {log.transcription_view_url && (
                                                            <a
                                                                href={log.transcription_view_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "#4f46e5",
                                                                    textDecoration: "none",
                                                                    padding: "2px 6px",
                                                                    background: "#eef2ff",
                                                                    borderRadius: 4,
                                                                    border: "1px solid #c7d2fe"
                                                                }}
                                                            >
                                                                📄 Transcript
                                                            </a>
                                                        )}
                                                        {!log.ivr_url && !log.transcription_view_url && (
                                                            <span style={{ color: "#94a3b8" }}>—</span>
                                                        )}
                                                    </div>
                                                </Td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: "12px 24px",
                    background: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <div style={{ fontSize: 11.5, color: "#64748b" }}>
                        Total Logs: <strong>{logs.length}</strong> | Deciding Log dictates the lead's final status.
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            color: "#334155",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer"
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DialShreeLeadLostPage() {
    // ── Scope & Filters ───────────────────────────────────────────────────────
    const availableMonths = useMemo(() => getAvailableMonths(), []);
    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0]?.value || "2026-09");
    const [dateMode, setDateMode] = useState<"month" | "custom">("month");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const [activeTab, setActiveTab] = useState<"summary" | "leads" | "retry" | "critical">("summary");

    const [selectedDay, setSelectedDay] = useState<string>("all");
    const [company, setCompany] = useState("all");
    const [disposition, setDisposition] = useState("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // ── Pagination ────────────────────────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    // ── Data & Status ─────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [windowInfo, setWindowInfo] = useState<{ label: string; startDate: string; endDate: string } | null>(null);
    const [totals, setTotals] = useState<Totals>({ sent: 0, found: 0, lost: 0, noLog: 0, notFinal: 0, retryPending: 0, criticalLost: 0 });
    const [dailySummary, setDailySummary] = useState<DailySummaryRow[]>([]);
    const [leads, setLeads] = useState<ReconciledLead[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, perPage: 25, totalPages: 1 });
    const [companies, setCompanies] = useState<string[]>([]);
    const [dispositions, setDispositions] = useState<string[]>([]);

    // ── Inspect Lead Modal ────────────────────────────────────────────────────
    const [inspectedLead, setInspectedLead] = useState<ReconciledLead | null>(null);

    // Debounce search
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(h);
    }, [search]);

    // Reset pagination on filter change. `skipFetchRef` stops the data effect below from firing
    // a second request for the old page number before the reset lands (nothing is cached server-side).
    const filterKey = [selectedMonth, dateMode, customStart, customEnd, selectedDay, company, disposition, debouncedSearch, activeTab].join("|");
    const lastFilterKeyRef = useRef(filterKey);
    const skipFetchRef = useRef(false);
    useEffect(() => {
        if (lastFilterKeyRef.current !== filterKey) {
            lastFilterKeyRef.current = filterKey;
            if (page !== 1) {
                skipFetchRef.current = true;
                setPage(1);
            }
        }
    }, [filterKey, page]);

    // Fetch Reconciliation Data
    const fetchData = useCallback(async (isRefresh = false) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.set("mode", "an");
            if (dateMode === "month") {
                params.set("month", selectedMonth);
            } else if (customStart && customEnd) {
                params.set("dateFrom", customStart);
                params.set("dateTo", customEnd);
            }

            if (isRefresh) params.set("refresh", "1");
            if (company !== "all") params.set("company", company);
            if (disposition !== "all") params.set("disposition", disposition);
            if (selectedDay !== "all") params.set("day", selectedDay);
            if (debouncedSearch) params.set("search", debouncedSearch);

            params.set("page", String(page));
            params.set("perPage", String(perPage));

            // Status tab filter
            if (activeTab === "retry") {
                params.set("status", "RETRY_PENDING");
            } else if (activeTab === "critical") {
                params.set("status", "CRITICAL_LOST");
            }

            const res = await fetch(`/api/dialshree/lead-lost?${params.toString()}`, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();

            setWindowInfo(data.window);
            setTotals(data.totals);
            setDailySummary(data.dailySummary || []);
            setLeads(data.leads || []);
            setPagination(data.pagination);
            setCompanies(data.companies || []);
            setDispositions(data.dispositions || []);
        } catch (e: any) {
            setError(e.message || "Failed to load reconciliation data");
        } finally {
            setLoading(false);
        }
    }, [dateMode, selectedMonth, customStart, customEnd, company, disposition, selectedDay, debouncedSearch, page, perPage, activeTab]);

    useEffect(() => {
        if (skipFetchRef.current) {
            skipFetchRef.current = false;
            return;
        }
        fetchData();
    }, [fetchData]);

    // Clear filters
    const handleClearFilters = () => {
        setCompany("all");
        setDisposition("all");
        setSelectedDay("all");
        setSearch("");
        setDebouncedSearch("");
    };

    const hasActiveFilters = company !== "all" || disposition !== "all" || selectedDay !== "all" || search !== "";

    // Export CSV
    const handleExportCSV = async () => {
        if (!leads.length) return;
        // `leads` is only the current page; fetch every page for the active filters.
        let allLeads: ReconciledLead[] = [];
        try {
            const params = new URLSearchParams();
            params.set("mode", "an");
            if (dateMode === "month") {
                params.set("month", selectedMonth);
            } else if (customStart && customEnd) {
                params.set("dateFrom", customStart);
                params.set("dateTo", customEnd);
            }
            if (company !== "all") params.set("company", company);
            if (disposition !== "all") params.set("disposition", disposition);
            if (selectedDay !== "all") params.set("day", selectedDay);
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (activeTab === "retry") params.set("status", "RETRY_PENDING");
            else if (activeTab === "critical") params.set("status", "CRITICAL_LOST");
            params.set("perPage", "200");

            let p = 1;
            let totalPages = 1;
            do {
                params.set("page", String(p));
                const res = await fetch(`/api/dialshree/lead-lost?${params.toString()}`, { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                const data = await res.json();
                allLeads = allLeads.concat(data.leads || []);
                totalPages = data.pagination?.totalPages || 1;
                p++;
            } while (p <= totalPages);
        } catch (e: any) {
            setError(e.message || "Failed to export");
            return;
        }
        const headers = ["Lead ID", "Client Name", "Mobile", "Company", "Data Source", "Sent Date", "No. of Days", "Status", "Call Count", "Outcome", "Call Status"];
        const rows = allLeads.map(l => [
            l.id,
            l.name_of_client,
            l.mobile,
            l.company,
            l.data_source,
            l.sent_date,
            l.daysPending,
            l.status === "FOUND" ? "RECEIVED" : (l.retryStage === "CRITICAL_LOST" ? "CRITICAL LOST" : "RETRY PENDING"),
            l.callCount,
            l.deciding ? l.deciding.outcome : "",
            l.deciding ? l.deciding.call_status : ""
        ]);
        const csvContent = [headers.join(","), ...rows.map(e => e.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
        const url = URL.createObjectURL(new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" }));
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `dialshree_reconciliation_${windowInfo?.label || "export"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate rates
    const returnRate = totals.sent > 0 ? ((totals.found / totals.sent) * 100).toFixed(1) : "0.0";
    const retryPendingRate = totals.sent > 0 ? ((totals.retryPending / totals.sent) * 100).toFixed(1) : "0.0";
    const criticalLostRate = totals.retryPending > 0 ? ((totals.criticalLost / totals.retryPending) * 100).toFixed(1) : "0.0";

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4ff", padding: "20px 24px 60px" }}>

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1e1b4b", display: "flex", alignItems: "center", gap: 10 }}>
                        <span>🔴 DialShree Sent vs Received Reconciliation</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        Reconciliation window: <strong style={{ color: "#312e81" }}>{windowInfo?.label || "Loading..."}</strong> | Reports leads as <strong>RECEIVED</strong> or, while unresolved, <strong>RETRY PENDING</strong> — escalating to <strong>CRITICAL LOST</strong> once 72 hours have passed since sending.
                    </div>
                </div>

                {/* Scope selector & actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: 2 }}>
                        <button
                            onClick={() => setDateMode("month")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: dateMode === "month" ? "#4f46e5" : "transparent",
                                color: dateMode === "month" ? "#fff" : "#475569"
                            }}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setDateMode("custom")}
                            style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "none",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: dateMode === "custom" ? "#4f46e5" : "transparent",
                                color: dateMode === "custom" ? "#fff" : "#475569"
                            }}
                        >
                            Custom Range
                        </button>
                    </div>

                    {dateMode === "month" ? (
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            style={{
                                height: 36,
                                padding: "0 12px",
                                border: "1.5px solid #c7d2fe",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 600,
                                background: "#fff",
                                color: "#1e1b4b",
                                outline: "none",
                                cursor: "pointer"
                            }}
                        >
                            {availableMonths.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input
                                type="date"
                                value={customStart}
                                onChange={e => setCustomStart(e.target.value)}
                                style={{ height: 36, padding: "0 8px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 12 }}
                            />
                            <span style={{ fontSize: 12, color: "#64748b" }}>to</span>
                            <input
                                type="date"
                                value={customEnd}
                                onChange={e => setCustomEnd(e.target.value)}
                                style={{ height: 36, padding: "0 8px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 12 }}
                            />
                        </div>
                    )}

                    <button
                        onClick={() => fetchData(true)}
                        disabled={loading}
                        style={{
                            height: 36,
                            padding: "0 14px",
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: loading ? "wait" : "pointer",
                            background: "#fff",
                            color: "#374151"
                        }}
                    >
                        {loading ? "⏳ Syncing…" : "🔄 Refresh"}
                    </button>

                    <button
                        onClick={handleExportCSV}
                        disabled={loading || leads.length === 0}
                        style={{
                            height: 36,
                            padding: "0 14px",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: loading ? "not-allowed" : "pointer",
                            background: "#059669",
                            color: "#fff"
                        }}
                    >
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {/* ── Reconciliation KPI Cards ───────────────────────────────────── */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                <KPICard
                    label="Sent"
                    value={loading ? "…" : totals.sent}
                    icon="📤"
                    bg="#eff6ff"
                    color="#1d4ed8"
                    sub="Total records sent to DialShree"
                />
                <div style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #15803d33",
                    borderRadius: 14,
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1.4,
                    minWidth: 260,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
                }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: ".8px" }}>
                            Received
                        </div>
                        <span style={{ fontSize: 20 }}>✅</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: "#111827", lineHeight: 1.1 }}>
                            {loading ? "…" : totals.found}
                        </div>
                        <div style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                            {returnRate}% of Sent
                        </div>
                    </div>
                </div>
                <KPICard
                    label="Retry Pending"
                    value={loading ? "…" : totals.retryPending}
                    icon="🔄"
                    bg="#fffbeb"
                    color="#d97706"
                    solidBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    sub={`${retryPendingRate}% of Sent · not yet received`}
                    highlight={totals.retryPending > 0}
                />
                <KPICard
                    label="Critical Lost"
                    value={loading ? "…" : totals.criticalLost}
                    icon="⚠️"
                    bg="#fef2f2"
                    color="#dc2626"
                    solidBg="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                    sub={`${criticalLostRate}% of Retry Pending · unresolved 72h+`}
                    highlight={totals.criticalLost > 0}
                />
            </div>

            {/* ── View Mode Tabs ─────────────────────────────────────────────── */}
            <div style={{
                display: "flex",
                gap: 4,
                borderBottom: "2px solid #e2e8f0",
                marginBottom: 16,
                paddingBottom: 2
            }}>
                <button
                    onClick={() => setActiveTab("summary")}
                    style={{
                        padding: "10px 18px",
                        borderRadius: "8px 8px 0 0",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: activeTab === "summary" ? "#fff" : "transparent",
                        color: activeTab === "summary" ? "#1e1b4b" : "#64748b",
                        borderBottom: activeTab === "summary" ? "3px solid #4f46e5" : "none",
                        boxShadow: activeTab === "summary" ? "0 -2px 6px rgba(0,0,0,0.02)" : "none"
                    }}
                >
                    📊 Daily Summary (DialShree)
                </button>
                <button
                    onClick={() => setActiveTab("leads")}
                    style={{
                        padding: "10px 18px",
                        borderRadius: "8px 8px 0 0",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: activeTab === "leads" ? "#fff" : "transparent",
                        color: activeTab === "leads" ? "#1e1b4b" : "#64748b",
                        borderBottom: activeTab === "leads" ? "3px solid #4f46e5" : "none"
                    }}
                >
                    📋 Sent Leads Reconciliation (DialShree)
                </button>
                <button
                    onClick={() => setActiveTab("retry")}
                    style={{
                        padding: "10px 18px",
                        borderRadius: "8px 8px 0 0",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: activeTab === "retry" ? "#fff" : "transparent",
                        color: activeTab === "retry" ? "#d97706" : "#64748b",
                        borderBottom: activeTab === "retry" ? "3px solid #d97706" : "none"
                    }}
                >
                    🔄 Retry Pending ({totals.retryPending})
                </button>
                <button
                    onClick={() => setActiveTab("critical")}
                    style={{
                        padding: "10px 18px",
                        borderRadius: "8px 8px 0 0",
                        border: "none",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        background: activeTab === "critical" ? "#fff" : "transparent",
                        color: activeTab === "critical" ? "#dc2626" : "#64748b",
                        borderBottom: activeTab === "critical" ? "3px solid #dc2626" : "none"
                    }}
                >
                    ⚠️ Critical Lost ({totals.criticalLost})
                </button>
            </div>

            {/* ── Sub-Filters & Search Bar ───────────────────────────────────── */}
            <div style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                padding: "14px 18px",
                marginBottom: 16,
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)"
            }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", flex: 1 }}>
                        {/* Search Input */}
                        <div style={{ position: "relative", minWidth: 260, flex: "1 1 260px" }}>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search client name, phone, email, lead ID…"
                                style={{
                                    width: "100%",
                                    height: 36,
                                    paddingLeft: 34,
                                    paddingRight: 10,
                                    border: "1.5px solid #e2e8f0",
                                    borderRadius: 8,
                                    fontSize: 12.5,
                                    outline: "none"
                                }}
                            />
                            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
                        </div>

                        {/* Company Filter */}
                        <select
                            value={company}
                            onChange={e => setCompany(e.target.value)}
                            style={{ height: 36, padding: "0 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, background: "#fff" }}
                        >
                            <option value="all">All Companies</option>
                            {companies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        {/* Data Source Filter */}
                        <select
                            value={disposition}
                            onChange={e => setDisposition(e.target.value)}
                            style={{ height: 36, padding: "0 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, background: "#fff" }}
                        >
                            <option value="all">All Dispositions</option>
                            <option value="NO_CALL">No Call Logged</option>
                            {dispositions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {/* Day filter indicator if set */}
                        {selectedDay !== "all" && (
                            <span style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 16,
                                background: "#ede9fe",
                                color: "#5b21b6",
                                fontSize: 12,
                                fontWeight: 600
                            }}>
                                Filtered Day: {selectedDay}
                                <button
                                    onClick={() => setSelectedDay("all")}
                                    style={{ border: "none", background: "transparent", color: "#5b21b6", cursor: "pointer", fontWeight: 700 }}
                                >
                                    ✕
                                </button>
                            </span>
                        )}

                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            style={{
                                height: 32,
                                padding: "0 12px",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                fontSize: 11.5,
                                fontWeight: 700,
                                cursor: "pointer"
                            }}
                        >
                            ✕ Clear Filters
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error Banner ─────────────────────────────────────────────────── */}
            {error && (
                <div style={{ padding: "16px 20px", background: "#fef2f2", color: "#991b1b", borderRadius: 10, marginBottom: 16, border: "1px solid #fecaca" }}>
                    ❌ <strong>Reconciliation Error:</strong> {error}
                    <button onClick={() => fetchData(true)} style={{ marginLeft: 12, padding: "4px 10px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}>Retry</button>
                </div>
            )}

            {/* ── Loading Spinner ──────────────────────────────────────────────── */}
            {loading && !error && (
                <div style={{ background: "#fff", borderRadius: 14, padding: "60px 20px", textAlign: "center", color: "#64748b", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        border: "4px solid #e2e8f0",
                        borderTopColor: "#4f46e5",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        margin: "0 auto 14px"
                    }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b" }}>Reconciling DialShree leads and call logs…</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Matching Sent lead IDs with Received call logs for {windowInfo?.label || "the period"}</div>
                </div>
            )}

            {/* ── TAB 1: DAILY SUMMARY (KServe) ────────────────────────────────── */}
            {!loading && !error && activeTab === "summary" && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: "14px 20px", background: "linear-gradient(90deg, #f8fafc 0%, #fff 100%)", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b4b" }}>📊 Daily Summary — {windowInfo?.label}</div>
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                                Daily reconciliation breakdown of Sent leads, Received, and unresolved leads (Retry Pending, with Critical Lost as the 72h+ subset).
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                            Total Days: <strong>{dailySummary.length}</strong>
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#1e1b4b" }}>
                                    <Th>Date</Th>
                                    <Th style={{ textAlign: "right" }}>Total Sent</Th>
                                    <Th style={{ textAlign: "right" }}>Received</Th>
                                    <Th style={{ textAlign: "right" }}>Retry Pending</Th>
                                    <Th style={{ textAlign: "right" }}>Critical Lost (72 H+)</Th>
                                    <Th style={{ textAlign: "center" }}>Action</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailySummary.map((d, idx) => (
                                    <tr
                                        key={d.dayKey}
                                        style={{
                                            background: selectedDay === d.dayKey ? "#eef2ff" : idx % 2 === 0 ? "#fff" : "#fafbfe"
                                        }}
                                    >
                                        <Td style={{ fontWeight: 700, color: "#1e293b" }}>{d.dayKey}</Td>
                                        <Td style={{ textAlign: "right", fontWeight: 700, color: "#1d4ed8" }}>{d.sent}</Td>
                                        <Td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>{d.found}</Td>
                                        {/* Retry Pending (count only) */}
                                        <Td style={{ textAlign: "right", fontWeight: 700, color: d.retryPending > 0 ? "#d97706" : "#64748b" }}>{d.retryPending}</Td>
                                        {/* Critical Lost */}
                                        <Td style={{ textAlign: "right", fontWeight: 700, color: d.criticalLost > 0 ? "#dc2626" : "#64748b" }}>{d.criticalLost}</Td>
                                        <Td style={{ textAlign: "center" }}>
                                            <button
                                                onClick={() => {
                                                    setSelectedDay(d.dayKey);
                                                    setActiveTab("leads");
                                                }}
                                                style={{
                                                    fontSize: 11.5,
                                                    padding: "3px 10px",
                                                    borderRadius: 6,
                                                    border: "1px solid #c7d2fe",
                                                    background: "#eef2ff",
                                                    color: "#4f46e5",
                                                    fontWeight: 700,
                                                    cursor: "pointer"
                                                }}
                                            >
                                                View Leads →
                                            </button>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: "#f1f5f9", borderTop: "2px solid #cbd5e1" }}>
                                    <Td style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>TOTAL</Td>
                                    <Td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: "#1d4ed8" }}>{totals.sent}</Td>
                                    <Td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: "#15803d" }}>{totals.found}</Td>
                                    {/* Retry Pending Total */}
                                    <Td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: totals.retryPending > 0 ? "#d97706" : "#0f172a" }}>{totals.retryPending}</Td>
                                    {/* Critical Lost Total */}
                                    <Td style={{ textAlign: "right", fontWeight: 800, fontSize: 13, color: totals.criticalLost > 0 ? "#dc2626" : "#64748b" }}>{totals.criticalLost}</Td>
                                    <Td style={{ textAlign: "center" }}>—</Td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB 2, 3, 4: RECONCILED LEADS TABLE (KServeLeads) ─────────────── */}
            {!loading && !error && activeTab !== "summary" && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{
                        padding: "14px 20px",
                        background: activeTab === "retry" || activeTab === "critical" ? "linear-gradient(90deg, #fef2f2 0%, #fff 100%)" : "linear-gradient(90deg, #f8fafc 0%, #fff 100%)",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e1b4b" }}>
                                {activeTab === "retry" ? "🔄 Retry Pending Tracker" : activeTab === "critical" ? "⚠️ Critical Lost Tracker" : "📋 Sent Leads Reconciliation"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                                {activeTab === "retry"
                                    ? "Sent leads not yet received or finalized, still within the retry window."
                                    : activeTab === "critical"
                                        ? "Unresolved leads that have crossed 72 hours since being sent — a subset of Retry Pending."
                                        : "Complete record of sent leads, showing final received status, call count, and deciding log outcome."}
                            </div>
                        </div>
                        <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            padding: "4px 12px",
                            borderRadius: 16,
                            background: activeTab === "retry" || activeTab === "critical" ? "#fee2e2" : "#e0e7ff",
                            color: activeTab === "retry" || activeTab === "critical" ? "#dc2626" : "#4338ca"
                        }}>
                            {pagination.total} leads found
                        </div>
                    </div>

                    {leads.length === 0 ? (
                        <div style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>No leads match the selected criteria</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Try clearing active filters or choosing a different date range.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: activeTab === "retry" || activeTab === "critical" ? "#7f1d1d" : "#1e1b4b" }}>
                                        <Th>#</Th>
                                        <Th>Sent Date</Th>
                                        <Th>Lead ID</Th>
                                        <Th>Client &amp; Phone</Th>
                                        <Th>Company &amp; Source</Th>
                                        <Th>Verdict</Th>
                                        <Th>Call Count</Th>
                                        <Th>Deciding Outcome</Th>
                                        <Th>Deciding Status</Th>
                                        <Th style={{ textAlign: "center" }}>Call History</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((r, idx) => {
                                        const globalIdx = (page - 1) * perPage + idx + 1;
                                        return (
                                            <tr
                                                key={r.id + idx}
                                                style={{
                                                    background: idx % 2 === 0 ? "#fff" : "#fafbfe"
                                                }}
                                            >
                                                <Td style={{ fontWeight: 600, color: "#94a3b8" }}>{globalIdx}</Td>
                                                <Td style={{ fontWeight: 600 }}>{r.dayKey}</Td>
                                                <Td style={{ fontFamily: "monospace", fontSize: 11, color: "#2563eb" }}>{r.id}</Td>
                                                <Td>
                                                    <div style={{ fontWeight: 700, color: "#111827" }}>{r.name_of_client || "—"}</div>
                                                    <div style={{ fontSize: 11, color: "#64748b" }}>{r.mobile || r.email_id || "—"}</div>
                                                </Td>
                                                <Td>
                                                    <div style={{ fontWeight: 600, color: "#374151" }}>{r.company || "—"}</div>
                                                    <div style={{ fontSize: 11, color: "#64748b" }}>{r.data_source || "—"}</div>
                                                </Td>
                                                <Td>
                                                    <span style={{
                                                        padding: "3px 9px",
                                                        borderRadius: 12,
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        background: r.status === "FOUND" ? "#dcfce7" : r.retryStage === "CRITICAL_LOST" ? "#fee2e2" : "#fef3c7",
                                                        color: r.status === "FOUND" ? "#15803d" : r.retryStage === "CRITICAL_LOST" ? "#dc2626" : "#b45309"
                                                    }}>
                                                        {r.status === "FOUND" ? "RECEIVED" : r.retryStage === "CRITICAL_LOST" ? "CRITICAL LOST" : "RETRY PENDING"}
                                                    </span>
                                                </Td>
                                                <Td style={{ textAlign: "center", fontWeight: 700, color: r.callCount > 0 ? "#1e293b" : "#94a3b8" }}>
                                                    {r.callCount}
                                                </Td>
                                                <Td style={{ fontWeight: 600, color: "#374151" }}>
                                                    {r.deciding ? r.deciding.outcome : <span style={{ color: "#94a3b8" }}>—</span>}
                                                </Td>
                                                <Td>
                                                    {r.deciding ? (
                                                        <span style={{
                                                            fontSize: 11,
                                                            padding: "2px 6px",
                                                            borderRadius: 4,
                                                            background: "#f1f5f9",
                                                            color: "#475569"
                                                        }}>
                                                            {r.deciding.call_status}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>—</span>
                                                    )}
                                                </Td>
                                                <Td style={{ textAlign: "center" }}>
                                                    <button
                                                        onClick={() => setInspectedLead(r)}
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #c7d2fe",
                                                            background: r.callCount > 0 ? "#eef2ff" : "#f8fafc",
                                                            color: r.callCount > 0 ? "#4f46e5" : "#94a3b8",
                                                            fontSize: 11.5,
                                                            fontWeight: 700,
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {r.callCount > 0 ? `View ${r.callCount} Log${r.callCount === 1 ? "" : "s"}` : "No Logs"}
                                                    </button>
                                                </Td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    <Pagination
                        total={pagination.total}
                        page={pagination.page}
                        perPage={pagination.perPage}
                        onPage={p => setPage(p)}
                        onPerPage={n => setPerPage(n)}
                    />
                </div>
            )}

            {/* ── Call Logs Inspector Modal ────────────────────────────────────── */}
            {inspectedLead && (
                <CallLogsModal
                    lead={inspectedLead}
                    onClose={() => setInspectedLead(null)}
                />
            )}
        </div>
    );
}
