import React, { useState, type ReactNode } from "react";
import { ClipboardCheck, X, FileText, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Guest } from "@/types/crr";

const DOCTORS = ["Dr Deepu John", "Ashikha Raj", "Dr. Rahul R", "Dr. Akhila Oommen", "ANAGHA S"];

const DOCTOR_EMAIL_MAP: Record<string, string> = {
    "Dr Deepu John": "drdeepu@ktahv.com",
    "Ashikha Raj": "ashikha@ktahv.com",
    "Dr. Rahul R": "drrahul@ktahv.com",
    "Dr. Akhila Oommen": "drakhila@ktahv.com",
    "ANAGHA S": "anagha@ktahv.com",
};

export function getDoctorEmail(doctorName?: string | null): string {
    if (!doctorName) return "doctor@ktahv.com";
    if (DOCTOR_EMAIL_MAP[doctorName]) return DOCTOR_EMAIL_MAP[doctorName];
    if (doctorName.includes("@")) return doctorName;
    const slug = doctorName.toLowerCase().replace(/^dr\.?\s*/i, "").trim().replace(/\s+/g, ".");
    return slug ? `${slug}@ktahv.com` : "doctor@ktahv.com";
}

// Fallbacks if no user is logged in
const ASSIGNED_DOCTOR = "Dr Deepu John";

const LOCKED_DETAILS = {
    bookingId: "KTAHV-PMS-5453",
    nameOfClient: "MR. ARUN AGARWAL",
    mobile: "9811834735",
    piLink: "#",
    package: "Holistic Treatment For Rejuvenation & Detoxification-Double",
};

const SECTION_THEME = { bg: "#eef4ff", border: "#cddcfb", head: "#1d4ed8" };

function Label({ required, children }: { required?: boolean; children: ReactNode }) {
    return (
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            {children} {required && <span style={{ color: "#ef4444" }}>*</span>}
        </label>
    );
}

const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    fontSize: 14,
    color: "#1f2937",
    outline: "none",
};

const inputStyle = { ...selectStyle };

const textareaStyle: React.CSSProperties = {
    ...selectStyle,
    minHeight: 70,
    resize: "vertical",
    fontFamily: "inherit",
};

const readonlyBoxStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    fontSize: 14,
    color: "#6b7280",
};

const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

