"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDialShreeSentLeads, type DialShreeSentLead } from "@/hooks/useDialShreeSentLeads";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    Loader2,
    Send,
    PhoneCall,
    CheckCircle2,
    AlertCircle,
    Clock,
    Download,
    Copy,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ExternalLink,
    Filter,
    ArrowUpDown,
    Eye,
    X,
    PhoneOutgoing,
    PhoneIncoming,
} from "lucide-react";

// ─── Status & Color Types ─────────────────────────────────────────────────────

type PillColor = "green" | "blue" | "purple" | "orange" | "red" | "yellow" | "gray" | "teal" | "indigo";

const PILL_STYLES: Record<PillColor, { bg: string; fg: string; border: string }> = {
    green: { bg: "#dcfce7", fg: "#15803d", border: "#bbf7d0" },
    blue: { bg: "#dbeafe", fg: "#1d4ed8", border: "#bfdbfe" },
    purple: { bg: "#f3e8ff", fg: "#7e22ce", border: "#e9d5ff" },
    orange: { bg: "#ffedd5", fg: "#c2410c", border: "#fed7aa" },
    red: { bg: "#fee2e2", fg: "#b91c1c", border: "#fecaca" },
    yellow: { bg: "#fef9c3", fg: "#854d0e", border: "#fef08a" },
    gray: { bg: "#f1f5f9", fg: "#475569", border: "#e2e8f0" },
    teal: { bg: "#ccfbf1", fg: "#0f766e", border: "#99f6e4" },
    indigo: { bg: "#e0e7ff", fg: "#4338ca", border: "#c7d2fe" },
};

function StatusBadge({ label, color }: { label: string; color: PillColor }) {
    const style = PILL_STYLES[color] || PILL_STYLES.gray;
    return (
        <span
            style={{
                backgroundColor: style.bg,
                color: style.fg,
                borderColor: style.border,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs whitespace-nowrap"
        >
            <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: style.fg }}
            />
            {label}
        </span>
    );
}

function IntentBadge({ intent }: { intent: string }) {
    const norm = (intent || "").toLowerCase().trim();
    if (norm === "high") return <StatusBadge label="High Intent" color="red" />;
    if (norm === "medium" || norm === "med") return <StatusBadge label="Medium Intent" color="orange" />;
    if (norm === "low") return <StatusBadge label="Low Intent" color="green" />;
    return <span className="text-slate-400 text-xs">—</span>;
}

// ─── Lead Details Modal ───────────────────────────────────────────────────────

