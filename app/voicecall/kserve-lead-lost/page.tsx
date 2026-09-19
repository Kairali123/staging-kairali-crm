"use client";

import { useState, useMemo, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LostLead {
    id: string;
    name_of_client: string;
    mobile: string;
    email_id: string;
    subjects: string;
    company: string;
    data_source: string;
    campaign_name: string;
    sent_date: string;
    days_pending: number;
}

// Lightweight row for every sent lead — used to compute date-filtered KPIs
interface SentSummary {
    id: string;
    sent_date: string;
    company: string;
    data_source: string;
    received: boolean; // true = already came back from KServe
}

interface ApiResponse {
    lostDays: number;
    allSent: SentSummary[];   // all sent leads (lightweight)
    data: LostLead[];          // only lost (not received, older than lostDays)
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function getDateRange(filter: string, customStart: string, customEnd: string): { from: Date | null; to: Date | null } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
        case "today":
            return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
        case "yesterday": {
            const y = new Date(today.getTime() - 86400000);
            return { from: y, to: new Date(today.getTime() - 1) };
        }
        case "last_7":
            return { from: new Date(today.getTime() - 6 * 86400000), to: new Date(today.getTime() + 86400000 - 1) };
        case "last_30":
            return { from: new Date(today.getTime() - 29 * 86400000), to: new Date(today.getTime() + 86400000 - 1) };
        case "this_week": {
            const dow = today.getDay();
            const mon = new Date(today.getTime() - ((dow === 0 ? 6 : dow - 1) * 86400000));
            return { from: mon, to: new Date(mon.getTime() + 7 * 86400000 - 1) };
        }
        case "last_week": {
            const dow = today.getDay();
            const thisMon = new Date(today.getTime() - ((dow === 0 ? 6 : dow - 1) * 86400000));
            const lastMon = new Date(thisMon.getTime() - 7 * 86400000);
            return { from: lastMon, to: new Date(thisMon.getTime() - 1) };
        }
        case "this_month":
            return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
        case "last_month":
            return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
        case "this_year":
            return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
        case "last_year":
            return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59) };
        case "custom": {
            const parseLocal = (s: string, isEnd = false): Date | null => {
                if (!s) return null;
                const parts = s.split("-");
                if (parts.length !== 3) return null;
                const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]);
                return isEnd ? new Date(y, m, d, 23, 59, 59, 999) : new Date(y, m, d, 0, 0, 0, 0);
            };
            return { from: parseLocal(customStart), to: parseLocal(customEnd, true) };
        }
        default:
            return { from: null, to: null };
    }
}

function inRange(ts: number, from: Date | null, to: Date | null): boolean {
    if (!from && !to) return true;
    if (!ts) return true;
    if (from && ts < from.getTime()) return false;
    if (to && ts > to.getTime()) return false;
    return true;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th style={{ padding: "9px 12px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.85)", textTransform: "uppercase" as const, letterSpacing: ".6px", whiteSpace: "nowrap", textAlign: "left" as const, borderRight: "1px solid rgba(255,255,255,.08)" }}>
            {children}
        </th>
    );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <td style={{ padding: "9px 12px", fontSize: 11.5, color: "#374151", borderRight: "1px solid #f1f5f9", whiteSpace: "nowrap", verticalAlign: "middle", ...style }}>
            {children}
        </td>
    );
}

function UrgencyBadge({ days, threshold }: { days: number; threshold: number }) {
    const isCritical = days > threshold * 2;
    const isHigh = days > threshold;
    const bg = isCritical ? "#fee2e2" : isHigh ? "#fef3c7" : "#fef9c3";
    const color = isCritical ? "#991b1b" : isHigh ? "#92400e" : "#713f12";
    const label = isCritical ? "⚠️ Critical" : isHigh ? "🟠 High" : "🟡 Overdue";
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>
            {label} ({days}d)
        </span>
    );
}

