import React, { useState, type ReactNode } from "react";
import { Repeat, X, Upload, Check, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const DOCTORS = ["Dr Deepu John", "Dr. Rahul R", "Ashika Raj", "Dr. Akhila Oommen"];

/** Format a raw date string (ISO or DD/MM/YYYY) into a readable form like "05 November 2026" */
function formatDate(raw?: string): string {
    if (!raw) return "—";
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    }
    return raw; // fallback: return as-is
}

// Each editable section gets its own accent so the user can tell them apart at a glance
const SECTION_THEMES = {
    pickup: { bg: "#eef4ff", border: "#cddcfb", head: "#1d4ed8" },
    guest: { bg: "#f4f0ff", border: "#ded3fb", head: "#6d28d9" },
    boarding: { bg: "#e9fbf5", border: "#c3f0e1", head: "#0f766e" },
};

interface SummaryFieldProps {
    label: string;
    value: ReactNode;
    accent?: boolean;
}

function SummaryField({ label, value, accent = false }: SummaryFieldProps) {
    return (
        <div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{label}</p>
            <p
                style={{
                    fontSize: 14,
                    fontWeight: 600,
                    margin: "2px 0 0",
                    color: accent ? "#16a34a" : "#1e2a4a",
                }}
            >
                {value}
            </p>
        </div>
    );
}

function LinkSummaryField({ label, href }: { label: string; href?: string }) {
    const hasLink = href && href !== "N/A" && href.trim() !== "";
    return (
        <div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{label}</p>
            {hasLink ? (
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        marginTop: 4,
                        padding: "3px 12px",
                        borderRadius: 6,
                        background: "linear-gradient(135deg, #7a72e0, #6259d6)",
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                        cursor: "pointer",
                        letterSpacing: 0.3,
                    }}
                >
                    ↗ View
                </a>
            ) : (
                <p style={{ fontSize: 14, fontWeight: 600, margin: "2px 0 0", color: "#9ca3af" }}>N/A</p>
            )}
        </div>
    );
}

type SectionTheme = (typeof SECTION_THEMES)[keyof typeof SECTION_THEMES];

function SectionWrapper({ theme, children }: { theme: SectionTheme; children: ReactNode }) {
    return (
        <div
            style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                borderRadius: 14,
                padding: "16px 18px 18px",
                marginBottom: 20,
            }}
        >
            {children}
        </div>
    );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
    return (
        <h3 style={{ fontSize: 14, fontWeight: 700, color, margin: "0 0 14px" }}>{title}</h3>
    );
}

function Label({ children }: { children: ReactNode }) {
    return (
        <label
            style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#374151",
                marginBottom: 6,
            }}
        >
            {children} <span style={{ color: "#ef4444" }}>*</span>
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
    appearance: "none",
};

const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 60,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    fontSize: 14,
    color: "#1f2937",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
};

// Non-editable / locked fields are always grey, regardless of which section they sit in
const readonlyBoxStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#e5e7eb",
    fontSize: 14,
    color: "#6b7280",
};

function UploadBox({
    file,
    onChange,
    id,
}: {
    file: File | null;
    onChange: (file: File | null) => void;
    id: string;
}) {
    return (
        <label
            htmlFor={id}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px dashed #a5b4fc",
                background: "#ffffff",
                fontSize: 14,
                color: file ? "#1f2937" : "#9ca3af",
                cursor: "pointer",
            }}
        >
            <Upload size={16} color="#6d64d8" />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file ? file.name : "Click to upload a file"}
            </span>
            <input
                id={id}
                type="file"
                style={{ display: "none" }}
                onChange={(e) => onChange(e.target.files?.[0] || null)}
            />
        </label>
    );
}

const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

interface ArrivalBooking {
    guestName?: string;
    bookingId?: string;
    mobile?: string;
    countryCode?: string;
    piHistoryLink?: string;
    checkIn?: string;
    checkOut?: string;
    amount?: string | number;
    programmeName?: string;
}

