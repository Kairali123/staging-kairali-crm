'use client';

import React, { useMemo } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    CircleAlert,
    Clock3,
    FileText,
    Percent,
    ReceiptText,
    Wallet,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Booking } from '@/hooks/use-accounts-tracker';

function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);
}

function formatCompactINR(val: number): string {
    if (val >= 10000000) return `Rs ${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `Rs ${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `Rs ${(val / 1000).toFixed(1)}K`;
    return formatINR(val);
}

function parseDate(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(fromValue: string, toValue: string): number | null {
    const from = parseDate(fromValue);
    const to = parseDate(toValue);
    if (!from || !to) return null;
    const diff = to.getTime() - from.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
}

function StatCard({
    label,
    value,
    subtext,
    icon,
    tone,
}: {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    tone: 'slate' | 'blue' | 'green' | 'amber' | 'rose' | 'cyan';
}) {
    const palette = {
        slate: 'bg-slate-50 text-slate-900 border-slate-200',
        blue: 'bg-blue-50 text-slate-900 border-blue-100',
        green: 'bg-green-50 text-slate-900 border-green-100',
        amber: 'bg-amber-50 text-slate-900 border-amber-100',
        rose: 'bg-rose-50 text-slate-900 border-rose-100',
        cyan: 'bg-cyan-50 text-slate-900 border-cyan-100',
    }[tone];

    const iconTone = {
        slate: 'bg-slate-100 text-slate-700',
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
        cyan: 'bg-cyan-100 text-cyan-700',
    }[tone];

    return (
        <Card className={`${palette} border shadow-sm overflow-hidden`}>
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 leading-none">
                            {label}
                        </p>
                        <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950 break-words">
                            {value}
                        </p>
                        {subtext ? <p className="mt-1 text-xs font-medium text-slate-500">{subtext}</p> : null}
                    </div>
                    <div className={`h-10 w-10 rounded-xl ${iconTone} flex items-center justify-center shrink-0`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PanelShell({
    title,
    subtitle,
    right,
    children,
    className = '',
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Card className={`border border-slate-200 shadow-sm overflow-hidden ${className}`}>
            <CardHeader className="px-4 sm:px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-sm sm:text-base font-semibold text-slate-950 leading-tight uppercase tracking-wide">
                            {title}
                        </CardTitle>
                        {subtitle ? <p className="mt-1 text-[11px] sm:text-xs text-slate-500">{subtitle}</p> : null}
                    </div>
                    {right ? <div className="shrink-0">{right}</div> : null}
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">{children}</CardContent>
        </Card>
    );
}

function AlertRow({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: 'red' | 'amber' | 'blue' | 'green' | 'slate';
}) {
    const dot = {
        red: 'bg-rose-100 text-rose-600',
        amber: 'bg-amber-100 text-amber-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        slate: 'bg-slate-100 text-slate-600',
    }[tone];

    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${dot}`}>{icon}</div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 leading-tight">{label}</p>
            </div>
            <div className="text-sm font-bold tabular-nums text-slate-900">{value}</div>
            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
        </div>
    );
}

function DonutCard({
    title,
    subtitle,
    data,
    colors,
    centerLabel,
    centerValue,
    legendTitle,
}: {
    title: string;
    subtitle?: string;
    data: { name: string; value: number }[];
    colors: string[];
    centerLabel: string;
    centerValue: string;
    legendTitle?: string;
}) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <PanelShell title={title} subtitle={subtitle}>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_190px] gap-4 items-center">
                <div className="relative h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={70}
                                outerRadius={94}
                                paddingAngle={4}
                                stroke="transparent"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${title}-${entry.name}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value: number | string, name: string) => [
                                    typeof value === 'number' ? formatINR(value) : value,
                                    name,
                                ]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {centerLabel}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-950 break-words px-4">
                            {centerValue}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{total.toLocaleString('en-IN')} total</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {legendTitle ? (
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            {legendTitle}
                        </p>
                    ) : null}
                    <div className="space-y-2">
                        {data.map((item, index) => {
                            const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                            return (
                                <div key={`${title}-${item.name}`} className="flex items-center gap-3">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: colors[index % colors.length] }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {formatINR(item.value)} / {percent}%
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PanelShell>
    );
}

export function AnalyticsCharts({ data }: { data: Booking[] }) {
    const metrics = useMemo(() => {
        const totalBookings = data.length;
        const totalPIAmount = data.reduce((sum, booking) => sum + (booking.paymentVerify.piAmountSales || 0), 0);
        const totalInvoiceAmount = data.reduce((sum, booking) => sum + (booking.paymentVerify.tallyInvoiceAmount || 0), 0);
        const totalBankReceipts = data.reduce(
            (sum, booking) => sum + (parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0),
            0,
        );
        const verifiedCount = data.filter((booking) => booking.paymentVerify.verifyStatus === 'Verified Done').length;
        const pendingCount = data.filter((booking) => booking.paymentVerify.verifyStatus === 'Pending').length;
        const discrepancyCount = data.filter(
            (booking) =>
                booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                booking.salesVerify.status === 'Discrepancy',
        ).length;
        const invoiceMissingCount = data.filter((booking) => !booking.paymentVerify.invoiceLink).length;
        const outstandingAmount = Math.max(totalInvoiceAmount - totalBankReceipts, 0);
        const overdueAmount = data.reduce(
            (sum, booking) => sum + Math.max(booking.paymentVerify.differenceAmount || 0, 0),
            0,
        );
        const recoveryEfficiency = totalPIAmount > 0 ? Math.round((totalBankReceipts / totalPIAmount) * 100) : 0;
        const overdueIncompleteCount = data.filter((booking) => {
            const isIncomplete =
                booking.paymentVerify.verifyStatus === 'Pending' ||
                booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                !booking.paymentVerify.invoiceLink;
            const daysSinceCheckout = (() => {
                const parsed = new Date(booking.departureDate || booking.arrivalDate || '');
                return Number.isNaN(parsed.getTime()) ? null : Math.max(Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24)), 0);
            })();
            return isIncomplete && daysSinceCheckout !== null && daysSinceCheckout > 3;
        }).length;
        const incompleteCount = Math.max(totalBookings - verifiedCount - overdueIncompleteCount, 0);

        return {
            totalBookings,
            totalPIAmount,
            totalInvoiceAmount,
            totalBankReceipts,
            verifiedCount,
            pendingCount,
            discrepancyCount,
            invoiceMissingCount,
            outstandingAmount,
            overdueAmount,
            recoveryEfficiency,
            overdueIncompleteCount,
            incompleteCount,
        };
    }, [data]);

    const completionData = useMemo(
        () => [
            { name: 'Completed', value: metrics.verifiedCount },
            { name: 'Incomplete', value: metrics.incompleteCount },
            { name: 'Overdue incomplete', value: metrics.overdueIncompleteCount },
        ],
        [metrics.incompleteCount, metrics.overdueIncompleteCount, metrics.verifiedCount],
    );

    const bankCollectionData = useMemo(() => {
        const matched = data
            .filter((booking) => booking.paymentVerify.verifyStatus === 'Verified Done')
            .reduce(
                (sum, booking) =>
                    sum + (parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0),
                0,
            );

        const partial = data
            .filter((booking) => booking.paymentVerify.verifyStatus === 'Discrepancy')
            .reduce(
                (sum, booking) =>
                    sum + (parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0),
                0,
            );

        const unmatched = data
            .filter((booking) => booking.paymentVerify.verifyStatus === 'Pending')
            .reduce((sum, booking) => sum + (booking.paymentVerify.piAmountSales || 0), 0);

        return [
            { name: 'Matched', value: matched },
            { name: 'Partially Matched', value: partial },
            { name: 'Unmatched / Pending', value: unmatched },
        ];
    }, [data]);

    const alertItems = useMemo(() => {
        const piIncompleteTillCheckout = data.filter(
            (booking) =>
                booking.paymentVerify.verifyStatus === 'Pending' ||
                booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                !booking.paymentVerify.invoiceLink,
        ).length;
        const editFormRequired = data.filter(
            (booking) =>
                booking.paymentVerify.verifyStatus === 'Discrepancy' ||
                !booking.paymentVerify.invoiceLink,
        ).length;

        return [
            {
                label: 'PI incomplete till check-out',
                value: piIncompleteTillCheckout.toString(),
                icon: <CircleAlert className="h-4 w-4" />,
                tone: 'red' as const,
            },
            {
                label: 'Invoice not created',
                value: metrics.invoiceMissingCount.toString(),
                icon: <FileText className="h-4 w-4" />,
                tone: 'amber' as const,
            },
            {
                label: 'PI vs invoice mismatch',
                value: metrics.discrepancyCount.toString(),
                icon: <AlertTriangle className="h-4 w-4" />,
                tone: 'red' as const,
            },
            {
                label: 'Bank entry pending',
                value: metrics.pendingCount.toString(),
                icon: <Banknote className="h-4 w-4" />,
                tone: 'blue' as const,
            },
            {
                label: 'Overdue payments',
                value: metrics.overdueIncompleteCount.toString(),
                icon: <Clock3 className="h-4 w-4" />,
                tone: 'green' as const,
            },
            {
                label: 'Edit form / action required',
                value: editFormRequired.toString(),
                icon: <FileText className="h-4 w-4" />,
                tone: 'amber' as const,
            },
        ];
    }, [data, metrics.discrepancyCount, metrics.invoiceMissingCount, metrics.overdueIncompleteCount, metrics.pendingCount]);

    const comparisonData = useMemo(() => {
        const staffMap = new Map<
            string,
            { label: string; piAmount: number; invoiceAmount: number; bankReceipts: number; variancePercent: number; sortKey: number }
        >();

        data.forEach((booking) => {
            const parsed = new Date(booking.bookingDate || booking.arrivalDate || '');
            const label =
                booking.month && booking.month !== '_'
                    ? String(booking.month)
                    : !Number.isNaN(parsed.getTime())
                        ? parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                        : 'Unknown';
            if (!staffMap.has(label)) {
                staffMap.set(label, {
                    label,
                    piAmount: 0,
                    invoiceAmount: 0,
                    bankReceipts: 0,
                    variancePercent: 0,
                    sortKey: Number.isNaN(parsed.getTime()) ? booking.bookingDateRaw || 0 : parsed.getTime(),
                });
            }

            const entry = staffMap.get(label)!;
            entry.piAmount += booking.paymentVerify.piAmountSales || 0;
            entry.invoiceAmount += booking.paymentVerify.tallyInvoiceAmount || 0;
            entry.bankReceipts += parseFloat(String(booking.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0;
            if (!entry.sortKey) {
                entry.sortKey = Number.isNaN(parsed.getTime()) ? booking.bookingDateRaw || 0 : parsed.getTime();
            }
        });

        return Array.from(staffMap.values())
            .map((entry) => {
                const variance = entry.invoiceAmount > 0 ? ((entry.invoiceAmount - entry.bankReceipts) / entry.invoiceAmount) * 100 : 0;
                return { ...entry, variancePercent: Number(variance.toFixed(1)) };
            })
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(0, 6);
    }, [data]);

    const statusColors = ['#22c55e', '#f59e0b', '#ef4444'];
    const bankColors = ['#22c55e', '#f97316', '#6366f1'];

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-blue-50/80 via-white to-white shadow-sm overflow-hidden">
                <div className="flex flex-col gap-1.5 px-4 sm:px-5 py-4 border-b border-slate-200 bg-white/70">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-blue-600/90 text-white flex items-center justify-center shadow-sm">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm sm:text-base font-semibold text-slate-950 leading-tight">
                                Key Performance Indicators
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-500">
                                Real-time verification metrics and billing summary
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                        <StatCard
                            label="Total PI Amount"
                            value={formatINR(metrics.totalPIAmount)}
                            subtext={`Verified ${metrics.verifiedCount}`}
                            icon={<ReceiptText className="h-5 w-5" />}
                            tone="slate"
                        />
                        <StatCard
                            label="Invoice Amount (Actual)"
                            value={formatINR(metrics.totalInvoiceAmount)}
                            icon={<FileText className="h-5 w-5" />}
                            tone="blue"
                        />
                        <StatCard
                            label="Total Bank Receipts"
                            value={formatINR(metrics.totalBankReceipts)}
                            subtext={`${metrics.verifiedCount} verified`}
                            icon={<Banknote className="h-5 w-5" />}
                            tone="green"
                        />
                        <StatCard
                            label="Outstanding Amount"
                            value={formatINR(metrics.outstandingAmount)}
                            subtext={`Receivable gap`}
                            icon={<AlertTriangle className="h-5 w-5" />}
                            tone="cyan"
                        />
                        <StatCard
                            label="Overdue Amount"
                            value={formatINR(metrics.overdueAmount)}
                            subtext={`Critical follow-up`}
                            icon={<Clock3 className="h-5 w-5" />}
                            tone="amber"
                        />
                        <StatCard
                            label="Recovery Efficiency"
                            value={`${metrics.recoveryEfficiency}%`}
                            subtext={`Recovery rate`}
                            icon={<Percent className="h-5 w-5" />}
                            tone="rose"
                        />
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,290px)_minmax(0,280px)_minmax(0,1fr)_minmax(0,280px)] gap-4">
                <PanelShell
                    title="ALERTS CENTER"
                    subtitle="Bookings that need action or follow-up"
                    right={<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-100 px-2 text-[10px] font-bold text-rose-700">{alertItems.length}</span>}
                    className="min-w-0"
                >
                    <div className="space-y-2">
                        {alertItems.map((item) => (
                            <AlertRow key={item.label} icon={item.icon} label={item.label} value={item.value} tone={item.tone} />
                        ))}
                    </div>
                </PanelShell>

                <DonutCard
                    title="PI COMPLETION STATUS"
                    subtitle="Count of completed, incomplete and overdue incomplete bookings"
                    data={completionData}
                    colors={statusColors}
                    centerLabel="Total PI"
                    centerValue={metrics.totalBookings.toString()}
                    legendTitle="Completion status"
                />

                <PanelShell
                    title="PI VS INVOICE VS BANK RECVD"
                    subtitle="Month-wise comparison of PI, invoice and bank receipts"
                    className="min-w-0"
                >
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} margin={{ top: 12, right: 20, bottom: 48, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={60} />
                                <YAxis yAxisId="left" tickFormatter={(value) => formatCompactINR(Number(value))} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    formatter={(value: number | string, name: string) => [
                                        typeof value === 'number' ? formatINR(value) : value,
                                        name,
                                    ]}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="piAmount" fill="#3b82f6" name="PI Amount" radius={[6, 6, 0, 0]} />
                                <Bar yAxisId="left" dataKey="invoiceAmount" fill="#22c55e" name="Invoice Amount" radius={[6, 6, 0, 0]} />
                                <Bar yAxisId="left" dataKey="bankReceipts" fill="#a855f7" name="Bank Receipts" radius={[6, 6, 0, 0]} />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="variancePercent"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    name="Variance %"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </PanelShell>

                <DonutCard
                    title="BANK COLLECTION STATUS"
                    subtitle="How much of the receivable pool is matched vs pending"
                    data={bankCollectionData}
                    colors={bankColors}
                    centerLabel="Total Receipts"
                    centerValue={formatINR(metrics.totalBankReceipts)}
                    legendTitle="Collection status"
                />
            </div>
        </div>
    );
}
