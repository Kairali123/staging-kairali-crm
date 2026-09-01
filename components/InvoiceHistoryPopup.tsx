"use client";

import React, { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceRow {
    bookingId: string;
    rowNumber: number;
    invoiceNumber: string;
    invoiceUrl: string;
    timesGenerated: number;
    piDate: string;
    editByPMS: boolean;
    editByHTMLForm: boolean;
    editBy: string;
    invoiceAmount: number;
}

export interface InvoiceHistoryPopupProps {
    open: boolean;
    onClose: () => void;
    bookingId: string;
    guestName: string;
    mobile: string;
    // Optional: if not passed, the popup fetches live data from
    // /api/invoice-history?bookingId=... (ktahv_invoicing_format table)
    rows?: InvoiceRow[];
}

// ─── Palette (KServe indigo theme) ───────────────────────────────────────────
const C = {
    hdrFrom: "#2d1b6e",
    hdrTo: "#6d3bbd",
    hdrMid: "#4c2fa0",
    theadBg: "#1a0f4e",
    closeBtnBg: "rgba(255,255,255,0.12)",
    closeBtnBor: "rgba(255,255,255,0.28)",
    pillBg: "rgba(255,255,255,0.10)",
    pillBor: "rgba(255,255,255,0.20)",
    pillLabel: "rgba(255,255,255,0.55)",
    activePill: "rgba(109,59,189,0.55)",
    stripBg: "#f7f6ff",
    stripBor: "#e8e6f9",
    stripLabel: "#6b6b9a",
    stripStrong: "#2d1b6e",
    stripAmt: "#4c2fa0",
    bodyBg: "#ffffff",
    rowAlt: "#faf9ff",
    rowHover: "#f0edff",
    rowBor: "#eeecf8",
    cellBor: "#eeecf8",
    cellText: "#1a1a2e",
    monoText: "#6b6b9a",
    invBadgeBg: "#ede9fe",
    invBadgeTx: "#4c2fa0",
    linkColor: "#7c3aed",
    checkYesBg: "#5b21b6",
    checkNoBg: "#f3f2ff",
    checkNoBor: "#ddd8f5",
    checkNoTx: "#a0a0c0",
    avatarBg: "#ede9fe",
    avatarTx: "#4c2fa0",
    amountTx: "#2d1b6e",
    ftrBg: "#faf9ff",
    ftrBor: "#eeecf8",
    ftrText: "#6b6b9a",
    ftrStrong: "#2d1b6e",
    closeBtnMain: "#4c2fa0",
    closeBtnHov: "#6d3bbd",
    modalBorder: "#e0e0f0",
    overlayBg: "rgba(15,10,40,0.55)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);

// Parses "DD-MM-YY(YY) HH:mm:ss" or "DD/MM/YYYY HH:mm:ss" (assumed UTC) and
// renders it in Asia/Kolkata time, formatted professionally.
const formatPiDate = (piDate: string) => {
    if (!piDate) return "—";
    const match = piDate.match(/^(\d{2})[-/](\d{2})[-/](\d{2,4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return piDate;

    const [, d, mo, y, h, mi, s] = match;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const utcDate = new Date(Date.UTC(
        year, parseInt(mo, 10) - 1, parseInt(d, 10),
        parseInt(h, 10), parseInt(mi, 10), parseInt(s, 10)
    ));
    if (isNaN(utcDate.getTime())) return piDate;

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(utcDate);
};

const CheckIcon = ({ active }: { active: boolean }) =>
    active ? (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 21,
                height: 21,
                borderRadius: 5,
                background: C.checkYesBg,
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
            }}
        >
            ✓
        </span>
    ) : (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 21,
                height: 21,
                borderRadius: 5,
                background: C.checkNoBg,
                border: `1.5px solid ${C.checkNoBor}`,
                color: C.checkNoTx,
                fontSize: 11,
            }}
        >
            —
        </span>
    );

const GeneratedBadge = ({ count }: { count: number }) => (
    <span
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 28,
            height: 22,
            borderRadius: 99,
            background: count > 1 ? "#fff7ed" : "#f0fdf4",
            color: count > 1 ? "#c2410c" : "#15803d",
            fontWeight: 700,
            fontSize: 11,
            padding: "0 8px",
            border: `1.5px solid ${count > 1 ? "#fed7aa" : "#bbf7d0"}`,
        }}
    >
        {count}×
    </span>
);

