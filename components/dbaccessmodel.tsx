import React, { useMemo, useState } from "react";

/**
 * DbAccessOtpModal
 * ------------------------------------------------------------
 * Popup used before any DB CUD (Create / Update / Alter / Delete)
 * action, styled to match the Kairali CRM modal system (gradient
 * header, sectioned card body, horizontal field layout).
 *
 * Flow:
 *   1. User fills Name, Action, Reason (all mandatory).
 *   2. User clicks "Generate OTP" -> backend creates a random OTP,
 *      emails it to the SOP/Admin, and starts an expiry timer.
 *   3. Admin relays the OTP to the user out-of-band.
 *   4. User enters the OTP. Once all 4 fields are filled,
 *      "Verify & Continue" becomes enabled.
 *   5. On successful verify -> onVerified() lets the caller proceed
 *      with the DB action. On failure -> permission stays blocked.
 *
 * Wire-up notes for backend integration:
 *   - onGenerateOtp(payload) should call your API to create + email
 *     the OTP, and return { expiresInSeconds }.
 *   - onVerifyOtp(otp) should call your API to validate the OTP
 *     against the one generated for this request/session.
 *   - requestedBy is shown read-only, same pattern as "Assigned By"
 *     in your other modals - wire it to the logged-in session user.
 * ------------------------------------------------------------
 */

export type DbAction = "Create Table" | "Delete Data";

export interface OtpRequestPayload {
    name: string;
    action: DbAction;
    reason: string;
}

export interface DbAccessOtpModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestedBy: string;
    targetModule: string;
    defaultAction?: DbAction;
    onGenerateOtp: (payload: OtpRequestPayload) => Promise<{ expiresInSeconds: number }>;
    onVerifyOtp: (otp: string) => Promise<boolean>;
    onVerified: (payload: OtpRequestPayload) => void;
}

const ACTIONS: DbAction[] = ["Create Table", "Delete Data"];

