import React, { useState, useEffect } from "react";

const API_BASE = "https://script.google.com/macros/s/AKfycbwTbyuZ0czgJTMlo-UJPfd5ZaCEK-_aI5gCcl4q75k7YhQ3T3Q-fD3NRuxMC9cFqVNU/exec";

interface BookingDetail {
    piLink?: string;
    timestamp: string;
    bookingDateTime: string;
    bookingId: string;
    guestId: string;
    editId: string;
    editDateTime: string;
    bookingTakenBy: string;
    bookingStatus: string;
    bookingType: string;
    dataSource: string;
    clientCategory: string;
    clientType: string;

    nameOfClient: string;
    gender: string;
    dialCountryCode: string;
    mobile: string;
    email: string;
    isOPPatient: string;
    repeatClient: string;
    billingAddress: string;
    country: string;
    state: string;
    district: string;
    guestStatus: string;
    guestHistoryNote: string;
    uploadTestReportsLink: string;

    arrivalDate: string;
    departureDate: string;
    daysOfStay: string;
    packageType: string;
    roomNo: string;
    roomType: string;
    roomCategory: string;
    numberOfAdults: string;
    numberOfMale: string;
    numberOfFemale: string;
    numberOfChildren: string;
    purposeOfStay: string;
    programmePackageName: string;
    narration: string;

    groupBooking: string;
    attendeesBystander: string;
    nameOfBooker: string;
    bookerEmail: string;
    bookerPhoneNo: string;
    companyName: string;
    paymentTerms: string;
    paymentDate: string;

    totalBeforeDiscount: string;
    discountPercent: string;
    discountAmount: string;
    invoiceAmount: string;
    advance: string;
    balance: string;

    arrivalTime: string;
    arrivalMode: string;
    arrivalPickUp: string;
    arrivalRemarks: string;
    arrivalDetails: string;

    departureTime: string;
    departureMode: string;
    departurePickUp: string;
    departureRemarks: string;
    departureDetails: string;
    invoiceURL: string;
}