function getTimestamp() {
    const now = new Date();
    return now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface GuestRequirementVerificationModalProps {
    open?: boolean;
    onClose?: () => void;
    onSubmit?: (data: Record<string, string>) => void | Promise<void>;
    guest?: Guest | null;
    disabled?: boolean;
}

export default function GuestRequirementVerificationModal({ open = true, onClose = () => { }, onSubmit = () => { }, guest = null, disabled = false }: GuestRequirementVerificationModalProps) {
    const { user } = useAuth();
    const details = guest ? {
        bookingId: guest.bookingId,
        nameOfClient: guest.name,
        mobile: guest.mobile,
        piLink: guest.piLink || "#",
        package: guest.programme,
    } : LOCKED_DETAILS;

    const saved = guest?.guestRequirementVerification;

    const [doctorAssignStatus, setDoctorAssignStatus] = useState(saved?.doctorAssignStatus || ""); // "ok" | "change"
    const [changedDoctor, setChangedDoctor] = useState(saved?.changedDoctor || "");
    const [remarks, setRemarks] = useState(saved?.remarks || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const activeDoctor = doctorAssignStatus === "change" && changedDoctor
        ? changedDoctor
        : (saved?.doctorAssignedToClient || ASSIGNED_DOCTOR);

    // Prevent guest email from leaking into doctor email field
    const savedEmailIsDoctor = saved?.email && saved.email !== guest?.email && (saved.email.includes("@ktahv.com") || !saved.email.includes("@gmail.com"));
    const doctorEmail = savedEmailIsDoctor ? saved.email : getDoctorEmail(activeDoctor);

    if (!open) return null;

    const isValid = () => {
        if (!doctorAssignStatus) return false;
        if (doctorAssignStatus === "change" && !changedDoctor) return false;
        if (!remarks.trim()) return false;
        return true;
    };

    const handleSubmit = () => {
        if (!isValid() || isSubmitting) return;
        setIsSubmitting(true);
        const timestamp = saved?.timestamp || getTimestamp(); // captured at click time or use existing
        onSubmit({
            doctorAssignedToClient: saved?.doctorAssignedToClient || ASSIGNED_DOCTOR,
            email: doctorEmail,
            timestamp,
            doctorAssignStatus,
            changedDoctor: doctorAssignStatus === "change" ? changedDoctor : "",
            remarks,
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
                {/* Header */}
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
                            <ClipboardCheck size={18} color="#fff" />
                        </div>
                        <div>
                            <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>
                                Guest Requirement Verification
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "2px 0 0" }}>
                                Complete all fields to proceed
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

                {/* Body */}
                <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1 }}>
                    {/* Readonly: Guest & Booking Details */}
                    <div
                        style={{
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: 14,
                            padding: "16px 18px 18px",
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <FileText size={15} color="#4b5563" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", letterSpacing: 0.3 }}>
                                    GUEST & BOOKING DETAILS
                                </span>
                            </div>
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#6b7280",
                                    background: "#e5e7eb",
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                }}
                            >
                                Read Only
                            </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1.4fr", columnGap: 16, rowGap: 14 }}>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", letterSpacing: 0.3 }}>
                                    BOOKING ID
                                </p>
                                <div style={readonlyBoxStyle}>{details.bookingId}</div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", letterSpacing: 0.3 }}>
                                    NAME OF CLIENT
                                </p>
                                <div style={readonlyBoxStyle}>{details.nameOfClient}</div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", letterSpacing: 0.3 }}>
                                    MOBILE
                                </p>
                                <div style={readonlyBoxStyle}>{details.mobile}</div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", letterSpacing: 0.3 }}>
                                    PI LINK
                                </p>
                                <div style={{ ...readonlyBoxStyle, color: "#2563eb" }}>
                                    <a href={details.piLink} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                                        View PI
                                    </a>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", letterSpacing: 0.3 }}>
                                    PROGRAMME / PACKAGE
                                </p>
                                <div style={readonlyBoxStyle}>{details.package}</div>
                            </div>
                        </div>
                    </div>

                    {/* Editable: Doctor Verification Details */}
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
                            Doctor Verification Details
                        </h3>

                        <div style={{ ...row2, marginBottom: 16 }}>
                            <div>
                                <Label required>Doctor Assigned to the Client</Label>
                                <div style={readonlyBoxStyle}>{saved?.doctorAssignedToClient || ASSIGNED_DOCTOR}</div>
                            </div>
                            <div>
                                <Label required>E-Mail</Label>
                                <div style={readonlyBoxStyle}>{doctorEmail}</div>
                            </div>
                        </div>

                        <div style={{ ...row2, marginBottom: 16 }}>
                            <div>
                                <Label required>Timestamp</Label>
                                <div style={readonlyBoxStyle}>{saved?.timestamp || "Will be recorded on submit"}</div>
                            </div>
                            <div>
                                <Label required>Doctor Assign - OK/Change</Label>
                                <select
                                    style={selectStyle}
                                    disabled={disabled}
                                    value={doctorAssignStatus}
                                    onChange={(e) => setDoctorAssignStatus(e.target.value)}
                                >
                                    <option value="">Select an option</option>
                                    <option value="ok">Okay</option>
                                    <option value="change">Change</option>
                                </select>
                            </div>
                        </div>

                        {doctorAssignStatus === "change" && (
                            <div style={{ marginBottom: 16 }}>
                                <Label required>Change The Doctor - (If Required)</Label>
                                <select
                                    style={selectStyle}
                                    disabled={disabled}
                                    value={changedDoctor}
                                    onChange={(e) => setChangedDoctor(e.target.value)}
                                >
                                    <option value="">Select doctor</option>
                                    {DOCTORS.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <Label required>Remarks</Label>
                            <textarea
                                style={textareaStyle}
                                disabled={disabled}
                                placeholder="Enter remarks..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>
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
