// "use client"

// import { X } from "lucide-react"

// // Shape this component needs from your Booking type — pass the filtered
// // array of Booking objects straight in, this only reads these fields.
// export interface TodayStayRow {
//     bookingId: string
//     createdDate?: string
//     lastUpdated?: string
//     guestName: string
//     mobile?: string
//     email?: string
//     checkIn: string
//     checkOut: string
//     piNumber?: string
//     piLink?: string
//     bookingTakenBy?: string
//     assignedTo?: string
//     totalAmount?: string
//     paidAmount?: string
//     receivedPercentage?: number
//     currency?: string
// }

// interface TodayStayModalProps {
//     type: "checkin" | "checkout"
//     division?: string // e.g. "KTAHV" — shown as the small badge top-left, matches PaymentRecordsModal
//     rows: TodayStayRow[]
//     onClose: () => void
// }

// function safeDate(value?: string) {
//     if (!value) return "-"
//     const d = new Date(value)
//     if (isNaN(d.getTime())) return "-"
//     return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
// }

// function paymentProgress(row: TodayStayRow) {
//     const total = Number(String(row.totalAmount ?? "0").replace(/[^0-9.-]/g, "")) || 0
//     const paid = Number(String(row.paidAmount ?? "0").replace(/[^0-9.-]/g, "")) || 0
//     const pct = row.receivedPercentage !== undefined
//         ? Math.round(row.receivedPercentage)
//         : total > 0
//             ? Math.round((paid / total) * 100)
//             : 0
//     return { total, paid, pct: Math.min(100, Math.max(0, pct)) }
// }

// export default function TodayStayModal({ type, division = "KTAHV", rows, onClose }: TodayStayModalProps) {
//     const isCheckIn = type === "checkin"
//     const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

//     return (
//         <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50">
//             <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl">
//                 {/* Header — purple gradient, matches PaymentRecordsModal, compacted to one row */}
//                 <div className="relative shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-purple-700 px-6 py-4 overflow-hidden">
//                     <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full bg-white/10" />
//                     <div className="absolute right-16 top-8 w-16 h-16 rounded-full bg-white/10" />

//                     <button
//                         onClick={onClose}
//                         className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
//                     >
//                         <X className="h-4 w-4" />
//                     </button>

//                     <div className="relative flex flex-wrap items-center gap-4">
//                         <div className="flex items-center gap-2">
//                             <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-semibold tracking-wide">
//                                 {division}
//                             </span>
//                             <span className="text-white/70 text-xs">·</span>
//                             <span className="text-white/90 text-xs font-semibold tracking-wide uppercase whitespace-nowrap">
//                                 {isCheckIn ? "Today's Check-Ins" : "Today's Check-Outs"}
//                             </span>
//                         </div>

//                         <h2 className="text-white text-xl font-bold whitespace-nowrap">
//                             {isCheckIn ? "Guests Arriving Today" : "Guests Departing Today"}
//                         </h2>

