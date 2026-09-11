"use client"

import React, { useMemo } from 'react';
import { FileText } from 'lucide-react';

/* ─────────────────────────────────────────────
   STAGE DEFINITIONS
───────────────────────────────────────────── */
export const NEW_ORDER_STAGES = [
    { no: 1, index: 0, name: 'Order Verify Status', short: 'Order Verify', defaultDoer: 'Order Verify Team' },
    { no: 2, index: 1, name: 'Inventory Verify Status', short: 'Inventory Verify', defaultDoer: 'Sakthivel S' },
    { no: 3, index: 2, name: 'Payment Verify Status', short: 'Payment Verify', defaultDoer: 'Manonmani' },
    { no: 4, index: 3, name: 'Order Packing Status', short: 'Order Packing', defaultDoer: 'Shakti' },
    { no: 5, index: 4, name: 'QC Verify Status', short: 'QC Verify', defaultDoer: 'Sathish & Balavignesh S' },
    { no: 6, index: 5, name: 'Address ReVerify Status', short: 'Address ReVerify', defaultDoer: 'Address Verify Team' },
    { no: 7, index: 6, name: 'Dispatch Status', short: 'Dispatch', defaultDoer: 'Sakthivel & Dinesh Kumar' },
    { no: 8, index: 7, name: 'Tracking Update Status', short: 'Tracking Update', defaultDoer: 'Thangarasu' },
    { no: 9, index: 8, name: 'Stock Deduction Status', short: 'Stock Deduction', defaultDoer: 'Sakthivel & Dinesh Kumar' },
];

export const DEFAULT_ORDER_STAGE_USERS = [
    'Sakthivel S',
    'Manonmani',
    'Shakti',
    'Sathish & Balavignesh S',
    'Address Verify Team',
    'Sakthivel & Dinesh Kumar',
    'Thangarasu',
];

export interface StagePendingRow {
    emp: string;
    counts: number[];
    total: number;
}

interface OrderStageWisePendingsReportProps {
    orders: any[];
    isStageCompletedFn: (stageIdx: number, order: any) => boolean;
    getOrderStageDoerFn: (order: any, stageIdx: number) => string;
    currentUser?: any;
    selectedDoer?: string | null;
    onSelectDoer?: (doer: string | null) => void;
    selectedStage?: number | null;
    onSelectStage?: (stageNo: number | null) => void;
}

