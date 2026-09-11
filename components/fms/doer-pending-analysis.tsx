"use client"

import React, { useState, useMemo } from 'react';
import {
    PieChart as PieChartIcon,
    Users,
    AlertCircle,
    CheckCircle2,
    X,
    Flame,
    Layers,
    ArrowUpRight
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    NEW_ORDER_STAGES,
    DEFAULT_ORDER_STAGE_USERS,
    normalizeDoerKey,
    getCanonicalDoerName,
} from "@/components/fms/order-stage-wise-pendings";

/* ─────────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────────── */
export interface DoerPendingItem {
    name: string;
    pendingCount: number;
    share: number;
    stageCounts: number[];
    topStage: {
        stageNo: number;
        stageName: string;
        count: number;
    } | null;
}

interface DoerPendingAnalysisProps {
    orders: any[];
    isStageCompletedFn: (stageIdx: number, order: any) => boolean;
    getOrderStageDoerFn: (order: any, stageIdx: number) => string;
    currentUser?: any;
    selectedDoer?: string | null;
    onSelectDoer?: (doer: string | null) => void;
}

export const DOER_CHART_COLORS = [
    "#2563eb", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#84cc16", // Lime
    "#e11d48", // Rose
    "#0284c7", // Sky
    "#a855f7", // Violet
    "#64748b", // Slate
];