function LeadDetailsModal({ lead, onClose }: { lead: DialShreeSentLead; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopyId = () => {
        if (lead.leadId) {
            navigator.clipboard.writeText(lead.leadId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
    };

    const initials = (name: string) =>
        (name || "")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() || "L";

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 text-white flex items-start justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-lg text-indigo-200 shrink-0">
                            {initials(lead.clientName)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-white truncate" title={lead.clientName}>
                                    {lead.clientName}
                                </h3>
                                <StatusBadge
                                    label={lead.deliveryStatus.label}
                                    color={lead.deliveryStatus.color as PillColor}
                                />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300 mt-1 flex-wrap">
                                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-[11px] text-slate-200">
                                    ID: {lead.leadId}
                                </span>
                                <button
                                    onClick={handleCopyId}
                                    className="inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white transition-colors"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? "Copied" : "Copy ID"}
                                </button>
                                <span>•</span>
                                <span>Enquiry: {lead.enquiryDateTime || lead.timestamp || "—"}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
                    {/* Grid: 2 Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Section: Client & Contact */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                                <span className="text-indigo-600">👤</span> Client Contact Details
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Primary Mobile</span>
                                    <span className="font-semibold text-slate-800">{lead.mobile || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Alternate Mobile</span>
                                    <span className="font-semibold text-slate-800">{lead.altMobile || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Primary Email</span>
                                    <span className="font-semibold text-slate-800 truncate block" title={lead.email}>
                                        {lead.email || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Alternate Email</span>
                                    <span className="font-semibold text-slate-800 truncate block" title={lead.altEmail}>
                                        {lead.altEmail || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Location / Geo</span>
                                    <span className="font-semibold text-slate-800">
                                        {[lead.location, lead.geo].filter(Boolean).join(", ") || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Region / Code</span>
                                    <span className="font-semibold text-slate-800">
                                        {[lead.region, lead.code].filter(Boolean).join(" · ") || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Section: Campaign & DialShree Settings */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                                <span className="text-indigo-600">🎯</span> Campaign & Dialer Outreach
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Campaign Name</span>
                                    <span className="font-semibold text-slate-800">{lead.campaignName || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Dialer List ID</span>
                                    <span className="font-mono font-semibold text-slate-800">{lead.listId || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Brand / Website</span>
                                    <span className="font-semibold text-slate-800">{lead.websiteName || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned MR / Agent</span>
                                    <span className="font-semibold text-slate-800">{lead.assignTo || "—"}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Data Source</span>
                                    <span className="font-medium text-slate-700 break-words">{lead.dataSource || "—"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section: Outreach Delivery & Exceptions */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                                <span className="text-indigo-600">📤</span> Dispatch & Response Result
                            </div>
                            <div className="space-y-2.5 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Response Result</span>
                                    <div className="mt-1 p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 break-words whitespace-pre-wrap max-h-28 overflow-y-auto">
                                        {lead.responseResult || "No response data recorded"}
                                    </div>
                                </div>
                                {lead.actionAfterException && (
                                    <div>
                                        <span className="text-[10px] font-bold uppercase text-rose-500 block">Exception Action / Note</span>
                                        <div className="mt-1 p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-[11px] text-rose-800 break-words">
                                            {lead.actionAfterException}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block">Sent Timestamp:</span>
                                        <span className="font-semibold text-slate-700">{lead.timestampSentNotSent || "—"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Action Timestamp:</span>
                                        <span className="font-semibold text-slate-700">{lead.timestampAfterAction || "—"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Timezone & Calling Window */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                                <span className="text-indigo-600">🕒</span> Calling Hours & Geolocation
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Timezone</span>
                                    <span className="font-semibold text-slate-800">{lead.timezone || "Asia/Kolkata"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">UTC Offset</span>
                                    <span className="font-semibold text-slate-800">{lead.utcOffset || "+05:30"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Business Hours Start</span>
                                    <span className="font-semibold text-slate-800">{lead.businessHoursStart || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Business Hours End</span>
                                    <span className="font-semibold text-slate-800">{lead.businessHoursEnd || "—"}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Weekdays Configuration</span>
                                    <span className="font-semibold text-slate-800">{lead.weekdaysConfig || "—"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Remarks & Enquiry Notes */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
                            <span className="text-indigo-600">📝</span> Remarks, Intent & Enquiry Notes
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="bg-white p-3 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Lead Intent</span>
                                <IntentBadge intent={lead.sqvLeadIntent} />
                            </div>
                            <div className="col-span-2 bg-white p-3 rounded-lg border border-slate-200">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">SQV Remarks</span>
                                <p className="text-slate-700 leading-relaxed">{lead.sqvRemarks || "—"}</p>
                            </div>
                        </div>

                        {lead.subjects && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Enquiry Subject</span>
                                <p className="text-slate-800 font-semibold">{lead.subjects}</p>
                            </div>
                        )}

                        {lead.notes && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Enquiry Notes</span>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
                            </div>
                        )}

                        {lead.remarksHistory && (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Remarks History</span>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{lead.remarksHistory}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <div className="text-[11px] text-slate-500">
                        Primary Key ID: <span className="font-mono font-bold text-slate-700">{lead.id}</span> · Created: {lead.createdAt || "—"}
                    </div>
                    <Button onClick={onClose} variant="default" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
                        Close Details
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component Inner ─────────────────────────────────────────────────────

function DialShreeSentPageInner() {
    const router = useRouter();
    const { user, isLoading: authLoading, hasPermission } = useAuth();

    // Permissions check
    const isSuperAdmin = Boolean(
        user?.role === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super_admin" ||
        String(user?.role || "").trim().toLowerCase() === "super admin"
    );

    const isAuthorized = Boolean(
        isSuperAdmin ||
        user?.role === "admin" ||
        String(user?.role || "").trim().toLowerCase() === "admin" ||
        hasPermission("dialshree_sent.view") ||
        hasPermission("dialshree.view") ||
        hasPermission("all")
    );

    useEffect(() => {
        if (!authLoading && user && !isAuthorized) {
            router.replace("/access-denied");
        }
    }, [authLoading, user, isAuthorized, router]);

    // Data hook
    const { data: sentLeads, loading, isRefreshing, error, refetch } = useDialShreeSentLeads();

    // Filters state
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const [dateRange, setDateRange] = useState("all");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("all");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [intentFilter, setIntentFilter] = useState("all");

    // Sorting
    const [sortKey, setSortKey] = useState<string>("id");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    // Selected modal lead
    const [selectedLead, setSelectedLead] = useState<DialShreeSentLead | null>(null);

    // Dynamic Filter Options
    const campaignOptions = useMemo(() => {
        const set = new Set<string>();
        sentLeads.forEach((l) => {
            if (l.campaignName && l.campaignName !== "—") set.add(l.campaignName);
        });
        return Array.from(set).sort();
    }, [sentLeads]);

    const companyOptions = useMemo(() => {
        const set = new Set<string>();
        sentLeads.forEach((l) => {
            if (l.company && l.company !== "—") set.add(l.company);
        });
        return Array.from(set).sort();
    }, [sentLeads]);

    // Date Range Helper
    const matchesDateRange = (dateStr: string, rangeKey: string) => {
        if (!dateStr || dateStr === "—" || rangeKey === "all") return true;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return true;

        const now = new Date();
        const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

        if (rangeKey === "today") {
            return d >= startOfDay(now);
        }
        if (rangeKey === "yesterday") {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const startYest = startOfDay(yest);
            return d >= startYest && d < startOfDay(now);
        }
        if (rangeKey === "this_week") {
            const startWeek = startOfDay(now);
            startWeek.setDate(startWeek.getDate() - startWeek.getDay());
            return d >= startWeek;
        }
        if (rangeKey === "this_month") {
            const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return d >= startMonth;
        }
        if (rangeKey === "last_month") {
            const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            return d >= startLastMonth && d <= endLastMonth;
        }
        if (rangeKey === "custom") {
            if (customStart && d < new Date(customStart)) return false;
            if (customEnd) {
                const end = new Date(customEnd);
                end.setHours(23, 59, 59, 999);
                if (d > end) return false;
            }
            return true;
        }
        return true;
    };

    // Filtered data computation
    const filteredLeads = useMemo(() => {
        return sentLeads.filter((lead) => {
            // 1. Text search
            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase();
                const matched =
                    lead.clientName.toLowerCase().includes(q) ||
                    lead.mobile.toLowerCase().includes(q) ||
                    lead.email.toLowerCase().includes(q) ||
                    lead.leadId.toLowerCase().includes(q) ||
                    lead.campaignName.toLowerCase().includes(q) ||
                    lead.subjects.toLowerCase().includes(q) ||
                    lead.notes.toLowerCase().includes(q) ||
                    lead.assignTo.toLowerCase().includes(q) ||
                    lead.responseResult.toLowerCase().includes(q);
                if (!matched) return false;
            }

            // 2. Date filter
            const targetDate = lead.timestamp || lead.enquiryDateTime;
            if (!matchesDateRange(targetDate, dateRange)) return false;

            // 3. Campaign
            if (campaignFilter !== "all" && lead.campaignName !== campaignFilter) return false;

            // 4. Company
            if (companyFilter !== "all" && lead.company !== companyFilter) return false;

            // 5. Status / Delivery Category
            if (statusFilter !== "all") {
                if (statusFilter === "sent" && lead.deliveryStatus.category !== "sent") return false;
                if (statusFilter === "exception" && lead.deliveryStatus.category !== "exception") return false;
                if (statusFilter === "pending" && lead.deliveryStatus.category !== "pending") return false;
            }

            // 6. Intent
            if (intentFilter !== "all") {
                const intentLower = (lead.sqvLeadIntent || "").toLowerCase();
                if (intentFilter === "high" && !intentLower.includes("high")) return false;
                if (intentFilter === "medium" && !intentLower.includes("med")) return false;
                if (intentFilter === "low" && !intentLower.includes("low")) return false;
            }

            return true;
        });
    }, [sentLeads, debouncedSearch, dateRange, customStart, customEnd, campaignFilter, companyFilter, statusFilter, intentFilter]);

    // Sorting
    const sortedLeads = useMemo(() => {
        const copy = [...filteredLeads];
        copy.sort((a, b) => {
            let valA: any = (a as any)[sortKey];
            let valB: any = (b as any)[sortKey];

            if (sortKey === "id") {
                valA = a.id;
                valB = b.id;
            } else if (sortKey === "timestamp") {
                valA = a._ts_num || 0;
                valB = b._ts_num || 0;
            } else if (sortKey === "enquiryDateTime") {
                valA = a._enq_num || 0;
                valB = b._enq_num || 0;
            } else {
                valA = String(valA || "").toLowerCase();
                valB = String(valB || "").toLowerCase();
            }

            if (valA < valB) return sortDir === "asc" ? -1 : 1;
            if (valA > valB) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    }, [filteredLeads, sortKey, sortDir]);

    // Pagination
    const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
    const pagedLeads = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedLeads.slice(start, start + pageSize);
    }, [sortedLeads, page, pageSize]);

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, dateRange, campaignFilter, companyFilter, statusFilter, intentFilter, pageSize]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDir("desc");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setDateRange("all");
        setCustomStart("");
        setCustomEnd("");
        setCampaignFilter("all");
        setCompanyFilter("all");
        setStatusFilter("all");
        setIntentFilter("all");
    };

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        let sentCount = 0;
        let exceptionCount = 0;
        let pendingCount = 0;
        let highIntent = 0;
        let medIntent = 0;
        let lowIntent = 0;

        filteredLeads.forEach((l) => {
            if (l.deliveryStatus.category === "sent") sentCount++;
            else if (l.deliveryStatus.category === "exception") exceptionCount++;
            else pendingCount++;

            const intent = l.sqvLeadIntent.toLowerCase();
            if (intent.includes("high")) highIntent++;
            else if (intent.includes("med")) medIntent++;
            else if (intent.includes("low")) lowIntent++;
        });

        return {
            total: filteredLeads.length,
            sentCount,
            exceptionCount,
            pendingCount,
            highIntent,
            medIntent,
            lowIntent,
        };
    }, [filteredLeads]);

    return (
        <div className="font-sans bg-[#f0f2f8] min-h-screen text-slate-800 pb-12">
            {/* Top Banner & Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-white border-b border-indigo-900/40 relative overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                            <Send className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                                    DialShree Sent Outreach Leads
                                </h1>
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Outbound Queue
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1">
                                Authoritative lead dispatch queue and outbound outreach log from `dialshree_kairali_sent`
                            </p>
                        </div>
                    </div>

                    {/* Right side navigation & Sync buttons */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
                        {/* Tab Switcher */}
                        <div className="inline-flex rounded-lg bg-white/10 p-1 border border-white/15 text-xs font-semibold">
                            <Link
                                href="/dialShree/received"
                                className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                            >
                                Received Leads
                            </Link>
                            <span className="px-3 py-1.5 rounded-md bg-indigo-600 text-white shadow-xs font-bold">
                                Sent Outreach
                            </span>
                        </div>

                        {/* Sync Button */}
                        <Button
                            onClick={() => refetch()}
                            disabled={loading || isRefreshing}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md h-9"
                        >
                            {loading || isRefreshing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <PhoneOutgoing className="w-3.5 h-3.5 mr-1.5" />
                                    Sync Data
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-5">
                {/* Error Banner if any */}
                {error && (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 flex items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <Button
                            onClick={() => refetch()}
                            variant="outline"
                            size="sm"
                            className="border-rose-300 text-rose-800 hover:bg-rose-100"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Total Sent */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-[11px] font-bold uppercase tracking-wider">Total Outbound</span>
                            <Send className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                                {loading && sentLeads.length === 0 ? "..." : metrics.total.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500">leads logged</span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">
                            Filtered from {sentLeads.length.toLocaleString()} total database records
                        </div>
                    </div>

                    {/* Dispatched / Sent */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Dispatched / Sent</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                                {loading && sentLeads.length === 0 ? "..." : metrics.sentCount.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600">
                                {metrics.total > 0 ? ((metrics.sentCount / metrics.total) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">Successfully sent to agent or dialer queue</div>
                    </div>

                    {/* Exceptions / Failed */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Exceptions / Errors</span>
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-rose-700 tabular-nums">
                                {loading && sentLeads.length === 0 ? "..." : metrics.exceptionCount.toLocaleString()}
                            </span>
                            <span className="text-[11px] font-bold text-rose-600">
                                {metrics.total > 0 ? ((metrics.exceptionCount / metrics.total) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">Requires exception verification or retry</div>
                    </div>

                    {/* Lead Intent Breakdown */}
                    <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-500">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Lead Intent Mix</span>
                            <span className="text-xs">⚡</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-1 text-xs">
                            <div className="text-center">
                                <span className="block text-rose-700 font-extrabold text-sm sm:text-base tabular-nums">
                                    {metrics.highIntent}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">High</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="text-center">
                                <span className="block text-amber-600 font-extrabold text-sm sm:text-base tabular-nums">
                                    {metrics.medIntent}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">Med</span>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div className="text-center">
                                <span className="block text-emerald-600 font-extrabold text-sm sm:text-base tabular-nums">
                                    {metrics.lowIntent}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">Low</span>
                            </div>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400">Prioritization of client purchase intent</div>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-900">Filter Outreach Leads</h3>
                            <span className="text-xs text-slate-400 font-normal">
                                ({filteredLeads.length} leads matching criteria)
                            </span>
                        </div>
                        <Button
                            onClick={clearFilters}
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-500 hover:text-slate-800 h-8"
                        >
                            Reset Filters
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Search */}
                        <div className="sm:col-span-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Search Leads
                            </label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name, phone, email, lead ID, notes..."
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Date Range
                            </label>
                            <Select value={dateRange} onValueChange={setDateRange}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Time" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="yesterday">Yesterday</SelectItem>
                                    <SelectItem value="this_week">This Week</SelectItem>
                                    <SelectItem value="this_month">This Month</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Campaign Filter */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Campaign
                            </label>
                            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Campaigns" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campaigns</SelectItem>
                                    {campaignOptions.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Outbound Status
                            </label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="sent">Sent / Dispatched</SelectItem>
                                    <SelectItem value="exception">Exceptions / Errors</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Intent Filter */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Lead Intent
                            </label>
                            <Select value={intentFilter} onValueChange={setIntentFilter}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All Intent" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Intent</SelectItem>
                                    <SelectItem value="high">High Intent</SelectItem>
                                    <SelectItem value="medium">Medium Intent</SelectItem>
                                    <SelectItem value="low">Low Intent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Custom Date Range Row */}
                    {dateRange === "custom" && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Start Date</label>
                                <Input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">End Date</label>
                                <Input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                    {/* Table Header Controls */}
                    <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                                Showing {sortedLeads.length === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
                                {Math.min(page * pageSize, sortedLeads.length)} of {sortedLeads.length.toLocaleString()} leads
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 text-[11px]">Per page:</span>
                                <Select
                                    value={String(pageSize)}
                                    onValueChange={(val) => setPageSize(Number(val))}
                                >
                                    <SelectTrigger className="h-8 w-20 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="200">200</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Table Scroll Area */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-900 text-slate-200 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider">
                                    <th
                                        onClick={() => handleSort("id")}
                                        className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>ID</span>
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("timestamp")}
                                        className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Dispatch Date</span>
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("enquiryDateTime")}
                                        className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Enquiry Date</span>
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3 px-3.5 whitespace-nowrap">Lead ID</th>
                                    <th
                                        onClick={() => handleSort("clientName")}
                                        className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Client Name & Contact</span>
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => handleSort("campaignName")}
                                        className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            <span>Campaign & Dialer</span>
                                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                        </div>
                                    </th>
                                    <th className="py-3 px-3.5">Intent</th>
                                    <th className="py-3 px-3.5">Outbound Status</th>
                                    <th className="py-3 px-3.5">Assign To</th>
                                    <th className="py-3 px-3.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && sentLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                                            Loading DialShree sent outreach records from database...
                                        </td>
                                    </tr>
                                ) : pagedLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-14 text-center text-slate-500">
                                            <p className="font-semibold text-sm text-slate-700">No matching outreach records found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter selections</p>
                                            <Button onClick={clearFilters} variant="outline" size="sm" className="mt-3 text-xs">
                                                Reset Filters
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    pagedLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            onClick={() => setSelectedLead(lead)}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        >
                                            {/* ID */}
                                            <td className="py-2.5 px-3.5 font-mono text-[11px] font-bold text-slate-500">
                                                #{lead.id}
                                            </td>

                                            {/* Sent Timestamp */}
                                            <td className="py-2.5 px-3.5 text-slate-700 whitespace-nowrap">
                                                {lead.timestamp || "—"}
                                            </td>

                                            {/* Enquiry Date */}
                                            <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
                                                {lead.enquiryDateTime || "—"}
                                            </td>

                                            {/* Lead ID */}
                                            <td className="py-2.5 px-3.5">
                                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                                                    {lead.leadId}
                                                </span>
                                            </td>

                                            {/* Client Details */}
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[200px]" title={lead.clientName}>
                                                    {lead.clientName}
                                                </div>
                                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                                    <span>{lead.mobile}</span>
                                                    {lead.email && lead.email !== "—" && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="truncate max-w-[130px]" title={lead.email}>
                                                                {lead.email}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Campaign & Dialer */}
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-semibold text-slate-800 truncate max-w-[180px]" title={lead.campaignName}>
                                                    {lead.campaignName}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    List: {lead.listId || "N/A"} · {lead.company}
                                                </div>
                                            </td>

                                            {/* Intent */}
                                            <td className="py-2.5 px-3.5">
                                                <IntentBadge intent={lead.sqvLeadIntent} />
                                            </td>

                                            {/* Outbound Status */}
                                            <td className="py-2.5 px-3.5">
                                                <StatusBadge
                                                    label={lead.deliveryStatus.label}
                                                    color={lead.deliveryStatus.color as PillColor}
                                                />
                                            </td>

                                            {/* Assign To */}
                                            <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                                                {lead.assignTo}
                                            </td>

                                            {/* Action */}
                                            <td className="py-2.5 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    onClick={() => setSelectedLead(lead)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    View
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Pagination Footer */}
                    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="text-slate-500">
                            Page <span className="font-bold text-slate-800">{page}</span> of{" "}
                            <span className="font-bold text-slate-800">{totalPages}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                onClick={() => setPage(1)}
                                disabled={page <= 1}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <span className="px-3 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-700">
                                {page}
                            </span>

                            <Button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <Button
                                onClick={() => setPage(totalPages)}
                                disabled={page >= totalPages}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lead Details Modal Drawer */}
            {selectedLead && (
                <LeadDetailsModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}
        </div>
    );
}

export default function DialShreeSentPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[60vh] text-slate-500 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                    Loading DialShree Sent Outreach Module...
                </div>
            }
        >
            <DialShreeSentPageInner />
        </Suspense>
    );
}
