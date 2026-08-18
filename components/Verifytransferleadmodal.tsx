"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { toast } from "sonner";

interface VerifyTransferLeadRow {
    id?: string | number;
    vtlStatus?: string;
    vtlAssignee?: string;
    vtlRemarks?: string;
}

type TransferField = "status" | "assignee" | "remarks";

interface VerifyTransferLeadModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    row?: VerifyTransferLeadRow | null;
    onRefresh?: (data: { status: string; assignee: string; remarks: string }) => void;
}

export default function VerifyTransferLeadModal({ isOpen = true, onClose, row, onRefresh }: VerifyTransferLeadModalProps) {
    const [status, setStatus] = useState("");
    const [assignee, setAssignee] = useState("");
    const [remarks, setRemarks] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [touched, setTouched] = useState({
        status: false,
        assignee: false,
        remarks: false,
    });

    // ── When row changes, pre-fill fields and decide read-only mode ────────────
    useEffect(() => {
        if (row) {
            setStatus(row.vtlStatus || "");
            setAssignee(row.vtlAssignee || "");
            setRemarks(row.vtlRemarks || "");
            // If the row already has a saved vtlStatus, open in read-only/submitted mode
            const alreadySubmitted = !!(row.vtlStatus && row.vtlStatus.trim() !== "");
            setSubmitted(alreadySubmitted);
            setLoading(false);
            setTouched({ status: false, assignee: false, remarks: false });
        }
    }, [row?.id]);

    const isValid =
        status.trim() !== "" &&
        assignee.trim() !== "" &&
        remarks.trim() !== "";

    const handleSubmit = async () => {
        setTouched({ status: true, assignee: true, remarks: true });
        if (!isValid || loading || submitted) return;
        setLoading(true);
        try {
            const res = await fetch("/api/received-leads/transfer", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    leadId: row?.id,
                    status,
                    assignee,
                    remarks,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSubmitted(true);
                toast.success("Lead verified and transferred successfully!");
                onRefresh?.({ status, assignee, remarks });
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                toast.error(data.error || "Failed to transfer lead");
            }
        } catch (error: any) {
            console.error("[VerifyTransferLeadModal] Error:", error);
            toast.error("An error occurred during transfer");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStatus("");
        setAssignee("");
        setRemarks("");
        setSubmitted(false);
        setLoading(false);
        setTouched({ status: false, assignee: false, remarks: false });
        onClose?.();
    };

    const showError = (field: TransferField, value: string) =>
        touched[field] && !value.trim();

    if (!isOpen) return null;

    // Whether the form is locked (already submitted in DB, not just this session)
    const isReadOnly = submitted;

    return (
        <div style={styles.overlay}>
            <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="vtl-title">

                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <span style={styles.headerIcon}>
                            {isReadOnly ? (
                                // Lock icon for read-only mode
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="17 1 21 5 17 9" />
                                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                    <polyline points="7 23 3 19 7 15" />
                                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                            )}
                        </span>
                        <div>
                            <h2 id="vtl-title" style={styles.headerTitle}>
                                {isReadOnly ? "Transfer Details (Read Only)" : "Verify & Transfer Lead"}
                            </h2>
                            <p style={styles.headerSub}>
                                {isReadOnly ? "This lead has already been verified and transferred" : "Complete all fields to proceed"}
                            </p>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={handleClose} aria-label="Close modal">
                        ✕
                    </button>
                </div>

                {/* Read-only banner */}
                {isReadOnly && (
                    <div style={styles.readOnlyBanner}>
                        <span style={{ fontSize: "15px" }}>🔒</span>
                        This form is in read-only mode. Data has already been saved.
                    </div>
                )}

                {/* Body */}
                <div style={styles.body}>

                    {/* Status */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="vtl-status">
                            Status <span style={styles.required}>*</span>
                        </label>
                        {isReadOnly ? (
                            <div style={styles.readOnlyField}>{status || "—"}</div>
                        ) : (
                            <>
                                <div style={styles.selectWrap}>
                                    <select
                                        id="vtl-status"
                                        style={{
                                            ...styles.select,
                                            borderColor: showError("status", status) ? "#e74c3c" : "#e0dff0",
                                        }}
                                        value={status}
                                        onChange={(e) => {
                                            const nextStatus = e.target.value;
                                            setStatus(nextStatus);
                                            setTouched((t) => ({ ...t, status: true }));

                                            // Handle clearing assignee when status eligibility changes
                                            if (nextStatus === "Cold") {
                                                if (assignee !== "Data Backup - Deleted") {
                                                    setAssignee("");
                                                }
                                            } else {
                                                if (assignee === "Data Backup - Deleted") {
                                                    setAssignee("");
                                                }
                                            }
                                        }}
                                        onBlur={() => setTouched((t) => ({ ...t, status: true }))}
                                        disabled={false}
                                    >
                                        <option value="">Select status</option>
                                        <option value="Cold">Cold</option>
                                        <option value="Verified Done">Verified Done</option>
                                    </select>
                                    <span style={styles.selectArrow}>▾</span>
                                </div>
                                {showError("status", status) && (
                                    <p style={styles.errorText}>⚠ Please select a status</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Assign to App Sheet OR Dialer */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="vtl-assignee">
                            Assign to App Sheet OR Dialer <span style={styles.required}>*</span>
                        </label>
                        {isReadOnly ? (
                            <div style={styles.readOnlyField}>{assignee || "—"}</div>
                        ) : (
                            <>
                                <div style={styles.selectWrap}>
                                    <select
                                        id="vtl-assignee"
                                        style={{
                                            ...styles.select,
                                            borderColor: showError("assignee", assignee) ? "#e74c3c" : "#e0dff0",
                                        }}
                                        value={assignee}
                                        onChange={(e) => {
                                            setAssignee(e.target.value);
                                            setTouched((t) => ({ ...t, assignee: true }));
                                        }}
                                        onBlur={() => setTouched((t) => ({ ...t, assignee: true }))}
                                        disabled={false}
                                    >
                                        <option value="">Select assignee</option>
                                        {status === "Cold" ? (
                                            <option value="Data Backup - Deleted">Data Backup - Deleted</option>
                                        ) : (
                                            <>
                                                <option value="Sadik Rehman">Sadik Rehman</option>
                                                <option value="Pushpanshu Kumar">Pushpanshu Kumar</option>
                                                <option value="Dr. Taniya Singh">Dr. Taniya Singh</option>
                                                <option value="Puneet Endlay">Puneet Endlay</option>
                                                <option value="Levil Kumar">Levil Kumar</option>
                                                <option value="Zaki Ahmed">Zaki Ahmed</option>
                                                <option value="Pawan Kamra">Pawan Kamra</option>
                                                <option value="Harpal Singh">Harpal Singh</option>
                                                <option value="Vidisha Bahukhandi">Vidisha Bahukhandi</option>
                                                <option value="AYURVEDIC CENTRE">AYURVEDIC CENTRE</option>
                                                <option value="Sam K Alexander">Sam K Alexander</option>
                                            </>
                                        )}
                                    </select>
                                    <span style={styles.selectArrow}>▾</span>
                                </div>
                                {showError("assignee", assignee) && (
                                    <p style={styles.errorText}>⚠ Please select an assignee</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Remarks */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="vtl-remarks">
                            Remarks <span style={styles.required}>*</span>
                        </label>
                        {isReadOnly ? (
                            <div style={{ ...styles.readOnlyField, whiteSpace: "pre-wrap", minHeight: "90px", alignItems: "flex-start", paddingTop: 10 }}>
                                {remarks || "—"}
                            </div>
                        ) : (
                            <>
                                <textarea
                                    id="vtl-remarks"
                                    style={{
                                        ...styles.textarea,
                                        borderColor: showError("remarks", remarks) ? "#e74c3c" : "#e0dff0",
                                    }}
                                    placeholder="Enter remarks..."
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    onBlur={() => setTouched((t) => ({ ...t, remarks: true }))}
                                    rows={4}
                                    disabled={false}
                                />
                                {showError("remarks", remarks) && (
                                    <p style={styles.errorText}>⚠ Remarks cannot be empty</p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Success message (shown right after fresh submit) */}
                    {submitted && !isReadOnly && (
                        <div style={styles.successBar}>
                            <span style={{ fontSize: "16px" }}>✓</span>
                            Lead verified and transferred successfully!
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button style={styles.cancelBtn} onClick={handleClose}>
                        {isReadOnly ? "Close" : "Cancel"}
                    </button>

                    {isReadOnly ? (
                        // Already submitted — show disabled green button
                        <button style={styles.submittedBtn} disabled>
                            <span style={{ marginRight: 6 }}>✓</span> Already Submitted
                        </button>
                    ) : (
                        // Editable — show submit button
                        <button
                            style={{
                                ...styles.submitBtn,
                                opacity: isValid ? 1 : 0.5,
                                cursor: isValid ? "pointer" : "not-allowed",
                            }}
                            onClick={handleSubmit}
                            disabled={!isValid || loading}
                        >
                            {loading ? (
                                <span style={styles.loadingRow}>
                                    <span style={styles.spinner} />
                                    Submitting...
                                </span>
                            ) : (
                                <>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Submit
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        #vtl-status:focus, #vtl-assignee:focus, #vtl-remarks:focus {
          border-color: #6c63ff !important;
          box-shadow: 0 0 0 3px rgba(108,99,255,0.15);
          outline: none;
        }
      `}</style>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
    },
    modal: {
        background: "#ffffff",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "490px",
        boxShadow: "0 20px 60px rgba(108,99,255,0.18), 0 4px 20px rgba(0,0,0,0.12)",
        overflow: "hidden",
        animation: "fadeIn 0.22s ease",
    },
    header: {
        background: "linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%)",
        padding: "18px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    headerIcon: {
        color: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.18)",
        borderRadius: "8px",
        padding: "7px",
    },
    headerTitle: {
        color: "#ffffff",
        fontSize: "17px",
        fontWeight: "700",
        margin: 0,
        lineHeight: 1.2,
    },
    headerSub: {
        color: "rgba(255,255,255,0.72)",
        fontSize: "12px",
        margin: "2px 0 0",
    },
    closeBtn: {
        background: "rgba(255,255,255,0.18)",
        border: "none",
        borderRadius: "8px",
        color: "#ffffff",
        width: "30px",
        height: "30px",
        cursor: "pointer",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "600",
        flexShrink: 0,
    },
    readOnlyBanner: {
        background: "#fef9e7",
        borderBottom: "1.5px solid #f0d060",
        padding: "10px 22px",
        color: "#7a5c00",
        fontSize: "12.5px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    body: {
        padding: "22px 24px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    label: {
        fontSize: "13.5px",
        fontWeight: "700",
        color: "#1a1a2e",
    },
    required: {
        color: "#e74c3c",
    },
    selectWrap: {
        position: "relative",
    },
    select: {
        width: "100%",
        padding: "10px 36px 10px 13px",
        border: "1.5px solid #e0dff0",
        borderRadius: "10px",
        fontSize: "14px",
        color: "#1a1a2e",
        fontFamily: "inherit",
        background: "#fafafe",
        appearance: "none",
        WebkitAppearance: "none",
        cursor: "pointer",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
    },
    selectArrow: {
        position: "absolute",
        right: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "#6c63ff",
        fontSize: "14px",
        pointerEvents: "none",
    },
    textarea: {
        width: "100%",
        padding: "10px 13px",
        border: "1.5px solid #e0dff0",
        borderRadius: "10px",
        fontSize: "14px",
        color: "#1a1a2e",
        fontFamily: "inherit",
        resize: "vertical",
        background: "#fafafe",
        boxSizing: "border-box",
        transition: "border-color 0.15s",
        minHeight: "90px",
    },
    // Read-only display box — mirrors the field dimensions but is non-interactive
    readOnlyField: {
        width: "100%",
        padding: "10px 13px",
        border: "1.5px solid #e8e6f0",
        borderRadius: "10px",
        fontSize: "14px",
        color: "#3b3b5a",
        fontFamily: "inherit",
        background: "#f3f2fb",
        boxSizing: "border-box",
        minHeight: "42px",
        display: "flex",
        alignItems: "center",
        lineHeight: 1.5,
    },
    errorText: {
        color: "#e74c3c",
        fontSize: "12px",
        margin: 0,
    },
    successBar: {
        background: "#eaf3de",
        border: "1.5px solid #97c459",
        borderRadius: "10px",
        padding: "11px 14px",
        color: "#3b6d11",
        fontSize: "13.5px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    footer: {
        padding: "14px 24px 22px",
        display: "flex",
        gap: "12px",
        borderTop: "1.5px solid #f0eeff",
        marginTop: "10px",
    },
    cancelBtn: {
        flex: 1,
        padding: "11px",
        border: "1.5px solid #d0cde8",
        borderRadius: "10px",
        background: "#ffffff",
        color: "#1a1a2e",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        fontFamily: "inherit",
    },
    submitBtn: {
        flex: 2,
        padding: "11px",
        border: "none",
        borderRadius: "10px",
        background: "linear-gradient(135deg, #6c63ff 0%, #5a52d5 100%)",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.2s",
        fontFamily: "inherit",
    },
    submittedBtn: {
        flex: 2,
        padding: "11px",
        border: "none",
        borderRadius: "10px",
        background: "#3a7d1e",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
    },
    loadingRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    spinner: {
        width: "14px",
        height: "14px",
        border: "2px solid rgba(255,255,255,0.35)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.7s linear infinite",
    },
};
