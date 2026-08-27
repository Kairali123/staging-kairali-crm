"use client";

import React, { useState, useMemo } from "react";
import {
    X,
    ChevronDown,
    User,
    Users,
    Briefcase,
    Calendar,
    PhoneCall,
    Star,
    Send,
    RotateCcw,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
    Home,
    FileText,
    ExternalLink,
    Car,
    Stethoscope,
    ShieldAlert,
    Check,
    Lock,
    Sparkles,
    ClipboardCheck,
} from "lucide-react";
import type { Guest, Stage, StageStatus } from "@/types/crr";
import { getDoctorEmail } from "@/components/Guestrequirementverificationmodal";

interface CrrStageViewModalProps {
    open: boolean;
    onClose: () => void;
    guest: Guest | null;
    initialStage?: number;
}

const STAGES_CONFIG: {
    no: number;
    name: string;
    resp: string;
    trigger: string;
    icon: React.ElementType;
    color: string;
    accentColor: string;
}[] = [
    {
        no: 1,
        name: "Arrival Welcome on Pickup",
        resp: "GRE",
        trigger: "Before 2 Hours of Check-in",
        icon: Home,
        color: "#0284c7",
        accentColor: "#e0f2fe",
    },
    {
        no: 2,
        name: "Guest Request & Complaint Mgmt",
        resp: "GRE",
        trigger: "During Stay (Check-in to Check-out)",
        icon: PhoneCall,
        color: "#4f46e5",
        accentColor: "#e0e7ff",
    },
    {
        no: 3,
        name: "Next Visit Planning & Confirmation",
        resp: "Doctor",
        trigger: "After 1 Day of Check-out",
        icon: Calendar,
        color: "#2563eb",
        accentColor: "#dbeafe",
    },
    {
        no: 4,
        name: "Guest Feedback & Outcome Confirmation",
        resp: "GRE",
        trigger: "On Check-out Date",
        icon: Star,
        color: "#d97706",
        accentColor: "#fef3c7",
    },
    {
        no: 5,
        name: "Online Rating & Review Request",
        resp: "GRE",
        trigger: "On Check-out Date",
        icon: Send,
        color: "#ea580c",
        accentColor: "#ffedd5",
    },
    {
        no: 6,
        name: "Safe Return Confirmation",
        resp: "GRE",
        trigger: "Departure + 3 Days",
        icon: RotateCcw,
        color: "#059669",
        accentColor: "#d1fae5",
    },
    {
        no: 7,
        name: "Result Tracking & Health Progress Check",
        resp: "Doctor",
        trigger: "Departure + 20 Days",
        icon: TrendingUp,
        color: "#9333ea",
        accentColor: "#f3e8ff",
    },
    {
        no: 8,
        name: "Referral Collection & Lead Generation",
        resp: "FO",
        trigger: "Departure + 30 Days",
        icon: Users,
        color: "#16a34a",
        accentColor: "#dcfce7",
    },
    {
        no: 9,
        name: "Driver Assignment – Arrival Pickup",
        resp: "FO",
        trigger: "Before Arrival",
        icon: Car,
        color: "#6366f1",
        accentColor: "#e0e7ff",
    },
    {
        no: 10,
        name: "Driver Assignment – Departure Drop",
        resp: "FO",
        trigger: "Before Departure",
        icon: Car,
        color: "#6366f1",
        accentColor: "#e0e7ff",
    },
    {
        no: 11,
        name: "Guest Requirement Verification",
        resp: "GM",
        trigger: "Before Check-in",
        icon: ClipboardCheck,
        color: "#0d9488",
        accentColor: "#ccfbf1",
    },
];

function formatIST(val: string | null | undefined): string {
    if (!val) return "—";
    const s = String(val).trim();

    // Check if the string explicitly contains a time part (e.g. contains ":" with hours/minutes)
    const hasTime = s.includes(":") && !/^\d{4}-\d{2}-\d{2}[ T]00:00:00(\.000)?(Z|\+00:00)?$/.test(s);

    const d = new Date(val);
    if (isNaN(d.getTime())) return s;

    if (hasTime) {
        return new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(d);
    }

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(d);
}

