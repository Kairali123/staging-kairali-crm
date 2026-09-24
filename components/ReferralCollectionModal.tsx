"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, Users, UserX, Check, Loader2, Plus } from "lucide-react";
import type { Guest } from "@/types/crr";
import { ClientBookingDetailsCard } from "@/components/ClientBookingDetailsCard";

/* =========================================================
   TYPES
========================================================= */
export type ReferredPersonEntry = {
    name: string;
    countryCode: string;
    mobile: string;
    email: string;
    relationship: string;
    referredFor: string;
    remarks: string;
};

export type ReferralStage8Data = {
    doerStatus: "Yes" | "No";
    doerRemarks: string;
    referrals?: ReferredPersonEntry[];
};

export interface ReferralCollectionModalProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** The guest this Stage 8 submission is for. Required whenever `open` is true. */
    guest: Guest | null;
    /** True when the form fields should be read-only / inputs disabled (locked, no permission, etc.). */
    disabled: boolean;
    /** True once Stage 8 has already been completed for this guest — renders everything read-only. */
    isComplete: boolean;
    /** Scheduling lock message, if any (e.g. "Opens after Departure + 30 Days"). */
    lockMessage?: string | null;
    /** Previously saved Stage 8 data, if this guest already has a submission (used to pre-fill / show read-only). */
    savedData?: ReferralStage8Data | null;
    onClose: () => void;
    onSubmit: (data: ReferralStage8Data) => void;
    /** Optional: open a separate "full booking/client details" popup from inside this modal. */
    onViewFullDetails?: () => void;
}

/* =========================================================
   HELPERS
========================================================= */
function makeEmptyReferralEntry(): ReferredPersonEntry {
    return { name: "", countryCode: "", mobile: "", email: "", relationship: "", referredFor: "", remarks: "" };
}

function isReferralEntryComplete(e: ReferredPersonEntry): boolean {
    return (
        e.name.trim() !== "" &&
        e.countryCode.trim() !== "" &&
        e.mobile.trim() !== "" &&
        e.email.trim() !== "" &&
        e.relationship.trim() !== "" &&
        e.referredFor.trim() !== ""
    );
}

const RELATIONSHIP_OPTIONS = [
    "Grand Mother", "Grand Father", "Aunt", "Uncle", "Father", "Mother", "Husband", "Wife",
    "Son", "Daughter", "Brother", "Sister", "Relative", "Nephew", "Step Relative", "Friend", "Other",
];

const REFERRED_FOR_OPTIONS = [
    { value: "www.ayurvedichealingvillage.com", label: "www.ayurvedichealingvillage.com (Kerala)" },
    { value: "www.villaraag.com", label: "www.villaraag.com (Goa)" },
    { value: "www.kairalicentres.com", label: "www.kairalicentres.com (Delhi)" },
];

// Short, curated starting list — extend as needed. No leading backtick (that
// was a bug in the old standalone GAS form this replaces).
const COUNTRY_CODE_OPTIONS = [
    { value: "+91", label: "India (+91)" },
    { value: "+1", label: "USA / Canada (+1)" },
    { value: "+44", label: "United Kingdom (+44)" },
    { value: "+971", label: "UAE (+971)" },
    { value: "+61", label: "Australia (+61)" },
    { value: "+65", label: "Singapore (+65)" },
    { value: "+966", label: "Saudi Arabia (+966)" },
    { value: "+974", label: "Qatar (+974)" },
    { value: "+973", label: "Bahrain (+973)" },
    { value: "+968", label: "Oman (+968)" },
    { value: "+49", label: "Germany (+49)" },
    { value: "+33", label: "France (+33)" },
];

