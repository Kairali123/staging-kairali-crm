import { loadBookings } from "@/lib/crr-calling-server";
import { isCancelledStatus, stageStatusOf, toYmd } from "@/lib/crr-stage-rules";
import type { StageInfo, StageStatus } from "@/types/crr";

export const STAGES = [
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
] as const;

export interface StageUser {
    name: string;
    email: string;
    role: string;
    stages: number[];
}

export const DEFAULT_STAGE_USERS: StageUser[] = [
    { name: "Jinsha Manoj MV", email: "grm@ktahv.com", role: "grm", stages: [1, 2, 4, 5, 6, 8] },
    { name: "Dr. Rahul R", email: "doctor@ktahv.com", role: "doctor", stages: [3, 7] },
    { name: "Shoukath Ali Moosa", email: "fom@ktahv.com", role: "fom", stages: [9, 10] },
    { name: "Anoop Vijayaraj", email: "gm.hv@kairali.com", role: "gm", stages: [11] },
];

export interface CrrReportData {
    reportDate: string;
    displayDate: string;
    generatedAt: string;
    pendingReport: {
        table: Array<{ emp: string; email: string; counts: number[] }>;
        totals: number[];
    };
    dailyDoneReport: {
        table: Array<{ emp: string; email: string; counts: number[] }>;
        totals: number[];
    };
    chartData: {
        totalActive: number;
        totalComplete: number;
        totalAll: number;
        totalRoleWorkload: number;
        roleStats: Record<string, { tasks: number; guests: number }>;
        stagePending: number[];
        maxStagePending: number;
    };
    stages: typeof STAGES;
}

export async function loadScheduledCrr(date: string): Promise<CrrReportData> {
    const { data: rawRows, stageUsers } = await loadBookings("", [], 2000);

    const responsiblePersonList: StageUser[] = (() => {
        if (!stageUsers || stageUsers.length === 0) return DEFAULT_STAGE_USERS;
        const merged = [...stageUsers];
        for (const def of DEFAULT_STAGE_USERS) {
            const exists = merged.find((u) => u.email.toLowerCase() === def.email.toLowerCase());
            if (!exists) {
                merged.push(def);
            }
        }
        return merged.sort((a, b) => a.name.localeCompare(b.name));
    })();

    // Derive stageStatus for each booking row
    const rows = rawRows.map((r: any) => {
        const stages: StageInfo[] = r.stages ?? [];
        const stageStatus: StageStatus[] = Array.from({ length: 11 }, (_, i) =>
            stageStatusOf(i + 1, stages.find((s) => s.stage === i + 1))
        );
        return {
            ...r,
            stageStatus,
        };
    });

    const activeRows = rows.filter((g: any) => !isCancelledStatus(g.bookingStatus) && !g.notCheckedInYet);
    const completedRows = activeRows.filter((g: any) => STAGES.every((s) => g.stageStatus[s.no - 1] === "Complete"));
    const pendingRows = activeRows.filter((g: any) => !STAGES.every((s) => g.stageStatus[s.no - 1] === "Complete"));

    // 1. Pending Actions by Stage & Stage-Wise Pending Table (Live Snapshot)
    const stagePendingCountArray = new Array(STAGES.length).fill(0);
    for (const g of activeRows) {
        for (let idx = 0; idx < STAGES.length; idx++) {
            if (g.stageStatus[idx] !== "Complete") {
                stagePendingCountArray[idx]++;
            }
        }
    }

    const pendingTable = responsiblePersonList.map((su) => {
        const stageSet = new Set<number>(su.stages || []);
        const effectiveStages = Array.from(stageSet);

        const counts = STAGES.map((s, idx) => {
            const stageNo = idx + 1;
            if (!effectiveStages.includes(stageNo)) return 0;
            return stagePendingCountArray[idx];
        });
        return { emp: su.name || su.email, email: su.email, counts };
    });

    const pendingTotals = new Array(STAGES.length).fill(0);
    pendingTable.forEach((r) => {
        r.counts.forEach((c, idx) => {
            pendingTotals[idx] += c;
        });
    });

    const sortedPendingTable = [...pendingTable].sort((a, b) => {
        const sumA = a.counts.reduce((acc, c) => acc + c, 0);
        const sumB = b.counts.reduce((acc, c) => acc + c, 0);
        return sumB - sumA;
    });

    // 2. Daily Completed Tasks (Filtered strictly by selected report date YYYY-MM-DD)
    const targetYmd = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toYmd(date) || date;
    const doneCounts = new Array(STAGES.length).fill(0);
    const userDoneCounts: Record<string, number[]> = {};

    responsiblePersonList.forEach((u) => {
        userDoneCounts[u.email] = new Array(STAGES.length).fill(0);
    });

    for (const g of rows) {
        for (let idx = 0; idx < STAGES.length; idx++) {
            const sInfo = g.stages?.[idx];
            if (sInfo?.completed && sInfo.actualDate) {
                const actualYmd = toYmd(sInfo.actualDate);
                if (actualYmd && actualYmd === targetYmd) {
                    doneCounts[idx]++;
                    responsiblePersonList.forEach((u) => {
                        if (u.stages?.includes(idx + 1)) {
                            userDoneCounts[u.email][idx]++;
                        }
                    });
                }
            }
        }
    }

    const doneTable = responsiblePersonList
        .map((su) => ({
            emp: su.name || su.email,
            email: su.email,
            counts: userDoneCounts[su.email] || new Array(STAGES.length).fill(0),
        }))
        .sort((a, b) => {
            const sumA = a.counts.reduce((acc, c) => acc + c, 0);
            const sumB = b.counts.reduce((acc, c) => acc + c, 0);
            return sumB - sumA;
        });

    // 3. Chart Data: Role stats & Journey Donut
    const stagePending = pendingTotals;
    const maxStagePending = Math.max(1, ...stagePending);

    const roleStats: Record<string, { tasks: number; guests: number }> = {
        GRE: { tasks: 0, guests: 0 },
        Doctor: { tasks: 0, guests: 0 },
        FO: { tasks: 0, guests: 0 },
        GM: { tasks: 0, guests: 0 },
    };
    const guestsByRole: Record<string, Set<number | string>> = {
        GRE: new Set(),
        Doctor: new Set(),
        FO: new Set(),
        GM: new Set(),
    };

    for (const g of activeRows) {
        for (let idx = 0; idx < STAGES.length; idx++) {
            if (g.stageStatus[idx] !== "Complete") {
                const role = STAGES[idx].resp;
                if (roleStats[role]) {
                    roleStats[role].tasks++;
                    guestsByRole[role]?.add(g.bookingId || g.rowNumber);
                }
            }
        }
    }

    for (const role of Object.keys(roleStats)) {
        roleStats[role].guests = guestsByRole[role]?.size || 0;
    }

    const totalRoleWorkload = Object.values(roleStats).reduce((a, b) => a + b.tasks, 0);
    const totalActive = pendingRows.length;
    const totalComplete = completedRows.length;
    const totalAll = Math.max(1, totalActive + totalComplete);

    const displayDate = new Date(targetYmd + "T00:00:00Z").toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
    });

    return {
        reportDate: targetYmd,
        displayDate,
        generatedAt: new Date().toISOString(),
        pendingReport: {
            table: sortedPendingTable,
            totals: pendingTotals,
        },
        dailyDoneReport: {
            table: doneTable,
            totals: doneCounts,
        },
        chartData: {
            totalActive,
            totalComplete,
            totalAll,
            totalRoleWorkload,
            roleStats,
            stagePending,
            maxStagePending,
        },
        stages: STAGES,
    };
}
