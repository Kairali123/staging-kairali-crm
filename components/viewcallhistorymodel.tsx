"use client";

import React from "react";

/* ─────────────────────────────────────────────────────────────
   VIEW MODAL — Lead Details
   Design: matched to CRM Call Dashboard style
   · Left sidebar → avatar, client info, data source, ID chip
   · Right panel → accent-bar section label + outlined info cards
   · Footer bar  → meta timestamps + purple close button
──────────────────────────────────────────────────────────────*/

export interface LeadRow {
    timeStamp: string;
    dateTime: string;
    id: string;
    clientName: string;
    mobile: string;
    email: string;
    subjects: string;
    notes: string;
    ivrUrl: string;
    websiteName: string;
    dataSource: string;
    assignToMR: string;
    remarksHistory: string;
    status: string;
    doerName: string;
}

/* ── Status pill colors (outlined pill like "No Answer") ── */
const STATUS_STYLES: Record<string, { color: string; border: string; bg: string; dot: string }> = {
    "open": { color: "#2563eb", border: "#bfdbfe", bg: "#eff6ff", dot: "#2563eb" },
    "pending": { color: "#d97706", border: "#fde68a", bg: "#fffbeb", dot: "#f59e0b" },
    "in progress": { color: "#0891b2", border: "#a5f3fc", bg: "#ecfeff", dot: "#0891b2" },
    "follow up": { color: "#7c3aed", border: "#ddd6fe", bg: "#f5f3ff", dot: "#7c3aed" },
    "converted": { color: "#059669", border: "#a7f3d0", bg: "#ecfdf5", dot: "#059669" },
    "closed": { color: "#059669", border: "#a7f3d0", bg: "#ecfdf5", dot: "#059669" },
    "done": { color: "#059669", border: "#a7f3d0", bg: "#ecfdf5", dot: "#059669" },
    "not connected": { color: "#64748b", border: "#e2e8f0", bg: "#f8fafc", dot: "#94a3b8" },
    "rejected": { color: "#dc2626", border: "#fecaca", bg: "#fef2f2", dot: "#dc2626" },
    "cancelled": { color: "#dc2626", border: "#fecaca", bg: "#fef2f2", dot: "#dc2626" },
    "dead": { color: "#dc2626", border: "#fecaca", bg: "#fef2f2", dot: "#dc2626" },
};
const statusStyle = (s: string) =>
    STATUS_STYLES[String(s || "").trim().toLowerCase()] ||
    { color: "#334155", border: "#e2e8f0", bg: "#f8fafc", dot: "#64748b" };

const initials = (name: string) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
};

/* ─────────────────────────────────────────────────────────────
   NOTES CARD — parses KServe "notes_by_kairali" JSON payloads
   into a readable layout:
   · Enquiry Responses  → question / answer rows
   · AI Extraction      → labeled chips grid + summary
   Falls back to plain text for normal (non-JSON) notes.
──────────────────────────────────────────────────────────────*/
type ParsedNotes = {
    qa: { q: string; a: string }[];
    extraction: Record<string, string>;
    plain: string;
};

const KEY_LABELS: Record<string, string> = {
    lead_outcome: "Lead Outcome",
    company: "Company",
    prority: "Priority",
    priority: "Priority",
    urgency: "Urgency",
    contact_time: "Contact Time",
    preffered_way_to_interact: "Preferred Contact",
    preferred_way_to_interact: "Preferred Contact",
    summaryofconvo: "Summary",
    leadcategory: "Lead Category",
    leadtype: "Lead Type",
    leadintent: "Lead Intent",
};
const prettyKey = (k: string) =>
    KEY_LABELS[k.toLowerCase()] ||
    k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, c => c.toUpperCase());

