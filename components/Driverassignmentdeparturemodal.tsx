import React, { useState, type ReactNode } from "react";
import { Repeat, X, FileText, Send, Check, Loader2, Contact, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Guest } from "@/types/crr";

const DRIVERS = ["SUJITH", "Babu", "SHIV DAS", "Anil"];
const DROP_LOCATIONS = ["Airport - Coimbatore", "Airport - Cochin", "Rail"];

// Fallback if no user is logged in
const ASSIGNED_BY = "Manoj Nair (FOM)";

const LOCKED_DETAILS = {
    bookingId: "KTAHV-PMS-5453",
    nameOfClient: "MR. ARUN AGARWAL",
    mobile: "9811834735",
    piLink: "#",
    package: "Holistic Treatment For Rejuvenation & Detoxification-Double",
};

const SECTION_THEME = { bg: "#eff6ff", border: "#93c5fd", head: "#1d4ed8" };

function Label({ required, children }: { required?: boolean; children: ReactNode }) {
    return (
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>
            {children} {required && <span style={{ color: "#ef4444", fontWeight: 700 }}>*</span>}
        </label>
    );
}

const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "2px solid #334155",
    background: "#ffffff",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    fontWeight: 500,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
};

const inputStyle = { ...selectStyle };

const textareaStyle: React.CSSProperties = {
    ...selectStyle,
    minHeight: 60,
    resize: "vertical",
    fontFamily: "inherit",
};

const readonlyBoxStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontSize: 14,
    color: "#334155",
    fontWeight: 600,
};

const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
const row3 = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 };

const MOBILE_REGEX = /^[6-9]\d{9}$/;

interface DriverAssignmentDepartureModalProps {
    open?: boolean;
    onClose?: () => void;
    onSubmit?: (data: Record<string, string>) => void | Promise<void>;
    guest?: Guest | null;
    disabled?: boolean;
}

