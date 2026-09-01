"use client";

import React, { useState, useEffect } from "react";

interface PaymentRecord {
    timestamp: string;
    booking_id: string;
    name: string;
    mobile_no: string;
    payment_received_date: string;
    received_amount: number;
    currency: string;
    receipt_number: string;
    payment_collected_by: string;
    uploaded_screenshot: string | null;
    payment_location: string;
    payment_mode: string;
    pending_amount: number;
    remarks: string;
    collection_id: string;
}

const getCurrencySymbol = (currencyCode?: string) => {
    const code = (currencyCode || "INR").toUpperCase();
    try {
        return new Intl.NumberFormat("en", {
            style: "currency",
            currency: code,
            currencyDisplay: "symbol",
            maximumFractionDigits: 0,
        })
            .format(0)
            .replace(/[\d.,\s]/g, "") || "₹";
    } catch {
        return "₹";
    }
};

const columns: { key: keyof PaymentRecord; label: string }[] = [
    { key: "timestamp", label: "Time Stamp" },
    { key: "booking_id", label: "Booking ID" },
    { key: "collection_id", label: "Collection ID" },
    { key: "payment_received_date", label: "Received Date" },
    { key: "currency", label: "Currency" },
    { key: "received_amount", label: "Received Amount" },
    { key: "receipt_number", label: "Receipt No." },
    { key: "payment_collected_by", label: "Collected By" },
    { key: "uploaded_screenshot", label: "Screenshot" },
    { key: "payment_location", label: "Location" },
    { key: "payment_mode", label: "Mode" },
    // { key: "pending_amount", label: "Pending Amount" }, // hidden as per request
    { key: "remarks", label: "Remarks" },
];

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
}