//                         <div className="flex items-center gap-3 ml-auto mr-8">
//                             <div className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
//                                 <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mr-1.5">Date</span>
//                                 <span className="text-sm font-bold text-white">{today}</span>
//                             </div>
//                             <div className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
//                                 <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mr-1.5">
//                                     {isCheckIn ? "Arrivals" : "Departures"}
//                                 </span>
//                                 <span className="text-sm font-bold text-amber-300">{rows.length} Guests</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Table */}
//                 <div className="flex-1 overflow-auto">
//                     <table className="w-full text-sm">
//                         <thead className="sticky top-0 bg-slate-800 text-white">
//                             <tr>
//                                 {[
//                                     "Booking ID", "Booking Date", "Client Details",
//                                     "Stay Dates", "PI Details", "Booking Taken By", "Payment Progress",
//                                 ].map((h) => (
//                                     <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
//                                         {h}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {rows.length === 0 ? (
//                                 <tr>
//                                     <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
//                                         No {isCheckIn ? "check-ins" : "check-outs"} scheduled for today.
//                                     </td>
//                                 </tr>
//                             ) : (
//                                 rows.map((row, idx) => {
//                                     const { total, paid, pct } = paymentProgress(row)
//                                     return (
//                                         <tr key={row.bookingId + idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
//                                             <td className="px-4 py-3 whitespace-nowrap">
//                                                 <span className="px-2 py-0.5 rounded-md border border-violet-200 bg-violet-50 text-violet-700 font-semibold text-xs">
//                                                     {row.bookingId}
//                                                 </span>
//                                             </td>
//                                             <td className="px-4 py-3 whitespace-nowrap text-slate-600">{safeDate(row.createdDate || row.lastUpdated)}</td>
//                                             <td className="px-4 py-3 whitespace-nowrap">
//                                                 <div className="font-semibold text-slate-800">{row.guestName}</div>
//                                                 {row.mobile && <div className="text-xs text-slate-500">{row.mobile}</div>}
//                                                 {row.email && <div className="text-xs text-slate-400">{row.email}</div>}
//                                             </td>
//                                             <td className="px-4 py-3 whitespace-nowrap">
//                                                 <div className="text-slate-700">
//                                                     <span className="text-xs text-slate-400">In:</span> {safeDate(row.checkIn)}
//                                                 </div>
//                                                 <div className="text-slate-700">
//                                                     <span className="text-xs text-slate-400">Out:</span> {safeDate(row.checkOut)}
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3 whitespace-nowrap">
//                                                 <div className="text-slate-700 font-medium">{row.piNumber || "-"}</div>
//                                                 {row.piLink ? (
//                                                     <a href={row.piLink} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline font-medium">
//                                                         View PI
//                                                     </a>
//                                                 ) : (
//                                                     <span className="text-xs text-slate-400">No link</span>
//                                                 )}
//                                             </td>
//                                             <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.bookingTakenBy || row.assignedTo || "-"}</td>
//                                             <td className="px-4 py-3 whitespace-nowrap min-w-[140px]">
//                                                 <div className="flex items-center gap-2">
//                                                     <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
//                                                         <div
//                                                             className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300"}`}
//                                                             style={{ width: `${pct}%` }}
//                                                         />
//                                                     </div>
//                                                     <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct}%</span>
//                                                 </div>
//                                                 {total > 0 && (
//                                                     <div className="text-[10px] text-slate-400 mt-0.5">
//                                                         ₹{paid.toLocaleString("en-IN")} / ₹{total.toLocaleString("en-IN")}
//                                                     </div>
//                                                 )}
//                                             </td>
//                                         </tr>
//                                     )
//                                 })
//                             )}
//                         </tbody>
//                     </table>
//                 </div>

//                 {/* Footer */}
//                 <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
//                     Showing <span className="font-semibold text-slate-700">1-{rows.length}</span> of{" "}
//                     <span className="font-semibold text-slate-700">{rows.length}</span> records
//                 </div>
//             </div>
//         </div>
//     )
// }


"use client"

import { X } from "lucide-react"

// Shape this component needs from your Booking type — pass the filtered
// array of Booking objects straight in, this only reads these fields.
export interface TodayStayRow {
    bookingId: string
    createdDate?: string
    lastUpdated?: string
    guestName: string
    mobile?: string
    email?: string
    checkIn: string
    checkOut: string
    piNumber?: string
    piLink?: string
    bookingTakenBy?: string
    assignedTo?: string
    totalAmount?: string
    paidAmount?: string
    receivedPercentage?: number
    currency?: string
}

interface TodayStayModalProps {
    type: "checkin" | "checkout" | "inhouse"
    division?: string // e.g. "KTAHV" — shown as the small badge top-left, matches PaymentRecordsModal
    rows: TodayStayRow[]
    onClose: () => void
}

