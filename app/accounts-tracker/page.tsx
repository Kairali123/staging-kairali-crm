"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { useAccountsTracker, type Booking, type SalesVerifyStage, type PaymentVerifyStage } from '@/hooks/use-accounts-tracker';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Users,
    Search,
    CheckCircle,
    AlertTriangle,
    BarChart3,
    Download,
    Eye,
    FileText,
    IndianRupee,
    ArrowRight,
    Filter,
    Calendar,
    Clock,
    User as UserIcon,
    ArrowLeft,
    ClipboardList,
    Package,
    X,
    ShieldCheck,
    ExternalLink,
    RefreshCw,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    LineChart as LineChartIcon,
    Table as TableIcon
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, CheckCircle2, Clock3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

/* ─────────────────────────────────────────────
   STATIC DATA (from uploaded Excel files)
───────────────────────────────────────────── */
const MOCK_BOOKINGS: Booking[] = [];

/* ─────────────────────────────────────────────
   ROLE CONFIG
───────────────────────────────────────────── */
type UserRole = 'admin' | 'accounts_manager' | 'accounts_staff' | 'sales_staff';

const canEditSalesVerify = (role: UserRole) => role !== 'sales_staff';
const canEditPaymentVerify = (role: UserRole) => role === 'admin' || role === 'accounts_manager';
const canExport = (role: UserRole) => role === 'admin' || role === 'accounts_manager';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name: string): string {
    return name.replace(/^(Ms\.|Mr\.|Mrs\.|Dr\.)\s*/i, '').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatINR(val: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
}

/** Normalize a booking ID for robust matching (trim + uppercase) so FO-API
 *  keys join correctly against booking records regardless of whitespace/case. */
function normalizeBookingId(id: string | null | undefined): string {
    return String(id ?? '').trim().toUpperCase();
}

/** Treats null/undefined and common "empty" placeholder strings ('_', '-', 'NA', 'N/A', 'null') as blank. */
function isBlankField(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;

    const normalized = value.trim().toLowerCase();
    return normalized === '' || normalized === '_' || normalized === '-' || normalized === 'na' || normalized === 'n/a' || normalized === 'null';
}

const PField = ({
    label,
    value,
    highlight = false,
}: {
    label: string
    value?: string | null
    highlight?: boolean
}) => (
    <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 leading-none">
            {label}
        </p>
        <p className={`text-sm ${highlight ? 'font-bold text-amber-700' : 'font-semibold text-slate-900'} ${!value ? 'italic text-slate-400' : ''} leading-relaxed break-words`}>
            {value || '_'}
        </p>
    </div>
)

/** Compact KPI tile used inside the payment modal summary cards */
function Stat({ label, value, tone = 'slate' }: {
    label: string;
    value: string;
    tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red';
}) {
    const toneClass = {
        slate: 'text-slate-900',
        blue: 'text-blue-600',
        green: 'text-green-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
    }[tone];
    return (
        <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-sm sm:text-base font-bold tabular-nums break-words ${toneClass}`}>{value}</p>
        </div>
    );
}

/** Card-style field (matches onboarding-done modal's InfoRow pattern) */
function FieldCard({ label, value, mono = false, highlight = false }: {
    label: string;
    value?: string | number | null;
    mono?: boolean;
    highlight?: boolean;
}) {
    const hasValue = value !== null && value !== undefined && String(value).trim().length > 0;
    return (
        <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none">{label}</span>
            <span className={`text-sm break-words leading-snug ${highlight ? 'font-bold text-amber-700' : 'font-semibold text-slate-800'} ${mono ? 'font-mono text-xs text-slate-700' : ''} ${!hasValue ? 'italic text-slate-400' : ''}`}>
                {hasValue ? value : '_'}
            </span>
        </div>
    );
}

/** Linked-document tile with disabled-state fallback */
function LinkTile({ href, label, icon, fallback }: {
    href?: string;
    label: string;
    icon: React.ReactNode;
    fallback: string;
}) {
    const isValidUrl = href && (href.trim().toLowerCase().startsWith('http') || href.trim().toLowerCase().startsWith('www'));
    if (!isValidUrl) {
        const displayText = href && href.trim() !== '' ? href : fallback;
        return (
            <div className="h-10 border-2 border-dashed border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-slate-400 px-3">
                {icon} <span className="truncate">{displayText}</span>
            </div>
        );
    }
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase text-slate-700 transition-all active:scale-95 cursor-pointer px-3"
        >
            {icon} <span className="truncate">{label}</span> <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        </a>
    );
}

/* ─────────────────────────────────────────────
   ANALYTICS DASHBOARD — inline, no external deps
   Uses only: filtered (Booking[]), formatINR
───────────────────────────────────────────── */

const ACHART_COLORS = {
    verified: '#10b981',
    pending: '#f59e0b',
    disc: '#ef4444',
    blue: '#3b82f6',
    indigo: '#6366f1',
    teal: '#14b8a6',
};

const STATUS_CHART_COLORS: Record<string, string> = {
    'Verified Done': ACHART_COLORS.verified,
    'Pending': ACHART_COLORS.pending,
    'Discrepancy': ACHART_COLORS.disc,
};

function shortINR(val: number): string {
    if (Math.abs(val) >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
    if (Math.abs(val) >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
    if (Math.abs(val) >= 1_000) return `₹${(val / 1_000).toFixed(0)}K`;
    return `₹${val}`;
}

const ATooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-3 py-2.5 text-xs z-50">
            {label && <p className="font-bold text-slate-700 mb-1.5 truncate max-w-[200px]">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
                    <span className="text-slate-500">{p.name}:</span>
                    <span className="font-bold text-slate-800">
                        {typeof p.value === 'number' && Math.abs(p.value) > 999 ? shortINR(p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const AKPI_TONE: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    blue: { bg: 'from-blue-50 to-blue-100/60', border: 'border-blue-200', icon: 'bg-blue-500', text: 'text-blue-700' },
    green: { bg: 'from-emerald-50 to-emerald-100/60', border: 'border-emerald-200', icon: 'bg-emerald-500', text: 'text-emerald-700' },
    amber: { bg: 'from-amber-50 to-amber-100/60', border: 'border-amber-200', icon: 'bg-amber-500', text: 'text-amber-700' },
    red: { bg: 'from-red-50 to-red-100/60', border: 'border-red-200', icon: 'bg-red-500', text: 'text-red-700' },
    indigo: { bg: 'from-indigo-50 to-indigo-100/60', border: 'border-indigo-200', icon: 'bg-indigo-500', text: 'text-indigo-700' },
    teal: { bg: 'from-teal-50 to-teal-100/60', border: 'border-teal-200', icon: 'bg-teal-500', text: 'text-teal-700' },
    slate: { bg: 'from-slate-50 to-slate-100/60', border: 'border-slate-200', icon: 'bg-slate-500', text: 'text-slate-700' },
};

function AKpiCard({ label, value, sub, icon, tone, trend }: {
    label: string; value: string; sub?: string;
    icon: React.ReactNode; tone: keyof typeof AKPI_TONE;
    trend?: 'up' | 'down' | 'neutral';
}) {
    const t = AKPI_TONE[tone];
    return (
        <div className={`bg-gradient-to-br ${t.bg} border ${t.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${t.icon} flex items-center justify-center shadow-sm text-white flex-shrink-0`}>{icon}</div>
                {trend && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
                        trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </div>
                )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 leading-none">{label}</p>
            <p className={`text-lg sm:text-xl font-black ${t.text} tabular-nums leading-tight break-all`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>}
        </div>
    );
}

function AChartCard({ title, subtitle, children, className = '' }: {
    title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">{title}</h4>
                {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function AEmpty() {
    return (
        <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-xs font-medium gap-1">
            <BarChart3 className="w-6 h-6 opacity-40" />
            <span>No data for current filters</span>
        </div>
    );
}

// ── Account Data Upload: live data from external Google Apps Script API ──
const ACCOUNT_DATA_UPLOAD_API =
    'https://script.google.com/macros/s/AKfycbzyqlXSnCkaNhpTszUSSGTQdIp7m1vTJDAQCxDlgVWan3hlHwpbOca8jrrhS-cmBvYf/exec';

interface AccountDataUploadRow {
    uid?: string;
    bookingId?: string;
    clientName?: string;
    salesAgent?: string;
    checkIn?: string;
    checkOut?: string;
    piAmount?: string | number;
    planned?: string;
    actual?: string;
    delay?: string;
}

// ── NEW PENDING-ACTIONS API ──────────────────────────────────────────────
// Returns: { data: { foagent: { "Shoukath Ali Moosa": { deleteComplete: [...] } }, accountagent: { "Suresh Kumar C": { accountsVerify: [...] } } } }
const PENDING_ACTIONS_API = 'https://script.google.com/macros/s/AKfycbzLPdQWxKPMQAs1HOuYnBKlksb2oEo4BLHgdJT7YcA4uW4zUquf4T0HXaILoVKQJ7FF/exec';

interface PaBookingEntry {
    bookingid: string;
    clientname: string;
    salesagent: string;
    bookingdate: string;
    checkoutdate: string;
    piamount: number;
    receivedpercent?: number; // present in deleteComplete, absent in accountsVerify
}
interface PendingActionsApiData {
    foagent: Record<string, { newBookings: PaBookingEntry[]; accountsVerify: PaBookingEntry[]; finalTransfer: PaBookingEntry[]; deleteComplete: PaBookingEntry[] }>;
    accountagent: Record<string, { newBookings: PaBookingEntry[]; accountsVerify: PaBookingEntry[]; finalTransfer: PaBookingEntry[]; deleteComplete: PaBookingEntry[] }>;
}

const getAgentColor = (index, total) => {
    const hue = (index * (360 / total)) % 360;
    return `hsl(${hue}, 65%, 50%)`;
};

function AccountDataUploadApiTable({ rows, loading, error, onRefresh }: {
    rows: AccountDataUploadRow[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
}) {

    const fmtPI = (val: string | number | undefined) => {
        if (val == null || val === '') return '—';
        const n = Number(String(val).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(n) && n !== 0 ? formatINR(n) : String(val);
    };

    const totalPI = rows.reduce((acc, r) => {
        const n = Number(String(r.piAmount ?? '').replace(/[^0-9.-]/g, ''));
        return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

    const th = "px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap";
    const td = "px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap";

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
                <span className="text-[11px] font-medium text-slate-500">
                    {loading ? 'Loading from API…' : `${rows.length} record${rows.length === 1 ? '' : 's'} · Total PI ${formatINR(totalPI)}`}
                </span>
                <button type="button" onClick={onRefresh} disabled={loading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-50">
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span className="text-[13px]">Fetching live data…</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2 text-red-400 px-6 text-center">
                        <AlertTriangle className="w-6 h-6" />
                        <span className="text-[13px] font-semibold text-red-600">Could not load data</span>
                        <span className="text-[12px] text-slate-400">{error}</span>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex items-center justify-center h-48 text-slate-400 text-[13px] italic">No records found</div>
                ) : (
                    <table className="w-full text-left text-sm min-w-[920px]">
                        <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                            <tr>
                                <th className={th}>Booking ID</th>
                                <th className={th}>Client</th>
                                <th className={th}>Sales Agent</th>
                                <th className={th}>Check-in</th>
                                <th className={th}>Check-out</th>
                                <th className={`${th} text-right`}>PI Amount</th>
                                <th className={th}>Planned</th>
                                <th className={`${th} text-center`}>Actual</th>
                                <th className={`${th} text-right`}>Delay</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((r, idx) => {
                                const pending = !r.actual || String(r.actual).trim() === '';
                                return (
                                    <tr key={r.uid || r.bookingId || idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{r.bookingId || r.uid || '—'}</td>
                                        <td className={td}>{r.clientName || '—'}</td>
                                        <td className={`${td} font-semibold`}>{r.salesAgent || '—'}</td>
                                        <td className={`${td} text-slate-500`}>{r.checkIn || '—'}</td>
                                        <td className={`${td} text-slate-500`}>{r.checkOut || '—'}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{fmtPI(r.piAmount)}</td>
                                        <td className={`${td} text-slate-500`}>{r.planned || '—'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            {pending ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-red-50 border border-red-200 text-red-700">Pending</span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-emerald-50 border border-emerald-200 text-emerald-700">{r.actual}</span>
                                            )}
                                        </td>
                                        <td className={`px-4 py-2.5 text-right tabular-nums text-[13px] whitespace-nowrap ${pending ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{r.delay || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function AnalyticsDashboardInline({
    filtered,
    allBookings,
    sureshSettlementEntries,
    shoukatFoEntries,
    paApiData,
    accountDataRows,
    accountDataLoading,
    accountDataError,
    loadAccountData,
    canManageManagementVerify,
    openManagementModal,
}: {
    filtered: Booking[];
    allBookings: Booking[];
    sureshSettlementEntries: PaBookingEntry[];
    shoukatFoEntries: PaBookingEntry[];
    paApiData: PendingActionsApiData | null;
    accountDataRows: AccountDataUploadRow[];
    accountDataLoading: boolean;
    accountDataError: string | null;
    loadAccountData: () => Promise<void>;
    canManageManagementVerify: boolean;
    openManagementModal: (booking: Booking) => void;
}) {
    const rowsPerPage = 10;
    // ── EDIT FORM UPDATE API ─────────────────────────────────────────────────
    // Returns: { status: "SUCCESS", data: { "KTAHV-PMS-6907": { clientname, salesagent, bookingdate, checkoutdate, piamount }, ... } }
    const EDIT_FORM_UPDATE_API = 'https://script.google.com/macros/s/AKfycbzs_oaQ9z-ZV2ldo2hJX1MQWAK4glgR6LJfAxr1KFmXJeBpsReU8nVff56sx8dFw7VPvw/exec';

    interface EditFormUpdateEntry {
        clientname: string;
        salesagent: string;
        bookingdate: string;
        checkoutdate: string;
        piamount: number;
    }
    type EditFormUpdateApiData = Record<string, EditFormUpdateEntry>;

    const [editFormApiData, setEditFormApiData] = useState<EditFormUpdateApiData>({});

    useEffect(() => {
        fetch(EDIT_FORM_UPDATE_API, { redirect: 'follow' })
            .then(r => r.json())
            .then((res: { status?: string; data?: EditFormUpdateApiData }) => {
                if (res?.data) setEditFormApiData(res.data);
            })
            .catch(() => { /* silently fail */ });
    }, []);

    const [allPendingActiveTab, setAllPendingActiveTab] = useState(0);
    const [allAlertsActiveTab, setAllAlertsActiveTab] = useState(0);

    // PI Agent drilldown modal state
    const [piAgentDrilldown, setPiAgentDrilldown] = useState<{ agent: string; mode: 'total' | 'incomplete' } | null>(null);

    const [piSortConfig, setPiSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [reconSortConfig, setReconSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [bankPendingSortConfig, setBankPendingSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [overdueSortConfig, setOverdueSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handlePiSort = (key: string) => {
        setPiSortConfig(prev => prev && prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    };

    const handleReconSort = (key: string) => {
        setReconSortConfig(prev => prev && prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    };

    const handleBankPendingSort = (key: string) => {
        setBankPendingSortConfig(prev => prev && prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    };

    const handleOverdueSort = (key: string) => {
        setOverdueSortConfig(prev => prev && prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
    };

    // -----------------------------------------------------
    // DERIVED METRICS FOR THE 12 SECTIONS
    // -----------------------------------------------------

    const now = new Date();

    // PI=0 wale charts mein nahi dikhane — sirf chart sections ke liye
    const filteredWithPI = filtered.filter(b => (b.paymentVerify.piAmountSales || 0) > 0);

    // Helper to calculate days difference
    const daysSince = (dateStr: string) => {
        if (!dateStr || dateStr === '_' || dateStr === 'N/A') return 0;
        // Assuming format like "05 May 2024" or ISO
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 0;
        return Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
    };

    const kpis = useMemo(() => {
        let piIncompleteCheckout = 0;
        let invoiceNotCreated = 0;
        let piInvoiceMismatch = 0;
        let bankEntryPendingAlerts = 0;
        let overduePayments = 0;

        let piCompleted = 0;
        let piIncomplete = 0;
        let piOverdueIncomplete = 0;

        let bankMatched = 0;
        let bankPartial = 0;
        let bankUnmatched = 0;

        let bankMatchedAmt = 0;
        let bankPartialAmt = 0;
        let bankUnmatchedAmt = 0;

        //20June2026
        let salesStagePending = 0;
        let salesStagePendingAmount = 0;

        let accountStagePending = 0;
        let accountStagePendingAmount = 0;

        let accountSattlementPending = 0;
        let accountSattlementPendingAmount = 0;

        let accountUploadStagePending = 0;
        let accountUploadStagePendingAmount = 0;


        let totalPIAmount = 0;
        filteredWithPI.forEach(b => {
            const piAmt = b.paymentVerify.piAmountSales || 0;
            const invAmt = b.paymentVerify.tallyInvoiceAmount || 0;
            const rcvAmt = b.paymentVerify.amountReceived || 0;
            totalPIAmount += piAmt;

            // SECTION 1: Alerts

            const salesStage = b?.salesVerify?.status || '';
            if (salesStage === 'Pending') {
                salesStagePending++;
                salesStagePendingAmount += piAmt;
            }

            const accountStage = b?.paymentVerify?.verifyStatus || '';
            if (accountStage === 'Pending') {
                accountStagePending++;
                accountStagePendingAmount += piAmt;
            }

            const daysCheckout = daysSince(b.departureDate);
            const isPiUrlMissing = isBlankField(b.paymentVerify.piUrl);



            if (isPiUrlMissing) piIncompleteCheckout++;
            if (b.paymentVerify.verifyStatus === 'Pending' && daysSince(b.bookingDate) > 3) invoiceNotCreated++;
            if (piAmt !== invAmt && invAmt > 0) piInvoiceMismatch++;
            if (rcvAmt === 0 && daysCheckout > 0) bankEntryPendingAlerts++;
            // Overdue = stage2_total_received_amount_bank_date is null
            if (b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined) overduePayments++;

            // SECTION 2: PI Completion
            if (!isPiUrlMissing) piCompleted++;
            else {
                if (daysCheckout > 0) piOverdueIncomplete++;
                else piIncomplete++;
            }

            // SECTION 4: Bank Collection Status
            if (b.paymentVerify.verifyStatus === 'Verified Done' || rcvAmt >= piAmt) {
                bankMatched++;
                bankMatchedAmt += rcvAmt;
            } else if (rcvAmt > 0 && rcvAmt < piAmt) {
                bankPartial++;
                bankPartialAmt += rcvAmt;
            } else {
                bankUnmatched++;
                bankUnmatchedAmt += piAmt; // outstanding expected
            }
        });



        return {
            alerts: { piIncompleteCheckout, invoiceNotCreated, piInvoiceMismatch, bankEntryPendingAlerts, overduePayments, editFormUpdate: 0 },
            piStatus: { piCompleted, piIncomplete, piOverdueIncomplete, total: filteredWithPI.length },
            bankStatus: { bankMatched, bankPartial, bankUnmatched, bankMatchedAmt, bankPartialAmt, bankUnmatchedAmt, totalAmt: bankMatchedAmt + bankPartialAmt + bankUnmatchedAmt },
            salesStage: { salesStagePending, salesStagePendingAmount },
            accountStage: { accountStagePending, accountStagePendingAmount },
            accountsSettlement: { accountSattlementPending: sureshSettlementEntries.length, accountSattlementPendingAmount: sureshSettlementEntries.reduce((acc, e) => acc + (e.piamount || 0), 0) },
            accountUploadStage: { accountUploadStagePending: accountDataRows.length, accountUploadStagePendingAmount: accountDataRows.reduce((acc, e) => acc + (Number(String(e.piAmount ?? '').replace(/[^0-9.-]/g, '')) || 0), 0) },
            foAgentPending: { foPending: shoukatFoEntries.length, foPendingAmount: shoukatFoEntries.reduce((acc, e) => acc + (e.piamount || 0), 0) },


        };
    }, [filteredWithPI, sureshSettlementEntries, accountDataRows]);

    // SECTION 3: PI vs Invoice vs Bank Receipts (Trend)
    // const trendData = useMemo(() => {
    //     const map: Record<string, { label: string; pi: number; invoice: number; received: number }> = {};
    //     filteredWithPI.forEach(b => {
    //         const raw = b.bookingDate || b.arrivalDate || '';
    //         if (!raw || raw === '_') return;
    //         const d = new Date(raw.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
    //         if (isNaN(d.getTime())) return;
    //         const label = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-IN', { month: 'short' })}`;
    //         if (!map[label]) map[label] = { label, pi: 0, invoice: 0, received: 0 };
    //         map[label].pi += (b.paymentVerify.piAmountSales).toFixed(2) || 0;
    //         map[label].invoice += (b.paymentVerify.tallyInvoiceAmount).toFixed(2) || 0;
    //         map[label].received += (b.paymentVerify.amountReceived).toFixed(2) || 0;
    //     });
    //     return Object.values(map).slice(-7); // Last 7 data points for compact chart
    // }, [filteredWithPI]);

    const trendData = useMemo(() => {
        const map: Record<string, { label: string; date: number; pi: number; invoice: number; received: number, varience: number }> = {};

        filteredWithPI.forEach(b => {
            const raw = b.bookingDate || b.arrivalDate || '';
            if (!raw || raw === '_') return;

            const d = new Date(raw.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
            if (isNaN(d.getTime())) return;

            const label = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-IN', { month: 'short' })}`;

            if (!map[label]) map[label] = { label, date: d.getTime(), pi: 0, invoice: 0, received: 0, varience: 0 };

            const pv = b.paymentVerify;
            map[label].pi += Number(pv?.piAmountSales) || 0;
            map[label].invoice += Number(pv?.tallyInvoiceAmount) || 0;
            map[label].received += Number(pv?.amountReceived) || 0;
            map[label].varience += Number(pv?.differenceAmount) || 0;
        });

        return Object.values(map)
            .sort((a, b) => a.date - b.date)
            .slice(-7)
            .map(({ date, pi, invoice, received, varience, ...rest }) => ({
                ...rest,
                pi: Number(pi.toFixed(2)),
                invoice: Number(invoice.toFixed(2)),
                received: Number(received.toFixed(2)),
                varience: pi ? Number(varience / pi * 100).toFixed(2) : 0,
            }));
    }, [filteredWithPI]);



    // SECTION 5: PI Pending By Sales Agent
    const salesAgentDataFull = useMemo(() => {
        const map: Record<string, { agent: string; total: number; incomplete: number; overdue: number; amount: number }> = {};
        filteredWithPI.forEach(b => {
            const agent = b.bookingTakenBy || 'Unknown';
            if (!map[agent]) map[agent] = { agent, total: 0, incomplete: 0, overdue: 0, amount: 0 };
            map[agent].total++;
            const isPiUrlMissingAgent = !b.paymentVerify.piUrl || b.paymentVerify.piUrl.trim() === '' || b.paymentVerify.piUrl.trim() === '_';
            if (isPiUrlMissingAgent) {
                map[agent].incomplete++;
                if (daysSince(b.departureDate) > 0) map[agent].overdue++;
                map[agent].amount += b.paymentVerify.piAmountSales || 0;
            }
        });
        return Object.values(map).sort((a, b) => b.incomplete - a.incomplete);
    }, [filteredWithPI]);

    const salesAgentData = salesAgentDataFull.slice(0, 5);

    // SECTION 6 & 7: Finance Team Tables
    const financeTeamData = useMemo(() => {
        const map: Record<string, { exec: string; pendingInv: number; invDelay: number; invAmt: number; pendingBank: number; bankDelay: number; bankAmt: number }> = {};
        filteredWithPI.forEach(b => {
            const exec = b.paymentVerify.doer || 'Unknown';
            if (!map[exec]) map[exec] = { exec, pendingInv: 0, invDelay: 0, invAmt: 0, pendingBank: 0, bankDelay: 0, bankAmt: 0 };

            const daysSinceBooking = daysSince(b.bookingDate);
            if (b.paymentVerify.verifyStatus === 'Pending') {
                map[exec].pendingInv++;
                map[exec].invAmt += b.paymentVerify.piAmountSales || 0;
                if (daysSinceBooking > 3) map[exec].invDelay++;

                if ((b.paymentVerify.amountReceived || 0) === 0) {
                    map[exec].pendingBank++;
                    map[exec].bankAmt += b.paymentVerify.piAmountSales || 0;
                    if (daysSinceBooking > 3) map[exec].bankDelay++;
                }
            }
        });
        return Object.values(map).sort((a, b) => b.pendingInv - a.pendingInv).slice(0, 5);
    }, [filteredWithPI]);

    // SECTION 8: Overall Employee Pending Summary
    const employeePendingSummary = [
        // { team: 'Sales Team (PI Incomplete)', count: kpis.alerts.piIncompleteCheckout, amt: filteredWithPI.reduce((acc, b) => { const missing = !b.paymentVerify.piUrl || b.paymentVerify.piUrl.trim() === '' || b.paymentVerify.piUrl.trim() === '_'; return acc + (missing ? b.paymentVerify.piAmountSales || 0 : 0); }, 0) },
        { team: 'Sales Team (PI Incomplete)', count: kpis.salesStage.salesStagePending, amt: kpis.salesStage.salesStagePendingAmount },
        // { team: 'Finance (Invoice Pending)', count: kpis.alerts.invoiceNotCreated, amt: filteredWithPI.reduce((acc, b) => acc + (b.paymentVerify.verifyStatus === 'Pending' ? b.paymentVerify.piAmountSales || 0 : 0), 0) },
        // { team: 'Finance (Bank Entry Pending)', count: kpis.alerts.bankEntryPendingAlerts, amt: filteredWithPI.reduce((acc, b) => acc + ((b.paymentVerify.amountReceived || 0) === 0 ? b.paymentVerify.piAmountSales || 0 : 0), 0) },
        { team: 'Finance (Invoice Pending)', count: kpis.accountsSettlement.accountSattlementPending, amt: kpis.accountsSettlement.accountSattlementPendingAmount },
        { team: 'Finance (Bank Entry Pending)', count: kpis.accountUploadStage.accountUploadStagePending, amt: kpis.accountUploadStage.accountUploadStagePendingAmount },
        // { team: 'Accounts (Reconciliation Pending)', count: kpis.piStatus.piIncomplete, amt: kpis.bankStatus.bankUnmatchedAmt },
        { team: 'Accounts (Reconciliation Pending)', count: kpis.accountStage.accountStagePending, amt: kpis.accountStage.accountStagePendingAmount },

    ];

    // SECTION 9: PI Incomplete List
    const piIncompleteListFull = useMemo(() => {
        let list = filteredWithPI.filter(b => !b.paymentVerify.piUrl || b.paymentVerify.piUrl.trim() === '' || b.paymentVerify.piUrl.trim() === '_');
        if (piSortConfig) {
            list.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';
                switch (piSortConfig.key) {
                    case 'id': valA = a.id; valB = b.id; break;
                    case 'agent': valA = a.salesVerify.salesAgent; valB = b.salesVerify.salesAgent; break;
                    case 'checkin': valA = new Date(a.arrivalDate).getTime(); valB = new Date(b.arrivalDate).getTime(); break;
                    case 'checkout': valA = new Date(a.departureDate).getTime(); valB = new Date(b.departureDate).getTime(); break;
                    case 'amount': valA = a.paymentVerify.piAmountSales || 0; valB = b.paymentVerify.piAmountSales || 0; break;
                    case 'days': valA = daysSince(a.departureDate); valB = daysSince(b.departureDate); break;
                    case 'status': valA = daysSince(a.departureDate) > 0 ? 1 : 0; valB = daysSince(a.departureDate) > 0 ? 1 : 0; break;
                }
                if (valA < valB) return piSortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return piSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [filtered, piSortConfig]);
    const piIncompleteList = piIncompleteListFull.slice(0, 5);

    // SECTION 10: Reconciliation Summary Detailed
    const reconDetailedFull = useMemo(() => {
        let list = filteredWithPI.filter(b => {
            const isVerifiedOrDiscrepancy = b.paymentVerify.verifyStatus === 'Verified Done' || b.paymentVerify.verifyStatus === 'Discrepancy';
            const pi = Number(b.paymentVerify.piAmountSales) || 0;
            const inv = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
            const rcv = Number(b.paymentVerify.amountReceived) || 0;
            const differenceAmount = Number(b.paymentVerify.differenceAmount) || 0;
            return isVerifiedOrDiscrepancy && !(pi === 0 && inv === 0 && rcv === 0) && differenceAmount < 0;
        });
        if (reconSortConfig) {
            list.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';
                switch (reconSortConfig.key) {
                    case 'id': valA = a.id; valB = b.id; break;
                    case 'pi': valA = a.paymentVerify.piAmountSales || 0; valB = b.paymentVerify.piAmountSales || 0; break;
                    case 'inv': valA = a.paymentVerify.tallyInvoiceAmount || 0; valB = b.paymentVerify.tallyInvoiceAmount || 0; break;

                    case 'rcv': valA = a.paymentVerify.amountReceived || 0; valB = b.paymentVerify.amountReceived || 0; break;
                    case 'varBank': valA = Number(a.paymentVerify.differenceAmount) || 0; valB = Number(b.paymentVerify.differenceAmount) || 0; break;
                    case 'status': valA = (a.paymentVerify.amountReceived || 0) === (a.paymentVerify.piAmountSales || 0) ? 0 : 1; valB = (b.paymentVerify.amountReceived || 0) === (b.paymentVerify.piAmountSales || 0) ? 0 : 1; break;
                }
                if (valA < valB) return reconSortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return reconSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default sort: negative API variance first, then positive, then zero.
            list.sort((a, b) => {
                const varA = Number(a.paymentVerify.differenceAmount) || 0;
                const varB = Number(b.paymentVerify.differenceAmount) || 0;

                const groupA = varA < 0 ? 0 : varA > 0 ? 1 : 2;
                const groupB = varB < 0 ? 0 : varB > 0 ? 1 : 2;

                if (groupA !== groupB) return groupA - groupB;

                if (groupA === 0) return varA - varB;
                if (groupA === 1) return varB - varA;
                return 0;
            });
        }
        return list;
    }, [filtered, reconSortConfig]);
    const reconDetailed = reconDetailedFull.slice(0, 10);
    const [reconModalPage, setReconModalPage] = useState(1);
    const reconModalTotalPages = Math.max(1, Math.ceil(reconDetailedFull.length / rowsPerPage));
    const reconModalPaginated = reconDetailedFull.slice((reconModalPage - 1) * rowsPerPage, reconModalPage * rowsPerPage);

    // Alert detail lists matching kpis.alerts counting logic
    const bankEntryPendingFull = useMemo(() => {
        return filteredWithPI.filter(b => {
            const rcvAmt = b.paymentVerify.amountReceived || 0;
            const daysCheckout = daysSince(b.departureDate);
            return rcvAmt === 0 && daysCheckout > 0;
        });
    }, [filteredWithPI]);

    const overduePaymentsFull = useMemo(() => {
        return filteredWithPI.filter(b => b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined);
    }, [filteredWithPI]);

    const editFormUpdateFull = useMemo(() => {
        return Object.entries(editFormApiData).map(([bookingId, entry]) => ({
            id: bookingId,
            clientName: entry.clientname || '—',
            bookingTakenBy: entry.salesagent || '—',
            bookingDate: entry.bookingdate || '—',
            departureDate: entry.checkoutdate || '—',
            paymentVerify: { piAmountSales: Number(entry.piamount) || 0 },
        }));
    }, [editFormApiData]);

    const bankPendingListFull = useMemo(() => {
        let list = filteredWithPI.filter(b => {
            const rcvAmt = b.paymentVerify.amountReceived || 0;
            const daysCheckout = daysSince(b.departureDate);
            return rcvAmt === 0 && daysCheckout > 0;
        });
        if (bankPendingSortConfig) {
            list.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';
                switch (bankPendingSortConfig.key) {
                    case 'id': valA = a.id; valB = b.id; break;
                    case 'agent': valA = a.bookingTakenBy || ''; valB = b.bookingTakenBy || ''; break;
                    case 'checkin': valA = new Date(a.arrivalDate).getTime(); valB = new Date(b.arrivalDate).getTime(); break;
                    case 'checkout': valA = new Date(a.departureDate).getTime(); valB = new Date(b.departureDate).getTime(); break;
                    case 'amount': valA = a.paymentVerify.piAmountSales || 0; valB = b.paymentVerify.piAmountSales || 0; break;
                    case 'days': valA = daysSince(a.departureDate); valB = daysSince(b.departureDate); break;
                    case 'status': valA = daysSince(a.departureDate); valB = daysSince(b.departureDate); break;
                }
                if (valA < valB) return bankPendingSortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return bankPendingSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [filtered, bankPendingSortConfig]);

    const overdueListFull = useMemo(() => {
        let list = filteredWithPI.filter(b => {
            // Overdue = stage2_total_received_amount_bank_date is null
            return b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined;
        });
        if (overdueSortConfig) {
            list.sort((a, b) => {
                let valA: any = '';
                let valB: any = '';
                switch (overdueSortConfig.key) {
                    case 'id': valA = a.id; valB = b.id; break;
                    case 'agent': valA = a.bookingTakenBy || ''; valB = b.bookingTakenBy || ''; break;
                    case 'checkout': valA = new Date(a.departureDate).getTime(); valB = new Date(b.departureDate).getTime(); break;
                    case 'pi': valA = a.paymentVerify.piAmountSales || 0; valB = b.paymentVerify.piAmountSales || 0; break;
                    case 'rcv': valA = a.paymentVerify.amountReceived || 0; valB = b.paymentVerify.amountReceived || 0; break;
                    case 'pending': valA = (a.paymentVerify.piAmountSales || 0) - (a.paymentVerify.amountReceived || 0); valB = (b.paymentVerify.piAmountSales || 0) - (b.paymentVerify.amountReceived || 0); break;
                    case 'days': valA = daysSince(a.departureDate); valB = daysSince(b.departureDate); break;
                }
                if (valA < valB) return overdueSortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return overdueSortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [filtered, overdueSortConfig]);

    // SECTION 11: Top Overdue Accounts
    const topOverdueAccounts = useMemo(() => {
        return filteredWithPI
            .filter(b => b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined)
            .map(b => ({ name: b.clientName, outstanding: (b.paymentVerify.piAmountSales || 0) - (b.paymentVerify.amountReceived || 0) }))
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 5);
    }, [filteredWithPI]);

    // SECTION 11: Full Overdue Accounts List (for "View Full List" dialog)
    const overdueAccountsListFull = useMemo(() => {
        return filteredWithPI
            .filter(b => b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined)
            .map(b => ({
                ...b,
                outstanding: (b.paymentVerify.piAmountSales || 0) - (b.paymentVerify.amountReceived || 0),
            }))
            .sort((a, b) => b.outstanding - a.outstanding);
    }, [filteredWithPI]);

    // Account Head Verification Pending — bookings missing actualRaw, shared by KPI card + pendingActions list
    const accountHeadVerificationList = useMemo(() => {
        return filteredWithPI.filter(b => isBlankField(b.paymentVerify.actualRaw));
    }, [filteredWithPI]);

    const pendingActions = useMemo(() => {
        type FoRawEntry = { id: string; percentage: number; client?: string; checkindate?: string; checkoutdate?: string; piamount?: number; salesagent?: string };
        const emptyFoRaw: FoRawEntry[] = [];

        const accountDataUploadList = filteredWithPI.filter(b => isBlankField(b.paymentVerify.proofLinkRaw));

        return [
            // Accounts Settlement Pending — count + data from new PA API (Suresh → accountsVerify)
            { label: 'FO Full Payment Upload Pending', count: shoukatFoEntries.length, owner: 'Shoukat', priority: 'high' as const, bookings: [] as Booking[], foRawEntries: emptyFoRaw, isLoading: paApiData === null },
            { label: 'Accounts Settlement Pending', count: sureshSettlementEntries.length, owner: 'Suresh', priority: 'high' as const, bookings: [] as Booking[], foRawEntries: emptyFoRaw, isLoading: paApiData === null },
            { label: 'Account Data Upload Pending', count: accountDataRows.length, owner: 'Biju', priority: 'high' as const, bookings: accountDataUploadList, foRawEntries: emptyFoRaw, isLoading: accountDataLoading },
            { label: 'Account Head Verification Pending', count: accountHeadVerificationList.length, owner: 'Anuj Kr Singh', priority: 'medium' as const, bookings: accountHeadVerificationList, foRawEntries: emptyFoRaw, isLoading: false },
            // FO Full Payment Upload Pending — count + data from new PA API (Shoukat → deleteComplete where receivedpercent < 100)
        ];
    }, [sureshSettlementEntries, shoukatFoEntries, filteredWithPI, accountDataRows, paApiData, accountDataLoading, accountHeadVerificationList]);

    // Total Pending (top KPI card) — count = sum of the other 4 cards' counts (overlaps allowed);
    // amount = sum of piAmount over the UNIQUE set of booking ids across all 4 sources (no double-counting)
    const totalPendingSummary = useMemo(() => {
        const count = shoukatFoEntries.length
            + sureshSettlementEntries.length
            + accountDataRows.length
            + accountHeadVerificationList.length;

        const amountById = new Map<string, number>();

        shoukatFoEntries.forEach(e => {
            const key = normalizeBookingId(e.bookingid);
            if (key) amountById.set(key, e.piamount || 0);
        });
        sureshSettlementEntries.forEach(e => {
            const key = normalizeBookingId(e.bookingid);
            if (key) amountById.set(key, e.piamount || 0);
        });
        accountDataRows.forEach(e => {
            const key = normalizeBookingId(e.bookingId);
            if (key) amountById.set(key, Number(String(e.piAmount ?? '').replace(/[^0-9.-]/g, '')) || 0);
        });
        accountHeadVerificationList.forEach(b => {
            const key = normalizeBookingId(b.id);
            if (key) amountById.set(key, b.paymentVerify.piAmountSales || 0);
        });

        const amount = Array.from(amountById.values()).reduce((sum, v) => sum + v, 0);

        return { count, amount };
    }, [shoukatFoEntries, sureshSettlementEntries, accountDataRows, accountHeadVerificationList]);


    // Top Header KPIs
    const topKpis = {
        totalPI: filteredWithPI.reduce((acc, b) => acc + (b.paymentVerify.piAmountSales || 0), 0),
        invoiceActual: filteredWithPI.reduce((acc, b) => acc + (b.paymentVerify.tallyInvoiceAmount || 0), 0),
        totalBankRcv: filteredWithPI.reduce((acc, b) => acc + (b.paymentVerify.amountReceived || 0), 0),
        outstanding: kpis.bankStatus.bankUnmatchedAmt,
        overdue: filteredWithPI.reduce((acc, b) => {
            const isOverdue = b.paymentVerify.totalReceivedBank === null || b.paymentVerify.totalReceivedBank === undefined;
            return acc + (isOverdue ? (b.paymentVerify.piAmountSales || 0) : 0);
        }, 0),
        recoveryEff: kpis.bankStatus.totalAmt > 0 ? ((kpis.bankStatus.bankMatchedAmt / kpis.bankStatus.totalAmt) * 100).toFixed(2) : '0.00'
    };

    return (
        <div className="space-y-4 bg-slate-50 min-h-screen text-slate-800 font-sans">

            {/* TOP SUMMARY KPIs */}
            {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total PI Amount', val: formatINR(topKpis.totalPI), icon: <FileText className="w-4 h-4 text-blue-600" />, color: 'border-blue-200 bg-blue-50/50' },
                    { label: 'Invoice Amount (Actual)', val: formatINR(topKpis.invoiceActual), icon: <ClipboardList className="w-4 h-4 text-green-600" />, color: 'border-green-200 bg-green-50/50' },
                    { label: 'Total Bank Receipts', val: formatINR(topKpis.totalBankRcv), icon: <IndianRupee className="w-4 h-4 text-purple-600" />, color: 'border-purple-200 bg-purple-50/50' },
                    { label: 'Outstanding Amount', val: formatINR(topKpis.outstanding), icon: <Clock className="w-4 h-4 text-amber-600" />, color: 'border-amber-200 bg-amber-50/50' },
                    { label: 'Overdue Amount', val: formatINR(topKpis.overdue), icon: <AlertTriangle className="w-4 h-4 text-red-600" />, color: 'border-red-200 bg-red-50/50' },
                    { label: 'Recovery Efficiency', val: `${topKpis.recoveryEff}%`, icon: <CheckCircle className="w-4 h-4 text-teal-600" />, color: 'border-teal-200 bg-teal-50/50' },
                ].map((k, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${k.color} flex flex-col justify-between shadow-sm`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-600 uppercase truncate">{k.label}</span>
                            {k.icon}
                        </div>
                        <span className="text-lg font-black text-slate-900">{k.val}</span>
                    </div>
                ))}
            </div> */}

            {/* ROW 1: Alerts | Pending Actions | Chart (equal widths) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">



                {/* SECTION : Pending Action Items */}
                <div className="bg-white border border-orange-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="bg-orange-50 px-3 py-2 border-b border-orange-100 flex justify-between items-center rounded-t-lg">
                        <span className="text-xs font-bold text-orange-800 uppercase">Pending Actions</span>
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingActions.reduce((acc, curr) => acc + curr.count, 0)}</span>
                    </div>
                    <div className="p-3 space-y-1.5 flex-1 text-xs font-medium text-slate-700">
                        {pendingActions.map((item, i) => {
                            const RowContent = (
                                <button type="button" className="w-full flex items-start justify-between group cursor-pointer hover:bg-orange-50 px-1.5 py-1.5 rounded gap-2 text-left transition-colors">
                                    <div className="flex items-start gap-2 min-w-0 pt-0.5">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${item.priority === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-slate-600 text-xs font-semibold whitespace-normal break-words leading-tight">{item.label}</span>
                                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded w-max mt-1 whitespace-nowrap">
                                                {item.owner}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                        {item.isLoading ? (
                                            <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                                        ) : (
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${item.count > 0 ? 'text-orange-700 bg-orange-100' : 'text-slate-500 bg-slate-100'}`}>
                                                {item.count}
                                            </span>
                                        )}
                                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-orange-400 transition-colors" />
                                    </div>
                                </button>
                            );

                            if (item.count === 0 && item.label !== 'FO Full Payment Upload Pending') return <div key={i}>{RowContent}</div>;

                            const accentColor = item.priority === 'high' ? 'bg-red-500' : 'bg-amber-400';

                            const getModalTable = () => {
                                if (item.label === 'Accounts Settlement Pending') {
                                    const fmtDate = (d?: string) => {
                                        if (!d) return '—';
                                        const dt = new Date(d);
                                        return isNaN(dt.getTime()) ? d : `${String(dt.getDate()).padStart(2, '0')} ${dt.toLocaleString('en-IN', { month: 'short' })} ${dt.getFullYear()}`;
                                    };
                                    return (
                                        <div className="flex-1 overflow-auto min-h-0">
                                            <table className="w-full text-left text-sm min-w-[700px]">
                                                <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {sureshSettlementEntries.length > 0 ? sureshSettlementEntries.map((e, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                            <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{e.bookingid}</td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{e.clientname || '—'}</td>
                                                            <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{e.salesagent || '—'}</td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.bookingdate)}</td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.checkoutdate)}</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(e.piamount || 0)}</td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-700">
                                                                    Settlement Pending
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                                if (item.label === 'Account Data Upload Pending') {
                                    return <AccountDataUploadApiTable rows={accountDataRows} loading={accountDataLoading} error={accountDataError} onRefresh={loadAccountData} />;
                                }
                                if (item.label === 'Account Head Verification Pending') {
                                    return (
                                        <div className="flex-1 overflow-auto min-h-0">
                                            <table className="w-full text-left text-sm min-w-[660px]">
                                                <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Verify Status</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Verified At</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {item.bookings.length > 0 ? item.bookings.map((b, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                            <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                            <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                            <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                            <td className="px-4 py-2.5 text-center">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${b.paymentVerify.verifyStatus === 'Verified Done' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                                    {b.paymentVerify.verifyStatus || 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-[13px] text-slate-400 italic whitespace-nowrap">
                                                                {b.paymentVerify.verifiedAt && b.paymentVerify.verifiedAt !== '_' ? b.paymentVerify.verifiedAt : '—'}
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                                if (item.label === 'FO Full Payment Upload Pending') {
                                    const fmtDate = (d?: string) => {
                                        if (!d) return '—';
                                        const dt = new Date(d);
                                        return isNaN(dt.getTime()) ? d : `${String(dt.getDate()).padStart(2, '0')} ${dt.toLocaleString('en-IN', { month: 'short' })} ${dt.getFullYear()}`;
                                    };
                                    return (
                                        <div className="flex-1 overflow-auto min-h-0">
                                            <table className="w-full text-left text-sm min-w-[780px]">
                                                <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                    <tr>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Received %</th>
                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {shoukatFoEntries.length > 0 ? shoukatFoEntries.map((e, idx) => {
                                                        const pct = e.receivedpercent ?? 0;
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{e.bookingid}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{e.clientname || '—'}</td>
                                                                <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{e.salesagent || '—'}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.bookingdate)}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.checkoutdate)}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                    {e.piamount > 0 ? formatINR(e.piamount) : '—'}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full rounded-full ${pct === 0 ? 'bg-red-500' : pct < 50 ? 'bg-orange-500' : 'bg-amber-500'}`}
                                                                                style={{ width: `${pct}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[12px] font-bold text-slate-700 tabular-nums">{pct}%</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${pct === 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
                                                                        {pct === 0 ? 'Not Paid' : 'Partial'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }) : (
                                                        <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                }
                                return null;
                            };

                            return (
                                <Dialog key={i}>
                                    <DialogTrigger asChild>
                                        {RowContent}
                                    </DialogTrigger>
                                    <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                        {/* ── Header ── */}
                                        <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-1 h-5 rounded-full ${accentColor} shrink-0`} />
                                                <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                    {item.label}
                                                </DialogTitle>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                {item.count} bookings · Assigned to <span className="font-semibold text-blue-700">{item.owner}</span>
                                            </p>
                                        </DialogHeader>

                                        {/* ── Table ── */}
                                        {getModalTable()}

                                        {/* ── Footer ── */}
                                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {item.count} total bookings
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                Total PI:{" "}
                                                <span className="font-bold text-slate-700">
                                                    {item.label === 'Account Data Upload Pending'
                                                        ? formatINR(accountDataRows.reduce((a, r) => {
                                                            const n = Number(String(r.piAmount ?? '').replace(/[^0-9.-]/g, ''));
                                                            return a + (Number.isFinite(n) ? n : 0);
                                                        }, 0))
                                                        : item.label === 'Accounts Settlement Pending'
                                                            ? formatINR(sureshSettlementEntries.reduce((a, e) => a + (e.piamount || 0), 0))
                                                            : item.label === 'FO Full Payment Upload Pending'
                                                                ? formatINR(shoukatFoEntries.reduce((a, e) => a + (e.piamount || 0), 0))
                                                                : formatINR(item.bookings.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                </span>
                                            </span>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            );
                        })}
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors uppercase tracking-wide">
                                View All Pending →
                            </div>
                        </DialogTrigger>
                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-orange-50 via-white to-orange-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-orange-500 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-orange-900 leading-tight">
                                        All Pending Actions
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {pendingActions.reduce((acc, curr) => acc + curr.count, 0)} total pending items across all categories
                                </p>
                            </DialogHeader>

                            {/* ── Tabbed Content ── */}
                            {(() => {
                                const fmtDate = (d?: string) => {
                                    if (!d) return '—';
                                    const dt = new Date(d);
                                    return isNaN(dt.getTime()) ? d : `${String(dt.getDate()).padStart(2, '0')} ${dt.toLocaleString('en-IN', { month: 'short' })} ${dt.getFullYear()}`;
                                };
                                return (
                                    <div className="flex flex-col flex-1 min-h-0">
                                        {/* Tab bar */}
                                        <div className="flex border-b border-slate-200 bg-slate-100 shrink-0 overflow-x-auto gap-1 px-2 pt-2">
                                            {pendingActions.map((item, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setAllPendingActiveTab(i)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap transition-colors rounded-t-md ${allPendingActiveTab === i ? 'bg-white text-orange-700 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] border border-slate-200 border-b-white relative -mb-px' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 border border-transparent'}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.priority === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                                    {item.label}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${allPendingActiveTab === i ? 'bg-orange-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                                        {item.count}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tab content */}
                                        <div className="flex-1 min-h-0 overflow-auto">
                                            {/* Accounts Settlement Pending */}
                                            {allPendingActiveTab === 0 && (
                                                <table className="w-full text-left text-sm min-w-[700px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {sureshSettlementEntries.length > 0 ? sureshSettlementEntries.map((e, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{e.bookingid}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{e.clientname || '—'}</td>
                                                                <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{e.salesagent || '—'}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.bookingdate)}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.checkoutdate)}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(e.piamount || 0)}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-700">
                                                                        Settlement Pending
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* Account Data Upload Pending */}
                                            {allPendingActiveTab === 1 && (
                                                <AccountDataUploadApiTable rows={accountDataRows} loading={accountDataLoading} error={accountDataError} onRefresh={loadAccountData} />
                                            )}

                                            {/* Account Head Verification Pending */}
                                            {allPendingActiveTab === 2 && (
                                                <table className="w-full text-left text-sm min-w-[660px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Verify Status</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Verified At</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {pendingActions[2].bookings.length > 0 ? pendingActions[2].bookings.map((b, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${b.paymentVerify.verifyStatus === 'Verified Done' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                                        {b.paymentVerify.verifyStatus || 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-400 italic whitespace-nowrap">
                                                                    {b.paymentVerify.verifiedAt && b.paymentVerify.verifiedAt !== '_' ? b.paymentVerify.verifiedAt : '—'}
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* FO Full Payment Upload Pending */}
                                            {allPendingActiveTab === 3 && (
                                                <table className="w-full text-left text-sm min-w-[780px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Received %</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {shoukatFoEntries.length > 0 ? shoukatFoEntries.map((e, idx) => {
                                                            const pct = e.receivedpercent ?? 0;
                                                            return (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{e.bookingid}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{e.clientname || '—'}</td>
                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{e.salesagent || '—'}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.bookingdate)}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{fmtDate(e.checkoutdate)}</td>
                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                        {e.piamount > 0 ? formatINR(e.piamount) : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full rounded-full ${pct === 0 ? 'bg-red-500' : pct < 50 ? 'bg-orange-500' : 'bg-amber-500'}`}
                                                                                    style={{ width: `${pct}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-[12px] font-bold text-slate-700 tabular-nums">{pct}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${pct === 0 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-orange-50 border border-orange-200 text-orange-700'}`}>
                                                                            {pct === 0 ? 'Not Paid' : 'Partial'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }) : (
                                                            <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Footer ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {pendingActions.reduce((acc, curr) => acc + curr.count, 0)} total pending items
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    All categories · Accounts Dashboard
                                </span>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* SECTION 2: Alerts Center */}
                <div className="bg-white border border-red-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="bg-red-50 px-3 py-2 border-b border-red-100 flex justify-between items-center rounded-t-lg">
                        <span className="text-xs font-bold text-red-800 uppercase">Alerts Center</span>
                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{kpis.alerts.piIncompleteCheckout + reconDetailedFull.length + kpis.alerts.bankEntryPendingAlerts + kpis.alerts.overduePayments + editFormUpdateFull.length}</span>
                    </div>
                    <div className="p-3 space-y-2 flex-1 text-xs font-medium text-slate-700">
                        {[
                            { label: 'PI Incomplete Till Check-out', count: kpis.alerts.piIncompleteCheckout, icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
                            // { label: 'Invoice Not Created (Delayed)', count: kpis.alerts.invoiceNotCreated, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
                            { label: 'PI vs Invoice Amount Mismatch', count: reconDetailedFull.length, icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
                            { label: 'Bank Entry Pending / Not Matched', count: kpis.alerts.bankEntryPendingAlerts, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> },
                            { label: 'Overdue Payments', count: kpis.alerts.overduePayments, icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> },
                            { label: 'Edit Form Update', count: editFormUpdateFull.length, icon: <AlertTriangle className="w-3.5 h-3.5 text-blue-500" /> },
                        ].map((a, i) => {
                            const RowContent = (
                                <div key={i} className="flex items-start justify-between group cursor-pointer hover:bg-slate-50 p-1 rounded gap-2">
                                    <div className="flex items-start gap-2 min-w-0 pt-0.5">
                                        <div className="shrink-0 mt-0.5">{a.icon}</div>
                                        <span className="text-slate-600 text-xs font-semibold whitespace-normal break-words leading-tight">{a.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                                        <span className="font-bold text-red-600">{a.count}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                                    </div>
                                </div>
                            );

                            if (a.label === 'PI Incomplete Till Check-out') {
                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            {RowContent}
                                        </DialogTrigger>
                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                            {/* ── Header ── */}
                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                        PI Incomplete List
                                                    </DialogTitle>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                    {piIncompleteListFull.length} bookings · Full report
                                                </p>
                                            </DialogHeader>

                                            {/* ── Scrollable Table ── */}
                                            <div className="flex-1 overflow-auto min-h-0">
                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {piIncompleteListFull.length > 0 ? (
                                                            piIncompleteListFull.map((b, idx) => {
                                                                const dCheckout = daysSince(b.departureDate);
                                                                const isOverdue = dCheckout > 0;
                                                                return (
                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span className={`text-[13px] font-bold tabular-nums ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                {dCheckout}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isOverdue
                                                                                ? 'bg-red-50 border border-red-200 text-red-700'
                                                                                : 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                                }`}>
                                                                                {isOverdue ? 'Overdue' : 'Pending'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                    No incomplete PIs found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ── Footer ── */}
                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {piIncompleteListFull.length} total bookings
                                                </span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] text-slate-400">
                                                        Overdue:{" "}
                                                        <span className="font-bold text-red-600">
                                                            {piIncompleteListFull.filter(b => daysSince(b.departureDate) > 0).length}
                                                        </span>
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        Total PI:{" "}
                                                        <span className="font-bold text-slate-700">
                                                            {formatINR(piIncompleteListFull.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                        </DialogContent>
                                    </Dialog>
                                );
                            }
                            if (a.label === 'PI vs Invoice Amount Mismatch') {
                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            {RowContent}
                                        </DialogTrigger>
                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                            {/* ── Header ── */}
                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                        PI vs Invoice vs Bank Summary
                                                    </DialogTitle>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                    {reconDetailedFull.length} bookings · Full reconciliation report
                                                </p>
                                            </DialogHeader>

                                            {/* ── Scrollable Table ── */}
                                            <div className="flex-1 overflow-auto min-h-0">
                                                <table className="w-full text-left text-sm min-w-[700px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Invoice</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Bank Rcvd</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Var (Bank)</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Var %</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {reconDetailedFull.length > 0 ? (
                                                            reconDetailedFull.map((b, idx) => {
                                                                const pi = Number(b.paymentVerify.piAmountSales) || 0;
                                                                const inv = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
                                                                const bankRcvd = Number(b.paymentVerify.totalReceivedBank) || 0;
                                                                const varBank = Number(b.paymentVerify.differenceAmount) || 0;
                                                                const varPct = Number(b.paymentVerify.differencePercentage) || 0;
                                                                const rcv = Number(b.paymentVerify.amountReceived) || 0;
                                                                const status = Math.round(rcv) === Math.round(pi) ? 'Matched' : 'Unmatched';
                                                                return (
                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(pi)}</td>
                                                                        <td className="px-4 py-2.5 text-right text-[13px] text-slate-500 tabular-nums whitespace-nowrap">{formatINR(inv)}</td>
                                                                        <td className="px-4 py-2.5 text-right text-[13px] text-slate-500 tabular-nums whitespace-nowrap">{formatINR(bankRcvd)}</td>
                                                                        <td className={`px-4 py-2.5 text-right font-bold text-[13px] tabular-nums whitespace-nowrap ${varBank > 0 ? 'text-emerald-600' : varBank < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                            {formatINR(varBank)}
                                                                        </td>
                                                                        <td className={`px-4 py-2.5 text-right font-bold text-[13px] tabular-nums whitespace-nowrap ${varPct > 0 ? 'text-emerald-600' : varPct < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                            {varPct}%
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${status === 'Matched'
                                                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                                                : status === 'Partial'
                                                                                    ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                                    : 'bg-red-50 border border-red-200 text-red-700'
                                                                                }`}>
                                                                                {status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                    No detailed records found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ── Footer ── */}
                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {reconDetailedFull.length} total records
                                                </span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] text-slate-400">
                                                        Matched:{" "}
                                                        <span className="font-bold text-emerald-600">
                                                            {reconDetailedFull.filter(b => Math.round(Number(b.paymentVerify.piAmountSales || 0)) === Math.round(Number(b.paymentVerify.amountReceived || 0))).length}
                                                        </span>
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        Unmatched:{" "}
                                                        <span className="font-bold text-red-600">
                                                            {reconDetailedFull.filter(b => {
                                                                const piVal = Number(b.paymentVerify.piAmountSales) || 0;
                                                                const rcvVal = Number(b.paymentVerify.amountReceived) || 0;
                                                                return Math.round(piVal) !== Math.round(rcvVal);
                                                            }).length}
                                                        </span>
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        Total PI:{" "}
                                                        <span className="font-bold text-slate-700">
                                                            {formatINR(reconDetailedFull.reduce((a, b) => a + Number(b.paymentVerify.piAmountSales || 0), 0))}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                        </DialogContent>
                                    </Dialog>
                                );
                            }
                            if (a.label === 'Bank Entry Pending / Not Matched') {
                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            {RowContent}
                                        </DialogTrigger>
                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                            {/* ── Header ── */}
                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                        Bank Entry Pending / Not Matched
                                                    </DialogTitle>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                    {bankPendingListFull.length} bookings · Full pending list (Checkout passed, no amount received)
                                                </p>
                                            </DialogHeader>

                                            {/* ── Scrollable Table ── */}
                                            <div className="flex-1 overflow-auto min-h-0">
                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('id')}>Booking ID <SortIconLight config={bankPendingSortConfig} field="id" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('agent')}>Sales Agent <SortIconLight config={bankPendingSortConfig} field="agent" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('checkin')}>Check-in <SortIconLight config={bankPendingSortConfig} field="checkin" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('checkout')}>Check-out <SortIconLight config={bankPendingSortConfig} field="checkout" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('amount')}>PI Amount <SortIconLight config={bankPendingSortConfig} field="amount" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('days')}>Days <SortIconLight config={bankPendingSortConfig} field="days" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleBankPendingSort('status')}>Status <SortIconLight config={bankPendingSortConfig} field="status" /></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {bankPendingListFull.length > 0 ? (
                                                            bankPendingListFull.map((b, idx) => {
                                                                const dCheckout = daysSince(b.departureDate);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span className={`text-[13px] font-bold tabular-nums ${dCheckout > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                {dCheckout}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${dCheckout > 30
                                                                                ? 'bg-red-50 border border-red-200 text-red-700'
                                                                                : 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                                }`}>
                                                                                {dCheckout > 30 ? 'Overdue' : 'Pending'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                    No pending bank entry records found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ── Footer ── */}
                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {bankPendingListFull.length} total bookings
                                                </span>
                                                <div className="flex items-center gap-4">
                                                    {/* <span className="text-[11px] text-slate-400">
                                                        Overdue (over 30 days):{" "}
                                                        <span className="font-bold text-red-600">
                                                            {bankPendingListFull.filter(b => daysSince(b.departureDate) > 30).length}
                                                        </span>
                                                    </span> */}
                                                    <span className="text-[11px] text-slate-400">
                                                        Total Outstanding Expected:{" "}
                                                        <span className="font-bold text-slate-700">
                                                            {formatINR(bankPendingListFull.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                        </DialogContent>
                                    </Dialog>
                                );
                            }
                            if (a.label === 'Overdue Payments') {
                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            {RowContent}
                                        </DialogTrigger>
                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                            {/* ── Header ── */}
                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-5 rounded-full bg-red-400 shrink-0" />
                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                        Overdue Payments
                                                    </DialogTitle>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                    {overdueListFull.length} bookings · Full overdue report (Checkout passed over 30 days, partial/no payment)
                                                </p>
                                            </DialogHeader>

                                            {/* ── Scrollable Table ── */}
                                            <div className="flex-1 overflow-auto min-h-0">
                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('id')}>Booking ID <SortIconLight config={overdueSortConfig} field="id" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('agent')}>Sales Agent <SortIconLight config={overdueSortConfig} field="agent" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('checkout')}>Check-out <SortIconLight config={overdueSortConfig} field="checkout" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('pi')}>PI Amount <SortIconLight config={overdueSortConfig} field="pi" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('rcv')}>Amount Rcvd <SortIconLight config={overdueSortConfig} field="rcv" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('pending')}>Pending <SortIconLight config={overdueSortConfig} field="pending" /></th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap cursor-pointer select-none hover:text-blue-200 group" onClick={() => handleOverdueSort('days')}>Days Past <SortIconLight config={overdueSortConfig} field="days" /></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {overdueListFull.length > 0 ? (
                                                            overdueListFull.map((b, idx) => {
                                                                const dCheckout = daysSince(b.departureDate);
                                                                const piAmt = b.paymentVerify.piAmountSales || 0;
                                                                const rcvAmt = b.paymentVerify.amountReceived || 0;
                                                                const pendingAmt = piAmt - rcvAmt;
                                                                return (
                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                        <td className="px-4 py-2.5 text-right font-semibold text-[13px] text-slate-700 tabular-nums whitespace-nowrap">
                                                                            {formatINR(piAmt)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right font-semibold text-[13px] text-slate-500 tabular-nums whitespace-nowrap">
                                                                            {formatINR(rcvAmt)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-red-600 tabular-nums whitespace-nowrap">
                                                                            {formatINR(pendingAmt)}
                                                                        </td>
                                                                        <td className="px-4 py-2.5 text-center font-bold text-[13px] text-red-600 tabular-nums whitespace-nowrap">
                                                                            {dCheckout}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                    No overdue payments found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ── Footer ── */}
                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {overdueListFull.length} total bookings
                                                </span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[11px] text-slate-400">
                                                        Total Pending Overdue:{" "}
                                                        <span className="font-bold text-red-600">
                                                            {formatINR(overdueListFull.reduce((acc, b) => acc + ((b.paymentVerify.piAmountSales || 0) - (b.paymentVerify.amountReceived || 0)), 0))}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>

                                        </DialogContent>
                                    </Dialog>
                                );
                            }
                            if (a.label === 'Edit Form Update') {
                                return (
                                    <Dialog key={i}>
                                        <DialogTrigger asChild>
                                            {RowContent}
                                        </DialogTrigger>
                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                            {/* ── Header ── */}
                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1 h-5 rounded-full bg-blue-400 shrink-0" />
                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                        Edit Form Update List
                                                    </DialogTitle>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                    {editFormUpdateFull.length} bookings · Full report
                                                </p>
                                            </DialogHeader>

                                            {/* ── Scrollable Table ── */}
                                            <div className="flex-1 overflow-auto min-h-0">
                                                <table className="w-full text-left text-sm min-w-[680px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {editFormUpdateFull.length > 0 ? (
                                                            editFormUpdateFull.map((b, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{b.clientName}</td>
                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                        {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-700">
                                                                            Pending
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                    No edit form updates found
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* ── Footer ── */}
                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                <span className="text-[11px] text-slate-400 font-medium">
                                                    {editFormUpdateFull.length} total bookings
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    Total PI:{" "}
                                                    <span className="font-bold text-slate-700">
                                                        {formatINR(editFormUpdateFull.reduce((acc, b) => acc + (b.paymentVerify.piAmountSales || 0), 0))}
                                                    </span>
                                                </span>
                                            </div>

                                        </DialogContent>
                                    </Dialog>
                                );
                            }
                            return RowContent;
                        })}
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[10px] font-bold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors uppercase tracking-wide">View All Alerts →</div>
                        </DialogTrigger>
                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50 via-white to-red-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-red-500 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-red-900 leading-tight">
                                        All Alerts Summary
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {kpis.alerts.piIncompleteCheckout + reconDetailedFull.length + kpis.alerts.bankEntryPendingAlerts + kpis.alerts.overduePayments + editFormUpdateFull.length} total alerts across all categories
                                </p>
                            </DialogHeader>

                            {/* ── Tabbed Content ── */}
                            {(() => {
                                const alertTabs = [
                                    { label: 'PI Incomplete Till Check-out', count: kpis.alerts.piIncompleteCheckout, color: 'text-red-500' },
                                    { label: 'PI vs Invoice Amount Mismatch', count: reconDetailedFull.length, color: 'text-red-500' },
                                    { label: 'Bank Entry Pending / Not Matched', count: kpis.alerts.bankEntryPendingAlerts, color: 'text-amber-500' },
                                    { label: 'Overdue Payments', count: kpis.alerts.overduePayments, color: 'text-red-500' },
                                    { label: 'Edit Form Update', count: editFormUpdateFull.length, color: 'text-blue-500' },
                                ];
                                return (
                                    <div className="flex flex-col flex-1 min-h-0">
                                        {/* Tab bar */}
                                        <div className="flex border-b border-slate-200 bg-slate-100 shrink-0 overflow-x-auto gap-1 px-2 pt-2">
                                            {alertTabs.map((tab, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setAllAlertsActiveTab(i)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap transition-colors rounded-t-md ${allAlertsActiveTab === i ? 'bg-white text-red-700 shadow-[0_-1px_3px_rgba(0,0,0,0.08)] border border-slate-200 border-b-white relative -mb-px' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 border border-transparent'}`}
                                                >
                                                    <AlertTriangle className={`w-3 h-3 ${allAlertsActiveTab === i ? tab.color : 'text-slate-400'}`} />
                                                    {tab.label}
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${allAlertsActiveTab === i ? 'bg-red-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                                        {tab.count}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Tab content */}
                                        <div className="flex-1 min-h-0 overflow-auto">
                                            {/* PI Incomplete Till Check-out */}
                                            {allAlertsActiveTab === 0 && (
                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {piIncompleteListFull.length > 0 ? piIncompleteListFull.map((b, idx) => {
                                                            const dCheckout = daysSince(b.departureDate);
                                                            const isOverdue = dCheckout > 0;
                                                            return (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className={`text-[13px] font-bold tabular-nums ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>{dCheckout}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isOverdue ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                                            {isOverdue ? 'Overdue' : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }) : (
                                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* PI vs Invoice Amount Mismatch */}
                                            {allAlertsActiveTab === 1 && (
                                                <table className="w-full text-left text-sm min-w-[700px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Invoice Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Variance</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {reconDetailedFull.length > 0 ? reconDetailedFull.map((r, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{r.id}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(r as any).clientName || '—'}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(r.paymentVerify.piAmountSales || 0)}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(r.paymentVerify.tallyInvoiceAmount || 0)}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] tabular-nums whitespace-nowrap text-red-600">{formatINR(r.paymentVerify.differenceAmount || 0)}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-red-50 border border-red-200 text-red-700">
                                                                        Mismatch
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* Bank Entry Pending / Not Matched */}
                                            {allAlertsActiveTab === 2 && (
                                                <table className="w-full text-left text-sm min-w-[660px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Bank Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {bankEntryPendingFull.length > 0 ? bankEntryPendingFull.map((b, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-700">
                                                                        Pending
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* Overdue Payments */}
                                            {allAlertsActiveTab === 3 && (
                                                <table className="w-full text-left text-sm min-w-[660px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Overdue</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {overduePaymentsFull.length > 0 ? overduePaymentsFull.map((b, idx) => {
                                                            const days = daysSince(b.departureDate);
                                                            return (
                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className="text-[13px] font-bold tabular-nums text-red-600">{days}</span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-center">
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-red-50 border border-red-200 text-red-700">
                                                                            Overdue
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }) : (
                                                            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* Edit Form Update */}
                                            {allAlertsActiveTab === 4 && (
                                                <table className="w-full text-left text-sm min-w-[580px]">
                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                        <tr>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {editFormUpdateFull.length > 0 ? editFormUpdateFull.map((b, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-700">
                                                                        Pending
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        )) : (
                                                            <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No records found</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ── Footer ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {kpis.alerts.piIncompleteCheckout + reconDetailedFull.length + kpis.alerts.bankEntryPendingAlerts + kpis.alerts.overduePayments + editFormUpdateFull.length} total alerts
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    All categories · Accounts Dashboard
                                </span>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>



                {/* SECTION 3: PI vs Invoice vs Bank Receipts */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col md:col-span-2 lg:col-span-1 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-800 uppercase">PI vs Invoice vs Bank Receipts</span>
                        <div className="flex gap-2 text-[10px] font-bold items-center">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500"></span>PI Amount</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-500"></span>Invoice Amount</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-indigo-500"></span>Bank Received</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500"></span>Varience %</span>

                        </div>
                    </div>
                    <div className="p-2 flex-1 min-h-0" style={{ minHeight: 200 }}>
                        {/* {(() => {
                            return null;
                        })()} */}
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trendData} barGap={1} barCategoryGap="20%">
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#f1f5f9"
                                    />

                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 9, fill: "#64748b" }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        tickFormatter={shortINR}
                                        tick={{ fontSize: 9, fill: "#94a3b8" }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={40}
                                    />

                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (!active || !payload?.length) return null;

                                            const variance = payload[0]?.payload?.varience;

                                            const sortedPayload = [...payload].sort((a, b) => {
                                                const order = {
                                                    pi: 1,
                                                    invoice: 2,
                                                    received: 3,
                                                };

                                                return (
                                                    (order[a.dataKey] ?? 999) -
                                                    (order[b.dataKey] ?? 999)
                                                );
                                            });

                                            return (
                                                <div
                                                    className="rounded-lg border border-slate-200 bg-white p-2 shadow-md"
                                                    style={{ fontSize: "10px" }}
                                                >
                                                    <p className="mb-1 font-medium text-slate-700">
                                                        {label}
                                                    </p>

                                                    {sortedPayload.map((entry) => (
                                                        <div
                                                            key={entry.dataKey}
                                                            className="flex items-center justify-between gap-4 py-0.5"
                                                        >
                                                            <span style={{ color: entry.color }}>
                                                                {entry.name || entry.dataKey}
                                                            </span>

                                                            <span>{shortINR(Number(entry.value || 0))}</span>
                                                        </div>
                                                    ))}

                                                    {variance !== undefined && (
                                                        <div className="mt-1 flex items-center justify-between border-t pt-1">
                                                            <span className="text-slate-600">
                                                                variance
                                                            </span>

                                                            <span className="font-medium text-amber-600">
                                                                {variance}%
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />

                                    <Bar
                                        dataKey="pi"
                                        name="PI"
                                        fill="#3b82f6"
                                        radius={[2, 2, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="invoice"
                                        name="Invoice"
                                        fill="#14b8a6"
                                        radius={[2, 2, 0, 0]}
                                    />

                                    <Bar
                                        dataKey="received"
                                        name="Bank Received"
                                        fill="#6366f1"
                                        radius={[2, 2, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : null}

                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors duration-150 tracking-wide uppercase">
                                View Reconciliation Summary →
                            </div>
                        </DialogTrigger>

                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-indigo-500 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                        Reconciliation Summary
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {reconDetailedFull.length} bookings · Full report
                                </p>
                            </DialogHeader>

                            {/* ── Scrollable Table ── */}
                            <div className="flex-1 overflow-auto min-h-0">
                                <table className="w-full text-left text-sm min-w-[780px]">

                                    <thead className="sticky top-0 z-10 bg-[#24456b] border-b border-[#152e4d]">
                                        <tr className="bg-[#24456b]">
                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 text-left whitespace-nowrap border-r border-white/10">
                                                Booking ID
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 text-center whitespace-nowrap border-r border-white/10">
                                                PI Link
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-blue-200 text-center whitespace-nowrap border-r border-white/10">
                                                PI Amount
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-teal-200 text-center whitespace-nowrap border-r border-white/10">
                                                Invoice Amount
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-indigo-200 text-center whitespace-nowrap border-r border-white/10">
                                                Bank Received
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-indigo-200 text-center whitespace-nowrap border-r border-white/10">
                                                Variance
                                            </th>

                                            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-300 text-center whitespace-nowrap">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {reconDetailedFull.length > 0 ? (
                                            reconModalPaginated.map((b, i) => {
                                                const piTot = Number(b.paymentVerify.piAmountSales) || 0;
                                                const invTot = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
                                                const rcvd = Number(b.paymentVerify.totalReceivedBank) || 0;
                                                const varBank = piTot - rcvd;
                                                const isMatched = Math.round(varBank) === 0;
                                                const piUrl = b.paymentVerify.piUrl;
                                                const isValidPiUrl = piUrl && (piUrl.trim().toLowerCase().startsWith('http') || piUrl.trim().toLowerCase().startsWith('www'));

                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                        <td className="px-3 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap border-r border-slate-100">
                                                            {b.id || '—'}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center whitespace-nowrap border-r border-slate-100">
                                                            {isValidPiUrl ? (
                                                                <a href={piUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-semibold underline underline-offset-2 transition-colors">
                                                                    <ExternalLink className="w-3 h-3" /> View PI
                                                                </a>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">
                                                                    {piUrl && piUrl.trim() !== '' && piUrl.trim() !== '_' ? piUrl : 'Not uploaded'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-[12px] text-blue-700 tabular-nums border-r border-slate-100">
                                                            {formatINR(piTot)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-[12px] text-teal-700 tabular-nums border-r border-slate-100">
                                                            {formatINR(invTot)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-bold text-[12px] text-indigo-700 tabular-nums border-r border-slate-100">
                                                            {formatINR(rcvd)}
                                                        </td>
                                                        <td className={`px-3 py-2.5 text-center font-bold text-[12px] tabular-nums border-r border-slate-100 ${varBank !== 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                            {varBank > 0 ? `-${formatINR(varBank)}` : formatINR(varBank)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isMatched
                                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                                : 'bg-red-50 border border-red-200 text-red-700'
                                                                }`}>
                                                                {isMatched ? 'Matched' : 'Unmatched'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                    No reconciliation data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Footer ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {reconDetailedFull.length} total records
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-slate-400">
                                        Unmatched:{" "}
                                        <span className="font-bold text-red-600">
                                            {reconDetailedFull.filter(b => Math.round(Number(b.paymentVerify.piAmountSales || 0)) !== Math.round(Number(b.paymentVerify.totalReceivedBank || 0))).length}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Total PI:{" "}
                                        <span className="font-bold text-blue-700">
                                            {formatINR(reconDetailedFull.reduce((a, b) => a + Number(b.paymentVerify.piAmountSales || 0), 0))}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Total Rcvd:{" "}
                                        <span className="font-bold text-indigo-700">
                                            {formatINR(reconDetailedFull.reduce((a, b) => a + Number(b.paymentVerify.totalReceivedBank || 0), 0))}
                                        </span>
                                    </span>
                                </div>
                            </div>

                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ROW 2a: PI vs Bank Variance */}
            <div className="grid grid-cols-1 gap-4">

                {/* SECTION 10: PI vs Bank Received - Variance (Negative Differences Only) */}
                <div className="bg-white border border-amber-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 uppercase">PI vs Bank Received - Variance (Negative Differences Only)</span>
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{reconDetailedFull.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                <tr>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('id')}>Booking ID <SortIconLight config={reconSortConfig} field="id" /></th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Client Name</th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('pi')}>PI Amount <SortIconLight config={reconSortConfig} field="pi" /></th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('inv')}>Invoice <SortIconLight config={reconSortConfig} field="inv" /></th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('rcv')}>Bank Received <SortIconLight config={reconSortConfig} field="rcv" /></th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('varBank')}>Variance (Bank) <SortIconLight config={reconSortConfig} field="varBank" /></th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Variance %</th>
                                    <th className="p-2 font-bold uppercase text-center cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handleReconSort('status')}>Match Status <SortIconLight config={reconSortConfig} field="status" /></th>
                                    <th className="p-2 font-bold uppercase text-center cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Verified By</th>
                                    <th className="p-2 font-bold uppercase text-center cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Verify Status</th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Difference Reason</th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap">Remarks</th>
                                    <th className="p-2 font-bold uppercase text-center whitespace-nowrap">Management Verify</th>
                                    <th className="p-2 font-bold uppercase whitespace-nowrap">Management Remarks</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {reconDetailed.length > 0 ? reconDetailed.map((b, i) => {
                                    const pi = Number(b.paymentVerify.piAmountSales) || 0;
                                    const inv = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
                                    const rcv = Number(b.paymentVerify.amountReceived) || 0;
                                    const varBank = Number(b.paymentVerify.differenceAmount) || 0;
                                    const varPct = Number(b.paymentVerify.differencePercentage) || 0;
                                    const status = Math.round(rcv) === Math.round(pi) ? 'Matched' : 'Unmatched';
                                    const verifiedBy = b.paymentVerify.doer || '—';
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 whitespace-nowrap">
                                            <td className="p-2 font-mono text-blue-600">{b.id}</td>
                                            <td className="p-2 text-slate-700 font-medium">{(b as any).clientName || '—'}</td>
                                            <td className="p-2 text-right font-black tabular-nums">{formatINR(pi)}</td>
                                            <td className="p-2 text-right font-semibold text-slate-600 tabular-nums">{formatINR(inv)}</td>
                                            <td className="p-2 text-right font-semibold text-slate-600 tabular-nums">{formatINR(rcv)}</td>
                                            <td className={`p-2 text-right font-bold tabular-nums ${varBank > 0 ? 'text-emerald-600' : varBank < 0 ? 'text-red-600' : 'text-slate-600'}`}>{formatINR(varBank)}</td>
                                            <td className={`p-2 text-right font-bold tabular-nums ${varBank > 0 ? 'text-emerald-600' : varBank < 0 ? 'text-red-600' : 'text-slate-600'}`}>{varPct}%</td>
                                            <td className="p-2 text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${status === 'Matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="p-2 font-mono text-blue-600">{verifiedBy}</td>
                                            <td className="p-2 text-center whitespace-nowrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${b.paymentVerify.verifyStatus === 'Verified Done' ? 'bg-emerald-100 text-emerald-700' : b.paymentVerify.verifyStatus === 'Discrepancy' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {b.paymentVerify.verifyStatus || '—'}
                                                </span>
                                            </td>
                                            <td className="p-2 text-slate-600 max-w-[220px] whitespace-normal break-words leading-snug" title={b.paymentVerify.amtDiffReason || ''}>{b.paymentVerify.amtDiffReason ? b.paymentVerify.amtDiffReason.length > 40 ? b.paymentVerify.amtDiffReason.slice(0, 40) + '…' : b.paymentVerify.amtDiffReason : '—'}</td>
                                            <td className="p-2 text-slate-600 max-w-[220px] whitespace-normal break-words leading-snug" title={b.paymentVerify.remarks || ''}>{b.paymentVerify.remarks ? b.paymentVerify.remarks.length > 40 ? b.paymentVerify.remarks.slice(0, 40) + '…' : b.paymentVerify.remarks : '—'}</td>
                                            <td className="p-2 text-center">
                                                <Checkbox
                                                    checked={!!b.paymentVerify.managementVerify}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            openManagementModal(b);
                                                        }
                                                    }}
                                                    disabled={!canManageManagementVerify || !!b.paymentVerify.managementVerify}
                                                    aria-label={`Management verify for ${b.id}`}
                                                    className="border-blue-500 border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:data-[state=checked]:opacity-100"
                                                />
                                            </td>
                                            <td className="p-2 text-slate-600 max-w-[220px] whitespace-normal break-words leading-snug" title={b.paymentVerify.managementRemarks || ''}>
                                                {b.paymentVerify.managementVerify ? (b.paymentVerify.managementRemarks || '') : ''}
                                            </td>
                                        </tr>
                                    )
                                }) : <tr><td colSpan={13} className="p-4 text-center text-slate-400 italic">No detailed records found</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* View Full List Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors duration-150 tracking-wide uppercase">
                                View Full List →
                            </div>
                        </DialogTrigger>

                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                        PI vs Bank Received - Variance (Negative Differences Only)
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {reconDetailedFull.length} bookings · Full reconciliation report
                                </p>
                            </DialogHeader>

                            {/* ── Scrollable Table ── */}
                            <div className="flex-1 overflow-auto min-h-0">
                                <table className="w-full text-left text-sm min-w-[1100px]">
                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">PI Link</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Invoice</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Bank Received</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Variance (Bank)</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Variance %</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Match Status</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Verified By</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Verify Status</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Difference Reason</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Remarks</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Management Verify</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Management Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {reconDetailedFull.length > 0 ? (
                                            reconDetailedFull.map((b, i) => {
                                                const pi = Number(b.paymentVerify.piAmountSales) || 0;
                                                const inv = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
                                                const bankRcvd = Number(b.paymentVerify.totalReceivedBank) || 0;
                                                const varBank = Number(b.paymentVerify.differenceAmount) || 0;
                                                const varPct = Number(b.paymentVerify.differencePercentage) || 0;
                                                const rcv = Number(b.paymentVerify.amountReceived) || 0;
                                                const verifiedBy = b.paymentVerify.doer || '—';
                                                const status = Math.round(rcv) === Math.round(pi) ? 'Matched' : 'Unmatched';
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                        <td className="px-4 py-2.5 text-[13px] text-slate-700 font-medium whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            {b.paymentVerify.piUrl && (b.paymentVerify.piUrl.trim().toLowerCase().startsWith('http') || b.paymentVerify.piUrl.trim().toLowerCase().startsWith('www')) ? (
                                                                <a href={b.paymentVerify.piUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[11px] font-semibold underline underline-offset-2 transition-colors">
                                                                    <ExternalLink className="w-3 h-3" /> View PI
                                                                </a>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">{b.paymentVerify.piUrl && b.paymentVerify.piUrl.trim() !== '' && b.paymentVerify.piUrl.trim() !== '_' ? b.paymentVerify.piUrl : 'Not uploaded'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">{formatINR(pi)}</td>
                                                        <td className="px-4 py-2.5 text-right text-[13px] text-slate-500 tabular-nums whitespace-nowrap">{formatINR(inv)}</td>
                                                        <td className="px-4 py-2.5 text-right text-[13px] text-slate-500 tabular-nums whitespace-nowrap">{formatINR(bankRcvd)}</td>
                                                        <td className={`px-4 py-2.5 text-right font-bold text-[13px] tabular-nums whitespace-nowrap ${varBank > 0 ? 'text-emerald-600' : varBank < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                            {formatINR(varBank)}
                                                        </td>
                                                        <td className={`px-4 py-2.5 text-right font-bold text-[13px] tabular-nums whitespace-nowrap ${varBank > 0 ? 'text-emerald-600' : varBank < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                            {varPct}%
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${status === 'Matched'
                                                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                                : 'bg-red-50 border border-red-200 text-red-700'
                                                                }`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{verifiedBy}</td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${b.paymentVerify.verifyStatus === 'Verified Done' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : b.paymentVerify.verifyStatus === 'Discrepancy' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                                                {b.paymentVerify.verifyStatus || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-[12px] text-slate-600 max-w-[240px] whitespace-normal break-words leading-snug">{b.paymentVerify.amtDiffReason || '—'}</td>
                                                        <td className="px-4 py-2.5 text-[12px] text-slate-500 max-w-[220px] whitespace-normal break-words leading-snug">{b.paymentVerify.remarks || '—'}</td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <Checkbox
                                                                checked={!!b.paymentVerify.managementVerify}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        openManagementModal(b);
                                                                    }
                                                                }}
                                                                disabled={!canManageManagementVerify || !!b.paymentVerify.managementVerify}
                                                                aria-label={`Management verify for ${b.id}`}
                                                                className="border-blue-500 border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:data-[state=checked]:opacity-100"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2.5 text-[12px] text-slate-500 max-w-[220px] whitespace-normal break-words leading-snug">
                                                            {b.paymentVerify.managementVerify ? (b.paymentVerify.managementRemarks || '') : ''}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={14} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                    No detailed records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Footer ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {reconDetailedFull.length} total records
                                </span>
                                <div className="flex items-center gap-4 flex-wrap justify-end">
                                    {/* <span className="text-[11px] text-slate-400">
                                        Matched:{" "}
                                        <span className="font-bold text-emerald-600">
                                            {reconDetailedFull.filter(b => Math.round(Number(b.paymentVerify.piAmountSales || 0)) === Math.round(Number(b.paymentVerify.amountReceived || 0))).length}
                                        </span>
                                    </span> */}
                                    <span className="text-[11px] text-slate-400">
                                        Unmatched:{" "}
                                        <span className="font-bold text-red-600">
                                            {reconDetailedFull.filter(b => {
                                                const pi = Number(b.paymentVerify.piAmountSales) || 0;
                                                const rcv = Number(b.paymentVerify.amountReceived) || 0;
                                                return Math.round(pi) !== Math.round(rcv);
                                            }).length}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Total PI:{" "}
                                        <span className="font-bold text-slate-700">
                                            {formatINR(reconDetailedFull.reduce((a, b) => a + Number(b.paymentVerify.piAmountSales || 0), 0))}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={reconModalPage <= 1}
                                            onClick={() => setReconModalPage((p) => Math.max(1, p - 1))}
                                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wide"
                                        >
                                            Prev
                                        </Button>
                                        <span className="text-[11px] text-slate-500 font-semibold">
                                            Page {reconModalPage} of {reconModalTotalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={reconModalPage >= reconModalTotalPages}
                                            onClick={() => setReconModalPage((p) => Math.min(reconModalTotalPages, p + 1))}
                                            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wide"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </div>

                        </DialogContent>
                    </Dialog>
                </div>



            </div>

            {/* ROW 2 + ROW 3 MERGED: 2-column dashboard layout
                Left column  =  Post-Checkout PI, Invoice & Payment Collection Verification Status
(Pending / Completed) (top) + Bank Entry Pending (bottom), stacked
                Right column = Overall Employee Pending (spans the full height of the left column) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

                {/* LEFT COLUMN:  Post-Checkout PI, Invoice & Payment Collection Verification Status
(Pending / Completed) + Bank Entry Pending stacked vertically */}
                {/* <div className="flex flex-col gap-4"> */}

                {/* SECTION : Bank Collection Status */}
                {/* <div className="bg-white border border-red-200 rounded-lg shadow-sm flex flex-col">
                    <div className="px-3 py-2 border-b border-slate-100"><span className="text-xs font-bold text-slate-800 uppercase">Bank Collection Status</span></div>
                    <div className="p-2 flex-1 flex items-center justify-center relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                            <span className="text-sm font-black text-slate-800">{shortINR(kpis.bankStatus.totalAmt)}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Total Rcvd</span>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                                <Pie data={[
                                    { name: 'Matched', value: kpis.bankStatus.bankMatchedAmt, fill: '#10b981' },
                                    { name: 'Partially Matched', value: kpis.bankStatus.bankPartialAmt, fill: '#f59e0b' },
                                    { name: 'Unmatched/Pending', value: kpis.bankStatus.bankUnmatchedAmt, fill: '#ef4444' }
                                ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none" />
                                <Tooltip formatter={(val: number) => shortINR(val)} contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="px-3 pb-2 text-[9px] space-y-1">
                        <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Matched</span><span className="font-bold">{shortINR(kpis.bankStatus.bankMatchedAmt)} <span className="text-slate-400 font-normal ml-1">({kpis.bankStatus.totalAmt ? Math.round((kpis.bankStatus.bankMatchedAmt / kpis.bankStatus.totalAmt) * 100) : 0}%)</span></span></div>
                        <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Partially Matched</span><span className="font-bold">{shortINR(kpis.bankStatus.bankPartialAmt)} <span className="text-slate-400 font-normal ml-1">({kpis.bankStatus.totalAmt ? Math.round((kpis.bankStatus.bankPartialAmt / kpis.bankStatus.totalAmt) * 100) : 0}%)</span></span></div>
                        <div className="flex justify-between"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Unmatched/Pending</span><span className="font-bold">{shortINR(kpis.bankStatus.bankUnmatchedAmt)} <span className="text-slate-400 font-normal ml-1">({kpis.bankStatus.totalAmt ? Math.round((kpis.bankStatus.bankUnmatchedAmt / kpis.bankStatus.totalAmt) * 100) : 0}%)</span></span></div>
                    </div>
                </div> */}





                {/* SECTION 6:  Post-Checkout PI, Invoice & Payment Collection Verification Status
(Pending / Completed) */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase leading-snug"> Post-Checkout PI, Invoice & Payment Collection Verification Status
                        (Pending / Completed)</span></div>
                    <div className="flex-1 min-h-0 overflow-auto">

                        <table className="w-full min-w-[280px] text-left text-[10px]">
                            <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                <tr>
                                    <th className="p-2 font-bold uppercase hover:text-blue-200">Finance Exec</th>
                                    <th className="p-2 font-bold uppercase text-center hover:text-blue-200">Pending</th>
                                    <th className="p-2 font-bold uppercase text-center text-red-500">&gt;3 Days</th>
                                    <th className="p-2 font-bold uppercase text-right hover:text-blue-200">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {financeTeamData.map((f, i) => {
                                    const pendingInvRows = filteredWithPI.filter(b => (b.paymentVerify.doer || 'Unknown') === f.exec && b.paymentVerify.verifyStatus === 'Pending');
                                    const delayedInvRows = pendingInvRows.filter(b => daysSince(b.bookingDate) > 3);

                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2 font-semibold text-slate-700 truncate max-w-[80px]">{f.exec}</td>

                                            {/* Pending Clickable Cell */}
                                            <td className="p-2 text-center font-bold">
                                                <Dialog>
                                                    <DialogTrigger className="text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 cursor-pointer font-semibold">
                                                        {f.pendingInv}
                                                    </DialogTrigger>

                                                    <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                                        <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-1 h-5 rounded-full bg-green-500 shrink-0" />
                                                                <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                    Invoice Creation Pending — {f.exec}
                                                                </DialogTitle>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                {pendingInvRows.length} bookings · Full report
                                                            </p>
                                                        </DialogHeader>

                                                        <div className="flex-1 overflow-auto min-h-0">
                                                            <table className="w-full text-left text-sm min-w-[540px]">
                                                                <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Pending</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {pendingInvRows.length > 0 ? (
                                                                        pendingInvRows.map((b, idx) => {
                                                                            const days = daysSince(b.bookingDate);
                                                                            return (
                                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                        {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-center">
                                                                                        <span className={`text-[13px] font-bold tabular-nums ${days > 3 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                            {days}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                                No bookings found
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                {pendingInvRows.length} total bookings
                                                            </span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[11px] text-slate-400">
                                                                    {">"} 3 days:{" "}
                                                                    <span className="font-bold text-red-600">
                                                                        {pendingInvRows.filter(b => daysSince(b.bookingDate) > 3).length}
                                                                    </span>
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">
                                                                    Total PI:{" "}
                                                                    <span className="font-bold text-slate-700">
                                                                        {formatINR(pendingInvRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </td>

                                            {/* >3 Days Clickable Cell */}
                                            <td className="p-2 text-center font-bold">
                                                <Dialog>
                                                    <DialogTrigger className="text-red-600 underline decoration-red-400 underline-offset-2 hover:text-red-700 cursor-pointer font-semibold">
                                                        {f.invDelay}
                                                    </DialogTrigger>

                                                    <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                                        <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-1 h-5 rounded-full bg-red-500 shrink-0" />
                                                                <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                    Invoice Delayed (&gt;3 Days) — {f.exec}
                                                                </DialogTitle>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                {delayedInvRows.length} bookings · Overdue invoice creation
                                                            </p>
                                                        </DialogHeader>

                                                        <div className="flex-1 overflow-auto min-h-0">
                                                            <table className="w-full text-left text-sm min-w-[540px]">
                                                                <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Pending</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {delayedInvRows.length > 0 ? (
                                                                        delayedInvRows.map((b, idx) => {
                                                                            const days = daysSince(b.bookingDate);
                                                                            return (
                                                                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                    <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-700 whitespace-nowrap">{(b as any).clientName || '—'}</td>
                                                                                    <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                    <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                                    <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                        {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2.5 text-center">
                                                                                        <span className={`text-[13px] font-bold tabular-nums ${days > 7 ? 'text-red-600' : 'text-orange-500'}`}>
                                                                                            {days}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                                No bookings found
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                            <span className="text-[11px] text-slate-400 font-medium">
                                                                {delayedInvRows.length} total bookings
                                                            </span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-[11px] text-slate-400">
                                                                    {">"} 7 days:{" "}
                                                                    <span className="font-bold text-red-600">
                                                                        {delayedInvRows.filter(b => daysSince(b.bookingDate) > 7).length}
                                                                    </span>
                                                                </span>
                                                                <span className="text-[11px] text-slate-400">
                                                                    Total PI:{" "}
                                                                    <span className="font-bold text-slate-700">
                                                                        {formatINR(delayedInvRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                    </span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </td>

                                            <td className="p-2 text-right font-black tabular-nums">{shortINR(f.invAmt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SECTION 7: Bank Entry Pending */}
                {/* <div className="bg-white border border-red-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase leading-snug">Bank Entry Pending</span></div>
                        <div>
                            <table className="w-full min-w-[280px] text-left text-[10px]">
                                <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                    <tr>
                                        <th className="p-2 font-bold uppercase hover:text-blue-200">Finance Exec</th>
                                        <th className="p-2 font-bold uppercase text-center hover:text-blue-200">Pending</th>
                                        <th className="p-2 font-bold uppercase text-center text-red-500">&gt;3 Days</th>
                                        <th className="p-2 font-bold uppercase text-right hover:text-blue-200">Amt (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {financeTeamData.map((f, i) => {
                                        const pendingBankRows = filteredWithPI.filter(b => (b.paymentVerify.doer || 'Unknown') === f.exec && b.paymentVerify.verifyStatus === 'Pending' && (b.paymentVerify.amountReceived || 0) === 0);
                                        const delayedBankRows = pendingBankRows.filter(b => daysSince(b.bookingDate) > 3);

                                        return (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-semibold text-slate-700 truncate max-w-[80px]">{f.exec}</td>

                                               
                                                <td className="p-2 text-center font-bold">
                                                    <Dialog>
                                                        <DialogTrigger className="text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 cursor-pointer font-semibold">
                                                            {f.pendingBank}
                                                        </DialogTrigger>

                                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                                           
                                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1 h-5 rounded-full bg-indigo-500 shrink-0" />
                                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                        Bank Entry Pending — {f.exec}
                                                                    </DialogTitle>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                    {pendingBankRows.length} bookings · Full report
                                                                </p>
                                                            </DialogHeader>

                                                           
                                                            <div className="flex-1 overflow-auto min-h-0">
                                                                <table className="w-full text-left text-sm min-w-[540px]">
                                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Pending</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {pendingBankRows.length > 0 ? (
                                                                            pendingBankRows.map((b, idx) => {
                                                                                const days = daysSince(b.bookingDate);
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`text-[13px] font-bold tabular-nums ${days > 3 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                {days}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                                    No bookings found
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                   
                                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                                <span className="text-[11px] text-slate-400 font-medium">
                                                                    {pendingBankRows.length} total bookings
                                                                </span>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-[11px] text-slate-400">
                                                                        {">"} 3 days:{" "}
                                                                        <span className="font-bold text-red-600">
                                                                            {pendingBankRows.filter(b => daysSince(b.bookingDate) > 3).length}
                                                                        </span>
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Total PI:{" "}
                                                                        <span className="font-bold text-slate-700">
                                                                            {formatINR(pendingBankRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                        </DialogContent>
                                                    </Dialog>
                                                </td>

                                               
                                                <td className="p-2 text-center font-bold">
                                                    <Dialog>
                                                        <DialogTrigger className="text-red-600 underline underline-offset-2 hover:text-red-700 cursor-pointer font-semibold">
                                                            {f.bankDelay}
                                                        </DialogTrigger>

                                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                                        
                                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1 h-5 rounded-full bg-red-500 shrink-0" />
                                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                        Bank Entry Delayed (&gt;3 Days) — {f.exec}
                                                                    </DialogTitle>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                    {delayedBankRows.length} bookings · Full report
                                                                </p>
                                                            </DialogHeader>

                                                            
                                                            <div className="flex-1 overflow-auto min-h-0">
                                                                <table className="w-full text-left text-sm min-w-[540px]">
                                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking Date</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Pending</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {delayedBankRows.length > 0 ? (
                                                                            delayedBankRows.map((b, idx) => {
                                                                                const days = daysSince(b.bookingDate);
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingDate}</td>
                                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`text-[13px] font-bold tabular-nums ${days > 7 ? 'text-red-600' : 'text-orange-500'}`}>
                                                                                                {days}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                                                    No bookings found
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                           
                                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                                <span className="text-[11px] text-slate-400 font-medium">
                                                                    {delayedBankRows.length} total bookings
                                                                </span>
                                                                <div className="flex items-center gap-4">
                                                                    
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Total PI:{" "}
                                                                        <span className="font-bold text-slate-700">
                                                                            {formatINR(delayedBankRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>

                                                        </DialogContent>
                                                    </Dialog>
                                                </td>

                                                <td className="p-2 text-right font-black tabular-nums">{shortINR(f.bankAmt)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div> */}

                {/* </div>end LEFT COLUMN */}

                {/* RIGHT COLUMN: Overall Employee Pending — occupies the full height of the left column */}
                {/* SECTION 8: Overall Employee Pending Summary */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase leading-snug">Overall Employee Pending</span></div>
                    <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full min-w-[280px] text-left text-[10px]">
                            <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                <tr>
                                    <th className="p-2 font-bold uppercase hover:text-blue-200">Team</th>
                                    <th className="p-2 font-bold uppercase text-center hover:text-blue-200">Count</th>
                                    <th className="p-2 font-bold uppercase text-right hover:text-blue-200">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {employeePendingSummary.map((e, i) => {
                                    // --- popup type flags ---
                                    const isPIPopup = e.team === 'Sales Team (PI Incomplete)';
                                    const isInvoicePopup = e.team === 'Finance (Invoice Pending)';
                                    const isBankPopup = e.team === 'Finance (Bank Entry Pending)';

                                    // Data sets reused from existing derived lists
                                    const piPopupRows = piIncompleteListFull; // PI Incomplete Till Check-out
                                    const invoicePopupRows = filteredWithPI.filter(b =>
                                        b.paymentVerify.verifyStatus === 'Pending' && daysSince(b.bookingDate) > 3
                                    );
                                    const bankPopupRows = filteredWithPI.filter(b => {
                                        const rcvAmt = b.paymentVerify.amountReceived || 0;
                                        const daysCheckout = daysSince(b.departureDate);
                                        return rcvAmt === 0 && daysCheckout > 0;
                                    });

                                    const CountCell = ({ children }: { children: React.ReactNode }) => (
                                        <td className="p-2 text-center font-bold">{children}</td>
                                    );

                                    if (isPIPopup) {
                                        return (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-semibold text-slate-700">{e.team}</td>
                                                <CountCell>
                                                    <Dialog>
                                                        <DialogTrigger className="text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 cursor-pointer font-semibold">
                                                            {e.count}
                                                        </DialogTrigger>
                                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                        PI Incomplete List
                                                                    </DialogTitle>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                    {piPopupRows.length} bookings · Full report
                                                                </p>
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-auto min-h-0">
                                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {piPopupRows.length > 0 ? (
                                                                            piPopupRows.map((b, idx) => {
                                                                                const dCheckout = daysSince(b.departureDate);
                                                                                const isOverdue = dCheckout > 0;
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`text-[13px] font-bold tabular-nums ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                {dCheckout}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isOverdue ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                                                                {isOverdue ? 'Overdue' : 'Pending'}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No incomplete PIs found</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                                <span className="text-[11px] text-slate-400 font-medium">{piPopupRows.length} total bookings</span>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Overdue:{" "}
                                                                        <span className="font-bold text-red-600">
                                                                            {piPopupRows.filter(b => daysSince(b.departureDate) > 0).length}
                                                                        </span>
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Total PI:{" "}
                                                                        <span className="font-bold text-slate-700">
                                                                            {formatINR(piPopupRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CountCell>
                                                <td className="p-2 text-right font-black tabular-nums">{shortINR(e.amt)}</td>
                                            </tr>
                                        );
                                    }

                                    if (isInvoicePopup) {
                                        return (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-semibold text-slate-700">{e.team}</td>
                                                <CountCell>
                                                    <Dialog>
                                                        <DialogTrigger className="text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 cursor-pointer font-semibold">
                                                            {e.count}
                                                        </DialogTrigger>
                                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1 h-5 rounded-full bg-orange-400 shrink-0" />
                                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                        Finance — Invoice Pending
                                                                    </DialogTitle>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                    {invoicePopupRows.length} bookings · verifyStatus Pending &gt; 3 days from booking
                                                                </p>
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-auto min-h-0">
                                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days Since Booking</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Verify Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {invoicePopupRows.length > 0 ? (
                                                                            invoicePopupRows.map((b, idx) => {
                                                                                const daysBooked = daysSince(b.bookingDate);
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`text-[13px] font-bold tabular-nums ${daysBooked > 7 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                {daysBooked}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap bg-orange-50 border border-orange-200 text-orange-700">
                                                                                                Pending
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No invoice-pending bookings found</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                                <span className="text-[11px] text-slate-400 font-medium">{invoicePopupRows.length} total bookings</span>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Total PI:{" "}
                                                                        <span className="font-bold text-slate-700">
                                                                            {formatINR(invoicePopupRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CountCell>
                                                <td className="p-2 text-right font-black tabular-nums">{shortINR(e.amt)}</td>
                                            </tr>
                                        );
                                    }

                                    if (isBankPopup) {
                                        return (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className="p-2 font-semibold text-slate-700">{e.team}</td>
                                                <CountCell>
                                                    <Dialog>
                                                        <DialogTrigger className="text-blue-600 underline decoration-blue-400 underline-offset-2 hover:text-blue-800 cursor-pointer font-semibold">
                                                            {e.count}
                                                        </DialogTrigger>
                                                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">
                                                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-1 h-5 rounded-full bg-amber-500 shrink-0" />
                                                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                                        Bank Entry Pending / Not Matched
                                                                    </DialogTitle>
                                                                </div>
                                                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                                                    {bankPopupRows.length} bookings · Full pending list (Checkout passed, no amount received)
                                                                </p>
                                                            </DialogHeader>
                                                            <div className="flex-1 overflow-auto min-h-0">
                                                                <table className="w-full text-left text-sm min-w-[620px]">
                                                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days</th>
                                                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {bankPopupRows.length > 0 ? (
                                                                            bankPopupRows.map((b, idx) => {
                                                                                const dCheckout = daysSince(b.departureDate);
                                                                                return (
                                                                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                                        <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                                        <td className="px-4 py-2.5 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                                        <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                                        <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`text-[13px] font-bold tabular-nums ${dCheckout > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                                {dCheckout}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2.5 text-center">
                                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${dCheckout > 30 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                                                                {dCheckout > 30 ? 'Overdue' : 'Pending'}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })
                                                                        ) : (
                                                                            <tr>
                                                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">No pending bank entries found</td>
                                                                            </tr>
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                                                <span className="text-[11px] text-slate-400 font-medium">{bankPopupRows.length} total bookings</span>
                                                                <div className="flex items-center gap-4">
                                                                    {/* <span className="text-[11px] text-slate-400">
                                                                        Overdue (&gt;30 days):{" "}
                                                                        <span className="font-bold text-red-600">
                                                                            {bankPopupRows.filter(b => daysSince(b.departureDate) > 30).length}
                                                                        </span>
                                                                    </span> */}
                                                                    <span className="text-[11px] text-slate-400">
                                                                        Total PI:{" "}
                                                                        <span className="font-bold text-slate-700">
                                                                            {formatINR(bankPopupRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </CountCell>
                                                <td className="p-2 text-right font-black tabular-nums">{shortINR(e.amt)}</td>
                                            </tr>
                                        );
                                    }

                                    // Fallback — plain row (e.g. Accounts Reconciliation Pending)
                                    return (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-2 font-semibold text-slate-700">{e.team}</td>
                                            <td className="p-2 text-center font-bold">{e.count}</td>
                                            <td className="p-2 text-right font-black tabular-nums">{shortINR(e.amt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* BOTTOM ROW: Moved Sections — PI Pending, PI Completion, PI Incomplete, Top Overdue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* SECTION 5: PI Pending by Sales Agent */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase leading-snug">PI Pending By Sales Agent</span></div>
                    <div className="flex-1 min-h-0 overflow-auto">
                        <table className="w-full min-w-[280px] text-left text-[10px]">
                            <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                <tr>
                                    <th className="p-2 font-bold uppercase hover:text-blue-200">Sales Agent</th>
                                    <th className="p-2 font-bold uppercase text-center hover:text-blue-200">Total</th>
                                    <th className="p-2 font-bold uppercase text-center text-amber-500">Incomplete</th>
                                    {/* <th className="p-2 font-bold uppercase text-center text-red-600">Overdue</th> */}
                                    <th className="p-2 font-bold uppercase text-right hover:text-blue-200">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {salesAgentData.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-2 font-semibold text-slate-700 truncate max-w-[80px]">{s.agent}</td>
                                        <td className="p-2 text-center font-semibold text-slate-700">{s.total}</td>
                                        <td className="p-2 text-center font-bold text-amber-600">{s.incomplete}</td>
                                        {/* <td className="p-2 text-center font-bold text-red-600">{s.overdue}</td> */}
                                        <td className="p-2 text-right font-black tabular-nums">{shortINR(s.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors duration-150 tracking-wide uppercase">
                                View Full Report →
                            </div>
                        </DialogTrigger>

                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] max-h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                            {/* Header */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-blue-500 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                        PI Pending — By Sales Agent
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">Full report · All agents</p>
                            </DialogHeader>

                            {/* Scrollable Table Body */}
                            <div className="overflow-y-auto flex-1 overflow-x-auto">
                                <table className="w-full text-left min-w-[420px]">
                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                        <tr>
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white w-[45%]">
                                                Sales Agent
                                            </th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center">
                                                Total
                                            </th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-300 text-center">
                                                Incomplete
                                            </th>
                                            <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right">
                                                Amount (₹)
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {salesAgentDataFull.map((s, i) => (
                                            <tr
                                                key={i}
                                                className="hover:bg-slate-50/80 transition-colors duration-100 group"
                                            >
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-blue-500 uppercase">
                                                            {s.agent.charAt(0)}
                                                        </div>
                                                        <span className="text-[13px] font-semibold text-slate-700 leading-tight truncate max-w-[160px]">
                                                            {s.agent}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setPiAgentDrilldown({ agent: s.agent, mode: 'total' })}
                                                        className="text-[13px] font-semibold text-blue-600 underline underline-offset-2 decoration-blue-300 hover:text-blue-800 cursor-pointer tabular-nums"
                                                    >
                                                        {s.total}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => setPiAgentDrilldown({ agent: s.agent, mode: 'incomplete' })}
                                                        className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[12px] font-bold text-amber-600 tabular-nums underline underline-offset-2 decoration-amber-300 hover:bg-amber-100 cursor-pointer"
                                                    >
                                                        {s.incomplete}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className="text-[13px] font-bold text-slate-800 tabular-nums tracking-tight">
                                                        {formatINR(s.amount)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer Summary */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-[11px] text-black-400 font-bold">
                                    {salesAgentDataFull.length} agents
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-blue-400">
                                        Total incomplete:{" "}
                                        <span className="font-bold text-red-600">
                                            {salesAgentDataFull.reduce((a, s) => a + s.incomplete, 0)}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-blue-400">
                                        Total amount:{" "}
                                        <span className="font-bold text-slate-700">
                                            {formatINR(salesAgentDataFull.reduce((a, s) => a + s.amount, 0))}
                                        </span>
                                    </span>
                                </div>
                            </div>

                        </DialogContent>
                    </Dialog>

                    {/* ── PI Agent Drilldown Dialog ── */}
                    {piAgentDrilldown && (() => {
                        const { agent, mode } = piAgentDrilldown;
                        const agentBookings = filteredWithPI.filter(b => (b.bookingTakenBy || 'Unknown') === agent);
                        const drillRows = mode === 'total'
                            ? agentBookings
                            : agentBookings.filter(b => !b.paymentVerify.piUrl || b.paymentVerify.piUrl.trim() === '' || b.paymentVerify.piUrl.trim() === '_');

                        const totalPI = drillRows.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0);
                        const totalInv = drillRows.reduce((a, b) => a + (b.paymentVerify.tallyInvoiceAmount || 0), 0);
                        const totalRcv = drillRows.reduce((a, b) => a + (b.paymentVerify.amountReceived || 0), 0);

                        return (
                            <Dialog open={!!piAgentDrilldown} onOpenChange={(open) => { if (!open) setPiAgentDrilldown(null); }}>
                                <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                                    {/* Header */}
                                    <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-1 h-5 rounded-full shrink-0 ${mode === 'total' ? 'bg-blue-500' : 'bg-amber-400'}`} />
                                            <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                                {mode === 'total' ? 'All Bookings' : 'Incomplete PI Bookings'} — {agent}
                                            </DialogTitle>
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                            {drillRows.length} booking{drillRows.length !== 1 ? 's' : ''} · {mode === 'total' ? 'Full report' : 'PI not yet completed'}
                                        </p>
                                    </DialogHeader>

                                    {/* Scrollable Table */}
                                    <div className="flex-1 overflow-auto min-h-0">
                                        <table className="w-full text-left text-sm min-w-[700px]">
                                            <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                                <tr>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Invoice Amt</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Bank Rcvd</th>
                                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">PI Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {drillRows.length > 0 ? (
                                                    drillRows.map((b, idx) => {
                                                        const piAmt = b.paymentVerify.piAmountSales || 0;
                                                        const invAmt = b.paymentVerify.tallyInvoiceAmount || 0;
                                                        const rcvAmt = b.paymentVerify.amountReceived || 0;
                                                        const isDone = b.salesVerify.status === 'Done';
                                                        const isOverdue = !isDone && daysSince(b.departureDate) > 0;
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                                <td className="px-4 py-2.5 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                                <td className="px-4 py-2.5 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                                <td className="px-4 py-2.5 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                                    {formatINR(piAmt)}
                                                                </td>
                                                                <td className={`px-4 py-2.5 text-right font-semibold text-[13px] tabular-nums whitespace-nowrap ${invAmt === 0 ? 'text-slate-400 italic' : invAmt !== piAmt ? 'text-amber-600' : 'text-slate-600'}`}>
                                                                    {invAmt === 0 ? '—' : formatINR(invAmt)}
                                                                </td>
                                                                <td className={`px-4 py-2.5 text-right font-semibold text-[13px] tabular-nums whitespace-nowrap ${rcvAmt === 0 ? 'text-slate-400 italic' : rcvAmt < piAmt ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                                    {rcvAmt === 0 ? '—' : formatINR(rcvAmt)}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-center">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isDone
                                                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                                                        : isOverdue
                                                                            ? 'bg-red-50 border border-red-200 text-red-700'
                                                                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                        }`}>
                                                                        {isDone ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                            No bookings found for this agent
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer */}
                                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                        <span className="text-[11px] text-slate-500 font-medium">
                                            {drillRows.length} booking{drillRows.length !== 1 ? 's' : ''} · {agent}
                                        </span>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="text-[11px] text-slate-400">
                                                PI Total:{" "}
                                                <span className="font-bold text-slate-700">{formatINR(totalPI)}</span>
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                Invoice Total:{" "}
                                                <span className="font-bold text-blue-600">{totalInv > 0 ? formatINR(totalInv) : '—'}</span>
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                Bank Rcvd:{" "}
                                                <span className="font-bold text-emerald-600">{totalRcv > 0 ? formatINR(totalRcv) : '—'}</span>
                                            </span>
                                        </div>
                                    </div>

                                </DialogContent>
                            </Dialog>
                        );
                    })()}
                </div>

                {/* SECTION 2: PI Incompletion Status */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase">PI Incompletion Status</span></div>
                    <div className="p-2 flex-1 flex items-center justify-center relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                            <span className="text-sm font-black text-slate-800">{kpis.piStatus.piOverdueIncomplete}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Total PI</span>
                        </div>
                        <ResponsiveContainer width="100%" height={140}>
                            <PieChart>
                                <Pie
                                    data={salesAgentDataFull
                                        .filter(s => s.incomplete > 0)
                                        .map(s => ({ name: s.agent, value: s.incomplete }))
                                    }
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {salesAgentDataFull
                                        .filter(s => s.incomplete > 0)
                                        .map((s, idx, arr) => (
                                            <Cell key={`cell-${idx}`} fill={getAgentColor(idx, arr.length)} />
                                        ))
                                    }
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                                {/* <Pie data={[
                                    { name: 'Completed (Check-Out Done)', value: kpis.piStatus.piCompleted, fill: '#10b981' },
                                    { name: 'Incomplete (Check-Out Pending)', value: kpis.piStatus.piIncomplete, fill: '#f59e0b' },
                                    { name: 'Overdue Incomplete', value: kpis.piStatus.piOverdueIncomplete, fill: '#ef4444' }
                                ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none" />
                                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} /> */}
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* <div className="px-3 pb-2 text-[10px] space-y-1">
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Completed (Check-Out Done)</span>
                            <span className="font-bold text-slate-700">{kpis.piStatus.piCompleted} <span className="text-slate-400 font-normal ml-1">({kpis.piStatus.total ? Math.round((kpis.piStatus.piCompleted / kpis.piStatus.total) * 100) : 0}%)</span></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Incomplete (Check-Out Pending)</span>
                            <span className="font-bold text-slate-700">{kpis.piStatus.piIncomplete} <span className="text-slate-400 font-normal ml-1">({kpis.piStatus.total ? Math.round((kpis.piStatus.piIncomplete / kpis.piStatus.total) * 100) : 0}%)</span></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>Overdue Incomplete</span>
                            <span className="font-bold text-slate-700">{kpis.piStatus.piOverdueIncomplete} <span className="text-slate-400 font-normal ml-1">({kpis.piStatus.total ? Math.round((kpis.piStatus.piOverdueIncomplete / kpis.piStatus.total) * 100) : 0}%)</span></span>
                        </div>
                    </div> */}
                    <div className="px-3 pb-2 text-[10px] space-y-1 max-h-[120px] overflow-y-auto">
                        {salesAgentDataFull
                            .filter(s => s.incomplete > 0)
                            .sort((a, b) => b.incomplete - a.incomplete)
                            .map((s, idx, arr) => (
                                <div key={s.agent} className="flex justify-between">
                                    <span className="flex items-center gap-1">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: getAgentColor(idx, arr.length) }}
                                        ></span>
                                        {s.agent}
                                    </span>
                                    <span className="font-bold text-slate-700">{s.incomplete}</span>
                                </div>
                            ))
                        }
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* SECTION 9: PI Incomplete List */}
                <div className="bg-white border border-blue-200 rounded-lg shadow-sm flex flex-col lg:col-span-2 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-blue-800 uppercase">PI Incomplete List (Till Check-out)</span></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-[#1e3a5f] text-white border-b border-[#152e4d] whitespace-nowrap">
                                <tr>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('id')}>Booking ID <SortIconLight config={piSortConfig} field="id" /></th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('agent')}>Sales Agent <SortIconLight config={piSortConfig} field="agent" /></th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('checkin')}>Check-in <SortIconLight config={piSortConfig} field="checkin" /></th>
                                    <th className="p-2 font-bold uppercase cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('checkout')}>Check-out <SortIconLight config={piSortConfig} field="checkout" /></th>
                                    <th className="p-2 font-bold uppercase text-right cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('amount')}>PI Amount <SortIconLight config={piSortConfig} field="amount" /></th>
                                    <th className="p-2 font-bold uppercase text-center cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('days')}>Days <SortIconLight config={piSortConfig} field="days" /></th>
                                    <th className="p-2 font-bold uppercase text-center cursor-pointer select-none hover:text-blue-200 group whitespace-nowrap" onClick={() => handlePiSort('status')}>Status <SortIconLight config={piSortConfig} field="status" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {piIncompleteList.length > 0 ? piIncompleteList.map((b, i) => {
                                    const dCheckout = daysSince(b.departureDate);
                                    return (
                                        <tr key={i} className="hover:bg-slate-50 whitespace-nowrap">
                                            <td className="p-2 font-mono text-blue-600">{b.id}</td>
                                            <td className="p-2 font-semibold text-slate-700">{b.bookingTakenBy}</td>
                                            <td className="p-2 text-slate-600">{b.arrivalDate}</td>
                                            <td className="p-2 text-slate-600">{b.departureDate}</td>
                                            <td className="p-2 text-right font-black tabular-nums">{formatINR(b.paymentVerify.piAmountSales || 0)}</td>
                                            <td className="p-2 text-center font-bold text-red-600">{dCheckout}</td>
                                            <td className="p-2 text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${dCheckout > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {dCheckout > 0 ? 'Overdue' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                }) : <tr><td colSpan={7} className="p-4 text-center text-slate-400 italic">No incomplete PIs found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors duration-150 tracking-wide uppercase">
                                View Full List →
                            </div>
                        </DialogTrigger>

                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-amber-400 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                        PI Incomplete List
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {piIncompleteListFull.length} bookings · Full report
                                </p>
                            </DialogHeader>

                            {/* ── Scrollable table ── */}
                            <div className="flex-1 overflow-auto min-h-0">
                                <table className="w-full text-left text-sm min-w-[680px]">

                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-in</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Days</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-center whitespace-nowrap">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {piIncompleteListFull.length > 0 ? (
                                            piIncompleteListFull.map((b, i) => {
                                                const dCheckout = daysSince(b.departureDate);
                                                const isOverdue = dCheckout > 0;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                        <td className="px-4 py-3 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                        <td className="px-4 py-3 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                        <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">{b.arrivalDate}</td>
                                                        <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                            {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`text-[13px] font-bold tabular-nums ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                                                {dCheckout}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isOverdue
                                                                ? 'bg-red-50 border border-red-200 text-red-700'
                                                                : 'bg-amber-50 border border-amber-200 text-amber-700'
                                                                }`}>
                                                                {isOverdue ? 'Overdue' : 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                    No incomplete PIs found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Footer summary ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {piIncompleteListFull.length} total bookings
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-slate-400">
                                        Overdue:{" "}
                                        <span className="font-bold text-red-600">
                                            {piIncompleteListFull.filter(b => daysSince(b.departureDate) > 0).length}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Total PI:{" "}
                                        <span className="font-bold text-slate-700">
                                            {formatINR(piIncompleteListFull.reduce((a, b) => a + (b.paymentVerify.piAmountSales || 0), 0))}
                                        </span>
                                    </span>
                                </div>
                            </div>

                        </DialogContent>
                    </Dialog>
                </div>

                {/* SECTION 11: Top Overdue Accounts */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100"><span className="text-xs font-bold text-slate-800 uppercase">Top Overdue Accounts (Outstanding)</span></div>
                    <div className="p-3 space-y-2 flex-1">
                        {topOverdueAccounts.length > 0 ? topOverdueAccounts.map((a, i) => (
                            <div key={i} className="flex items-center justify-between group hover:bg-slate-50 p-1 rounded">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="w-4 h-4 rounded text-[9px] font-bold bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    <span className="text-[10px] font-semibold text-slate-700 truncate">{a.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-red-600 tabular-nums">{formatINR(a.outstanding)}</span>
                            </div>
                        )) : <div className="text-[10px] text-center text-slate-400 italic py-4">No overdue accounts</div>}
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="px-3 py-2 border-t border-slate-100 text-[11px] font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 text-center transition-colors duration-150 tracking-wide uppercase">
                                View Full List →
                            </div>
                        </DialogTrigger>

                        <DialogContent className="w-[98vw] sm:w-[96vw] lg:w-[84vw] sm:max-w-none lg:max-w-[1440px] h-[85vh] flex flex-col p-0 gap-0 rounded-xl overflow-hidden [&_[data-slot=dialog-close]]:text-slate-600">

                            {/* ── Header ── */}
                            <DialogHeader className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-100 via-white to-indigo-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-5 rounded-full bg-red-400 shrink-0" />
                                    <DialogTitle className="text-[15px] font-semibold text-blue-900 leading-tight">
                                        Overdue Accounts — Full List
                                    </DialogTitle>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 ml-3.5">
                                    {overdueAccountsListFull.length} accounts · Full report
                                </p>
                            </DialogHeader>

                            {/* ── Scrollable table ── */}
                            <div className="flex-1 overflow-auto min-h-0">
                                <table className="w-full text-left text-sm min-w-[680px]">

                                    <thead className="sticky top-0 z-10 bg-[#1e3a5f] border-b border-[#152e4d]">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Booking ID</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Client Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Sales Agent</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Check-out</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">PI Amount</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Received</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white text-right whitespace-nowrap">Outstanding</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {overdueAccountsListFull.length > 0 ? (
                                            overdueAccountsListFull.map((b, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 transition-colors duration-100">
                                                    <td className="px-4 py-3 font-mono text-[12px] text-blue-600 whitespace-nowrap">{b.id}</td>
                                                    <td className="px-4 py-3 font-semibold text-[13px] text-slate-700 whitespace-nowrap">{b.clientName}</td>
                                                    <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">{b.bookingTakenBy}</td>
                                                    <td className="px-4 py-3 text-[13px] text-slate-500 whitespace-nowrap">{b.departureDate}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-[13px] text-slate-800 tabular-nums whitespace-nowrap">
                                                        {formatINR(b.paymentVerify.piAmountSales || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-[13px] text-slate-500 tabular-nums whitespace-nowrap">
                                                        {formatINR(b.paymentVerify.amountReceived || 0)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-[13px] text-red-600 tabular-nums whitespace-nowrap">
                                                        {formatINR(b.outstanding)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-[13px] italic">
                                                    No overdue accounts found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ── Footer summary ── */}
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 shrink-0 flex items-center justify-between flex-wrap gap-2">
                                <span className="text-[11px] text-slate-400 font-medium">
                                    {overdueAccountsListFull.length} total accounts
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-[11px] text-slate-400">
                                        Total Outstanding:{" "}
                                        <span className="font-bold text-red-600">
                                            {formatINR(overdueAccountsListFull.reduce((acc, b) => acc + b.outstanding, 0))}
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        Total PI:{" "}
                                        <span className="font-bold text-slate-700">
                                            {formatINR(overdueAccountsListFull.reduce((acc, b) => acc + (b.paymentVerify.piAmountSales || 0), 0))}
                                        </span>
                                    </span>
                                </div>
                            </div>

                        </DialogContent>
                    </Dialog>
                </div>

            </div>

            {/* SECTION 12: Daily Operation Summary Strip */}
            <div className="bg-slate-800 rounded-lg shadow-md border border-slate-700 overflow-hidden mt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-700/50 divide-y lg:divide-y-0">
                    {[
                        { label: 'Total Bookings', val: kpis.piStatus.total, icon: <Users className="w-3.5 h-3.5 text-slate-400" /> },
                        { label: 'Check-in Today', val: filtered.filter(b => daysSince(b.arrivalDate) === 0).length, icon: <Calendar className="w-3.5 h-3.5 text-blue-400" /> },
                        { label: 'Check-out Today', val: filtered.filter(b => daysSince(b.departureDate) === 0).length, icon: <Calendar className="w-3.5 h-3.5 text-amber-400" /> },
                        { label: 'Invoice Created Today', val: filtered.filter(b => b.paymentVerify.verifyStatus === 'Verified Done' && daysSince(b.paymentVerify.bankReceivedDate) === 0).length, icon: <FileText className="w-3.5 h-3.5 text-green-400" /> },
                        { label: 'Bank Receipts Today', val: formatINR(filtered.filter(b => daysSince(b.paymentVerify.bankReceivedDate) === 0).reduce((acc, b) => acc + (b.paymentVerify.amountReceived || 0), 0)), icon: <IndianRupee className="w-3.5 h-3.5 text-purple-400" /> },
                        { label: 'Overdue > 30 Days', val: formatINR(filtered.filter(b => daysSince(b.departureDate) > 30).reduce((acc, b) => acc + ((b.paymentVerify.piAmountSales || 0) - (b.paymentVerify.amountReceived || 0)), 0)), icon: <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> },
                    ].map((k, i) => (
                        <div key={i} className="p-3 flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">{k.label}</span>
                                <span className="text-sm font-black text-white tabular-nums">{k.val}</span>
                            </div>
                            <div className="bg-slate-700/50 p-1.5 rounded">{k.icon}</div>
                        </div>
                    ))}
                </div>
            </div>

        </div >
    );
}/* ─────────────────────────────────────────────
   SORT ICON HELPER
───────────────────────────────────────────── */
const SortIcon = ({ config, field }: { config: { key: string; direction: 'asc' | 'desc' } | null; field: string }) => {
    if (!config || config.key !== field) {
        return <ArrowUpDown className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />;
    }
    return config.direction === 'asc' ? (
        <ChevronUp className="w-3 h-3 text-white" />
    ) : (
        <ChevronDown className="w-3 h-3 text-white" />
    );
};

const SortIconLight = ({ config, field }: { config: { key: string; direction: 'asc' | 'desc' } | null; field: string }) => {
    if (!config || config.key !== field) {
        return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors ml-1 inline" />;
    }
    return config.direction === 'asc' ? (
        <ChevronUp className="w-3 h-3 text-blue-300 ml-1 inline" />
    ) : (
        <ChevronDown className="w-3 h-3 text-blue-300 ml-1 inline" />
    );
};

export default function AccountsTrackerPage() {
    const { bookings: apiBookings, loading, refresh } = useAccountsTracker();
    const { hasPermission, user } = useAuth();
    const role: UserRole = 'admin';
    const isSuperAdmin = hasPermission('all') || user?.permissions?.includes('all') || user?.role === 'super_admin' || user?.role === 'admin';
    const canManageManagementVerify = isSuperAdmin || hasPermission('management.authority');
    const [viewMode, setViewMode] = useState<'table' | 'analytics'>('analytics');
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    const [searchQuery, setSearchQuery] = useState('');
    const [datePreset, setDatePreset] = useState<string>('this_month');
    const [customDateFrom, setCustomDateFrom] = useState<string>('');
    const [customDateTo, setCustomDateTo] = useState<string>('');
    const [filterStaff, setFilterStaff] = useState('All');
    const [filterSalesStatus, setFilterSalesStatus] = useState('All');
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');
    const [salesModal, setSalesModal] = useState<Booking | null>(null);
    const [paymentModal, setPaymentModal] = useState<Booking | null>(null);
    const [paymentTab, setPaymentTab] = useState<'summary' | 'reconciliation' | 'verification' | 'docs'>('summary');
    const [paymentAction, setPaymentAction] = useState<'idle' | 'confirming' | 'reporting' | 'processing' | 'success'>('idle');
    const [discrepancyNote, setDiscrepancyNote] = useState('');
    const [managementModal, setManagementModal] = useState<Booking | null>(null);
    const [managementRemarks, setManagementRemarks] = useState('');
    const [managementSaving, setManagementSaving] = useState(false);
    const [managementError, setManagementError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    // (No local uiLoading state needed anymore as per requirements)

    // ── Pending-actions API (Shoukat/FO + Suresh/Accounts) — owned here so both
    //    this page's KPI cards and AnalyticsDashboardInline can use the same data ──
    const [paApiData, setPaApiData] = useState<PendingActionsApiData | null>(null);

    const openManagementModal = (booking: Booking) => {
        if (!canManageManagementVerify) return;
        setManagementModal(booking);
        setManagementRemarks('');
        setManagementError('');
    };

    const closeManagementModal = () => {
        if (managementSaving) return;
        setManagementModal(null);
        setManagementRemarks('');
        setManagementError('');
    };


    const handleManagementSave = async () => {
        if (!managementModal || managementSaving) return;
        if (!managementRemarks.trim()) {
            setManagementError('Remarks are required.');
            return;
        }

        setManagementSaving(true);
        setManagementError('');
        try {
            const response = await fetch('/api/account-tracker/management-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reservationId: managementModal.paymentVerify.reservationId,
                    remarks: managementRemarks.trim(),
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result?.success) {
                throw new Error(result?.error || 'Failed to save management verification');
            }

            await refresh();
            setManagementModal(null);
            setManagementRemarks('');
        } catch (error: any) {
            setManagementError(error?.message || 'Failed to save management verification');
        } finally {
            setManagementSaving(false);
        }
    };

    useEffect(() => {
        fetch(PENDING_ACTIONS_API, { redirect: 'follow' })
            .then(r => r.json())
            .then((res: { status?: string; data?: PendingActionsApiData }) => {
                if (res?.data) setPaApiData(res.data);
            })
            .catch(() => { /* silently fail */ });
    }, []);

    // ── Derived: Suresh → unique bookings across ALL stages (accountsVerify, newBookings, finalTransfer, deleteComplete) ──
    const sureshSettlementEntries = useMemo<PaBookingEntry[]>(() => {
        if (!paApiData?.accountagent) return [];
        const key = Object.keys(paApiData.accountagent).find(k => k.toLowerCase().includes('suresh')) ?? '';
        const agentData = paApiData.accountagent[key];
        if (!agentData) return [];
        const allEntries = [
            ...(agentData.newBookings ?? []),
            ...(agentData.accountsVerify ?? []),
            ...(agentData.finalTransfer ?? []),
            ...(agentData.deleteComplete ?? []),
        ];
        // Deduplicate by bookingid — ek ID multiple stages mein ho toh sirf ek bar count ho
        const seen = new Set<string>();
        return allEntries.filter(e => {
            if (seen.has(e.bookingid)) return false;
            seen.add(e.bookingid);
            return true;
        });
    }, [paApiData]);

    // ── Derived: Shoukat → unique bookings across ALL stages where receivedpercent < 100 ──
    const shoukatFoEntries = useMemo<PaBookingEntry[]>(() => {
        if (!paApiData?.foagent) return [];
        const key = Object.keys(paApiData.foagent).find(k => k.toLowerCase().includes('shouk') || k.toLowerCase().includes('moosa')) ?? '';
        const agentData = paApiData.foagent[key];
        if (!agentData) return [];
        const allEntries = [
            ...(agentData.newBookings ?? []),
            ...(agentData.accountsVerify ?? []),
            ...(agentData.finalTransfer ?? []),
            ...(agentData.deleteComplete ?? []),
        ];
        // Deduplicate by bookingid first, then filter incomplete payments
        const seen = new Set<string>();
        return allEntries.filter(e => {
            if (seen.has(e.bookingid)) return false;
            seen.add(e.bookingid);
            return (e.receivedpercent ?? 0) < 100;
        });
    }, [paApiData]);

    // Account Data Upload — prefetch once on mount so the modal opens instantly
    const [accountDataRows, setAccountDataRows] = useState<AccountDataUploadRow[]>([]);
    const [accountDataLoading, setAccountDataLoading] = useState(true);
    const [accountDataError, setAccountDataError] = useState<string | null>(null);
    const loadAccountData = React.useCallback(async () => {
        setAccountDataLoading(true);
        setAccountDataError(null);
        try {
            const res = await fetch(ACCOUNT_DATA_UPLOAD_API, { redirect: 'follow' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            let list: unknown = json;
            if (!Array.isArray(json) && json && typeof json === 'object') {
                const obj = json as Record<string, unknown>;
                const arrKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
                list = arrKey ? obj[arrKey] : [obj];
            }
            setAccountDataRows(Array.isArray(list) ? (list as AccountDataUploadRow[]) : []);
        } catch (e) {
            setAccountDataError(e instanceof Error ? e.message : 'Failed to load data');
            setAccountDataRows([]);
        } finally {
            setAccountDataLoading(false);
        }
    }, []);
    useEffect(() => { loadAccountData(); }, [loadAccountData]);


    // (No useEffect for uiLoading needed anymore as per requirements)


    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'bookingDate', direction: 'desc' });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    const parseAmount = (val: string | number) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return parseFloat(val.replace(/,/g, ''));
    };

    const uniqueStaff = ['All', ...Array.from(new Set(apiBookings.map((b) => b.bookingTakenBy))).values()];
    const uniqueSalesStatuses = ['All', ...Array.from(new Set(apiBookings.map((b) => b.salesVerify.status))).values()];
    const uniquePaymentStatuses = ['All', ...Array.from(new Set(apiBookings.map((b) => b.paymentVerify.verifyStatus))).values()];

    // Parse "DD Mon YYYY" strings into Date objects
    function parseBookingDate(dateStr: string): Date | null {
        const parsed = new Date(dateStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Compute date range bounds from preset
    function getPresetRange(preset: string): { from: Date | null; to: Date | null } {
        const now = new Date();
        const startOfDay = (d: Date) => { d.setHours(0, 0, 0, 0); return d; };
        const endOfDay = (d: Date) => { d.setHours(23, 59, 59, 999); return d; };
        if (preset === 'All') return { from: null, to: null };
        if (preset === 'today') return { from: startOfDay(new Date(now)), to: endOfDay(new Date(now)) };
        if (preset === 'yesterday') {
            const y = new Date(now); y.setDate(y.getDate() - 1);
            return { from: startOfDay(y), to: endOfDay(new Date(y)) };
        }
        if (preset === 'this_week') {
            const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
            return { from: startOfDay(mon), to: endOfDay(new Date(now)) };
        }
        if (preset === 'last_week') {
            const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7) - 7);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            return { from: startOfDay(mon), to: endOfDay(sun) };
        }
        if (preset === 'this_month') {
            const from = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from, to: endOfDay(new Date(now)) };
        }
        if (preset === 'last_month') {
            const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const to = new Date(now.getFullYear(), now.getMonth(), 0);
            return { from, to: endOfDay(to) };
        }
        if (preset === 'this_year') {
            return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(new Date(now)) };
        }
        if (preset === 'last_year') {
            return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) };
        }
        return { from: null, to: null };
    }

    // Stats Base — everything EXCEPT the payment status filter
    const statsBase = useMemo(() => {
        let rangeFrom: Date | null = null;
        let rangeTo: Date | null = null;
        if (datePreset === 'custom') {
            rangeFrom = customDateFrom ? new Date(customDateFrom) : null;
            rangeTo = customDateTo ? new Date(customDateTo + 'T23:59:59') : null;
        } else {
            const r = getPresetRange(datePreset);
            rangeFrom = r.from;
            rangeTo = r.to;
        }

        return apiBookings.filter((b) => {
            const q = searchQuery.toLowerCase();
            const matchSearch = !q || b.clientName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.bookingTakenBy.toLowerCase().includes(q);

            let matchDate = true;
            if (rangeFrom || rangeTo) {
                const arrDate = parseBookingDate(b.arrivalDate);
                if (arrDate) {
                    if (rangeFrom && arrDate < rangeFrom) matchDate = false;
                    if (rangeTo && arrDate > rangeTo) matchDate = false;
                }
            }

            const matchStaff = filterStaff === 'All' || b.bookingTakenBy === filterStaff;
            const matchSales = filterSalesStatus === 'All' || b.salesVerify.status === filterSalesStatus;
            return matchSearch && matchDate && matchStaff && matchSales;
        });
    }, [apiBookings, searchQuery, datePreset, customDateFrom, customDateTo, filterStaff, filterSalesStatus]);

    const filtered = useMemo(() => {
        return statsBase.filter((b) => filterPaymentStatus === 'All' || b.paymentVerify.verifyStatus === filterPaymentStatus);
    }, [statsBase, filterPaymentStatus]);

    const filteredWithPI = useMemo(() => {
        return filtered.filter(b => (b.paymentVerify.piAmountSales || 0) > 0);
    }, [filtered]);

    const reconDetailedFull = useMemo(() => {
        return filteredWithPI.filter(b => {
            const isVerifiedOrDiscrepancy = b.paymentVerify.verifyStatus === 'Verified Done' || b.paymentVerify.verifyStatus === 'Discrepancy';
            const pi = Number(b.paymentVerify.piAmountSales) || 0;
            const inv = Number(b.paymentVerify.tallyInvoiceAmount) || 0;
            const rcv = Number(b.paymentVerify.amountReceived) || 0;
            const differenceAmount = Number(b.paymentVerify.differenceAmount) || 0;
            return isVerifiedOrDiscrepancy && !(pi === 0 && inv === 0 && rcv === 0) && differenceAmount < 0;
        });
    }, [filteredWithPI]);

    const varianceStats = useMemo(() => {
        const totalVariance = reconDetailedFull.reduce((sum, b) => sum + (Number(b.paymentVerify.differenceAmount) || 0), 0);
        const sumPct = reconDetailedFull.reduce((sum, b) => sum + (Number(b.paymentVerify.differencePercentage) || 0), 0);
        const avgVariancePct = reconDetailedFull.length > 0 ? (sumPct / reconDetailedFull.length) : 0;
        const totalActualReceived = reconDetailedFull.reduce((sum, b) => sum + (Number(b.paymentVerify.totalReceivedBank) || 0), 0);
        return {
            totalVariance,
            avgVariancePct,
            count: reconDetailedFull.length,
            totalActualReceived
        };
    }, [reconDetailedFull]);

    const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const sortedTable2 = useMemo(() => {
        const data = [...filtered];
        const { key, direction } = sortConfig;

        data.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (key) {
                case 'bookingDate':
                    aValue = a.bookingDateRaw;
                    bValue = b.bookingDateRaw;
                    break;
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'clientName':
                    aValue = a.clientName.toLowerCase();
                    bValue = b.clientName.toLowerCase();
                    break;
                case 'arrivalDate':
                    aValue = parseBookingDate(a.arrivalDate)?.getTime() || 0;
                    bValue = parseBookingDate(b.arrivalDate)?.getTime() || 0;
                    break;
                case 'departureDate':
                    aValue = parseBookingDate(a.departureDate)?.getTime() || 0;
                    bValue = parseBookingDate(b.departureDate)?.getTime() || 0;
                    break;
                case 'daysOfStay':
                    aValue = a.daysOfStay;
                    bValue = b.daysOfStay;
                    break;
                case 'piAmountSales':
                    aValue = a.paymentVerify.piAmountSales;
                    bValue = b.paymentVerify.piAmountSales;
                    break;
                case 'tallyInvoiceAmount':
                    aValue = a.paymentVerify.tallyInvoiceAmount;
                    bValue = b.paymentVerify.tallyInvoiceAmount;
                    break;
                case 'amountReceived':
                    aValue = parseAmount(a.paymentVerify.amountReceived);
                    bValue = parseAmount(b.paymentVerify.amountReceived);
                    break;
                case 'differenceAmount':
                    aValue = a.paymentVerify.differenceAmount;
                    bValue = b.paymentVerify.differenceAmount;
                    break;
                case 'differencePercentage':
                    aValue = a.paymentVerify.differencePercentage;
                    bValue = b.paymentVerify.differencePercentage;
                    break;
                case 'doer':
                    aValue = a.paymentVerify.doer.toLowerCase();
                    bValue = b.paymentVerify.doer.toLowerCase();
                    break;
                case 'verifyStatus':
                    aValue = a.paymentVerify.verifyStatus.toLowerCase();
                    bValue = b.paymentVerify.verifyStatus.toLowerCase();
                    break;
                case 'amtDiffReason':
                    aValue = (a.paymentVerify.amtDiffReason || '').toLowerCase();
                    bValue = (b.paymentVerify.amtDiffReason || '').toLowerCase();
                    break;
                case 'remarks':
                    aValue = (a.paymentVerify.remarks || '').toLowerCase();
                    bValue = (b.paymentVerify.remarks || '').toLowerCase();
                    break;
                case 'bookingTakenBy':
                    aValue = a.bookingTakenBy.toLowerCase();
                    bValue = b.bookingTakenBy.toLowerCase();
                    break;
                default:
                    aValue = 0;
                    bValue = 0;
            }

            // Push invalid/empty/N/A values to the bottom regardless of sort direction
            const isAInvalid = aValue === null || aValue === undefined || aValue === '' || aValue === 'N/A' || aValue === 0;
            const isBInvalid = bValue === null || bValue === undefined || bValue === '' || bValue === 'N/A' || bValue === 0;

            if (isAInvalid && isBInvalid) return 0;
            if (isAInvalid) return 1;
            if (isBInvalid) return -1;

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [filtered, sortConfig]);

    const paginated2 = sortedTable2.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    // Stats — reactive to ALL filters (reflecting table data)
    const totalBookingsCount = filtered.length;
    const totalAmountValue = filtered.reduce((sum, b) => sum + (b.paymentVerify.piAmountSales || 0), 0);

    // verifiedAt blank → always Pending, regardless of verifyStatus
    // verifyStatus === 'Verified Done' AND verifiedAt present → Payment Verified
    const isEffectivelyPending = (b: Booking) => {
        const va = b.paymentVerify.verifiedAt;
        const isBlankVerifiedAt = !va || va.trim() === '' || va.trim() === '_' || va.trim() === '-';
        return isBlankVerifiedAt || b.paymentVerify.verifyStatus !== 'Verified Done';
    };

    const paymentPendingItems = filtered.filter((b) => isEffectivelyPending(b));
    const paymentPendingCount = paymentPendingItems.length;
    const paymentPendingValue = paymentPendingItems.reduce((sum, b) => sum + (b.paymentVerify.piAmountSales || 0), 0);

    const totalBilledValue = filtered.reduce((sum, b) => {
        const v = parseInt((b.salesVerify.totalBilledValue || '0').replace(/,/g, ''));
        return sum + (isNaN(v) ? 0 : v);
    }, 0);

    // PI=0 wale charts mein nahi dikhane — sirf KPI/account-head section ke liye
    // Account Head Verification Pending — bookings missing actualRaw
    const accountHeadVerificationList = useMemo(() => {
        return filteredWithPI.filter(b => isBlankField(b.paymentVerify.actualRaw));
    }, [filteredWithPI]);

    // Total Pending (top KPI card) — count = sum of the other 4 cards' counts (overlaps allowed);
    // amount = sum of piAmount over the UNIQUE set of booking ids across all 4 sources (no double-counting)
    const totalPendingSummary = useMemo(() => {
        const count = shoukatFoEntries.length
            + sureshSettlementEntries.length
            + accountDataRows.length
            + accountHeadVerificationList.length;

        const amountById = new Map<string, number>();

        shoukatFoEntries.forEach(e => {
            const key = normalizeBookingId(e.bookingid);
            if (key) amountById.set(key, e.piamount || 0);
        });
        sureshSettlementEntries.forEach(e => {
            const key = normalizeBookingId(e.bookingid);
            if (key) amountById.set(key, e.piamount || 0);
        });
        accountDataRows.forEach(e => {
            const key = normalizeBookingId(e.bookingId);
            if (key) amountById.set(key, Number(String(e.piAmount ?? '').replace(/[^0-9.-]/g, '')) || 0);
        });
        accountHeadVerificationList.forEach(b => {
            const key = normalizeBookingId(b.id);
            if (key) amountById.set(key, b.paymentVerify.piAmountSales || 0);
        });

        const amount = Array.from(amountById.values()).reduce((sum, v) => sum + v, 0);

        return { count, amount };
    }, [shoukatFoEntries, sureshSettlementEntries, accountDataRows, accountHeadVerificationList]);


    return (
        <DashboardLayout>
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
                    <img src="/grouploader.gif" alt="Loading..." className="w-48 h-48" />
                    <p className="text-sm font-semibold text-slate-500 tracking-wide">Loading data...</p>
                </div>
            ) : null}
            <div style={{
                opacity: loading ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out',
                display: loading ? 'none' : undefined
            }} className="space-y-6">                {/* Hero Header Section */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-10 mb-6">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div className="w-full">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                                        <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-none break-words">
                                            KTAHV Accounts Tracker
                                        </h1>
                                        <p className="text-xs sm:text-sm lg:text-base text-white/80 mt-1 font-medium">
                                            Comprehensive verification workflow for billing and payment reconciliation
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                                <div className="w-[190px] h-[105px] flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
                                    <p className="text-[11px] uppercase tracking-[1.5px] text-white/60 font-semibold mb-2">
                                        Total Bookings
                                    </p>

                                    <p className="text-4xl sm:text-5xl font-bold text-white leading-none tabular-nums">
                                        {totalBookingsCount}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                    Filters & Search
                                </h3>
                                <p className="text-xs text-slate-500">Refine the verification list</p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearchQuery('');
                                setDatePreset('All');
                                setCustomDateFrom('');
                                setCustomDateTo('');
                                setFilterStaff('All');
                                setFilterSalesStatus('All');
                                setFilterPaymentStatus('All');
                                setCurrentPage(1);
                            }}
                            className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
                        >
                            Clear Filters
                        </Button>
                    </div>

                    <div className="px-4 sm:px-5 py-4 bg-white space-y-3">
                        {/* Single row — all 5 filters equal width */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {/* Search Leads */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search Leads</label>
                                <Input
                                    placeholder="Search by client, ID, staff..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="h-10 w-full rounded-md border-gray-300"
                                />
                            </div>

                            {/* Date Range Preset */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</label>
                                <Select value={datePreset} onValueChange={(val) => { setDatePreset(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                        <SelectValue placeholder="Select range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            { value: 'All', label: 'All Time' },
                                            { value: 'today', label: 'Today' },
                                            { value: 'yesterday', label: 'Yesterday' },
                                            { value: 'this_week', label: 'This Week' },
                                            { value: 'last_week', label: 'Last Week' },
                                            { value: 'this_month', label: 'This Month' },
                                            { value: 'last_month', label: 'Last Month' },
                                            { value: 'this_year', label: 'This Year' },
                                            { value: 'last_year', label: 'Last Year' },
                                            { value: 'custom', label: 'Custom Range' },
                                        ].map((o) => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Booking Taken By */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Booking Taken By</label>
                                <Select value={filterStaff} onValueChange={(val) => { setFilterStaff(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueStaff.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sales Verify */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Sales Verify</label>
                                <Select value={filterSalesStatus} onValueChange={(val) => { setFilterSalesStatus(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueSalesStatuses.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Payment Verify */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment Verify</label>
                                <Select value={filterPaymentStatus} onValueChange={(val) => { setFilterPaymentStatus(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniquePaymentStatuses.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Custom Date Range — second row, shown only when preset = custom */}
                        {datePreset === 'custom' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">From Date</label>
                                    <Input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={(e) => { setCustomDateFrom(e.target.value); setCurrentPage(1); }}
                                        className="h-10 w-full rounded-md border-gray-300"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">To Date</label>
                                    <Input
                                        type="date"
                                        value={customDateTo}
                                        onChange={(e) => { setCustomDateTo(e.target.value); setCurrentPage(1); }}
                                        className="h-10 w-full rounded-md border-gray-300"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Variance Analytics Section */}
                <div className="relative mb-6">
                    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-md border border-orange-500/40 flex-shrink-0">
                                    <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Variance Analytics
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Real-time summary from "PI vs Bank Received - Variance (Negative Differences Only)"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="p-3 sm:p-4 bg-slate-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                                {/* Actual Received */}
                                <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight">
                                            Actual Received
                                        </p>
                                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {formatINR(varianceStats.totalActualReceived)}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                        Bank Received
                                    </span>
                                </div>

                                {/* Total Variance */}
                                <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight">
                                            Total Variance
                                        </p>
                                        <IndianRupee className="w-3.5 h-3.5 text-red-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {formatINR(varianceStats.totalVariance)}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                        Negative Sum
                                    </span>
                                </div>

                                {/* Average Variance % */}
                                <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight">
                                            Average Variance %
                                        </p>
                                        <TrendingDown className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {varianceStats.avgVariancePct.toFixed(2)}%
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                        Arithmetic Avg
                                    </span>
                                </div>

                                {/* Variance Count */}
                                <div className="bg-slate-50/70 border-2 border-slate-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 leading-tight">
                                            Variance Count
                                        </p>
                                        <Users className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {varianceStats.count}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                        Displayed Rows
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics Section */}
                <div className="relative">
                    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">

                        {/* Header — lead assign KPI se exact match */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40 flex-shrink-0">
                                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Key Performance Indicators
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Real-time verification metrics and billing summary
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="p-3 sm:p-4 bg-slate-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">

                                {/* Total Bookings */}
                                <div className="bg-slate-50/70 border-2 border-slate-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 leading-tight">
                                            Total Pending
                                        </p>
                                        <Users className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {totalPendingSummary.count}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                        {formatINR(totalPendingSummary.amount)}
                                    </span>
                                </div>

                                {/* Payment Pending */}
                                <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight">
                                            FO Full Payment Upload Pending
                                        </p>
                                        <Clock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {shoukatFoEntries.length}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                        {formatINR(shoukatFoEntries.reduce((acc, e) => acc + (e.piamount || 0), 0))}
                                    </span>
                                </div>

                                {/* Payment Verified */}
                                <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight">
                                            Accounts Settlement Pending
                                        </p>
                                        <IndianRupee className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {sureshSettlementEntries.length}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                        {formatINR(sureshSettlementEntries.reduce((acc, e) => acc + (e.piamount || 0), 0))}
                                    </span>
                                </div>


                                {/* Complimentary */}
                                <div className="bg-violet-50/70 border-2 border-violet-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 leading-tight">
                                            Account Data Upload Pending
                                        </p>
                                        <ShieldCheck className="w-3.5 h-3.5 text-violet-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {accountDataRows.length}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">
                                        {formatINR(accountDataRows.reduce((acc, e) => acc + (Number(String(e.piAmount ?? '').replace(/[^0-9.-]/g, '')) || 0), 0))}
                                    </span>
                                </div>


                                {/* Discrepancies */}
                                <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight">
                                            Account Head Verification Pending
                                        </p>
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {accountHeadVerificationList.length}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                                        {formatINR(accountHeadVerificationList.reduce((sum, b) => sum + (b.paymentVerify.piAmountSales || 0), 0))}
                                    </span>
                                </div>

                                {/* Total Billed */}
                                {/*<div className="bg-indigo-50/70 border-2 border-indigo-300 rounded-lg p-2.5 sm:p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start justify-between gap-1.5 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 leading-tight">
                                            Total Billed
                                        </p>
                                        <BarChart3 className="w-3.5 h-3.5 text-indigo-700 flex-shrink-0 mt-px" />
                                    </div>
                                    <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none mb-2 break-all">
                                        {formatINR(totalBilledValue)}
                                    </p>
                                    <span className="inline-block text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                        billing total
                                    </span>
                                </div>*/}

                            </div>
                        </div>

                    </div>
                </div>

                {/* Stage 1: Sales Verification Table - HIDDEN BY REQUEST */}
                {/* 
                <div className="relative">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                    <ClipboardList className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Stage 1: Sales Verification
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Verify PI amounts and billing details from sales team
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {canExport(role) && (
                                    <Button variant="outline" size="sm" className="h-9 gap-2 bg-white border-slate-300 text-slate-700 font-bold hover:bg-blue-50 hover:text-blue-200 transition-all shadow-sm">
                                        <Download className="h-3.5 w-3.5" /> Export Data
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-1">
                            <Table>
                                <TableHeader style={{ backgroundColor: '#1e3a5f' }}>
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="w-[50px] text-center text-xs font-bold text-white uppercase tracking-wider py-3 border-r border-white/10" style={{ backgroundColor: '#1e3a5f' }}>#</TableHead>
                                        <TableHead className="sticky left-0 z-20 text-xs font-bold text-white uppercase tracking-wider py-3 shadow-[2px_0_5px_rgba(0,0,0,0.2)]" style={{ backgroundColor: '#1e3a5f' }}>Client Name</TableHead>
                                        <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Res. ID</TableHead>
                                        <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Programme</TableHead>
                                        <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>PI Amount</TableHead>
                                        <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Total Billed</TableHead>
                                        <TableHead className="text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Booking By</TableHead>
                                        <TableHead className="text-center text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Status</TableHead>
                                        <TableHead className="text-center text-xs font-bold text-white uppercase tracking-wider py-3" style={{ backgroundColor: '#1e3a5f' }}>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100">
                                    {paginated.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-40 text-center text-slate-400 italic bg-slate-50/50">No records found matching filters</TableCell>
                                        </TableRow>
                                    ) : paginated.map((b, idx) => {
                                        const isActive = salesModal?.id === b.id;
                                        const isDiscrepancy = b.salesVerify.status === 'Discrepancy';
                                        return (
                                            <TableRow
                                                key={`sales-${b.id}`}
                                                onClick={() => setSalesModal(b)}
                                                className={`transition-colors group cursor-pointer ${isActive ? "bg-blue-200" : (isDiscrepancy ? "bg-amber-50/40" : "bg-white")} ${isActive ? "hover:bg-blue-300/40" : "hover:bg-blue-100"}`}
                                            >
                                                <TableCell className="text-center font-medium text-slate-400 tabular-nums">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                                                <TableCell className="sticky left-0 bg-inherit z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm group-hover:scale-105 transition-transform">
                                                            {getInitials(b.clientName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-semibold text-slate-900 truncate leading-tight">{b.clientName}</div>
                                                            <div className="text-[11px] text-slate-500">{b.mobile}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-bold text-blue-600 tabular-nums">{b.id}</TableCell>
                                                <TableCell className="max-w-[200px]">
                                                    <div className="text-xs text-slate-600 truncate" title={b.programmeName}>
                                                        {b.programmeName}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-700 tabular-nums">
                                                    {b.salesVerify.bookingPIAmount !== '0' ? `₹ ${b.salesVerify.bookingPIAmount}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-green-700 tabular-nums">
                                                    {b.salesVerify.totalBilledValue !== '0' ? `₹ ${b.salesVerify.totalBilledValue}` : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                                            {getInitials(b.bookingTakenBy)}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-slate-600 uppercase">{b.bookingTakenBy}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        onClick={(e) => { e.stopPropagation(); setSalesModal(b); }}
                                                        className={`cursor-pointer border transition-all hover:scale-105 active:scale-95 shadow-sm font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 ${b.salesVerify.status === 'Done' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            b.salesVerify.status === 'Discrepancy' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                'bg-red-100 text-red-700 border-red-200'
                                                            }`}
                                                    >
                                                        {b.salesVerify.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); setSalesModal(b); }}
                                                        className="h-8 px-3 text-blue-600 hover:text-white hover:bg-blue-600 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all cursor-pointer"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                Showing {filtered.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} entries
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter"
                                >
                                    Prev
                                </Button>
                                {Array.from({ length: Math.ceil(filtered.length / rowsPerPage) }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === Math.ceil(filtered.length / rowsPerPage) || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 text-xs px-0.5">...</span>}
                                            <Button
                                                variant={currentPage === p ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCurrentPage(p)}
                                                className={`h-7 w-7 p-0 text-[10px] font-bold ${currentPage === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'}`}
                                            >
                                                {p}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= Math.ceil(filtered.length / rowsPerPage)}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                */}

                {/* Stage 2: Payment Reconciliation Table */}
                <div className="relative">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden flex flex-col">
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                                    <IndianRupee className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Payment Reconciliation
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Final payment verification and bank statement matching
                                    </p>
                                </div>
                            </div>
                            {/* View Toggle — indigo pill (matches reference image) */}
                            <div className="flex items-center bg-slate-100 rounded-full p-1 gap-0.5 flex-shrink-0 self-start sm:self-auto">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${viewMode === 'table'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <TableIcon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Table View</span>
                                    <span className="sm:hidden">Table</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('analytics')}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${viewMode === 'analytics'
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <LineChartIcon className="w-3.5 h-3.5" />
                                    Analytics
                                </button>
                            </div>
                        </div>

                        {/* Analytics View — fully self-contained, no external components */}
                        <div className="w-full min-w-0 overflow-hidden" style={{ display: viewMode === 'analytics' ? 'block' : 'none' }}>
                            <div className="w-full min-w-0 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
                                <AnalyticsDashboardInline
                                    filtered={filtered}
                                    allBookings={apiBookings}
                                    sureshSettlementEntries={sureshSettlementEntries}
                                    shoukatFoEntries={shoukatFoEntries}
                                    paApiData={paApiData}
                                    accountDataRows={accountDataRows}
                                    accountDataLoading={accountDataLoading}
                                    accountDataError={accountDataError}
                                    loadAccountData={loadAccountData}
                                    canManageManagementVerify={canManageManagementVerify}
                                    openManagementModal={openManagementModal}
                                />
                            </div>
                        </div>

                        {/* Table Content */}
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 flex-1" style={{ overflowX: 'auto', display: viewMode === 'table' ? 'block' : 'none' }}>
                            <table className="w-full caption-bottom text-sm border-collapse" style={{ minWidth: 'max-content' }}>
                                <thead style={{ backgroundColor: '#1e3a5f' }}>
                                    <tr className="border-none">
                                        {/* S.No — always sticky col 1, left:0 */}
                                        <th className="text-center text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap border-r border-white/10" style={{ position: 'sticky', left: 0, zIndex: 30, backgroundColor: '#1e3a5f', width: '48px', minWidth: '48px' }}>S.No</th>

                                        {/* Booking Date */}
                                        <th
                                            onClick={() => handleSort('bookingDate')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ ...(isMobile ? {} : { position: 'sticky', left: '48px', zIndex: 30 }), backgroundColor: '#1e3a5f', minWidth: '110px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Booking Date
                                                <SortIcon config={sortConfig} field="bookingDate" />
                                            </div>
                                        </th>

                                        {/* Booking ID */}
                                        <th
                                            onClick={() => handleSort('id')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ ...(isMobile ? {} : { position: 'sticky', left: '158px', zIndex: 30 }), backgroundColor: '#1e3a5f', minWidth: '150px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Booking ID
                                                <SortIcon config={sortConfig} field="id" />
                                            </div>
                                        </th>

                                        {/* Client Details */}
                                        <th
                                            onClick={() => handleSort('clientName')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ position: 'sticky', left: isMobile ? '48px' : '308px', zIndex: 30, backgroundColor: '#1e3a5f', minWidth: '200px', boxShadow: '4px 0 8px rgba(0,0,0,0.25)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Client Details
                                                <SortIcon config={sortConfig} field="clientName" />
                                            </div>
                                        </th>

                                        {/* Check In */}
                                        <th
                                            onClick={() => handleSort('arrivalDate')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '100px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Check In
                                                <SortIcon config={sortConfig} field="arrivalDate" />
                                            </div>
                                        </th>

                                        {/* Check Out */}
                                        <th
                                            onClick={() => handleSort('departureDate')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '100px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Check Out
                                                <SortIcon config={sortConfig} field="departureDate" />
                                            </div>
                                        </th>

                                        {/* Stay */}
                                        <th
                                            onClick={() => handleSort('daysOfStay')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap text-center cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '80px' }}
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                Stay
                                                <SortIcon config={sortConfig} field="daysOfStay" />
                                            </div>
                                        </th>

                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '110px' }}>Package Type</th>
                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '170px' }}>Programme Name</th>
                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '150px' }}>Room Details</th>

                                        {/* Booking Taken By */}
                                        <th
                                            onClick={() => handleSort('bookingTakenBy')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '150px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Booking Taken By
                                                <SortIcon config={sortConfig} field="bookingTakenBy" />
                                            </div>
                                        </th>

                                        {/* PI Amt (Sales) */}
                                        <th
                                            onClick={() => handleSort('piAmountSales')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '120px', borderLeft: '1px solid rgba(255,255,255,0.2)', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                PI Amt (Sales)
                                                <SortIcon config={sortConfig} field="piAmountSales" />
                                            </div>
                                        </th>

                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#164e63', minWidth: '70px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>PI URL</th>

                                        {/* Tally Inv Amt */}
                                        <th
                                            onClick={() => handleSort('tallyInvoiceAmount')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '130px', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Tally Inv Amt
                                                <SortIcon config={sortConfig} field="tallyInvoiceAmount" />
                                            </div>
                                        </th>

                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#164e63', minWidth: '90px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Invoice URL</th>

                                        {/* Amt Rcvd in Bank */}
                                        <th
                                            onClick={() => handleSort('amountReceived')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '130px', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Amt Rcvd in Bank
                                                <SortIcon config={sortConfig} field="amountReceived" />
                                            </div>
                                        </th>

                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#164e63', minWidth: '80px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>Amt Proof</th>

                                        {/* Diff Amt */}
                                        <th
                                            onClick={() => handleSort('differenceAmount')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '110px', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Diff Amt
                                                <SortIcon config={sortConfig} field="differenceAmount" />
                                            </div>
                                        </th>

                                        {/* Diff % */}
                                        <th
                                            onClick={() => handleSort('differencePercentage')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '70px', borderRight: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Diff %
                                                <SortIcon config={sortConfig} field="differencePercentage" />
                                            </div>
                                        </th>

                                        {/* Doer */}
                                        <th
                                            onClick={() => handleSort('doer')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#164e63', minWidth: '120px', borderRight: '1px solid rgba(255,255,255,0.2)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Doer
                                                <SortIcon config={sortConfig} field="doer" />
                                            </div>
                                        </th>

                                        {/* Verify Status */}
                                        <th
                                            onClick={() => handleSort('verifyStatus')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '120px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Verify Status
                                                <SortIcon config={sortConfig} field="verifyStatus" />
                                            </div>
                                        </th>

                                        {/* Diff Reason */}
                                        <th
                                            onClick={() => handleSort('amtDiffReason')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '140px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Diff Reason
                                                <SortIcon config={sortConfig} field="amtDiffReason" />
                                            </div>
                                        </th>

                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '100px' }}>Name Check</th>

                                        {/* Remarks */}
                                        <th
                                            onClick={() => handleSort('remarks')}
                                            className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-white/10 transition-colors group"
                                            style={{ backgroundColor: '#1e3a5f', minWidth: '130px' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                Remarks
                                                <SortIcon config={sortConfig} field="remarks" />
                                            </div>
                                        </th>
                                        <th className="text-center text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '120px' }}>Management Verify</th>
                                        <th className="text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '160px' }}>Management Remarks</th>

                                        <th className="text-center text-xs font-bold text-white uppercase tracking-wider py-3 px-3 whitespace-nowrap" style={{ backgroundColor: '#1e3a5f', minWidth: '80px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={25} className="h-40 text-center text-slate-400 italic bg-slate-50/50 py-10">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                                                    <span className="font-bold uppercase tracking-widest text-xs">Loading records from server...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : paginated2.length === 0 ? (
                                        <tr>
                                            <td colSpan={25} className="h-40 text-center text-slate-400 italic bg-slate-50/50 py-10">No records found matching filters</td>
                                        </tr>
                                    ) : paginated2.map((b, idx) => {
                                        const isActive = paymentModal?.id === b.id;
                                        const isDiscrepancy = b.paymentVerify.verifyStatus === 'Discrepancy';
                                        const rowBg = isActive ? '#bfdbfe' : (isDiscrepancy ? '#fefce8' : '#ffffff');
                                        const alwaysSticky = (left: string): React.CSSProperties => ({
                                            position: 'sticky',
                                            left,
                                            zIndex: 10,
                                            backgroundColor: rowBg,
                                        });
                                        const desktopSticky = (left: string): React.CSSProperties => isMobile
                                            ? { backgroundColor: rowBg }
                                            : { position: 'sticky', left, zIndex: 10, backgroundColor: rowBg };
                                        return (
                                            <tr
                                                key={`payment-${b.id}`}
                                                className={`transition-colors group ${isActive ? 'bg-blue-200' : (isDiscrepancy ? 'bg-amber-50/40' : 'bg-white')} ${isActive ? 'hover:bg-blue-300/40' : 'hover:bg-blue-100'}`}
                                            >
                                                {/* S.No — always sticky */}
                                                <td className="text-center font-medium text-slate-400 tabular-nums py-3 px-3 text-xs" style={alwaysSticky('0px')}>{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                                                {/* Booking Date — desktop sticky only */}
                                                <td className="text-xs font-medium text-slate-600 whitespace-nowrap py-3 px-3" style={desktopSticky('48px')}>{b.bookingDate || '_'}</td>
                                                {/* Booking ID — desktop sticky only */}
                                                <td
                                                    className="text-xs font-bold text-blue-600 hover:opacity-80 transition-opacity tabular-nums whitespace-nowrap py-3 px-3"
                                                    style={desktopSticky('158px')}
                                                >
                                                    {b.id}
                                                </td>
                                                {/* Client Details — always sticky, offset depends on mobile/desktop */}
                                                <td className="py-3 px-3" style={{ ...alwaysSticky(isMobile ? '48px' : '308px'), boxShadow: '4px 0 8px rgba(0,0,0,0.08)', minWidth: '200px' }}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm group-hover:scale-105 transition-transform">
                                                            {getInitials(b.clientName)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-semibold text-slate-900 truncate leading-tight" style={{ maxWidth: '140px' }}>{b.clientName}</div>
                                                            <div className="text-[10px] text-slate-500 tabular-nums">{b.mobile}</div>
                                                            <div className="text-[10px] text-slate-400 truncate" style={{ maxWidth: '140px' }}>{b.email || '_'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Check In */}
                                                <td className="text-xs font-medium text-slate-600 whitespace-nowrap py-3 px-3">{b.arrivalDate}</td>
                                                {/* Check Out */}
                                                <td className="text-xs font-medium text-slate-600 whitespace-nowrap py-3 px-3">{b.departureDate}</td>
                                                {/* Stay */}
                                                <td className="text-xs font-semibold text-slate-700 tabular-nums text-center whitespace-nowrap py-3 px-3">{b.daysOfStay}N</td>
                                                {/* Package Type */}
                                                <td className="py-3 px-3">
                                                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-[9px] px-1.5 py-0.5 uppercase tracking-wide whitespace-nowrap">
                                                        {b.packageType}
                                                    </Badge>
                                                </td>
                                                {/* Programme Name */}
                                                <td className="py-3 px-3" style={{ maxWidth: '170px' }}>
                                                    <div className="text-[11px] text-slate-600 truncate" title={b.programmeName}>{b.programmeName}</div>
                                                </td>
                                                {/* Room Details */}
                                                <td className="py-3 px-3" style={{ minWidth: '150px' }}>
                                                    <div className="text-[11px] font-semibold text-slate-700">{b.roomNo || '_'}</div>
                                                    <div className="text-[10px] text-slate-500">{b.roomCategory} · {b.roomType}</div>
                                                </td>
                                                {/* Booking Taken By */}
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                                            {getInitials(b.bookingTakenBy)}
                                                        </div>
                                                        <span className="text-[11px] font-medium text-slate-600 uppercase">{b.bookingTakenBy}</span>
                                                    </div>
                                                </td>
                                                {/* PI Amt (Sales) */}
                                                <td className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap py-3 px-3">{formatINR(b.paymentVerify.piAmountSales)}</td>
                                                {/* PI URL */}
                                                <td className="py-3 px-3">
                                                    {b.paymentVerify.piUrl && (b.paymentVerify.piUrl.trim().toLowerCase().startsWith('http') || b.paymentVerify.piUrl.trim().toLowerCase().startsWith('www')) ? (
                                                        <a href={b.paymentVerify.piUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
                                                            <FileText className="w-3 h-3 flex-shrink-0" /> PI
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-500 text-[11px] font-medium">
                                                            {b.paymentVerify.piUrl && b.paymentVerify.piUrl.trim() !== '' ? b.paymentVerify.piUrl : '_'}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Tally Inv Amt */}
                                                <td className="text-xs font-semibold text-slate-700 tabular-nums whitespace-nowrap py-3 px-3">{formatINR(b.paymentVerify.tallyInvoiceAmount)}</td>
                                                {/* Invoice URL */}
                                                <td className="py-3 px-3">
                                                    {b.paymentVerify.invoiceLink && (b.paymentVerify.invoiceLink.trim().toLowerCase().startsWith('http') || b.paymentVerify.invoiceLink.trim().toLowerCase().startsWith('www')) ? (
                                                        <a href={b.paymentVerify.invoiceLink} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
                                                            <FileText className="w-3 h-3 flex-shrink-0" /> Invoice
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-500 text-[11px] font-medium">
                                                            {b.paymentVerify.invoiceLink && b.paymentVerify.invoiceLink.trim() !== '' ? b.paymentVerify.invoiceLink : '_'}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Amt Rcvd in Bank */}
                                                <td className="text-xs font-semibold text-emerald-700 tabular-nums whitespace-nowrap py-3 px-3">
                                                    {b.paymentVerify.amountReceived !== 0 ? formatINR(b.paymentVerify.amountReceived) : '₹0'}
                                                </td>
                                                {/* Amt Proof */}
                                                <td className="py-3 px-3">
                                                    {b.paymentVerify.proofLink && (b.paymentVerify.proofLink.trim().toLowerCase().startsWith('http') || b.paymentVerify.proofLink.trim().toLowerCase().startsWith('www')) ? (
                                                        <a href={b.paymentVerify.proofLink} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
                                                            <CheckCircle className="w-3 h-3 flex-shrink-0" /> Proof
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-500 text-[11px] font-medium">
                                                            {b.paymentVerify.proofLink && b.paymentVerify.proofLink.trim() !== '' ? b.paymentVerify.proofLink : '_'}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Diff Amt */}
                                                <td className={`text-xs font-bold tabular-nums whitespace-nowrap py-3 px-3 ${b.paymentVerify.differenceAmount > 0 ? 'text-amber-600' : b.paymentVerify.differenceAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {b.paymentVerify.differenceAmount !== 0 ? formatINR(b.paymentVerify.differenceAmount) : '₹0'}
                                                </td>
                                                {/* Diff % */}
                                                <td className={`text-xs font-bold tabular-nums whitespace-nowrap py-3 px-3 ${b.paymentVerify.differencePercentage > 0 ? 'text-amber-600' : b.paymentVerify.differencePercentage < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {b.paymentVerify.differencePercentage}%
                                                </td>
                                                {/* Doer */}
                                                <td className="text-xs font-medium text-slate-600 uppercase whitespace-nowrap py-3 px-3">{b.paymentVerify.doer}</td>
                                                {/* Verify Status */}
                                                <td className="py-3 px-3">
                                                    <Badge
                                                        onClick={(e) => { e.stopPropagation(); setPaymentModal(b); }}
                                                        className={`cursor-pointer transition-all hover:scale-105 active:scale-95 font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 whitespace-nowrap ${!isEffectivelyPending(b) ? 'bg-green-100 text-green-700 border-green-200' : b.paymentVerify.verifyStatus === 'Discrepancy' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {!isEffectivelyPending(b) ? 'Verified Done' : 'Pending'}
                                                    </Badge>
                                                </td>
                                                {/* Diff Reason */}
                                                <td className="py-3 px-3" style={{ maxWidth: '140px' }}>
                                                    <div className="text-[11px] text-slate-600 truncate" title={b.paymentVerify.amtDiffReason}>
                                                        {b.paymentVerify.amtDiffReason || '_'}
                                                    </div>
                                                </td>
                                                {/* Name Check */}
                                                <td className="text-xs font-medium text-slate-600 whitespace-nowrap py-3 px-3">{b.paymentVerify.nameCorrect || '_'}</td>
                                                {/* Remarks */}
                                                <td className="py-3 px-3" style={{ maxWidth: '140px' }}>
                                                    <div className="text-[11px] text-slate-600 truncate" title={b.paymentVerify.remarks}>
                                                        {b.paymentVerify.remarks || '_'}
                                                    </div>
                                                </td>
                                                {/* Action */}
                                                <td className="text-center py-3 px-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); setPaymentModal(b); }}
                                                        className="h-8 px-3 text-blue-600 hover:text-white hover:bg-blue-600 font-bold uppercase tracking-wider text-[10px] rounded-lg transition-all cursor-pointer"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Stage 2 Pagination */}
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between" style={{ display: viewMode === 'table' ? 'flex' : 'none' }}>
                            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                Showing {filtered.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} entries
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter"
                                >
                                    Prev
                                </Button>
                                {Array.from({ length: Math.ceil(filtered.length / rowsPerPage) }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === Math.ceil(filtered.length / rowsPerPage) || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-400 text-xs px-0.5">...</span>}
                                            <Button
                                                variant={currentPage === p ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setCurrentPage(p)}
                                                className={`h-7 w-7 p-0 text-[10px] font-bold ${currentPage === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-blue-50'}`}
                                            >
                                                {p}
                                            </Button>
                                        </React.Fragment>
                                    ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage >= Math.ceil(filtered.length / rowsPerPage)}
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-tighter"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={!!managementModal} onOpenChange={(open) => { if (!open) closeManagementModal(); }}>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Management Verification</DialogTitle>
                        <DialogDescription>
                            Add a required remark before confirming management verification.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Remarks</label>
                            <textarea
                                value={managementRemarks}
                                onChange={(e) => {
                                    setManagementRemarks(e.target.value);
                                    if (managementError) setManagementError('');
                                }}
                                rows={4}
                                disabled={managementSaving}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                placeholder="Enter management remarks..."
                            />
                            {managementError ? <p className="text-sm text-red-600">{managementError}</p> : null}
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={closeManagementModal} disabled={managementSaving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleManagementSave} disabled={managementSaving || !managementRemarks.trim()}>
                            {managementSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Sales Verification Modal - HIDDEN BY REQUEST */}
            {/* 
            <Dialog open={!!salesModal} onOpenChange={(open) => !open && setSalesModal(null)}>
                <DialogContent className="max-w-2xl overflow-hidden p-0 rounded-2xl border-none shadow-2xl">
                    {salesModal && (
                        <>
                            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                        <ClipboardList className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/20 font-bold uppercase tracking-widest text-[10px] px-2 py-0.5">
                                                Stage 1 — Sales Verification
                                            </Badge>
                                            <div className="flex items-center gap-1.5 text-white/70 text-[11px] font-bold">
                                                <Clock className="w-3 h-3" />
                                                {salesModal.salesVerify.verifiedAt || 'Pending Review'}
                                            </div>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white tracking-tight leading-none">{salesModal.clientName}</h2>
                                        <p className="text-blue-100 text-xs font-medium mt-1 flex items-center gap-1.5 tabular-nums">
                                            Order ID: <span className="font-mono bg-white/10 px-1.5 rounded">{salesModal.id}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 space-y-6 max-h-[70vh] overflow-y-auto">
                                <div className={`flex items-center gap-4 p-4 rounded-xl border-2 ${salesModal.salesVerify.status === 'Done' ? 'bg-green-50 border-green-200 text-green-800' :
                                    salesModal.salesVerify.status === 'Discrepancy' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                        'bg-red-50 border-red-200 text-red-800'
                                    }`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${salesModal.salesVerify.status === 'Done' ? 'bg-green-100' : 'bg-amber-100'}`}>
                                        {salesModal.salesVerify.status === 'Done' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold leading-tight">Verification Status: {salesModal.salesVerify.status}</p>
                                        <p className="text-[11px] opacity-80 font-semibold uppercase tracking-wider mt-0.5">Verified by {salesModal.salesVerify.verifiedBy || 'System'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-2 flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" /> Client & Booking
                                        </h4>
                                        <div className="grid gap-1">
                                            <PField label="Programme" value={salesModal.programmeName} />
                                            <PField label="Room" value={`${salesModal.roomType} — ${salesModal.roomCategory}`} />
                                            <PField label="Stay Period" value={`${salesModal.arrivalDate} to ${salesModal.departureDate}`} />
                                            <PField label="Total Stay" value={`${salesModal.daysOfStay} Days`} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2 flex items-center gap-2">
                                            <IndianRupee className="w-3.5 h-3.5" /> Billing Data
                                        </h4>
                                        <div className="grid gap-1">
                                            <PField label="PI Number" value={salesModal.salesVerify.piNo} />
                                            <PField label="PI Amount" value={`₹ ${salesModal.salesVerify.bookingPIAmount}`} highlight />
                                            <PField label="Total Billed" value={`₹ ${salesModal.salesVerify.totalBilledValue}`} highlight />
                                            <PField label="Check-out" value={salesModal.salesVerify.checkOutDate} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" /> Breakdown
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                                        <PField label="Treatment" value={`₹ ${salesModal.salesVerify.treatmentCharges}`} />
                                        <PField label="Extra Pkg" value={`₹ ${salesModal.salesVerify.extraPackageTreatment}`} />
                                        <PField label="Extra Addl" value={`₹ ${salesModal.salesVerify.extraAdditionalTreatment}`} />
                                        <PField label="Medicine" value={`₹ ${salesModal.salesVerify.ayurvedicMedicine}`} />
                                        <PField label="Pick/Drop" value={`₹ ${salesModal.salesVerify.pickDropCharges}`} />
                                        <PField label="Private Yoga" value={`₹ ${salesModal.salesVerify.privateYoga}`} />
                                    </div>
                                </div>

                                <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
                                    <PField label="Verification Remarks" value={salesModal.salesVerify.remarks || 'No remarks provided.'} />
                                    {salesModal.salesVerify.invoiceLink && (
                                        <Button className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95" asChild>
                                            <a href={salesModal.salesVerify.invoiceLink} target="_blank" rel="noreferrer">
                                                <Eye className="w-4 h-4" /> View Invoice Document
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-white border-t flex flex-col sm:flex-row gap-3">
                                {canEditSalesVerify(role) ? (
                                    <>
                                        <Button className="flex-1 h-11 bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-100 transition-all active:scale-95">
                                            Approve Verification
                                        </Button>
                                        <Button variant="outline" className="flex-1 h-11 border-2 border-amber-200 text-amber-700 hover:bg-amber-50 font-bold transition-all active:scale-95">
                                            Flag Discrepancy
                                        </Button>
                                    </>
                                ) : (
                                    <div className="w-full py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Read-Only Access
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            */}

            {/* Payment Verification Modal */}
            <Dialog
                open={!!paymentModal}
                onOpenChange={(open) => {
                    if (!open) {
                        setPaymentModal(null);
                        setPaymentTab('summary');
                        setPaymentAction('idle');
                        setDiscrepancyNote('');
                    }
                }}
            >
                <DialogContent className="!w-[98vw] sm:!w-[95vw] !max-w-4xl !h-[95vh] sm:!h-[90vh] !p-0 gap-0 overflow-hidden rounded-xl flex flex-col [&>button:last-child]:hidden">
                    {paymentModal && (() => {
                        const pv = paymentModal.paymentVerify;

                        /* ── Status meta (real state machine, no substring guessing) ── */
                        const statusMeta =
                            pv.verifyStatus === 'Verified Done'
                                ? { container: 'bg-green-50 border-green-200 text-green-800', iconBg: 'bg-green-100', Icon: CheckCircle, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                                : pv.verifyStatus === 'Discrepancy'
                                    ? { container: 'bg-amber-50 border-amber-200 text-amber-800', iconBg: 'bg-amber-100', Icon: AlertTriangle, badge: 'bg-amber-100 text-amber-700 border-amber-200' }
                                    : { container: 'bg-slate-50 border-slate-200 text-slate-700', iconBg: 'bg-slate-100', Icon: Clock, badge: 'bg-slate-100 text-slate-700 border-slate-200' };

                        const isMatch = pv.differenceAmount === 0;
                        const canEdit = canEditPaymentVerify(role);

                        /* ── Tab definitions (single source for mobile + desktop) ── */
                        const TABS = [
                            { key: 'summary', label: 'Summary', short: 'Summary', Icon: BarChart3, accent: 'text-emerald-500' },
                            { key: 'reconciliation', label: 'Reconciliation', short: 'Recon.', Icon: IndianRupee, accent: 'text-blue-500' },
                            { key: 'verification', label: 'Verification', short: 'Verify', Icon: ShieldCheck, accent: 'text-amber-500' },
                            { key: 'docs', label: 'Documents & Notes', short: 'Docs', Icon: FileText, accent: 'text-slate-500' },
                        ] as const;

                        const closeAll = () => {
                            setPaymentModal(null);
                            setPaymentTab('summary');
                            setPaymentAction('idle');
                            setDiscrepancyNote('');
                        };

                        /* ── Action handlers (wire to your API) ── */
                        const handleConfirm = () => {
                            setPaymentAction('processing');
                            // TODO: API — POST /api/payment-verify/confirm  body: { reservationId: pv.reservationId }
                            setTimeout(() => {
                                setPaymentAction('success');
                                setTimeout(closeAll, 900);
                            }, 600);
                        };

                        const handleReport = () => {
                            if (!discrepancyNote.trim()) return;
                            setPaymentAction('processing');
                            // TODO: API — POST /api/payment-verify/discrepancy  body: { reservationId: pv.reservationId, reason: discrepancyNote }
                            setTimeout(() => {
                                setPaymentAction('success');
                                setTimeout(closeAll, 900);
                            }, 600);
                        };

                        return (
                            <>
                                {/* ════════════════ HEADER (flat #1a6b44 — onboarding-done pattern) ════════════════ */}
                                <div
                                    className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3"
                                    style={{ background: '#1a6b44' }}
                                >
                                    <div className="min-w-0">
                                        <h2 className="text-base sm:text-xl font-black text-white leading-tight mb-1.5 truncate">
                                            {paymentModal.clientName || '—'}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="bg-white/15 border border-white/20 text-white text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-lg truncate max-w-[220px] sm:max-w-none">
                                                {pv.reservationId}
                                            </span>
                                            <Badge className={`border text-[10px] sm:text-xs font-bold ${statusMeta.badge}`}>
                                                {pv.verifyStatus}
                                            </Badge>
                                            {isMatch && pv.verifyStatus === 'Verified Done' && (
                                                <Badge className="bg-emerald-500/20 text-emerald-100 border-emerald-300/40 text-[10px] sm:text-xs font-bold">
                                                    ✓ Match
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeAll}
                                        aria-label="Close dialog"
                                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white flex-shrink-0 transition-all cursor-pointer"
                                    >
                                        <X className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                                    </button>
                                </div>

                                {/* ════════════════ BODY — sidebar + content ════════════════ */}
                                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">

                                    {/* Mobile: horizontal scrolling tabs */}
                                    <div className="flex md:hidden overflow-x-auto border-b border-slate-200 bg-white flex-shrink-0 scrollbar-hide">
                                        {TABS.map(({ key, short, Icon }) => {
                                            const active = paymentTab === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setPaymentTab(key)}
                                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all cursor-pointer ${active
                                                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <Icon className={`w-3 h-3 ${active ? 'text-emerald-500' : 'text-slate-400'}`} aria-hidden="true" />
                                                    {short}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop: vertical sidebar */}
                                    <div className="hidden md:flex w-48 lg:w-52 flex-shrink-0 border-r border-slate-100 bg-white flex-col py-2 overflow-y-auto">
                                        {TABS.map(({ key, label, Icon }) => {
                                            const active = paymentTab === key;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => setPaymentTab(key)}
                                                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-xs transition-all cursor-pointer ${active
                                                        ? 'bg-emerald-50 text-emerald-700 border-r-4 border-emerald-500 font-bold'
                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-emerald-500' : 'text-slate-400'}`} aria-hidden="true" />
                                                    <span>{label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Content pane */}
                                    <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-50">
                                        {/* Section header */}
                                        {(() => {
                                            const t = TABS.find(t => t.key === paymentTab)!;
                                            const Icon = t.Icon;
                                            return (
                                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 sm:mb-4 flex items-center gap-2">
                                                    <Icon className={`w-3.5 h-3.5 ${t.accent}`} aria-hidden="true" /> {t.label}
                                                </p>
                                            );
                                        })()}

                                        {/* ──────── SUMMARY TAB ──────── */}
                                        {paymentTab === 'summary' && (
                                            <div className="space-y-3 sm:space-y-4">

                                                {/* Status alert */}
                                                <div className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 ${statusMeta.container}`}>
                                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${statusMeta.iconBg}`}>
                                                        <statusMeta.Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs sm:text-sm font-bold leading-tight">
                                                            Reconciliation Status: {pv.verifyStatus}
                                                        </p>
                                                        <p className="text-[10px] sm:text-[11px] opacity-80 font-semibold uppercase tracking-wider mt-0.5">
                                                            Reconciled by {pv.verifiedBy || 'Finance Team'}
                                                            {pv.verifiedAt && ` · ${pv.verifiedAt}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* At-a-glance metrics */}
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">At a Glance</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        <Stat label="PI (Sales)" value={formatINR(pv.piAmountSales)} tone="blue" />
                                                        <Stat label="Tally Invoice" value={formatINR(pv.tallyInvoiceAmount)} tone="slate" />
                                                        <Stat label="Amt Rcvd in Bank" value={formatINR(pv.amountReceived)} tone="slate" />
                                                        <Stat
                                                            label="Diff Amt"
                                                            value={pv.differenceAmount === 0 ? '₹0' : formatINR(pv.differenceAmount)}
                                                            tone={pv.differenceAmount > 0 ? 'amber' : pv.differenceAmount < 0 ? 'red' : 'green'}
                                                        />
                                                        <Stat
                                                            label="Diff %"
                                                            value={`${pv.differencePercentage}%`}
                                                            tone={pv.differencePercentage > 0 ? 'amber' : pv.differencePercentage < 0 ? 'red' : 'green'}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Booking Details */}
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Booking Details</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        {/* <FieldCard label="Reservation ID" value={pv.reservationId} mono /> */}
                                                        <FieldCard label="Booking ID" value={paymentModal.id} mono />
                                                        <FieldCard label="Client Name" value={paymentModal.clientName} />
                                                        <FieldCard label="Booking Taken By" value={paymentModal.bookingTakenBy} />
                                                        <FieldCard label="Bank Received Date" value={pv.bankReceivedDate} />
                                                        <FieldCard label="Amount Received" value={pv.amountReceived ? `₹ ${pv.amountReceived}` : '₹0'} mono />
                                                    </div>
                                                </div>

                                                {/* Invoice Breakdown */}
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Invoice Breakdown</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        <FieldCard label="PI Amount" value={formatINR(pv.piAmount)} mono />
                                                        <FieldCard label="Additional Amount" value={formatINR(pv.additionalAmount)} mono />
                                                        <FieldCard label="Total Invoice" value={formatINR(pv.totalInvoiceAmount)} mono highlight />
                                                        <FieldCard label="Name on Receipt" value={pv.nameCorrect || '—'} />
                                                    </div>
                                                </div>

                                                {/* Verification Info */}
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Verification Info</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        {/* <FieldCard label="Doer" value={pv.doer} /> */}
                                                        <FieldCard label="Verified By" value={pv.verifiedBy} />
                                                        <FieldCard label="Verified At" value={pv.verifiedAt} />
                                                        <FieldCard label="Verify Status" value={pv.verifyStatus} highlight={pv.verifyStatus !== 'Verified Done'} />
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                        {/* ──────── RECONCILIATION TAB ──────── */}
                                        {paymentTab === 'reconciliation' && (
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Billing</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                                        <FieldCard label="PI Amount" value={formatINR(pv.piAmount)} mono />
                                                        <FieldCard label="PI (Sales)" value={formatINR(pv.piAmountSales)} mono highlight />
                                                        <FieldCard label="Tally Invoice" value={formatINR(pv.tallyInvoiceAmount)} mono />
                                                        <FieldCard label="Additional Amt" value={formatINR(pv.additionalAmount)} mono />
                                                        <FieldCard label="Total Invoice" value={formatINR(pv.totalInvoiceAmount)} mono />
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Receipt</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                                        <FieldCard label="Amount Received" value={pv.amountReceived ? `₹ ${pv.amountReceived}` : '₹0'} mono />
                                                        <FieldCard label="Bank Received Date" value={pv.bankReceivedDate} />
                                                    </div>
                                                </div>

                                                <div className={`border-2 rounded-xl p-4 ${isMatch ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                                                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isMatch ? 'text-green-700' : 'text-amber-700'}`}>
                                                        Difference Analysis
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                                        <Stat
                                                            label="Diff Amount"
                                                            value={pv.differenceAmount === 0 ? '₹0' : formatINR(pv.differenceAmount)}
                                                            tone={pv.differenceAmount > 0 ? 'amber' : pv.differenceAmount < 0 ? 'red' : 'green'}
                                                        />
                                                        <Stat
                                                            label="Diff %"
                                                            value={`${pv.differencePercentage}%`}
                                                            tone={pv.differencePercentage > 0 ? 'amber' : pv.differencePercentage < 0 ? 'red' : 'green'}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ──────── VERIFICATION TAB ──────── */}
                                        {paymentTab === 'verification' && (
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Verifier</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                                                        <FieldCard label="Doer" value={pv.doer} />
                                                        <FieldCard label="Verified By" value={pv.verifiedBy} />
                                                        <FieldCard label="Verified At" value={pv.verifiedAt} />
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Checks</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        <FieldCard label="Name on Receipt" value={pv.nameCorrect || '_'} />
                                                        <FieldCard label="Verify Status" value={pv.verifyStatus} highlight={pv.verifyStatus !== 'Verified Done'} />
                                                    </div>
                                                </div>

                                                {(pv.amtDiffReason || pv.verifyStatus === 'Discrepancy') && (
                                                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                                                        <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy Reason
                                                        </p>
                                                        <p className="text-sm font-medium text-amber-900 leading-relaxed whitespace-pre-wrap break-words">
                                                            {pv.amtDiffReason || '_'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ──────── DOCUMENTS & NOTES TAB ──────── */}
                                        {paymentTab === 'docs' && (
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Linked Documents</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                        <LinkTile
                                                            href={pv.piUrl}
                                                            label="PI URL"
                                                            fallback="PI not uploaded"
                                                            icon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
                                                        />
                                                        <LinkTile
                                                            href={pv.invoiceLink}
                                                            label="Invoice"
                                                            fallback="Invoice not linked"
                                                            icon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
                                                        />
                                                        <LinkTile
                                                            href={pv.proofLink}
                                                            label="Payment Proof"
                                                            fallback="Proof not attached"
                                                            icon={<IndianRupee className="w-3.5 h-3.5 text-blue-600" />}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Finance Remarks</p>
                                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${pv.remarks ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                                        {pv.remarks || 'No remarks added.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ════════════════ STICKY FOOTER ════════════════ */}
                                <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-white border-t border-slate-200">

                                    {/* Idle state — primary actions — COMMENTED OUT (read-only mode) */}
                                    {/* {paymentAction === 'idle' && canEdit && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <Button
                                    onClick={() => setPaymentAction('confirming')}
                                    disabled={pv.verifyStatus === 'Verified Done'}
                                    className="flex-1 h-10 sm:h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                                    {pv.verifyStatus === 'Verified Done' ? 'Already Reconciled' : 'Confirm Reconciliation'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPaymentAction('reporting')}
                                    className="flex-1 h-10 sm:h-11 border-2 border-red-200 text-red-700 hover:bg-red-50 font-bold transition-all active:scale-95 gap-2"
                                >
                                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                    Report Discrepancy
                                </Button>
                            </div>
                        )} */}

                                    {/* Confirm step — COMMENTED OUT (read-only mode) */}
                                    {/* {paymentAction === 'confirming' && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
                                <p className="text-xs sm:text-sm font-bold text-slate-700 flex-1 text-center sm:text-left">
                                    Mark this reconciliation as <span className="text-emerald-600">Verified Done</span>?
                                </p>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPaymentAction('idle')}
                                        className="flex-1 sm:flex-none h-10 border-2 border-slate-200 font-bold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleConfirm}
                                        className="flex-1 sm:flex-none h-10 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" aria-hidden="true" /> Yes, Confirm
                                    </Button>
                                </div>
                            </div>
                        )} */}

                                    {/* Discrepancy form — COMMENTED OUT (read-only mode) */}
                                    {/* {paymentAction === 'reporting' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3 text-red-500" /> Describe the discrepancy
                                </label>
                                <textarea
                                    value={discrepancyNote}
                                    onChange={(e) => setDiscrepancyNote(e.target.value)}
                                    placeholder="e.g. Amount received ₹2,000 short of PI total. Bank reference mismatch."
                                    className="w-full min-h-[72px] px-3 py-2 text-sm border-2 border-slate-200 focus:border-red-300 rounded-lg resize-y outline-none"
                                    autoFocus
                                />
                                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setPaymentAction('idle'); setDiscrepancyNote(''); }}
                                        className="flex-1 h-10 border-2 border-slate-200 font-bold"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleReport}
                                        disabled={!discrepancyNote.trim()}
                                        className="flex-1 h-10 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold gap-2"
                                    >
                                        <AlertTriangle className="w-4 h-4" aria-hidden="true" /> Submit Report
                                    </Button>
                                </div>
                            </div>
                        )} */}

                                    {/* Processing */}
                                    {paymentAction === 'processing' && (
                                        <div className="flex items-center justify-center gap-2 py-2 text-emerald-700 font-bold text-sm">
                                            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                                            Processing…
                                        </div>
                                    )}

                                    {/* Success */}
                                    {paymentAction === 'success' && (
                                        <div className="flex items-center justify-center gap-2 py-2 text-emerald-700 font-bold text-sm">
                                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                                            Saved successfully
                                        </div>
                                    )}

                                    {/* Read-only — always visible (replaces the action buttons) */}
                                    {paymentAction === 'idle' && (
                                        <div className="w-full py-3 bg-slate-100 border-2 border-slate-200 rounded-xl text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            Read-Only Access
                                        </div>
                                    )}

                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