const OTHERS_COLOR = "#94a3b8"; // Slate-400 for grouped tail

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export function DoerPendingAnalysis({
    orders,
    isStageCompletedFn,
    getOrderStageDoerFn,
    currentUser,
    selectedDoer,
    onSelectDoer,
}: DoerPendingAnalysisProps) {
    const [hoveredDoerName, setHoveredDoerName] = useState<string | null>(null);

    // Compute normalized stage-wise pending data matching Stage Wise Pendings Report
    const { doersWithPending, totalPendingCount, stageTotals, topPendingStage } = useMemo(() => {
        // Exclude cancelled and on-hold orders exactly as in Stage Wise Pendings Report
        const actionableOrders = orders.filter((o) => {
            const rawStatus = (o.status || o.orderStatus || o.stages?.[0]?.status || '').toLowerCase().trim();
            if (rawStatus.includes('cancel') || rawStatus === 'edit order') return false;
            if (rawStatus === 'hold') return false;
            return true;
        });

        const stageTotalsArr: number[] = new Array(NEW_ORDER_STAGES.length).fill(0);
        const employeeDataMap = new Map<string, { displayName: string; counts: number[] }>();

        // Ensure default stage assignees exist with normalized keys
        DEFAULT_ORDER_STAGE_USERS.forEach((user) => {
            const key = normalizeDoerKey(user);
            if (!employeeDataMap.has(key)) {
                employeeDataMap.set(key, { displayName: getCanonicalDoerName(user), counts: new Array(NEW_ORDER_STAGES.length).fill(0) });
            }
        });

        // Loop through actionable orders
        for (const order of actionableOrders) {
            let activeIdx = 9;
            for (let i = 0; i <= 8; i++) {
                if (!isStageCompletedFn(i, order)) {
                    activeIdx = i;
                    break;
                }
            }

            if (activeIdx < 9) {
                const rawDoer = (getOrderStageDoerFn(order, activeIdx) || 'Unassigned').trim();
                const key = normalizeDoerKey(rawDoer);

                if (!employeeDataMap.has(key)) {
                    employeeDataMap.set(key, {
                        displayName: getCanonicalDoerName(rawDoer),
                        counts: new Array(NEW_ORDER_STAGES.length).fill(0),
                    });
                }

                const entry = employeeDataMap.get(key)!;
                entry.counts[activeIdx]++;
                stageTotalsArr[activeIdx]++;
            }
        }

        // Convert map to list of active doers with pending > 0
        const allRows: { emp: string; counts: number[]; total: number }[] = [];
        employeeDataMap.forEach((data) => {
            const total = data.counts.reduce((acc, c) => acc + c, 0);
            if (total > 0) {
                allRows.push({ emp: data.displayName, counts: data.counts, total });
            }
        });

        // Role-based scoping (if viewSelf permission is active)
        const currentUserName = (currentUser?.name ?? '').toLowerCase().trim();
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || !currentUser?.permissions?.includes('new-order-fms.viewSelf');

        const scopedRows = isAdmin
            ? allRows
            : allRows.filter((r) => {
                const empLower = r.emp.toLowerCase();
                return empLower === currentUserName || empLower.includes(currentUserName);
            });

        // Sort descending by highest pending count
        scopedRows.sort((a, b) => b.total - a.total);

        const totalPending = scopedRows.reduce((acc, r) => acc + r.total, 0);

        const doers: DoerPendingItem[] = scopedRows.map((r) => {
            const share = totalPending > 0 ? (r.total / totalPending) * 100 : 0;

            // Find top bottleneck stage for this doer
            let topStageIdx = -1;
            let maxStageCount = 0;
            r.counts.forEach((cnt, idx) => {
                if (cnt > maxStageCount) {
                    maxStageCount = cnt;
                    topStageIdx = idx;
                }
            });

            const topStage = topStageIdx >= 0 ? {
                stageNo: NEW_ORDER_STAGES[topStageIdx].no,
                stageName: NEW_ORDER_STAGES[topStageIdx].short,
                count: maxStageCount,
            } : null;

            return {
                name: r.emp,
                pendingCount: r.total,
                share,
                stageCounts: r.counts,
                topStage,
            };
        });

        // Determine top overall pending stage
        let maxOverallStageCount = 0;
        let topOverallStageIdx = 0;
        stageTotalsArr.forEach((cnt, idx) => {
            if (cnt > maxOverallStageCount) {
                maxOverallStageCount = cnt;
                topOverallStageIdx = idx;
            }
        });

        const topOverallStage = {
            stageNo: NEW_ORDER_STAGES[topOverallStageIdx]?.no ?? 1,
            stageName: NEW_ORDER_STAGES[topOverallStageIdx]?.short ?? 'Order Verify',
            count: maxOverallStageCount,
        };

        return {
            doersWithPending: doers,
            totalPendingCount: totalPending,
            stageTotals: stageTotalsArr,
            topPendingStage: topOverallStage,
        };
    }, [orders, isStageCompletedFn, getOrderStageDoerFn, currentUser]);

    // Handle selection toggling
    const handleDoerClick = (doerName: string) => {
        if (!onSelectDoer) return;
        if (selectedDoer && normalizeDoerKey(selectedDoer) === normalizeDoerKey(doerName)) {
            onSelectDoer(null);
        } else {
            onSelectDoer(getCanonicalDoerName(doerName));
        }
    };

    // Determine actively focused doer (hovered takes priority over selected, fallback to null)
    const activeDoerName = hoveredDoerName || selectedDoer;
    const activeDoerItem = activeDoerName
        ? doersWithPending.find((d) => normalizeDoerKey(d.name) === normalizeDoerKey(activeDoerName))
        : null;

    // Top Doer Donut Slices: Show top 7 and group remaining into "Others" if > 8
    const { chartSlices, othersDoers } = useMemo(() => {
        if (totalPendingCount <= 0 || doersWithPending.length === 0) {
            return { chartSlices: [], othersDoers: [] };
        }

        const maxPrimaryDoers = 7;
        let primaryList: {
            name: string;
            pendingCount: number;
            share: number;
            color: string;
            topStageName?: string;
            topStageNo?: number;
            topStageCount?: number;
            isOthers?: boolean;
        }[] = [];
        let others: DoerPendingItem[] = [];

        if (doersWithPending.length <= 8) {
            primaryList = doersWithPending.map((d, i) => ({
                name: d.name,
                pendingCount: d.pendingCount,
                share: d.share,
                color: DOER_CHART_COLORS[i % DOER_CHART_COLORS.length],
                topStageName: d.topStage ? `St${d.topStage.stageNo}: ${d.topStage.stageName}` : undefined,
                topStageNo: d.topStage?.stageNo,
                topStageCount: d.topStage?.count,
            }));
        } else {
            const topList = doersWithPending.slice(0, maxPrimaryDoers);
            others = doersWithPending.slice(maxPrimaryDoers);

            primaryList = topList.map((d, i) => ({
                name: d.name,
                pendingCount: d.pendingCount,
                share: d.share,
                color: DOER_CHART_COLORS[i % DOER_CHART_COLORS.length],
                topStageName: d.topStage ? `St${d.topStage.stageNo}: ${d.topStage.stageName}` : undefined,
                topStageNo: d.topStage?.stageNo,
                topStageCount: d.topStage?.count,
            }));

            const othersTotal = others.reduce((acc, d) => acc + d.pendingCount, 0);
            const othersShare = (othersTotal / totalPendingCount) * 100;

            primaryList.push({
                name: "Others",
                pendingCount: othersTotal,
                share: othersShare,
                color: OTHERS_COLOR,
                isOthers: true,
            });
        }

        let accumulatedAngle = 0;
        const slices = primaryList.map((item) => {
            const angle = (item.pendingCount / totalPendingCount) * 360;
            const startAngle = accumulatedAngle;
            const endAngle = accumulatedAngle + angle;
            accumulatedAngle = endAngle;
            return {
                ...item,
                angle,
                startAngle,
                endAngle,
            };
        });

        return { chartSlices: slices, othersDoers: others };
    }, [doersWithPending, totalPendingCount]);

    /* SVG Donut Chart Renderer */
    const renderDonutChart = () => {
        const size = 280;
        const center = size / 2;
        const Ro = 125;
        const Ri = 75;

        if (totalPendingCount <= 0 || chartSlices.length === 0) {
            return null;
        }

        // Coordinates helper where 0 deg is at 12 o'clock
        const getPoint = (deg: number, r: number) => {
            const rad = (deg * Math.PI) / 180;
            return {
                x: center + r * Math.sin(rad),
                y: center - r * Math.cos(rad),
            };
        };

        // If only 1 doer has pending workload (100%)
        if (chartSlices.length === 1) {
            const item = chartSlices[0];
            const midR = (Ro + Ri) / 2;
            const strokeW = Ro - Ri;

            return (
                <div className="relative flex items-center justify-center">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 drop-shadow-sm">
                        <circle
                            cx={center}
                            cy={center}
                            r={Ro + 4}
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth={1.5}
                        />
                        <circle
                            cx={center}
                            cy={center}
                            r={midR}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={strokeW}
                            className="cursor-pointer transition-transform hover:scale-[1.02]"
                            onClick={() => handleDoerClick(item.name)}
                        />
                    </svg>

                    {/* Center Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none select-none">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate max-w-[130px]" title={item.name}>
                            {item.name}
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                            {item.pendingCount.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-extrabold text-blue-600 tabular-nums mt-0.5">
                            100.0% Workload
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative flex items-center justify-center">
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="shrink-0 drop-shadow-sm"
                >
                    <defs>
                        <filter id="doerSliceShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.45" />
                        </filter>
                    </defs>

                    {/* Outer subtle ring track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={Ro + 4}
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth={1.5}
                    />

                    {/* Donut Slices */}
                    {chartSlices.map((slice) => {
                        const isCurrent = activeDoerName && normalizeDoerKey(activeDoerName) === normalizeDoerKey(slice.name);
                        const anyActive = Boolean(activeDoerName);

                        const p1o = getPoint(slice.startAngle, Ro);
                        const p2o = getPoint(slice.endAngle, Ro);
                        const p2i = getPoint(slice.endAngle, Ri);
                        const p1i = getPoint(slice.startAngle, Ri);

                        const largeArc = slice.angle > 180 ? 1 : 0;
                        const pathD = `M ${p1o.x} ${p1o.y} A ${Ro} ${Ro} 0 ${largeArc} 1 ${p2o.x} ${p2o.y} L ${p2i.x} ${p2i.y} A ${Ri} ${Ri} 0 ${largeArc} 0 ${p1i.x} ${p1i.y} Z`;

                        // Midpoint angle for percentage label
                        const midAngle = slice.startAngle + slice.angle / 2;
                        const labelPos = getPoint(midAngle, (Ro + Ri) / 2);

                        return (
                            <g key={slice.name}>
                                <path
                                    d={pathD}
                                    fill={slice.color}
                                    stroke="#ffffff"
                                    strokeWidth={2}
                                    strokeLinejoin="round"
                                    className="transition-all duration-200 cursor-pointer hover:opacity-100"
                                    opacity={anyActive ? (isCurrent ? 1 : 0.35) : 1}
                                    onMouseEnter={() => !slice.isOthers && setHoveredDoerName(slice.name)}
                                    onMouseLeave={() => setHoveredDoerName(null)}
                                    onClick={() => !slice.isOthers && handleDoerClick(slice.name)}
                                >
                                    <title>{`${slice.name}${slice.topStageName ? ` • ${slice.topStageName}` : ''}: ${slice.pendingCount.toLocaleString()} orders (${slice.share.toFixed(1)}%)`}</title>
                                </path>

                                {/* Percentage badge inside slice if angle is wide enough */}
                                {slice.angle >= 18 && (
                                    <text
                                        x={labelPos.x}
                                        y={labelPos.y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="#ffffff"
                                        filter="url(#doerSliceShadow)"
                                        className="font-black text-[10px] tabular-nums pointer-events-none select-none"
                                    >
                                        {slice.share.toFixed(0)}%
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Dynamic Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none select-none">
                    {activeDoerItem ? (
                        <>
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate max-w-[130px]" title={activeDoerItem.name}>
                                {activeDoerItem.name}
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                                {activeDoerItem.pendingCount.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-extrabold text-blue-600 tabular-nums mt-0.5">
                                {activeDoerItem.share.toFixed(1)}% Share
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                Total Pending
                            </span>
                            <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                                {totalPendingCount.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-extrabold text-blue-600 tabular-nums mt-0.5">
                                100.0%
                            </span>
                        </>
                    )}
                </div>
            </div>
        );
    };

    /* ─────────────────────────────────────────────
       EMPTY STATE
    ───────────────────────────────────────────── */
    if (totalPendingCount === 0 || doersWithPending.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 my-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                        <PieChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Doer Pending Analysis</h3>
                        <p className="text-xs text-slate-500">Pending order workload by responsible doer</p>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-800">No Pending Orders</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                        Currently there are no actionable pending orders for the selected filters. All workflows are clear.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 my-6 flex flex-col justify-between transition-all">
            {/* ── CARD HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                        <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                Doer Pending Analysis
                            </h3>
                            {selectedDoer && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5">
                                    Filtered: {getCanonicalDoerName(selectedDoer)}
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Pending order workload by responsible doer • <span className="font-semibold text-slate-700">{doersWithPending.length}</span> {doersWithPending.length === 1 ? 'doer' : 'doers'} with backlog
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedDoer && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectDoer?.(null)}
                            className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-2 flex items-center gap-1"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear Selection
                        </Button>
                    )}
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2 py-0.5">
                        {doersWithPending.length === 1 ? "Single Doer" : "Team Breakdown"}
                    </Badge>
                </div>
            </div>

            {/* ── MAIN INTERACTIVE AREA: DONUT CHART (LEFT) + DOER BREAKDOWN & STAGES (RIGHT) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── LEFT: DONUT CHART + ENHANCED PILLS (NAME, STAGE NAME, COUNT, %) ── */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                    <div className="w-full flex items-center justify-between px-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Workload Distribution
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {chartSlices.length > 7 ? "Top 7 + Others" : "All Active Slices"}
                        </span>
                    </div>

                    {renderDonutChart()}

                    {/* Chart Legend Pills: Shows Name, Stage Name, Count, and % */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-md w-full">
                        {chartSlices.map((s) => {
                            const isSelected = Boolean(selectedDoer && normalizeDoerKey(selectedDoer) === normalizeDoerKey(s.name));
                            const isHovered = Boolean(hoveredDoerName && normalizeDoerKey(hoveredDoerName) === normalizeDoerKey(s.name));

                            return (
                                <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => !s.isOthers && handleDoerClick(s.name)}
                                    onMouseEnter={() => !s.isOthers && setHoveredDoerName(s.name)}
                                    onMouseLeave={() => setHoveredDoerName(null)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all shadow-2xs ${
                                        isSelected
                                            ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-400"
                                            : isHovered
                                                ? "bg-blue-50 text-blue-900 border-blue-300"
                                                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                    } ${s.isOthers ? "cursor-default opacity-80" : "cursor-pointer"}`}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: isSelected ? "#ffffff" : s.color }} />
                                    <span className="font-bold">{s.name}</span>
                                    {s.topStageName && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                            isSelected ? "bg-blue-500 text-white" : "bg-rose-50 text-rose-700 border border-rose-100"
                                        }`}>
                                            {s.topStageName}
                                        </span>
                                    )}
                                    <span className={`font-bold tabular-nums ${isSelected ? "text-white" : "text-slate-900"}`}>
                                        {s.pendingCount.toLocaleString()}
                                    </span>
                                    <span className={`font-extrabold tabular-nums ${isSelected ? "text-blue-100" : "text-blue-600"}`}>
                                        ({s.share.toFixed(1)}%)
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── RIGHT: DOER BREAKDOWN LIST + STAGE BREAKDOWN INSPECTOR ── */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                    {/* DOER LIST TABLE */}
                    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        {/* Table Column Header */}
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 px-3.5 py-2.5 border-b border-slate-200">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                Doer & Primary Bottleneck
                            </span>
                            <div className="flex items-center gap-6 sm:gap-8">
                                <span className="text-right">Pending Orders</span>
                                <span className="w-16 text-right">% Share</span>
                            </div>
                        </div>

                        {/* List Items (Scrollable if many) */}
                        <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                            {doersWithPending.map((doer, idx) => {
                                const isSelected = Boolean(selectedDoer && normalizeDoerKey(selectedDoer) === normalizeDoerKey(doer.name));
                                const isHovered = Boolean(hoveredDoerName && normalizeDoerKey(hoveredDoerName) === normalizeDoerKey(doer.name));

                                // Find matching color from primary slices or fallback
                                const sliceMatch = chartSlices.find((s) => normalizeDoerKey(s.name) === normalizeDoerKey(doer.name));
                                const color = sliceMatch ? sliceMatch.color : DOER_CHART_COLORS[idx % DOER_CHART_COLORS.length];

                                return (
                                    <div
                                        key={doer.name}
                                        onClick={() => handleDoerClick(doer.name)}
                                        onMouseEnter={() => setHoveredDoerName(doer.name)}
                                        onMouseLeave={() => setHoveredDoerName(null)}
                                        className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-all cursor-pointer ${
                                            isSelected
                                                ? "bg-blue-50/90 ring-1 ring-inset ring-blue-400 font-semibold"
                                                : isHovered
                                                    ? "bg-slate-50 text-slate-900"
                                                    : "hover:bg-slate-50/70 text-slate-700"
                                        }`}
                                    >
                                        {/* Doer Name, Dot & Primary Bottleneck Stage */}
                                        <div className="flex flex-col min-w-0 pr-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="truncate font-bold text-slate-900" title={doer.name}>
                                                    {doer.name}
                                                </span>
                                            </div>
                                            {doer.topStage && (
                                                <div className="flex items-center gap-1.5 mt-0.5 pl-4.5 text-[10px]">
                                                    <span className="font-semibold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded shrink-0">
                                                        Stage {doer.topStage.stageNo}: {doer.topStage.stageName}
                                                    </span>
                                                    <span className="text-slate-500 font-medium">
                                                        ({doer.topStage.count.toLocaleString()} orders)
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Counts & Percentage */}
                                        <div className="flex items-center gap-6 sm:gap-8 shrink-0 tabular-nums">
                                            <span className="font-bold text-slate-900 text-right">
                                                {doer.pendingCount.toLocaleString()}
                                            </span>
                                            <span className="w-16 text-right font-extrabold text-blue-600">
                                                {doer.share.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── STAGE-AWARE BREAKDOWN PANEL (STAGE BOTTLENECK INSPECTOR) ── */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 p-3.5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                                    {activeDoerItem
                                        ? `${activeDoerItem.name} — Stage Breakdown`
                                        : "Overall Stage Bottleneck Breakdown"}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">
                                {activeDoerItem
                                    ? `Total: ${activeDoerItem.pendingCount.toLocaleString()} pending`
                                    : "Click or hover a doer to inspect"}
                            </span>
                        </div>

                        {/* Stage Badges Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {NEW_ORDER_STAGES.map((stg) => {
                                const count = activeDoerItem
                                    ? activeDoerItem.stageCounts[stg.index]
                                    : stageTotals[stg.index];

                                if (count <= 0) return null; // Hide 0-pending stages for clean presentation

                                const percentOfWorkload = activeDoerItem && activeDoerItem.pendingCount > 0
                                    ? (count / activeDoerItem.pendingCount) * 100
                                    : totalPendingCount > 0
                                        ? (count / totalPendingCount) * 100
                                        : 0;

                                const isHighest = activeDoerItem
                                    ? activeDoerItem.topStage?.stageNo === stg.no
                                    : topPendingStage.stageNo === stg.no;

                                return (
                                    <div
                                        key={stg.no}
                                        className={`px-2.5 py-1.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                                            isHighest
                                                ? "bg-rose-50/90 border-rose-200 ring-1 ring-rose-300"
                                                : "bg-white border-slate-200 hover:border-blue-200"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-[11px] font-bold text-slate-800 truncate" title={`Stage ${stg.no} — ${stg.short}`}>
                                                St{stg.no}: {stg.short}
                                            </span>
                                            {isHighest && (
                                                <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1 py-0.2 rounded shrink-0">
                                                    Peak
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-1 tabular-nums">
                                            <span className="font-extrabold text-slate-900 text-xs">
                                                {count.toLocaleString()}
                                            </span>
                                            <span className={`text-[10px] font-semibold ${isHighest ? "text-rose-600" : "text-slate-500"}`}>
                                                {percentOfWorkload.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SUPPORTING SUMMARY CARDS (MATCHING SALES REPORT METRIC FOOTER) ── */}
            <div className="mt-5 pt-3.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5 px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Pending Workload Summary
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        Supporting Information
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* 1. TOTAL PENDING */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                            Total Pending
                        </span>
                        <div className="mt-1">
                            <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums block truncate">
                                {totalPendingCount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                Across all 9 stages
                            </span>
                        </div>
                    </div>

                    {/* 2. ACTIVE DOERS */}
                    <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-200/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 truncate">
                                Active Doers
                            </span>
                            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded shrink-0">
                                Backlog
                            </span>
                        </div>
                        <div className="mt-1">
                            <span className="text-base sm:text-lg font-black text-blue-950 tabular-nums block truncate">
                                {doersWithPending.length} Members
                            </span>
                            <span className="text-[10px] text-blue-700 block truncate mt-0.5">
                                Responsible assignees
                            </span>
                        </div>
                    </div>

                    {/* 3. HIGHEST BACKLOG DOER */}
                    <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">
                                Highest Backlog
                            </span>
                            {doersWithPending[0] && (
                                <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                    {doersWithPending[0].share.toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <div className="mt-1">
                            <span className="text-base sm:text-lg font-black text-amber-950 truncate block" title={doersWithPending[0]?.name}>
                                {doersWithPending[0]?.name || "None"}
                            </span>
                            <span className="text-[10px] text-amber-700 block truncate mt-0.5">
                                {doersWithPending[0]?.pendingCount.toLocaleString() || 0} orders pending
                            </span>
                        </div>
                    </div>

                    {/* 4. TOP PENDING STAGE */}
                    <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-200/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 truncate">
                                Top Pending Stage
                            </span>
                            <span className="text-[9px] font-extrabold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded shrink-0">
                                Stage {topPendingStage.stageNo}
                            </span>
                        </div>
                        <div className="mt-1">
                            <span className="text-base sm:text-lg font-black text-rose-950 truncate block" title={topPendingStage.stageName}>
                                {topPendingStage.stageName}
                            </span>
                            <span className="text-[10px] text-rose-700 block truncate mt-0.5">
                                {topPendingStage.count.toLocaleString()} orders waiting
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
