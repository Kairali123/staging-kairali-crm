"use client";

import React, { useState, useEffect } from "react";
import { Car, Send, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

const DRIVERS = ["SUJITH", "Babu", "SHIV DAS", "Anil"];
const DROP_LOCATIONS = ["Airport - Coimbatore", "Airport - Cochin", "Rail"];
const ASSIGNED_BY = "Manoj Nair (FOM)";
const MOBILE_REGEX = /^[6-9]\d{9}$/;

interface DriverAssignmentDepartureModalProps {
    open?: boolean;
    onClose?: () => void;
    onSubmit?: (data: Record<string, string>) => void | Promise<void>;
    guest?: Guest | null;
    disabled?: boolean;
    onViewFullDetails?: () => void;
}

export default function DriverAssignmentDepartureModal({
    open = true,
    onClose = () => { },
    onSubmit = () => { },
    guest = null,
    disabled = false,
    onViewFullDetails,
}: DriverAssignmentDepartureModalProps) {
    const { user } = useAuth();

    const saved = guest?.driverAssignmentDeparture;
    const isComplete = guest?.stageStatus?.[9] === "Complete";
    const isProcessing = guest?.stageStatus?.[9] === "Processing";
    const isReadOnly = Boolean(isComplete);

    const [dropRequired, setDropRequired] = useState(saved?.dropRequired ? saved.dropRequired.toLowerCase() : "");
    const [driverName, setDriverName] = useState(saved?.driverName || "");
    const [driverContact, setDriverContact] = useState(saved?.driverContact || "");
    const [dropTo, setDropTo] = useState(saved?.dropTo || "");
    const [dropDate, setDropDate] = useState(saved?.dropDate || "");
    const [dropTime, setDropTime] = useState(saved?.dropTime || "");
    const [remarks, setRemarks] = useState(saved?.remarks || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            const s = guest?.driverAssignmentDeparture;
            setDropRequired(s?.dropRequired ? s.dropRequired.toLowerCase() : "");
            setDriverName(s?.driverName || "");
            setDriverContact(s?.driverContact || "");
            setDropTo(s?.dropTo || "");
            setDropDate(s?.dropDate || "");
            setDropTime(s?.dropTime || "");
            setRemarks(s?.remarks || "");
            setIsSubmitting(false);
        }
    }, [open, guest]);

    const contactError = driverContact.trim() !== "" && !MOBILE_REGEX.test(driverContact.trim());

    const isValid = () => {
        if (!dropRequired) return false;
        if (dropRequired === "yes") {
            if (!driverName) return false;
            if (!driverContact.trim() || !MOBILE_REGEX.test(driverContact.trim())) return false;
            if (!dropTo) return false;
            if (!dropDate) return false;
            if (!dropTime) return false;
            if (!remarks.trim()) return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!isValid() || isSubmitting || disabled || isReadOnly) return;
        setIsSubmitting(true);
        try {
            await onSubmit({
                dropRequired,
                driverName: dropRequired === "yes" ? driverName : "",
                driverContact: dropRequired === "yes" ? driverContact : "",
                dropTo: dropRequired === "yes" ? dropTo : "",
                dropDate: dropRequired === "yes" ? dropDate : "",
                dropTime: dropRequired === "yes" ? dropTime : "",
                remarks: dropRequired === "yes" ? remarks.trim() : "",
                assignedBy: dropRequired === "yes" ? (saved?.assignedBy || user?.name || ASSIGNED_BY) : "",
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
                <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 pl-6 pr-14 py-4 text-white shrink-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <Car className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold text-white leading-tight">
                                    Driver Assignment – Departure Drop
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
                                <Car className="w-3.5 h-3.5 text-emerald-300" />
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
                            <Car className="h-4 w-4 shrink-0 text-emerald-600" />
                            <span>Stage 10 is complete. Showing saved data in read-only mode.</span>
                        </div>
                    )}

                    {/* Client & Booking Details Card */}
                    {guest && <ClientBookingDetailsCard guest={guest} onViewFullDetails={onViewFullDetails} />}

                    {/* Section Card: Driver Assignment Details */}
                    <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50/50 p-5 space-y-4 shadow-sm">
                        <div className="flex items-center gap-2 pb-2 border-b border-indigo-200">
                            <Car className="h-4 w-4 text-indigo-600" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                                Driver Assignment – Departure Drop
                            </h4>
                            <span
                                className={`ml-auto text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                    isReadOnly
                                        ? "text-slate-600 bg-slate-100 border border-slate-200"
                                        : "text-indigo-800 bg-indigo-100 border border-indigo-300"
                                }`}
                            >
                                {isReadOnly ? "Read Only" : "Fill in the details below"}
                            </span>
                        </div>

                        {/* Fields Grid */}
                        <div className="space-y-4">
                            {/* Drop Required */}
                            <div className="space-y-1.5 w-full sm:w-[260px]">
                                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                    Drop Required {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                </Label>
                                {isReadOnly ? (
                                    <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                        {dropRequired === "yes" ? "Yes" : dropRequired === "no" ? "No" : "—"}
                                    </div>
                                ) : (
                                    <Select
                                        value={dropRequired}
                                        disabled={disabled}
                                        onValueChange={(val) => setDropRequired(val)}
                                    >
                                        <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                            <SelectValue placeholder="Select Yes / No" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="no">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* If Drop Required is YES */}
                            {dropRequired === "yes" && (
                                <>
                                    {/* Driver Name & Driver Contact */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                Driver Name {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                            </Label>
                                            {isReadOnly ? (
                                                <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                                    {driverName || "—"}
                                                </div>
                                            ) : (
                                                <Select
                                                    value={driverName}
                                                    disabled={disabled}
                                                    onValueChange={(val) => setDriverName(val)}
                                                >
                                                    <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                        <SelectValue placeholder="Select driver" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                        {DRIVERS.map((d) => (
                                                            <SelectItem key={d} value={d}>
                                                                {d}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                Driver Contact {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                            </Label>
                                            {isReadOnly ? (
                                                <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                                    {driverContact || "—"}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="tel"
                                                    value={driverContact}
                                                    disabled={disabled}
                                                    onChange={(e) => setDriverContact(e.target.value)}
                                                    placeholder="10-digit mobile number"
                                                    maxLength={10}
                                                    className={`h-10 border-2 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium rounded-lg disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${
                                                        contactError
                                                            ? "border-red-400 focus:border-red-600 focus:ring-2 focus:ring-red-200"
                                                            : "border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200"
                                                    }`}
                                                />
                                            )}
                                            {contactError && (
                                                <p className="text-[11px] font-semibold text-red-600">Please enter a valid 10-digit mobile number</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Drop To, Drop Date, Drop Time */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                Drop To {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                            </Label>
                                            {isReadOnly ? (
                                                <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                                    {dropTo || "—"}
                                                </div>
                                            ) : (
                                                <Select
                                                    value={dropTo}
                                                    disabled={disabled}
                                                    onValueChange={(val) => setDropTo(val)}
                                                >
                                                    <SelectTrigger className="w-full h-10 px-3 py-2 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 shadow-2xs font-medium text-sm rounded-lg transition-colors disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">
                                                        <SelectValue placeholder="Select location" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-lg shadow-lg border-slate-200">
                                                        {DROP_LOCATIONS.map((loc) => (
                                                            <SelectItem key={loc} value={loc}>
                                                                {loc}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                Drop Date {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                            </Label>
                                            {isReadOnly ? (
                                                <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                                    {dropDate || "—"}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="date"
                                                    value={dropDate}
                                                    disabled={disabled}
                                                    onChange={(e) => setDropDate(e.target.value)}
                                                    className="h-10 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 shadow-2xs font-medium rounded-lg disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                                Drop Time {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                            </Label>
                                            {isReadOnly ? (
                                                <div className="h-10 px-3 flex items-center bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800">
                                                    {dropTime || "—"}
                                                </div>
                                            ) : (
                                                <Input
                                                    type="time"
                                                    value={dropTime}
                                                    disabled={disabled}
                                                    onChange={(e) => setDropTime(e.target.value)}
                                                    className="h-10 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 shadow-2xs font-medium rounded-lg disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                            Remarks {!isReadOnly && <span className="text-red-500 font-bold">*</span>}
                                        </Label>
                                        {isReadOnly ? (
                                            <div className="min-h-[70px] p-3 bg-white border-2 border-slate-200 rounded-lg text-sm font-medium text-slate-800 whitespace-pre-wrap">
                                                {remarks || "—"}
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={remarks}
                                                disabled={disabled}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                placeholder="Enter drop instructions or remarks..."
                                                className="min-h-[70px] border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium rounded-lg disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        )}
                                    </div>

                                    {/* Assigned By (Readonly) */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                            Assigned By
                                        </Label>
                                        <div className="h-10 px-3 flex items-center bg-white border-2 border-indigo-200 rounded-lg text-sm font-semibold text-slate-800">
                                            {saved?.assignedBy || user?.name || ASSIGNED_BY}
                                        </div>
                                    </div>
                                </>
                            )}
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
                            className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
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
