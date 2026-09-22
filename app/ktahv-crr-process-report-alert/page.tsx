"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCrrBookings, isBookingCancelled, DEFAULT_STAGE_USERS } from "@/hooks/use-crr-bookings";
import type { Stage, Guest } from "@/types/crr";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { AlertTriangle, BarChart3, TrendingUp, Award, PhoneCall, Briefcase, ClipboardCheck, Users, Calendar, CheckCircle2, Send, Download, Printer, Share2, Mail, FileSpreadsheet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const STAGES: Stage[] = [
    { no: 1, name: "Arrival Welcome on Pickup", resp: "GRE", trigger: "Before 2 Hours of Check-in", dateLabel: "Pickup Confirmed Time", remarkLabel: "Pickup / Welcome Remarks" },
    { no: 2, name: "Guest Request & Complaint Mgmt (QR Scan)", resp: "GRE", trigger: "During Stay (Check-in to Check-out)", dateLabel: "Request Logged Date", remarkLabel: "Request / Complaint Remarks" },
    { no: 3, name: "Next Visit Planning & Confirmation", resp: "Doctor", trigger: "After 1 Day of Check-out", dateLabel: "Next Visit Date", remarkLabel: "Remarks for Next Visit Date" },
    { no: 4, name: "Guest Feedback & Outcome Confirmation", resp: "GRE", trigger: "On Check-out Date", dateLabel: "Feedback Collected Date", remarkLabel: "Feedback / Outcome Remarks" },
    { no: 5, name: "Online Rating & Review Request", resp: "GRE", trigger: "On Check-out Date", dateLabel: "Review Request Date", remarkLabel: "Review Request Remarks" },
    { no: 6, name: "Safe Return Confirmation", resp: "GRE", trigger: "Departure + 3 Days", dateLabel: "Return Confirmed Date", remarkLabel: "Safe Return Remarks" },
    { no: 7, name: "Result Tracking & Health Progress Check", resp: "Doctor", trigger: "Departure + 20 Days", dateLabel: "Health Check Date", remarkLabel: "Progress / Health Remarks" },
    { no: 8, name: "Referral Collection & Lead Generation", resp: "GRE", trigger: "Departure + 30 Days", dateLabel: "Referral Collected Date", remarkLabel: "Referral Details / Remarks" },
    { no: 9, name: "Driver Assignment – Arrival Pickup", resp: "FO", trigger: "Before Arrival", dateLabel: "Pickup Date", remarkLabel: "Remarks For Driver" },
    { no: 10, name: "Driver Assignment – Departure Drop", resp: "FO", trigger: "Before Departure", dateLabel: "Drop Date", remarkLabel: "Remarks For Driver" },
    { no: 11, name: "Guest Requirement Verification", resp: "GM", trigger: "Before Check-in", dateLabel: "Verification Timestamp", remarkLabel: "Remarks" },
];

function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

export default function KtahvCrrProcessReportAlertPage() {
    const { user, hasPermission } = useAuth();

    const ADMIN_TIER_ROLES = ["super_admin", "admin"];
    const isAdminRole = !!user && (
        user.permissions?.includes("all") ||
        user.permissions?.includes("fms.admin") ||
        ADMIN_TIER_ROLES.includes(user.role)
    );

    // Dedicated crr_report_alert permission (view / viewSelf / viewAll / edit) —
    // admins always pass; anyone else needs one of these granted explicitly.
    const hasReportAlertAccess = isAdminRole || (
        hasPermission("crr_report_alert.view") ||
        hasPermission("crr_report_alert.viewSelf") ||
        hasPermission("crr_report_alert.viewAll") ||
        hasPermission("crr_report_alert.edit") ||
        hasPermission("crr_report_alert")
    );

    const { guests: rows, stageUsers, loading, error, isRevalidating } = useCrrBookings();

    const reportDateStr = new Date().toLocaleDateString("en-IN", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const responsiblePersonList = useMemo(() => {
        if (!stageUsers || stageUsers.length === 0) return DEFAULT_STAGE_USERS;
        const merged = [...stageUsers];
        for (const def of DEFAULT_STAGE_USERS) {
            const exists = merged.find((u) => u.email.toLowerCase() === def.email.toLowerCase());
            if (!exists) {
                merged.push(def);
            }
        }
        return merged.sort((a, b) => a.name.localeCompare(b.name));
    }, [stageUsers]);

    const activeRows = useMemo(() => rows.filter((g) => !isBookingCancelled(g) && !g.notCheckedInYet), [rows]);
    const completedRows = useMemo(() => activeRows.filter(g => STAGES.every(s => g.stageStatus[s.no - 1] === "Complete")), [activeRows]);
    const pendingRows = useMemo(() => activeRows.filter(g => !STAGES.every(s => g.stageStatus[s.no - 1] === "Complete")), [activeRows]);

    const pendingReport = useMemo(() => {
        const stagePendingCountArray = new Array(STAGES.length).fill(0);
        for (const g of activeRows) {
            for (let idx = 0; idx < STAGES.length; idx++) {
                if (g.stageStatus[idx] !== "Complete") {
                    stagePendingCountArray[idx]++;
                }
            }
        }

        const table = responsiblePersonList.map((su) => {
            const stageSet = new Set<number>(su.stages || []);
            const effectiveStages = Array.from(stageSet);

            const counts = STAGES.map((s, idx) => {
                const stageNo = idx + 1;
                if (!effectiveStages.includes(stageNo)) return 0;
                return stagePendingCountArray[idx];
            });
            return { emp: su.name || su.email, email: su.email, counts };
        });

        const totals = new Array(STAGES.length).fill(0);
        table.forEach((r) => {
            r.counts.forEach((c, idx) => { totals[idx] += c; });
        });

        const sortedTable = [...table].sort((a, b) => {
            const sumA = a.counts.reduce((acc, c) => acc + c, 0);
            const sumB = b.counts.reduce((acc, c) => acc + c, 0);
            return sumB - sumA;
        });

        return { table: sortedTable, totals };
    }, [activeRows, responsiblePersonList]);

    const dailyDoneReport = useMemo(() => {
        const today = new Date();
        const doneCounts = new Array(STAGES.length).fill(0);
        const userDoneCounts: Record<string, number[]> = {};

        responsiblePersonList.forEach(u => {
            userDoneCounts[u.email] = new Array(STAGES.length).fill(0);
        });

        for (const g of rows) {
            for (let idx = 0; idx < STAGES.length; idx++) {
                if (g.stages?.[idx]?.completed && g.stages[idx].actualDate) {
                    const actualD = new Date(g.stages[idx].actualDate as string);
                    if (!isNaN(actualD.getTime()) && isSameDay(today, actualD)) {
                        doneCounts[idx]++;
                        responsiblePersonList.forEach(u => {
                             if (u.stages?.includes(idx + 1)) {
                                 userDoneCounts[u.email][idx]++;
                             }
                        });
                    }
                }
            }
        }

        const table = responsiblePersonList.map(su => ({
            emp: su.name || su.email,
            email: su.email,
            counts: userDoneCounts[su.email]
        })).sort((a, b) => {
            const sumA = a.counts.reduce((acc, c) => acc + c, 0);
            const sumB = b.counts.reduce((acc, c) => acc + c, 0);
            return sumB - sumA;
        });

        return { table, totals: doneCounts };
    }, [rows, responsiblePersonList]);

    const chartData = useMemo(() => {
        const stagePending = pendingReport.totals;
        const maxStagePending = Math.max(1, ...stagePending);

        const roleStats: Record<string, { tasks: number; guests: number }> = {
            GRE: { tasks: 0, guests: 0 },
            Doctor: { tasks: 0, guests: 0 },
            FO: { tasks: 0, guests: 0 },
            GM: { tasks: 0, guests: 0 },
        };
        const guestsByRole: Record<string, Set<number>> = {
            GRE: new Set(), Doctor: new Set(), FO: new Set(), GM: new Set(),
        };

        for (const g of activeRows) {
            for (let idx = 0; idx < STAGES.length; idx++) {
                if (g.stageStatus[idx] !== "Complete") {
                    const role = STAGES[idx].resp;
                    if (roleStats[role]) {
                        roleStats[role].tasks++;
                        guestsByRole[role]?.add(g.id);
                    }
                }
            }
        }

        for (const role of Object.keys(roleStats)) {
            roleStats[role].guests = guestsByRole[role]?.size || 0;
        }

        const respCounts = {
            GRE: roleStats.GRE.tasks, Doctor: roleStats.Doctor.tasks, FO: roleStats.FO.tasks, GM: roleStats.GM.tasks,
        };
        const totalRoleWorkload = Object.values(respCounts).reduce((a, b) => a + b, 0);

        const totalActive = pendingRows.length;
        const totalComplete = completedRows.length;
        const totalAll = Math.max(1, totalActive + totalComplete);

        return {
            stagePending, maxStagePending, roleStats, totalRoleWorkload, totalActive, totalComplete, totalAll,
        };
    }, [activeRows, pendingRows.length, completedRows.length, pendingReport]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const rowsCSV = [];
        rowsCSV.push(["Daily CRR Report Alert", reportDateStr]);
        rowsCSV.push([]);

        // Pendings Table
        rowsCSV.push(["STAGE WISE PENDING REPORT"]);
        const pendingHeaders = ["Employee", ...STAGES.map(s => `Stage ${s.no} (${s.resp})`), "Total Pending"];
        rowsCSV.push(pendingHeaders);

        pendingReport.table.forEach(r => {
            rowsCSV.push([r.emp, ...r.counts, r.counts.reduce((a,b)=>a+b,0)]);
        });
        rowsCSV.push(["Grand Total", ...pendingReport.totals, pendingReport.totals.reduce((a,b)=>a+b,0)]);

        rowsCSV.push([]);

        // Completed Table
        rowsCSV.push(["DAILY COMPLETED TASKS (TODAY)"]);
        rowsCSV.push(pendingHeaders.map(h => h.replace("Pending", "Completed")));

        dailyDoneReport.table.forEach(r => {
            rowsCSV.push([r.emp, ...r.counts, r.counts.reduce((a,b)=>a+b,0)]);
        });
        rowsCSV.push(["Grand Total", ...dailyDoneReport.totals, dailyDoneReport.totals.reduce((a,b)=>a+b,0)]);

        const csvContent = "data:text/csv;charset=utf-8," + rowsCSV.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `KTAHV-CRR-Report-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Downloaded!");
    };

    const handleShareEmail = () => {
        const subject = `KTAHV CRR Process Report Alert - ${reportDateStr}`;
        const body = `Please review the CRR Process Report Alert for ${reportDateStr}.%0D%0A%0D%0AActive Guests: ${chartData.totalActive}%0D%0ATotal Completed Guests: ${chartData.totalComplete}%0D%0A%0D%0ALogin to the CRM to view the full detailed report.`;
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const handleShareWhatsapp = () => {
        const text = `*KTAHV CRR Process Report Alert - ${reportDateStr}*%0A%0AActive Guests: ${chartData.totalActive}%0ATotal Completed Guests: ${chartData.totalComplete}%0A%0ALogin to CRM to view full report.`;
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    if (!user) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="text-center space-y-4">
                        <Users className="mx-auto h-12 w-12 text-slate-300" />
                        <h2 className="text-xl font-semibold text-slate-700">Access Denied</h2>
                        <p className="text-sm text-slate-500">Please sign in to view the Daily CRR Alert Report.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasReportAlertAccess) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="text-center space-y-4">
                        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                        <h2 className="text-xl font-semibold text-slate-700">Restricted Access</h2>
                        <p className="text-sm text-slate-500">You don't have permission to view the KTAHV CRR Process Report Alert.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-[1400px] mx-auto min-h-screen">
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        body * { visibility: hidden; }
                        #crr-report-content, #crr-report-content * { visibility: visible; }
                        #crr-report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
                        .no-print { display: none !important; }
                        .print-break { page-break-before: always; }
                    }
                `}} />

                {/* HERO HEADER — same gradient as Sales & Marketing Report */}
                <header
                    className="no-print"
                    style={{
                        padding: '30px 32px',
                        background: 'linear-gradient(115deg, #14213d, #303f78)',
                        borderRadius: '20px',
                        color: 'white',
                        boxShadow: '0 14px 36px rgba(30,48,91,0.18)',
                    }}
                >
                    {/* Brand label */}
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, opacity: 0.55, marginBottom: 18, textTransform: 'uppercase' }}>
                        KAIRALI GROUP &nbsp;/&nbsp; CRR PROCESS MANAGEMENT
                    </div>

                    {/* Title row */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                                KTAHV CRR Process Report Alert
                            </h1>
                            <p className="mt-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                <Calendar className="w-4 h-4" />
                                {reportDateStr} &nbsp;<small style={{ opacity: 0.7 }}>IST</small>
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                                Daily report snapshot · Stage-wise pendings · Completed tasks for management
                            </p>
                        </div>

                        {/* Export & Share button */}
                        <div className="flex items-center gap-3 shrink-0">
                            {isRevalidating && (
                                <span className="text-xs font-semibold px-3 py-1.5 rounded-full border animate-pulse flex items-center gap-2"
                                    style={{ background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)' }}>
                                    <span className="w-2 h-2 rounded-full bg-white" /> Updating...
                                </span>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="font-semibold border"
                                        style={{ background: 'rgba(255,255,255,0.13)', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                                    >
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Export &amp; Share
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                                        <Printer className="mr-2 h-4 w-4" />
                                        <span>Print / Save as PDF</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer">
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        <span>Export Tables to CSV</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer">
                                        <Mail className="mr-2 h-4 w-4" />
                                        <span>Share via Email</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareWhatsapp} className="cursor-pointer">
                                        <Send className="mr-2 h-4 w-4" />
                                        <span>Share via WhatsApp</span>
                                    </DropdownMenuItem>
                                    {isAdminRole && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href={`/settings/automation/email-triggers?report=ktahv-crr-process-report-alert&scope=KTAHV&date=${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}`}
                                                    className="cursor-pointer flex items-center w-full"
                                                >
                                                    <Clock className="mr-2 h-4 w-4 text-indigo-600" />
                                                    <span>Auto Trigger Email</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Stat bar */}
                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'ACTIVE GUESTS', value: loading ? '—' : chartData.totalActive, color: '#dbe7ff' },
                            { label: 'COMPLETED JOURNEYS', value: loading ? '—' : chartData.totalComplete, color: '#86efac' },
                            { label: 'TOTAL PENDING TASKS', value: loading ? '—' : pendingReport.totals.reduce((a,b)=>a+b,0), color: '#f6d99f' },
                            { label: 'DONE TODAY', value: loading ? '—' : dailyDoneReport.totals.reduce((a,b)=>a+b,0), color: '#ffc9cf' },
                        ].map(stat => (
                            <div key={stat.label}>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, opacity: 0.55, textTransform: 'uppercase', marginBottom: 4 }}>
                                    {stat.label}
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="px-4 sm:px-6 md:px-8">

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 no-print">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {loading && rows.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-medium">Generating Report Snapshot...</p>
                        </div>
                    </div>
                ) : (
                    <div id="crr-report-content" className="space-y-8">
                        {/* HEADER FOR PRINTING ONLY */}
                        <div className="hidden print:block text-center mb-8">
                            <h2 className="text-2xl font-bold">KTAHV CRR Process Report Alert</h2>
                            <p className="text-gray-500">{reportDateStr}</p>
                            <hr className="mt-4 border-gray-300" />
                        </div>

                        {/* CHART VIEW */}
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-slate-50 border-b border-slate-100">
                                <BarChart3 className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-slate-800">Process Overview</h3>
                            </div>
                            <div className="px-4 sm:px-6 py-6 bg-white">
                                <div className="space-y-8">
                                    {/* Journey Status */}
                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                        {/* Donut */}
                                        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-5 p-6 rounded-xl bg-slate-50 border border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide w-full text-center mb-2">Total Journeys</h4>
                                            <div className="relative w-40 h-40 shrink-0">
                                                <div
                                                    className="w-40 h-40 rounded-full shadow-inner"
                                                    style={{
                                                        background: `conic-gradient(#f59e0b 0% ${(chartData.totalActive / chartData.totalAll) * 100}%, #10b981 ${(chartData.totalActive / chartData.totalAll) * 100}% 100%)`,
                                                    }}
                                                />
                                                <div className="absolute inset-[14px] rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-extrabold text-slate-900 leading-none">{chartData.totalActive + chartData.totalComplete}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-1">Guests</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-6 w-full justify-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Active
                                                    </div>
                                                    <span className="text-lg font-bold text-slate-900">{chartData.totalActive}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                                                    </div>
                                                    <span className="text-lg font-bold text-slate-900">{chartData.totalComplete}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Role breakdown */}
                                        <div className="lg:col-span-3 flex flex-col justify-center gap-5 p-6 rounded-xl bg-white border border-slate-100 shadow-sm">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Workload by Role</h4>
                                            {(
                                                [
                                                    { key: "GRE", label: "Guest Relations Executive", icon: PhoneCall, color: "bg-sky-500" },
                                                    { key: "Doctor", label: "Doctor", icon: Award, color: "bg-teal-500" },
                                                    { key: "FO", label: "Front Office", icon: Briefcase, color: "bg-purple-500" },
                                                    { key: "GM", label: "General Manager", icon: ClipboardCheck, color: "bg-amber-500" },
                                                ] as const
                                            ).map((r) => {
                                                const stats = chartData.roleStats[r.key] ?? { tasks: 0, guests: 0 };
                                                const totalWorkload = chartData.totalRoleWorkload || 1;
                                                const pct = (stats.tasks / totalWorkload) * 100;
                                                const Icon = r.icon;
                                                return (
                                                    <div key={r.key} className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${r.color} shadow-sm`}>
                                                            <Icon className="w-4.5 h-4.5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                                                <span className="text-sm font-bold text-slate-700 truncate">{r.label}</span>
                                                                <span className="text-sm font-extrabold text-slate-900 shrink-0">
                                                                    {stats.guests.toLocaleString()} <span className="text-xs font-medium text-slate-500">guests</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${r.color} transition-all`}
                                                                        style={{ width: `${stats.tasks === 0 ? 0 : Math.max(pct, 2)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-semibold text-slate-500 w-16 text-right">{stats.tasks} tasks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pending Actions by Stage */}
                                    <div className="mt-8">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Pending Actions by Stage</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                            {STAGES.map((s, idx) => {
                                                const value = chartData.stagePending[idx] ?? 0;
                                                const pct = (value / chartData.maxStagePending) * 100;
                                                return (
                                                    <div key={s.no} className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-slate-50 border border-slate-100">
                                                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                                                            {s.no}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <span className="text-xs font-bold text-slate-800 truncate">{s.name}</span>
                                                                <span className="text-xs font-extrabold text-slate-900">{value}</span>
                                                            </div>
                                                            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                                                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${value === 0 ? 0 : Math.max(pct, 3)}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="print-break" />

                        {/* STAGE WISE PENDING REPORT TABLE */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center gap-3">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <CardTitle className="text-lg text-slate-800">Stage Wise Pending Report</CardTitle>
                                    <CardDescription className="text-slate-500">Detailed break-up of pending tasks per employee</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full min-w-[1200px] text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/50 border-b border-slate-200">
                                            <th className="px-4 py-3 font-bold text-slate-700 w-48 shrink-0 bg-slate-100/50 sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]">Employee / Stage</th>
                                            {STAGES.map(s => (
                                                <th key={s.no} className="px-2 py-3 font-medium text-[11px] text-slate-600 text-center leading-tight max-w-[80px]">
                                                    <div className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-600 flex items-center justify-center mx-auto mb-1 text-[10px] font-bold">{s.no}</div>
                                                    <span className="line-clamp-2" title={s.name}>{s.name}</span>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 font-extrabold text-slate-900 bg-indigo-50/50 text-center border-l border-slate-200">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingReport.table.map(row => {
                                            const total = row.counts.reduce((a, b) => a + b, 0);
                                            return (
                                                <tr key={row.email} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-800 bg-white sticky left-0 shadow-[1px_0_0_0_#f1f5f9] z-10 truncate" title={row.emp}>
                                                        {row.emp}
                                                    </td>
                                                    {row.counts.map((c, i) => (
                                                        <td key={i} className="px-2 py-3 text-center">
                                                            {c > 0 ? (
                                                                <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 h-6 rounded bg-amber-100 text-amber-800 font-bold text-xs">{c}</span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-center bg-indigo-50/30 border-l border-slate-100">
                                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-indigo-100 text-indigo-800 font-bold text-xs">
                                                            {total}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-300">
                                            <td className="px-4 py-4 bg-slate-50 sticky left-0 shadow-[1px_0_0_0_#cbd5e1] z-10">
                                                Grand Total
                                            </td>
                                            {pendingReport.totals.map((total, idx) => (
                                                <td key={idx} className="px-2 py-4 text-center">
                                                    {total > 0 ? (
                                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 h-7 rounded-md bg-slate-800 text-white font-bold">{total}</span>
                                                    ) : (
                                                        <span className="text-slate-400 font-medium">0</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-4 py-4 text-center bg-indigo-100/60 border-l border-slate-300">
                                                <span className="inline-flex items-center justify-center min-w-[3rem] px-3 h-8 rounded-lg bg-indigo-600 text-white font-extrabold text-sm shadow-sm">
                                                    {pendingReport.totals.reduce((a, b) => a + b, 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* DAILY COMPLETED REPORT TABLE */}
                        <Card className="border-slate-200 shadow-sm overflow-hidden">
                            <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4 flex flex-row items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <CardTitle className="text-lg text-slate-800">Daily Completed Tasks</CardTitle>
                                    <CardDescription className="text-emerald-700/80">Tasks successfully completed by employees today</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full min-w-[1200px] text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-emerald-50/50 border-b border-emerald-100">
                                            <th className="px-4 py-3 font-bold text-emerald-900 w-48 shrink-0 bg-emerald-50/50 sticky left-0 z-10 shadow-[1px_0_0_0_#d1fae5]">Employee / Stage</th>
                                            {STAGES.map(s => (
                                                <th key={s.no} className="px-2 py-3 font-medium text-[11px] text-emerald-800 text-center leading-tight max-w-[80px]">
                                                    <div className="w-5 h-5 rounded-full bg-white border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-1 text-[10px] font-bold">{s.no}</div>
                                                    <span className="line-clamp-2" title={s.name}>{s.name}</span>
                                                </th>
                                            ))}
                                            <th className="px-4 py-3 font-extrabold text-emerald-900 bg-emerald-100/40 text-center border-l border-emerald-200">Total Done</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-50">
                                        {dailyDoneReport.table.map(row => {
                                            const total = row.counts.reduce((a, b) => a + b, 0);
                                            return (
                                                <tr key={row.email} className="hover:bg-emerald-50/30 transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-slate-800 bg-white sticky left-0 shadow-[1px_0_0_0_#f1f5f9] z-10 truncate" title={row.emp}>
                                                        {row.emp}
                                                    </td>
                                                    {row.counts.map((c, i) => (
                                                        <td key={i} className="px-2 py-3 text-center">
                                                            {c > 0 ? (
                                                                <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 h-6 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">{c}</span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-center bg-emerald-50/30 border-l border-emerald-100">
                                                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                                                            {total}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-emerald-50/80 font-bold text-emerald-900 border-t border-emerald-200">
                                            <td className="px-4 py-4 bg-emerald-50/80 sticky left-0 shadow-[1px_0_0_0_#a7f3d0] z-10">
                                                Grand Total
                                            </td>
                                            {dailyDoneReport.totals.map((total, idx) => (
                                                <td key={idx} className="px-2 py-4 text-center">
                                                    {total > 0 ? (
                                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 h-7 rounded-md bg-emerald-600 text-white font-bold">{total}</span>
                                                    ) : (
                                                        <span className="text-emerald-700/50 font-medium">0</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-4 py-4 text-center bg-emerald-100 border-l border-emerald-300">
                                                <span className="inline-flex items-center justify-center min-w-[3rem] px-3 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-sm shadow-sm">
                                                    {dailyDoneReport.totals.reduce((a, b) => a + b, 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            </div>
        </DashboardLayout>
    );
}
