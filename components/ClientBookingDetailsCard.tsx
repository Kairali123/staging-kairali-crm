import { Contact, ExternalLink } from "lucide-react";
import type { Guest } from "@/types/crr";

export function ClientBookingDetailsCard({
    guest,
    onViewFullDetails,
}: {
    guest: Guest;
    onViewFullDetails?: () => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-slate-100 border border-slate-200/60 flex items-center justify-center">
                        <Contact className="h-4 w-4 text-slate-600" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
                        Client &amp; Booking Details
                    </h4>
                </div>
                {onViewFullDetails && (
                    <button
                        type="button"
                        onClick={onViewFullDetails}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-2xs"
                    >
                        <span>View Full Details</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                )}
            </div>

            <div className="overflow-x-auto pb-0.5">
                <div className="grid gap-3 min-w-[700px]" style={{ gridTemplateColumns: "150px 180px 140px 130px 1fr" }}>
                    {/* Booking ID */}
                    <div className="space-y-1 min-w-0 pr-4 border-r border-slate-200">
                        <p className="text-[11px] font-medium text-slate-400">Booking ID</p>
                        <p className="text-xs font-bold text-slate-900 break-words">{guest.bookingId || "—"}</p>
                    </div>

                    {/* Client Name */}
                    <div className="space-y-1 min-w-0 pr-4 border-r border-slate-200">
                        <p className="text-[11px] font-medium text-slate-400">Client Name</p>
                        <p className="text-xs font-bold text-slate-900 break-words">{guest.name || "—"}</p>
                    </div>

                    {/* Mobile */}
                    <div className="space-y-1 min-w-0 pr-4 border-r border-slate-200">
                        <p className="text-[11px] font-medium text-slate-400">Mobile</p>
                        <p className="text-xs font-bold text-slate-900 break-words">{guest.mobile || "—"}</p>
                    </div>

                    {/* PI Link */}
                    <div className="space-y-1 min-w-0 pr-4 border-r border-slate-200">
                        <p className="text-[11px] font-medium text-slate-400">PI Link</p>
                        <div className="text-xs font-bold text-slate-900 break-words">
                            {guest.piLink ? (
                                <a
                                    href={guest.piLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 inline-flex items-center gap-1"
                                >
                                    <span>View PI</span>
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            ) : (
                                "—"
                            )}
                        </div>
                    </div>

                    {/* Programme / Package */}
                    <div className="space-y-1 min-w-0">
                        <p className="text-[11px] font-medium text-slate-400">Programme / Package</p>
                        <p className="text-xs font-bold text-slate-900 break-words">{guest.programme || "—"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
