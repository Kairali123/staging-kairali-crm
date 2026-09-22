"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCrrBookings, isBookingCancelled, DEFAULT_STAGE_USERS } from "@/hooks/use-crr-bookings";
import type { Stage, Guest } from "@/types/crr";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BarChart3, TrendingUp, Award, PhoneCall, Briefcase, ClipboardCheck, Users, Calendar, CheckCircle2, Send, Download, Printer, Share2, Mail, FileSpreadsheet } from "lucide-react";
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
    { no: 8, name: "Referral Collection & Lead Generation", resp: "FO", trigger: "Departure + 30 Days", dateLabel: "Referral Collected Date", remarkLabel: "Referral Details / Remarks" },
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
    const { user } = useAuth();
    
    const ADMIN_TIER_ROLES = ["super_admin", "admin"];
    const isAdminRole = !!user && (
        user.permissions?.includes("all") ||
        user.permissions?.includes("fms.admin") ||
        ADMIN_TIER_ROLES.includes(user.role)
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

    if (!isAdminRole) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <div className="text-center space-y-4">
                        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                        <h2 className="text-xl font-semibold text-slate-700">Restricted Access</h2>
                        <p className="text-sm text-slate-500">Only Admins and Management can view the Daily CRR Alert Report.</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-[1550px] mx-auto min-h-screen pb-12">
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        body * { visibility: hidden; }
                        #crr-report-content, #crr-report-content * { visibility: visible; }
                        #crr-report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
                        .no-print { display: none !important; }
                        .print-break { page-break-before: always; }
                    }
                `}} />

                {/* HERO HEADER — matched with CRR FMS & Sales/Marketing headers */}
                <header
                    className="no-print relative overflow-hidden"
                    style={{
                        padding: '32px 36px',
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e1b4b 100%)',
                        borderRadius: '24px',
                        color: 'white',
                        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
                    }}
                >
                    {/* Background accent glow */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Brand label */}
                    <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-indigo-300/80 mb-3 text-transform: uppercase">
                        <span>KAIRALI GROUP</span>
                        <span>/</span>
                        <span>KTAHV CRR PROCESS MANAGEMENT</span>
                    </div>

                    {/* Title row */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight flex items-center gap-3">
                                <span>KTAHV CRR Process Report Alert</span>
                                <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-semibold tracking-normal">
                                    Management View
                                </span>
                            </h1>
                            <p className="mt-2.5 flex items-center gap-2 text-sm font-medium text-slate-300/90">
                                <Calendar className="w-4 h-4 text-indigo-400" />
                                {reportDateStr} &nbsp;<span className="text-xs text-slate-400 font-normal">IST</span>
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Real-time CRR process alert snapshot · Stage-wise pendings breakdown · Daily completions audit
                            </p>
                        </div>

                        {/* Export & Share button */}
                        <div className="flex items-center gap-3 shrink-0">
                            {isRevalidating && (
                                <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 animate-pulse flex items-center gap-2 backdrop-blur-sm">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400" /> Refreshing live data...
                                </span>
                            )}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        className="font-bold border shadow-lg hover:shadow-indigo-500/10 transition-all duration-200"
                                        style={{ background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.25)', color: 'white' }}
                                    >
                                        <Share2 className="w-4 h-4 mr-2 text-indigo-300" />
                                        Export &amp; Share
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-xl border-slate-200">
                                    <DropdownMenuItem onClick={handlePrint} className="cursor-pointer py-2.5 font-medium text-slate-700">
                                        <Printer className="mr-2.5 h-4 w-4 text-slate-500" />
                                        <span>Print / Save as PDF</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer py-2.5 font-medium text-slate-700">
                                        <FileSpreadsheet className="mr-2.5 h-4 w-4 text-emerald-600" />
                                        <span>Export Tables to CSV</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="my-1" />
                                    <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer py-2.5 font-medium text-slate-700">
                                        <Mail className="mr-2.5 h-4 w-4 text-blue-600" />
                                        <span>Share via Email</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareWhatsapp} className="cursor-pointer py-2.5 font-medium text-slate-700">
                                        <Send className="mr-2.5 h-4 w-4 text-emerald-500" />
                                        <span>Share via WhatsApp</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* KPI Stat Cards */}
                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'ACTIVE GUESTS', value: loading ? '—' : chartData.totalActive, color: '#e0e7ff', bg: 'rgba(224, 231, 255, 0.07)' },
                            { label: 'COMPLETED JOURNEYS', value: loading ? '—' : chartData.totalComplete, color: '#86efac', bg: 'rgba(134, 239, 172, 0.07)' },
                            { label: 'TOTAL PENDING TASKS', value: loading ? '—' : pendingReport.totals.reduce((a,b)=>a+b,0), color: '#fde047', bg: 'rgba(253, 224, 71, 0.07)' },
                            { label: 'DONE TODAY', value: loading ? '—' : dailyDoneReport.totals.reduce((a,b)=>a+b,0), color: '#f472b6', bg: 'rgba(244, 114, 182, 0.07)' },
                        ].map(stat => (
                            <div key={stat.label} className="p-4 rounded-xl border border-white/10 backdrop-blur-md transition-transform hover:-translate-y-0.5 duration-200" style={{ background: stat.bg }}>
                                <div className="text-[10px] font-extrabold tracking-wider opacity-70 text-white uppercase mb-1">
                                    {stat.label}
                                </div>
                                <div className="text-3xl font-black" style={{ color: stat.color, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                                    {stat.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </header>

                <div className="px-2 sm:px-4">

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm no-print mb-6">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                )}

                {loading && rows.length === 0 ? (
                    <div className="flex items-center justify-center h-80 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                            <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm font-semibold text-slate-600">Generating Process Report Snapshot...</p>
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
                        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all duration-200">
                            <div className="flex items-center gap-3 px-6 py-4.5 bg-slate-50/80 border-b border-slate-200/80">
                                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Process Overview &amp; Distribution</h3>
                                    <p className="text-xs text-slate-500 font-medium">Visual metrics breakdown across guest journeys, team roles &amp; pending stages</p>
                                </div>
                            </div>
                            <div className="p-6 sm:p-8 bg-white">
                                <div className="space-y-8">
                                    {/* Journey Status */}
                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                        {/* Donut Chart */}
                                        <div className="lg:col-span-2 flex flex-col items-center justify-center gap-5 p-7 rounded-2xl bg-gradient-to-b from-slate-50/80 to-slate-100/50 border border-slate-200/60 shadow-sm">
                                            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest w-full text-center">Total Guest Journeys</h4>
                                            <div className="relative w-44 h-44 shrink-0 my-1">
                                                <div
                                                    className="w-44 h-44 rounded-full shadow-md"
                                                    style={{
                                                        background: `conic-gradient(#f59e0b 0% ${(chartData.totalActive / chartData.totalAll) * 100}%, #10b981 ${(chartData.totalActive / chartData.totalAll) * 100}% 100%)`,
                                                    }}
                                                />
                                                <div className="absolute inset-[16px] rounded-full bg-white shadow-lg flex flex-col items-center justify-center">
                                                    <span className="text-3xl font-black text-slate-900 leading-none">{chartData.totalActive + chartData.totalComplete}</span>
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Guests</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-8 w-full justify-center pt-2 border-t border-slate-200/60">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-0.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Active
                                                    </div>
                                                    <span className="text-xl font-extrabold text-slate-900">{chartData.totalActive}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-0.5">
                                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Completed
                                                    </div>
                                                    <span className="text-xl font-extrabold text-slate-900">{chartData.totalComplete}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Role Breakdown */}
                                        <div className="lg:col-span-3 flex flex-col justify-center gap-5 p-7 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
                                            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">Workload Distribution by Role</h4>
                                            {(
                                                [
                                                    { key: "GRE", label: "Guest Relations Executive (GRE)", icon: PhoneCall, color: "bg-sky-500", text: "text-sky-600", bg: "bg-sky-50" },
                                                    { key: "Doctor", label: "Doctor / Vaidya", icon: Award, color: "bg-teal-500", text: "text-teal-600", bg: "bg-teal-50" },
                                                    { key: "FO", label: "Front Office (FO)", icon: Briefcase, color: "bg-purple-500", text: "text-purple-600", bg: "bg-purple-50" },
                                                    { key: "GM", label: "General Manager (GM)", icon: ClipboardCheck, color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50" },
                                                ] as const
                                            ).map((r) => {
                                                const stats = chartData.roleStats[r.key] ?? { tasks: 0, guests: 0 };
                                                const totalWorkload = chartData.totalRoleWorkload || 1;
                                                const pct = (stats.tasks / totalWorkload) * 100;
                                                const Icon = r.icon;
                                                return (
                                                    <div key={r.key} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 ${r.color} shadow-md`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1.5 gap-2">
                                                                <span className="text-sm font-bold text-slate-800 truncate">{r.label}</span>
                                                                <span className="text-sm font-extrabold text-slate-900 shrink-0">
                                                                    {stats.guests.toLocaleString()} <span className="text-xs font-semibold text-slate-400">guests</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${r.color} transition-all duration-500`}
                                                                        style={{ width: `${stats.tasks === 0 ? 0 : Math.max(pct, 3)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-600 w-20 text-right">{stats.tasks} tasks</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Pending Actions by Stage */}
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4">Pending Actions by Stage (Stages 1 – 11)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
                                            {STAGES.map((s, idx) => {
                                                const value = chartData.stagePending[idx] ?? 0;
                                                const pct = (value / chartData.maxStagePending) * 100;
                                                return (
                                                    <div key={s.no} className="flex items-center gap-3.5 rounded-xl px-4 py-3 bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/60 transition-colors">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-800 text-white text-[11px] font-black flex items-center justify-center shrink-0 shadow-sm">
                                                            {s.no}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={s.name}>{s.name}</span>
                                                                <span className="text-xs font-black text-slate-900 ml-2">{value}</span>
                                                            </div>
                                                            <div className="h-2 rounded-full bg-slate-200/80 overflow-hidden">
                                                                <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${value === 0 ? 0 : Math.max(pct, 3)}%` }} />
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
                        <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="bg-slate-50/90 border-b border-slate-200/80 px-6 py-4.5 flex flex-row items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg text-slate-900">Stage Wise Pending Report</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">Detailed breakdown of pending tasks assigned per employee</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full min-w-[1250px] text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/70 border-b border-slate-200">
                                            <th className="px-5 py-3.5 font-extrabold text-slate-700 w-52 shrink-0 bg-slate-100/90 sticky left-0 z-10 shadow-[1px_0_0_0_#cbd5e1]">Employee Name</th>
                                            {STAGES.map(s => (
                                                <th key={s.no} className="px-2 py-3 font-semibold text-[11px] text-slate-600 text-center leading-tight max-w-[85px]">
                                                    <div className="w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-700 flex items-center justify-center mx-auto mb-1 text-[10px] font-black shadow-2xs">{s.no}</div>
                                                    <span className="line-clamp-2" title={s.name}>{s.name}</span>
                                                </th>
                                            ))}
                                            <th className="px-5 py-3.5 font-black text-slate-900 bg-indigo-50/70 text-center border-l border-slate-200">Total Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {pendingReport.table
                                            .filter(row => row.counts.reduce((a, b) => a + b, 0) > 0)
                                            .map(row => {
                                            const total = row.counts.reduce((a, b) => a + b, 0);
                                            return (
                                                <tr key={row.email} className="hover:bg-amber-50/30 transition-colors">
                                                    <td className="px-5 py-3.5 font-bold text-slate-800 bg-white sticky left-0 shadow-[1px_0_0_0_#f1f5f9] z-10 truncate" title={row.emp}>
                                                        {row.emp}
                                                    </td>
                                                    {row.counts.map((c, i) => (
                                                        <td key={i} className="px-2 py-3.5 text-center">
                                                            {c > 0 ? (
                                                                <span className="inline-flex items-center justify-center min-w-[1.85rem] px-2 h-6.5 rounded-md bg-amber-100/80 text-amber-900 font-extrabold text-xs shadow-2xs">{c}</span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-5 py-3.5 text-center bg-indigo-50/40 border-l border-slate-100">
                                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-indigo-100 text-indigo-900 font-extrabold text-xs shadow-2xs">
                                                            {total}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-300">
                                            <td className="px-5 py-4 bg-slate-100/90 sticky left-0 shadow-[1px_0_0_0_#94a3b8] z-10 uppercase text-xs tracking-wider">
                                                Grand Total
                                            </td>
                                            {pendingReport.totals.map((total, idx) => (
                                                <td key={idx} className="px-2 py-4 text-center">
                                                    {total > 0 ? (
                                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 h-7 rounded-md bg-slate-900 text-white font-extrabold text-xs shadow-sm">{total}</span>
                                                    ) : (
                                                        <span className="text-slate-400 font-semibold">0</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-5 py-4 text-center bg-indigo-100/80 border-l border-slate-300">
                                                <span className="inline-flex items-center justify-center min-w-[3.25rem] px-3.5 h-8.5 rounded-lg bg-indigo-600 text-white font-black text-sm shadow-md">
                                                    {pendingReport.totals.reduce((a, b) => a + b, 0)}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* DAILY COMPLETED REPORT TABLE */}
                        <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-2xl">
                            <CardHeader className="bg-emerald-50/90 border-b border-emerald-100 px-6 py-4.5 flex flex-row items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg text-emerald-950">Daily Completed Tasks</CardTitle>
                                    <CardDescription className="text-emerald-700/90 font-medium">Tasks successfully executed and completed by team members today</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full min-w-[1250px] text-left text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-emerald-50/60 border-b border-emerald-100">
                                            <th className="px-5 py-3.5 font-extrabold text-emerald-950 w-52 shrink-0 bg-emerald-50/90 sticky left-0 z-10 shadow-[1px_0_0_0_#a7f3d0]">Employee Name</th>
                                            {STAGES.map(s => (
                                                <th key={s.no} className="px-2 py-3 font-semibold text-[11px] text-emerald-900 text-center leading-tight max-w-[85px]">
                                                    <div className="w-5 h-5 rounded-full bg-white border border-emerald-300 text-emerald-800 flex items-center justify-center mx-auto mb-1 text-[10px] font-black shadow-2xs">{s.no}</div>
                                                    <span className="line-clamp-2" title={s.name}>{s.name}</span>
                                                </th>
                                            ))}
                                            <th className="px-5 py-3.5 font-black text-emerald-950 bg-emerald-100/60 text-center border-l border-emerald-200">Total Done</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-50">
                                        {dailyDoneReport.table
                                            .filter(row => row.counts.reduce((a, b) => a + b, 0) > 0)
                                            .map(row => {
                                            const total = row.counts.reduce((a, b) => a + b, 0);
                                            return (
                                                <tr key={row.email} className="hover:bg-emerald-50/40 transition-colors">
                                                    <td className="px-5 py-3.5 font-bold text-slate-800 bg-white sticky left-0 shadow-[1px_0_0_0_#f1f5f9] z-10 truncate" title={row.emp}>
                                                        {row.emp}
                                                    </td>
                                                    {row.counts.map((c, i) => (
                                                        <td key={i} className="px-2 py-3.5 text-center">
                                                            {c > 0 ? (
                                                                <span className="inline-flex items-center justify-center min-w-[1.85rem] px-2 h-6.5 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-xs shadow-2xs">{c}</span>
                                                            ) : (
                                                                <span className="text-slate-300 font-medium">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="px-5 py-3.5 text-center bg-emerald-50/40 border-l border-emerald-100">
                                                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 font-extrabold text-xs shadow-2xs">
                                                            {total}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-emerald-50/90 font-extrabold text-emerald-950 border-t-2 border-emerald-300">
                                            <td className="px-5 py-4 bg-emerald-50/90 sticky left-0 shadow-[1px_0_0_0_#6ee7b7] z-10 uppercase text-xs tracking-wider">
                                                Grand Total
                                            </td>
                                            {dailyDoneReport.totals.map((total, idx) => (
                                                <td key={idx} className="px-2 py-4 text-center">
                                                    {total > 0 ? (
                                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 h-7 rounded-md bg-emerald-700 text-white font-extrabold text-xs shadow-sm">{total}</span>
                                                    ) : (
                                                        <span className="text-emerald-700/50 font-semibold">0</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-5 py-4 text-center bg-emerald-100 border-l border-emerald-300">
                                                <span className="inline-flex items-center justify-center min-w-[3.25rem] px-3.5 h-8.5 rounded-lg bg-emerald-700 text-white font-black text-sm shadow-md">
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