/* =========================================================
   COMPONENT
========================================================= */
export default function ReferralCollectionModal({
    open,
    guest,
    disabled,
    isComplete,
    lockMessage,
    savedData,
    onClose,
    onSubmit,
    onViewFullDetails,
}: ReferralCollectionModalProps) {
    const [guestAllowedReferral, setGuestAllowedReferral] = useState<"yes" | "no" | "">("");
    const [doerRemarks, setDoerRemarks] = useState("");
    const [entries, setEntries] = useState<ReferredPersonEntry[]>([makeEmptyReferralEntry()]);
    const [formError, setFormError] = useState("");
    const [saved, setSaved] = useState(false);

    // (Re)initialize form state whenever the modal is opened for a (possibly new) guest.
    useEffect(() => {
        if (!open) return;
        const status = (savedData?.doerStatus || "").toLowerCase();
        const allowed: "yes" | "no" | "" = status === "yes" ? "yes" : status === "no" ? "no" : "";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuestAllowedReferral(allowed);
        setDoerRemarks(savedData?.doerRemarks || "");
        setEntries(savedData?.referrals?.length ? savedData.referrals : [makeEmptyReferralEntry()]);
        setFormError("");
        setSaved(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, guest?.id]);

    function updateEntry(index: number, field: keyof ReferredPersonEntry, value: string) {
        setEntries((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
        setSaved(false);
    }

    function addEntry() {
        setEntries((rows) => {
            const last = rows[rows.length - 1];
            if (last && !isReferralEntryComplete(last)) {
                setFormError("Please fill all fields in the current row before adding a new one.");
                return rows;
            }
            setFormError("");
            return [...rows, makeEmptyReferralEntry()];
        });
    }

    function removeEntry(index: number) {
        setEntries((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
        setSaved(false);
    }

    function mobileDuplicateError(): string {
        const mobiles = entries.map((r) => r.mobile.trim()).filter(Boolean);
        const seen = new Set<string>();
        for (const m of mobiles) {
            if (seen.has(m)) return "Referral mobile numbers must be unique for each referral.";
            seen.add(m);
        }
        return "";
    }

    function isFormComplete() {
        if (guestAllowedReferral === "no") return doerRemarks.trim() !== "";
        if (guestAllowedReferral === "yes") {
            return entries.length > 0 && entries.every(isReferralEntryComplete) && mobileDuplicateError() === "";
        }
        return false;
    }

    function handleSubmit() {
        if (saved) return;

        if (guestAllowedReferral === "no") {
            if (doerRemarks.trim() === "") {
                setFormError("Remarks are compulsory when the guest is not giving a referral.");
                return;
            }
        } else if (guestAllowedReferral === "yes") {
            if (!entries.every(isReferralEntryComplete)) {
                setFormError("Please fill in every field for each referred person before saving.");
                return;
            }
            const dupError = mobileDuplicateError();
            if (dupError) {
                setFormError(dupError);
                return;
            }
        } else {
            setFormError("Please select whether the guest is giving a referral.");
            return;
        }

        setFormError("");
        setSaved(true);

        const data: ReferralStage8Data =
            guestAllowedReferral === "yes"
                ? {
                      doerStatus: "Yes",
                      doerRemarks: doerRemarks.trim(),
                      referrals: entries.map((e) => ({ ...e, name: e.name.trim(), mobile: e.mobile.trim(), email: e.email.trim() })),
                  }
                : { doerStatus: "No", doerRemarks: doerRemarks.trim() };

        onSubmit(data);
    }

    const isReadOnly = Boolean(isComplete);
    const isLocked = Boolean(lockMessage);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            {guest && (
                <DialogContent
                    style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }}
                    className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col [&>[data-slot=dialog-close]]:text-white/80 [&>[data-slot=dialog-close]]:hover:text-white [&>[data-slot=dialog-close]]:hover:bg-white/10 [&>[data-slot=dialog-close]]:rounded-md"
                >
                    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 pl-6 pr-14 py-4 text-white shrink-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <DialogTitle className="text-lg font-bold text-white leading-tight">
                                Referral Collection &amp; Lead Generation
                            </DialogTitle>
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/35 px-2.5 py-0.5 rounded-full select-none shrink-0 pointer-events-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                Action Required
                            </span>
                        </div>
                        <DialogDescription className="text-xs text-white/90 mt-1 font-normal">
                            Complete the required details below and submit this stage.
                        </DialogDescription>
                    </div>

                    <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 bg-slate-50/40">
                        {/* Client & Booking Details Card — shared with every other stage modal */}
                        <ClientBookingDetailsCard guest={guest} onViewFullDetails={onViewFullDetails} />

                        {/* Referral details card — highlighted card, emerald border, light bg (matches other stages) */}
                        <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/50 p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
                                <Users className="h-4 w-4 text-emerald-600" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                                    Referral Collection Details
                                </h4>
                                <span
                                    className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                        isReadOnly
                                            ? "text-slate-600 bg-slate-100 border border-slate-200"
                                            : "text-emerald-800 bg-emerald-100 border border-emerald-300"
                                    }`}
                                >
                                    {isReadOnly ? "Read Only" : "Fill in the details below"}
                                </span>
                            </div>

                            {isLocked && !isReadOnly && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                    <Clock className="h-4 w-4 shrink-0" />
                                    <span>{lockMessage}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Guest Allowed to Give Referral */}
                                <div className="space-y-1.5 w-full sm:w-[220px]">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        Guest Allowed to Give Referral {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                    </Label>
                                    {isReadOnly ? (
                                        <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                            {guestAllowedReferral === "yes" ? "Yes" : guestAllowedReferral === "no" ? "No" : "Not Specified"}
                                        </div>
                                    ) : (
                                        <Select
                                            value={guestAllowedReferral}
                                            disabled={disabled}
                                            onValueChange={(val: "yes" | "no") => {
                                                setGuestAllowedReferral(val);
                                                setSaved(false);
                                            }}
                                        >
                                            <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                <SelectValue placeholder="Select Yes / No" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                <SelectItem value="yes">Yes</SelectItem>
                                                <SelectItem value="no">No</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* YES branch — repeatable Referred Person's Details */}
                                {guestAllowedReferral === "yes" && !isLocked && (
                                    <div className="space-y-4">
                                        {entries.map((entry, idx) => (
                                            <div key={idx} className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                                            {idx + 1}
                                                        </span>
                                                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                            Referred Person
                                                        </h5>
                                                    </div>
                                                    {!isReadOnly && entries.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEntry(idx)}
                                                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors cursor-pointer py-1 px-2 rounded-md hover:bg-rose-50"
                                                            title="Remove this referral"
                                                        >
                                                            <UserX className="h-3.5 w-3.5" />
                                                            <span>Remove</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-12 gap-x-4 gap-y-4">
                                                    {/* Row 1: Name (5 cols), Code (2 cols), Mobile (5 cols) */}
                                                    <div className="col-span-12 md:col-span-5 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Name {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.name || "—"}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                value={entry.name}
                                                                disabled={disabled}
                                                                onChange={(e) => updateEntry(idx, "name", e.target.value)}
                                                                placeholder="Referred person's name"
                                                                className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="col-span-5 md:col-span-2 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1 whitespace-nowrap">
                                                            Country Code {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.countryCode || "—"}
                                                            </div>
                                                        ) : (
                                                            <Select value={entry.countryCode} disabled={disabled} onValueChange={(val) => updateEntry(idx, "countryCode", val)}>
                                                                <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                                    <SelectValue placeholder="Country Code" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                                    {COUNTRY_CODE_OPTIONS.map((c) => (
                                                                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    <div className="col-span-7 md:col-span-5 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Mobile {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.mobile || "—"}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="tel"
                                                                inputMode="numeric"
                                                                maxLength={15}
                                                                value={entry.mobile}
                                                                disabled={disabled}
                                                                onChange={(e) => updateEntry(idx, "mobile", e.target.value.replace(/[^\d]/g, ""))}
                                                                placeholder="Mobile number"
                                                                className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Row 2: Email (6 cols), Relationship (6 cols) */}
                                                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Email {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.email || "—"}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                type="email"
                                                                value={entry.email}
                                                                disabled={disabled}
                                                                onChange={(e) => updateEntry(idx, "email", e.target.value)}
                                                                placeholder="Email address"
                                                                className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Relationship {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.relationship || "—"}
                                                            </div>
                                                        ) : (
                                                            <Select value={entry.relationship} disabled={disabled} onValueChange={(val) => updateEntry(idx, "relationship", val)}>
                                                                <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                                    <SelectValue placeholder="Select relationship" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                                    {RELATIONSHIP_OPTIONS.map((r) => (
                                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    {/* Row 3: Referred For (6 cols), Remarks (6 cols) */}
                                                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Referred For {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {REFERRED_FOR_OPTIONS.find((o) => o.value === entry.referredFor)?.label || entry.referredFor || "—"}
                                                            </div>
                                                        ) : (
                                                            <Select value={entry.referredFor} disabled={disabled} onValueChange={(val) => updateEntry(idx, "referredFor", val)}>
                                                                <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                                    <SelectValue placeholder="Select property" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                                    {REFERRED_FOR_OPTIONS.map((o) => (
                                                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>

                                                    <div className="col-span-12 md:col-span-6 space-y-1.5">
                                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                            Remarks <span className="text-slate-500 font-normal text-xs">(Optional)</span>
                                                        </Label>
                                                        {isReadOnly ? (
                                                            <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 truncate">
                                                                {entry.remarks || "—"}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                value={entry.remarks}
                                                                disabled={disabled}
                                                                onChange={(e) => updateEntry(idx, "remarks", e.target.value)}
                                                                placeholder="Any additional remarks"
                                                                className="w-full h-10 px-3 py-2 border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={addEntry}
                                                disabled={disabled}
                                                className="w-full h-10 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50/60 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                                            >
                                                <Plus className="h-4 w-4 text-emerald-600" />
                                                <span>Add Another Referral</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* NO branch — remarks */}
                                {guestAllowedReferral === "no" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                            Remarks {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                        </Label>
                                        {isReadOnly ? (
                                            <div className="bg-white border-2 border-slate-200 rounded-lg p-3.5 text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                                                {doerRemarks || "No remarks entered"}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={doerRemarks}
                                                disabled={disabled}
                                                onChange={(e) => { setDoerRemarks(e.target.value); setSaved(false); }}
                                                placeholder="Enter remarks explaining why the guest declined or is not giving referral..."
                                                className="min-h-[80px] border-2 border-emerald-300 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                                    <span>{formError}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="bg-slate-50/80 border-t border-slate-200 px-6 py-3.5 flex justify-end items-center gap-2.5 sticky bottom-0 z-10">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            disabled={saved}
                            className="h-9 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 rounded-lg shadow-2xs transition-colors"
                        >
                            Close
                        </Button>
                        {!isReadOnly && isFormComplete() && (
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={disabled || saved}
                                className="h-9 min-w-[100px] px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-colors"
                            >
                                {saved ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Save</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    );
}