export default function DriverAssignmentDepartureModal({ open = true, onClose = () => { }, onSubmit = () => { }, guest = null, disabled = false }: DriverAssignmentDepartureModalProps) {
    const { user } = useAuth();
    const details = guest ? {
        bookingId: guest.bookingId,
        nameOfClient: guest.name,
        mobile: guest.mobile,
        piLink: guest.piLink || "#",
        package: guest.programme,
    } : LOCKED_DETAILS;

    const saved = guest?.driverAssignmentDeparture;
    const isComplete = guest?.stageStatus?.[9] === "Complete";
    const isProcessing = guest?.stageStatus?.[9] === "Processing";

    const [dropRequired, setDropRequired] = useState(saved?.dropRequired ? saved.dropRequired.toLowerCase() : "");
    const [driverName, setDriverName] = useState(saved?.driverName || "");
    const [driverContact, setDriverContact] = useState(saved?.driverContact || "");
    const [dropTo, setDropTo] = useState(saved?.dropTo || "");
    const [dropDate, setDropDate] = useState(saved?.dropDate || "");
    const [dropTime, setDropTime] = useState(saved?.dropTime || "");
    const [remarks, setRemarks] = useState(saved?.remarks || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!open) return null;

    const contactError = driverContact.trim() !== "" && !MOBILE_REGEX.test(driverContact.trim());

    const isValid = () => {
        if (!dropRequired) return false;
        if (dropRequired === "yes") {
            if (!driverName) return false;
            if (!driverContact.trim() || !MOBILE_REGEX.test(driverContact.trim())) return false;
            if (!dropTo) return false;
            if (!dropDate) return false;
            if (!dropTime) return false;
            if (!remarks.trim()) return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!isValid() || isSubmitting) return;
        setIsSubmitting(true);
        onSubmit({
            dropRequired,
            driverName: dropRequired === "yes" ? driverName : "",
            driverContact: dropRequired === "yes" ? driverContact : "",
            dropTo: dropRequired === "yes" ? dropTo : "",
            dropDate: dropRequired === "yes" ? dropDate : "",
            dropTime: dropRequired === "yes" ? dropTime : "",
            remarks: dropRequired === "yes" ? remarks : "",
            assignedBy: dropRequired === "yes" ? (saved?.assignedBy || user?.name || ASSIGNED_BY) : "",
        });
    };

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 50,
                minHeight: 420,
                background: "rgba(30,32,60,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                fontFamily: "system-ui, -apple-system, sans-serif",
            }}
        >
            <div
                style={{
                    width: 1180,
                    maxWidth: "95vw",
                    maxHeight: "88vh",
                    background: "#ffffff",
                    borderRadius: 20,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Header - stays fixed while body scrolls */}
                <div
                    style={{
                        background: "linear-gradient(135deg, #7a72e0, #6259d6)",
                        borderRadius: "20px 20px 0 0",
                        padding: "20px 24px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", gap: 12 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "rgba(255,255,255,0.18)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Repeat size={18} color="#fff" />
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>
                                    Driver Assignment – Departure Drop
                                </p>
                                {isComplete ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: "rgba(16, 185, 129, 0.25)",
                                        color: "#d1fae5",
                                        border: "1px solid rgba(52, 211, 153, 0.4)",
                                        padding: "2px 8px",
                                        borderRadius: 9999,
                                    }}>
                                        <Check size={12} color="#34d399" />
                                        Complete
                                    </span>
                                ) : isProcessing ? (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: "rgba(245, 158, 11, 0.25)",
                                        color: "#fef3c7",
                                        border: "1px solid rgba(251, 191, 36, 0.4)",
                                        padding: "2px 8px",
                                        borderRadius: 9999,
                                    }}>
                                        <Loader2 size={12} className="animate-spin" color="#fbbf24" />
                                        Processing
                                    </span>
                                ) : (
                                    <span style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: "rgba(245, 158, 11, 0.25)",
                                        color: "#fef3c7",
                                        border: "1px solid rgba(251, 191, 36, 0.4)",
                                        padding: "2px 8px",
                                        borderRadius: 9999,
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
                                        Action Required
                                    </span>
                                )}
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, margin: "3px 0 0", fontWeight: 500 }}>
                                {isComplete
                                    ? "This stage is marked complete."
                                    : isProcessing
                                    ? "Submission is currently under review."
                                    : "Complete the required details below and submit this stage."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: "none",
                            background: "rgba(255,255,255,0.18)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>
                    {isProcessing && (
                        <div style={{
                            marginBottom: 16,
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "#fffbeb",
                            border: "1px solid #fcd34d",
                            color: "#92400e",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                            <Loader2 size={16} className="animate-spin" />
                            Processing — your submission is being verified. This stage will be marked complete once confirmed.
                        </div>
                    )}
                    {isComplete && (
                        <div style={{
                            marginBottom: 16,
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            color: "#166534",
                            fontSize: 13,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}>
                            <Check size={16} color="#16a34a" />
                            Stage 10 is complete. Showing saved data in read-only mode.
                        </div>
                    )}
                    {/* Client & Booking Details - clean card with column dividers */}
                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 14,
                            padding: "16px 20px",
                            marginBottom: 20,
                            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, marginBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ padding: 4, borderRadius: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Contact size={15} color="#475569" />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", letterSpacing: 0.2 }}>
                                    Client &amp; Booking Details
                                </span>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "150px 180px 140px 130px 1fr", gap: 16, overflowX: "auto" }}>
                            <div style={{ paddingRight: 14, borderRight: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", margin: "0 0 4px" }}>
                                    Booking ID
                                </p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, wordBreak: "break-word" }}>{details.bookingId || "—"}</p>
                            </div>
                            <div style={{ paddingRight: 14, borderRight: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", margin: "0 0 4px" }}>
                                    Client Name
                                </p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, wordBreak: "break-word" }}>{details.nameOfClient || "—"}</p>
                            </div>
                            <div style={{ paddingRight: 14, borderRight: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", margin: "0 0 4px" }}>
                                    Mobile
                                </p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, wordBreak: "break-word" }}>{details.mobile || "—"}</p>
                            </div>
                            <div style={{ paddingRight: 14, borderRight: "1px solid #e2e8f0" }}>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", margin: "0 0 4px" }}>
                                    PI Link
                                </p>
                                <div style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                                    {details.piLink && details.piLink !== "#" ? (
                                        <a
                                            href={details.piLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                                        >
                                            <span>View PI</span>
                                            <ExternalLink size={12} />
                                        </a>
                                    ) : (
                                        <span style={{ color: "#0f172a" }}>—</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", margin: "0 0 4px" }}>
                                    Programme / Package
                                </p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, wordBreak: "break-word" }}>{details.package || "—"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Editable: Drop Details */}
                    <div
                        style={{
                            background: SECTION_THEME.bg,
                            border: `1px solid ${SECTION_THEME.border}`,
                            borderRadius: 14,
                            padding: "16px 18px 18px",
                            marginBottom: 6,
                        }}
                    >
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: SECTION_THEME.head, margin: "0 0 14px" }}>
                            Drop Details
                        </h3>

                        <div style={{ marginBottom: dropRequired === "yes" ? 16 : 0 }}>
                            <Label required>Drop Required?</Label>
                            <select style={selectStyle} disabled={disabled} value={dropRequired} onChange={(e) => setDropRequired(e.target.value)}>
                                <option value="">Select an option</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </div>

                        {dropRequired === "yes" && (
                            <>
                                <div style={{ ...row2, marginBottom: 16 }}>
                                    <div>
                                        <Label required>Assign To Driver Name</Label>
                                        <select style={selectStyle} disabled={disabled} value={driverName} onChange={(e) => setDriverName(e.target.value)}>
                                            <option value="">Select driver</option>
                                            {DRIVERS.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label required>Drop Driver Contact</Label>
                                        <input
                                            type="tel"
                                            disabled={disabled}
                                            style={{ ...inputStyle, borderColor: contactError ? "#ef4444" : "#e5e7eb" }}
                                            placeholder="10-digit mobile number"
                                            value={driverContact}
                                            maxLength={10}
                                            onChange={(e) => setDriverContact(e.target.value.replace(/\D/g, ""))}
                                        />
                                        {contactError && (
                                            <p style={{ fontSize: 12, color: "#ef4444", margin: "4px 0 0" }}>
                                                Enter a valid 10-digit mobile number.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ ...row3, marginBottom: 16 }}>
                                    <div>
                                        <Label required>Drop From - Location</Label>
                                        <select style={selectStyle} disabled={disabled} value={dropTo} onChange={(e) => setDropTo(e.target.value)}>
                                            <option value="">Select location</option>
                                            {DROP_LOCATIONS.map((loc) => (
                                                <option key={loc} value={loc}>
                                                    {loc}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label required>Drop Date</Label>
                                        <input
                                            type="date"
                                            disabled={disabled}
                                            style={inputStyle}
                                            value={dropDate}
                                            onChange={(e) => setDropDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label required>Drop Time</Label>
                                        <input
                                            type="time"
                                            disabled={disabled}
                                            style={inputStyle}
                                            value={dropTime}
                                            onChange={(e) => setDropTime(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ ...row2, marginBottom: 0 }}>
                                    <div>
                                        <Label required>Remarks For Driver</Label>
                                        <textarea
                                            disabled={disabled}
                                            style={textareaStyle}
                                            placeholder="Enter remarks..."
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label required>Assigned By</Label>
                                        <div style={readonlyBoxStyle}>{saved?.assignedBy || user?.name || ASSIGNED_BY}</div>
                                    </div>
                                </div>
                            </>
                        )}

                        {dropRequired === "no" && (
                            <div
                                style={{
                                    marginTop: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 13,
                                    color: "#6b7280",
                                    background: "#e5e7eb",
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                }}
                            >
                                <Check size={14} color="#16a34a" />
                                Drop not required — this will be saved to the booking record.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: "12px 0",
                                borderRadius: 12,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                color: "#374151",
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid() || disabled || isSubmitting}
                            style={{
                                flex: 2,
                                padding: "12px 0",
                                borderRadius: 12,
                                border: "none",
                                background: (isValid() && !disabled && !isSubmitting) ? "linear-gradient(135deg, #8a82e6, #6259d6)" : "#c7c5ea",
                                color: "#fff",
                                fontSize: 14,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                cursor: (isValid() && !disabled && !isSubmitting) ? "pointer" : "not-allowed",
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send size={15} />
                                    Submit
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