function CellValue({ col, record }: { col: keyof PaymentRecord; record: PaymentRecord }) {
    const value = record[col];
    const currencySymbol = getCurrencySymbol(record.currency);

    if (col === "uploaded_screenshot") {
        return value ? (
            <a
                href={value as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-semibold text-sm transition-colors"
            >
                View
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
        ) : (
            <span className="text-gray-300 text-sm">—</span>
        );
    }

    if (col === "received_amount") {
        return <span className="font-bold text-gray-800 text-sm">{currencySymbol}{Number(value).toLocaleString("en-IN")}</span>;
    }

    if (col === "pending_amount") {
        const num = Number(value);
        return (
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border-2 text-xs font-bold
        ${num === 0
                    ? "border-green-400 text-green-600 bg-green-50"
                    : "border-orange-400 text-orange-600 bg-orange-50"
                }`}
            >
                {num === 0 ? `${currencySymbol}0` : `${currencySymbol}${num.toLocaleString("en-IN")}`}
            </span>
        );
    }

    if (col === "receipt_number") {
        return (
            <span className="inline-block px-2.5 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold tracking-wide">
                {String(value || "—")}
            </span>
        );
    }

    if (col === "payment_mode" || col === "payment_location") {
        return <span className="text-xs font-medium text-gray-600 capitalize">{String(value || "—")}</span>;
    }

    if (col === "timestamp" || col === "payment_received_date") {
        return <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{formatDateTime(value as string)}</span>;
    }

    if (col === "currency") {
        return <span className="font-mono text-xs font-bold text-gray-500 tracking-wider">{String(value || "—")}</span>;
    }

    if (!value || value === "") {
        return <span className="text-gray-300 text-sm">—</span>;
    }

    return <span className="text-sm text-gray-700">{String(value)}</span>;
}

interface PaymentRecordsModalProps {
    bookingId: string;
    guestName: string;
    mobile: string;
    onClose: () => void;
}

export default function PaymentRecordsModal({
    bookingId,
    guestName,
    mobile,
    onClose,
}: PaymentRecordsModalProps) {
    const [data, setData] = useState<PaymentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!bookingId) return;
        setLoading(true);
        setError(null);

        fetch(`/api/ktahv-payment-history?bookingId=${encodeURIComponent(bookingId)}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setData(json.data || []);
                } else {
                    setError(json.error || "Failed to load data");
                }
            })
            .catch(() => setError("Network error. Please try again."))
            .finally(() => setLoading(false));
    }, [bookingId]);

    const totalReceivedByCurrency = data.reduce<Record<string, number>>((acc, record) => {
        const currencyCode = String(record.currency || "INR").toUpperCase();
        acc[currencyCode] = (acc[currencyCode] || 0) + Number(record.received_amount || 0);
        return acc;
    }, {});
    const uniqueCurrencies = Object.keys(totalReceivedByCurrency);
    const summaryCurrency = uniqueCurrencies.length === 1 ? uniqueCurrencies[0] : "";
    const totalReceived = Object.values(totalReceivedByCurrency).reduce((sum, amount) => sum + amount, 0);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[85vh] flex flex-col">

                {/* ── Purple Header ── */}
                <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-violet-800 px-6 pt-5 pb-6 flex-shrink-0">
                    <div className="absolute right-10 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/2 pointer-events-none" />
                    <div className="absolute right-24 top-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

                    {/* Breadcrumb */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-white/15 text-white text-xs font-bold tracking-wider">
                            KTAHV
                        </span>
                        <span className="text-violet-300 text-xs font-medium">·</span>
                        <span className="text-violet-200 text-xs font-medium tracking-widest uppercase">
                            Payment Collection History
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-white font-bold text-xl md:text-2xl tracking-tight mb-4 text-center">
                        {bookingId} · {guestName}
                    </h2>

                    {/* Info pills */}
                    <div className="flex flex-wrap gap-3 justify-center">
                        <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-[110px]">
                            <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">Booking ID</span>
                            <span className="text-yellow-400 font-bold text-sm">{bookingId}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-[110px]">
                            <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">Guest Name</span>
                            <span className="text-white font-bold text-sm">{guestName || "—"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-[110px]">
                            <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">Mobile</span>
                            <span className="text-white font-bold text-sm">{mobile || "—"}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-[110px]">
                            <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">Records Found</span>
                            <span className="text-white font-bold text-sm">
                                {loading ? "..." : `${data.length} Payment${data.length !== 1 ? "s" : ""}`}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 min-w-[110px]">
                            <span className="text-violet-300 text-[10px] font-bold uppercase tracking-widest">Total Received</span>
                            <span className="text-yellow-400 font-bold text-sm">
                                {loading
                                    ? "..."
                                    : summaryCurrency
                                        ? `${getCurrencySymbol(summaryCurrency)}${totalReceived.toLocaleString("en-IN")}`
                                        : uniqueCurrencies.length === 0
                                            ? `${getCurrencySymbol("INR")}0`
                                            : uniqueCurrencies.length > 1
                                                ? `${uniqueCurrencies
                                                    .map((currencyCode) => `${getCurrencySymbol(currencyCode)}${(totalReceivedByCurrency[currencyCode] || 0).toLocaleString("en-IN")} ${currencyCode}`)
                                                    .join(" | ")}`
                                                : `${totalReceived.toLocaleString("en-IN")} (mixed currencies)`}
                            </span>
                        </div>
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── White Body ── */}
                <div className="bg-white flex flex-col overflow-hidden flex-1">

                    {/* States */}
                    {loading && (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <svg className="w-8 h-8 text-violet-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                <span className="text-sm text-gray-500">Loading payment records...</span>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <div className="text-center">
                                <p className="text-red-500 font-semibold text-sm">{error}</p>
                                <button
                                    onClick={() => {
                                        setLoading(true);
                                        setError(null);
                                        fetch(`/api/ktahv-payment-history?bookingId=${encodeURIComponent(bookingId)}`)
                                            .then(r => r.json())
                                            .then(j => { if (j.success) setData(j.data || []); else setError(j.error); })
                                            .catch(() => setError("Network error. Please try again."))
                                            .finally(() => setLoading(false));
                                    }}
                                    className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <div className="overflow-auto">
                            <table className="w-full min-w-max border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b-2 border-gray-100">
                                        {columns.map((col) => (
                                            <th
                                                key={col.key}
                                                className="px-4 py-3 text-left text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap bg-[#1e3a5f]"
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((record, idx) => (
                                        <tr
                                            key={record.booking_id + idx}
                                            className="border-b border-gray-100 hover:bg-violet-50/40 transition-colors duration-100"
                                        >
                                            {columns.map((col) => (
                                                <td key={col.key} className="px-4 py-3.5 whitespace-nowrap align-middle">
                                                    <CellValue col={col.key} record={record} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                    {data.length === 0 && (
                                        <tr>
                                            <td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">
                                                No payment records found for this booking.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer */}
                    {!loading && !error && data.length > 0 && (
                        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                            <p className="text-gray-500 text-sm">
                                Showing <span className="font-bold text-gray-700">1–{data.length}</span>
                                {" "}of{" "}
                                <span className="font-bold text-gray-700">{data.length}</span>
                                {" "}record{data.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