function FieldBox({
    label,
    value,
    fullWidth = false,
    badgeColor,
    isLink = false,
}: {
    label: string;
    value?: string | number | null | boolean;
    fullWidth?: boolean;
    badgeColor?: string;
    isLink?: boolean;
}) {
    if (value === undefined || value === null || value === "") return null;

    const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

    return (
        <div
            style={{
                gridColumn: fullWidth ? "1 / -1" : undefined,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
            }}
        >
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#64748b",
                }}
            >
                {label}
            </span>
            <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 500, wordBreak: "break-word" }}>
                {badgeColor ? (
                    <span
                        style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: `${badgeColor}18`,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}35`,
                        }}
                    >
                        {displayValue}
                    </span>
                ) : isLink && displayValue.startsWith("http") ? (
                    <a
                        href={displayValue}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            color: "#2563eb",
                            textDecoration: "underline",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        Open Link <ExternalLink size={13} />
                    </a>
                ) : (
                    displayValue
                )}
            </div>
        </div>
    );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <div style={{ width: 3.5, height: 15, background: "#2563eb", borderRadius: 2 }} />
                {title}
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                }}
            >
                {children}
            </div>
        </div>
    );
}

export default function CrrStageViewModal({
    open,
    onClose,
    guest,
    initialStage = 1,
}: CrrStageViewModalProps) {
    const [activeStageNo, setActiveStageNo] = useState<number>(initialStage);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    // Sync initial stage if changed
    React.useEffect(() => {
        if (open && initialStage) {
            setActiveStageNo(initialStage);
        }
    }, [open, initialStage]);

    if (!open || !guest) return null;

    const currentStageDef = STAGES_CONFIG.find((s) => s.no === activeStageNo) || STAGES_CONFIG[0];
    const stageInfo = guest.stages?.find((s) => s.stage === activeStageNo);
    const savedData = (stageInfo?.savedData as Record<string, string | number | null> | undefined) || {};

    // Determine completion and fill status for each stage
    const stageSummaryList = STAGES_CONFIG.map((cfg, idx) => {
        const info = guest.stages?.find((s) => s.stage === cfg.no);
        const status = guest.stageStatus?.[idx] || (info?.completed ? "Complete" : "Pending");
        const hasSaved =
            !!info?.savedData &&
            Object.entries(info.savedData).some(
                ([k, v]) => !["doer", "assignedBy"].includes(k) && v !== null && String(v).trim() !== ""
            );
        return {
            ...cfg,
            status: status as StageStatus,
            info,
            hasSaved,
        };
    });

    const activeStageSummary = stageSummaryList.find((s) => s.no === activeStageNo);

    // Render Stage Specific Content
    const renderStageContent = () => {
        switch (activeStageNo) {
            case 1: {
                const s = guest.arrivalWelcome;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Welcome & Call Details">
                            <FieldBox label="Outcome Achieved" value={s?.outcomeAchieved || (savedData.outcomeAchieved as string)} badgeColor={s?.outcomeAchieved === "Yes" ? "#16a34a" : "#dc2626"} />
                            <FieldBox label="Call Status" value={s?.status || (savedData.status as string)} badgeColor="#4f46e5" />
                            <FieldBox label="Follow-up Date" value={s?.followupDate || (savedData.followupDate as string)} />
                            <FieldBox label="Not Done Remarks" value={s?.notDoneRemarks || (savedData.notDoneRemarks as string)} fullWidth />
                            <FieldBox label="Pickup / Outcome Remarks" value={s?.outcomeRemarks || (savedData.outcomeRemarks as string)} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 2: {
                const remarks = (savedData.doerRemarks as string) || (savedData.remarks as string) || "";
                const qrScanned = (savedData.qrCodeScannedStatus as string) || (savedData.qrCodeViewed ? "Yes" : "");

                return (
                    <>
                        <SectionGroup title="Guest Request & QR Management">
                            <FieldBox label="QR Code Scanned" value={qrScanned || "Not Scanned"} badgeColor={qrScanned && qrScanned !== "Not Scanned" ? "#16a34a" : "#64748b"} />
                            <FieldBox label="Remarks / Complaint Details" value={remarks || "No remarks entered"} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 3: {
                const nextVisitDate = savedData.nextVisitDate as string;
                const remarks = (savedData.remarks as string) || (savedData.outcomeRemarks as string);
                const hasData = !!nextVisitDate || !!remarks || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Next Visit Planning">
                            <FieldBox label="Next Visit Date" value={nextVisitDate} badgeColor="#2563eb" />
                            <FieldBox label="Next Visit Planning Remarks" value={remarks} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 4: {
                const remarks = (savedData.doerRemarks as string) || (savedData.remarks as string) || guest.guestFeedback?.doerRemarks || "";
                const feedbackUrl = (savedData.feedbackTakingUrl as string) || `https://script.google.com/a/macros/kairali.com/s/AKfycby5x4cuxgMbs2SJjd46HzswkLjYGuuw83nOwiFNj9UqcJbfzJoigNBQxxmH__mCq5afRw/exec?bookingId=${encodeURIComponent(guest.bookingId)}`;

                return (
                    <>
                        <SectionGroup title="Guest Feedback & Outcome">
                            <FieldBox label="Doer Remarks / Feedback Details" value={remarks || "No remarks entered"} fullWidth />
                            {feedbackUrl && <FieldBox label="External Feedback Form" value={feedbackUrl} isLink fullWidth />}
                        </SectionGroup>
                    </>
                );
            }
            case 5: {
                const s = guest.ratingRequest;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Rating & Review Request Details">
                            <FieldBox label="Rating Status" value={s?.ratingStatus || (savedData.ratingStatus as string)} badgeColor="#ea580c" />
                            <FieldBox label="Outcome Achieved" value={s?.outcomeAchieved || (savedData.outcomeAchieved as string)} badgeColor={s?.outcomeAchieved === "Yes" ? "#16a34a" : "#dc2626"} />
                            <FieldBox label="Call Status" value={s?.status || (savedData.status as string)} badgeColor="#4f46e5" />
                            <FieldBox label="Follow-up Date" value={s?.followupDate || (savedData.followupDate as string)} />
                            <FieldBox label="Proof File Name / Link" value={s?.proofFileName || (savedData.proofFileName as string)} isLink fullWidth />
                            <FieldBox label="Not Given Remarks" value={s?.notGivenRemarks || (savedData.notGivenRemarks as string)} fullWidth />
                            <FieldBox label="Outcome Remarks" value={s?.outcomeRemarks || (savedData.outcomeRemarks as string)} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 6: {
                const s = guest.safeReturn;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Safe Return Details">
                            <FieldBox label="Stay Feedback" value={s?.stayFeedback || (savedData.stayFeedback as string)} fullWidth />
                            <FieldBox label="Outcome Achieved" value={s?.outcomeAchieved || (savedData.outcomeAchieved as string)} badgeColor={s?.outcomeAchieved === "Yes" ? "#16a34a" : "#dc2626"} />
                            <FieldBox label="Call Status" value={s?.status || (savedData.status as string)} badgeColor="#4f46e5" />
                            <FieldBox label="Not Done Remarks" value={s?.notDoneRemarks || (savedData.notDoneRemarks as string)} fullWidth />
                            <FieldBox label="Outcome Remarks" value={s?.outcomeRemarks || (savedData.outcomeRemarks as string)} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 7: {
                const s = guest.resultProgress;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Health Progress & Outcome">
                            <FieldBox label="Outcome Achieved" value={s?.outcomeAchieved || (savedData.outcomeAchieved as string)} badgeColor={s?.outcomeAchieved === "Yes" ? "#16a34a" : "#dc2626"} />
                            <FieldBox label="Call Status" value={s?.status || (savedData.status as string)} badgeColor="#4f46e5" />
                            <FieldBox label="Follow-up Date" value={s?.followupDate || (savedData.followupDate as string)} />
                            <FieldBox label="Not Done Remarks" value={s?.notDoneRemarks || (savedData.notDoneRemarks as string)} fullWidth />
                            <FieldBox label="Progress / Health Remarks" value={s?.outcomeRemarks || (savedData.outcomeRemarks as string)} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 8: {
                const referralStatus = (savedData.referralTakenStatus as string) || (savedData.doerStatus as string) || guest.referralCollection?.referralTakenStatus || "";
                const doerRemarks = (savedData.doerRemarks as string) || guest.referralCollection?.doerRemarks || "";

                return (
                    <>
                        <SectionGroup title="Referral & Lead Generation">
                            <FieldBox label="Referral Taken Status" value={referralStatus || "Not Taken"} badgeColor={referralStatus && referralStatus !== "No" && referralStatus !== "Not Taken" ? "#16a34a" : "#64748b"} />
                            <FieldBox label="Referral Remarks / Details" value={doerRemarks || "No remarks entered"} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            case 9: {
                const s = guest.driverAssignmentArrival;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Driver Assignment – Arrival">
                            <FieldBox label="Pickup Required" value={s?.pickupRequired || (savedData.pickupRequired as string)} badgeColor={s?.pickupRequired === "yes" ? "#16a34a" : "#64748b"} />
                            {s?.pickupRequired !== "no" && (
                                <>
                                    <FieldBox label="Driver Name" value={s?.driverName || (savedData.driverName as string)} />
                                    <FieldBox label="Driver Contact" value={s?.driverContact || (savedData.driverContact as string)} />
                                    <FieldBox label="Pickup Location" value={s?.pickupFrom || (savedData.pickupFrom as string)} />
                                    <FieldBox label="Pickup Date" value={s?.pickupDate || (savedData.pickupDate as string)} />
                                    <FieldBox label="Pickup Time" value={s?.pickupTime || (savedData.pickupTime as string)} />
                                    <FieldBox label="Assigned By" value={s?.assignedBy || (savedData.assignedBy as string)} />
                                    <FieldBox label="Remarks For Driver" value={s?.remarks || (savedData.remarks as string)} fullWidth />
                                </>
                            )}
                        </SectionGroup>
                    </>
                );
            }
            case 10: {
                const s = guest.driverAssignmentDeparture;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                return (
                    <>
                        <SectionGroup title="Driver Assignment – Departure">
                            <FieldBox label="Drop Required" value={s?.dropRequired || (savedData.dropRequired as string)} badgeColor={s?.dropRequired === "yes" ? "#16a34a" : "#64748b"} />
                            {s?.dropRequired !== "no" && (
                                <>
                                    <FieldBox label="Driver Name" value={s?.driverName || (savedData.driverName as string)} />
                                    <FieldBox label="Driver Contact" value={s?.driverContact || (savedData.driverContact as string)} />
                                    <FieldBox label="Drop Location" value={s?.dropTo || (savedData.dropTo as string)} />
                                    <FieldBox label="Drop Date" value={s?.dropDate || (savedData.dropDate as string)} />
                                    <FieldBox label="Drop Time" value={s?.dropTime || (savedData.dropTime as string)} />
                                    <FieldBox label="Assigned By" value={s?.assignedBy || (savedData.assignedBy as string)} />
                                    <FieldBox label="Remarks For Driver" value={s?.remarks || (savedData.remarks as string)} fullWidth />
                                </>
                            )}
                        </SectionGroup>
                    </>
                );
            }
            case 11: {
                const s = guest.guestRequirementVerification;
                const hasData = s || activeStageSummary?.hasSaved;
                if (!hasData) return null;
                const assignedDoc = s?.changedDoctor || s?.doctorAssignedToClient || (savedData.changedDoctor as string) || (savedData.doctorAssignedToClient as string);
                const rawEmail = s?.email || (savedData.email as string);
                const doctorEmail = (rawEmail && rawEmail !== guest.email && (rawEmail.includes("@ktahv.com") || !rawEmail.includes("@gmail.com"))) ? rawEmail : getDoctorEmail(assignedDoc);
                return (
                    <>
                        <SectionGroup title="Guest Requirement Verification">
                            <FieldBox label="Doctor Assigned" value={s?.doctorAssignedToClient || (savedData.doctorAssignedToClient as string)} />
                            <FieldBox label="Doctor Assign Status" value={s?.doctorAssignStatus || (savedData.doctorAssignStatus as string)} badgeColor="#0d9488" />
                            <FieldBox label="Changed Doctor" value={s?.changedDoctor || (savedData.changedDoctor as string)} />
                            <FieldBox label="Doctor Email" value={doctorEmail} />
                            <FieldBox label="Timestamp" value={s?.timestamp || (savedData.timestamp as string)} />
                            <FieldBox label="Remarks" value={s?.remarks || (savedData.remarks as string)} fullWidth />
                        </SectionGroup>
                    </>
                );
            }
            default:
                return null;
        }
    };

    const stageContent = renderStageContent();

    // Any other extra fields in savedData not explicitly captured above
    const rawSavedFields = Object.entries(savedData).filter(
        ([key, val]) =>
            !["doer", "assignedBy"].includes(key) &&
            val !== null &&
            val !== undefined &&
            String(val).trim() !== ""
    );

    return (
        <>
            <style>{`
        @keyframes crrModalFadeIn {
          from { opacity: 0; transform: scale(0.98) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .crr-stage-sidebar {
          width: 280px;
          flex-shrink: 0;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          overflow-y: auto;
          padding: 12px 8px;
        }
        @media (max-width: 768px) {
          .crr-stage-sidebar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 20;
            width: 290px;
            box-shadow: 4px 0 24px rgba(0,0,0,0.2);
            transform: translateX(-100%);
            transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .crr-stage-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>

            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15, 23, 42, 0.6)",
                    backdropFilter: "blur(4px)",
                    zIndex: 9998,
                }}
            />

            {/* Modal Dialog */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: 1120,
                        height: "92vh",
                        maxHeight: 780,
                        background: "#ffffff",
                        borderRadius: 18,
                        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        pointerEvents: "auto",
                        animation: "crrModalFadeIn 0.2s ease-out",
                    }}
                >
                    {/* Header: Guest Overview */}
                    <div
                        style={{
                            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                            padding: "16px 20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexShrink: 0,
                            gap: 12,
                            color: "#ffffff",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: "rgba(59, 130, 246, 0.2)",
                                    border: "1px solid rgba(147, 197, 253, 0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#93c5fd",
                                    flexShrink: 0,
                                }}
                            >
                                <FileText size={22} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <h3
                                        style={{
                                            fontSize: 17,
                                            fontWeight: 700,
                                            margin: 0,
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {guest.name}
                                    </h3>
                                    <span
                                        style={{
                                            background: "rgba(255, 255, 255, 0.12)",
                                            color: "#93c5fd",
                                            fontSize: 11,
                                            padding: "2px 8px",
                                            borderRadius: 6,
                                            fontWeight: 600,
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {guest.bookingId}
                                    </span>
                                    <span
                                        style={{
                                            background:
                                                guest.bookingStatus?.toLowerCase().includes("cancel")
                                                    ? "rgba(239, 68, 68, 0.2)"
                                                    : "rgba(16, 185, 129, 0.2)",
                                            color:
                                                guest.bookingStatus?.toLowerCase().includes("cancel")
                                                    ? "#f87171"
                                                    : "#34d399",
                                            fontSize: 11,
                                            padding: "2px 8px",
                                            borderRadius: 6,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {guest.bookingStatus || "Confirmed"}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        marginTop: 4,
                                        fontSize: 12,
                                        color: "#94a3b8",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {guest.room && <span>🏨 {guest.room}</span>}
                                    {guest.programme && <span>🌿 {guest.programme}</span>}
                                    {guest.mobile && <span>📞 {guest.mobile}</span>}
                                    {guest.checkin && (
                                        <span>
                                            📅 {guest.checkin} → {guest.checkout}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Right: Progress and Close */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                            <div
                                style={{
                                    display: "none",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "rgba(255, 255, 255, 0.08)",
                                    padding: "6px 12px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                                className="sm:flex"
                            >
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Journey:</span>
                                <span style={{ fontSize: 12, color: "#ffffff", fontWeight: 700 }}>
                                    {guest.allComplete
                                        ? "11/11 Completed"
                                        : `Stage ${guest.currentStage} of 11`}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: "rgba(255, 255, 255, 0.1)",
                                    border: "1px solid rgba(255, 255, 255, 0.15)",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <X size={17} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Drawer Trigger Bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 14px",
                            background: "#f1f5f9",
                            borderBottom: "1px solid #e2e8f0",
                        }}
                        className="md:hidden"
                    >
                        <button
                            onClick={() => setSidebarOpen(true)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 12px",
                                borderRadius: 8,
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#1e293b",
                                cursor: "pointer",
                            }}
                        >
                            <currentStageDef.icon size={14} color={currentStageDef.color} />
                            <span>Stage {currentStageDef.no}: {currentStageDef.name}</span>
                            <ChevronDown size={14} />
                        </button>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                            {activeStageSummary?.status}
                        </span>
                    </div>

                    {/* Body: Sidebar + Main Content */}
                    <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
                        {/* Sidebar Overlay on mobile */}
                        {sidebarOpen && (
                            <div
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(15, 23, 42, 0.4)",
                                    zIndex: 15,
                                }}
                                className="md:hidden"
                            />
                        )}

                        {/* Sidebar: 11 Stages list */}
                        <div className={`crr-stage-sidebar ${sidebarOpen ? "open" : ""}`}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#64748b",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    padding: "6px 10px 10px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>CRR Journey Stages</span>
                                <span>(11)</span>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {stageSummaryList.map((stg) => {
                                    const Icon = stg.icon;
                                    const isSelected = stg.no === activeStageNo;
                                    const isCompleted = stg.status === "Complete";
                                    const isProcessing = stg.status === "Processing";

                                    return (
                                        <button
                                            key={stg.no}
                                            onClick={() => {
                                                setActiveStageNo(stg.no);
                                                setSidebarOpen(false);
                                            }}
                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                padding: "9px 10px",
                                                borderRadius: 10,
                                                border: "none",
                                                cursor: "pointer",
                                                background: isSelected ? `${stg.color}15` : "transparent",
                                                outline: isSelected ? `1.5px solid ${stg.color}40` : "none",
                                                textAlign: "left",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: 8,
                                                    background: isSelected
                                                        ? stg.color
                                                        : isCompleted
                                                            ? "#10b981"
                                                            : "#e2e8f0",
                                                    color: isSelected || isCompleted ? "#ffffff" : "#64748b",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                                            </div>

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontSize: 12.5,
                                                        fontWeight: isSelected ? 700 : 600,
                                                        color: isSelected ? "#0f172a" : "#334155",
                                                        lineHeight: 1.3,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {stg.no}. {stg.name}
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 6,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            color: "#64748b",
                                                            background: "#e2e8f0",
                                                            padding: "1px 6px",
                                                            borderRadius: 4,
                                                        }}
                                                    >
                                                        {stg.resp}
                                                    </span>

                                                    {isCompleted ? (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#059669" }}>
                                                            ✓ Done
                                                        </span>
                                                    ) : isProcessing ? (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>
                                                            ● In Review
                                                        </span>
                                                    ) : stg.hasSaved ? (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb" }}>
                                                            ● Has Data
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 10, color: "#94a3b8" }}>Pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Main Stage View Content Panel */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "20px 24px",
                                display: "flex",
                                flexDirection: "column",
                                background: "#f8fafc",
                            }}
                        >
                            {/* Stage Header Info Banner */}
                            <div
                                style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 14,
                                    padding: "16px 20px",
                                    marginBottom: 20,
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "flex-start",
                                        justifyContent: "space-between",
                                        gap: 12,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 10,
                                                background: currentStageDef.accentColor,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                color: currentStageDef.color,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <currentStageDef.icon size={20} />
                                        </div>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <h2
                                                    style={{
                                                        fontSize: 16,
                                                        fontWeight: 700,
                                                        color: "#0f172a",
                                                        margin: 0,
                                                    }}
                                                >
                                                    Stage {currentStageDef.no}: {currentStageDef.name}
                                                </h2>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        padding: "2px 8px",
                                                        borderRadius: 6,
                                                        background:
                                                            activeStageSummary?.status === "Complete"
                                                                ? "#d1fae5"
                                                                : activeStageSummary?.status === "Processing"
                                                                    ? "#fef3c7"
                                                                    : "#f1f5f9",
                                                        color:
                                                            activeStageSummary?.status === "Complete"
                                                                ? "#059669"
                                                                : activeStageSummary?.status === "Processing"
                                                                    ? "#d97706"
                                                                    : "#64748b",
                                                    }}
                                                >
                                                    {activeStageSummary?.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>
                                                Trigger: <strong style={{ color: "#334155" }}>{currentStageDef.trigger}</strong> · Responsible: <strong style={{ color: "#334155" }}>{currentStageDef.resp}</strong>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Planned / Actual Dates & Doer */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            fontSize: 12,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        {stageInfo?.plannedDate && (
                                            <div
                                                style={{
                                                    background: "#f1f5f9",
                                                    padding: "6px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #e2e8f0",
                                                }}
                                            >
                                                <span style={{ color: "#64748b", fontWeight: 600 }}>Planned: </span>
                                                <span style={{ color: "#0f172a", fontWeight: 700 }}>
                                                    {formatIST(stageInfo.plannedDate)}
                                                </span>
                                            </div>
                                        )}
                                        {stageInfo?.actualDate && (
                                            <div
                                                style={{
                                                    background: "#ecfdf5",
                                                    padding: "6px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #a7f3d0",
                                                }}
                                            >
                                                <span style={{ color: "#047857", fontWeight: 600 }}>Done: </span>
                                                <span style={{ color: "#065f46", fontWeight: 700 }}>
                                                    {formatIST(stageInfo.actualDate)}
                                                </span>
                                            </div>
                                        )}
                                        {stageInfo?.savedData?.doer && (
                                            <div
                                                style={{
                                                    background: "#f0fdf4",
                                                    padding: "6px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #bbf7d0",
                                                }}
                                            >
                                                <span style={{ color: "#166534", fontWeight: 600 }}>Doer: </span>
                                                <span style={{ color: "#14532d", fontWeight: 700 }}>
                                                    {String(stageInfo.savedData.doer)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stage Data Content */}
                            {stageContent ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {stageContent}
                                </div>
                            ) : (
                                /* Clean Empty State when no data filled for this stage */
                                <div
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: "#ffffff",
                                        border: "1px dashed #cbd5e1",
                                        borderRadius: 14,
                                        padding: "40px 20px",
                                        textAlign: "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 16,
                                            background: "#f1f5f9",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#94a3b8",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <Clock size={26} />
                                    </div>
                                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
                                        No Data Submitted Yet for Stage {activeStageNo}
                                    </h4>
                                    <p style={{ fontSize: 13, color: "#64748b", margin: 0, maxWidth: 360 }}>
                                        This stage is currently <strong>{activeStageSummary?.status}</strong>. Values will appear here once the responsible team ({currentStageDef.resp}) fills or completes this stage.
                                    </p>
                                    {stageInfo?.plannedDate && (
                                        <div
                                            style={{
                                                marginTop: 14,
                                                fontSize: 12,
                                                color: "#0369a1",
                                                background: "#f0f9ff",
                                                padding: "4px 12px",
                                                borderRadius: 20,
                                                border: "1px solid #bae6fd",
                                            }}
                                        >
                                            Planned for {formatIST(stageInfo.plannedDate)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Additional Saved Raw Data if present and unmapped */}
                            {rawSavedFields.length > 0 && !stageContent && (
                                <SectionGroup title="Additional Saved Fields">
                                    {rawSavedFields.map(([k, v]) => (
                                        <FieldBox key={k} label={k} value={v} />
                                    ))}
                                </SectionGroup>
                            )}

                            {/* Bottom Pagination / Stage Switching Bar */}
                            <div
                                style={{
                                    marginTop: "auto",
                                    paddingTop: 20,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <button
                                    onClick={() => setActiveStageNo((prev) => Math.max(1, prev - 1))}
                                    disabled={activeStageNo === 1}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        color: "#334155",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: activeStageNo === 1 ? "not-allowed" : "pointer",
                                        opacity: activeStageNo === 1 ? 0.4 : 1,
                                    }}
                                >
                                    ← Previous Stage
                                </button>

                                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                                    Stage {activeStageNo} of 11
                                </span>

                                <button
                                    onClick={() => setActiveStageNo((prev) => Math.min(11, prev + 1))}
                                    disabled={activeStageNo === 11}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: 8,
                                        border: "1px solid #cbd5e1",
                                        background: "#ffffff",
                                        color: "#334155",
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: activeStageNo === 11 ? "not-allowed" : "pointer",
                                        opacity: activeStageNo === 11 ? 0.4 : 1,
                                    }}
                                >
                                    Next Stage →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