interface ArrivalGuestTrackerData {
    arrivalstage?: {
        arrival_planned?: string | null;
    } | null;
}

interface ArrivalTicketsModalProps {
    open?: boolean;
    booking?: ArrivalBooking | null;
    guestTrackerData?: ArrivalGuestTrackerData | null;
    onClose?: () => void;
    onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

export default function ArrivalTicketsModal({ open = true, booking = null, guestTrackerData = null, onClose = () => { }, onSubmit = () => { } }: ArrivalTicketsModalProps) {
    const { user } = useAuth();
    const currentUser = user?.name || "";

    // Build summary from the real booking prop
    const summary = {
        customer: booking?.guestName || "",
        bookingId: booking?.bookingId || "",
        phoneNo: booking?.mobile ? `${booking?.countryCode || ""}${booking?.mobile}` : "",
        piLink: booking?.piHistoryLink || "N/A",
        checkIn: formatDate(booking?.checkIn),
        checkOut: formatDate(booking?.checkOut),
        totalPiAmount: booking?.amount ? String(booking.amount) : "",
        package: booking?.programmeName || "",
    };

    // Gate: arrival_planned must be set before the form is usable
    const arrivalPlanned = guestTrackerData?.arrivalstage?.arrival_planned ?? "";
    const isPlanned = Boolean(
        arrivalPlanned && String(arrivalPlanned).trim() !== "" && String(arrivalPlanned).trim() !== "null"
    );

    // Gate: once check-in date has arrived/passed (today >= checkIn date), arrival form locks
    const isLockedAfterCheckin = (() => {
        if (!booking?.checkIn) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(booking.checkIn);
        checkInDate.setHours(0, 0, 0, 0);
        return today >= checkInDate;
    })();

    console.log("Is person checkin", isLockedAfterCheckin);

    const [pickupRequired, setPickupRequired] = useState("");
    const [arrivalTicketFile, setArrivalTicketFile] = useState<File | null>(null);
    const [uploadRemarks, setUploadRemarks] = useState("");

    const [assignedDoctor, setAssignedDoctor] = useState("");
    const [wheelchair, setWheelchair] = useState("");
    const [specialRequest, setSpecialRequest] = useState("");

    const [boardingPassFile, setBoardingPassFile] = useState<File | null>(null);
    const [boardingRemarks, setBoardingRemarks] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (!open) return null;

    const isValid = () => {
        if (!isPlanned) return false;
        if (isLockedAfterCheckin) return false;
        if (!pickupRequired) return false;
        if (pickupRequired === "yes" && (!arrivalTicketFile || !uploadRemarks.trim())) return false;
        if (!assignedDoctor) return false;
        if (!wheelchair) return false;
        if (!specialRequest.trim()) return false;
        if (pickupRequired === "yes" && (!boardingPassFile || !boardingRemarks.trim())) return false;
        return true;
    };

    /** Convert a File to {base64, mimeType, filename} expected by the Apps Script */
    const toBase64 = (file: File): Promise<{ base64: string; mimeType: string; filename: string }> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                resolve({
                    base64: result.split(",")[1],
                    mimeType: file.type,
                    filename: file.name,
                });
            };
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
        });

    const SUBMIT_URL = "/api/arrival-departure";

    const handleSubmit = async () => {
        if (!isValid() || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const payload: Record<string, unknown> = {
                action: "arrival",
                bookingid: booking?.bookingId || "",
                name: booking?.guestName || "",
                mobile: booking?.mobile || "",
                uploadedby: currentUser,
                pickuprequired: pickupRequired === "yes" ? "Yes" : "No",
                assigndoctor: assignedDoctor,
                wcreq: wheelchair === "yes" ? "Yes" : "No",
                osreq: specialRequest,
            };

            if (pickupRequired === "yes") {
                payload.ticketremarks = uploadRemarks;
                payload.boardinguploadremarks = boardingRemarks;
                if (arrivalTicketFile) {
                    payload.ticketscreenshot = await toBase64(arrivalTicketFile);
                }
                if (boardingPassFile) {
                    payload.boardingpassscreenshot = await toBase64(boardingPassFile);
                }
            }

            try {
                const response = await fetch(SUBMIT_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const data = await response.json().catch(() => null);
                if (!response.ok || data?.success === false) {
                    throw new Error(data?.message || `Arrival submission failed (${response.status})`);
                }

                onSubmit({ ...payload, responseMessage: data?.message || "Form Submitted Successfully!" });
            } catch (networkErr: unknown) {
                throw new Error(networkErr instanceof Error ? networkErr.message : "Network error");
            }
        } catch (err: unknown) {
            console.error("Arrival submission error:", err);
            setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            style={{
                minHeight: 480,
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
                            <p style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>
                                Arrival Tickets Upload
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "2px 0 0" }}>
                                {isPlanned ? `Planned: ${formatDate(arrivalPlanned)}` : "Complete all fields to proceed"}
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
                    {/* Locked Booking Summary - always grey, never editable */}
                    <div
                        style={{
                            background: "#f3f4f6",
                            border: "1px solid #d1d5db",
                            borderRadius: 14,
                            padding: "16px 18px",
                            marginBottom: 20,
                        }}
                    >
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#4b5563", margin: "0 0 12px" }}>
                            Booking Summary (read-only)
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", rowGap: 14, columnGap: 16 }}>
                            <SummaryField label="Customer" value={summary.customer} />
                            <SummaryField label="Booking ID" value={summary.bookingId} />
                            <SummaryField label="Phone No" value={summary.phoneNo} />
                            <LinkSummaryField label="PI Link" href={summary.piLink} />
                            <SummaryField label="Check-in Date" value={summary.checkIn} />
                            <SummaryField label="Check-out Date" value={summary.checkOut} />
                            <SummaryField label="Total PI Amount" value={summary.totalPiAmount} accent />
                            <SummaryField label="Package" value={summary.package} />
                        </div>
                    </div>

                    {/* ── NOT PLANNED YET — show locked banner, hide the form ── */}
                    {!isPlanned ? (
                        <div
                            style={{
                                background: "#fef9ee",
                                border: "1.5px solid #fbbf24",
                                borderRadius: 14,
                                padding: "28px 24px",
                                textAlign: "center",
                                marginBottom: 20,
                            }}
                        >
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>
                                Arrival Stage Not Scheduled Yet
                            </p>
                            <p style={{ fontSize: 13, color: "#a16207", margin: 0, maxWidth: 480, marginInline: "auto" }}>
                                This form will be enabled once the arrival stage has been planned in the Guest Tracker.
                                Please contact the responsible team to schedule the planned date first.
                            </p>
                        </div>
                    ) : isLockedAfterCheckin ? (
                        <div
                            style={{
                                background: "#fef2f2",
                                border: "1.5px solid #fca5a5",
                                borderRadius: 14,
                                padding: "28px 24px",
                                textAlign: "center",
                                marginBottom: 20,
                            }}
                        >
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
                            <p style={{ fontSize: 16, fontWeight: 700, color: "#991b1b", margin: "0 0 8px" }}>
                                Arrival Form Locked
                            </p>
                            <p style={{ fontSize: 13, color: "#b91c1c", margin: 0, maxWidth: 480, marginInline: "auto" }}>
                                This guest has already checked in, so the arrival form can no longer be filled.
                                It could only be completed on or before the scheduled check-in date.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Section 1: Pickup */}
                            <SectionWrapper theme={SECTION_THEMES.pickup}>
                                <SectionHeader title="Pickup Details" color={SECTION_THEMES.pickup.head} />
                                <div style={{ marginBottom: pickupRequired === "yes" ? 16 : 0 }}>
                                    <Label>Pickup Required?</Label>
                                    <select style={selectStyle} value={pickupRequired} onChange={(e) => setPickupRequired(e.target.value)}>
                                        <option value="">Select an option</option>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                {pickupRequired === "yes" && (
                                    <>
                                        <div style={{ ...row2, marginBottom: 16 }}>
                                            <div>
                                                <Label>Upload Arrival Tickets</Label>
                                                <UploadBox id="arrival-ticket-upload" file={arrivalTicketFile} onChange={setArrivalTicketFile} />
                                            </div>
                                            <div>
                                                <Label>Uploaded By</Label>
                                                <div style={readonlyBoxStyle}>{currentUser}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Upload Remarks</Label>
                                            <textarea
                                                style={textareaStyle}
                                                placeholder="Enter remarks..."
                                                value={uploadRemarks}
                                                onChange={(e) => setUploadRemarks(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

                                {pickupRequired === "no" && (
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
                                        Pickup not required — this will be saved to the booking record.
                                    </div>
                                )}
                            </SectionWrapper>

                            {/* Section 2: Guest Requests & Doctor */}
                            <SectionWrapper theme={SECTION_THEMES.guest}>
                                <SectionHeader title="Confirm Guest Requests & Doctor" color={SECTION_THEMES.guest.head} />
                                <div style={{ ...row2, marginBottom: 16 }}>
                                    <div>
                                        <Label>Please Assign Doctor</Label>
                                        <select style={selectStyle} value={assignedDoctor} onChange={(e) => setAssignedDoctor(e.target.value)}>
                                            <option value="">Select doctor</option>
                                            {DOCTORS.map((doc) => (
                                                <option key={doc} value={doc}>
                                                    {doc}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <Label>Wheel Chair Requirement?</Label>
                                        <select style={selectStyle} value={wheelchair} onChange={(e) => setWheelchair(e.target.value)}>
                                            <option value="">Select an option</option>
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label>Any other special request/requirement by Guest?</Label>
                                    <textarea
                                        style={textareaStyle}
                                        placeholder="Enter special request..."
                                        value={specialRequest}
                                        onChange={(e) => setSpecialRequest(e.target.value)}
                                    />
                                </div>
                            </SectionWrapper>

                            {/* Section 3: Boarding Pass - only relevant when pickup is required */}
                            {pickupRequired === "yes" && (
                                <SectionWrapper theme={SECTION_THEMES.boarding}>
                                    <SectionHeader title="Boarding Pass" color={SECTION_THEMES.boarding.head} />
                                    <div style={row2}>
                                        <div>
                                            <Label>Upload Boarding Pass</Label>
                                            <UploadBox id="boarding-pass-upload" file={boardingPassFile} onChange={setBoardingPassFile} />
                                        </div>
                                        <div>
                                            <Label>Upload Remarks</Label>
                                            <textarea
                                                style={{ ...textareaStyle, minHeight: 42 }}
                                                placeholder="Enter remarks..."
                                                value={boardingRemarks}
                                                onChange={(e) => setBoardingRemarks(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </SectionWrapper>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
                        {submitError && (
                            <div style={{
                                padding: "10px 14px",
                                borderRadius: 10,
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                fontSize: 13,
                                fontWeight: 500,
                            }}>
                                ⚠️ {submitError}
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 12 }}>
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                style={{
                                    flex: 1,
                                    padding: "12px 0",
                                    borderRadius: 12,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    color: "#374151",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: isSubmitting ? "not-allowed" : "pointer",
                                    opacity: isSubmitting ? 0.5 : 1,
                                }}
                            >
                                Cancel
                            </button>
                            {isPlanned && !isLockedAfterCheckin && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!isValid() || isSubmitting}
                                    style={{
                                        flex: 2,
                                        padding: "12px 0",
                                        borderRadius: 12,
                                        border: "none",
                                        background: (isValid() && !isSubmitting)
                                            ? "linear-gradient(135deg, #8a82e6, #6259d6)"
                                            : "#c7c5ea",
                                        color: "#fff",
                                        fontSize: 14,
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                        cursor: (isValid() && !isSubmitting) ? "pointer" : "not-allowed",
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                                                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                            </svg>
                                            Submitting...
                                        </>
                                    ) : (
                                        <><Send size={15} /> Submit</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        </div>
    );
}