interface BookingDetailPopupProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    /** The booking object currently shown in the table — used to diff against fresh DB data */
    tableRowData?: Record<string, string | number | undefined | null>;
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        // ── wider padding ──
        padding: "16px 8px",
        zIndex: 9999,
        overflowY: "auto",          // only the OVERLAY scrolls (page-level)
    },
    modal: {
        background: "#ffffff",
        borderRadius: "12px",
        border: "0.5px solid #c7d2fe",
        width: "100%",
        maxWidth: "1400px",          // ── wider modal ──
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(49, 46, 129, 0.18)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    header: {
        background: "#eef2ff",
        borderBottom: "0.5px solid #c7d2fe",
        padding: "14px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap" as const,
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: 0,
    },
    headerIcon: {
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        background: "#4f46e5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#fff",
        fontSize: "18px",
    },
    headerTitle: {
        fontSize: "15px",
        fontWeight: 500,
        color: "#1e1b4b",
    },
    headerSubtitle: {
        fontSize: "11px",
        color: "#6366f1",
        marginTop: "2px",
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
    },
    badgeConfirmed: {
        fontSize: "11px",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "20px",
        background: "#d1fae5",
        color: "#065f46",
        border: "0.5px solid #6ee7b7",
        whiteSpace: "nowrap" as const,
    },
    badgeStatus: {
        fontSize: "11px",
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: "20px",
        background: "#e0e7ff",
        color: "#3730a3",
        border: "0.5px solid #a5b4fc",
        whiteSpace: "nowrap" as const,
    },
    // ── close button: bigger, clearly visible ──
    closeBtn: {
        width: "34px",
        height: "34px",
        borderRadius: "7px",
        border: "1.5px solid #6366f1",
        background: "#eef2ff",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#4338ca",
        fontSize: "15px",
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
        transition: "all 0.15s",
    },
    // ── body: NO internal scroll, just natural height ──
    body: {
        padding: "0",
    },
    section: {
        padding: "14px 24px",
        borderBottom: "0.5px solid #e0e7ff",
    },
    sectionLast: {
        padding: "14px 24px",
    },
    sectionTitle: {
        fontSize: "10.5px",
        fontWeight: 600,
        color: "#4f46e5",
        textTransform: "uppercase" as const,
        letterSpacing: "0.7px",
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "5px",
    },
    g6: {
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: "8px",
    },
    g3: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
    },
    splitRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0",
    },
    splitLeft: {
        paddingRight: "16px",
    },
    splitRight: {
        borderLeft: "0.5px solid #e0e7ff",
        paddingLeft: "16px",
    },
    splitSubTitle: {
        fontSize: "10.5px",
        fontWeight: 600,
        color: "#4f46e5",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    field: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "2px",
    },
    lbl: {
        fontSize: "10.5px",
        color: "#6366f1",
    },
    val: {
        fontSize: "12.5px",
        color: "#1e1b4b",
        padding: "5px 9px",
        background: "#f5f3ff",
        borderRadius: "5px",
        border: "0.5px solid #c7d2fe",
        minHeight: "29px",
        lineHeight: 1.4,
    },
    valAccent: {
        fontSize: "12.5px",
        color: "#4338ca",
        fontWeight: 500,
        padding: "5px 9px",
        background: "#eef2ff",
        borderRadius: "5px",
        border: "0.5px solid #a5b4fc",
        minHeight: "29px",
        lineHeight: 1.4,
    },
    valOk: {
        fontSize: "12.5px",
        color: "#065f46",
        padding: "5px 9px",
        background: "#ecfdf5",
        borderRadius: "5px",
        border: "0.5px solid #6ee7b7",
        minHeight: "29px",
        lineHeight: 1.4,
    },
    valDanger: {
        fontSize: "12.5px",
        color: "#991b1b",
        padding: "5px 9px",
        background: "#fef2f2",
        borderRadius: "5px",
        border: "0.5px solid #fca5a5",
        minHeight: "29px",
        lineHeight: 1.4,
    },
    valChanged: {
        fontSize: "12.5px",
        color: "#92400e",
        padding: "5px 9px",
        background: "#fffbeb",
        borderRadius: "5px",
        border: "1.5px solid #f59e0b",
        minHeight: "29px",
        lineHeight: 1.4,
        fontWeight: 500,
    },
    amtGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "8px",
    },
    amtCard: {
        padding: "10px 12px",
        background: "#f5f3ff",
        borderRadius: "7px",
        border: "0.5px solid #c7d2fe",
    },
    amtLabel: {
        fontSize: "10.5px",
        color: "#6366f1",
    },
    amtVal: {
        fontSize: "16px",
        fontWeight: 500,
        color: "#1e1b4b",
        marginTop: "3px",
    },
    footer: {
        padding: "10px 24px",
        background: "#eef2ff",
        borderTop: "0.5px solid #c7d2fe",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap" as const,
        gap: "8px",
    },
    footerMeta: {
        fontSize: "11px",
        color: "#6366f1",
        display: "flex",
        alignItems: "center",
        gap: "4px",
    },
    footerActions: {
        display: "flex",
        gap: "8px",
    },
    btnClose: {
        padding: "6px 14px",
        borderRadius: "6px",
        fontSize: "12.5px",
        cursor: "pointer",
        border: "0.5px solid #a5b4fc",
        background: "transparent",
        color: "#4f46e5",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: "5px",
    },
    btnPrint: {
        padding: "6px 14px",
        borderRadius: "6px",
        fontSize: "12.5px",
        cursor: "pointer",
        border: "0.5px solid #4f46e5",
        background: "#4f46e5",
        color: "#ffffff",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: "5px",
    },
};

