'use client';

import React, { useMemo } from 'react';
import { ArrowRight, BadgeCheck, Banknote, CalendarDays, ChevronRight, Clock3, ExternalLink, FileText, ListOrdered, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Booking } from '@/hooks/use-accounts-tracker';

function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);
}

function parseDate(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysAgo(value: string): number | null {
    const date = parseDate(value);
    if (!date) return null;
    const diff = Date.now() - date.getTime();
    return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)), 0);
}

function formatSignedINR(val: number): string {
    const base = formatINR(Math.abs(val));
    return val > 0 ? `+${base}` : val < 0 ? `-${base}` : base;
}

function SectionPanel({
    title,
    subtitle,
    children,
    className = '',
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Card className={`border border-slate-200 shadow-sm overflow-hidden ${className}`}>
            <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50">
                <CardTitle className="text-sm sm:text-base font-semibold text-slate-950 leading-tight uppercase tracking-wide">
                    {title}
                </CardTitle>
                {subtitle ? <p className="mt-1 text-[11px] sm:text-xs text-slate-500">{subtitle}</p> : null}
            </CardHeader>
            <CardContent className="p-4 sm:p-5">{children}</CardContent>
        </Card>
    );
}

export function AnalyticsTableBlocks({ data }: { data: Booking[] }) {
    const todayKey = new Date().toDateString();

    const staffSummary = useMemo(() => {
        const map = new Map<
            string,
            {
                staff: string;
                total: number;
                incompletePI: number;
                overduePI: number;
                amount: number;
            }
        >();

        data.forEach((booking) => {
            const staff = booking.bookingTakenBy;
            if (!map.has(staff)) {
                map.set(staff, { staff, total: 0, incompletePI: 0, overduePI: 0, amount: 0 });
            }
            const entry = map.get(staff)!;
            entry.total++;
            entry.amount += booking.paymentVerify.piAmountSales || 0;
            if (
                booking.paymentVerify.verifyStatus === 'Pending' ||
                booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                !booking.paymentVerify.invoiceLink
            ) {
                entry.incompletePI++;
            }
            if ((booking.paymentVerify.differenceAmount || 0) > 0) {
                entry.overduePI++;
            }
        });

        return Array.from(map.values())
            .sort((a, b) => b.incompletePI - a.incompletePI || b.amount - a.amount)
            .slice(0, 5);
    }, [data]);

    const financeDelaySummary = useMemo(() => {
        return data
            .map((booking) => {
                const delayDays = daysAgo(booking.bookingDate || booking.arrivalDate || '');
                const invoiceMissing = !booking.paymentVerify.invoiceLink;
                const delayed = invoiceMissing || (delayDays !== null && delayDays > 3);
                return {
                    staff: booking.bookingTakenBy,
                    delayed,
                    invoiceMissing,
                    amount: booking.paymentVerify.tallyInvoiceAmount || booking.paymentVerify.piAmountSales || 0,
                    booking,
                };
            })
            .filter((row) => row.delayed)
            .reduce(
                (map, row) => {
                    const current = map.get(row.staff) || {
                        staff: row.staff,
                        pendingInvoices: 0,
                        delayDays: 0,
                        amount: 0,
                    };
                    current.pendingInvoices++;
                    current.delayDays += row.invoiceMissing ? 1 : 0;
                    current.amount += row.amount;
                    map.set(row.staff, current);
                    return map;
                },
                new Map<
                    string,
                    {
                        staff: string;
                        pendingInvoices: number;
                        delayDays: number;
                        amount: number;
                    }
                >(),
            );
    }, [data]);

    const financeDelayRows = Array.from(financeDelaySummary.values())
        .sort((a, b) => b.pendingInvoices - a.pendingInvoices || b.amount - a.amount)
        .slice(0, 5);

    const bankEntrySummary = useMemo(() => {
        const map = new Map<
            string,
            {
                staff: string;
                pendingEntries: number;
                delayed: number;
                amount: number;
            }
        >();

        data.forEach((booking) => {
            const staff = booking.bookingTakenBy;
            if (!map.has(staff)) {
                map.set(staff, { staff, pendingEntries: 0, delayed: 0, amount: 0 });
            }
            const entry = map.get(staff)!;
            if (booking.paymentVerify.verifyStatus === 'Pending') {
                entry.pendingEntries++;
                entry.amount += booking.paymentVerify.piAmountSales || 0;
                const delayDays = daysAgo(booking.bookingDate || booking.arrivalDate || '');
                if (delayDays !== null && delayDays > 3) entry.delayed++;
            }
        });

        return Array.from(map.values())
            .filter((row) => row.pendingEntries > 0)
            .sort((a, b) => b.pendingEntries - a.pendingEntries || b.amount - a.amount)
            .slice(0, 5);
    }, [data]);

    const employeeSummary = useMemo(() => {
        const map = new Map<
            string,
            {
                staff: string;
                pendingCount: number;
                verifiedCount: number;
                amount: number;
            }
        >();

        data.forEach((booking) => {
            const staff = booking.bookingTakenBy;
            if (!map.has(staff)) {
                map.set(staff, { staff, pendingCount: 0, verifiedCount: 0, amount: 0 });
            }
            const entry = map.get(staff)!;
            entry.amount += booking.paymentVerify.piAmountSales || 0;
            if (booking.paymentVerify.verifyStatus === 'Verified Done') entry.verifiedCount++;
            if (booking.paymentVerify.verifyStatus === 'Pending') entry.pendingCount++;
        });

        return Array.from(map.values())
            .sort((a, b) => b.pendingCount - a.pendingCount || b.amount - a.amount)
            .slice(0, 5);
    }, [data]);

    const incompleteList = useMemo(() => {
        return data
            .filter(
                (booking) =>
                    booking.paymentVerify.verifyStatus === 'Pending' ||
                    booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                    !booking.paymentVerify.invoiceLink,
            )
            .sort((a, b) => (b.paymentVerify.piAmountSales || 0) - (a.paymentVerify.piAmountSales || 0))
            .slice(0, 5);
    }, [data]);

    const reconciliationRows = useMemo(() => {
        return data
            .slice()
            .sort((a, b) => Math.abs(b.paymentVerify.differenceAmount || 0) - Math.abs(a.paymentVerify.differenceAmount || 0))
            .slice(0, 5);
    }, [data]);

    const overdueAccounts = useMemo(() => {
        return data
            .filter((booking) => booking.paymentVerify.verifyStatus === 'Pending' || (booking.paymentVerify.differenceAmount || 0) > 0)
            .sort((a, b) => (b.paymentVerify.piAmountSales || 0) - (a.paymentVerify.piAmountSales || 0))
            .slice(0, 5);
    }, [data]);

    const dailyStrip = useMemo(() => {
        const checkInToday = data.filter((booking) => parseDate(booking.arrivalDate)?.toDateString() === todayKey).length;
        const checkOutToday = data.filter((booking) => parseDate(booking.departureDate)?.toDateString() === todayKey).length;
        const invoiceCreatedToday = data.filter(
            (booking) =>
                parseDate(booking.bookingDate)?.toDateString() === todayKey &&
                Boolean(booking.paymentVerify.invoiceLink),
        ).length;
        const bankReceiptsToday = data.filter(
            (booking) =>
                parseDate(booking.bookingDate)?.toDateString() === todayKey &&
                (parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0) > 0,
        ).length;
        const overdue30Days = data.filter((booking) => {
            const days = daysAgo(booking.departureDate || booking.arrivalDate || '');
            return (
                (days !== null && days > 30) &&
                (booking.paymentVerify.verifyStatus === 'Pending' ||
                    booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                    (booking.paymentVerify.differenceAmount || 0) > 0)
            );
        }).length;

        return {
            totalBookings: data.length,
            checkInToday,
            checkOutToday,
            invoiceCreatedToday,
            bankReceiptsToday,
            overdue30Days,
        };
    }, [data, todayKey]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <SectionPanel
                    title="PI PENDING / INCOMPLETE BY SALES AGENT"
                    subtitle="Bookings that need follow-up from the booking owner"
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Sales Agent</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Total PI</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Incomplete PI</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staffSummary.length > 0 ? (
                                    staffSummary.map((row) => (
                                        <TableRow key={row.staff} className="border-b text-sm hover:bg-slate-50">
                                            <TableCell className="text-xs font-medium truncate max-w-[120px]">{row.staff}</TableCell>
                                            <TableCell className="text-xs text-right">{row.total}</TableCell>
                                            <TableCell className="text-xs text-right text-rose-600 font-semibold">{row.incompletePI}</TableCell>
                                            <TableCell className="text-xs text-right font-semibold">{formatINR(row.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-500">
                                            No pending PI items
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" />
                        View full report
                    </div>
                </SectionPanel>

                <SectionPanel
                    title="INVOICE CREATION DELAY (BY FINANCE TEAM)"
                    subtitle="Missing invoices and delayed processing by owner"
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-yellow-50 hover:bg-yellow-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Finance Exec</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Pending Invoices</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">&gt; 3 Days</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {financeDelayRows.length > 0 ? (
                                    financeDelayRows.map((row) => (
                                        <TableRow key={row.staff} className="border-b text-sm hover:bg-yellow-50">
                                            <TableCell className="text-xs font-medium truncate max-w-[120px]">{row.staff}</TableCell>
                                            <TableCell className="text-xs text-right">{row.pendingInvoices}</TableCell>
                                            <TableCell className="text-xs text-right text-amber-600 font-semibold">{row.delayDays}</TableCell>
                                            <TableCell className="text-xs text-right font-semibold">{formatINR(row.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-500">
                                            No delayed invoices
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" />
                        View full report
                    </div>
                </SectionPanel>

                <SectionPanel
                    title="BANK ENTRY PENDING (BY FINANCE TEAM)"
                    subtitle="Bookings that still need bank-side updates"
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-blue-50 hover:bg-blue-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Finance Exec</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Pending Entries</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">&gt; 3 Days</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bankEntrySummary.length > 0 ? (
                                    bankEntrySummary.map((row) => (
                                        <TableRow key={row.staff} className="border-b text-sm hover:bg-blue-50">
                                            <TableCell className="text-xs font-medium truncate max-w-[120px]">{row.staff}</TableCell>
                                            <TableCell className="text-xs text-right">{row.pendingEntries}</TableCell>
                                            <TableCell className="text-xs text-right text-blue-600 font-semibold">{row.delayed}</TableCell>
                                            <TableCell className="text-xs text-right font-semibold">{formatINR(row.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-500">
                                            No bank-entry pending items
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" />
                        View full report
                    </div>
                </SectionPanel>

                <SectionPanel
                    title="OVERALL EMPLOYEE PENDING SUMMARY"
                    subtitle="High-level pending count by team member"
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Team</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Pending</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Verified</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employeeSummary.length > 0 ? (
                                    employeeSummary.map((row) => (
                                        <TableRow key={row.staff} className="border-b text-sm hover:bg-slate-50">
                                            <TableCell className="text-xs font-medium truncate max-w-[120px]">{row.staff}</TableCell>
                                            <TableCell className="text-xs text-right text-rose-600 font-semibold">{row.pendingCount}</TableCell>
                                            <TableCell className="text-xs text-right">{row.verifiedCount}</TableCell>
                                            <TableCell className="text-xs text-right font-semibold">{formatINR(row.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-500">
                                            No employee summary available
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </SectionPanel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <SectionPanel
                    title="PI INCOMPLETE LIST (TILL CHECK-OUT)"
                    subtitle="Top incomplete bookings that are still waiting for closure"
                    className="xl:col-span-7"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">PI No.</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Booking ID</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Sales Agent</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Hotel</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">PI Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Days Since Check-out</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incompleteList.length > 0 ? (
                                    incompleteList.map((booking) => (
                                        <TableRow key={booking.id} className="border-b text-sm hover:bg-slate-50">
                                            <TableCell className="text-xs font-mono text-blue-600">{booking.paymentVerify.piUrl ? 'PI' : 'N/A'}</TableCell>
                                            <TableCell className="text-xs font-mono text-blue-600">{booking.id}</TableCell>
                                            <TableCell className="text-xs font-medium truncate max-w-[110px]">{booking.bookingTakenBy}</TableCell>
                                            <TableCell className="text-xs truncate max-w-[150px]">{booking.programmeName}</TableCell>
                                            <TableCell className="text-xs text-right font-semibold">{formatINR(booking.paymentVerify.piAmountSales || 0)}</TableCell>
                                            <TableCell className="text-xs text-right">
                                                {daysAgo(booking.departureDate || '') ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    className={`text-[10px] font-bold uppercase tracking-wide ${
                                                        booking.paymentVerify.verifyStatus === 'Pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : booking.paymentVerify.verifyStatus === 'Discrepancy'
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {booking.paymentVerify.verifyStatus}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4 text-xs text-slate-500">
                                            No incomplete bookings
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" />
                        View full list
                    </div>
                </SectionPanel>

                <SectionPanel
                    title="PI VS INVOICE VS AMT RECVD IN BANK SUMMARY (DETAILED)"
                    subtitle="Detailed comparison for the largest reconciliation gaps"
                    className="xl:col-span-3"
                >
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">PI Amount</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Invoice</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Variance</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide">Bank Receipts</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Variance</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wide text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reconciliationRows.length > 0 ? (
                                    reconciliationRows.map((booking) => (
                                        <TableRow key={booking.id} className="border-b text-sm hover:bg-slate-50">
                                            <TableCell className="text-xs font-semibold">{formatINR(booking.paymentVerify.piAmountSales || 0)}</TableCell>
                                            <TableCell className="text-xs">{formatINR(booking.paymentVerify.tallyInvoiceAmount || 0)}</TableCell>
                                            <TableCell className={`text-xs text-right font-semibold ${((booking.paymentVerify.tallyInvoiceAmount || 0) - (booking.paymentVerify.piAmountSales || 0)) > 0 ? 'text-amber-600' : ((booking.paymentVerify.tallyInvoiceAmount || 0) - (booking.paymentVerify.piAmountSales || 0)) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatSignedINR((booking.paymentVerify.tallyInvoiceAmount || 0) - (booking.paymentVerify.piAmountSales || 0))}
                                            </TableCell>
                                            <TableCell className="text-xs">{formatINR(parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0)}</TableCell>
                                            <TableCell className={`text-xs text-right font-semibold ${(parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0) - (booking.paymentVerify.tallyInvoiceAmount || 0) > 0 ? 'text-amber-600' : (parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0) - (booking.paymentVerify.tallyInvoiceAmount || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatSignedINR((parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0) - (booking.paymentVerify.tallyInvoiceAmount || 0))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    className={`text-[10px] font-bold uppercase tracking-wide ${
                                                        booking.paymentVerify.verifyStatus === 'Verified Done'
                                                            ? 'bg-green-100 text-green-700'
                                                            : booking.paymentVerify.verifyStatus === 'Discrepancy'
                                                                ? 'bg-amber-100 text-amber-700'
                                                                : 'bg-rose-100 text-rose-700'
                                                    }`}
                                                >
                                                    {booking.paymentVerify.verifyStatus}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-4 text-xs text-slate-500">
                                            No reconciliation gaps
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </SectionPanel>

                <SectionPanel
                    title="TOP OVERDUE ACCOUNTS (OUTSTANDING)"
                    subtitle="Bookings that need the quickest attention"
                    className="xl:col-span-2"
                >
                    <div className="space-y-2">
                        {overdueAccounts.length > 0 ? (
                            overdueAccounts.map((booking, index) => (
                                <div
                                    key={booking.id}
                                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-800 truncate">{booking.clientName}</p>
                                        <p className="text-[11px] text-slate-500 truncate">{booking.id}</p>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900">{formatINR(booking.paymentVerify.piAmountSales || 0)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-6 text-center text-xs text-slate-500">
                                No overdue accounts
                            </div>
                        )}
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                        <ArrowRight className="h-3.5 w-3.5" />
                        View all
                    </div>
                </SectionPanel>
            </div>

            <SectionPanel
                title="DAILY OPERATION SUMMARY STRIP"
                subtitle="Compact operational snapshot for today"
                className="overflow-hidden"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total Bookings</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.totalBookings}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-green-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Check-in Today</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.checkInToday}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-blue-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Check-out Today</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.checkOutToday}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-cyan-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Invoice Created Today</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.invoiceCreatedToday}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-amber-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Bank Receipts Today</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.bankReceiptsToday}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-rose-50 px-4 py-3 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Overdue &gt; 30 Days</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{dailyStrip.overdue30Days}</p>
                    </div>
                </div>
            </SectionPanel>
        </div>
    );
}
