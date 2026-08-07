"use client";

import React, { useMemo, useState, useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ExecutiveVerifierRecord {
    id: string;
    leadId?: string;
    name?: string;
    mobile?: string;
    planned: string; // read-only, comes from data. Empty/null => modal cannot open
    actual: string; // read-only, comes from data
    timeDelay: string; // read-only, comes from data
    savedDoer?: string;
    savedVerifyActionStatus?: string;
    savedValidReason?: string;
    savedWhatWentWrong?: string;
    savedOverallRating?: string;
    savedSuggestedSolution?: string;
    savedRemarks?: string;
    savedHtCreatedStatus?: string;
    savedDoerEmail?: string;
    savedHsStatus?: string;
    savedColdBy?: string;
    savedColdRemarks?: string;
}

export interface ExecutiveVerifierFormValues {
    doer: string;
    verifyActionStatus: string;
    validReason: string;
    whatWentWrong: string;
    overallRating: string;
    suggestedSolution: string;
    remarks: string;
    htCreatedStatus: "" | "Yes" | "No";
    doerEmail: string;
    hsStatus: "" | "Yes" | "No";
    coldBy: string;
    coldRemarksBySalesTeam: string;
}

interface ExecutiveVerifierModalProps {
    record: ExecutiveVerifierRecord;
    open: boolean;
    onClose: () => void;
    onSubmit: (values: ExecutiveVerifierFormValues) => Promise<void> | void;
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

const EMPTY_FORM: ExecutiveVerifierFormValues = {
    doer: "",
    verifyActionStatus: "",
    validReason: "",
    whatWentWrong: "",
    overallRating: "",
    suggestedSolution: "",
    remarks: "",
    htCreatedStatus: "",
    doerEmail: "",
    hsStatus: "",
    coldBy: "",
    coldRemarksBySalesTeam: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExecutiveVerifierModal({
    record,
    open,
    onClose,
    onSubmit,
    defaultDoerName,
    defaultDoerEmail,
}: ExecutiveVerifierModalProps) {
    const [form, setForm] = useState<ExecutiveVerifierFormValues>(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAlreadySubmitted = Boolean(record?.savedVerifyActionStatus);

    React.useEffect(() => {
        if (open) {
            if (isAlreadySubmitted) {
                setForm({
                    doer: record.savedDoer || "",
                    doerEmail: record.savedDoerEmail || "",
                    verifyActionStatus: record.savedVerifyActionStatus || "",
                    validReason: record.savedValidReason || "",
                    overallRating: record.savedOverallRating ? String(record.savedOverallRating) : "",
                    whatWentWrong: record.savedWhatWentWrong || "",
                    suggestedSolution: record.savedSuggestedSolution || "",
                    remarks: record.savedRemarks || "",
                    htCreatedStatus: (record.savedHtCreatedStatus as any) || "",
                    hsStatus: (record.savedHsStatus as any) || "",
                    coldBy: record.savedColdBy || "",
                    coldRemarksBySalesTeam: record.savedColdRemarks || "",
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

    // Planned must have a value or the modal is not allowed to be used at all.
    const hasPlanned = Boolean(record?.planned && record.planned.trim() !== "");

    const isFormComplete = useMemo(() => {
        const rating = Number(form.overallRating);
        return (
            form.doer.trim() !== "" &&
            form.verifyActionStatus !== "" &&
            form.validReason !== "" &&
            form.whatWentWrong.trim() !== "" &&
            form.overallRating.trim() !== "" &&
            !Number.isNaN(rating) &&
            rating >= 1 &&
            rating <= 10 &&
            form.suggestedSolution.trim() !== "" &&
            form.remarks.trim() !== "" &&
            // form.htCreatedStatus !== "" && // commented out with HT Created Status field
            form.doerEmail.trim() !== "" &&
            EMAIL_REGEX.test(form.doerEmail.trim())
            // form.hsStatus !== "" && // commented out with HS Status field
        );
    }, [form]);

    const canSubmit = hasPlanned && isFormComplete && !submitting && !submitted;

    if (!open) return null;

    const update = <K extends keyof ExecutiveVerifierFormValues>(
        key: K,
        value: ExecutiveVerifierFormValues[K]
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitted(true); // disable immediately, prevents double submit
        setError(null);
        try {
            await onSubmit(form);
        } catch (err) {
            // allow retry on failure
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
                <div className="relative flex items-start justify-between bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg text-white">
                            ✓
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-white">
                                Executive Verifier
                            </h2>
                            <p className="text-xs text-indigo-100">
                                Complete all fields to proceed
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Lead ID</span>
                                    <span className="text-indigo-100">{record?.leadId || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Name</span>
                                    <span className="text-indigo-100">{record?.name || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Mobile</span>
                                    <span className="text-indigo-100">{record?.mobile || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20">
                                    <span className="font-semibold text-white">Cold By</span>
                                    <span className="text-indigo-100">{record?.savedColdBy || "—"}</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-indigo-50 ring-1 ring-inset ring-white/20 max-w-[420px]">
                                    <span className="font-semibold text-white shrink-0">Cold Remarks</span>
                                    <span className="text-indigo-100 truncate" title={record?.savedColdRemarks || ""}>{record?.savedColdRemarks || "—"}</span>
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
                    <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
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
                                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                                    : "cursor-not-allowed bg-indigo-300/60"
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