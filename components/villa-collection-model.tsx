'use client';

import React, { useMemo } from 'react';

/* ────────────────────────────────────────────────────────────────────────
 * Design tokens — sampled to match the reference screenshot exactly.
 * Keep every color reference in this file pointing at these constants so
 * the palette stays consistent if it needs to move into a shared theme.
 * ──────────────────────────────────────────────────────────────────────── */
const tokens = {
    ink: '#1F2430',        // primary text / values
    muted: '#8A8F98',       // small caption labels
    border: '#E7E2D3',      // warm hairline borders (cards, table)
    gold: '#AE8C4A',        // table header band / brand accent
    goldDark: '#7C6027',    // mode-badge text
    goldTint: '#F1E7CE',    // mode-badge fill, grand-total row fill
    green: '#1E9E5A',       // total collected
    greenTint: '#E3F5EA',
    greenBorder: '#BFE4CD',
    blue: '#2F6FE0',        // total reconciled
    amber: '#B9791C',       // pending status text
    amberTint: '#FFF2D2',
    amberBorder: '#F1D796',
    red: '#D6483F',         // pending / cancelled counters
    stripe: '#FBF9F4',      // odd-row table tint
};

/* ────────────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────────────── */
export type ReceiptStatus = 'RECEIVED' | 'PENDING' | 'CANCELLED';
export type ReceiptMode = 'E_COLLECT' | 'CASH' | 'CARD' | 'ONLINE' | string;

export interface CollectionReceipt {
    id: string;
    receiptNo: string | null;
    date: string;
    createdAt: string;
    mode: ReceiptMode;
    paymentType: string | null;
    status: ReceiptStatus;
    totalAmount: number;
    reconciledAmount: number | null;
    folioAmount: number;
    orderAmount: number;
    currency: string;
    paidBy: string;
    paidByType: string;
    createdBy: string | null;
    bankOrCard: string | null;
    notes: string | null;
}

export interface CollectionCounts {
    advance: number;
    creditNote: number;
}

export interface CollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    guestName: string;
    checkInLabel: string; // e.g. "Thu Jun 04 2026 00:00:00 GMT+0530 (India Standard Time)"
    mobile?: string | null;
    folio: string;
    receipts: CollectionReceipt[];
    /** Counts that can't be derived from the receipt rows themselves. */
    counts?: CollectionCounts;
}

/* ────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */
const fmtMoney = (value: number, currency: string) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
    }).format(value);

function StatusBadge({ status }: { status: ReceiptStatus }) {
    const styles: Record<ReceiptStatus, React.CSSProperties> = {
        RECEIVED: { color: tokens.green, background: tokens.greenTint, borderColor: tokens.greenBorder },
        PENDING: { color: tokens.amber, background: tokens.amberTint, borderColor: tokens.amberBorder },
        CANCELLED: { color: tokens.red, background: '#FBE7E5', borderColor: '#F2C6C1' },
    };
    return (
        <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
            style={styles[status]}
        >
            {status}
        </span>
    );
}

function ModeBadge({ mode }: { mode: ReceiptMode }) {
    return (
        <span
            className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
            style={{ color: tokens.goldDark, background: tokens.goldTint, borderColor: tokens.gold }}
        >
            {mode}
        </span>
    );
}

function SummaryCard({
    label,
    value,
    color,
}: {
    label: string;
    value: React.ReactNode;
    color?: string;
}) {
    return (
        <div
            className="flex-1 min-w-[140px] rounded-md bg-white px-4 py-3"
            style={{ border: `1px solid ${tokens.border}` }}
        >
            <div
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: tokens.muted }}
            >
                {label}
            </div>
            <div
                className="mt-1.5 text-xl font-semibold tabular-nums"
                style={{ color: color ?? tokens.ink }}
            >
                {value}
            </div>
        </div>
    );
}

function HeaderField({ label, value, emphasize }: { label: string; value: React.ReactNode; emphasize?: boolean }) {
    return (
        <div className="flex-1 px-6 py-4 text-center first:pl-0 last:pr-0">
            <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: tokens.muted }}>
                {label}
            </div>
            <div
                className="mt-1 text-sm font-semibold"
                style={{ color: emphasize ? tokens.red : tokens.ink }}
            >
                {value}
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────
 * Component
 * ──────────────────────────────────────────────────────────────────────── */
