"use client";

import React, { useState, useEffect } from "react";
import { ClipboardCheck, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Guest } from "@/types/crr";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ClientBookingDetailsCard } from "@/components/ClientBookingDetailsCard";

const DOCTORS = ["Dr Deepu John", "Ashikha Raj", "Dr. Rahul R", "Dr. Akhila Oommen", "ANAGHA S"];

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
    onViewFullDetails?: () => void;
}

export default function GuestRequirementVerificationModal({
    open = true,
    onClose = () => { },
    onSubmit = () => { },
    guest = null,
    disabled = false,
    onViewFullDetails,
}: GuestRequirementVerificationModalProps) {
    const { user } = useAuth();

    const saved = guest?.guestRequirementVerification;
    const isComplete = guest?.stageStatus?.[10] === "Complete";
    const isProcessing = guest?.stageStatus?.[10] === "Processing";
    const isReadOnly = Boolean(isComplete);

    const [doctorAssignStatus, setDoctorAssignStatus] = useState(saved?.doctorAssignStatus || "");
    const [changedDoctor, setChangedDoctor] = useState(saved?.changedDoctor || "");
    const [remarks, setRemarks] = useState(saved?.remarks || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            const s = guest?.guestRequirementVerification;
            setDoctorAssignStatus(s?.doctorAssignStatus || "");
            setChangedDoctor(s?.changedDoctor || "");
            setRemarks(s?.remarks || "");
            setIsSubmitting(false);
        }
    }, [open, guest]);

    const activeDoctor =
        doctorAssignStatus === "change" && changedDoctor
            ? changedDoctor
            : (saved?.doctorAssignedToClient || "");

    const doctorEmail = saved?.email || "";

    const isValid = () => {
        if (!doctorAssignStatus) return false;
        if (doctorAssignStatus === "change" && !changedDoctor) return false;
        if (!remarks.trim()) return false;
        return true;
    };

    const handleSubmit = async () => {
        if (!isValid() || isSubmitting || disabled || isReadOnly) return;
        setIsSubmitting(true);
        const timestamp = saved?.timestamp || getTimestamp();
        try {
            await onSubmit({
                doctorAssignedToClient: activeDoctor,
                email: doctorEmail,
                timestamp,
                doctorAssignStatus,
                changedDoctor: doctorAssignStatus === "change" ? changedDoctor : "",
                remarks: remarks.trim(),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent
                style={{ width: "min(98vw, 1100px)", maxWidth: "min(98vw, 1100px)", maxHeight: "90vh" }}
                className="p-0 overflow-hidden rounded-xl border border-slate-200 shadow-2xl flex flex-col [&>[data-slot=dialog-close]]:text-white/80 [&>[data-slot=dialog-close]]:hover:text-white [&>[data-slot=dialog-close]]:hover:bg-white/10 [&>[data-slot=dialog-close]]:rounded-md"
            >
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 pl-6 pr-14 py-4 text-white shrink-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <ClipboardCheck className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white leading-tight">
                                    Guest Requirement Verification
                                </DialogTitle>
                                <DialogDescription className="text-xs text-white/90 mt-0.5 font-normal">
                                    {isComplete
                                        ? "This stage is marked complete. Showing saved data in read-only mode."
                                        : isProcessing
                                        ? "Submission is currently under review."
                                        : "Complete the required details below and submit this stage."}
                                </DialogDescription>
                            </div>
                        </div>

                        {isComplete ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-400/25 text-emerald-100 border border-emerald-400/40 px-2.5 py-0.5 rounded-full select-none shrink-0 pointer-events-none">
                                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-300" />
                                Complete
                            </span>
                        ) : isProcessing ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-400/25 text-amber-100 border border-amber-400/40 px-2.5 py-0.5 rounded-full select-none shrink-0 pointer-events-none">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                                Processing
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-amber-400/25 text-amber-100 border border-amber-400/40 px-2.5 py-0.5 rounded-full select-none shrink-0 pointer-events-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                                Action Required
                            </span>
                        )}
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0 bg-slate-50/40">
                    {/* Status Alert Banners */}
                    {isProcessing && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg p-3">
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />
                            <span>Processing — your submission is being verified. This stage will be marked complete once confirmed.</span>
                        </div>
                    )}
                    {isComplete && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg p-3">
                            <ClipboardCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Stage 11 is complete. Showing saved data in read-only mode.</span>
                        </div>
                    )}

                    {/* Client & Booking Details Card */}
                    {guest && <ClientBookingDetailsCard guest={guest} onViewFullDetails={onViewFullDetails} />}

                    {/* Section Card: Doctor Verification Details */}
                    <div className="rounded-xl border-2 border-teal-400 bg-teal-50/50 p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 pb-2 border-b border-teal-200">
                            <ClipboardCheck className="h-4 w-4 text-teal-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                                Doctor Verification Details
                            </h4>
                            <span
                                className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                    isReadOnly
                                        ? "text-slate-600 bg-slate-100 border border-slate-200"
                                        : "text-teal-800 bg-teal-100 border border-teal-300"
                                }`}
                            >
                                {isReadOnly ? "Read Only" : "Fill in the details below"}
                            </span>
                        </div>

                        {/* Fields Grid */}
                        <div className="space-y-4">
                            {/* Row 1: Doctor Assigned & Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        Doctor Assigned to the Client <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <div className="h-10 px-3 flex items-center bg-white border-2 border-teal-200 rounded-lg text-sm font-semibold text-slate-800">
                                        {activeDoctor || "—"}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        E-Mail <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <div className="h-10 px-3 flex items-center bg-white border-2 border-teal-200 rounded-lg text-sm font-semibold text-slate-800">
                                        {doctorEmail || "—"}
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Timestamp & Doctor Assign Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        Timestamp <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <div className="h-10 px-3 flex items-center bg-white border-2 border-teal-200 rounded-lg text-sm font-semibold text-slate-800">
                                        {saved?.timestamp || "Will be recorded on submit"}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        Doctor Assign - OK/Change {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                    </Label>
                                    {isReadOnly ? (
                                        <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                            {doctorAssignStatus === "ok" ? "Okay" : doctorAssignStatus === "change" ? "Change" : (doctorAssignStatus || "—")}
                                        </div>
                                    ) : (
                                        <Select
                                            value={doctorAssignStatus}
                                            disabled={disabled}
                                            onValueChange={(val) => setDoctorAssignStatus(val)}
                                        >
                                            <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-teal-300 hover:border-teal-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                <SelectValue placeholder="Select an option" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                <SelectItem value="ok">Okay</SelectItem>
                                                <SelectItem value="change">Change</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Changed Doctor (only if doctorAssignStatus === 'change') */}
                            {doctorAssignStatus === "change" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                        Change The Doctor - (If Required) {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                    </Label>
                                    {isReadOnly ? (
                                        <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                            {changedDoctor || "—"}
                                        </div>
                                    ) : (
                                        <Select
                                            value={changedDoctor}
                                            disabled={disabled}
                                            onValueChange={(val) => setChangedDoctor(val)}
                                        >
                                            <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-teal-300 hover:border-teal-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                <SelectValue placeholder="Select doctor" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                {DOCTORS.map((d) => (
                                                    <SelectItem key={d} value={d}>
                                                        {d}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            )}

                            {/* Row 4: Remarks */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                    Remarks {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                </Label>
                                {isReadOnly ? (
                                    <div className="min-h-[80px] p-3 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 whitespace-pre-wrap">
                                        {remarks || "—"}
                                    </div>
                                ) : (
                                    <Textarea
                                        value={remarks}
                                        disabled={disabled}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        placeholder="Enter remarks..."
                                        className="min-h-[80px] border-2 border-teal-300 hover:border-teal-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium rounded-lg disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <DialogFooter className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 sticky bottom-0 z-10">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-28 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                        {isReadOnly ? "Close" : "Cancel"}
                    </Button>
                    {!isReadOnly && (
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!isValid() || disabled || isSubmitting}
                            className="min-w-[120px] bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Submit
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