// ─── Table cell helper ────────────────────────────────────────────────────────

const Td: React.FC<{
    children: React.ReactNode;
    mono?: boolean;
    center?: boolean;
    style?: React.CSSProperties;
}> = ({ children, mono, center, style }) => (
    <td
        style={{
            padding: "10px 13px",
            verticalAlign: "middle",
            whiteSpace: "nowrap",
            fontFamily: mono ? "monospace" : "inherit",
            fontSize: mono ? 11 : 12,
            textAlign: center ? "center" : "left",
            color: mono ? C.monoText : C.cellText,
            borderRight: `0.5px solid ${C.cellBor}`,
            ...style,
        }}
    >
        {children}
    </td>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const InvoiceHistoryPopup: React.FC<InvoiceHistoryPopupProps> = ({
    open,
    onClose,
    bookingId,
    guestName,
    mobile,
    rows: rowsProp,
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const [fetchedRows, setFetchedRows] = React.useState<InvoiceRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    // Fetch live data from MySQL (ktahv_invoicing_format) when no rows prop is supplied
    useEffect(() => {
        if (!open || rowsProp || !bookingId) return;

        let cancelled = false;
        const fetchInvoices = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/invoice-history?bookingId=${encodeURIComponent(bookingId)}`
                );
                if (!res.ok) throw new Error("Failed to fetch invoice history");
                const data = await res.json();
                if (!cancelled) setFetchedRows(data.rows ?? []);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError("Could not load invoice history. Please try again.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchInvoices();
        return () => { cancelled = true; };
    }, [open, bookingId, rowsProp]);

    if (!open) return null;

    const rows = rowsProp ?? fetchedRows;
    const totalAmount = rows.reduce((s, r) => s + r.invoiceAmount, 0);

    const pills = [
        { label: "Booking ID", value: bookingId, amber: true, active: false },
        { label: "Guest Name", value: guestName, amber: false, active: false },
        { label: "Mobile", value: mobile, amber: false, active: false },
        { label: "Records Found", value: `${rows.length} Invoice${rows.length !== 1 ? "s" : ""}`, amber: false, active: true },
        { label: "Total Billed", value: currency(totalAmount), amber: true, active: false },
    ];

    const theadCols = [
        // "Booking ID", "Row #",
        "Invoice No.", "Invoice URL",
        "Generated", "PI Date", "Edit by PMS", "Edit by Form", "Edited By", "Amount",
    ];

    return (
        <div
            ref={overlayRef}
            onClick={(e) => e.target === overlayRef.current && onClose()}
            style={{
                position: "fixed",
                inset: 0,
                background: C.overlayBg,
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 16,
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Invoice History"
                style={{
                    width: "100%",
                    maxWidth: 980,
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 16,
                    border: `1px solid ${C.modalBorder}`,
                    boxShadow: "0 12px 48px rgba(45,27,110,0.22)",
                    overflow: "hidden",
                    fontFamily: "'Inter','Segoe UI',sans-serif",
                    background: C.bodyBg,
                }}
            >

                {/* ── Header ── */}
                <div
                    style={{
                        background: `linear-gradient(135deg, ${C.hdrFrom} 0%, ${C.hdrMid} 60%, ${C.hdrTo} 100%)`,
                        padding: "18px 22px 16px",
                        position: "relative",
                        overflow: "hidden",
                        flexShrink: 0,
                    }}
                >
                    {/* decorative circle */}
                    <div style={{
                        position: "absolute",
                        right: -50,
                        top: -50,
                        width: 200,
                        height: 200,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.05)",
                        pointerEvents: "none",
                    }} />

                    {/* left accent bar — reinforces this is a billing/PI document */}
                    <div style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        background: "#fde68a",
                    }} />

                    {/* PI / Invoice identity label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: "rgba(253,230,138,0.2)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                        }}>
                            🧾
                        </span>
                        <span style={{
                            color: "#fde68a",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                        }}>
                            Proforma Invoice (PI) History
                        </span>
                    </div>

                    {/* breadcrumb */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{
                            background: "rgba(255,255,255,0.18)",
                            color: "#e8d5ff",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.07em",
                            padding: "3px 9px",
                            borderRadius: 5,
                            textTransform: "uppercase",
                        }}>
                            KTAHV-PMS
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>·</span>
                        <span style={{
                            color: "rgba(255,255,255,0.55)",
                            fontSize: 11,
                            fontWeight: 500,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                        }}>
                            Invoice History — Detailed View
                        </span>
                    </div>

                    {/* title */}
                    <div style={{
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 18,
                        letterSpacing: "-0.2px",
                        marginBottom: 14,
                    }}>
                        {bookingId} · {guestName} · Invoice Records
                    </div>

                    {/* pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {pills.map(({ label, value, amber, active }) => (
                            <div
                                key={label}
                                style={{
                                    background: active ? C.activePill : C.pillBg,
                                    border: `1px solid ${active ? "rgba(255,255,255,0.35)" : C.pillBor}`,
                                    borderRadius: 9,
                                    padding: "5px 14px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2,
                                }}
                            >
                                <span style={{
                                    color: C.pillLabel,
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                }}>
                                    {label}
                                </span>
                                <span style={{
                                    color: amber ? "#fde68a" : "#fff",
                                    fontWeight: 700,
                                    fontSize: 13,
                                }}>
                                    {value}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* close button */}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            position: "absolute",
                            top: 16,
                            right: 16,
                            background: C.closeBtnBg,
                            border: `1.5px solid ${C.closeBtnBor}`,
                            color: "#fff",
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            cursor: "pointer",
                            fontSize: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
                        onMouseLeave={e => (e.currentTarget.style.background = C.closeBtnBg)}
                    >
                        ✕
                    </button>
                </div>

                {/* ── Perforated divider (receipt motif) ── */}
                <div style={{
                    padding: "6px 22px",
                    background: `repeating-linear-gradient(90deg, ${C.stripBg} 0 6px, transparent 6px 12px)`,
                    borderBottom: `0.5px dashed ${C.rowBor}`,
                    flexShrink: 0,
                }} />

                {/* ── Table ── */}
                <div style={{ overflowX: "auto", overflowY: "auto" }}>
                    {loading && (
                        <div style={{
                            textAlign: "center",
                            padding: "52px 24px",
                            color: C.monoText,
                            fontSize: 14,
                        }}>
                            Loading invoice records…
                        </div>
                    )}

                    {!loading && error && (
                        <div style={{
                            textAlign: "center",
                            padding: "52px 24px",
                            color: "#c2410c",
                            fontSize: 14,
                        }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 12,
                            minWidth: 780,
                        }}>
                            <thead>
                                <tr style={{ background: C.theadBg, position: "sticky", top: 0, zIndex: 1 }}>
                                    {theadCols.map((h) => (
                                        <th
                                            key={h}
                                            style={{
                                                padding: "10px 13px",
                                                textAlign: "left",
                                                color: "rgba(255,255,255,0.82)",
                                                fontWeight: 600,
                                                fontSize: 10,
                                                letterSpacing: "0.06em",
                                                textTransform: "uppercase",
                                                whiteSpace: "nowrap",
                                                borderRight: "1px solid rgba(255,255,255,0.07)",
                                            }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr
                                        key={row.rowNumber}
                                        style={{
                                            background: i % 2 === 0 ? C.bodyBg : C.rowAlt,
                                            borderBottom: `1px solid ${C.rowBor}`,
                                            transition: "background 0.12s",
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = C.rowHover)}
                                        onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? C.bodyBg : C.rowAlt)}
                                    >
                                        {/* <Td>{row.bookingId}</Td> */}
                                        {/* <Td mono>{row.rowNumber}</Td> */}

                                        {/* Invoice number badge */}
                                        <Td>
                                            <span style={{
                                                background: C.invBadgeBg,
                                                color: C.invBadgeTx,
                                                fontWeight: 600,
                                                fontSize: 11,
                                                padding: "3px 8px",
                                                borderRadius: 5,
                                                fontFamily: "monospace",
                                                letterSpacing: "0.02em",
                                            }}>
                                                {row.invoiceNumber}
                                            </span>
                                        </Td>

                                        {/* Invoice URL */}
                                        <Td>
                                            <a
                                                href={row.invoiceUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: C.linkColor,
                                                    fontWeight: 600,
                                                    fontSize: 12,
                                                    textDecoration: "none",
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                                                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                                            >
                                                View ↗
                                            </a>
                                        </Td>

                                        <Td center><GeneratedBadge count={row.timesGenerated} /></Td>
                                        <Td mono>{formatPiDate(row.piDate)}</Td>
                                        <Td center><CheckIcon active={row.editByPMS} /></Td>
                                        <Td center><CheckIcon active={row.editByHTMLForm} /></Td>

                                        {/* Edited by */}
                                        <Td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                                <span style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: "50%",
                                                    background: C.avatarBg,
                                                    color: C.avatarTx,
                                                    fontWeight: 700,
                                                    fontSize: 10,
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}>
                                                    {row.editBy.charAt(0)}
                                                </span>
                                                <span style={{ color: C.cellText, fontWeight: 500 }}>{row.editBy}</span>
                                            </div>
                                        </Td>

                                        {/* Amount */}
                                        <Td style={{ fontWeight: 700, color: C.amountTx }}>
                                            {currency(row.invoiceAmount)}
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {!loading && !error && rows.length === 0 && (
                        <div style={{
                            textAlign: "center",
                            padding: "52px 24px",
                            color: C.monoText,
                            fontSize: 14,
                        }}>
                            No invoice records found for this booking.
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: "13px 22px",
                    borderTop: `1px solid ${C.ftrBor}`,
                    background: C.ftrBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: 12, color: C.ftrText }}>
                        🧾 PI / Invoice Ledger — Showing{" "}
                        <strong style={{ color: C.ftrStrong, fontWeight: 600 }}>1–{rows.length}</strong>
                        {" "}of{" "}
                        <strong style={{ color: C.ftrStrong, fontWeight: 600 }}>{rows.length}</strong>
                        {" "}invoice records
                    </span>
                    <button
                        onClick={onClose}
                        style={{
                            background: C.closeBtnMain,
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "9px 26px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "0.02em",
                            transition: "background 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.closeBtnHov)}
                        onMouseLeave={e => (e.currentTarget.style.background = C.closeBtnMain)}
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default InvoiceHistoryPopup;


// ─── Demo / Preview ───────────────────────────────────────────────────────────
// Remove this section when integrating into your project

export const InvoiceHistoryPopupDemo: React.FC = () => {
    const [open, setOpen] = React.useState(false);

    const demoRows: InvoiceRow[] = [
        {
            bookingId: "KTAHV-PMS-8043",
            rowNumber: 12756,
            invoiceNumber: "KR/26-27/02/107",
            invoiceUrl: "#",
            timesGenerated: 1,
            piDate: "15/02/2026 20:29:36",
            editByPMS: true,
            editByHTMLForm: false,
            editBy: "Sadik Rehman",
            invoiceAmount: 117756,
        },
        {
            bookingId: "KTAHV-PMS-8043",
            rowNumber: 13303,
            invoiceNumber: "KR/26-27/02/107",
            invoiceUrl: "#",
            timesGenerated: 2,
            piDate: "04-10-26 04:49:18",
            editByPMS: true,
            editByHTMLForm: false,
            editBy: "Sadik Rehman",
            invoiceAmount: 29439,
        },
    ];

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, sans-serif",
            background: "#f4f5fb",
        }}>
            <button
                onClick={() => setOpen(true)}
                style={{
                    background: "#4c2fa0",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 28px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                Open Invoice History
            </button>

            <InvoiceHistoryPopup
                open={open}
                onClose={() => setOpen(false)}
                bookingId="KTAHV-PMS-8043"
                guestName="MR. FARAH"
                mobile="9650039167"
                rows={demoRows}
            />
        </div>
    );
};