export default function DbAccessOtpModal({
    isOpen,
    onClose,
    requestedBy,
    targetModule,
    defaultAction,
    onGenerateOtp,
    onVerifyOtp,
    onVerified,
}: DbAccessOtpModalProps) {
    const [name, setName] = useState(requestedBy || "");
    const [action, setAction] = useState<DbAction | "">(defaultAction || "");
    const [reason, setReason] = useState("");
    const [otp, setOtp] = useState("");

    React.useEffect(() => {
        if (isOpen) {
            setName(requestedBy || "");
            if (defaultAction) setAction(defaultAction);
        }
    }, [isOpen, requestedBy, defaultAction]);

    const [otpSent, setOtpSent] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const detailsFilled = name.trim() !== "" && action !== "" && reason.trim() !== "";
    const canVerify = useMemo(
        () => detailsFilled && otp.trim().length === 6 && otpSent,
        [detailsFilled, otp, otpSent]
    );

    if (!isOpen) return null;

    const resetAndClose = () => {
        setAction("");
        setReason("");
        setOtp("");
        setOtpSent(false);
        setExpiresInSeconds(null);
        setError(null);
        onClose();
    };

    const handleGenerateOtp = async () => {
        if (!detailsFilled || generating) return;
        setError(null);
        setGenerating(true);
        try {
            const result = await onGenerateOtp({ name, action: action as DbAction, reason });
            setExpiresInSeconds(result.expiresInSeconds);
            setOtpSent(true);
        } catch (e) {
            setError("Couldn't generate OTP. Try again.");
        } finally {
            setGenerating(false);
        }
    };

    const handleVerify = async () => {
        if (!canVerify || verifying) return;
        setError(null);
        setVerifying(true);
        try {
            const ok = await onVerifyOtp(otp);
            if (ok) {
                onVerified({ name, action: action as DbAction, reason });
                resetAndClose();
            } else {
                setError("Incorrect or expired OTP. Access remains blocked.");
            }
        } catch (e) {
            setError("Verification failed. Try again.");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={resetAndClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.headerIcon}>
                            <ShieldIcon />
                        </div>
                        <div>
                            <h2 style={styles.title}>Database Access Request</h2>
                            <p style={styles.subtitle}>Complete all fields to proceed</p>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={resetAndClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                <div style={styles.contentScroll}>
                    <div style={styles.tintedPanel}>
                        <p style={styles.panelHeading}>Request Details</p>

                        <div style={styles.formGrid3}>
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Name <span style={styles.req}>*</span>
                                </label>
                                <input
                                    style={styles.input}
                                    type="text"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={otpSent}
                                    required
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Action To Perform <span style={styles.req}>*</span>
                                </label>
                                <select
                                    style={styles.input}
                                    value={action}
                                    onChange={(e) => setAction(e.target.value as DbAction)}
                                    disabled={otpSent}
                                    required
                                >
                                    <option value="">Select action</option>
                                    {ACTIONS.map((a) => (
                                        <option key={a} value={a}>
                                            {a}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>
                                    OTP <span style={styles.req}>*</span>
                                </label>
                                <input
                                    style={styles.input}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder={otpSent ? "6-digit code" : "Generate OTP first"}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                    disabled={!otpSent}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <div style={styles.formGridReason}>
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Reason For Access <span style={styles.req}>*</span>
                                </label>
                                <textarea
                                    style={{ ...styles.input, ...styles.textarea }}
                                    placeholder="Describe why this change is needed..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={otpSent}
                                    required
                                />
                            </div>

                            <div style={styles.otpActionBox}>
                                <label style={styles.label}>&nbsp;</label>
                                <button
                                    style={{
                                        ...styles.otpBtn,
                                        ...(!detailsFilled || generating ? styles.btnDisabled : {}),
                                    }}
                                    onClick={handleGenerateOtp}
                                    disabled={!detailsFilled || generating}
                                    type="button"
                                >
                                    {generating ? "Sending..." : otpSent ? "Resend OTP" : "Generate OTP"}
                                </button>
                                {otpSent && (
                                    <p style={styles.helperText}>
                                        Sent to admin's email
                                        {expiresInSeconds
                                            ? ` \u00b7 valid ${Math.round(expiresInSeconds / 60)} min`
                                            : ""}
                                        .
                                    </p>
                                )}
                            </div>
                        </div>

                        {error && <p style={styles.errorText}>{error}</p>}
                    </div>
                </div>

                <div style={styles.footer}>
                    <button style={styles.ghostBtn} onClick={resetAndClose} type="button">
                        Cancel
                    </button>
                    <button
                        style={{
                            ...styles.primaryBtn,
                            ...(!canVerify || verifying ? styles.btnDisabled : {}),
                        }}
                        onClick={handleVerify}
                        disabled={!canVerify || verifying}
                        type="button"
                    >
                        <SendIcon /> {verifying ? "Verifying..." : "Verify & Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ShieldIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
function DocIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
        </svg>
    );
}
function SendIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: -2 }}>
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
        </svg>
    );
}

const INDIGO = "#5B4FE0";
const INDIGO_DEEPER = "#3730A3";
const INDIGO_TINT = "#EEF0FF";
const INDIGO_BORDER = "#D8DBFA";
const TEXT_DARK = "#1E1B4B";
const TEXT_MUTED = "#6B7280";
const TEXT_LABEL = "#4B5563";
const GRAY_BG = "#F3F4F6";
const GRAY_BORDER = "#E5E7EB";

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(30, 27, 75, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
    },
    modal: {
        width: "760px",
        maxWidth: "96vw",
        maxHeight: "90vh",
        background: "#FFFFFF",
        borderRadius: "16px",
        boxShadow: "0 25px 60px rgba(30, 27, 75, 0.3)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 24px",
        background: "linear-gradient(90deg, " + INDIGO + " 0%, " + INDIGO_DEEPER + " 100%)",
        flexShrink: 0,
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
    },
    headerIcon: {
        width: "38px",
        height: "38px",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFFFFF",
        flexShrink: 0,
    },
    title: {
        margin: 0,
        fontSize: "16.5px",
        fontWeight: 700,
        color: "#FFFFFF",
    },
    subtitle: {
        margin: "2px 0 0",
        fontSize: "12.5px",
        color: "rgba(255,255,255,0.85)",
    },
    closeBtn: {
        background: "rgba(255,255,255,0.18)",
        border: "none",
        width: "30px",
        height: "30px",
        borderRadius: "8px",
        fontSize: "17px",
        lineHeight: 1,
        color: "#FFFFFF",
        cursor: "pointer",
        flexShrink: 0,
    },
    contentScroll: {
        padding: "22px 24px",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
    },
    section: {
        border: "1px solid " + GRAY_BORDER,
        borderRadius: "12px",
        padding: "16px 18px",
        background: "#FFFFFF",
    },
    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "14px",
    },
    sectionLabel: {
        fontSize: "12.5px",
        fontWeight: 700,
        color: TEXT_DARK,
        letterSpacing: "0.03em",
        display: "flex",
        alignItems: "center",
    },
    readOnlyBadge: {
        fontSize: "11px",
        fontWeight: 600,
        color: TEXT_MUTED,
        background: GRAY_BG,
        border: "1px solid " + GRAY_BORDER,
        borderRadius: "20px",
        padding: "3px 12px",
    },
    contextGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "16px",
    },
    tintedPanel: {
        background: INDIGO_TINT,
        border: "1px solid " + INDIGO_BORDER,
        borderRadius: "12px",
        padding: "18px 20px",
    },
    panelHeading: {
        margin: "0 0 16px",
        fontSize: "13.5px",
        fontWeight: 700,
        color: INDIGO_DEEPER,
    },
    formGrid3: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "16px",
        marginBottom: "16px",
    },
    formGridReason: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "16px",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    otpActionBox: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    miniLabel: {
        fontSize: "10.5px",
        fontWeight: 700,
        color: TEXT_MUTED,
        letterSpacing: "0.04em",
    },
    label: {
        fontSize: "12.5px",
        fontWeight: 600,
        color: TEXT_LABEL,
    },
    req: {
        color: "#DC2626",
    },
    input: {
        border: "1px solid " + INDIGO_BORDER,
        borderRadius: "8px",
        padding: "10px 12px",
        fontSize: "13.5px",
        color: TEXT_DARK,
        outline: "none",
        background: "#FFFFFF",
        height: "38px",
        boxSizing: "border-box",
    },
    textarea: {
        minHeight: "38px",
        height: "auto",
        resize: "vertical",
        fontFamily: "inherit",
    },
    readOnlyInput: {
        border: "1px solid " + GRAY_BORDER,
        borderRadius: "8px",
        padding: "10px 12px",
        fontSize: "13.5px",
        color: TEXT_LABEL,
        background: GRAY_BG,
        height: "38px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
    },
    helperText: {
        margin: 0,
        fontSize: "11.5px",
        color: INDIGO_DEEPER,
    },
    errorText: {
        margin: "12px 0 0",
        fontSize: "12.5px",
        color: "#B91C1C",
    },
    otpBtn: {
        background: "#FFFFFF",
        border: "1px solid " + INDIGO,
        color: INDIGO_DEEPER,
        borderRadius: "8px",
        padding: "0 14px",
        fontSize: "12.5px",
        fontWeight: 600,
        cursor: "pointer",
        height: "38px",
        whiteSpace: "nowrap",
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        padding: "16px 24px",
        borderTop: "1px solid " + GRAY_BORDER,
        background: "#FAFAFA",
        flexShrink: 0,
    },
    ghostBtn: {
        background: "#FFFFFF",
        border: "1px solid " + GRAY_BORDER,
        color: TEXT_DARK,
        borderRadius: "9px",
        padding: "10px 22px",
        fontSize: "13.5px",
        fontWeight: 600,
        cursor: "pointer",
    },
    primaryBtn: {
        background: "linear-gradient(90deg, " + INDIGO + " 0%, " + INDIGO_DEEPER + " 100%)",
        border: "none",
        color: "#FFFFFF",
        borderRadius: "9px",
        padding: "10px 22px",
        fontSize: "13.5px",
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
    },
    btnDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
};