function tryJson(s: unknown): any {
    if (typeof s === "object" && s !== null) return s;
    if (typeof s !== "string") return null;
    const t = s.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return null;
    try { return JSON.parse(t); } catch { /* fallthrough */ }
    // Handle escaped variants like {\n \"notes\": ...}
    try { return JSON.parse(t.replace(/\\n/g, " ").replace(/\\"/g, '"')); } catch { return null; }
}

function parseNotes(raw: string): ParsedNotes {
    const out: ParsedNotes = { qa: [], extraction: {}, plain: String(raw ?? "").trim() };
    let obj = tryJson(raw);
    if (obj && obj.notes_by_kairali !== undefined) obj = tryJson(obj.notes_by_kairali) ?? obj.notes_by_kairali;
    if (!obj || typeof obj !== "object") return out;

    // notes text → "Question: Answer; Question: Answer" pairs
    const notesText = typeof obj.notes === "string" ? obj.notes : "";
    if (notesText) {
        notesText
            .split(/;|\\n|\n/)
            .map((seg: string) => seg.trim())
            .filter(Boolean)
            .forEach((seg: string) => {
                const idx = seg.indexOf(":");
                if (idx > 0 && idx < 80) {
                    out.qa.push({ q: seg.slice(0, idx).trim(), a: seg.slice(idx + 1).trim() || "—" });
                } else {
                    out.qa.push({ q: "", a: seg });
                }
            });
    }

    // aiExtractionDetails → flat string map
    const ext = tryJson(obj.aiExtractionDetails) ?? obj.aiExtractionDetails;
    if (ext && typeof ext === "object") {
        Object.entries(ext).forEach(([k, v]) => {
            const sv = String(v ?? "").trim();
            if (sv) out.extraction[k] = sv;
        });
    }

    if (out.qa.length || Object.keys(out.extraction).length) out.plain = "";
    return out;
}

const INTENT_COLORS: Record<string, string> = {
    high: "#dc2626", medium: "#d97706", low: "#059669",
    yes: "#dc2626", no: "#059669",
};
const chipColor = (label: string, value: string) => {
    const l = label.toLowerCase();
    if (l === "priority" || l === "urgency" || l === "lead intent")
        return INTENT_COLORS[value.toLowerCase()] || "#334155";
    return "#1e293b";
};

function NotesCard({ raw }: { raw: string }) {
    const parsed = React.useMemo(() => parseNotes(raw), [raw]);
    const empty = !parsed.plain && !parsed.qa.length && !Object.keys(parsed.extraction).length;
    const summary = parsed.extraction["summaryOfConvo"] || parsed.extraction["summaryofconvo"] || "";
    const chips = Object.entries(parsed.extraction)
        .filter(([k]) => !/summaryofconvo/i.test(k));

    return (
        <div style={{
            gridColumn: "1 / -1",
            border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff",
            padding: "12px 16px 16px",
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
                Notes
            </div>

            {empty && <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>—</div>}

            {/* Plain text fallback (non-JSON notes) */}
            {parsed.plain && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {parsed.plain}
                </div>
            )}

            {/* Q&A rows */}
            {parsed.qa.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {parsed.qa.map((item, i) => (
                        <div key={i} style={{
                            display: "flex", gap: 12, alignItems: "baseline",
                            padding: "7px 12px", background: i % 2 ? "#fff" : "#f8fafc",
                            border: "1px solid #eef2f7", borderRadius: 8,
                        }}>
                            {item.q ? (
                                <>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", flexShrink: 0, maxWidth: "45%" }}>
                                        {item.q}
                                    </span>
                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", wordBreak: "break-word" }}>
                                        {item.a}
                                    </span>
                                </>
                            ) : (
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", lineHeight: 1.55, wordBreak: "break-word" }}>
                                    {item.a}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* AI Extraction */}
            {(chips.length > 0 || summary) && (
                <div style={{ marginTop: parsed.qa.length ? 14 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                        <span style={{ fontSize: 12 }}>✨</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: "#7c3aed" }}>
                            AI Extraction
                        </span>
                    </div>

                    {chips.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                            {chips.map(([k, v]) => {
                                const label = prettyKey(k);
                                return (
                                    <div key={k} style={{
                                        border: "1px solid #ede9fe", background: "#faf9ff",
                                        borderRadius: 8, padding: "7px 10px", minWidth: 0,
                                    }}>
                                        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#a78bfa", marginBottom: 2 }}>
                                            {label}
                                        </div>
                                        <div style={{ fontSize: 12.5, fontWeight: 800, color: chipColor(label, v), wordBreak: "break-word", textTransform: "capitalize" }}>
                                            {v}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {summary && (
                        <div style={{
                            marginTop: 8, border: "1px solid #ede9fe", background: "#faf9ff",
                            borderRadius: 8, padding: "9px 12px",
                        }}>
                            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#a78bfa", marginBottom: 3 }}>
                                Conversation Summary
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1e293b", lineHeight: 1.6, wordBreak: "break-word" }}>
                                {summary}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   CALL RECORDING PLAYER
   · Normalizes the IVR Url (trim, http→https, Google Drive
     share links → direct stream links)
   · If the browser can't play it (page link / blocked / bad
     format), automatically falls back to an "Open Recording"
     button instead of a dead 0:00 player
──────────────────────────────────────────────────────────────*/
function normalizeAudioUrl(raw: string): string {
    let u = String(raw || "").trim();
    if (!u) return "";
    // Mixed-content fix: https site cannot load http audio
    if (u.startsWith("http://")) u = "https://" + u.slice(7);
    // Google Drive share link → direct stream
    const drive = u.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
    const driveOpen = u.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (driveOpen) return `https://drive.google.com/uc?export=download&id=${driveOpen[1]}`;
    return u;
}

function CallRecordingPlayer({ url, subtitle }: { url: string; subtitle: string }) {
    // Playback attempt chain: direct URL → server proxy → open-in-new-tab fallback
    const direct = React.useMemo(() => normalizeAudioUrl(url), [url]);
    const proxied = `/api/recording?url=${encodeURIComponent(String(url || "").trim())}`;
    const [stage, setStage] = React.useState<"direct" | "proxy" | "failed">("direct");

    React.useEffect(() => { setStage("direct"); }, [url]);

    const src = stage === "direct" ? direct : proxied;

    return (
        <div style={{
            gridColumn: "1 / -1",
            border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff",
            padding: "14px 16px",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 9, background: "#4f46e5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, flexShrink: 0,
                }}>🎵</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>Call Recording</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", marginTop: 1 }}>{subtitle}</div>
                </div>
                <a
                    href={url} target="_blank" rel="noreferrer"
                    style={{
                        fontSize: 11.5, fontWeight: 700, color: "#4f46e5", textDecoration: "none",
                        border: "1px solid #c7d2fe", background: "#eef2ff", borderRadius: 7, padding: "5px 10px",
                        flexShrink: 0,
                    }}
                >
                    Open ↗
                </a>
            </div>

            {stage !== "failed" ? (
                <audio
                    key={src}
                    controls
                    preload="metadata"
                    src={src}
                    onError={() => setStage(s => (s === "direct" ? "proxy" : "failed"))}
                    style={{ width: "100%", height: 40, display: "block" }}
                />
            ) : (
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    border: "1px dashed #cbd5e1", borderRadius: 9, background: "#f8fafc",
                    padding: "10px 14px",
                }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                        Inline playback not supported for this link — open it in a new tab to listen.
                    </span>
                    <a
                        href={url} target="_blank" rel="noreferrer"
                        style={{
                            flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: "#fff",
                            background: "#4f46e5", borderRadius: 8, padding: "7px 14px", textDecoration: "none",
                        }}
                    >
                        🔊 Open Recording
                    </a>
                </div>
            )}
        </div>
    );
}

/* ── Outlined info card (matches CALL INFORMATION cards) ── */
function InfoCard({ label, value, full, valueColor }: {
    label: string; value: React.ReactNode; full?: boolean; valueColor?: string;
}) {
    return (
        <div style={{
            gridColumn: full ? "1 / -1" : undefined,
            border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff",
            padding: "10px 14px", minWidth: 0,
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>
                {label}
            </div>
            <div style={{
                fontSize: 13, fontWeight: 700, color: valueColor || "#1e293b",
                lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap",
            }}>
                {value}
            </div>
        </div>
    );
}

/* ── Section label with left accent bar ── */
function SectionLabel({ title }: { title: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3.5, height: 14, borderRadius: 2, background: "#4f46e5" }} />
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#4f46e5" }}>
                {title}
            </span>
        </div>
    );
}

/* ── Main modal ── */
export default function ViewModal({ row, onClose }: { row: LeadRow | null; onClose: () => void }) {
    if (!row) return null;
    const val = (v: unknown) => String(v ?? "").trim() || "—";
    const st = statusStyle(row.status);

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.55)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{
                background: "#fff", borderRadius: 14, width: "100%", maxWidth: 1140, maxHeight: "92vh",
                display: "flex", flexDirection: "column",
                boxShadow: "0 28px 70px rgba(0,0,0,0.3)", overflow: "hidden",
            }}>
                {/* ══ BODY: sidebar + right panel ══ */}
                <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

                    {/* ── LEFT SIDEBAR ── */}
                    <div style={{
                        width: 330, flexShrink: 0, borderRight: "1px solid #e8ecf3",
                        display: "flex", flexDirection: "column", overflowY: "auto",
                    }}>
                        <div style={{ padding: "22px 22px 16px", display: "flex", gap: 14 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: "50%", background: "#eef2f7",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, fontWeight: 800, color: "#185FA5", flexShrink: 0,
                            }}>
                                {initials(row.clientName)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
                                    {val(row.clientName)}
                                </div>
                                {row.mobile && (
                                    <a href={`tel:${row.mobile}`} style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#2563eb", textDecoration: "none", marginTop: 3 }}>
                                        {row.mobile}
                                    </a>
                                )}
                                {row.email && (
                                    <a href={`mailto:${row.email}`} style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#2563eb", textDecoration: "none", marginTop: 2, wordBreak: "break-all" }}>
                                        {row.email}
                                    </a>
                                )}
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#a21caf", marginTop: 6, lineHeight: 1.45 }}>
                                    {val(row.dataSource)}
                                </div>
                            </div>
                        </div>

                        {/* ID chip */}
                        <div style={{ padding: "0 22px 16px" }}>
                            <div style={{
                                display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca",
                                borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700,
                                color: "#dc2626", wordBreak: "break-all", lineHeight: 1.5,
                            }}>
                                ID: {val(row.id)}
                            </div>
                        </div>

                        {/* Doer / MR block */}
                        <div style={{ borderTop: "1px solid #e8ecf3", padding: "14px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: "#94a3b8", marginBottom: 3 }}>Doer Name</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{val(row.doerName)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.7, textTransform: "uppercase", color: "#94a3b8", marginBottom: 3 }}>Assign To MR</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{val(row.assignToMR)}</div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT PANEL ── */}
                    <div style={{ flex: 1, minWidth: 0, background: "#fbfcfe", display: "flex", flexDirection: "column", overflowY: "auto" }}>

                        {/* Top strip: date-time + status pill */}
                        <div style={{
                            margin: "18px 22px 0", border: "1px solid #fde68a", background: "#fffbeb",
                            borderRadius: 12, padding: "12px 16px",
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 30, height: 30, borderRadius: "50%", background: "#4f46e5",
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                                }}>📞</div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{val(row.dateTime)}</span>
                            </div>
                            <span style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                border: `1px solid ${st.border}`, background: st.bg, color: st.color,
                                borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 800,
                            }}>
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot }} />
                                {val(row.status)}
                            </span>
                        </div>

                        {/* LEAD INFORMATION */}
                        <div style={{ padding: "18px 22px 22px" }}>
                            <SectionLabel title="Lead Information" />
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                <InfoCard label="Time Stamp" value={val(row.timeStamp)} />
                                <InfoCard label="Enquiry Date & Time" value={val(row.dateTime)} />
                                <InfoCard label="Subjects" value={val(row.subjects)} />
                                <InfoCard label="WebSite Name" value={val(row.websiteName)} />
                                <InfoCard label="Data Source" value={val(row.dataSource)} full={false} />
                                <InfoCard
                                    label="Status"
                                    value={val(row.status)}
                                    valueColor={st.color}
                                />
                                <NotesCard raw={row.notes} />
                                <InfoCard label="Remarks - History" value={val(row.remarksHistory)} full />

                                {/* ── CALL RECORDING PLAYER ── */}
                                {row.ivrUrl && (
                                    <CallRecordingPlayer url={row.ivrUrl} subtitle={val(row.dateTime)} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══ FOOTER BAR ══ */}
                <div style={{
                    flexShrink: 0, borderTop: "1px solid #e8ecf3", background: "#fff",
                    padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>
                            Time Stamp{" "}
                            <span style={{ color: "#1e293b", fontSize: 12.5, textTransform: "none", letterSpacing: 0 }}>{val(row.timeStamp)}</span>
                        </span>
                        <span style={{ width: 1, height: 16, background: "#e2e8f0" }} />
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#94a3b8" }}>
                            Enquiry Date &amp; Time{" "}
                            <span style={{ color: "#1e293b", fontSize: 12.5, textTransform: "none", letterSpacing: 0 }}>{val(row.dateTime)}</span>
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: "none", borderRadius: 10, background: "#4f46e5", color: "#fff",
                            fontSize: 13.5, fontWeight: 800, padding: "10px 22px", cursor: "pointer",
                            boxShadow: "0 6px 16px rgba(79,70,229,0.35)",
                        }}
                    >
                        Close Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}