function safeDate(value?: string) {
    if (!value) return "-"
    const d = new Date(value)
    if (isNaN(d.getTime())) return "-"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function paymentProgress(row: TodayStayRow) {
    const total = Number(String(row.totalAmount ?? "0").replace(/[^0-9.-]/g, "")) || 0
    const paid = Number(String(row.paidAmount ?? "0").replace(/[^0-9.-]/g, "")) || 0
    const pct = row.receivedPercentage !== undefined
        ? Math.round(row.receivedPercentage)
        : total > 0
            ? Math.round((paid / total) * 100)
            : 0
    return { total, paid, pct: Math.min(100, Math.max(0, pct)) }
}

export default function TodayStayModal({ type, division = "KTAHV", rows, onClose }: TodayStayModalProps) {
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

    const labels = {
        checkin: { badge: "Today's Check-Ins", title: "Guests Arriving Today", countLabel: "Arrivals" },
        checkout: { badge: "Today's Check-Outs", title: "Guests Departing Today", countLabel: "Departures" },
        inhouse: { badge: "In-House Now", title: "Guests Currently In-House", countLabel: "In-House" },
    }[type]

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl">
                {/* Header — purple gradient, matches PaymentRecordsModal, compacted to one row */}
                <div className="relative shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-purple-700 px-6 py-4 overflow-hidden">
                    <div className="absolute -right-6 -top-10 w-40 h-40 rounded-full bg-white/10" />
                    <div className="absolute right-16 top-8 w-16 h-16 rounded-full bg-white/10" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="relative flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-semibold tracking-wide">
                                {division}
                            </span>
                            <span className="text-white/70 text-xs">·</span>
                            <span className="text-white/90 text-xs font-semibold tracking-wide uppercase whitespace-nowrap">
                                {labels.badge}
                            </span>
                        </div>

                        <h2 className="text-white text-xl font-bold whitespace-nowrap">
                            {labels.title}
                        </h2>

                        <div className="flex items-center gap-3 ml-auto mr-8">
                            <div className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mr-1.5">Date</span>
                                <span className="text-sm font-bold text-white">{today}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wide mr-1.5">
                                    {labels.countLabel}
                                </span>
                                <span className="text-sm font-bold text-amber-300">{rows.length} Guests</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-800 text-white">
                            <tr>
                                {[
                                    "Booking ID", "Booking Date", "Client Details",
                                    "Stay Dates", "PI Details", "Booking Taken By", "Payment Progress",
                                ].map((h) => (
                                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                        No {type === "checkin" ? "check-ins" : type === "checkout" ? "check-outs" : "in-house guests"} {type === "inhouse" ? "" : "scheduled for today"}.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => {
                                    const { total, paid, pct } = paymentProgress(row)
                                    return (
                                        <tr key={row.bookingId + idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded-md border border-violet-200 bg-violet-50 text-violet-700 font-semibold text-xs">
                                                    {row.bookingId}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">{safeDate(row.createdDate || row.lastUpdated)}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800">{row.guestName}</div>
                                                {row.mobile && <div className="text-xs text-slate-500">{row.mobile}</div>}
                                                {row.email && <div className="text-xs text-slate-400">{row.email}</div>}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-slate-700">
                                                    <span className="text-xs text-slate-400">In:</span> {safeDate(row.checkIn)}
                                                </div>
                                                <div className="text-slate-700">
                                                    <span className="text-xs text-slate-400">Out:</span> {safeDate(row.checkOut)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-slate-700 font-medium">{row.piNumber || "-"}</div>
                                                {row.piLink ? (
                                                    <a href={row.piLink} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline font-medium">
                                                        View PI
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No link</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">{row.bookingTakenBy || row.assignedTo || "-"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap min-w-[140px]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-amber-500" : "bg-slate-300"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-slate-600 w-9 text-right">{pct}%</span>
                                                </div>
                                                {total > 0 && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        ₹{paid.toLocaleString("en-IN")} / ₹{total.toLocaleString("en-IN")}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-700">1-{rows.length}</span> of{" "}
                    <span className="font-semibold text-slate-700">{rows.length}</span> records
                </div>
            </div>
        </div>
    )
}