export default function CollectionModal({
    isOpen,
    onClose,
    bookingId,
    guestName,
    checkInLabel,
    mobile,
    folio,
    receipts,
    counts = { advance: 0, creditNote: 0 },
}: CollectionModalProps) {
    const summary = useMemo(() => {
        const totalCollected = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const totalReconciled = receipts.reduce((sum, r) => sum + (r.reconciledAmount || 0), 0);
        const received = receipts.filter((r) => r.status === 'RECEIVED').length;
        const pending = receipts.filter((r) => r.status === 'PENDING').length;
        const cancelled = receipts.filter((r) => r.status === 'CANCELLED').length;

        const grandTotal = {
            totalAmount: totalCollected,
            reconciledAmount: totalReconciled,
            folioAmount: receipts.reduce((sum, r) => sum + (r.folioAmount || 0), 0),
            orderAmount: receipts.reduce((sum, r) => sum + (r.orderAmount || 0), 0),
        };

        return { totalCollected, totalReconciled, received, pending, cancelled, grandTotal };
    }, [receipts]);

    const currency = receipts[0]?.currency ?? 'INR';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Collection details for booking ${bookingId}`}
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* accent strip */}
                <div className="h-1.5 w-full shrink-0" style={{ background: tokens.ink }} />

                {/* header info bar */}
                <div className="relative flex shrink-0 items-stretch divide-x" style={{ borderColor: tokens.border }}>
                    <HeaderField label="Booking ID" value={bookingId} />
                    <HeaderField label="Guest Name" value={<span style={{ color: tokens.red }}>{guestName}</span>} />
                    <HeaderField label="Check-In" value={checkInLabel} />
                    <HeaderField label="Mobile" value={mobile || '—'} />
                    <HeaderField label="Folio" value={folio} />

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors hover:bg-black/5"
                        style={{ color: tokens.muted }}
                    >
                        ✕
                    </button>
                </div>
                <div className="h-px w-full shrink-0" style={{ background: tokens.border }} />

                {/* body (scrollable) */}
                <div className="flex-1 overflow-y-auto">
                    {/* summary cards */}
                    <div className="flex flex-wrap gap-3 px-6 py-5">
                        <SummaryCard label="Total Collected" value={fmtMoney(summary.totalCollected, currency)} color={tokens.green} />
                        <SummaryCard label="Total Reconciled" value={fmtMoney(summary.totalReconciled, currency)} color={tokens.blue} />
                        <SummaryCard label="Received" value={summary.received} />
                        <SummaryCard label="Pending" value={summary.pending} color={summary.pending > 0 ? tokens.red : tokens.ink} />
                        <SummaryCard label="Advance" value={counts.advance} />
                        <SummaryCard label="Credit Note" value={counts.creditNote} />
                        <SummaryCard label="Cancelled" value={summary.cancelled} color={summary.cancelled > 0 ? tokens.red : tokens.ink} />
                    </div>

                    {/* receipts table */}
                    <div className="overflow-x-auto px-6 pb-6">
                        <table className="w-full min-w-[1400px] border-collapse text-sm">
                            <thead>
                                <tr style={{ background: tokens.gold }}>
                                    {[
                                        'Receipt #', 'Date', 'Created At', 'Mode', 'Status',
                                        'Total Amount', 'Reconciled Amount', 'Folio Amount', 'Order Amount',
                                        'Currency', 'Paid By', 'Collected By',
                                        //  'Bank / Card', 'Notes', 'Paid By (Type)','Payment Type',
                                    ].map((col) => (
                                        <th
                                            key={col}
                                            className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {receipts.map((r, i) => (
                                    <tr
                                        key={r.id}
                                        style={{ background: i % 2 === 1 ? tokens.stripe : '#FFFFFF' }}
                                        className="border-b"
                                    >
                                        <td className="whitespace-nowrap px-3 py-2.5" style={{ borderColor: tokens.border }}>
                                            {r.receiptNo ?? '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5" style={{ color: tokens.muted }}>{r.date}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5" style={{ color: tokens.muted }}>{r.createdAt}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5"><ModeBadge mode={r.mode} /></td>
                                        {/* <td className="whitespace-nowrap px-3 py-2.5">{r.paymentType ?? '-'}</td> */}
                                        <td className="whitespace-nowrap px-3 py-2.5"><StatusBadge status={r.status} /></td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-medium">
                                            {fmtMoney(r.totalAmount, r.currency)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-medium" style={{ color: tokens.blue }}>
                                            {r.reconciledAmount != null ? fmtMoney(r.reconciledAmount, r.currency) : '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums font-medium" style={{ color: tokens.green }}>
                                            {fmtMoney(r.folioAmount, r.currency)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                                            {fmtMoney(r.orderAmount, r.currency)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2.5">{r.currency}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5">{r.paidBy}</td>
                                        {/* <td className="whitespace-nowrap px-3 py-2.5">{r.paidByType}</td> */}
                                        <td className="whitespace-nowrap px-3 py-2.5">{r.createdBy ?? '--'}</td>
                                        {/* <td className="whitespace-nowrap px-3 py-2.5">{r.bankOrCard ?? '—'}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5">{r.notes ?? '—'}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: tokens.goldTint }}>
                                    <td colSpan={5} className="px-3 py-3 text-right text-[13px] font-bold" style={{ color: tokens.goldDark }}>
                                        GRAND TOTAL ({receipts.length} RECEIPTS)
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums text-[13px] font-bold" style={{ color: tokens.ink }}>
                                        {fmtMoney(summary.grandTotal.totalAmount, currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums text-[13px] font-bold" style={{ color: tokens.blue }}>
                                        {fmtMoney(summary.grandTotal.reconciledAmount, currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums text-[13px] font-bold" style={{ color: tokens.green }}>
                                        {fmtMoney(summary.grandTotal.folioAmount, currency)}
                                    </td>
                                    <td className="px-3 py-3 text-right tabular-nums text-[13px] font-bold" style={{ color: tokens.ink }}>
                                        {fmtMoney(summary.grandTotal.orderAmount, currency)}
                                    </td>
                                    <td colSpan={3} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────
 * Demo data — mirrors the reference screenshot 1:1 so this renders
 * correctly out of the box. Remove this block once wired to real data.
 * ──────────────────────────────────────────────────────────────────────── */
export function CollectionModalDemo() {
    const [open, setOpen] = React.useState(true);

    const receipts: CollectionReceipt[] = [
        {
            id: '1',
            receiptNo: null,
            date: '03/06/2026 11:20',
            createdAt: '03/06/2026 11:20',
            mode: 'E_COLLECT',
            paymentType: '-',
            status: 'RECEIVED',
            totalAmount: 10506.96,
            reconciledAmount: null,
            folioAmount: 10506.96,
            orderAmount: 0,
            currency: 'INR',
            paidBy: 'Shreyans rajendrakumar choudhari',
            paidByType: 'AGENCY',
            createdBy: null,
            bankOrCard: null,
            notes: 'E-collect payment',
        },
        {
            id: '2',
            receiptNo: 'RCPT/2026-27/0000000008',
            date: '03/06/2026 12:08',
            createdAt: '03/06/2026 12:09',
            mode: 'CASH',
            paymentType: '0',
            status: 'PENDING',
            totalAmount: 10506.95,
            reconciledAmount: 10506.95,
            folioAmount: 10506.95,
            orderAmount: 0,
            currency: 'INR',
            paidBy: 'Shreyans rajendrakumar choudhari',
            paidByType: 'AGENCY',
            createdBy: 'Sunil Gour',
            bankOrCard: null,
            notes: null,
        },
        {
            id: '3',
            receiptNo: 'RCPT/2026-27/0000000010',
            date: '04/06/2026 11:55',
            createdAt: '04/06/2026 11:55',
            mode: 'CASH',
            paymentType: '0',
            status: 'PENDING',
            totalAmount: 4241.8,
            reconciledAmount: 749.0,
            folioAmount: 0,
            orderAmount: 4241.8,
            currency: 'INR',
            paidBy: 'Shreyans rajendrakumar choudhari',
            paidByType: 'AGENCY',
            createdBy: 'Sunil Gour',
            bankOrCard: null,
            notes: null,
        },
    ];

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            {!open && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                    Open collection details
                </button>
            )}
            <CollectionModal
                isOpen={open}
                onClose={() => setOpen(false)}
                bookingId="22106307"
                guestName="Guest"
                checkInLabel="Thu Jun 04 2026 00:00:00 GMT+0530 (India Standard Time)"
                mobile={null}
                folio="VRV0000102"
                receipts={receipts}
                counts={{ advance: 0, creditNote: 0 }}
            />
        </div>
    );
}