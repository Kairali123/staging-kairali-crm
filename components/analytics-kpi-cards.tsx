'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    Clock,
    DollarSign,
    Percent,
} from 'lucide-react';
import type { Booking } from '@/hooks/use-accounts-tracker';

function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(val);
}

interface KPICardProps {
    label: string;
    value: string;
    subtext?: string;
    icon: React.ReactNode;
    bgColor: string;
    accentColor: string;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        value: string;
    };
}

function KPICard({
    label,
    value,
    subtext,
    icon,
    bgColor,
    accentColor,
    trend,
}: KPICardProps) {
    return (
        <Card className={`${bgColor} border-0 shadow-sm`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {label}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                            {value}
                        </p>
                        {subtext && (
                            <p className="text-xs text-slate-600 mt-1">{subtext}</p>
                        )}
                    </div>
                    <div
                        className={`${accentColor} p-2.5 rounded-lg flex-shrink-0 flex items-center justify-center`}
                    >
                        {icon}
                    </div>
                </div>
                {trend && (
                    <div className="mt-3 flex items-center gap-1 text-xs">
                        <TrendingUp
                            className={`w-3 h-3 ${trend.direction === 'up'
                                    ? 'text-green-600'
                                    : trend.direction === 'down'
                                        ? 'text-red-600'
                                        : 'text-slate-400'
                                }`}
                        />
                        <span
                            className={
                                trend.direction === 'up'
                                    ? 'text-green-600'
                                    : trend.direction === 'down'
                                        ? 'text-red-600'
                                        : 'text-slate-600'
                            }
                        >
                            {trend.value}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function AnalyticsKPICards({ data }: { data: Booking[] }) {
    const metrics = useMemo(() => {
        const totalBookings = data.length;
        const totalPIAmount = data.reduce(
            (sum, b) => sum + (b.paymentVerify.piAmountSales || 0),
            0
        );
        const totalReceived = data.reduce(
            (sum, b) => sum + (parseFloat(String(b.paymentVerify.amountReceived || 0).replace(/,/g, '')) || 0),
            0
        );
        const verifiedCount = data.filter(
            (b) => b.paymentVerify.verifyStatus === 'Verified Done'
        ).length;
        const pendingCount = data.filter(
            (b) => b.paymentVerify.verifyStatus === 'Pending'
        ).length;
        const discrepancyCount = data.filter(
            (b) =>
                b.paymentVerify.verifyStatus === 'Discrepancy' ||
                b.salesVerify.status === 'Discrepancy'
        ).length;
        const totalDifference = data.reduce(
            (sum, b) => sum + (b.paymentVerify.differenceAmount || 0),
            0
        );
        const verificationRate =
            totalBookings > 0
                ? Math.round((verifiedCount / totalBookings) * 100)
                : 0;

        return {
            totalBookings,
            totalPIAmount,
            totalReceived,
            verifiedCount,
            pendingCount,
            discrepancyCount,
            totalDifference,
            verificationRate,
        };
    }, [data]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
                label="Total Bookings"
                value={String(metrics.totalBookings)}
                icon={<Clock className="w-5 h-5 text-slate-700" />}
                bgColor="bg-slate-50"
                accentColor="bg-slate-100"
            />
            <KPICard
                label="Total PI Amount"
                value={formatINR(metrics.totalPIAmount)}
                icon={<DollarSign className="w-5 h-5 text-blue-700" />}
                bgColor="bg-blue-50"
                accentColor="bg-blue-100"
            />
            <KPICard
                label="Amount Received"
                value={formatINR(metrics.totalReceived)}
                subtext={`${metrics.verificationRate}% verified`}
                icon={<CheckCircle className="w-5 h-5 text-green-700" />}
                bgColor="bg-green-50"
                accentColor="bg-green-100"
            />
            <KPICard
                label="Pending/Discrepancy"
                value={String(metrics.pendingCount + metrics.discrepancyCount)}
                subtext={`${metrics.totalDifference > 0 ? '+' : ''}${formatINR(metrics.totalDifference)}`}
                icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
                bgColor="bg-amber-50"
                accentColor="bg-amber-100"
            />
        </div>
    );
}