// Helper: render a read-only field
const Field: React.FC<{
    label: string;
    value: string;
    variant?: "default" | "accent" | "ok" | "danger" | "empty" | "changed";
    style?: React.CSSProperties;
    oldValue?: string;
}> = ({ label, value, variant = "default", style, oldValue }) => {
    const valStyle =
        variant === "accent"
            ? styles.valAccent
            : variant === "ok"
                ? styles.valOk
                : variant === "danger"
                    ? styles.valDanger
                    : variant === "empty"
                        ? styles.valEmpty
                        : variant === "changed"
                            ? styles.valChanged
                            : styles.val;

    return (
        <div style={{ ...styles.field, ...style }}>
            <span style={styles.lbl}>
                {label}
                {variant === "changed" && (
                    <span title={`Table value: "${oldValue}"`} style={{
                        marginLeft: "4px",
                        fontSize: "10px",
                        background: "#f59e0b",
                        color: "#fff",
                        borderRadius: "3px",
                        padding: "1px 4px",
                        fontWeight: 600,
                        cursor: "help",
                    }}>
                        CHANGED
                    </span>
                )}
            </span>
            <span style={valStyle} title={variant === "changed" ? `Was: "${oldValue}"` : undefined}>
                {value || "—"}
                {variant === "changed" && oldValue && (
                    <span style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#b45309",
                        marginTop: "2px",
                        fontWeight: 400,
                    }}>
                        ↩ was: {oldValue || "—"}
                    </span>
                )}
            </span>
        </div>
    );
};