function KPICard({ label, value, icon, bg, color, sub, highlight }: {
    label: string; value: number | string; icon: string; bg: string; color: string; sub?: string; highlight?: boolean;
}) {
    return (
        <div style={{ background: highlight ? color : bg, border: `1.5px solid ${color}44`, borderRadius: 14, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 155, boxShadow: highlight ? `0 4px 18px ${color}44` : "0 2px 10px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: highlight ? "rgba(255,255,255,.85)" : color, textTransform: "uppercase" as const, letterSpacing: ".8px" }}>{label}</div>
                <span style={{ fontSize: 20 }}>{icon}</span>
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: highlight ? "#fff" : "#111827", lineHeight: 1, marginTop: 4 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: highlight ? "rgba(255,255,255,.75)" : color, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
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
    const handleGo = () => { const n = parseInt(goInput); if (!isNaN(n) && n >= 1 && n <= totalPages) { onPage(n); setGoInput(""); } };

    const pages: (number | "…")[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
        pages.push(1);
        if (page > 3) pages.push("…");
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
        if (page < totalPages - 2) pages.push("…");
        pages.push(totalPages);
    }

    const btn = (label: React.ReactNode, onClick: () => void, disabled: boolean, active = false, key?: string) => (
        <button key={key} onClick={onClick} disabled={disabled} style={{ height: 30, minWidth: 30, padding: "0 8px", border: active ? "none" : "1px solid #e2e8f0", borderRadius: 6, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer", background: active ? "#4f46e5" : disabled ? "#f8fafc" : "#fff", color: active ? "#fff" : disabled ? "#cbd5e1" : "#374151" }}>{label}</button>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "10px 16px", borderTop: "1px solid #f1f5f9", background: "#fafbfe" }}>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>Showing <strong style={{ color: "#1e2a4a" }}>{from}–{to}</strong> of <strong style={{ color: "#1e2a4a" }}>{total}</strong> leads</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {btn("«", () => onPage(1), page === 1, false, "first")}
                {btn("‹", () => onPage(page - 1), page === 1, false, "prev")}
                {pages.map((p, i) => p === "…" ? <span key={`e${i}`} style={{ fontSize: 12.5, color: "#94a3b8", padding: "0 4px" }}>…</span> : btn(p, () => onPage(p as number), false, p === page, `p${p}`))}
                {btn("›", () => onPage(page + 1), page === totalPages, false, "next")}
                {btn("»", () => onPage(totalPages), page === totalPages, false, "last")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#64748b" }}>
                <span>Rows:</span>
                <select value={perPage} onChange={e => { onPerPage(Number(e.target.value)); onPage(1); }} style={{ height: 28, padding: "0 6px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontFamily: "inherit", background: "#fff" }}>
                    {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <input type="number" value={goInput} onChange={e => setGoInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGo()} placeholder="Go to" style={{ height: 28, width: 56, padding: "0 8px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontFamily: "inherit", textAlign: "center" }} />
                <button onClick={handleGo} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", background: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Go</button>
            </div>
        </div>
    );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({ lostDays, alertTime: initAlertTime, onSave, onClose }: {
    lostDays: number; alertTime: string; onSave: (days: number, alertTime: string) => void; onClose: () => void;
}) {
    const [days, setDays] = useState(String(lostDays));
    const [alertTime, setAlertTime] = useState(initAlertTime || "09:00");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const d = parseInt(days);
        if (isNaN(d) || d < 1 || d > 365) { alert("Please enter a valid number of days (1–365)."); return; }
        setSaving(true);
        try {
            await fetch("/api/kserve-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lost_days: d, alert_time: alertTime }) });
            onSave(d, alertTime);
        } finally { setSaving(false); onClose(); }
    };

    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", width: 420, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.28)" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#1e2a4a", marginBottom: 20 }}>⚙️ Alert Settings</div>
                <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: ".6px", display: "block", marginBottom: 6 }}>Lost Threshold (Days)</label>
                    <input type="number" min={1} max={365} value={days} onChange={e => setDays(e.target.value)}
                        style={{ width: "100%", height: 40, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 5 }}>A lead is flagged "Lost" if it hasn&apos;t returned from KServe after this many days.</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase" as const, letterSpacing: ".6px", display: "block", marginBottom: 6 }}>Daily Alert Time (IST)</label>
                    <input type="time" value={alertTime} onChange={e => setAlertTime(e.target.value)}
                        style={{ width: "100%", height: 40, padding: "0 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" }} />
                    <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 5 }}>Time when the daily admin alert email fires.</div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={onClose} style={{ height: 38, padding: "0 18px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#fff", color: "#374151" }}>Cancel</button>
                    <button onClick={handleSave} disabled={saving} style={{ height: 38, padding: "0 22px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", background: "#4f46e5", color: "#fff" }}>
                        {saving ? "Saving…" : "Save Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KserveLeadLostPage() {
    const [allData, setAllData] = useState<LostLead[]>([]);     // raw API data (ALL lost leads, no filter)
    const [allSent, setAllSent] = useState<SentSummary[]>([]);  // all sent leads for KPI calculation
    const [lostDays, setLostDays] = useState(5);
    const [alertTime, setAlertTime] = useState("09:00");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [sendingMail, setSendingMail] = useState(false);
    const [mailStatus, setMailStatus] = useState<string | null>(null);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("all");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [company, setCompany] = useState("all");
    const [dataSource, setDataSource] = useState("all");

    // ── Table ─────────────────────────────────────────────────────────────────
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    // debounce search
    useEffect(() => {
        const h = setTimeout(() => setDebouncedSearch(search), 280);
        return () => clearTimeout(h);
    }, [search]);

    // reset to page 1 on filter change
    useEffect(() => { setPage(1); }, [debouncedSearch, dateFilter, customStart, customEnd, company, dataSource]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/kserve-lost-leads", { cache: "no-store" });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const json: ApiResponse = await res.json();
            setAllData(json.data || []);
            setAllSent(json.allSent || []);
            setLostDays(json.lostDays || 5);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // load settings for alertTime
    useEffect(() => {
        fetch("/api/kserve-settings").then(r => r.ok ? r.json() : null).then(j => { if (j?.alert_time) setAlertTime(j.alert_time); }).catch(() => { });
    }, []);

    const handleSaveSettings = (newDays: number, newAlertTime: string) => {
        setLostDays(newDays);
        setAlertTime(newAlertTime);
        fetchData();
    };

    const handleSendAlert = async () => {
        setSendingMail(true);
        setMailStatus(null);
        try {
            const res = await fetch("/api/cron/kserve-lost-alert");
            const json = await res.json();
            if (json.sent) setMailStatus(`✅ Alert sent! (${json.lostLeads} leads)`);
            else if (json.reason) setMailStatus(`ℹ️ ${json.reason}`);
            else setMailStatus(`❌ Error: ${json.error || "Unknown"}`);
        } catch (e: any) {
            setMailStatus(`❌ ${e.message}`);
        } finally {
            setSendingMail(false);
            setTimeout(() => setMailStatus(null), 7000);
        }
    };

    // ── Dropdown options ──────────────────────────────────────────────────────
    const companies = useMemo(() => ["all", ...Array.from(new Set(allData.map(d => d.company).filter(Boolean))).sort()], [allData]);
    const dataSources = useMemo(() => ["all", ...Array.from(new Set(allData.map(d => d.data_source).filter(Boolean))).sort()], [allData]);

    // ── filteredAllSent — apply same date/company/source filter to all sent leads
    // This drives Total Sent and Total Received KPIs so they match the table filters.
    const filteredAllSent = useMemo(() => {
        const { from, to } = getDateRange(dateFilter, customStart, customEnd);
        return allSent.filter(row => {
            if (company !== "all" && row.company !== company) return false;
            if (dataSource !== "all" && row.data_source !== dataSource) return false;
            if (from || to) {
                const ts = row.sent_date ? new Date(row.sent_date).getTime() : 0;
                if (!inRange(ts, from, to)) return false;
            }
            return true;
        });
    }, [allSent, dateFilter, customStart, customEnd, company, dataSource]);

    // ── Filtered lost leads (drives table + Lost KPI) ─────────────────────────
    const filtered = useMemo(() => {
        const q = debouncedSearch.toLowerCase().trim();
        const { from, to } = getDateRange(dateFilter, customStart, customEnd);

        return allData.filter(row => {
            if (company !== "all" && row.company !== company) return false;
            if (dataSource !== "all" && row.data_source !== dataSource) return false;
            if (from || to) {
                const ts = row.sent_date ? new Date(row.sent_date).getTime() : 0;
                if (!inRange(ts, from, to)) return false;
            }
            if (q) {
                const hay = `${row.name_of_client} ${row.mobile} ${row.email_id} ${row.id} ${row.subjects} ${row.company} ${row.data_source}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [allData, debouncedSearch, dateFilter, customStart, customEnd, company, dataSource]);

    // ── KPIs — all from filtered data ─────────────────────────────────────────
    const filteredTotalSent = filteredAllSent.length;
    const filteredTotalReceived = filteredAllSent.filter(r => r.received).length;
    const filteredLost = filtered.length;                                          // lost leads matching table filters
    const filteredCritical = filtered.filter(r => r.days_pending > lostDays * 2).length;

    // For progress bar
    const pctReceived = filteredTotalSent > 0 ? ((filteredTotalReceived / filteredTotalSent) * 100).toFixed(1) : "0.0";
    const pctPending = filteredTotalSent > 0 ? ((filteredLost / filteredTotalSent) * 100).toFixed(1) : "0.0";

    const paged = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

    const clearFilters = () => {
        setSearch(""); setDebouncedSearch(""); setDateFilter("all");
        setCustomStart(""); setCustomEnd(""); setCompany("all"); setDataSource("all");
    };

    const isFiltered = search || dateFilter !== "all" || company !== "all" || dataSource !== "all";

    return (
        <div style={{ minHeight: "100vh", background: "#f0f4ff", padding: "20px 20px 48px" }}>

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 21, fontWeight: 800, color: "#1e2a4a", display: "flex", alignItems: "center", gap: 8 }}>
                        🔴 KServe Lead Lost Tracker
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>
                        Leads sent to KServe but not returned — Lost threshold: <strong>{lostDays} days</strong>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {mailStatus && (
                        <div style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: mailStatus.startsWith("✅") ? "#d1fae5" : mailStatus.startsWith("ℹ️") ? "#dbeafe" : "#fee2e2", color: mailStatus.startsWith("✅") ? "#065f46" : mailStatus.startsWith("ℹ️") ? "#1e40af" : "#991b1b" }}>
                            {mailStatus}
                        </div>
                    )}
                    <button onClick={() => window.open("/api/kserve-alert-preview", "_blank")} style={{ height: 36, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "#f8fafc", color: "#475569" }}>
                        👁️ Preview Email
                    </button>
                    <button onClick={handleSendAlert} disabled={sendingMail} style={{ height: 36, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: sendingMail ? "wait" : "pointer", background: "#fff", color: "#374151" }}>
                        {sendingMail ? "⏳ Sending…" : "📧 Send Alert Now"}
                    </button>
                    <button onClick={() => setShowSettings(true)} style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: "#4f46e5", color: "#fff" }}>
                        ⚙️ Settings
                    </button>
                    <button onClick={fetchData} disabled={loading} style={{ height: 36, padding: "0 14px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: loading ? "wait" : "pointer", background: "#fff", color: "#374151" }}>
                        {loading ? "⏳" : "🔄 Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Advanced Search & Filters ─────────────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 20px 18px", marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#6366f1", textTransform: "uppercase" as const, letterSpacing: "1px" }}>🔍 Advanced Search &amp; Filters</div>
                    {isFiltered && (
                        <button onClick={clearFilters} style={{ fontSize: 11.5, fontWeight: 600, color: "#6366f1", background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 6, padding: "3px 12px", cursor: "pointer" }}>
                            ✕ Clear All Filters
                        </button>
                    )}
                </div>

                {/* Row 1 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 12 }}>
                    {/* Search */}
                    <div style={{ flex: "2 1 220px" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Search Leads</label>
                        <div style={{ position: "relative" }}>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Name, email, phone, ID, subject…"
                                style={{ width: "100%", height: 36, paddingLeft: 34, paddingRight: 10, border: `1.5px solid ${search ? "#6366f1" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
                            />
                            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 13 }}>🔍</span>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div style={{ flex: "1 1 160px" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Date Range (Sent Date)</label>
                        <select
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            style={{ width: "100%", height: 36, padding: "0 10px", border: `1.5px solid ${dateFilter !== "all" ? "#6366f1" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", background: "#fff", outline: "none" }}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="last_7">Last 7 Days</option>
                            <option value="last_30">Last 30 Days</option>
                            <option value="this_week">This Week</option>
                            <option value="last_week">Last Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="this_year">This Year</option>
                            <option value="last_year">Last Year</option>
                            <option value="custom">Custom Date Range</option>
                        </select>
                    </div>

                    {/* Company */}
                    <div style={{ flex: "1 1 140px" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Company</label>
                        <select value={company} onChange={e => setCompany(e.target.value)} style={{ width: "100%", height: 36, padding: "0 10px", border: `1.5px solid ${company !== "all" ? "#6366f1" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", background: "#fff", outline: "none" }}>
                            {companies.map(c => <option key={c} value={c}>{c === "all" ? "All Companies" : c}</option>)}
                        </select>
                    </div>

                    {/* Data Source */}
                    <div style={{ flex: "1 1 140px" }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Data Source</label>
                        <select value={dataSource} onChange={e => setDataSource(e.target.value)} style={{ width: "100%", height: 36, padding: "0 10px", border: `1.5px solid ${dataSource !== "all" ? "#6366f1" : "#e2e8f0"}`, borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", background: "#fff", outline: "none" }}>
                            {dataSources.map(s => <option key={s} value={s}>{s === "all" ? "All Sources" : s}</option>)}
                        </select>
                    </div>
                </div>

                {/* Row 2 — Custom date pickers (shown only when custom is selected) */}
                {dateFilter === "custom" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", padding: "12px 14px", background: "#f8f9ff", borderRadius: 10, border: "1px solid #e0e7ff" }}>
                        <div style={{ flex: "1 1 160px" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>From Date</label>
                            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                                style={{ width: "100%", height: 36, padding: "0 10px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: "1 1 160px" }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>To Date</label>
                            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                                style={{ width: "100%", height: 36, padding: "0 10px", border: "1.5px solid #c7d2fe", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ fontSize: 11.5, color: "#6366f1", fontWeight: 600, paddingBottom: 6 }}>
                            📅 Showing leads sent between selected dates
                        </div>
                    </div>
                )}

                {/* Active filter chips */}
                {isFiltered && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                        <span style={{ fontSize: 10.5, color: "#64748b", fontWeight: 600, alignSelf: "center" }}>Active filters:</span>
                        {search && <span style={{ padding: "2px 10px", borderRadius: 20, background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 600 }}>Search: &quot;{search}&quot;</span>}
                        {dateFilter !== "all" && <span style={{ padding: "2px 10px", borderRadius: 20, background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 600 }}>Date: {dateFilter}{dateFilter === "custom" ? ` (${customStart || "?"} → ${customEnd || "?"})` : ""}</span>}
                        {company !== "all" && <span style={{ padding: "2px 10px", borderRadius: 20, background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 600 }}>Company: {company}</span>}
                        {dataSource !== "all" && <span style={{ padding: "2px 10px", borderRadius: 20, background: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 600 }}>Source: {dataSource}</span>}
                    </div>
                )}
            </div>

            {/* ── KPI Cards — all driven by filtered data ───────────────────── */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
                <KPICard
                    label={isFiltered ? "Sent (Filtered)" : "Total Sent to KServe"}
                    value={loading ? "…" : filteredTotalSent}
                    icon="📤"
                    bg="#eff6ff"
                    color="#1d4ed8"
                    sub={isFiltered ? "Filtered by current selection" : "All leads ever sent to KServe"}
                />
                <KPICard
                    label={isFiltered ? "Received Back (Filtered)" : "Total Received Back"}
                    value={loading ? "…" : filteredTotalReceived}
                    icon="✅"
                    bg="#f0fdf4"
                    color="#15803d"
                    sub={`${pctReceived}% return rate`}
                />
                <KPICard
                    label={`Pending / Lost (>${lostDays}d)`}
                    value={loading ? "…" : filteredLost}
                    icon="🔴"
                    bg="#fef2f2"
                    color="#dc2626"
                    sub={isFiltered ? "Based on current filters" : "All unmatched lost leads"}
                    highlight={filteredLost > 0}
                />
                <KPICard
                    label="Critical (>2× threshold)"
                    value={loading ? "…" : filteredCritical}
                    icon="⚠️"
                    bg="#fef3c7"
                    color="#d97706"
                    sub={`>${lostDays * 2} days with no return`}
                    highlight={filteredCritical > 0}
                />
            </div>

            {/* ── Progress Bar ─────────────────────────────────────────────── */}
            {!loading && filteredTotalSent > 0 && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: "14px 20px", marginBottom: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>
                            KServe Lead Flow {isFiltered ? "— Filtered View" : "— All Time"}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{filteredTotalSent} total sent</div>
                    </div>
                    <div style={{ height: 18, borderRadius: 10, background: "#f1f5f9", overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${pctReceived}%`, background: "linear-gradient(90deg,#15803d,#22c55e)", transition: "width .6s ease" }} title={`Received: ${filteredTotalReceived}`} />
                        <div style={{ width: `${pctPending}%`, background: "linear-gradient(90deg,#ef4444,#f97316)", transition: "width .6s ease" }} title={`Lost: ${filteredLost}`} />
                    </div>
                    <div style={{ display: "flex", gap: 20, marginTop: 7, fontSize: 11.5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#15803d" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#22c55e", display: "inline-block" }} />
                            Received: {filteredTotalReceived} ({pctReceived}%)
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#dc2626" }}>
                            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#ef4444", display: "inline-block" }} />
                            Lost / Pending: {filteredLost} ({pctPending}%)
                        </div>
                    </div>
                </div>
            )}

            {/* ── Table ────────────────────────────────────────────────────────── */}
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(90deg,#fef2f2 0%,#fff 100%)" }}>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: "#1e293b" }}>🔴 Pending / Lost Leads — Not Returned from KServe</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            Match logic: enquiry_id (Sent) ↔ initial_id (Received) — no match after {lostDays} days = Lost
                        </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isFiltered && <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 600 }}>Filtered</span>}
                        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 20, padding: "4px 14px", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                            {loading ? "…" : filteredLost} leads
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ padding: "20px", background: "#fef2f2", color: "#991b1b", fontSize: 13, textAlign: "center" }}>
                        ❌ Error loading data: {error}
                        <button onClick={fetchData} style={{ marginLeft: 12, padding: "4px 12px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", fontSize: 12, cursor: "pointer" }}>Retry</button>
                    </div>
                )}

                {/* Loading */}
                {loading && !error && (
                    <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>
                        <div style={{ width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#dc2626", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                        Loading KServe lost leads…
                    </div>
                )}

                {/* Data table */}
                {!loading && !error && (
                    <>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#7f1d1d" }}>
                                        <Th>#</Th>
                                        <Th>Lead ID</Th>
                                        <Th>Client Details</Th>
                                        <Th>Company</Th>
                                        <Th>Data Source</Th>
                                        <Th>Sent Date</Th>
                                        <Th>Days Pending</Th>
                                        <Th>Status</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paged.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ padding: "52px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                                                {isFiltered
                                                    ? "✅ No lost leads match your current filters. Try changing or clearing filters."
                                                    : `✅ Great! No leads have been pending for more than ${lostDays} days.`}
                                            </td>
                                        </tr>
                                    ) : (
                                        paged.map((row, i) => {
                                            const sentDate = row.sent_date ? new Date(row.sent_date).toLocaleDateString("en-IN") : "—";
                                            const sentTime = row.sent_date ? new Date(row.sent_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "";
                                            const isCritical = row.days_pending > lostDays * 2;
                                            return (
                                                <tr
                                                    key={`${row.id}-${i}`}
                                                    style={{ borderBottom: "1px solid #f1f5f9", background: isCritical ? "#fff5f5" : undefined, transition: "background .1s" }}
                                                    onMouseEnter={e => { const el = e.currentTarget as HTMLTableRowElement; el.style.background = isCritical ? "#fee2e2" : "#e0e7ff"; el.style.boxShadow = "inset 3px 0 0 #991b1b"; }}
                                                    onMouseLeave={e => { const el = e.currentTarget as HTMLTableRowElement; el.style.background = isCritical ? "#fff5f5" : ""; el.style.boxShadow = ""; }}
                                                >
                                                    <Td style={{ color: "#94a3b8", width: 38, fontSize: 11 }}>{(page - 1) * perPage + i + 1}</Td>
                                                    <Td>
                                                        <span style={{ fontFamily: "monospace", fontSize: 10.5, background: "#f8fafc", padding: "2px 7px", borderRadius: 4, color: "#475569", border: "1px solid #e2e8f0" }}>
                                                            {row.id || "—"}
                                                        </span>
                                                    </Td>
                                                    <Td>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                                                            <strong style={{ fontSize: 12 }}>{row.name_of_client || "—"}</strong>
                                                            <span style={{ color: "#64748b", fontSize: 11 }}>{row.mobile || "—"}</span>
                                                            <span style={{ color: "#94a3b8", fontSize: 11 }}>{row.email_id || "—"}</span>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#e0e7ff", color: "#3730a3" }}>
                                                            {row.company || "—"}
                                                        </span>
                                                    </Td>
                                                    <Td style={{ color: "#64748b" }}>{row.data_source || "—"}</Td>
                                                    <Td>
                                                        <div style={{ lineHeight: 1.4 }}>
                                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{sentDate}</div>
                                                            <div style={{ color: "#94a3b8", fontSize: 10.5 }}>{sentTime}</div>
                                                        </div>
                                                    </Td>
                                                    <Td><UrgencyBadge days={row.days_pending} threshold={lostDays} /></Td>
                                                    <Td>
                                                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#fee2e2", color: "#991b1b" }}>
                                                            Not Returned
                                                        </span>
                                                    </Td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} onPerPage={n => { setPerPage(n); setPage(1); }} />
                    </>
                )}
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsModal
                    lostDays={lostDays}
                    alertTime={alertTime}
                    onSave={handleSaveSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