export function OrderStageWisePendingsReport({
    orders,
    isStageCompletedFn,
    getOrderStageDoerFn,
    currentUser,
    selectedDoer,
    onSelectDoer,
    selectedStage,
    onSelectStage,
}: OrderStageWisePendingsReportProps) {
    // Calculate stage-wise pending counts grouped by employee
    const pendingReport = useMemo(() => {
        // Exclude cancelled and on-hold orders from actionable pending counts
        const actionableOrders = orders.filter((o) => {
            const rawStatus = (o.status || o.orderStatus || o.stages?.[0]?.status || '').toLowerCase().trim();
            if (rawStatus.includes('cancel') || rawStatus === 'edit order') return false;
            if (rawStatus === 'hold') return false;
            return true;
        });

        // Stage tally array
        const stageTotals: number[] = new Array(NEW_ORDER_STAGES.length).fill(0);

        // Map normalized-key -> { displayName, counts }
        // Key is lowercase+trim for case-insensitive deduplication (arul === ARUL)
        const employeeDataMap = new Map<string, { displayName: string; counts: number[] }>();

        // Helper: normalize a name to a lookup key
        const normalizeKey = (name: string) => name.toLowerCase().trim();

        // Helper: title-case a name for display
        const toTitleCase = (name: string) =>
            name.trim().replace(/\b\w/g, (c) => c.toUpperCase());

        // Ensure default stage assignees exist in the report
        DEFAULT_ORDER_STAGE_USERS.forEach((user) => {
            const key = normalizeKey(user);
            if (!employeeDataMap.has(key)) {
                employeeDataMap.set(key, { displayName: user, counts: new Array(NEW_ORDER_STAGES.length).fill(0) });
            }
        });

        // Loop through actionable orders
        for (const order of actionableOrders) {
            // Find active uncompleted stage index (0 to 8)
            let activeIdx = 9;
            for (let i = 0; i <= 8; i++) {
                if (!isStageCompletedFn(i, order)) {
                    activeIdx = i;
                    break;
                }
            }

            // If an uncompleted active stage is found
            if (activeIdx < 9) {
                const rawDoer = (getOrderStageDoerFn(order, activeIdx) || 'Unassigned').trim();
                const key = normalizeKey(rawDoer);

                if (!employeeDataMap.has(key)) {
                    employeeDataMap.set(key, {
                        displayName: toTitleCase(rawDoer),
                        counts: new Array(NEW_ORDER_STAGES.length).fill(0),
                    });
                }

                const entry = employeeDataMap.get(key)!;


                entry.counts[activeIdx]++;
                stageTotals[activeIdx]++;
            }
        }

        // Convert map to array of rows
        const rows: StagePendingRow[] = [];
        const defaultKeysSet = new Set(DEFAULT_ORDER_STAGE_USERS.map((u) => u.toLowerCase().trim()));
        employeeDataMap.forEach((data, key) => {
            const total = data.counts.reduce((acc, c) => acc + c, 0);
            // Include user if they have pending tasks OR are a primary default stage assignee
            if (total > 0 || defaultKeysSet.has(key)) {
                rows.push({ emp: data.displayName, counts: data.counts, total });
            }
        });


        // Role-based scoping (if viewSelf permission is active)
        const currentUserName = (currentUser?.name ?? '').toLowerCase().trim();
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || !currentUser?.permissions?.includes('new-order-fms.viewSelf');

        const scopedRows: StagePendingRow[] = isAdmin
            ? rows
            : rows.filter((r) => {
                const empLower = r.emp.toLowerCase();
                return empLower === currentUserName || empLower.includes(currentUserName);
            });

        // Sort descending: employee with most pending tasks appears first
        scopedRows.sort((a, b) => b.total - a.total);

        // Compute Grand Total from displayed scoped rows
        const totals: number[] = new Array(NEW_ORDER_STAGES.length).fill(0);
        scopedRows.forEach((r) => {
            r.counts.forEach((c: number, idx: number) => {
                totals[idx] += c;
            });
        });

        return { rows: scopedRows, totals };
    }, [orders, isStageCompletedFn, getOrderStageDoerFn, currentUser]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-md my-6 overflow-hidden">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                            Stage Wise Pendings Report
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Responsible-person-wise actionable pending count, per stage
                        </p>
                    </div>
                </div>

                {(selectedDoer || selectedStage !== null) && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">
                            Filtered by: <span className="font-bold text-blue-700">{selectedDoer || ("Stage " + selectedStage)}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                onSelectDoer?.(null);
                                onSelectStage?.(null);
                            }}
                            className="px-2 py-1 text-[11px] font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Content Table */}
            <div className="overflow-x-auto w-full">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="sticky top-0 z-10 border-b-2 border-slate-400 shadow" style={{ backgroundColor: '#1e3a5f' }}>
                        <tr className="border-b-2 border-slate-400">
                            <th
                                className="px-4 py-3.5 text-left text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap"
                                style={{ backgroundColor: '#1e3a5f' }}
                            >
                                EMPLOYEE NAME
                            </th>
                            {NEW_ORDER_STAGES.map((s) => (
                                <th
                                    key={s.no}
                                    onClick={() => onSelectStage?.(selectedStage === s.no ? null : s.no)}
                                    className={"px-3 py-3 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 align-top cursor-pointer transition-colors hover:bg-white/10 " +
                                        (selectedStage === s.no ? "bg-blue-800/80 ring-2 ring-inset ring-amber-400" : "")
                                    }
                                    style={{ backgroundColor: selectedStage === s.no ? undefined : '#1e3a5f' }}
                                    title={"Click to filter orders for Stage " + s.no + ": " + s.short}
                                >
                                    <span className="block">STAGE {s.no}</span>
                                    <span className="block font-semibold normal-case text-white text-[10px] tracking-normal mt-0.5 whitespace-normal max-w-[130px] mx-auto leading-tight opacity-95">
                                        {s.short}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pendingReport.rows.length === 0 ? (
                            <tr>
                                <td colSpan={NEW_ORDER_STAGES.length + 1} className="py-8 text-center text-slate-500 font-medium">
                                    No actionable pending orders in the selected period.
                                </td>
                            </tr>
                        ) : (
                            pendingReport.rows.map((row) => {
                                const isSelected = selectedDoer === row.emp;
                                return (
                                    <tr
                                        key={row.emp}
                                        onClick={() => onSelectDoer?.(isSelected ? null : row.emp)}
                                        className={"border-b border-slate-200 cursor-pointer transition-colors " +
                                            (isSelected ? "bg-blue-50 font-semibold" : "hover:bg-slate-50/80")
                                        }
                                    >
                                        <td className="px-4 py-3 text-left font-bold text-slate-800 border-r border-slate-200 text-xs whitespace-nowrap">
                                            <span>{row.emp}</span>
                                        </td>
                                        {row.counts.map((c: number, idx: number) => (
                                            <td
                                                key={idx}
                                                className={"px-3 py-3 text-center border-r border-slate-200 last:border-r-0 text-xs font-extrabold " +
                                                    (c > 0 ? "text-red-600 bg-red-50/25" : "text-slate-400 font-medium")
                                                }
                                            >
                                                {c}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    <tfoot className="font-bold text-xs" style={{ backgroundColor: '#1e3a5f' }}>
                        <tr className="text-white">
                            <td className="py-3.5 px-4 font-bold border-r border-slate-600 text-left whitespace-nowrap">
                                Grand Total
                            </td>
                            {pendingReport.totals.map((t, idx) => (
                                <td key={idx} className="text-center py-3.5 px-3 border-r border-slate-600 last:border-r-0 font-extrabold">
                                    {t}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