const BookingDetailPopup: React.FC<BookingDetailPopupProps> = ({
    isOpen,
    onClose,
    bookingId,
    tableRowData,
}) => {
    const [data, setData] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch booking data whenever popup opens with a bookingId
    useEffect(() => {
        if (!isOpen || !bookingId) return;

        setLoading(true);
        setError(null);
        setData(null);

        fetch(`${API_BASE}?action=getByBookingId&bookingId=${encodeURIComponent(bookingId)}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    setData(json.data);
                } else {
                    setError("No booking found for this ID.");
                }
            })
            .catch(() => setError("Failed to fetch booking details. Please try again."))
            .finally(() => setLoading(false));
    }, [isOpen, bookingId]);

    // Close on Escape
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handler);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handler);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Loading state
    if (loading) return (
        <div style={styles.overlay}>
            <div style={{ ...styles.modal, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                <div style={{ textAlign: "center", color: "#4f46e5", fontSize: "14px", padding: "48px" }}>
                    <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
                    Fetching booking details…
                </div>
            </div>
        </div>
    );

    // Error state
    if (error) return (
        <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ ...styles.modal, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
                <div style={{ textAlign: "center", padding: "48px" }}>
                    <div style={{ fontSize: "28px", marginBottom: "12px" }}>⚠️</div>
                    <div style={{ color: "#991b1b", fontSize: "14px", marginBottom: "16px" }}>{error}</div>
                    <button style={styles.btnClose} onClick={onClose}>✕ Close</button>
                </div>
            </div>
        </div>
    );

    // No data yet
    if (!data) return null;

    /**
     * diff helper — returns "changed" variant + the old table value when the
     * fresh DB value differs from what the table row showed.
     * Falls back to the supplied defaultVariant when values match or no
     * tableRowData was provided.
     */
    /**
     * Fields where the table snapshot value is derived from a DIFFERENT source
     * field than what the DB returns — comparing them would give false positives.
     * e.g. table stores booking.status ("confirmed") but DB bookingStatus is "Confirmed" / "Active" etc.
     */
    const SKIP_DIFF_KEYS = new Set(["bookingStatus", "guestStatus", "editId", "narration", "arrivalTime", "departureTime", "arrivalMode"]);

    /** Date fields — normalize before comparing so format differences don't trigger false positives */
    const DATE_KEYS = new Set([
        "arrivalDate", "departureDate", "bookingDateTime", "editDateTime",
        "timestamp", "paymentDate", "arrivalTime", "departureTime",
    ]);

    /** Normalize any date string to a comparable epoch ms (returns NaN if unparseable) */
    const toEpoch = (val: string): number => {
        const d = new Date(val);
        return isNaN(d.getTime()) ? NaN : d.getTime();
    };

    /** Core equality check — date-aware */
    const valuesEqual = (dbVal: string, tableVal: string, key: string): boolean => {
        if (dbVal === tableVal) return true;
        if (DATE_KEYS.has(key)) {
            const de = toEpoch(dbVal);
            const te = toEpoch(tableVal);
            if (!isNaN(de) && !isNaN(te)) return de === te;
        }
        return false;
    };

    const diff = (
        dbValue: string,
        tableKey: string,
        defaultVariant: "default" | "accent" | "ok" | "danger" | "empty" = "default"
    ): { variant: "default" | "accent" | "ok" | "danger" | "empty" | "changed"; oldValue?: string } => {
        if (!tableRowData || SKIP_DIFF_KEYS.has(tableKey)) return { variant: defaultVariant };
        const tableVal = String(tableRowData[tableKey] ?? "").trim();
        const dbVal = String(dbValue ?? "").trim();
        if (tableVal !== "" && !valuesEqual(dbVal, tableVal, tableKey)) {
            return { variant: "changed", oldValue: tableVal };
        }
        return { variant: defaultVariant };
    };

    // Count how many fields actually changed (using same smart comparison)
    const changedCount = tableRowData
        ? Object.keys(data).filter((key) => {
            if (SKIP_DIFF_KEYS.has(key)) return false;
            const tableVal = String(tableRowData[key] ?? "").trim();
            const dbVal = String((data as any)[key] ?? "").trim();
            return tableVal !== "" && !valuesEqual(dbVal, tableVal, key);
        }).length
        : 0;

    return (
        <div
            style={styles.overlay}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div style={styles.modal} role="dialog" aria-modal="true">

                {/* ── HEADER ── */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.headerIcon}>🏨</div>
                        <div>
                            <div style={styles.headerTitle}>
                                Booking details —{" "}
                                <span style={{ color: "#4f46e5" }}>{data.bookingId}</span>
                            </div>
                            <div style={styles.headerSubtitle}>
                                Recorded: {data.bookingDateTime}&nbsp;·&nbsp;Last edited:{" "}
                                {data.editDateTime}
                            </div>
                        </div>
                    </div>
                    <div style={styles.headerRight}>
                        {(data.invoiceURL || data.piLink || tableRowData?.piLink) && (() => {
                            const piUrl = data.invoiceURL || String(data.piLink || tableRowData?.piLink || "");
                            return (
                                <a
                                    href={piUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        fontSize: "11px",
                                        fontWeight: 500,
                                        padding: "3px 12px",
                                        borderRadius: "20px",
                                        background: "#3b82f6",
                                        color: "#ffffff",
                                        border: "0.5px solid #2563eb",
                                        whiteSpace: "nowrap",
                                        textDecoration: "none",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        cursor: "pointer"
                                    }}
                                >
                                    📄 View PI
                                </a>
                            );
                        })()}
                        <span style={styles.badgeConfirmed}>{data.bookingStatus}</span>
                        <span style={styles.badgeStatus}>{data.guestStatus}</span>
                        {changedCount > 0 && (
                            <span title="These fields have been updated in the DB since the table last loaded" style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "3px 10px",
                                borderRadius: "20px",
                                background: "#fffbeb",
                                color: "#92400e",
                                border: "1.5px solid #f59e0b",
                                whiteSpace: "nowrap" as const,
                            }}>
                                ⚡ {changedCount} changed
                            </span>
                        )}
                        <button
                            style={styles.closeBtn}
                            onClick={onClose}
                            aria-label="Close"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* ── BODY (no internal scroll — overlay handles scrolling) ── */}
                <div style={styles.body}>

                    {/* SECTION 1 — Booking Information */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📋 Booking information</div>
                        <div style={styles.g6}>
                            <Field label="Timestamp" value={data.timestamp} {...diff(data.timestamp, "timestamp")} />
                            <Field label="Booking date & time" value={data.bookingDateTime} {...diff(data.bookingDateTime, "bookingDateTime")} />
                            <Field label="Booking ID" value={data.bookingId} {...diff(data.bookingId, "bookingId", "accent")} />
                            <Field label="Guest ID" value={data.guestId} {...diff(data.guestId, "guestId")} />
                            <Field label="Edit ID" value={data.editId} {...diff(data.editId, "editId")} />
                            <Field label="Edit date & time" value={data.editDateTime} {...diff(data.editDateTime, "editDateTime")} />
                            <Field label="Booking taken by" value={data.bookingTakenBy} {...diff(data.bookingTakenBy, "bookingTakenBy")} />
                            <Field label="Booking status" value={data.bookingStatus} {...diff(data.bookingStatus, "bookingStatus", "ok")} />
                            <Field label="Booking type" value={data.bookingType} {...diff(data.bookingType, "bookingType")} />
                            <Field label="Data source" value={data.dataSource} {...diff(data.dataSource, "dataSource")} />
                            <Field label="Client category" value={data.clientCategory} {...diff(data.clientCategory, "clientCategory")} />
                            <Field label="Client type" value={data.clientType} {...diff(data.clientType, "clientType")} />
                        </div>
                    </div>

                    {/* SECTION 2 — Guest Details */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>👤 Guest details</div>
                        <div style={styles.g6}>
                            <Field label="Name of client" value={data.nameOfClient} {...diff(data.nameOfClient, "nameOfClient", "accent")} />
                            <Field label="Gender" value={data.gender} {...diff(data.gender, "gender")} />
                            <Field label="Dial country code" value={data.dialCountryCode} {...diff(data.dialCountryCode, "dialCountryCode")} />
                            <Field label="Mobile" value={data.mobile} {...diff(data.mobile, "mobile")} />
                            <Field label="Is OP patient" value={data.isOPPatient} {...diff(data.isOPPatient, "isOPPatient")} />
                            <Field label="Repeat client" value={data.repeatClient} {...diff(data.repeatClient, "repeatClient", "ok")} />
                            <Field
                                label="Email"
                                value={data.email}
                                style={{ gridColumn: "span 2" }}
                                {...diff(data.email, "email")}
                            />
                            <Field
                                label="Billing address"
                                value={data.billingAddress}
                                style={{ gridColumn: "span 2" }}
                                {...diff(data.billingAddress, "billingAddress")}
                            />
                            <Field label="Country" value={data.country} {...diff(data.country, "country")} />
                            <Field label="State" value={data.state} {...diff(data.state, "state")} />
                            <Field label="District" value={data.district} {...diff(data.district, "district")} />
                            <Field label="Guest status" value={data.guestStatus} {...diff(data.guestStatus, "guestStatus", "ok")} />
                            <Field
                                label="Guest history note"
                                value={data.guestHistoryNote}
                                style={{ gridColumn: "span 3" }}
                                {...diff(data.guestHistoryNote, "guestHistoryNote")}
                            />
                            <Field
                                label="Upload test reports link"
                                value={data.uploadTestReportsLink}
                                style={{ gridColumn: "span 3" }}
                                {...diff(data.uploadTestReportsLink, "uploadTestReportsLink", "accent")}
                            />
                        </div>
                    </div>

                    {/* SECTION 3 — Stay & Package */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>🛏 Stay & package details</div>
                        <div style={styles.g6}>
                            <Field label="Arrival date" value={data.arrivalDate} {...diff(data.arrivalDate, "arrivalDate")} />
                            <Field label="Departure date" value={data.departureDate} {...diff(data.departureDate, "departureDate")} />
                            <Field label="Days of stay" value={data.daysOfStay} {...diff(data.daysOfStay, "daysOfStay", "accent")} />
                            <Field label="Package type" value={data.packageType} {...diff(data.packageType, "packageType")} />
                            <Field label="Room no." value={data.roomNo} {...diff(data.roomNo, "roomNo")} />
                            <Field label="Room type" value={data.roomType} {...diff(data.roomType, "roomType")} />
                            <Field label="Room category" value={data.roomCategory} {...diff(data.roomCategory, "roomCategory")} />
                            <Field label="Number of adults" value={data.numberOfAdults} {...diff(data.numberOfAdults, "numberOfAdults")} />
                            <Field label="Number of male" value={data.numberOfMale} {...diff(data.numberOfMale, "numberOfMale")} />
                            <Field label="Number of female" value={data.numberOfFemale} {...diff(data.numberOfFemale, "numberOfFemale")} />
                            <Field label="Number of children" value={data.numberOfChildren} {...diff(data.numberOfChildren, "numberOfChildren")} />
                            <Field label="Purpose of stay" value={data.purposeOfStay} {...diff(data.purposeOfStay, "purposeOfStay")} />
                            <Field
                                label="Programme / package name"
                                value={data.programmePackageName}
                                style={{ gridColumn: "span 3" }}
                                {...diff(data.programmePackageName, "programmePackageName")}
                            />
                            <Field
                                label="Narration"
                                value={data.narration}
                                style={{ gridColumn: "span 3" }}
                                {...diff(data.narration, "narration")}
                            />
                        </div>
                    </div>

                    {/* SECTION 4 — Group, Booker & Payment Terms */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>👥 Group, booker & payment terms</div>
                        <div style={styles.g6}>
                            <Field label="Group booking (no. of people)" value={data.groupBooking} {...diff(data.groupBooking, "groupBooking", data.groupBooking ? "default" : "empty")} />
                            <Field label="Attendees & bystander" value={data.attendeesBystander} {...diff(data.attendeesBystander, "attendeesBystander")} />
                            <Field label="Name of booker" value={data.nameOfBooker} {...diff(data.nameOfBooker, "nameOfBooker")} />
                            <Field label="Booker phone no." value={data.bookerPhoneNo} {...diff(data.bookerPhoneNo, "bookerPhoneNo")} />
                            <Field label="Payment terms" value={data.paymentTerms} {...diff(data.paymentTerms, "paymentTerms")} />
                            <Field label="Payment date (to be paid)" value={data.paymentDate} {...diff(data.paymentDate, "paymentDate")} />
                            <Field
                                label="Booker email"
                                value={data.bookerEmail}
                                style={{ gridColumn: "span 2" }}
                                {...diff(data.bookerEmail, "bookerEmail")}
                            />
                            <Field
                                label="Company name"
                                value={data.companyName}
                                style={{ gridColumn: "span 2" }}
                                {...diff(data.companyName, "companyName")}
                            />
                        </div>
                    </div>

                    {/* SECTION 5 — Payment Breakdown */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>💰 Payment breakdown</div>
                        <div style={styles.amtGrid}>
                            {[
                                { label: "Total before discount", value: data.totalBeforeDiscount, color: "#1e1b4b", key: "totalBeforeDiscount" },
                                { label: "Discount %", value: data.discountPercent, color: "#1e1b4b", key: "discountPercent" },
                                { label: "Discount amount", value: data.discountAmount, color: "#1e1b4b", key: "discountAmount" },
                                { label: "Invoice amount", value: data.invoiceAmount, color: "#4338ca", key: "invoiceAmount" },
                                { label: "Advance paid", value: data.advance, color: "#065f46", key: "advance" },
                                { label: "Balance due", value: data.balance, color: "#991b1b", key: "balance" },
                            ].map((item) => {
                                const tableVal = tableRowData ? String(tableRowData[item.key] ?? "").trim() : "";
                                const isChanged = tableRowData && tableVal !== "" && String(item.value ?? "").trim() !== tableVal;
                                return (
                                    <div key={item.label} style={{
                                        ...styles.amtCard,
                                        ...(isChanged ? {
                                            background: "#fffbeb",
                                            border: "1.5px solid #f59e0b",
                                        } : {}),
                                    }}>
                                        <div style={{ ...styles.amtLabel, display: "flex", alignItems: "center", gap: "4px" }}>
                                            {item.label}
                                            {isChanged && (
                                                <span title={`Table value: "${tableVal}"`} style={{
                                                    fontSize: "9px",
                                                    background: "#f59e0b",
                                                    color: "#fff",
                                                    borderRadius: "3px",
                                                    padding: "1px 4px",
                                                    fontWeight: 700,
                                                    cursor: "help",
                                                }}>
                                                    CHANGED
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ ...styles.amtVal, color: isChanged ? "#92400e" : item.color }}>
                                            {item.value}
                                        </div>
                                        {isChanged && (
                                            <div style={{ fontSize: "10px", color: "#b45309", marginTop: "2px" }}>
                                                ↩ was: {tableVal}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 6 — Arrival & Departure */}
                    <div style={styles.sectionLast}>
                        <div style={styles.sectionTitle}>✈️ Arrival & departure details</div>
                        <div style={styles.splitRow}>
                            {/* Arrival */}
                            <div style={styles.splitLeft}>
                                <div style={styles.splitSubTitle}>🛬 Arrival</div>
                                <div style={styles.g3}>
                                    <Field label="Arrival time" value={data.arrivalTime} {...diff(data.arrivalTime, "arrivalTime")} />
                                    <Field label="Arrival mode" value={data.arrivalMode} {...diff(data.arrivalMode, "arrivalMode")} />
                                    <Field label="Arrival pickup" value={data.arrivalPickUp} {...diff(data.arrivalPickUp, "arrivalPickUp", "ok")} />
                                    <Field
                                        label="Arrival remarks"
                                        value={data.arrivalRemarks}
                                        style={{ gridColumn: "1 / -1" }}
                                        {...diff(data.arrivalRemarks, "arrivalRemarks")}
                                    />
                                    <Field
                                        label="Arrival details"
                                        value={data.arrivalDetails}
                                        style={{ gridColumn: "1 / -1" }}
                                        {...diff(data.arrivalDetails, "arrivalDetails")}
                                    />
                                </div>
                            </div>
                            {/* Departure */}
                            <div style={styles.splitRight}>
                                <div style={{ ...styles.splitSubTitle, color: "#6366f1" }}>🛫 Departure</div>
                                <div style={styles.g3}>
                                    <Field label="Departure time" value={data.departureTime} {...diff(data.departureTime, "departureTime")} />
                                    <Field label="Departure mode" value={data.departureMode} {...diff(data.departureMode, "departureMode")} />
                                    <Field label="Departure pickup" value={data.departurePickUp} {...diff(data.departurePickUp, "departurePickUp", "ok")} />
                                    <Field
                                        label="Departure remarks"
                                        value={data.departureRemarks}
                                        style={{ gridColumn: "1 / -1" }}
                                        {...diff(data.departureRemarks, "departureRemarks")}
                                    />
                                    <Field
                                        label="Departure details"
                                        value={data.departureDetails}
                                        style={{ gridColumn: "1 / -1" }}
                                        {...diff(data.departureDetails, "departureDetails")}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>{/* /body */}

                {/* ── FOOTER ── */}
                <div style={styles.footer}>
                    <span style={styles.footerMeta}>
                        🕐 Last updated: {data.editDateTime} &nbsp;·&nbsp;
                    </span>
                    <div style={styles.footerActions}>
                        <button style={styles.btnClose} onClick={onClose}>
                            ✕ Close
                        </button>
                        <button style={styles.btnPrint} onClick={() => window.print()}>
                            🖨 Print
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BookingDetailPopup;