"use client";

import React, { useMemo, useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface SeniorVerifierRecord {
    id: string;
    leadId?: string;
    name?: string;
    mobile?: string;
    planned: string;
    actual: string;
    timeDelay: string;
    savedDoer?: string;
    savedDoerEmail?: string;
    savedVerifyActionStatus?: string;
    savedValidReason?: string;
    savedOverallRating?: string;
    savedHtCreatedStatus?: string;
    savedWhatsappAlert?: string;
    savedEmailAlert?: string;
    savedHsStatus?: string;
    savedTransferToUserFms?: string;
    savedWhatWentWrong?: string;
    savedSuggestedSolution?: string;
    savedRemarks?: string;
    savedColdBy?: string;
    savedColdRemarks?: string;
}

export interface SeniorVerifierFormValues {
    doer: string;
    doerEmail: string;
    coldBy: string;
    verifyActionStatus: string;
    validReason: string;
    coldRemarksBySalesTeam: string;
    overallRating: string;
    htCreatedStatus: "" | "Yes" | "No";
    whatsappAlert: "" | "Yes" | "No";
    emailAlert: "" | "Yes" | "No";
    hsStatus: "" | "Yes" | "No";
    transferToUserFms: string;
    whatWentWrong: string;
    suggestedSolution: string;
    remarks: string;
}

interface SeniorVerifierModalProps {
    record: SeniorVerifierRecord;
    open: boolean;
    onClose: () => void;
    onSubmit: (values: SeniorVerifierFormValues) => Promise<void> | void;
    defaultDoerName?: string;
    defaultDoerEmail?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const VERIFY_ACTION_STATUS_OPTIONS = [
    "Reopen",
    "Cold",
    "Reopen to Other",
    "Reopen and Escalate To Abhilash Sir",
];

const VALID_REASON_OPTIONS = [
    "Duplicate Enquiry",
    "Test Entry",
    "Not Interested",
    "Fake Query",
    "Spam Call",
    "Invalid Enquiry",
    "Not Related to Us",
    "Brand Query",
    "Wrong or Missing Contact Details",
    "No Incoming Response",
    "Internal Staff Contact",
    "Not Responding on Follow-Ups",
    "Price is High",
    "Shipping Cost Too High",
    "Very High Margin Expectations",
    "Need Cashless Facility",
    "Found a Better Deal Elsewhere",
    "Plan Cancelled/Dropped",
    "Booked Elsewhere",
    "Room Not Available",
    "Shorter Stay Request",
    "Not Eligible for Distributorship",
    "Does Not Have GST Number",
    "Looking for IT Department",
    "Related to Marketing Department",
    "Wants Degree in Ayurvedic Training",
    "Looking for Kids Treatment",
    "Looking for Corporate Wellness Program",
    "Asking for Other Company Products",
    "Looking for Another Brand",
    "No Treatment Available",
    "Critical Health Issues",
    "Distributor Already Exists in Area",
    "Information Seeker Only",
    "Already Taken Services",
    "Bad Experience",
    "Travel Restriction",
    "Language Barrier",
    "Other (Specify)",
];

const YES_NO_OPTIONS: Array<"Yes" | "No"> = ["Yes", "No"];

const OVERALL_RATING_OPTIONS = Array.from({ length: 10 }, (_, i) => String(i + 1));

const EMPTY_FORM: SeniorVerifierFormValues = {
    doer: "",
    doerEmail: "",
    coldBy: "",
    verifyActionStatus: "",
    validReason: "",
    coldRemarksBySalesTeam: "",
    overallRating: "",
    htCreatedStatus: "",
    whatsappAlert: "",
    emailAlert: "",
    hsStatus: "",
    transferToUserFms: "",
    whatWentWrong: "",
    suggestedSolution: "",
    remarks: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SeniorVerifierModal({
    record,
    open,
    onClose,
    onSubmit,
    defaultDoerName,
    defaultDoerEmail,
}: SeniorVerifierModalProps) {
    const [form, setForm] = useState<SeniorVerifierFormValues>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Planned must have a value or the modal is locked.
    const hasPlanned = Boolean(record?.planned && record.planned.trim() !== "");

    const isAlreadySubmitted = Boolean(record?.savedVerifyActionStatus);

    useEffect(() => {
        if (open) {
            if (isAlreadySubmitted) {
                setForm({
                    doer: record.savedDoer || "",
                    doerEmail: record.savedDoerEmail || "",
                    coldBy: record.savedColdBy || "",
                    verifyActionStatus: record.savedVerifyActionStatus || "",
                    validReason: record.savedValidReason || "",
                    coldRemarksBySalesTeam: record.savedColdRemarks || "",
                    overallRating: record.savedOverallRating ? String(record.savedOverallRating) : "",
                    htCreatedStatus: (record.savedHtCreatedStatus as any) || "",
                    whatsappAlert: (record.savedWhatsappAlert as any) || "",
                    emailAlert: (record.savedEmailAlert as any) || "",
                    hsStatus: (record.savedHsStatus as any) || "",
                    transferToUserFms: record.savedTransferToUserFms || "",
                    whatWentWrong: record.savedWhatWentWrong || "",
                    suggestedSolution: record.savedSuggestedSolution || "",
                    remarks: record.savedRemarks || "",
                });
            } else {
                setForm({
                    ...EMPTY_FORM,
                    doer: record.savedDoer || defaultDoerName || "",
                    doerEmail: record.savedDoerEmail || defaultDoerEmail || "",
                    coldBy: record.savedColdBy || "",
                    coldRemarksBySalesTeam: record.savedColdRemarks || "",
                });
            }
            setError(null);
            setSubmitted(false);
        }
    }, [open, defaultDoerName, defaultDoerEmail, isAlreadySubmitted, record]);

    const isFormComplete = useMemo(() => {
        const rating = Number(form.overallRating);
        return (
            form.doer.trim() !== "" &&
            form.doerEmail.trim() !== "" &&
            EMAIL_REGEX.test(form.doerEmail.trim()) &&
            form.verifyActionStatus !== "" &&
            form.validReason !== "" &&
            form.whatWentWrong.trim() !== "" &&
            form.overallRating.trim() !== "" &&
            !Number.isNaN(rating) &&
            rating >= 1 &&
            rating <= 10 &&
            // form.htCreatedStatus !== "" && // commented out with HT Created Status field
            // form.whatsappAlert !== "" && // commented out with WhatsApp Alert field
            // form.emailAlert !== "" && // commented out with Email Alert field
            // form.hsStatus !== "" && // commented out with HS Status field
            // form.transferToUserFms.trim() !== "" && // commented out with Transfer to USER FMS field
            form.suggestedSolution.trim() !== "" &&
            form.remarks.trim() !== ""
        );
    }, [form]);

    const canSubmit = hasPlanned && isFormComplete && !submitting && !submitted;

    if (!open) return null;

    const update = <K extends keyof SeniorVerifierFormValues>(
        key: K,
        value: SeniorVerifierFormValues[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitted(true);
        setError(null);
        try {
            await onSubmit(form);
        } catch (err) {
            setSubmitted(false);
            setError(
                err instanceof Error ? err.message : "Submit failed. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="relative flex items-start justify-between bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white font-bold">
                            S
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Senior Verifier
                            </h2>
                            <p className="text-xs text-violet-100">
                                Complete all fields to proceed
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-violet-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Lead ID</span>
                                    <span className="text-violet-100">{record?.leadId || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-violet-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Name</span>
                                    <span className="text-violet-100">{record?.name || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-violet-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Mobile</span>
                                    <span className="text-violet-100">{record?.mobile || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-violet-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Cold By</span>
                                    <span className="text-violet-100">{record?.savedColdBy || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-violet-50 ring-1 ring-inset ring-white/20 max-w-[420px]">
                                    <span className="font-semibold text-white shrink-0">Cold Remarks</span>
                                    <span className="text-violet-100 truncate" title={record?.savedColdRemarks || ""}>{record?.savedColdRemarks || "—"}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {!hasPlanned ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            This entry has no "Planned" value yet. Verification form is
                            locked until a Planned date/time is set.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                                <TextField
                                    label="Doer"
                                    required
                                    value={form.doer}
                                    onChange={(v) => update("doer", v)}
                                    disabled
                                    className="sm:col-span-1"
                                />

                                <SelectField
                                    label="Verify Action Status"
                                    required
                                    value={form.verifyActionStatus}
                                    options={VERIFY_ACTION_STATUS_OPTIONS}
                                    onChange={(v) => update("verifyActionStatus", v)}
                                    className="sm:col-span-1"
                                    disabled={isAlreadySubmitted}
                                />

                                <SelectField
                                    label="Valid Reason"
                                    required
                                    value={form.validReason}
                                    options={VALID_REASON_OPTIONS}
                                    onChange={(v) => update("validReason", v)}
                                    className="sm:col-span-1"
                                    disabled={isAlreadySubmitted}
                                />

                                <SelectField
                                    label="Overall Rating (Out of 10)"
                                    required
                                    value={form.overallRating}
                                    options={OVERALL_RATING_OPTIONS}
                                    onChange={(v) => update("overallRating", v)}
                                    className="sm:col-span-1"
                                    disabled={isAlreadySubmitted}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <TextAreaField
                                    label="What Went Wrong by Sales Team?"
                                    required
                                    value={form.whatWentWrong}
                                    onChange={(v) => update("whatWentWrong", v)}
                                    className="w-full"
                                    disabled={isAlreadySubmitted}
                                />

                                <TextAreaField
                                    label="Suggested Solution for Improvement"
                                    required
                                    value={form.suggestedSolution}
                                    onChange={(v) => update("suggestedSolution", v)}
                                    className="w-full"
                                    disabled={isAlreadySubmitted}
                                />
                            </div>

                            <TextAreaField
                                label="Remarks"
                                required
                                value={form.remarks}
                                onChange={(v) => update("remarks", v)}
                                className="w-full"
                                disabled={isAlreadySubmitted}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-gray-500">
                        <span>
                            <span className="font-medium uppercase tracking-wide text-gray-400">
                                Planned:{" "}
                            </span>
                            <span className="text-gray-700">{record?.planned || "—"}</span>
                        </span>
                        <span>
                            <span className="font-medium uppercase tracking-wide text-gray-400">
                                Actual:{" "}
                            </span>
                            <span className="text-gray-700">{record?.actual || "—"}</span>
                        </span>
                        <span>
                            <span className="font-medium uppercase tracking-wide text-gray-400">
                                Time Delay:{" "}
                            </span>
                            <span className="text-gray-700">
                                {record?.timeDelay || "—"}
                            </span>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            {isAlreadySubmitted ? "Close" : "Cancel"}
                        </button>
                        {!isAlreadySubmitted && (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${canSubmit
                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
                                    : "cursor-not-allowed bg-violet-300/60"
                                    }`}
                            >
                                {!submitting && <span aria-hidden>➤</span>}
                                {submitting
                                    ? "Submitting..."
                                    : submitted
                                        ? "Submitted"
                                        : "Submit"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Field primitives                                                     */
/* ------------------------------------------------------------------ */

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
    return (
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
    );
}

function TextField({
    label,
    required,
    value,
    onChange,
    type = "text",
    className = "",
    disabled,
}: {
    label: string;
    required?: boolean;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <div className={className}>
            <FieldLabel label={label} required={required} />
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function NumberField({
    label,
    required,
    value,
    onChange,
    min,
    max,
    className = "",
    disabled,
}: {
    label: string;
    required?: boolean;
    value: string;
    onChange: (v: string) => void;
    min?: number;
    max?: number;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <div className={className}>
            <FieldLabel label={label} required={required} />
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function TextAreaField({
    label,
    required,
    value,
    onChange,
    className = "",
    disabled,
}: {
    label: string;
    required?: boolean;
    value: string;
    onChange: (v: string) => void;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <div className={className}>
            <FieldLabel label={label} required={required} />
            <textarea
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full resize-none rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
            />
        </div>
    );
}

function SelectField({
    label,
    required,
    value,
    options,
    onChange,
    className = "",
    disabled,
}: {
    label: string;
    required?: boolean;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <div className={className}>
            <FieldLabel label={label} required={required} />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
            >
                <option value="">Select...</option>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </select>
        </div>
    );
}










// "use client";

// import React, { useMemo, useState, useEffect } from "react";

// /* ------------------------------------------------------------------ */
// /* Types                                                               */
// /* ------------------------------------------------------------------ */

// export interface SeniorVerifierRecord {
//     id: string;
//     planned: string;
//     actual: string;
//     timeDelay: string;
//     savedDoer?: string;
//     savedDoerEmail?: string;
//     savedVerifyActionStatus?: string;
//     savedValidReason?: string;
//     savedOverallRating?: string;
//     savedHtCreatedStatus?: string;
//     savedWhatsappAlert?: string;
//     savedEmailAlert?: string;
//     savedHsStatus?: string;
//     savedTransferToUserFms?: string;
//     savedWhatWentWrong?: string;
//     savedSuggestedSolution?: string;
//     savedRemarks?: string;
// }

// export interface SeniorVerifierFormValues {
//     doer: string;
//     doerEmail: string;
//     verifyActionStatus: string;
//     validReason: string;
//     overallRating: string;
//     htCreatedStatus: "" | "Yes" | "No";
//     whatsappAlert: "" | "Yes" | "No";
//     emailAlert: "" | "Yes" | "No";
//     hsStatus: "" | "Yes" | "No";
//     transferToUserFms: string;
//     whatWentWrong: string;
//     suggestedSolution: string;
//     remarks: string;
// }

// interface SeniorVerifierModalProps {
//     record: SeniorVerifierRecord;
//     open: boolean;
//     onClose: () => void;
//     onSubmit: (values: SeniorVerifierFormValues) => Promise<void> | void;
//     defaultDoerName?: string;
//     defaultDoerEmail?: string;
// }

// /* ------------------------------------------------------------------ */
// /* Constants                                                           */
// /* ------------------------------------------------------------------ */

// const VERIFY_ACTION_STATUS_OPTIONS = [
//     "Reopen",
//     "Cold",
//     "Reopen to Other",
//     "Reopen and Escalate To Abhilash Sir",
// ];

// const VALID_REASON_OPTIONS = [
//     "Duplicate Enquiry",
//     "Test Entry",
//     "Not Interested",
//     "Fake Query",
//     "Spam Call",
//     "Invalid Enquiry",
//     "Not Related to Us",
//     "Brand Query",
//     "Wrong or Missing Contact Details",
//     "No Incoming Response",
//     "Internal Staff Contact",
//     "Not Responding on Follow-Ups",
//     "Price is High",
//     "Shipping Cost Too High",
//     "Very High Margin Expectations",
//     "Need Cashless Facility",
//     "Found a Better Deal Elsewhere",
//     "Plan Cancelled/Dropped",
//     "Booked Elsewhere",
//     "Room Not Available",
//     "Shorter Stay Request",
//     "Not Eligible for Distributorship",
//     "Does Not Have GST Number",
//     "Looking for IT Department",
//     "Related to Marketing Department",
//     "Wants Degree in Ayurvedic Training",
//     "Looking for Kids Treatment",
//     "Looking for Corporate Wellness Program",
//     "Asking for Other Company Products",
//     "Looking for Another Brand",
//     "No Treatment Available",
//     "Critical Health Issues",
//     "Distributor Already Exists in Area",
//     "Information Seeker Only",
//     "Already Taken Services",
//     "Bad Experience",
//     "Travel Restriction",
//     "Language Barrier",
//     "Other (Specify)",
// ];

// const YES_NO_OPTIONS: Array<"Yes" | "No"> = ["Yes", "No"];

// const EMPTY_FORM: SeniorVerifierFormValues = {
//     doer: "",
//     doerEmail: "",
//     verifyActionStatus: "",
//     validReason: "",
//     overallRating: "",
//     htCreatedStatus: "",
//     whatsappAlert: "",
//     emailAlert: "",
//     hsStatus: "",
//     transferToUserFms: "",
//     whatWentWrong: "",
//     suggestedSolution: "",
//     remarks: "",
// };

// const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */

// export default function SeniorVerifierModal({
//     record,
//     open,
//     onClose,
//     onSubmit,
//     defaultDoerName,
//     defaultDoerEmail,
// }: SeniorVerifierModalProps) {
//     const [form, setForm] = useState<SeniorVerifierFormValues>(EMPTY_FORM);
//     const [submitting, setSubmitting] = useState(false);
//     const [submitted, setSubmitted] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     // Planned must have a value or the modal is locked.
//     const hasPlanned = Boolean(record?.planned && record.planned.trim() !== "");

//     const isAlreadySubmitted = Boolean(record?.actual && record.actual !== "—" && record.actual !== "");

//     useEffect(() => {
//         if (open) {
//             if (isAlreadySubmitted) {
//                 setForm({
//                     doer: record.savedDoer || "",
//                     doerEmail: record.savedDoerEmail || "",
//                     verifyActionStatus: record.savedVerifyActionStatus || "",
//                     validReason: record.savedValidReason || "",
//                     overallRating: record.savedOverallRating ? String(record.savedOverallRating) : "",
//                     htCreatedStatus: (record.savedHtCreatedStatus as any) || "",
//                     whatsappAlert: (record.savedWhatsappAlert as any) || "",
//                     emailAlert: (record.savedEmailAlert as any) || "",
//                     hsStatus: (record.savedHsStatus as any) || "",
//                     transferToUserFms: record.savedTransferToUserFms || "",
//                     whatWentWrong: record.savedWhatWentWrong || "",
//                     suggestedSolution: record.savedSuggestedSolution || "",
//                     remarks: record.savedRemarks || "",
//                 });
//             } else {
//                 setForm({
//                     ...EMPTY_FORM,
//                     doer: defaultDoerName || "",
//                     doerEmail: defaultDoerEmail || "",
//                 });
//             }
//             setError(null);
//             setSubmitted(false);
//         }
//     }, [open, defaultDoerName, defaultDoerEmail, isAlreadySubmitted, record]);

//     const isFormComplete = useMemo(() => {
//         const rating = Number(form.overallRating);
//         return (
//             form.doer.trim() !== "" &&
//             form.doerEmail.trim() !== "" &&
//             EMAIL_REGEX.test(form.doerEmail.trim()) &&
//             form.verifyActionStatus !== "" &&
//             form.validReason !== "" &&
//             form.overallRating.trim() !== "" &&
//             !Number.isNaN(rating) &&
//             rating >= 1 &&
//             rating <= 10 &&
//             form.htCreatedStatus !== "" &&
//             form.whatsappAlert !== "" &&
//             form.emailAlert !== "" &&
//             form.hsStatus !== "" &&
//             form.transferToUserFms.trim() !== "" &&
//             form.whatWentWrong.trim() !== "" &&
//             form.suggestedSolution.trim() !== "" &&
//             form.remarks.trim() !== ""
//         );
//     }, [form]);

//     const canSubmit = hasPlanned && isFormComplete && !submitting && !submitted;

//     if (!open) return null;

//     const update = <K extends keyof SeniorVerifierFormValues>(
//         key: K,
//         value: SeniorVerifierFormValues[K]
//     ) => {
//         setForm((prev) => ({ ...prev, [key]: value }));
//     };

//     const handleSubmit = async () => {
//         if (!canSubmit) return;
//         setSubmitting(true);
//         setSubmitted(true);
//         setError(null);
//         try {
//             await onSubmit(form);
//         } catch (err) {
//             setSubmitted(false);
//             setError(
//                 err instanceof Error ? err.message : "Submit failed. Please try again."
//             );
//         } finally {
//             setSubmitting(false);
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
//             <div className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
//                 {/* Header */}
//                 <div className="relative flex items-start justify-between bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-5">
//                     <div className="flex items-center gap-3">
//                         <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white font-bold">
//                             S
//                         </span>
//                         <div>
//                             <h2 className="text-base font-semibold text-white">
//                                 Senior Verifier
//                             </h2>
//                             <p className="text-xs text-violet-100">
//                                 Complete all fields to proceed
//                             </p>
//                         </div>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
//                         aria-label="Close"
//                     >
//                         ✕
//                     </button>
//                 </div>

//                 {/* Body */}
//                 <div className="flex-1 overflow-y-auto px-6 py-5">
//                     {!hasPlanned ? (
//                         <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
//                             This entry has no "Planned" value yet. Verification form is
//                             locked until a Planned date/time is set.
//                         </div>
//                     ) : (
//                         <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
//                             <TextField
//                                 label="Doer"
//                                 required
//                                 value={form.doer}
//                                 onChange={(v) => update("doer", v)}
//                                 disabled
//                                 className="sm:col-span-1"
//                             />

//                             <TextField
//                                 label="Doer Email ID"
//                                 required
//                                 type="email"
//                                 value={form.doerEmail}
//                                 onChange={(v) => update("doerEmail", v)}
//                                 disabled
//                                 className="sm:col-span-2"
//                             />

//                             <NumberField
//                                 label="Overall Rating (Out of 10)"
//                                 required
//                                 min={1}
//                                 max={10}
//                                 value={form.overallRating}
//                                 onChange={(v) => update("overallRating", v)}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="Verify Action Status"
//                                 required
//                                 value={form.verifyActionStatus}
//                                 options={VERIFY_ACTION_STATUS_OPTIONS}
//                                 onChange={(v) => update("verifyActionStatus", v)}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="Valid Reason"
//                                 required
//                                 value={form.validReason}
//                                 options={VALID_REASON_OPTIONS}
//                                 onChange={(v) => update("validReason", v)}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="HT Created Status (If delay)"
//                                 required
//                                 value={form.htCreatedStatus}
//                                 options={YES_NO_OPTIONS}
//                                 onChange={(v) =>
//                                     update("htCreatedStatus", v as "" | "Yes" | "No")
//                                 }
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="HS Status (If escalate to Abhilash Sir)"
//                                 required
//                                 value={form.hsStatus}
//                                 options={YES_NO_OPTIONS}
//                                 onChange={(v) => update("hsStatus", v as "" | "Yes" | "No")}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="WhatsApp Alert to Sales Person (If Reopen)"
//                                 required
//                                 value={form.whatsappAlert}
//                                 options={YES_NO_OPTIONS}
//                                 onChange={(v) => update("whatsappAlert", v as "" | "Yes" | "No")}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <SelectField
//                                 label="Email Alert to Sales Person (If Reopen)"
//                                 required
//                                 value={form.emailAlert}
//                                 options={YES_NO_OPTIONS}
//                                 onChange={(v) => update("emailAlert", v as "" | "Yes" | "No")}
//                                 className="sm:col-span-1"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <TextField
//                                 label="Transfer to USER FMS (If Reopen)"
//                                 required
//                                 value={form.transferToUserFms}
//                                 onChange={(v) => update("transferToUserFms", v)}
//                                 className="sm:col-span-2"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <TextAreaField
//                                 label="What Went Wrong by Sales Team?"
//                                 required
//                                 value={form.whatWentWrong}
//                                 onChange={(v) => update("whatWentWrong", v)}
//                                 className="sm:col-span-2"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <TextAreaField
//                                 label="Suggested Solution for Improvement"
//                                 required
//                                 value={form.suggestedSolution}
//                                 onChange={(v) => update("suggestedSolution", v)}
//                                 className="sm:col-span-2"
//                                 disabled={isAlreadySubmitted}
//                             />

//                             <TextAreaField
//                                 label="Remarks"
//                                 required
//                                 value={form.remarks}
//                                 onChange={(v) => update("remarks", v)}
//                                 className="sm:col-span-4"
//                                 disabled={isAlreadySubmitted}
//                             />
//                         </div>
//                     )}

//                     {error && (
//                         <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
//                             {error}
//                         </div>
//                     )}
//                 </div>

//                 {/* Footer */}
//                 <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
//                     <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
//                         <span>
//                             <span className="font-medium uppercase tracking-wide text-gray-400">
//                                 Planned:{" "}
//                             </span>
//                             <span className="text-gray-700">{record?.planned || "—"}</span>
//                         </span>
//                         <span>
//                             <span className="font-medium uppercase tracking-wide text-gray-400">
//                                 Actual:{" "}
//                             </span>
//                             <span className="text-gray-700">{record?.actual || "—"}</span>
//                         </span>
//                         <span>
//                             <span className="font-medium uppercase tracking-wide text-gray-400">
//                                 Time Delay:{" "}
//                             </span>
//                             <span className="text-gray-700">
//                                 {record?.timeDelay || "—"}
//                             </span>
//                         </span>
//                     </div>

//                     <div className="flex items-center gap-3">
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
//                         >
//                             {isAlreadySubmitted ? "Close" : "Cancel"}
//                         </button>
//                         {!isAlreadySubmitted && (
//                             <button
//                                 type="button"
//                                 onClick={handleSubmit}
//                                 disabled={!canSubmit}
//                                 className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${canSubmit
//                                     ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
//                                     : "cursor-not-allowed bg-violet-300/60"
//                                     }`}
//                             >
//                                 {!submitting && <span aria-hidden>➤</span>}
//                                 {submitting
//                                     ? "Submitting..."
//                                     : submitted
//                                         ? "Submitted"
//                                         : "Submit"}
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* ------------------------------------------------------------------ */
// /* Field primitives                                                     */
// /* ------------------------------------------------------------------ */

// function FieldLabel({ label, required }: { label: string; required?: boolean }) {
//     return (
//         <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
//             {label} {required && <span className="text-red-500">*</span>}
//         </label>
//     );
// }

// function TextField({
//     label,
//     required,
//     value,
//     onChange,
//     type = "text",
//     className = "",
//     disabled,
// }: {
//     label: string;
//     required?: boolean;
//     value: string;
//     onChange: (v: string) => void;
//     type?: string;
//     className?: string;
//     disabled?: boolean;
// }) {
//     return (
//         <div className={className}>
//             <FieldLabel label={label} required={required} />
//             <input
//                 type={type}
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 disabled={disabled}
//                 className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
//             />
//         </div>
//     );
// }

// function NumberField({
//     label,
//     required,
//     value,
//     onChange,
//     min,
//     max,
//     className = "",
//     disabled,
// }: {
//     label: string;
//     required?: boolean;
//     value: string;
//     onChange: (v: string) => void;
//     min?: number;
//     max?: number;
//     className?: string;
//     disabled?: boolean;
// }) {
//     return (
//         <div className={className}>
//             <FieldLabel label={label} required={required} />
//             <input
//                 type="number"
//                 min={min}
//                 max={max}
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 disabled={disabled}
//                 className="w-full rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
//             />
//         </div>
//     );
// }

// function TextAreaField({
//     label,
//     required,
//     value,
//     onChange,
//     className = "",
//     disabled,
// }: {
//     label: string;
//     required?: boolean;
//     value: string;
//     onChange: (v: string) => void;
//     className?: string;
//     disabled?: boolean;
// }) {
//     return (
//         <div className={className}>
//             <FieldLabel label={label} required={required} />
//             <textarea
//                 rows={3}
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 disabled={disabled}
//                 className="w-full resize-none rounded-md border border-indigo-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
//             />
//         </div>
//     );
// }

// function SelectField({
//     label,
//     required,
//     value,
//     options,
//     onChange,
//     className = "",
//     disabled,
// }: {
//     label: string;
//     required?: boolean;
//     value: string;
//     options: string[];
//     onChange: (v: string) => void;
//     className?: string;
//     disabled?: boolean;
// }) {
//     return (
//         <div className={className}>
//             <FieldLabel label={label} required={required} />
//             <select
//                 value={value}
//                 onChange={(e) => onChange(e.target.value)}
//                 disabled={disabled}
//                 className="w-full rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-300 disabled:cursor-not-allowed"
//             >
//                 <option value="">Select...</option>
//                 {options.map((opt) => (
//                     <option key={opt} value={opt}>
//                         {opt}
//                     </option>
//                 ))}
//             </select>
//         </div>
//     );
// }