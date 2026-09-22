"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
    FEEDBACK_SECTIONS,
    type FeedbackField,
    type FeedbackOption,
    formMissing,
    isSectionSkipped,
    nextStepIndex,
    stepMissing,
    uploadFieldNames,
    visibleSteps,
} from "@/lib/crr-feedback-form";

export type FeedbackValues = Record<string, string | boolean>;

interface RemoteLists { rooms: string[]; doctors: string[] }

const EMPTY_LISTS: RemoteLists = { rooms: [], doctors: [] };

// Base64 inflates by ~4/3 and the whole submission shares one request budget.
const MAX_UPLOAD_BYTES = 3_000_000;

const labelCls = "text-xs font-bold text-slate-800 flex items-center gap-1";
const inputCls =
    "w-full h-10 px-3 rounded-lg border-2 border-slate-300 bg-white text-slate-900 text-xs font-medium " +
    "shadow-sm hover:border-slate-500 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-200 " +
    "disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200";

function Req() {
    return <span className="text-red-500 font-bold">*</span>;
}

function optionsFor(field: FeedbackField, lists: RemoteLists): FeedbackOption[] {
    if (!field.remote) return field.options ?? [];
    return (lists[field.remote] ?? []).map((v) => ({ value: v, label: v }));
}

export default function GuestFeedbackForm({
    values,
    onChange,
    disabled = false,
    onSubmit,
    submitting = false,
}: {
    values: FeedbackValues;
    onChange: (next: FeedbackValues) => void;
    disabled?: boolean;
    onSubmit: () => void;
    submitting?: boolean;
}) {
    const [lists, setLists] = useState<RemoteLists>(EMPTY_LISTS);
    const [listsError, setListsError] = useState("");
    const [uploadError, setUploadError] = useState("");
    const [showErrors, setShowErrors] = useState(false);
    const [step, setStep] = useState(0);

    // Rooms, doctors and feedback takers are not in the form definition — the original
    // page looks them up on open, and so do we (through our own proxy).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/crr-calling/feedback", { cache: "no-store" });
                const json = await res.json();
                if (cancelled) return;
                if (res.ok && json.success) setLists({ ...EMPTY_LISTS, ...json.data });
                else setListsError("Room and doctor lists could not be loaded.");
            } catch {
                if (!cancelled) setListsError("Room and doctor lists could not be loaded.");
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const section = FEEDBACK_SECTIONS[step];
    const missing = useMemo(() => stepMissing(section, values), [section, values]);
    const isLast = useMemo(() => nextStepIndex(step, values, 1) === step, [step, values]);
    // Position among the steps actually shown, so the count does not jump when one is skipped.
    const shownIndex = useMemo(
        () => FEEDBACK_SECTIONS.slice(0, step + 1).filter((s) => !isSectionSkipped(s, values)).length,
        [step, values]
    );
    const shownTotal = useMemo(() => visibleSteps(values), [values]);

    function go(direction: 1 | -1) {
        if (direction === 1 && stepMissing(section, values).length > 0) {
            setShowErrors(true);
            return;
        }
        setShowErrors(false);
        setUploadError("");
        setStep(nextStepIndex(step, values, direction));
    }

    const set = (name: string, value: string | boolean) => onChange({ ...values, [name]: value });

    async function handleFile(field: FeedbackField, file: File | null) {
        const [dataKey, mimeKey, nameKey] = uploadFieldNames(field.name);
        if (!file) {
            const next = { ...values };
            delete next[dataKey]; delete next[mimeKey]; delete next[nameKey];
            onChange(next);
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            setUploadError(`${field.label} must be under ${Math.floor(MAX_UPLOAD_BYTES / 1_000_000)} MB.`);
            return;
        }
        setUploadError("");
        const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        // Three companion fields per upload, exactly as the original page builds them.
        onChange({
            ...values,
            [dataKey]: dataUrl.split(",")[1] ?? "",
            [mimeKey]: dataUrl.match(/^data:(.*?);base64/)?.[1] ?? file.type,
            [nameKey]: file.name,
        });
    }

    function renderField(field: FeedbackField) {
        const value = values[field.name];
        const invalid = showErrors && field.required && (field.kind === "checkbox" ? value !== true : !String(value ?? "").trim());
        const ring = invalid ? " border-red-400 focus:border-red-500 focus:ring-red-200" : "";

        if (field.kind === "rating") {
            return (
                <div key={field.name} className="flex flex-col gap-1.5 py-2 border-b border-slate-100 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-medium text-slate-700">{field.label}</span>
                    <div className="flex flex-wrap gap-3">
                        {(field.options ?? []).map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value={opt.value}
                                    checked={value === opt.value}
                                    disabled={disabled}
                                    onChange={() => set(field.name, opt.value)}
                                    className="accent-amber-600 h-3.5 w-3.5"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        if (field.kind === "checkbox") {
            return (
                <label key={field.name} className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value === true}
                        disabled={disabled}
                        onChange={(e) => set(field.name, e.target.checked)}
                        className={"mt-0.5 accent-amber-600 h-4 w-4" + (invalid ? " outline outline-2 outline-red-400" : "")}
                    />
                    <span>{field.label} {field.required && <Req />}</span>
                </label>
            );
        }

        if (field.kind === "file") {
            const [, , nameKey] = uploadFieldNames(field.name);
            return (
                <div key={field.name} className="space-y-1.5">
                    <span className={labelCls}>{field.label}</span>
                    <input
                        type="file"
                        accept={field.accept}
                        disabled={disabled}
                        onChange={(e) => handleFile(field, e.target.files?.[0] ?? null)}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-amber-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-amber-700"
                    />
                    {values[nameKey] && <p className="text-[11px] text-slate-500 break-all">Attached: {String(values[nameKey])}</p>}
                </div>
            );
        }

        return (
            <div key={field.name} className="space-y-1.5">
                <span className={labelCls}>{field.label} {field.required && <Req />}</span>
                {field.kind === "textarea" ? (
                    <textarea
                        value={String(value ?? "")}
                        disabled={disabled}
                        placeholder={field.placeholder}
                        onChange={(e) => set(field.name, e.target.value)}
                        className={inputCls + ring + " h-auto min-h-[70px] py-2 resize-y"}
                    />
                ) : field.kind === "select" ? (
                    <select
                        value={String(value ?? "")}
                        disabled={disabled}
                        onChange={(e) => set(field.name, e.target.value)}
                        className={inputCls + ring}
                    >
                        <option value="">-- Please select --</option>
                        {optionsFor(field, lists).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={field.type ?? "text"}
                        value={String(value ?? "")}
                        disabled={disabled}
                        readOnly={field.readOnly}
                        placeholder={field.placeholder}
                        onChange={field.readOnly ? undefined : (e) => set(field.name, e.target.value)}
                        className={inputCls + ring + (field.readOnly ? " bg-slate-100 text-slate-600 cursor-not-allowed" : "")}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {listsError && (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {listsError}
                </div>
            )}

            {/* Progress, mirroring the reference form's bar and step counter */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    <span>Step {shownIndex} of {shownTotal}</span>
                    <span className="truncate ml-3">{section.title}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                        className="h-full bg-amber-600 transition-all duration-300"
                        style={{ width: `${(shownIndex / Math.max(shownTotal, 1)) * 100}%` }}
                    />
                </div>
            </div>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">{section.title}</h4>
                <div className={section.fields.every((f) => f.kind === "rating") ? "" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                    {section.fields.map(renderField)}
                </div>
            </section>

            {(uploadError || (showErrors && missing.length > 0)) && (
                <div className="flex items-start gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{uploadError || `Please complete: ${missing.join(", ")}`}</span>
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <button
                    type="button"
                    disabled={step === 0 || submitting}
                    onClick={() => go(-1)}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border-2 border-slate-300 bg-white text-slate-700 text-xs font-bold shadow-sm hover:bg-slate-50 disabled:opacity-40"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                </button>

                {isLast ? (
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => {
                            setShowErrors(true);
                            if (formMissing(values).length === 0 && !uploadError) onSubmit();
                        }}
                        className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm disabled:opacity-60"
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? "Submitting feedback..." : "Submit Feedback"}
                    </button>
                ) : (
                    <button
                        type="button"
                        disabled={disabled || submitting}
                        onClick={() => go(1)}
                        className="inline-flex items-center gap-1.5 h-10 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm disabled:opacity-60"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
