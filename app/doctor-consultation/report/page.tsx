"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import Loader from "@/components/Loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Stethoscope,
  Calendar,
  Search,
  Download,
  Printer,
  RefreshCw,
  Mail,
  TrendingUp,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  FileText,
  Filter,
  Eye,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  Building2,
  ArrowUpRight,
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type { SourceReportRow, DoctorPerformanceRow, DetailedConsultationItem } from "@/app/api/doctor/report/route"

const CHART_COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#64748b"]

export default function DoctorConsultationReportPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // State management
  const [period, setPeriod] = useState<string>("this_week")
  const [customRange, setCustomRange] = useState({ start: "2026-08-31", end: "2026-09-06" })
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [doctorFilter, setDoctorFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("summary")

  // Data states
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [weeklyReport, setWeeklyReport] = useState<{ rows: SourceReportRow[]; totals: any }>({ rows: [], totals: null })
  const [overallReport, setOverallReport] = useState<{ rows: SourceReportRow[]; totals: any }>({ rows: [], totals: null })
  const [doctorsPerformance, setDoctorsPerformance] = useState<DoctorPerformanceRow[]>([])
  const [detailedConsultations, setDetailedConsultations] = useState<DetailedConsultationItem[]>([])
  const [weeklyDateRange, setWeeklyDateRange] = useState<string>("31-08-2026 To 06-09-2026")
  const [overallDateRange, setOverallDateRange] = useState<string>("02-07-2024 To 06-09-2026")

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<DetailedConsultationItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false)
  const [emailRecipients, setEmailRecipients] = useState<string>("director@kairali.com, dme@kairali.com")
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false)

  // Redirect if unauthenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  // Fetch report data
  const fetchReportData = async () => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams()
      params.set("period", period)
      params.set("source", sourceFilter)
      params.set("doctor", doctorFilter)
      params.set("status", statusFilter)
      if (searchQuery) params.set("q", searchQuery)

      const res = await fetch(`/api/doctor/report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load doctor consultation report data")
      const data = await res.json()

      setWeeklyReport(data.weeklyReport)
      setOverallReport(data.overallReport)
      setDoctorsPerformance(data.doctorsPerformance || [])
      setDetailedConsultations(data.detailedConsultations || [])
      if (data.meta?.weeklyDateRange) setWeeklyDateRange(data.meta.weeklyDateRange)
      if (data.meta?.overallDateRange) setOverallDateRange(data.meta.overallDateRange)
    } catch (err) {
      console.error(err)
      toast.error("Error loading doctor consultation report data")
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, period, sourceFilter, doctorFilter, statusFilter])

  // Filtered detailed consultations on the client side
  const filteredRecords = useMemo(() => {
    let list = [...detailedConsultations]
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.consultationId.toLowerCase().includes(q) ||
          c.enquiryId.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [detailedConsultations, searchQuery])

  // Currency formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = ["Enquiry Source", "Total Consults", "Done", "Cancelled", "Pending", "Converted", "Conversion %", "Revenue (INR)"]
      const rows = overallReport.rows.map((r) => [
        `"${r.source}"`,
        r.totalConsults,
        r.done,
        r.cancelled,
        r.pending,
        r.converted,
        `"${r.conversionRate}%"`,
        r.revenue,
      ])
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Doctor_Consultation_Report_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Doctor Consultation Report CSV downloaded successfully")
    } catch (e) {
      toast.error("Failed to export report to CSV")
    }
  }

  // Print Sheet
  const handlePrint = () => {
    window.print()
  }

  // Send Email Digest Simulation
  const handleSendEmailDigest = async () => {
    if (!emailRecipients.trim()) {
      toast.error("Please enter recipient email addresses")
      return
    }
    setIsSendingEmail(true)
    setTimeout(() => {
      setIsSendingEmail(false)
      setIsEmailModalOpen(false)
      toast.success(`Doctor Consultation Report digest sent to: ${emailRecipients}`)
    }, 1200)
  }

  if (isLoading || !user) {
    return <Loader isLoading={true} contentOnly />
  }

  const wTotals = weeklyReport.totals || { totalConsults: 0, done: 0, cancelled: 0, pending: 0, converted: 0, conversionRate: 0, revenue: 0 }
  const oTotals = overallReport.totals || { totalConsults: 0, done: 0, cancelled: 0, pending: 0, converted: 0, conversionRate: 0, revenue: 0 }

  return (
    <DashboardLayout>
      <Loader isLoading={isFetching} contentOnly />
      <div className="space-y-6 pb-12">
        {/* Executive Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 border border-teal-700/50 shadow-2xl p-6 sm:p-8 text-white">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title & Badge */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/doctor-consultation")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-medium"
                >
                  ← Overview
                </Button>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-3 py-1 font-semibold text-xs tracking-wider uppercase backdrop-blur-md">
                  Management Report Sheet
                </Badge>
                <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 text-xs">
                  <Calendar className="w-3 h-3 mr-1 text-teal-300" />
                  Period: {weeklyDateRange}
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-xl border border-white/20 flex-shrink-0">
                  <Stethoscope className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                    Doctor Consultation Report Sheet
                  </h1>
                  <p className="text-sm sm:text-base text-teal-100/90 font-medium mt-1">
                    Executive summary of weekly & overall doctor consultations, channel conversions & revenue breakdown
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Button
                onClick={() => fetchReportData()}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-medium"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-medium"
              >
                <Download className="w-4 h-4 mr-2 text-emerald-300" />
                Export CSV
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-medium"
              >
                <Printer className="w-4 h-4 mr-2 text-teal-300" />
                Print Sheet
              </Button>
              <Button
                onClick={() => setIsEmailModalOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-teal-900/50 border border-emerald-400/30"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Digest
              </Button>
            </div>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* KPI 1: Total Consults */}
          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/30 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Total Consults</span>
                <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tabular-nums">{wTotals.totalConsults}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Overall Total:</span>
                  <span className="font-bold text-slate-700">{oTotals.totalConsults?.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI 2: Done */}
          <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed (Done)</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-600 tabular-nums">{wTotals.done}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Overall Done:</span>
                  <span className="font-bold text-emerald-700">{oTotals.done?.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI 3: Cancelled */}
          <Card className="border-rose-100 bg-gradient-to-br from-white to-rose-50/30 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Cancelled</span>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-600 tabular-nums">{wTotals.cancelled}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Overall Cancelled:</span>
                  <span className="font-bold text-rose-700">{oTotals.cancelled?.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI 4: Pending */}
          <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-600 tabular-nums">{wTotals.pending}</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Overall Pending:</span>
                  <span className="font-bold text-amber-700">{oTotals.pending?.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI 5: Conversion % */}
          <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/30 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Overall Conv. %</span>
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-purple-700 tabular-nums">{oTotals.conversionRate}%</div>
                <div className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-between">
                  <span>Converted Leads:</span>
                  <span className="font-bold text-purple-800">{oTotals.converted} leads</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI 6: Overall Revenue */}
          <Card className="border-blue-100 bg-gradient-to-br from-blue-900 to-slate-900 text-white shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Total Revenue</span>
                <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-emerald-300 tabular-nums">
                  ₹{(oTotals.revenue / 10000000).toFixed(2)} Cr
                </div>
                <div className="text-xs font-medium text-slate-300 mt-1 flex items-center justify-between">
                  <span>Avg per Conv:</span>
                  <span className="font-bold text-white">₹{Math.round(oTotals.avgRevenuePerConsult / 1000)}k</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Filter & Search Controls */}
        <Card className="border-slate-200 shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Left Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
                {/* Period Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Timeframe Period
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-300 font-medium">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_week">Weekly (31-08-2026 to 06-09-2026)</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="ytd">Year To Date (2026)</SelectItem>
                      <SelectItem value="all_time">Overall Total (02-07-2024 to Date)</SelectItem>
                      <SelectItem value="custom">Custom Date Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Enquiry Source Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Enquiry Source
                  </label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-300 font-medium">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Enquiry Sources</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="PriyaSharma AI Chat">PriyaSharma AI Chat</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="IVR">IVR</SelectItem>
                      <SelectItem value="Site Exit Pop-Up">Site Exit Pop-Up</SelectItem>
                      <SelectItem value="Reference">Reference</SelectItem>
                      <SelectItem value="CRR">CRR</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Doctor Alignment Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Doctor / Specialist
                  </label>
                  <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-300 font-medium">
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      <SelectItem value="Dr. Riya Sharma">Dr. Riya Sharma</SelectItem>
                      <SelectItem value="Dr. Amit Patel">Dr. Amit Patel</SelectItem>
                      <SelectItem value="Dr. Ananya Sen">Dr. Ananya Sen</SelectItem>
                      <SelectItem value="Dr. Vikram Malhotra">Dr. Vikram Malhotra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 bg-slate-50 border-slate-300 font-medium">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Done / Completed</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Global Search Input & Clear */}
              <div className="flex flex-col justify-end gap-1.5 lg:w-72">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Search Consultations
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <Input
                    placeholder="Search by Patient, ID, Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 bg-white border-slate-300 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabbed Management Views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-2 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger value="summary" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5">
              <FileText className="w-4 h-4 mr-2" />
              Executive Summary
            </TabsTrigger>
            <TabsTrigger value="doctors" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5">
              <User className="w-4 h-4 mr-2" />
              Doctor Analytics
            </TabsTrigger>
            <TabsTrigger value="charts" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5">
              <BarChart3 className="w-4 h-4 mr-2" />
              Visual Analytics
            </TabsTrigger>
            <TabsTrigger value="records" className="rounded-lg text-xs sm:text-sm font-semibold py-2.5">
              <Stethoscope className="w-4 h-4 mr-2" />
              Detailed Sheet ({filteredRecords.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXECUTIVE SUMMARY & SOURCE TABLES */}
          <TabsContent value="summary" className="space-y-8">
            {/* Section A: Selected Weekly / Period Consultation Report */}
            <Card className="border-teal-200/80 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-800 text-white p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Weekly Doctor Consultation Report</span>
                      <Badge className="bg-teal-400/20 text-teal-200 border-teal-400/40 text-xs font-medium">
                        {weeklyDateRange}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-teal-100/80 text-xs sm:text-sm mt-1">
                      Breakdown of inbound consultations by enquiry source for the active weekly period
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 font-semibold text-xs">
                    Total: {wTotals.totalConsults} Consultations
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-extrabold text-slate-800 py-3.5 pl-6 text-sm">Enquiry Source</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5 text-sm">Total Consults</TableHead>
                        <TableHead className="font-extrabold text-emerald-800 text-center py-3.5 text-sm">✅ Done</TableHead>
                        <TableHead className="font-extrabold text-rose-800 text-center py-3.5 text-sm">❌ Cancelled</TableHead>
                        <TableHead className="font-extrabold text-amber-800 text-center py-3.5 text-sm">⏳ Pending</TableHead>
                        <TableHead className="font-extrabold text-purple-800 text-center py-3.5 text-sm">🎯 Converted</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5 text-sm">📈 Conversion %</TableHead>
                        <TableHead className="font-extrabold text-teal-800 text-right py-3.5 pr-6 text-sm">💰 Revenue (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyReport.rows.map((r, idx) => (
                        <TableRow
                          key={r.source}
                          className={`hover:bg-teal-50/40 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <TableCell className="font-bold text-slate-900 pl-6 py-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                            {r.source}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-800 py-4 tabular-nums">
                            {r.totalConsults}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 py-4 tabular-nums">
                            {r.done}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-rose-700 py-4 tabular-nums">
                            {r.cancelled}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-amber-700 py-4 tabular-nums">
                            {r.pending}
                          </TableCell>
                          <TableCell className="text-center font-bold text-purple-700 py-4 tabular-nums">
                            {r.converted}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-800 py-4 tabular-nums">
                            <Badge
                              variant="outline"
                              className={
                                r.conversionRate > 0
                                  ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }
                            >
                              {r.conversionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-800 pr-6 py-4 tabular-nums">
                            {formatCurrency(r.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Weekly Summary Total Row */}
                      <TableRow className="bg-teal-900 text-white font-extrabold border-t-2 border-teal-700">
                        <TableCell className="pl-6 py-4 text-base font-black text-teal-100">Total (Weekly)</TableCell>
                        <TableCell className="text-center text-base py-4 text-white tabular-nums">{wTotals.totalConsults}</TableCell>
                        <TableCell className="text-center text-base py-4 text-emerald-300 tabular-nums">{wTotals.done}</TableCell>
                        <TableCell className="text-center text-base py-4 text-rose-300 tabular-nums">{wTotals.cancelled}</TableCell>
                        <TableCell className="text-center text-base py-4 text-amber-300 tabular-nums">{wTotals.pending}</TableCell>
                        <TableCell className="text-center text-base py-4 text-purple-300 tabular-nums">{wTotals.converted}</TableCell>
                        <TableCell className="text-center text-base py-4 text-white tabular-nums">{wTotals.conversionRate?.toFixed(2)}%</TableCell>
                        <TableCell className="text-right pr-6 py-4 text-base font-black text-emerald-300 tabular-nums">
                          {formatCurrency(wTotals.revenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Section B: Over All Total Consultation Report */}
            <Card className="border-slate-300 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Over All Total Consultation Report</span>
                      <Badge className="bg-amber-400/20 text-amber-200 border-amber-400/40 text-xs font-medium">
                        {overallDateRange}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-amber-100/80 text-xs sm:text-sm mt-1">
                      Historical cumulative performance report across all enquiry sources (02-07-2024 to date)
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 font-semibold text-xs">
                    Overall Consults: {oTotals.totalConsults?.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-extrabold text-slate-800 py-3.5 pl-6 text-sm">Enquiry Source</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5 text-sm">Total Consults</TableHead>
                        <TableHead className="font-extrabold text-emerald-800 text-center py-3.5 text-sm">✅ Done</TableHead>
                        <TableHead className="font-extrabold text-rose-800 text-center py-3.5 text-sm">❌ Cancelled</TableHead>
                        <TableHead className="font-extrabold text-amber-800 text-center py-3.5 text-sm">⏳ Pending</TableHead>
                        <TableHead className="font-extrabold text-purple-800 text-center py-3.5 text-sm">🎯 Converted</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5 text-sm">📈 Conversion %</TableHead>
                        <TableHead className="font-extrabold text-amber-800 text-right py-3.5 pr-6 text-sm">💰 Revenue (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overallReport.rows.map((r, idx) => (
                        <TableRow
                          key={r.source}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <TableCell className="font-bold text-slate-900 pl-6 py-3.5 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                            {r.source}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-800 py-3.5 tabular-nums">
                            {r.totalConsults.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 py-3.5 tabular-nums">
                            {r.done.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-rose-700 py-3.5 tabular-nums">
                            {r.cancelled.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-amber-700 py-3.5 tabular-nums">
                            {r.pending}
                          </TableCell>
                          <TableCell className="text-center font-bold text-purple-700 py-3.5 tabular-nums">
                            {r.converted.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-800 py-3.5 tabular-nums">
                            <Badge
                              variant="outline"
                              className={
                                r.conversionRate >= 10
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                                  : r.conversionRate >= 5
                                  ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                                  : "bg-slate-100 text-slate-700 border-slate-200 font-medium"
                              }
                            >
                              {r.conversionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-amber-900 pr-6 py-3.5 tabular-nums">
                            {formatCurrency(r.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Cumulative Total Row */}
                      <TableRow className="bg-slate-900 text-white font-extrabold border-t-2 border-slate-800">
                        <TableCell className="pl-6 py-4 text-base font-black text-amber-300">Total (Over All)</TableCell>
                        <TableCell className="text-center text-base py-4 text-white tabular-nums">
                          {oTotals.totalConsults?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-base py-4 text-emerald-300 tabular-nums">
                          {oTotals.done?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-base py-4 text-rose-300 tabular-nums">
                          {oTotals.cancelled?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-base py-4 text-amber-300 tabular-nums">
                          {oTotals.pending}
                        </TableCell>
                        <TableCell className="text-center text-base py-4 text-purple-300 tabular-nums">
                          {oTotals.converted?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-base py-4 text-white tabular-nums">
                          {oTotals.conversionRate?.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4 text-base font-black text-emerald-300 tabular-nums">
                          {formatCurrency(oTotals.revenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DOCTOR PERFORMANCE ANALYTICS */}
          <TabsContent value="doctors">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-teal-800 to-emerald-800 text-white p-6">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-300" />
                  Doctor & Specialist Performance Breakdown
                </CardTitle>
                <CardDescription className="text-teal-100 text-sm">
                  Consultation completion rates, lead conversion efficiency, and revenue attributed to doctors
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-extrabold text-slate-800 pl-6 py-3.5">Doctor Name</TableHead>
                        <TableHead className="font-extrabold text-slate-800 py-3.5">Specialization</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5">Total Consults</TableHead>
                        <TableHead className="font-extrabold text-emerald-800 text-center py-3.5">Done</TableHead>
                        <TableHead className="font-extrabold text-purple-800 text-center py-3.5">Converted</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5">Conversion Rate</TableHead>
                        <TableHead className="font-extrabold text-amber-800 text-center py-3.5">Avg SLA Time</TableHead>
                        <TableHead className="font-extrabold text-teal-900 text-right pr-6 py-3.5">Total Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctorsPerformance.map((doc) => (
                        <TableRow key={doc.doctorId} className="hover:bg-teal-50/30">
                          <TableCell className="font-bold text-slate-900 pl-6 py-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center text-sm border border-teal-200">
                              {doc.doctorName.replace("Dr. ", "").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{doc.doctorName}</div>
                              <div className="text-xs text-slate-500 font-medium">{doc.doctorId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium">{doc.specialization}</TableCell>
                          <TableCell className="text-center font-bold text-slate-800 tabular-nums">{doc.totalConsults.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 tabular-nums">{doc.done.toLocaleString()}</TableCell>
                          <TableCell className="text-center font-bold text-purple-700 tabular-nums">{doc.converted}</TableCell>
                          <TableCell className="text-center font-bold tabular-nums">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              {doc.conversionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 tabular-nums">
                            {doc.avgSlaMinutes} mins
                          </TableCell>
                          <TableCell className="text-right font-black text-teal-900 pr-6 tabular-nums">
                            {formatCurrency(doc.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: VISUAL ANALYTICS & CHARTS */}
          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Volume & Conversion by Channel */}
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-600" />
                    Overall Consultation Volume by Enquiry Source
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Total consultations vs completed consultations per channel
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overallReport.rows} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="source" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip formatter={(value: any) => [Number(value).toLocaleString(), "Count"]} />
                        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 10 }} />
                        <Bar dataKey="totalConsults" name="Total Consults" fill="#0d9488" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="done" name="Done / Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="converted" name="Converted" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2: Revenue Distribution per Channel */}
              <Card className="border-slate-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    Revenue Contribution by Enquiry Source
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Total revenue generated (₹) attributed to each lead source
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overallReport.rows.filter((r) => r.revenue > 0) as any}
                          dataKey="revenue"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          innerRadius={45}
                          paddingAngle={3}
                          label={({ name, percent }: any) => `${name} (${(((percent as number) || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {overallReport.rows.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => [formatCurrency(Number(val)), "Revenue"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: DETAILED CONSULTATION RECORDS SHEET */}
          <TabsContent value="records">
            <Card className="border-slate-200 shadow-md">
              <CardHeader className="bg-slate-800 text-white p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-teal-400" />
                      Detailed Consultation Record Sheet
                    </CardTitle>
                    <CardDescription className="text-slate-300 text-xs">
                      Granular patient consultation entries, SLA compliance, and stage tracking
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-teal-500/20 text-teal-200 border-teal-400/30">
                    Showing {filteredRecords.length} records
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100">
                      <TableRow>
                        <TableHead className="font-extrabold text-slate-800 pl-6 py-3.5">Consultation ID</TableHead>
                        <TableHead className="font-extrabold text-slate-800 py-3.5">Patient Details</TableHead>
                        <TableHead className="font-extrabold text-slate-800 py-3.5">Source</TableHead>
                        <TableHead className="font-extrabold text-slate-800 py-3.5">Doctor</TableHead>
                        <TableHead className="font-extrabold text-slate-800 py-3.5">Scheduled</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5">Status</TableHead>
                        <TableHead className="font-extrabold text-slate-800 text-center py-3.5">SLA</TableHead>
                        <TableHead className="font-extrabold text-teal-900 text-right pr-6 py-3.5">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          <TableCell className="pl-6 py-4 font-bold text-teal-700">
                            <div>{item.consultationId}</div>
                            <div className="text-xs text-slate-500 font-medium">{item.enquiryId}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-bold text-slate-900">{item.patientName}</div>
                            <div className="text-xs text-slate-500">{item.mobile} • {item.email}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-semibold">
                              {item.enquirySource}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 font-medium text-slate-800">{item.doctorName}</TableCell>
                          <TableCell className="py-4">
                            <div className="text-sm font-semibold text-slate-800">{item.scheduledDate}</div>
                            <div className="text-xs text-slate-500">{item.scheduledTime}</div>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <Badge
                              className={
                                item.status === "converted"
                                  ? "bg-purple-100 text-purple-800 border-purple-300"
                                  : item.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : item.status === "pending"
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-rose-100 text-rose-800 border-rose-300"
                              }
                            >
                              {item.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                item.slaStatus === "on-time"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.slaStatus === "at-risk"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {item.slaStatus.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            <Button
                              onClick={() => {
                                setSelectedRecord(item)
                                setIsDetailOpen(true)
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 border-teal-300 text-teal-800 hover:bg-teal-50 font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* MODAL 1: CONSULTATION RECORD DETAILS */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl p-6">
          {selectedRecord && (
            <>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                    {selectedRecord.consultationId}
                  </Badge>
                  <Badge
                    className={
                      selectedRecord.status === "converted"
                        ? "bg-purple-100 text-purple-800"
                        : selectedRecord.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {selectedRecord.status.toUpperCase()}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 mt-2">
                  {selectedRecord.patientName}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs">
                  Enquiry ID: {selectedRecord.enquiryId} • Patient ID: {selectedRecord.patientId}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Mobile Phone</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.mobile}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Email Address</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.email}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Enquiry Source</label>
                  <p className="font-semibold text-teal-700">{selectedRecord.enquirySource}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Aligned Doctor</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.doctorName}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Appointment Type</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.appointmentType}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400">Scheduled Time</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.scheduledDate} ({selectedRecord.scheduledTime})</p>
                </div>
              </div>

              {selectedRecord.postConsultationRemarks && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-2">
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Doctor Remarks</label>
                  <p className="text-sm text-slate-700 italic">"{selectedRecord.postConsultationRemarks}"</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedRecord.prescriptionUrl && (
                  <Button variant="outline" size="sm" asChild className="border-teal-300 text-teal-700">
                    <a href={selectedRecord.prescriptionUrl} target="_blank" rel="noreferrer">
                      <FileText className="w-3.5 h-3.5 mr-1" /> View Prescription
                    </a>
                  </Button>
                )}
                {selectedRecord.clientReportUrl && (
                  <Button variant="outline" size="sm" asChild className="border-blue-300 text-blue-700">
                    <a href={selectedRecord.clientReportUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Client Reports
                    </a>
                  </Button>
                )}
              </div>

              <DialogFooter className="mt-4 pt-3 border-t">
                <Button variant="secondary" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EMAIL DIGEST GENERATOR & DISPATCH */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-teal-600" />
              Send Doctor Consultation Report Digest
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Generate and email the management report sheet formatted like the reference email template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Recipients (comma separated)</label>
              <Input
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="director@kairali.com, dme@kairali.com"
                className="font-medium bg-slate-50 border-slate-300"
              />
            </div>

            {/* Email Preview Frame */}
            <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-4 font-sans text-xs">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-3">
                <div className="border-b pb-2 flex justify-between items-center">
                  <div className="font-bold text-slate-900 text-sm">
                    Weekly Doctor Consultation Report – {weeklyDateRange}
                  </div>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                    Kairali Management
                  </Badge>
                </div>

                <p className="text-slate-600">Dear Sir,</p>
                <p className="text-slate-600">Please find below the weekly summary of doctor consultations for the period {weeklyDateRange}.</p>

                <div className="font-bold text-slate-900 text-xs pt-1">Weekly Consultation Report – {weeklyDateRange}</div>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="p-1.5 font-bold">Enquiry Source</th>
                        <th className="p-1.5 font-bold text-center">Total</th>
                        <th className="p-1.5 font-bold text-center">Done</th>
                        <th className="p-1.5 font-bold text-center">Cancelled</th>
                        <th className="p-1.5 font-bold text-center">Pending</th>
                        <th className="p-1.5 font-bold text-center">Converted</th>
                        <th className="p-1.5 font-bold text-center">Conv %</th>
                        <th className="p-1.5 font-bold text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyReport.rows.map((r) => (
                        <tr key={r.source} className="border-b">
                          <td className="p-1.5 font-medium">{r.source}</td>
                          <td className="p-1.5 text-center">{r.totalConsults}</td>
                          <td className="p-1.5 text-center">{r.done}</td>
                          <td className="p-1.5 text-center">{r.cancelled}</td>
                          <td className="p-1.5 text-center">{r.pending}</td>
                          <td className="p-1.5 text-center">{r.converted}</td>
                          <td className="p-1.5 text-center">{r.conversionRate}%</td>
                          <td className="p-1.5 text-right">{r.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="font-bold text-amber-900 text-xs pt-2">Over All Total Consultation Report – {overallDateRange}</div>
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-amber-50 border-b">
                      <tr>
                        <th className="p-1.5 font-bold">Enquiry Source</th>
                        <th className="p-1.5 font-bold text-center">Total</th>
                        <th className="p-1.5 font-bold text-center">Done</th>
                        <th className="p-1.5 font-bold text-center">Cancelled</th>
                        <th className="p-1.5 font-bold text-center">Pending</th>
                        <th className="p-1.5 font-bold text-center">Converted</th>
                        <th className="p-1.5 font-bold text-center">Conv %</th>
                        <th className="p-1.5 font-bold text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallReport.rows.slice(0, 5).map((r) => (
                        <tr key={r.source} className="border-b">
                          <td className="p-1.5 font-medium">{r.source}</td>
                          <td className="p-1.5 text-center">{r.totalConsults}</td>
                          <td className="p-1.5 text-center">{r.done}</td>
                          <td className="p-1.5 text-center">{r.cancelled}</td>
                          <td className="p-1.5 text-center">{r.pending}</td>
                          <td className="p-1.5 text-center">{r.converted}</td>
                          <td className="p-1.5 text-center">{r.conversionRate}%</td>
                          <td className="p-1.5 text-right">{r.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-slate-500 text-[11px]">Best regards,<br/>Kairali CRM Management System</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmailDigest}
              disabled={isSendingEmail}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
            >
              {isSendingEmail ? "Sending..." : "Dispatch Email Digest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
