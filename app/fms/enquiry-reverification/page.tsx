"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import Loader from "@/components/Loader"
import { Badge } from "@/components/ui/badge"
import ViewModal, { LeadRow } from "@/components/viewcallhistorymodel"
import ExecutiveVerifierModal, { ExecutiveVerifierRecord, ExecutiveVerifierFormValues } from "@/components/ExecutiveverifyModel"
import SeniorVerifierModal, { SeniorVerifierRecord, SeniorVerifierFormValues } from "@/components/SeniorVerifyModel"
import { cleanColdRemarks } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog"
import {
    Search,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    CheckCircle,
    TableIcon,
    RefreshCw,
    FileText,
    AlertCircle,
    Check,
    XCircle,
    ExternalLink,
    PhoneCall,
    BarChart3,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react"


export default function EnquiryReverificationPage() {
    const { user, isLoading, hasPermission } = useAuth()
    const router = useRouter()

    const isSenior = user?.permissions?.includes("cold_enquiry_reverification.Senior")
    const isAdmin = user?.role === "admin" || user?.role === "super_admin" || user?.permissions?.includes("all")

    // State variables matching the leads/assign style
    const [searchInput, setSearchInput] = useState("")
    const [dateFilter, setDateFilter] = useState<
        "all" | "today" | "yesterday" | "this_week" | "last_week" |
        "this_month" | "last_month" | "this_year" | "last_year" | "custom"
    >("this_week")

    const [selectedCompany, setSelectedCompany] = useState("ALL")
    const [sourceFilter, setSourceFilter] = useState("all")
    const [websiteFilter, setWebsiteFilter] = useState("all")
    const [coldByFilter, setColdByFilter] = useState("all")
    const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })

    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isFilterFetching, setIsFilterFetching] = useState(false)
    const [totalEnquiries, setTotalEnquiries] = useState(0)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [sortField, setSortField] = useState("generate_date_time")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
    const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null)
    const [activeModalTab, setActiveModalTab] = useState<"info" | "connection" | "quality" | "verifier">("info")
    const [selectedCallHistory, setSelectedCallHistory] = useState<LeadRow | null>(null)
    const [selectedExecutiveRecord, setSelectedExecutiveRecord] = useState<ExecutiveVerifierRecord | null>(null)
    const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false)
    const [selectedSeniorRecord, setSelectedSeniorRecord] = useState<SeniorVerifierRecord | null>(null)
    const [isSeniorModalOpen, setIsSeniorModalOpen] = useState(false)

    const [enquiries, setEnquiries] = useState<any[]>([])
    const [kpi, setKpi] = useState({ total: 0, pending: 0, completed: 0, appsheet: 0 })
    const [websitesOptions, setWebsitesOptions] = useState<string[]>([])
    const [agentsOptions, setAgentsOptions] = useState<string[]>([])

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalPages, setTotalPages] = useState(1)

    const hasExecutiveCompleted = (enq: any) =>
        Boolean(
            String(enq?.CI ?? "").trim() ||
            String(enq?.actual ?? "").trim()
        )

    const hasSeniorCompleted = (enq: any) =>
        Boolean(
            String(enq?.CX ?? "").trim() ||
            String(enq?.senior_actual ?? "").trim()
        )

    const getCompanyColorClass = (company: string) => {
        const c = String(company || "").trim().toUpperCase()
        if (c.includes("KAPPL")) return "text-pink-600"
        if (c.includes("KTAHV")) return "text-teal-600"
        if (c.includes("VILLA") && c.includes("RAAG") || c.includes("VILLARAAG")) return "text-orange-500"
        return "text-slate-800"
    }

    // Fetch enquiries from MySQL DB
    const fetchEnquiries = async () => {
        setLoadError(null)
        setIsFilterFetching(true)
        try {
            const skipFilters = websitesOptions.length > 0 && agentsOptions.length > 0
            let url = `/api/fms/enquiry-reverification?page=${currentPage}&limit=${pageSize}&skipFilters=${skipFilters}&sortField=${encodeURIComponent(sortField)}&sortDirection=${encodeURIComponent(sortDirection)}&`

            if (searchInput) url += `search=${encodeURIComponent(searchInput)}&`
            if (selectedCompany !== "ALL") url += `company=${encodeURIComponent(selectedCompany)}&`
            if (sourceFilter !== "all") url += `source=${encodeURIComponent(sourceFilter)}&`
            if (websiteFilter !== "all") url += `website=${encodeURIComponent(websiteFilter)}&`
            if (coldByFilter !== "all") url += `coldBy=${encodeURIComponent(coldByFilter)}&`

            let fromDate = ""
            let toDate = ""

            const getLocalYYYYMMDD = (d: Date) => {
                const year = d.getFullYear()
                const month = String(d.getMonth() + 1).padStart(2, "0")
                const day = String(d.getDate()).padStart(2, "0")
                return `${year}-${month}-${day}`
            }

            const now = new Date()
            const todayStr = getLocalYYYYMMDD(now)

            if (dateFilter === "today") {
                fromDate = todayStr
                toDate = todayStr
            } else if (dateFilter === "yesterday") {
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                fromDate = getLocalYYYYMMDD(yesterday)
                toDate = fromDate
            } else if (dateFilter === "this_week") {
                const d = new Date()
                const day = d.getDay()
                const diff = d.getDate() - day + (day === 0 ? -6 : 1)
                d.setDate(diff)
                fromDate = getLocalYYYYMMDD(d)
                toDate = todayStr
            } else if (dateFilter === "last_week") {
                const startOfLastWeek = new Date()
                const dayOfLastWeek = startOfLastWeek.getDay()
                const diffOfLastWeek = startOfLastWeek.getDate() - dayOfLastWeek + (dayOfLastWeek === 0 ? -6 : 1) - 7
                startOfLastWeek.setDate(diffOfLastWeek)
                fromDate = getLocalYYYYMMDD(startOfLastWeek)

                const endOfLastWeek = new Date(startOfLastWeek)
                endOfLastWeek.setDate(startOfLastWeek.getDate() + 6)
                toDate = getLocalYYYYMMDD(endOfLastWeek)
            } else if (dateFilter === "this_month") {
                fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
                toDate = todayStr
            } else if (dateFilter === "last_month") {
                const lastMonthDate = new Date(now.getFullYear(), now.getMonth(), 0)
                const lastMonthYear = lastMonthDate.getFullYear()
                const lastMonthVal = lastMonthDate.getMonth() + 1
                fromDate = `${lastMonthYear}-${String(lastMonthVal).padStart(2, '0')}-01`
                toDate = `${lastMonthYear}-${String(lastMonthVal).padStart(2, '0')}-${String(lastMonthDate.getDate()).padStart(2, '0')}`
            } else if (dateFilter === "this_year") {
                fromDate = `${now.getFullYear()}-01-01`
                toDate = todayStr
            } else if (dateFilter === "last_year") {
                const lastYearVal = now.getFullYear() - 1
                fromDate = `${lastYearVal}-01-01`
                toDate = `${lastYearVal}-12-31`
            } else if (dateFilter === "custom") {
                fromDate = customDateRange.start
                toDate = customDateRange.end
            }

            if (fromDate) url += `from=${fromDate}&`
            if (toDate) url += `to=${toDate}&`

            const res = await fetch(url)
            const json = await res.json().catch(() => null)

            if (!res.ok) {
                throw new Error(json?.error || `Request failed (${res.status} ${res.statusText})`)
            }
            if (!json?.success) {
                throw new Error(json?.error || "Server returned an unsuccessful response")
            }

            setEnquiries(Array.isArray(json?.data) ? json.data : [])
            setTotalEnquiries(json.pagination?.total || 0)
            setTotalPages(json.pagination?.totalPages || 1)
            if (json.kpi) {
                setKpi(json.kpi)
            }
            if (json.filters) {
                setWebsitesOptions(json.filters.websites || [])
                setAgentsOptions(json.filters.agents || [])
            }
            setLoadError(null)
        } catch (error: any) {
            console.error("Failed fetching enquiries:", error)
            setLoadError(error?.message || "Failed to load enquiries.")
        } finally {
            setIsInitialLoading(false)
            setIsFilterFetching(false)
        }
    }

    const handleSaveExecutiveVerification = async (values: ExecutiveVerifierFormValues) => {
        if (!selectedExecutiveRecord) return
        try {
            const res = await fetch("/api/fms/enquiry-reverification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedExecutiveRecord.id,
                    isExecutiveVerify: true,
                    CH: values.doer,
                    CI: values.verifyActionStatus,
                    CJ: values.validReason,
                    CK: values.whatWentWrong,
                    CL: Number(values.overallRating),
                    CM: values.suggestedSolution,
                    CN: values.remarks,
                    ht_created_to_executive_verifier_if_delay_status: values.htCreatedStatus,
                    doer_executive_verifier_email_id: values.doerEmail,
                    CQ: values.hsStatus,
                })
            })
            const json = await res.json()
            if (json.success) {
                alert("Executive verification saved successfully.")
                setIsExecutiveModalOpen(false)
                setSelectedExecutiveRecord(null)
                fetchEnquiries()
            } else {
                throw new Error(json.error || "Failed to save verification")
            }
        } catch (err: any) {
            console.error("Error saving executive verification:", err)
            alert("Error saving executive verification: " + err.message)
            throw err
        }
    }

    const handleSaveSeniorVerification = async (values: SeniorVerifierFormValues) => {
        if (!selectedSeniorRecord) return
        try {
            const res = await fetch("/api/fms/enquiry-reverification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedSeniorRecord.id,
                    isSeniorVerify: true,
                    CW: values.doer,
                    CX: values.verifyActionStatus,
                    CY: values.validReason,
                    CZ: values.whatWentWrong,
                    DA: Number(values.overallRating),
                    DB: values.suggestedSolution,
                    DC: values.remarks,
                    ht_created_to_senior_verifier_if_delay_status: values.htCreatedStatus,
                    whatsapp_alert_to_sales_person_if_reopen: values.whatsappAlert,
                    email_alert_to_sales_person_if_reopen: values.emailAlert,
                    doer_senior_verifier_email_id: values.doerEmail,
                    hs_status_if_escalate_to_abhilash_sir_by_senior: values.hsStatus,
                    transfer_to_user_fms_if_reopen: values.transferToUserFms,
                })
            })
            const json = await res.json()
            if (json.success) {
                alert("Senior verification saved successfully.")
                setIsSeniorModalOpen(false)
                setSelectedSeniorRecord(null)
                fetchEnquiries()
            } else {
                throw new Error(json.error || "Failed to save verification")
            }
        } catch (err: any) {
            console.error("Error saving senior verification:", err)
            alert("Error saving senior verification: " + err.message)
            throw err
        }
    }

    // Reset to first page on search or filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchInput, dateFilter, selectedCompany, sourceFilter, websiteFilter, coldByFilter, customDateRange])

    // Fetch when filters, page, or sorting changes
    useEffect(() => {
        if (!isLoading && user && hasPermission("cold_enquiry_reverification.view")) {
            fetchEnquiries()
        }
    }, [currentPage, pageSize, searchInput, dateFilter, selectedCompany, sourceFilter, websiteFilter, coldByFilter, customDateRange, sortField, sortDirection, user, isLoading, hasPermission])

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const renderSortIcon = (field: string) => {
        if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-white/40" />
        return sortDirection === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-white" /> : <ArrowDown className="h-3.5 w-3.5 text-white" />
    }

    const handleOpenDetails = (enq: any) => {
        setSelectedEnquiry({ ...enq })
        setActiveModalTab("info")
        setIsDetailDialogOpen(true)
    }

    // Redirect if not authenticated or lacks permission
    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push("/dashboard")
            } else if (!hasPermission("cold_enquiry_reverification.view")) {
                router.push("/access-denied")
            }
        }
    }, [user, isLoading, router, hasPermission])

    if (isLoading || !user || !hasPermission("cold_enquiry_reverification.view")) {
        return <Loader isLoading={true} contentOnly />
    }

    // Format Helper for Date strings
    const formatDateStr = (dateVal: any) => {
        if (!dateVal) return "—"
        try {
            const d = new Date(dateVal)
            if (isNaN(d.getTime())) return String(dateVal)
            return d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' })
        } catch {
            return String(dateVal)
        }
    }

    // Server-side sorted enquiries mapped directly
    const sortedEnquiries = enquiries

    // Pagination range details calculation
    const startItem = totalEnquiries === 0 ? 0 : (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalEnquiries)

    return (
        <>
            <Loader isLoading={isInitialLoading} contentOnly />
            <div className="space-y-6">

                {/* Hero Header Section with Back Button */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

                        {/* Back Button */}
                        <button
                            onClick={() => window.history.back()}
                            className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
                        >
                            ← Back
                        </button>

                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

                            {/* Left Section - Title */}
                            <div className="space-y-3 w-full">
                                <div className="flex items-start sm:items-center gap-4">

                                    {/* Icon Container */}
                                    <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                                        <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                                    </div>

                                    {/* Title & Subtitle */}
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                                            Enquiry Reverification Hub
                                        </h1>
                                        <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                                            Reverify, audit and follow up on inbound customer enquiries
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - KPI Card */}
                            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                                    <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                                        Total Enquiries
                                    </p>
                                    <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                                        {kpi.total}
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Advanced Filters Card */}
                <div className="mt-2">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-md">

                        {/* HEADER */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">

                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>

                                <div>
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Filters & Search
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Locate and refine enquiries for reverification
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchInput("")
                                    setDateFilter("all")
                                    setSelectedCompany("ALL")
                                    setSourceFilter("all")
                                    setWebsiteFilter("all")
                                    setColdByFilter("all")
                                    setCustomDateRange({ start: "", end: "" })
                                }}
                                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
                            >
                                Clear Filters
                            </Button>
                        </div>

                        {/* CONTENT */}
                        <div className="px-4 sm:px-5 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">

                                {/* SEARCH */}
                                <div className="flex flex-col gap-1.5 lg:col-span-2">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Search Enquiries
                                    </label>
                                    <Input
                                        placeholder="Search by ID, name, email, phone..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="h-10 w-full rounded-md border-gray-300"
                                    />
                                </div>

                                {/* DATE RANGE */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Date Range
                                    </label>
                                    <Select value={dateFilter} onValueChange={setDateFilter}>
                                        <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                            <SelectValue placeholder="All Dates" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="yesterday">Yesterday</SelectItem>
                                            <SelectItem value="this_week">This Week</SelectItem>
                                            <SelectItem value="last_week">Last Week</SelectItem>
                                            <SelectItem value="this_month">This Month</SelectItem>
                                            <SelectItem value="last_month">Last Month</SelectItem>
                                            <SelectItem value="this_year">This Year</SelectItem>
                                            <SelectItem value="last_year">Last Year</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* COMPANY */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Company
                                    </label>
                                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                                        <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                            <SelectValue placeholder="All Companies" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All</SelectItem>
                                            <SelectItem value="KTAHV">KTAHV</SelectItem>
                                            <SelectItem value="KAPPL">KAPPL</SelectItem>
                                            <SelectItem value="VILLARAAG">VILLARAAG</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* SOURCE */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Source
                                    </label>
                                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                                        <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                            <SelectValue placeholder="All Sources" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="facebook">Facebook</SelectItem>
                                            <SelectItem value="google">Google</SelectItem>
                                            <SelectItem value="website">Website</SelectItem>
                                            <SelectItem value="others">Others</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* WEBSITE (DYNAMIC) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Website
                                    </label>
                                    <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
                                        <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                            <SelectValue placeholder="All Websites" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {websitesOptions.map((web) => (
                                                <SelectItem key={web} value={web}>
                                                    {web}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* COLD BY (DYNAMIC) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                        Cold By
                                    </label>
                                    <Select value={coldByFilter} onValueChange={setColdByFilter}>
                                        <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                                            <SelectValue placeholder="All Agents" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {agentsOptions.map((agent) => (
                                                <SelectItem key={agent} value={agent}>
                                                    {agent}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>

                            {/* CUSTOM DATE RANGE */}
                            {dateFilter === "custom" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Start Date
                                        </label>
                                        <Input
                                            type="date"
                                            value={customDateRange.start}
                                            onChange={(e) =>
                                                setCustomDateRange({ ...customDateRange, start: e.target.value })
                                            }
                                            className="h-10 w-full rounded-md border-gray-300"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                            End Date
                                        </label>
                                        <Input
                                            type="date"
                                            value={customDateRange.end}
                                            onChange={(e) =>
                                                setCustomDateRange({ ...customDateRange, end: e.target.value })
                                            }
                                            className="h-10 w-full rounded-md border-gray-300"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Key Performance Indicators Outer Panel Wrapper */}
                <div className="relative">
                    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">

                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                                    <BarChart3 className="h-4 sm:h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                                        Key Performance Indicators
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        Overview of reverification metrics & performance
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards Grid */}
                        <div className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                                <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight">
                                            Total Enquiries
                                        </p>
                                        <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {kpi.total}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Fetched from database
                                    </p>
                                </div>

                                <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight">
                                            Pending Action
                                        </p>
                                        <AlertCircle className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {kpi.pending}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Requires reverification remarks
                                    </p>
                                </div>

                                <div className="bg-green-50/70 border-2 border-green-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700 leading-tight">
                                            Completed Actions
                                        </p>
                                        <Check className="h-4 w-4 text-green-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {kpi.completed}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Reverification completed
                                    </p>
                                </div>

                                <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight">
                                            Appsheet Logs
                                        </p>
                                        <XCircle className="h-4 w-4 text-red-600" />
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                                        {kpi.appsheet}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        Logged in Appsheet
                                    </p>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

                {/* Data Table / Content Shell */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                                <TableIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight flex items-center gap-2">
                                    Enquiries List
                                    {isFilterFetching && (
                                        <RefreshCw className="h-4.5 w-4.5 animate-spin text-blue-600" />
                                    )}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Manage and verify the details of incoming customer enquiries
                                </p>
                            </div>
                        </div>
                    </div>

                    {loadError && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-red-50 border-b border-red-200">
                            <div className="flex items-start gap-2 min-w-0">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-red-800">Couldn't load enquiries</p>
                                    <p className="text-[11px] text-red-700 break-words">{loadError}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchEnquiries()}
                                className="w-full sm:w-auto bg-white border-red-300 text-red-700 font-medium hover:bg-red-100"
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                            </Button>
                        </div>
                    )}

                    <div className="relative overflow-x-auto w-full">
                        {isFilterFetching && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600/30 overflow-hidden z-25">
                                <div className="w-full h-full bg-blue-600 origin-left animate-[pulse_1.5s_infinite]" />
                            </div>
                        )}
                        <table className="min-w-full divide-y divide-slate-200 text-xs border-collapse">
                            <thead style={{ backgroundColor: '#1e3a5f' }} className="sticky top-0 z-20">
                                <tr>
                                    <th
                                        className="sticky left-0 z-30 px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap min-w-[150px] w-[150px] cursor-pointer hover:bg-white/10 select-none"
                                        style={{ backgroundColor: '#1e3a5f' }}
                                        onClick={() => handleSort("generate_date_time")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Timestamp {renderSortIcon("generate_date_time")}
                                        </div>
                                    </th>
                                    <th
                                        className="sticky left-[150px] z-30 px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap min-w-[120px] w-[120px] cursor-pointer hover:bg-white/10 select-none"
                                        style={{ backgroundColor: '#1e3a5f' }}
                                        onClick={() => handleSort("enquiry_created_datetime")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Enquiry Date {renderSortIcon("enquiry_created_datetime")}
                                        </div>
                                    </th>
                                    <th
                                        className="sticky left-[270px] z-30 px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap min-w-[130px] w-[130px] cursor-pointer hover:bg-white/10 select-none"
                                        style={{ backgroundColor: '#1e3a5f' }}
                                        onClick={() => handleSort("lead_id")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            ID {renderSortIcon("lead_id")}
                                        </div>
                                    </th>
                                    <th className="sticky left-[400px] z-30 px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap min-w-[220px] w-[220px] border-r-2 border-white/20 shadow-[inset_-8px_0_12px_-6px_rgba(0,0,0,0.35)]" style={{ backgroundColor: '#1e3a5f' }}>Client Details</th>

                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">Subject</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">Notes</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">IVR URL</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[110px] border-r border-white/15">Website Name</th>

                                    <th
                                        className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10 select-none border-r border-white/15"
                                        onClick={() => handleSort("data_source")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Data Source {renderSortIcon("data_source")}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[120px] border-r border-white/15">Cold By (Employee Name)</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[110px] border-r border-white/15">Cold done (Date & Time)</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">Cold remarks</th>
                                    <th
                                        className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[90px] cursor-pointer hover:bg-white/10 select-none border-r border-white/15"
                                        onClick={() => handleSort("call_count_before_cold")}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            Call Count Before Cold {renderSortIcon("call_count_before_cold")}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">Call History Link</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[90px] border-r border-white/15">Call Done in calling appsheet</th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap border-r border-white/15">UID</th>

                                    <th
                                        className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[110px] cursor-pointer hover:bg-white/10 select-none border-r border-white/15"
                                        onClick={() => handleSort("company_belongs_to")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Company belongs to {renderSortIcon("company_belongs_to")}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-normal leading-tight max-w-[110px] border-r border-white/15">appsheet call recording url</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap font-bold" style={{ backgroundColor: '#1e3a5f' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>

                                {loadError && sortedEnquiries.length === 0 && (
                                    <tr>
                                        <td colSpan={19} className="py-10 px-4 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle className="h-6 w-6 text-red-500" />
                                                <p className="text-sm font-semibold text-slate-700">Unable to load enquiries</p>
                                                <p className="text-xs text-slate-500 max-w-md break-words">{loadError}</p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => fetchEnquiries()}
                                                    className="mt-1 bg-white border-slate-300 text-slate-700 font-medium hover:bg-slate-100"
                                                >
                                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {sortedEnquiries.map((enq) => (
                                    <tr key={enq.id} className="border-b border-slate-100 hover:bg-blue-50 transition group">
                                        <td className="sticky left-0 z-10 py-3 px-4 font-medium text-slate-600 min-w-[150px] w-[150px] bg-white group-hover:bg-blue-50 transition-colors border-r border-slate-100">
                                            {formatDateStr(enq.generate_date_time)}
                                        </td>
                                        <td className="sticky left-[150px] z-10 py-3 px-4 font-medium text-slate-600 min-w-[120px] w-[120px] bg-white group-hover:bg-blue-50 transition-colors border-r border-slate-100">
                                            {formatDateStr(enq.enquiry_created_datetime)}
                                        </td>
                                        <td className="sticky left-[270px] z-10 py-3 px-4 font-bold text-blue-700 min-w-[130px] w-[130px] bg-white group-hover:bg-blue-50 transition-colors border-r border-slate-100">
                                            {enq.lead_id}
                                        </td>
                                        <td className="sticky left-[400px] z-10 py-3 px-4 min-w-[220px] w-[220px] bg-white group-hover:bg-blue-50 transition-colors border-r-2 border-slate-200 shadow-[inset_-8px_0_12px_-6px_rgba(15,23,42,0.15)]">
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-slate-900">{enq.name_of_client || "—"}</p>
                                                <p className="text-slate-500 font-medium">{enq.mobile || "—"}</p>
                                                <p className="text-slate-400 font-medium">{enq.email_id || "—"}</p>
                                            </div>
                                        </td>

                                        <td className="py-3 px-4 max-w-[200px] truncate font-medium text-slate-700 border-r border-slate-100" title={enq.subjects}>
                                            {enq.subjects || "—"}
                                        </td>
                                        <td className="py-3 px-4 max-w-[200px] truncate text-slate-600 border-r border-slate-100" title={enq.notes}>
                                            {enq.notes || "—"}
                                        </td>
                                        <td className="py-3 px-4 border-r border-slate-100">
                                            {enq.ivr_url ? (
                                                <a href={enq.ivr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                                    Play Recording <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-600 border-r border-slate-100 max-w-[110px] truncate" title={enq.website_name || ""}>{enq.website_name || "—"}</td>
                                        <td className="py-3 px-4 border-r border-slate-100">
                                            {enq.data_source ? (
                                                <Badge variant="outline" className={`font-semibold px-2 py-0.5 rounded-full ${enq.data_source.toLowerCase().includes("google") ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                                                    }`}>
                                                    {enq.data_source}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-800 border-r border-slate-100 max-w-[120px] truncate" title={enq.cold_by_employee_name || ""}>{enq.cold_by_employee_name || "—"}</td>
                                        <td className="py-3 px-4 font-medium text-slate-600 border-r border-slate-100">{formatDateStr(enq.cold_done_datetime)}</td>
                                        <td className="py-3 px-4 max-w-[150px] truncate text-red-600 font-semibold border-r border-slate-100" title={cleanColdRemarks(enq.cold_remarks_by_sales_team)}>
                                            {cleanColdRemarks(enq.cold_remarks_by_sales_team) || "—"}
                                        </td>
                                        <td className="py-3 px-4 text-center font-bold text-slate-700 border-r border-slate-100">{enq.call_count_before_cold !== null ? enq.call_count_before_cold : "—"}</td>
                                        <td className="py-3 px-4 text-center border-r border-slate-100">
                                            {enq.call_history_link ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCallHistory({
                                                        timeStamp: formatDateStr(enq.generate_date_time),
                                                        dateTime: formatDateStr(enq.enquiry_created_datetime),
                                                        id: String(enq.lead_id || enq.id || ""),
                                                        clientName: enq.name_of_client || "",
                                                        mobile: enq.mobile || "",
                                                        email: enq.email_id || "",
                                                        subjects: enq.subjects || "",
                                                        notes: enq.notes || "",
                                                        ivrUrl: enq.ivr_url || "",
                                                        websiteName: enq.website_name || "",
                                                        dataSource: enq.data_source || "",
                                                        assignToMR: enq.cold_by_employee_name || "",
                                                        remarksHistory: cleanColdRemarks(enq.cold_remarks_by_sales_team),
                                                        status: enq.status || "open",
                                                        doerName: enq.cold_by_employee_name || "",
                                                    })}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-sm transition cursor-pointer"
                                                >
                                                    View History <PhoneCall className="h-3 w-3 text-indigo-500" />
                                                </button>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center border-r border-slate-100">
                                            {enq.cold_done_in_calling_appsheet_or_in_dailer ? (
                                                <Badge className="bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full">
                                                    {enq.cold_done_in_calling_appsheet_or_in_dailer}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-medium text-slate-500 border-r border-slate-100">{enq.uid}</td>
                                        <td className={`py-3 px-4 font-bold border-r border-slate-100 max-w-[110px] truncate ${getCompanyColorClass(enq.company_belongs_to)}`} title={enq.company_belongs_to || ""}>{enq.company_belongs_to || "—"}</td>
                                        <td className="py-3 px-4 border-r border-slate-100">
                                            {enq.appsheet_call_recording_url ? (
                                                <a href={enq.appsheet_call_recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                                                    Appsheet Rec <ExternalLink className="h-3 w-3" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Action Column Non-Sticky */}
                                        <td className="py-3 px-4 text-center border-l border-slate-100 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenDetails(enq)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 text-blue-600 font-bold bg-white hover:bg-blue-50 px-3.5 py-1.5 text-xs shadow-sm transition"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                                {!hasExecutiveCompleted(enq) && (!isSenior || isAdmin) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedExecutiveRecord({
                                                                id: String(enq.id),
                                                                leadId: enq.lead_id || "",
                                                                name: enq.name_of_client || "",
                                                                mobile: enq.mobile || "",
                                                                planned: enq.planned ? formatDateStr(enq.planned) : formatDateStr(enq.generate_date_time),
                                                                actual: enq.actual ? formatDateStr(enq.actual) : "—",
                                                                timeDelay: enq.timedelay || "—",
                                                                savedColdBy: enq.cold_by_employee_name || "",
                                                                savedColdRemarks: cleanColdRemarks(enq.cold_remarks_by_sales_team),
                                                                savedDoer: enq.CH,
                                                                savedVerifyActionStatus: enq.CI,
                                                                savedValidReason: enq.CJ,
                                                                savedWhatWentWrong: enq.CK,
                                                                savedOverallRating: enq.CL,
                                                                savedSuggestedSolution: enq.CM,
                                                                savedRemarks: enq.CN,
                                                                savedHtCreatedStatus: enq.ht_created_to_executive_verifier_if_delay_status,
                                                                savedDoerEmail: enq.doer_executive_verifier_email_id,
                                                                savedHsStatus: enq.CQ
                                                            });
                                                            setIsExecutiveModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 text-indigo-600 font-bold bg-white hover:bg-indigo-50 px-3.5 py-1.5 text-xs shadow-sm transition"
                                                    >
                                                        Executive Verify
                                                    </button>
                                                )}
                                                {!hasSeniorCompleted(enq) && (isSenior || isAdmin) && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSeniorRecord({
                                                                id: String(enq.id),
                                                                leadId: enq.lead_id || "",
                                                                name: enq.name_of_client || "",
                                                                mobile: enq.mobile || "",
                                                                planned: enq.senior_planned ? formatDateStr(enq.senior_planned) : formatDateStr(enq.generate_date_time),
                                                                actual: enq.senior_actual ? formatDateStr(enq.senior_actual) : "—",
                                                                timeDelay: enq.senior_timedelay || "—",
                                                                savedColdBy: enq.cold_by_employee_name || "",
                                                                savedColdRemarks: cleanColdRemarks(enq.cold_remarks_by_sales_team),
                                                                savedDoer: enq.CW,
                                                                savedDoerEmail: enq.doer_senior_verifier_email_id,
                                                                savedVerifyActionStatus: enq.CX,
                                                                savedValidReason: enq.CY,
                                                                savedOverallRating: enq.DA,
                                                                savedHtCreatedStatus: enq.ht_created_to_senior_verifier_if_delay_status,
                                                                savedWhatsappAlert: enq.whatsapp_alert_to_sales_person_if_reopen,
                                                                savedEmailAlert: enq.email_alert_to_sales_person_if_reopen,
                                                                savedHsStatus: enq.hs_status_if_escalate_to_abhilash_sir_by_senior,
                                                                savedTransferToUserFms: enq.transfer_to_user_fms_if_reopen,
                                                                savedWhatWentWrong: enq.CZ,
                                                                savedSuggestedSolution: enq.DB,
                                                                savedRemarks: enq.DC
                                                            });
                                                            setIsSeniorModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 text-violet-600 font-bold bg-white hover:bg-violet-50 px-3.5 py-1.5 text-xs shadow-sm transition"
                                                    >
                                                        Senior Verify
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                            </tbody>
                        </table>
                    </div>

                    {/* Professional Pagination Footer Panel */}
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">

                        {/* Range Details */}
                        <div className="flex items-center gap-4 text-slate-600 text-xs font-semibold">
                            <div className="flex items-center gap-2">
                                <span>Show</span>
                                <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[70px] h-8 bg-white text-xs border-slate-200 shadow-sm font-bold text-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">5</SelectItem>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                                <span>entries</span>
                            </div>
                            <div className="border-l border-slate-300 h-4 hidden sm:block"></div>
                            <div>
                                Showing <span className="font-bold text-slate-900">{startItem}</span> to{" "}
                                <span className="font-bold text-slate-900">{endItem}</span> of{" "}
                                <span className="font-bold text-slate-900">{totalEnquiries}</span> entries
                            </div>
                        </div>

                        {/* Navigation Button Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition"
                                title="First Page"
                            >
                                <ChevronsLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition"
                                title="Previous Page"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            {/* Dynamic Page Number Indicator */}
                            <div className="flex items-center px-3 h-8 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-sm select-none">
                                Page {currentPage} of {totalPages}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition"
                                title="Next Page"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white shadow-sm transition"
                                title="Last Page"
                            >
                                <ChevronsRight className="h-4 w-4" />
                            </button>
                        </div>

                    </div>

                </div>

                {/* Detailed Reverification Dialog Popup Modal */}
                <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                    <DialogContent className="max-w-[1140px] w-[95vw] max-h-[92vh] overflow-hidden bg-white p-0 rounded-2xl border-0 shadow-[0_28px_70px_rgba(0,0,0,0.3)] flex flex-col sm:max-w-[1140px]">
                        {selectedEnquiry && (
                            <>
                                {/* Main Modal Area (Left Sidebar + Right Panel) */}
                                <div className="flex flex-1 min-h-0 overflow-hidden">

                                    {/* ── LEFT SIDEBAR ── */}
                                    <div className="w-[310px] sm:w-[320px] shrink-0 border-r border-[#e8ecf3] bg-white flex flex-col overflow-y-auto">

                                        {/* Avatar & Lead Header */}
                                        <div className="p-[22px] pb-4 flex gap-3.5">
                                            <div className="w-11 h-11 rounded-full bg-[#eef2f7] flex items-center justify-center text-sm font-extrabold text-[#185FA5] shrink-0">
                                                {(() => {
                                                    const parts = String(selectedEnquiry.name_of_client || "").trim().split(/\s+/).filter(Boolean);
                                                    if (!parts.length) return "?";
                                                    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
                                                })()}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-[15px] font-extrabold text-[#0f172a] leading-tight break-words">
                                                    {selectedEnquiry.name_of_client || "Unnamed Client"}
                                                </h3>
                                                {selectedEnquiry.mobile && (
                                                    <a href={`tel:${selectedEnquiry.mobile}`} className="block text-[12.5px] font-semibold text-[#2563eb] hover:underline mt-1">
                                                        {selectedEnquiry.mobile}
                                                    </a>
                                                )}
                                                {selectedEnquiry.email_id && (
                                                    <a href={`mailto:${selectedEnquiry.email_id}`} className="block text-[12.5px] font-semibold text-[#2563eb] hover:underline mt-0.5 break-all">
                                                        {selectedEnquiry.email_id}
                                                    </a>
                                                )}
                                                <div className="text-[11.5px] font-bold text-[#a21caf] mt-1.5 leading-normal">
                                                    {selectedEnquiry.company_belongs_to || "No Company"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ID Chip */}
                                        <div className="px-[22px] pb-4">
                                            <div className="inline-block bg-[#fef2f2] border border-[#fecaca] rounded-md px-2.5 py-1 text-[11px] font-bold text-[#dc2626] break-all leading-relaxed">
                                                ID: {selectedEnquiry.lead_id || selectedEnquiry.uid || "—"}
                                            </div>
                                        </div>

                                        {/* Cold & Data Info in Sidebar */}
                                        <div className="border-t border-[#e8ecf3] p-[18px_22px] flex flex-col gap-3">
                                            <div>
                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Data Source</div>
                                                <div className="text-[13px] font-bold text-[#0f172a] break-words">{selectedEnquiry.data_source || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Calling Channel / Appsheet</div>
                                                <div className="text-[13px] font-bold text-[#4f46e5] break-words">{selectedEnquiry.cold_done_in_calling_appsheet_or_in_dailer || "—"}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Cold By (Employee)</div>
                                                <div className="text-[13px] font-bold text-[#0f172a]">{selectedEnquiry.cold_by_employee_name || "—"}</div>
                                            </div>
                                        </div>

                                        {/* Tab Navigation Buttons */}
                                        <div className="border-t border-[#e8ecf3] p-4 space-y-1.5 mt-auto bg-[#f8fafc]">
                                            <div className="text-[10px] font-extrabold tracking-wider uppercase text-[#94a3b8] px-2 mb-1">Navigation</div>
                                            <button
                                                onClick={() => setActiveModalTab("info")}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition ${activeModalTab === "info"
                                                    ? "bg-[#4f46e5] text-white shadow-sm"
                                                    : "text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                                                    }`}
                                            >
                                                <FileText className="h-4 w-4" /> Main Info & Metadata
                                            </button>
                                            <button
                                                onClick={() => setActiveModalTab("connection")}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition ${activeModalTab === "connection"
                                                    ? "bg-[#4f46e5] text-white shadow-sm"
                                                    : "text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
                                                    }`}
                                            >
                                                <PhoneCall className="h-4 w-4" /> SQV & Dialer Details
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── RIGHT PANEL ── */}
                                    <div className="flex-1 min-w-0 bg-[#fbfcfe] flex flex-col overflow-y-auto">

                                        {/* Top Banner: Date & Status */}
                                        <div className="m-[18px_22px_0] border border-[#fde68a] bg-[#fffbeb] rounded-xl p-[12px_16px] flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-[#4f46e5] flex items-center justify-center text-sm">📞</div>
                                                <span className="text-[14px] font-extrabold text-[#1e293b]">
                                                    {formatDateStr(selectedEnquiry.generate_date_time) || "N/A"}
                                                </span>
                                            </div>
                                            <span className="inline-flex items-center gap-1.5 border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb] rounded-full px-3 py-1 text-xs font-extrabold">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                                                {selectedEnquiry.cold_done_in_calling_appsheet_or_in_dailer || "REVERIFICATION"}
                                            </span>
                                        </div>

                                        {/* Content Area */}
                                        <div className="p-[18px_22px_22px] space-y-6">

                                            {/* TAB 1: MAIN INFO */}
                                            {activeModalTab === "info" && (
                                                <>
                                                    {/* Client Information */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1 h-3.5 rounded bg-[#4f46e5]" />
                                                            <span className="text-[11.5px] font-extrabold tracking-wider uppercase text-[#4f46e5]">Client Information</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Client Name</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b] break-words">{selectedEnquiry.name_of_client || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Mobile Number</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b]">{selectedEnquiry.mobile || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Email Address</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b] break-all">{selectedEnquiry.email_id || "—"}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Enquiry Context */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1 h-3.5 rounded bg-[#4f46e5]" />
                                                            <span className="text-[11.5px] font-extrabold tracking-wider uppercase text-[#4f46e5]">Enquiry Context</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Subject</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b] break-words">{selectedEnquiry.subjects || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Website Name</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b] break-words">{selectedEnquiry.website_name || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Data Source</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b] break-words">{selectedEnquiry.data_source || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">UID</div>
                                                                <div className="text-[12px] font-mono font-bold text-[#1e293b] break-all">{selectedEnquiry.uid}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px] sm:col-span-2">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Enquiry Notes</div>
                                                                <div className="text-[12.5px] font-medium leading-relaxed text-[#1e293b] whitespace-pre-wrap break-words min-h-[40px] max-h-[120px] overflow-y-auto bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2.5">
                                                                    {selectedEnquiry.notes || "—"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Cold Call Reverification Details */}
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-1 h-3.5 rounded bg-[#4f46e5]" />
                                                            <span className="text-[11.5px] font-extrabold tracking-wider uppercase text-[#4f46e5]">Cold Call Reverification Details</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Cold By (Employee Name)</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b]">{selectedEnquiry.cold_by_employee_name || "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Cold Done (Date & Time)</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b]">{formatDateStr(selectedEnquiry.cold_done_datetime)}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Call Count Before Cold</div>
                                                                <div className="text-[13px] font-bold text-[#1e293b]">{selectedEnquiry.call_count_before_cold !== null ? selectedEnquiry.call_count_before_cold : "—"}</div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px] sm:col-span-3">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Cold Remarks</div>
                                                                <div className="text-[12.5px] font-medium leading-relaxed text-red-600 whitespace-pre-wrap break-words min-h-[40px] max-h-[120px] overflow-y-auto bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2.5">
                                                                    {cleanColdRemarks(selectedEnquiry.cold_remarks_by_sales_team) || "—"}
                                                                </div>
                                                            </div>
                                                            <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px] sm:col-span-3">
                                                                <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Appsheet Call Recording URL</div>
                                                                {selectedEnquiry.appsheet_call_recording_url ? (
                                                                    <a href={selectedEnquiry.appsheet_call_recording_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4f46e5] hover:underline inline-flex items-center gap-1 mt-1 border border-[#c7d2fe] bg-[#eef2ff] px-2.5 py-1 rounded-md">
                                                                        Play Appsheet Rec <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                ) : (
                                                                    <div className="text-[13px] font-bold text-[#94a3b8]">—</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {/* TAB 2: SQV & DIALER */}
                                            {activeModalTab === "connection" && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-1 h-3.5 rounded bg-[#4f46e5]" />
                                                        <span className="text-[11.5px] font-extrabold tracking-wider uppercase text-[#4f46e5]">SQV & Dialer Details</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                            <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">IVR Recording URL</div>
                                                            {selectedEnquiry.ivr_url ? (
                                                                <a href={selectedEnquiry.ivr_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4f46e5] hover:underline inline-flex items-center gap-1 mt-1 border border-[#c7d2fe] bg-[#eef2ff] px-2.5 py-1 rounded-md">
                                                                    Listen IVR Call <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <div className="text-[13px] font-bold text-[#94a3b8]">—</div>
                                                            )}
                                                        </div>
                                                        <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                            <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Call History Link</div>
                                                            {selectedEnquiry.call_history_link ? (
                                                                <a href={selectedEnquiry.call_history_link} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#4f46e5] hover:underline inline-flex items-center gap-1 mt-1 border border-[#c7d2fe] bg-[#eef2ff] px-2.5 py-1 rounded-md">
                                                                    View History <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <div className="text-[13px] font-bold text-[#94a3b8]">—</div>
                                                            )}
                                                        </div>
                                                        <div className="border border-[#e2e8f0] rounded-xl bg-white p-[10px_14px]">
                                                            <div className="text-[10px] font-bold tracking-[0.7px] uppercase text-[#94a3b8] mb-1">Cold Done in Appsheet / Dialer</div>
                                                            <div className="text-[13px] font-bold text-[#1e293b]">{selectedEnquiry.cold_done_in_calling_appsheet_or_in_dailer || "—"}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        </div>
                                    </div>

                                </div>

                                {/* ══ FOOTER BAR ══ */}
                                <div className="shrink-0 border-t border-[#e8ecf3] bg-white p-[12px_22px] flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-4.5 flex-wrap">
                                        <span className="text-[11px] font-bold tracking-[0.6px] uppercase text-[#94a3b8]">
                                            Generate Date{" "}
                                            <span className="text-[#1e293b] text-[12.5px] normal-case tracking-normal ml-1">
                                                {formatDateStr(selectedEnquiry.generate_date_time)}
                                            </span>
                                        </span>
                                        <span className="w-px h-4 bg-[#e2e8f0]" />
                                        <span className="text-[11px] font-bold tracking-[0.6px] uppercase text-[#94a3b8]">
                                            Cold Done Date{" "}
                                            <span className="text-[#1e293b] text-[12.5px] normal-case tracking-normal ml-1">
                                                {formatDateStr(selectedEnquiry.cold_done_datetime)}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        {!hasExecutiveCompleted(selectedEnquiry) && (!isSenior || isAdmin) && (
                                            <button
                                                onClick={() => {
                                                    const enq = selectedEnquiry;
                                                    setSelectedExecutiveRecord({
                                                        id: String(enq.id),
                                                        leadId: enq.lead_id || "",
                                                        name: enq.name_of_client || "",
                                                        mobile: enq.mobile || "",
                                                        planned: enq.planned ? formatDateStr(enq.planned) : formatDateStr(enq.generate_date_time),
                                                        actual: enq.actual ? formatDateStr(enq.actual) : "—",
                                                        timeDelay: enq.timedelay || "—",
                                                        savedColdBy: enq.cold_by_employee_name || "",
                                                        savedColdRemarks: cleanColdRemarks(enq.cold_remarks_by_sales_team),
                                                        savedDoer: enq.CH,
                                                        savedVerifyActionStatus: enq.CI,
                                                        savedValidReason: enq.CJ,
                                                        savedWhatWentWrong: enq.CK,
                                                        savedOverallRating: enq.CL,
                                                        savedSuggestedSolution: enq.CM,
                                                        savedRemarks: enq.CN,
                                                        savedHtCreatedStatus: enq.ht_created_to_executive_verifier_if_delay_status,
                                                        savedDoerEmail: enq.doer_executive_verifier_email_id,
                                                        savedHsStatus: enq.CQ
                                                    });
                                                    setIsDetailDialogOpen(false);
                                                    setIsExecutiveModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 text-indigo-600 font-bold bg-white hover:bg-indigo-50 px-4 py-2 text-xs shadow-sm transition"
                                            >
                                                Executive Verify
                                            </button>
                                        )}
                                        {!hasSeniorCompleted(selectedEnquiry) && (isSenior || isAdmin) && (
                                            <button
                                                onClick={() => {
                                                    const enq = selectedEnquiry;
                                                    setSelectedSeniorRecord({
                                                        id: String(enq.id),
                                                        leadId: enq.lead_id || "",
                                                        name: enq.name_of_client || "",
                                                        mobile: enq.mobile || "",
                                                        planned: enq.senior_planned ? formatDateStr(enq.senior_planned) : formatDateStr(enq.generate_date_time),
                                                        actual: enq.senior_actual ? formatDateStr(enq.senior_actual) : "—",
                                                        timeDelay: enq.senior_timedelay || "—",
                                                        savedColdBy: enq.cold_by_employee_name || "",
                                                        savedColdRemarks: cleanColdRemarks(enq.cold_remarks_by_sales_team),
                                                        savedDoer: enq.CW,
                                                        savedDoerEmail: enq.doer_senior_verifier_email_id,
                                                        savedVerifyActionStatus: enq.CX,
                                                        savedValidReason: enq.CY,
                                                        savedOverallRating: enq.DA,
                                                        savedHtCreatedStatus: enq.ht_created_to_senior_verifier_if_delay_status,
                                                        savedWhatsappAlert: enq.whatsapp_alert_to_sales_person_if_reopen,
                                                        savedEmailAlert: enq.email_alert_to_sales_person_if_reopen,
                                                        savedHsStatus: enq.hs_status_if_escalate_to_abhilash_sir_by_senior,
                                                        savedTransferToUserFms: enq.transfer_to_user_fms_if_reopen,
                                                        savedWhatWentWrong: enq.CZ,
                                                        savedSuggestedSolution: enq.DB,
                                                        savedRemarks: enq.DC
                                                    });
                                                    setIsDetailDialogOpen(false);
                                                    setIsSeniorModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 text-violet-600 font-bold bg-white hover:bg-violet-50 px-4 py-2 text-xs shadow-sm transition"
                                            >
                                                Senior Verify
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsDetailDialogOpen(false)}
                                            className="border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#334155] px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                <ViewModal
                    row={selectedCallHistory}
                    onClose={() => setSelectedCallHistory(null)}
                />

                {selectedExecutiveRecord && (
                    <ExecutiveVerifierModal
                        record={selectedExecutiveRecord}
                        open={isExecutiveModalOpen}
                        onClose={() => {
                            setIsExecutiveModalOpen(false);
                            setSelectedExecutiveRecord(null);
                        }}
                        onSubmit={handleSaveExecutiveVerification}
                        defaultDoerName={user?.name || ""}
                        defaultDoerEmail={user?.email || ""}
                    />
                )}

                {selectedSeniorRecord && (
                    <SeniorVerifierModal
                        record={selectedSeniorRecord}
                        open={isSeniorModalOpen}
                        onClose={() => {
                            setIsSeniorModalOpen(false);
                            setSelectedSeniorRecord(null);
                        }}
                        onSubmit={handleSaveSeniorVerification}
                        defaultDoerName={user?.name || ""}
                        defaultDoerEmail={user?.email || ""}
                    />
                )}

            </div>
        </>
    )
}