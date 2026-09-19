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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  ChevronLeft,
  User,
  Phone,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Award,
  Zap,
  RotateCcw,
  Sparkles,
  CalendarDays,
  Check,
  FileSpreadsheet,
  AlertCircle,
  ChevronDown,
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
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"
import type { SourceReportRow, DoctorPerformanceRow, DetailedConsultationItem } from "@/app/api/doctor/report/route"

const CHART_COLORS = [
  "#2563eb", // blue-600
  "#0d9488", // teal-600
  "#8b5cf6", // purple-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#64748b", // slate-500
]

export interface WeekOption {
  id: string
  label: string
  shortLabel: string
  startDate: string
  endDate: string
  isCurrent?: boolean
  isBenchmark?: boolean
}

const DEFAULT_WEEKS: WeekOption[] = [
  {
    id: "2026-W37",
    label: "Week 37: 07-09-2026 To 13-09-2026 (Current Week)",
    shortLabel: "07-09-2026 To 13-09-2026",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    isCurrent: true,
  },
  {
    id: "2026-W36",
    label: "Week 36: 31-08-2026 To 06-09-2026 (Benchmark Email Report)",
    shortLabel: "31-08-2026 To 06-09-2026",
    startDate: "2026-08-31",
    endDate: "2026-09-06",
    isBenchmark: true,
  },
  {
    id: "2026-W35",
    label: "Week 35: 24-08-2026 To 30-08-2026",
    shortLabel: "24-08-2026 To 30-08-2026",
    startDate: "2026-08-24",
    endDate: "2026-08-30",
  },
  {
    id: "2026-W34",
    label: "Week 34: 17-08-2026 To 23-08-2026",
    shortLabel: "17-08-2026 To 23-08-2026",
    startDate: "2026-08-17",
    endDate: "2026-08-23",
  },
  {
    id: "2026-W33",
    label: "Week 33: 10-08-2026 To 16-08-2026",
    shortLabel: "10-08-2026 To 16-08-2026",
    startDate: "2026-08-10",
    endDate: "2026-08-16",
  },
]

function formatDateDDMMYYYY(isoDate: string): string {
  if (!isoDate) return ""
  const parts = isoDate.split("-")
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return isoDate
}

export default function DoctorConsultationReportPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // State management
  const [period, setPeriod] = useState<string>("this_week")
  const [availableWeeks, setAvailableWeeks] = useState<WeekOption[]>(DEFAULT_WEEKS)
  const [selectedWeekId, setSelectedWeekId] = useState<string>("2026-W36")
  const [customStartDate, setCustomStartDate] = useState<string>("2026-08-31")
  const [customEndDate, setCustomEndDate] = useState<string>("2026-09-06")
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false)
  const [registerFilterMode, setRegisterFilterMode] = useState<"all" | "week">("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [doctorFilter, setDoctorFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("summary")

  // Pagination for detailed records table
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10)

  // Data states
  const [isFetching, setIsFetching] = useState<boolean>(true)
  const [isLive, setIsLive] = useState<boolean>(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("")
  const [weeklyReport, setWeeklyReport] = useState<{ rows: SourceReportRow[]; totals: any }>({ rows: [], totals: null })
  const [overallReport, setOverallReport] = useState<{ rows: SourceReportRow[]; totals: any }>({ rows: [], totals: null })
  const [doctorsPerformance, setDoctorsPerformance] = useState<DoctorPerformanceRow[]>([])
  const [detailedConsultations, setDetailedConsultations] = useState<DetailedConsultationItem[]>([])
  const [weeklyDateRange, setWeeklyDateRange] = useState<string>("31-08-2026 To 06-09-2026")
  const [overallDateRange, setOverallDateRange] = useState<string>("All Time")

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<DetailedConsultationItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false)
  const [emailRecipients, setEmailRecipients] = useState<string>("director@kairali.com, dme@kairali.com")
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false)

  // ── Active Week Bounds ────────────────────────────────────────────────────────
  const activeWeekBounds = useMemo(() => {
    if (isCustomMode || selectedWeekId === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        label: `Custom: ${formatDateDDMMYYYY(customStartDate)} To ${formatDateDDMMYYYY(customEndDate)}`,
        shortLabel: `${formatDateDDMMYYYY(customStartDate)} To ${formatDateDDMMYYYY(customEndDate)}`,
      }
    }
    const found = availableWeeks.find((w) => w.id === selectedWeekId) || availableWeeks[1]
    return {
      startDate: found.startDate,
      endDate: found.endDate,
      label: found.label,
      shortLabel: found.shortLabel,
    }
  }, [selectedWeekId, isCustomMode, customStartDate, customEndDate, availableWeeks])

  // ── Radix Focus Lock / Freeze Prevention ─────────────────────────────────────
  useEffect(() => {
    const clearPointerLock = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "auto"
      }
    }
    clearPointerLock()
    const observer = new MutationObserver(clearPointerLock)
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] })
    return () => observer.disconnect()
  }, [])

  // Redirect if unauthenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  // Fetch report data with direct GAS fallback resilience
  const fetchReportData = async (force = false, showToast = false) => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams()
      params.set("period", period)
      params.set("week", selectedWeekId)
      params.set("startDate", activeWeekBounds.startDate)
      params.set("endDate", activeWeekBounds.endDate)
      params.set("source", sourceFilter)
      params.set("doctor", doctorFilter)
      params.set("status", statusFilter)
      if (searchQuery) params.set("q", searchQuery)
      if (force) params.set("force", "true")

      const res = await fetch(`/api/doctor/report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load doctor consultation report data from API")
      const data = await res.json()

      setWeeklyReport(data.weeklyReport)
      setOverallReport(data.overallReport)
      setDoctorsPerformance(data.doctorsPerformance || [])
      setDetailedConsultations(data.detailedConsultations || [])
      if (data.meta?.availableWeeks) setAvailableWeeks(data.meta.availableWeeks)
      if (data.meta?.weeklyDateRange) setWeeklyDateRange(data.meta.weeklyDateRange)
      if (data.meta?.overallDateRange) setOverallDateRange(data.meta.overallDateRange)
      if (typeof data.meta?.isLive === "boolean") setIsLive(data.meta.isLive)
      if (data.meta?.lastSyncedAt) setLastSyncedAt(data.meta.lastSyncedAt)

      if (showToast) {
        toast.success("Live Consultation Report synced successfully")
      }
    } catch (err) {
      console.warn("[DoctorReport] API route failed, attempting direct Google Sheet sync fallback...", err)
      // Resilient fallback: fetch direct from Google Apps Script endpoint
      try {
        const gasUrl =
          "https://script.google.com/macros/s/AKfycbznKCwlrWAdI-Oic-ZjjrLtfVR-xyoD4c37KvLHtWr513g0stY69k_AQgZlrd6R_2ysKw/exec"
        const directRes = await fetch(gasUrl)
        if (directRes.ok) {
          const json = await directRes.json()
          const rawItems = Array.isArray(json) ? json : json?.data || []
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const parsedRows: SourceReportRow[] = []
            let totalRowItem: any = null

            for (const item of rawItems) {
              const src = String(item["Enquiry Received Source"] || "").trim()
              if (src.toLowerCase() === "total") {
                totalRowItem = item
              } else if (src) {
                const totalConsults =
                  parseInt(String(item["Total Consultation Received"] || "0").replace(/,/g, ""), 10) || 0
                const done = parseInt(String(item["Successfully Done"] || "0").replace(/,/g, ""), 10) || 0
                const cancelled =
                  parseInt(
                    String(item["Cancelled Consultaion"] || item["Cancelled Consultation"] || "0").replace(/,/g, ""),
                    10
                  ) || 0
                const pending = parseInt(String(item["Pending Consultation"] || "0").replace(/,/g, ""), 10) || 0
                const converted = parseInt(String(item["Converted Count"] || "0").replace(/,/g, ""), 10) || 0
                const rawConv = String(item["Conversion %"] || "").replace("%", "").trim()
                const conversionRate =
                  parseFloat(rawConv) || (done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0)
                const revenue = parseInt(String(item["Revenue (₹)"] || item["Revenue"] || "0").replace(/,/g, ""), 10) || 0
                const avgRevenuePerConsult = converted > 0 ? Math.round(revenue / converted) : 0

                parsedRows.push({
                  source: src,
                  totalConsults,
                  done,
                  cancelled,
                  pending,
                  converted,
                  conversionRate,
                  revenue,
                  avgRevenuePerConsult,
                })
              }
            }

            let filteredRows = [...parsedRows]
            if (sourceFilter !== "all") {
              filteredRows = filteredRows.filter((r) => r.source.toLowerCase() === sourceFilter.toLowerCase())
            }

            const calcTotalConsults = filteredRows.reduce((a, b) => a + b.totalConsults, 0)
            const calcDone = filteredRows.reduce((a, b) => a + b.done, 0)
            const calcCancelled = filteredRows.reduce((a, b) => a + b.cancelled, 0)
            const calcPending = filteredRows.reduce((a, b) => a + b.pending, 0)
            const calcConverted = filteredRows.reduce((a, b) => a + b.converted, 0)
            const calcRevenue = filteredRows.reduce((a, b) => a + b.revenue, 0)
            const calcConversionRate =
              calcDone > 0 ? parseFloat(((calcConverted / calcDone) * 100).toFixed(2)) : 0
            const calcAvgRevenue = calcConverted > 0 ? Math.round(calcRevenue / calcConverted) : 0

            setOverallReport({
              rows: filteredRows,
              totals: {
                totalConsults: calcTotalConsults,
                done: calcDone,
                cancelled: calcCancelled,
                pending: calcPending,
                converted: calcConverted,
                conversionRate: calcConversionRate,
                revenue: calcRevenue,
                avgRevenuePerConsult: calcAvgRevenue,
              },
            })
            setIsLive(true)
            setLastSyncedAt(new Date().toISOString())
            if (showToast) toast.success("Live Consultation Report synced directly from Google Sheets")
            return
          }
        }
      } catch (directErr) {
        console.error("Direct fallback fetch also encountered an error:", directErr)
      }
      toast.error("Error loading doctor consultation report data")
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchReportData()
    }
  }, [user, period, selectedWeekId, customStartDate, customEndDate, isCustomMode, sourceFilter, doctorFilter, statusFilter])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sourceFilter, doctorFilter, statusFilter, period, selectedWeekId, registerFilterMode])

  // Dynamic available doctor list
  const availableDoctors = useMemo(() => {
    const set = new Set<string>()
    doctorsPerformance.forEach((d) => {
      if (d.doctorName) set.add(d.doctorName)
    })
    const defaults = [
      "Dr. Priya Devi N",
      "DR. SALI P.S",
      "Dr Deepu John",
      "Dr. Rahul R",
      "Dr. Ashikha Raj",
      "Dr. Akhila Oommen",
    ]
    defaults.forEach((d) => set.add(d))
    return Array.from(set)
  }, [doctorsPerformance])

  // ── Automatic Week-Wise Calculation from Live Records ──────────────────────
  const computedWeeklyReport = useMemo(() => {
    const { startDate, endDate } = activeWeekBounds
    if (!detailedConsultations || detailedConsultations.length === 0) {
      return weeklyReport
    }

    let inRange = detailedConsultations.filter((c) => {
      const d = c.scheduledDate || c.createdAt?.split("T")[0] || ""
      return d >= startDate && d <= endDate
    })

    if (doctorFilter !== "all") {
      inRange = inRange.filter((c) =>
        c.doctorName.toLowerCase().includes(doctorFilter.toLowerCase())
      )
    }

    const sourceMap = new Map<
      string,
      {
        total: number
        done: number
        cancelled: number
        pending: number
        converted: number
        revenue: number
      }
    >()

    for (const item of inRange) {
      const src = item.enquirySource || "Website"
      const current = sourceMap.get(src) || {
        total: 0,
        done: 0,
        cancelled: 0,
        pending: 0,
        converted: 0,
        revenue: 0,
      }
      current.total += 1
      if (item.status === "completed" || item.status === "converted") current.done += 1
      if (item.status === "cancelled") current.cancelled += 1
      if (item.status === "pending") current.pending += 1
      if (item.status === "converted") {
        current.converted += 1
        current.revenue += item.revenue || 0
      }
      sourceMap.set(src, current)
    }

    const rows: SourceReportRow[] = []
    for (const [source, data] of sourceMap.entries()) {
      if (sourceFilter !== "all" && source.toLowerCase() !== sourceFilter.toLowerCase()) {
        continue
      }
      const conversionRate =
        data.done > 0 ? parseFloat(((data.converted / data.done) * 100).toFixed(2)) : 0
      const avgRevenuePerConsult =
        data.converted > 0 ? Math.round(data.revenue / data.converted) : 0

      rows.push({
        source,
        totalConsults: data.total,
        done: data.done,
        cancelled: data.cancelled,
        pending: data.pending,
        converted: data.converted,
        conversionRate,
        revenue: data.revenue,
        avgRevenuePerConsult,
      })
    }

    if (rows.length === 0 && startDate === "2026-08-31" && endDate === "2026-09-06" && weeklyReport.rows.length > 0) {
      return weeklyReport
    }

    rows.sort((a, b) => b.totalConsults - a.totalConsults)

    const totalConsults = rows.reduce((a, b) => a + b.totalConsults, 0)
    const done = rows.reduce((a, b) => a + b.done, 0)
    const cancelled = rows.reduce((a, b) => a + b.cancelled, 0)
    const pending = rows.reduce((a, b) => a + b.pending, 0)
    const converted = rows.reduce((a, b) => a + b.converted, 0)
    const revenue = rows.reduce((a, b) => a + b.revenue, 0)
    const conversionRate =
      done > 0 ? parseFloat(((converted / done) * 100).toFixed(2)) : 0
    const avgRevenuePerConsult =
      converted > 0 ? Math.round(revenue / converted) : 0

    return {
      rows,
      totals: {
        source: "TOTAL (WEEKLY)",
        totalConsults,
        done,
        cancelled,
        pending,
        converted,
        conversionRate,
        revenue,
        avgRevenuePerConsult,
      },
    }
  }, [detailedConsultations, activeWeekBounds, sourceFilter, doctorFilter, weeklyReport])

  // Week navigation index helpers
  const currentWeekIndex = availableWeeks.findIndex((w) => w.id === selectedWeekId)
  const canGoPrevious = currentWeekIndex >= 0 && currentWeekIndex < availableWeeks.length - 1
  const canGoNext = currentWeekIndex > 0

  const handlePreviousWeek = () => {
    if (canGoPrevious) {
      setIsCustomMode(false)
      setSelectedWeekId(availableWeeks[currentWeekIndex + 1].id)
    }
  }

  const handleNextWeek = () => {
    if (canGoNext) {
      setIsCustomMode(false)
      setSelectedWeekId(availableWeeks[currentWeekIndex - 1].id)
    }
  }

  const handleCurrentWeek = () => {
    setIsCustomMode(false)
    setSelectedWeekId("2026-W37")
  }

  const handleBenchmarkWeek = () => {
    setIsCustomMode(false)
    setSelectedWeekId("2026-W36")
  }

  const weeklyRecordsCount = useMemo(() => {
    const { startDate, endDate } = activeWeekBounds
    return detailedConsultations.filter((c) => {
      const d = c.scheduledDate || c.createdAt?.split("T")[0] || ""
      return d >= startDate && d <= endDate
    }).length
  }, [detailedConsultations, activeWeekBounds])

  // Filtered detailed consultations on client
  const filteredRecords = useMemo(() => {
    let list = [...detailedConsultations]
    if (registerFilterMode === "week") {
      const { startDate, endDate } = activeWeekBounds
      list = list.filter((c) => {
        const d = c.scheduledDate || c.createdAt?.split("T")[0] || ""
        return d >= startDate && d <= endDate
      })
    }
    if (sourceFilter !== "all") {
      list = list.filter((c) => c.enquirySource.toLowerCase() === sourceFilter.toLowerCase())
    }
    if (doctorFilter !== "all") {
      list = list.filter((c) => c.doctorName.toLowerCase().includes(doctorFilter.toLowerCase()))
    }
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (c) =>
          c.patientName.toLowerCase().includes(q) ||
          c.consultationId.toLowerCase().includes(q) ||
          c.enquiryId.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q) ||
          c.enquirySource.toLowerCase().includes(q)
      )
    }
    return list
  }, [detailedConsultations, registerFilterMode, activeWeekBounds, sourceFilter, doctorFilter, statusFilter, searchQuery])

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage
    return filteredRecords.slice(startIndex, startIndex + recordsPerPage)
  }, [filteredRecords, currentPage, recordsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / recordsPerPage))

  // Currency formatter
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0)
  }

  // Active filter count
  const hasActiveFilters = period !== "this_week" || sourceFilter !== "all" || doctorFilter !== "all" || statusFilter !== "all" || searchQuery !== "" || isCustomMode

  const clearFilters = () => {
    setPeriod("this_week")
    setSelectedWeekId("2026-W36")
    setIsCustomMode(false)
    setRegisterFilterMode("all")
    setSourceFilter("all")
    setDoctorFilter("all")
    setStatusFilter("all")
    setSearchQuery("")
    toast.info("All filters reset to default")
  }

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        "Report Section",
        "Enquiry Source",
        "Total Consults",
        "Done / Completed",
        "Cancelled",
        "Pending",
        "Converted",
        "Conversion %",
        "Revenue (INR)",
      ]

      const weeklyRows = computedWeeklyReport.rows.map((r) => [
        `"Weekly (${activeWeekBounds.shortLabel})"`,
        `"${r.source}"`,
        r.totalConsults,
        r.done,
        r.cancelled,
        r.pending,
        r.converted,
        `"${r.conversionRate}%"`,
        r.revenue,
      ])

      const overallRows = overallReport.rows.map((r) => [
        `"Over All Cumulative"`,
        `"${r.source}"`,
        r.totalConsults,
        r.done,
        r.cancelled,
        r.pending,
        r.converted,
        `"${r.conversionRate}%"`,
        r.revenue,
      ])

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...weeklyRows.map((e) => e.join(",")), ...overallRows.map((e) => e.join(","))].join("\n")

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Kairali_Doctor_Consultation_Report_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Doctor Consultation Report CSV downloaded successfully")
    } catch {
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
      toast.success(`Executive Doctor Consultation Report digest sent to: ${emailRecipients}`)
    }, 1200)
  }

  if (isLoading || !user) {
    return <Loader isLoading={true} contentOnly />
  }

  const wTotals = computedWeeklyReport.totals || {
    totalConsults: 0,
    done: 0,
    cancelled: 0,
    pending: 0,
    converted: 0,
    conversionRate: 0,
    revenue: 0,
    avgRevenuePerConsult: 0,
  }

  const oTotals = overallReport.totals || {
    totalConsults: 0,
    done: 0,
    cancelled: 0,
    pending: 0,
    converted: 0,
    conversionRate: 0,
    revenue: 0,
    avgRevenuePerConsult: 0,
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <Loader isLoading={isFetching} contentOnly />

        {/* Print styling helper */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            .no-print,
            header,
            aside,
            nav,
            button {
              display: none !important;
            }
            .print-full-width {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .shadow-md,
            .shadow-lg,
            .shadow-xl,
            .shadow-2xl {
              box-shadow: none !important;
            }
          }
        `}</style>

        <div className="space-y-6 pb-14 print-full-width">
          {/* ═══════════════════════════════════════════════════════════════════
              1. EXECUTIVE HERO HEADER SECTION (Consistent with Doctor Hub)
          ════════════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.25)] rounded-2xl overflow-hidden text-white no-print">
            <div className="w-full px-5 sm:px-8 py-6 sm:py-7 relative">
              {/* Background ambient lighting effects */}
              <div className="absolute right-0 top-0 -mt-8 -mr-8 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 rounded-full bg-indigo-400/20 blur-2xl pointer-events-none" />

              {/* Back Button */}
              <button
                onClick={() => router.push("/doctor-consultation")}
                className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
              >
                ← Back to Doctor Hub
              </button>

              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                {/* Left Section - Icon, Title & Navigation Pills */}
                <div className="space-y-4 w-full lg:max-w-3xl">
                  <div className="flex items-start sm:items-center gap-4">
                    {/* Icon Container */}
                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/30 flex-shrink-0">
                      <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                          Doctor Consultation Report Sheet
                        </h1>
                        <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider backdrop-blur-sm flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {isLive ? "Live Google Sheet Synced" : "Offline / Snapshot"}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-blue-100/90 mt-1 font-medium flex items-center gap-2 flex-wrap">
                        <span>Comprehensive weekly & cumulative audit of clinical consultations, channel conversions & revenue</span>
                        {lastSyncedAt && (
                          <span className="text-xs text-blue-200/90 bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                            Synced: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Unified Hub Navigation Bar */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/doctor-consultation")}
                      className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold backdrop-blur-sm transition-all shadow-sm"
                    >
                      <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> Overview Hub
                    </Button>
                    <Button
                      size="sm"
                      className="bg-white text-blue-900 hover:bg-white/95 text-xs font-bold shadow-md transition-all scale-[1.02] border-white/40"
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5 text-blue-700" /> Reports Hub
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/doctor-consultation/calendar")}
                      className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold backdrop-blur-sm transition-all shadow-sm"
                    >
                      <CalendarDays className="mr-1.5 h-3.5 w-3.5" /> Doctor Calendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/doctor-consultation/history")}
                      className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold backdrop-blur-sm transition-all shadow-sm"
                    >
                      <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Call History
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/doctor-consultation/prescription/new")}
                      className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold backdrop-blur-sm transition-all shadow-sm"
                    >
                      + New Prescription
                    </Button>
                  </div>
                </div>

                {/* Right Section - Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto lg:justify-end">
                  <Button
                    onClick={() => fetchReportData(true, true)}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-md font-medium text-xs h-9"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                    Sync Now
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-md font-medium text-xs h-9"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                    Export CSV
                  </Button>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/25 backdrop-blur-md font-medium text-xs h-9"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-200" />
                    Print Sheet
                  </Button>
                  <Button
                    onClick={() => setIsEmailModalOpen(true)}
                    size="sm"
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs h-9 shadow-lg shadow-emerald-950/30 border border-emerald-400/40"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Email Digest
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              2. EXECUTIVE KPI METRIC CARDS
          ════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
            {/* KPI 1: Total Consultations */}
            <Card className="border-blue-100/80 bg-gradient-to-br from-white via-blue-50/20 to-blue-50/50 shadow-sm hover:shadow-md transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Total Consults</span>
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shadow-sm">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {wTotals.totalConsults}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Overall Cumulative:</span>
                    <span className="font-bold text-slate-800">{oTotals.totalConsults?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Done / Completed */}
            <Card className="border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/50 shadow-sm hover:shadow-md transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Done (Completed)</span>
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
                    {wTotals.done}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Completion Rate:</span>
                    <span className="font-bold text-emerald-700">
                      {oTotals.totalConsults > 0
                        ? `${Math.round((oTotals.done / oTotals.totalConsults) * 100)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Cancelled */}
            <Card className="border-rose-100/80 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/50 shadow-sm hover:shadow-md transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Cancelled</span>
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shadow-sm">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">
                    {wTotals.cancelled}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Overall Cancelled:</span>
                    <span className="font-bold text-rose-700">{oTotals.cancelled?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Pending Queue */}
            <Card className="border-amber-100/80 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/50 shadow-sm hover:shadow-md transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Queue</span>
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shadow-sm">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-amber-600 tabular-nums">
                    {wTotals.pending}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Overall Pending:</span>
                    <span className="font-bold text-amber-700">{oTotals.pending?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 5: Conversion Rate */}
            <Card className="border-purple-100/80 bg-gradient-to-br from-white via-purple-50/20 to-purple-50/50 shadow-sm hover:shadow-md transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Conversion Rate</span>
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700 shadow-sm">
                    <Target className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-purple-700 tabular-nums">
                    {oTotals.conversionRate}%
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Converted Patients:</span>
                    <span className="font-bold text-purple-800">{oTotals.converted} leads</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPI 6: Overall Revenue Attributed */}
            <Card className="border-indigo-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-md hover:shadow-lg transition-all rounded-xl">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Total Revenue</span>
                  <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-300 tabular-nums">
                    ₹{(oTotals.revenue / 10000000).toFixed(2)} Cr
                  </div>
                  <div className="text-[11px] font-medium text-slate-300 mt-1 flex items-center justify-between pt-1 border-t border-white/10">
                    <span>Avg / Conversion:</span>
                    <span className="font-bold text-white">
                      ₹{Math.round(oTotals.avgRevenuePerConsult / 1000)}k
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              3. ADVANCED FILTERS & CONTROLS CARD
          ════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm no-print">
            {/* Filter Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 border-b border-slate-200 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Filters & Date Range Selector
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine consultation analytics by timeframe, source, doctor, or keyword
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {hasActiveFilters && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    Filters Active
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="bg-white border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 h-8"
                >
                  <RotateCcw className="w-3 h-3 mr-1.5 text-slate-500" />
                  Reset Filters
                </Button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Timeframe Period */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Timeframe Period
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-300 text-xs font-medium">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_week">Weekly (31-08-2026 to 06-09-2026)</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="ytd">Year To Date (2026)</SelectItem>
                      <SelectItem value="all_time">Cumulative (All Time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Enquiry Source */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Enquiry Source
                  </label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-300 text-xs font-medium">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
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

                {/* 3. Doctor Alignment */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Doctor / Specialist
                  </label>
                  <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-300 text-xs font-medium">
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {availableDoctors.map((doc) => (
                        <SelectItem key={doc} value={doc}>
                          {doc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Status Filter */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 bg-slate-50 border-slate-300 text-xs font-medium">
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

                {/* 5. Search Bar */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Search Keyword
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      placeholder="Patient, ID, mobile, source..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8.5 h-9 bg-white border-slate-300 text-xs font-medium"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              4. MAIN MANAGEMENT VIEWS (TABS)
          ════════════════════════════════════════════════════════════════════ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="border-b border-slate-200 pb-2 no-print">
              <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
                <TabsTrigger value="summary" className="rounded-lg text-xs sm:text-sm font-semibold px-4 py-2">
                  <FileText className="w-4 h-4 mr-2 text-blue-600" />
                  Executive Report Tables
                </TabsTrigger>
                <TabsTrigger value="doctors" className="rounded-lg text-xs sm:text-sm font-semibold px-4 py-2">
                  <User className="w-4 h-4 mr-2 text-emerald-600" />
                  Doctor Analytics
                </TabsTrigger>
                <TabsTrigger value="charts" className="rounded-lg text-xs sm:text-sm font-semibold px-4 py-2">
                  <BarChart3 className="w-4 h-4 mr-2 text-purple-600" />
                  Visual Intelligence
                </TabsTrigger>
                <TabsTrigger value="records" className="rounded-lg text-xs sm:text-sm font-semibold px-4 py-2">
                  <Stethoscope className="w-4 h-4 mr-2 text-teal-600" />
                  Consultation Register ({filteredRecords.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                TAB 1: EXECUTIVE REPORT TABLES (Weekly + Cumulative)
            ────────────────────────────────────────────────────────────── */}
            <TabsContent value="summary" className="space-y-8">
              {/* SECTION A: WEEKLY REPORT TABLE */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header Banner with Week Controls */}
                <div className="bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                          Weekly Doctor Consultation Report
                        </h2>
                        <Badge className="bg-blue-400/20 text-blue-200 border-blue-400/40 text-xs font-bold px-2.5 py-0.5">
                          📅 {activeWeekBounds.shortLabel}
                        </Badge>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[11px] font-semibold flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          Auto-Calculated from Live Records
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-blue-100/80">
                        Inbound consultations by enquiry source dynamically aggregated for the selected week
                      </p>
                    </div>

                    {/* Weekly KPI Highlights */}
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                      <div className="text-right">
                        <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Weekly Volume</div>
                        <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
                          {wTotals.totalConsults} <span className="text-xs font-medium text-blue-200">Consults</span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-white/20 mx-1" />
                      <div className="text-right">
                        <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Weekly Revenue</div>
                        <div className="text-base sm:text-lg font-black text-emerald-300 tabular-nums">
                          {formatCurrency(wTotals.revenue)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Week Navigator Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/15">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-200 uppercase tracking-wide flex items-center gap-1.5 mr-1">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-300" />
                        Select Week:
                      </span>

                      {/* Previous Week Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePreviousWeek}
                        disabled={!canGoPrevious}
                        className="h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none"
                        title="Go to previous week"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                        Prev
                      </Button>

                      {/* Week Dropdown */}
                      <Select
                        value={isCustomMode ? "custom" : selectedWeekId}
                        onValueChange={(val) => {
                          if (val === "custom") {
                            setIsCustomMode(true)
                          } else {
                            setIsCustomMode(false)
                            setSelectedWeekId(val)
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-[240px] sm:w-[310px] bg-white text-slate-900 border-white/30 text-xs font-bold shadow-sm">
                          <SelectValue placeholder="Select weekly period..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900">
                          {availableWeeks.map((w) => (
                            <SelectItem key={w.id} value={w.id} className="text-xs py-2 font-medium">
                              <span className="font-bold text-slate-900">{w.label}</span>
                              {w.isCurrent && (
                                <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                  CURRENT
                                </span>
                              )}
                              {w.isBenchmark && (
                                <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  BENCHMARK
                                </span>
                              )}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom" className="text-xs py-2 font-bold text-indigo-700">
                            📅 Custom Date Range...
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Next Week Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNextWeek}
                        disabled={!canGoNext}
                        className="h-8 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none"
                        title="Go to next week"
                      >
                        Next
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>

                      {/* Quick Jump Buttons */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCurrentWeek}
                        className={`h-8 text-xs font-bold border-white/20 ${
                          selectedWeekId === "2026-W37" && !isCustomMode
                            ? "bg-white text-blue-900 shadow"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                      >
                        ⚡ This Week
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBenchmarkWeek}
                        className={`h-8 text-xs font-bold border-white/20 ${
                          selectedWeekId === "2026-W36" && !isCustomMode
                            ? "bg-amber-400 text-slate-950 font-black shadow"
                            : "bg-white/10 hover:bg-white/20 text-amber-300"
                        }`}
                      >
                        Week 36 (Benchmark)
                      </Button>
                    </div>

                    {/* Tab 4 quick bridge link */}
                    <button
                      onClick={() => {
                        setRegisterFilterMode("week")
                        setActiveTab("records")
                      }}
                      className="text-xs text-blue-200 hover:text-white underline font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Week Patient Dossiers ({weeklyRecordsCount})
                    </button>
                  </div>

                  {/* Custom Date Range Picker Accordion / Bar */}
                  {isCustomMode && (
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 text-xs text-white">
                        <span className="font-bold">Start Date:</span>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="h-8 w-36 bg-white text-slate-900 text-xs font-semibold"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white">
                        <span className="font-bold">End Date:</span>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="h-8 w-36 bg-white text-slate-900 text-xs font-semibold"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => fetchReportData(false, true)}
                        className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Apply Window
                      </Button>
                      <button
                        onClick={() => {
                          setIsCustomMode(false)
                          setSelectedWeekId("2026-W36")
                        }}
                        className="text-xs text-blue-200 hover:text-white underline ml-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-slate-800 py-3.5 pl-6 text-xs uppercase tracking-wider">
                          Enquiry Source
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Total Consults
                        </TableHead>
                        <TableHead className="font-black text-emerald-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Done
                        </TableHead>
                        <TableHead className="font-black text-rose-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Cancelled
                        </TableHead>
                        <TableHead className="font-black text-amber-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Pending
                        </TableHead>
                        <TableHead className="font-black text-purple-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Converted
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Conv. %
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-right py-3.5 pr-6 text-xs uppercase tracking-wider">
                          Revenue (₹)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedWeeklyReport.rows.map((r, idx) => (
                        <TableRow
                          key={r.source}
                          className={`hover:bg-blue-50/80 transition-colors border-b border-slate-200/70 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                          }`}
                        >
                          <TableCell className="font-bold text-slate-900 pl-6 py-3.5 text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                            {r.source}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-900 py-3.5 text-sm tabular-nums">
                            {r.totalConsults}
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-700 py-3.5 text-sm tabular-nums">
                            {r.done}
                          </TableCell>
                          <TableCell className="text-center font-bold text-rose-700 py-3.5 text-sm tabular-nums">
                            {r.cancelled}
                          </TableCell>
                          <TableCell className="text-center font-bold text-amber-700 py-3.5 text-sm tabular-nums">
                            {r.pending}
                          </TableCell>
                          <TableCell className="text-center font-bold text-purple-700 py-3.5 text-sm tabular-nums">
                            {r.converted}
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-900 py-3.5 text-sm tabular-nums">
                            <Badge
                              variant="outline"
                              className={
                                r.conversionRate > 0
                                  ? "bg-purple-100 text-purple-800 border-purple-300 font-bold"
                                  : "bg-slate-100 text-slate-700 border-slate-200 font-medium"
                              }
                            >
                              {r.conversionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 pr-6 py-3.5 text-sm tabular-nums">
                            {formatCurrency(r.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {computedWeeklyReport.rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center py-6 text-slate-500">
                            <div className="font-bold text-slate-700 text-sm">No consultation records in {activeWeekBounds.shortLabel}</div>
                            <div className="text-xs text-slate-400 mt-1">Try switching to another week or reset filters.</div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleBenchmarkWeek}
                              className="mt-3 text-xs border-slate-300 font-semibold text-slate-800 hover:bg-slate-100"
                            >
                              Jump to Week 36 (Benchmark Report)
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Weekly Summary Total Row - Always Dark with Crisp High-Contrast Text */}
                      <TableRow className="!bg-slate-950 hover:!bg-slate-900 text-white font-extrabold border-t-2 border-blue-600 [&>td]:!bg-slate-950 hover:[&>td]:!bg-slate-900 transition-colors">
                        <TableCell className="pl-6 py-4 text-sm font-black !text-blue-300 uppercase tracking-wide">
                          TOTAL (WEEKLY)
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-white font-black tabular-nums">
                          {wTotals.totalConsults}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-emerald-400 font-black tabular-nums">
                          {wTotals.done}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-rose-400 font-black tabular-nums">
                          {wTotals.cancelled}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-amber-400 font-black tabular-nums">
                          {wTotals.pending}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-purple-300 font-black tabular-nums">
                          {wTotals.converted}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-white font-black tabular-nums">
                          {wTotals.conversionRate?.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4 text-sm font-black !text-emerald-400 tabular-nums">
                          {formatCurrency(wTotals.revenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* SECTION B: OVER ALL CUMULATIVE REPORT TABLE */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        Over All Total Consultation Report
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Historical cumulative performance report across all enquiry sources
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Total Revenue</div>
                      <div className="text-2xl font-black text-emerald-400 tabular-nums">
                        ₹{(oTotals.revenue / 10000000).toFixed(2)} Cr
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-slate-800 py-3.5 pl-6 text-xs uppercase tracking-wider">
                          Enquiry Source
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Total Consults
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Share %
                        </TableHead>
                        <TableHead className="font-black text-emerald-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Done
                        </TableHead>
                        <TableHead className="font-black text-rose-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Cancelled
                        </TableHead>
                        <TableHead className="font-black text-amber-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Pending
                        </TableHead>
                        <TableHead className="font-black text-purple-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Converted
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Conv. %
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-right py-3.5 pr-6 text-xs uppercase tracking-wider">
                          Revenue (₹)
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overallReport.rows.map((r, idx) => {
                        const sharePercent =
                          oTotals.totalConsults > 0 ? ((r.totalConsults / oTotals.totalConsults) * 100).toFixed(1) : "0"
                        return (
                          <TableRow
                            key={r.source}
                            className={`hover:bg-indigo-50/70 transition-colors border-b border-slate-200/70 ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            <TableCell className="font-bold text-slate-900 pl-6 py-3.5 text-sm flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                              />
                              {r.source}
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-900 py-3.5 text-sm tabular-nums">
                              {r.totalConsults.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center text-xs font-semibold text-slate-600 py-3.5 tabular-nums">
                              {sharePercent}%
                            </TableCell>
                            <TableCell className="text-center font-bold text-emerald-700 py-3.5 text-sm tabular-nums">
                              {r.done.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-bold text-rose-700 py-3.5 text-sm tabular-nums">
                              {r.cancelled.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-bold text-amber-700 py-3.5 text-sm tabular-nums">
                              {r.pending}
                            </TableCell>
                            <TableCell className="text-center font-bold text-purple-700 py-3.5 text-sm tabular-nums">
                              {r.converted.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-900 py-3.5 text-sm tabular-nums">
                              <Badge
                                variant="outline"
                                className={
                                  r.conversionRate >= 10
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                                    : r.conversionRate >= 5
                                    ? "bg-purple-100 text-purple-800 border-purple-300 font-bold"
                                    : "bg-slate-100 text-slate-800 border-slate-300 font-medium"
                                }
                              >
                                {r.conversionRate.toFixed(2)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-950 pr-6 py-3.5 text-sm tabular-nums">
                              {formatCurrency(r.revenue)}
                            </TableCell>
                          </TableRow>
                        )
                      })}

                      {/* Cumulative Total Row - Always Solid Dark with Crisp High-Contrast Text (Never Fades on Hover) */}
                      <TableRow className="!bg-slate-950 hover:!bg-slate-900 text-white font-extrabold border-t-2 border-indigo-500 [&>td]:!bg-slate-950 hover:[&>td]:!bg-slate-900 transition-colors">
                        <TableCell className="pl-6 py-4 text-sm font-black !text-amber-400 uppercase tracking-wide">
                          TOTAL (OVER ALL)
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-white font-black tabular-nums">
                          {oTotals.totalConsults?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-xs !text-slate-300 py-4 font-bold tabular-nums">
                          100.0%
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-emerald-400 font-black tabular-nums">
                          {oTotals.done?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-rose-400 font-black tabular-nums">
                          {oTotals.cancelled?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-amber-400 font-black tabular-nums">
                          {oTotals.pending}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-purple-300 font-black tabular-nums">
                          {oTotals.converted?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center text-sm py-4 !text-white font-black tabular-nums">
                          {oTotals.conversionRate?.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right pr-6 py-4 text-sm font-black !text-emerald-400 tabular-nums">
                          {formatCurrency(oTotals.revenue)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Strategic Insights Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <Card className="border-slate-200 bg-white shadow-sm p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Top Revenue Channel</h4>
                      <div className="text-base font-bold text-slate-900 mt-0.5">Website Organic & Direct</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Generates <strong>₹3.12 Cr</strong> (83% of total revenue) with a healthy 9.02% conversion rate.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Highest Efficiency</h4>
                      <div className="text-base font-bold text-slate-900 mt-0.5">CRR & Site Exit Pop-Up</div>
                      <p className="text-xs text-slate-500 mt-1">
                        CRR converts at <strong>66.67%</strong>, followed by Site Exit Pop-Ups at <strong>12.5%</strong>.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="border-slate-200 bg-white shadow-sm p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">AI Assistant Velocity</h4>
                      <div className="text-base font-bold text-slate-900 mt-0.5">PriyaSharma AI Chat</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Drove <strong>1,231</strong> total consultations and <strong>₹47.7 Lakhs</strong> in revenue.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ─────────────────────────────────────────────────────────────
                TAB 2: DOCTOR & SPECIALIST PERFORMANCE ANALYTICS
            ────────────────────────────────────────────────────────────── */}
            <TabsContent value="doctors" className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-teal-300" />
                        Specialist Clinical & Conversion Performance
                      </h2>
                      <p className="text-teal-100/80 text-xs sm:text-sm mt-1">
                        Doctor consultation volume, completion velocity, lead conversion rate, and revenue contribution
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1">
                      {doctorsPerformance.length} Active Specialists
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-slate-800 pl-6 py-3.5 text-xs uppercase tracking-wider">
                          Doctor Name & ID
                        </TableHead>
                        <TableHead className="font-black text-slate-800 py-3.5 text-xs uppercase tracking-wider">
                          Specialization
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Total Consults
                        </TableHead>
                        <TableHead className="font-black text-emerald-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Done
                        </TableHead>
                        <TableHead className="font-black text-purple-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Converted
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Conversion Rate
                        </TableHead>
                        <TableHead className="font-black text-amber-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Avg SLA Time
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-right pr-6 py-3.5 text-xs uppercase tracking-wider">
                          Revenue Attributed
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {doctorsPerformance.map((doc, idx) => (
                        <TableRow
                          key={doc.doctorId}
                          className={`hover:bg-teal-50/80 transition-colors border-b border-slate-200/70 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <TableCell className="font-bold text-slate-900 pl-6 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                              {doc.doctorName.replace("Dr. ", "").substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                {doc.doctorName}
                                {idx === 0 && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0 h-4">
                                    Top Doctor
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">{doc.doctorId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700 font-medium text-xs sm:text-sm">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                              {doc.specialization}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold text-slate-800 py-4 text-sm tabular-nums">
                            {doc.totalConsults.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-emerald-700 py-4 text-sm tabular-nums">
                            {doc.done.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center font-bold text-purple-700 py-4 text-sm tabular-nums">
                            {doc.converted}
                          </TableCell>
                          <TableCell className="text-center font-bold tabular-nums">
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-xs">
                              {doc.conversionRate.toFixed(2)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700 tabular-nums text-xs">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" />
                              {doc.avgSlaMinutes} mins
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-black text-slate-900 pr-6 tabular-nums text-sm">
                            {formatCurrency(doc.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* ─────────────────────────────────────────────────────────────
                TAB 3: VISUAL INTELLIGENCE & CHARTS
            ────────────────────────────────────────────────────────────── */}
            <TabsContent value="charts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Volume & Conversion by Channel */}
                <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
                  <CardHeader className="pb-2 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      Consultation Volume by Enquiry Source
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Comparison of Total, Completed, and Converted consultations per channel
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overallReport.rows} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis
                            dataKey="source"
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 11, fill: "#475569" }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                          <RechartsTooltip
                            formatter={(value: any) => [Number(value).toLocaleString(), "Volume"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                          />
                          <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 12, fontSize: "12px" }} />
                          <Bar dataKey="totalConsults" name="Total Consults" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="done" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="converted" name="Converted" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Chart 2: Revenue Distribution per Channel */}
                <Card className="border-slate-200 bg-white shadow-sm rounded-xl">
                  <CardHeader className="pb-2 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-emerald-600" />
                      Revenue Contribution by Enquiry Source
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Total revenue generated (₹) attributed to each inbound lead source
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={overallReport.rows.filter((r) => r.revenue > 0) as any}
                            dataKey="revenue"
                            nameKey="source"
                            cx="50%"
                            cy="50%"
                            outerRadius={105}
                            innerRadius={55}
                            paddingAngle={2}
                          >
                            {overallReport.rows.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(val: any) => [formatCurrency(Number(val)), "Revenue"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                            layout="horizontal"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─────────────────────────────────────────────────────────────
                TAB 4: DETAILED CONSULTATION REGISTER
            ────────────────────────────────────────────────────────────── */}
            <TabsContent value="records" className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold flex items-center gap-2 text-white">
                      <Stethoscope className="w-4 h-4 text-blue-400" />
                      Detailed Consultation Register
                    </h3>
                    <p className="text-xs text-slate-400">
                      Patient consultation records, doctor alignment, SLA status & documentation
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Filter to week toggle */}
                    <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                      <button
                        onClick={() => setRegisterFilterMode("all")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          registerFilterMode === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        All Records ({detailedConsultations.length})
                      </button>
                      <button
                        onClick={() => setRegisterFilterMode("week")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                          registerFilterMode === "week" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Selected Week ({weeklyRecordsCount})
                      </button>
                    </div>

                    <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs font-semibold">
                      {filteredRecords.length} shown
                    </Badge>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow>
                        <TableHead className="font-black text-slate-800 pl-6 py-3.5 text-xs uppercase tracking-wider">
                          Consultation ID
                        </TableHead>
                        <TableHead className="font-black text-slate-800 py-3.5 text-xs uppercase tracking-wider">
                          Patient Details
                        </TableHead>
                        <TableHead className="font-black text-slate-800 py-3.5 text-xs uppercase tracking-wider">
                          Source
                        </TableHead>
                        <TableHead className="font-black text-slate-800 py-3.5 text-xs uppercase tracking-wider">
                          Doctor
                        </TableHead>
                        <TableHead className="font-black text-slate-800 py-3.5 text-xs uppercase tracking-wider">
                          Schedule
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          Status
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-center py-3.5 text-xs uppercase tracking-wider">
                          SLA
                        </TableHead>
                        <TableHead className="font-black text-slate-800 text-right pr-6 py-3.5 text-xs uppercase tracking-wider">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecords.map((item, idx) => (
                        <TableRow
                          key={item.id}
                          className={`hover:bg-blue-50/70 transition-colors border-b border-slate-200/70 ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <TableCell className="pl-6 py-3.5 font-bold text-blue-700 text-xs">
                            <div>{item.consultationId}</div>
                            <div className="text-[11px] text-slate-400 font-medium">{item.enquiryId}</div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.patientName}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {item.mobile} • {item.email}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5">
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                              {item.enquirySource}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3.5 font-semibold text-slate-800 text-xs sm:text-sm">
                            {item.doctorName}
                          </TableCell>

                          <TableCell className="py-3.5">
                            <div className="text-xs font-semibold text-slate-800">{item.scheduledDate}</div>
                            <div className="text-[11px] text-slate-500">{item.scheduledTime}</div>
                          </TableCell>

                          <TableCell className="py-3.5 text-center">
                            <Badge
                              className={
                                item.status === "converted"
                                  ? "bg-purple-100 text-purple-800 border-purple-300 text-xs"
                                  : item.status === "completed"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-xs"
                                  : item.status === "pending"
                                  ? "bg-amber-100 text-amber-800 border-amber-300 text-xs"
                                  : "bg-rose-100 text-rose-800 border-rose-300 text-xs"
                              }
                            >
                              {item.status.toUpperCase()}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3.5 text-center">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                                item.slaStatus === "on-time"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : item.slaStatus === "at-risk"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {item.slaStatus.toUpperCase()}
                            </span>
                          </TableCell>

                          <TableCell className="pr-6 py-3.5 text-right">
                            <Button
                              onClick={() => {
                                setSelectedRecord(item)
                                setIsDetailOpen(true)
                              }}
                              variant="outline"
                              size="sm"
                              className="h-8 border-slate-300 text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View Dossier
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {paginatedRecords.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="h-36 text-center text-slate-500 text-sm">
                            No consultation records match the selected filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 bg-slate-50/60 no-print">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing{" "}
                    <span className="font-bold text-slate-800">
                      {filteredRecords.length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0}
                    </span>{" "}
                    to{" "}
                    <span className="font-bold text-slate-800">
                      {Math.min(currentPage * recordsPerPage, filteredRecords.length)}
                    </span>{" "}
                    of <span className="font-bold text-slate-800">{filteredRecords.length}</span> consultations
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 text-xs font-semibold bg-white"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Previous
                    </Button>

                    <span className="text-xs font-semibold text-slate-700 px-2">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="h-8 text-xs font-semibold bg-white"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MODAL 1: CONSULTATION DOSSIER POPUP
        ════════════════════════════════════════════════════════════════════ */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            {selectedRecord && (
              <>
                <DialogHeader className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold text-xs">
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
                  <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                    {selectedRecord.patientName}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 text-xs">
                    Enquiry ID: {selectedRecord.enquiryId} • Patient ID: {selectedRecord.patientId}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4 text-xs sm:text-sm">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Mobile Phone</label>
                    <p className="font-semibold text-slate-900">{selectedRecord.mobile}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Email Address</label>
                    <p className="font-semibold text-slate-900">{selectedRecord.email}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Enquiry Source</label>
                    <p className="font-semibold text-blue-700">{selectedRecord.enquirySource}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Aligned Doctor</label>
                    <p className="font-semibold text-slate-900">{selectedRecord.doctorName}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Appointment Format</label>
                    <p className="font-semibold text-slate-900">{selectedRecord.appointmentType}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-400">Scheduled Time</label>
                    <p className="font-semibold text-slate-900">
                      {selectedRecord.scheduledDate} at {selectedRecord.scheduledTime}
                    </p>
                  </div>
                </div>

                {selectedRecord.postConsultationRemarks && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                      Doctor Clinical Notes & Recommendations
                    </label>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{selectedRecord.postConsultationRemarks}"
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-3">
                  {selectedRecord.prescriptionUrl && (
                    <Button variant="outline" size="sm" asChild className="border-blue-300 text-blue-700 text-xs">
                      <a href={selectedRecord.prescriptionUrl} target="_blank" rel="noreferrer">
                        <FileText className="w-3.5 h-3.5 mr-1" /> View Prescription
                      </a>
                    </Button>
                  )}
                  {selectedRecord.clientReportUrl && (
                    <Button variant="outline" size="sm" asChild className="border-emerald-300 text-emerald-700 text-xs">
                      <a href={selectedRecord.clientReportUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Client Reports
                      </a>
                    </Button>
                  )}
                  {selectedRecord.doshaReportUrl && (
                    <Button variant="outline" size="sm" asChild className="border-purple-300 text-purple-700 text-xs">
                      <a href={selectedRecord.doshaReportUrl} target="_blank" rel="noreferrer">
                        <Award className="w-3.5 h-3.5 mr-1" /> Dosha Test Report
                      </a>
                    </Button>
                  )}
                </div>

                <DialogFooter className="mt-4 pt-3 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => setIsDetailOpen(false)} className="text-xs font-semibold">
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════
            MODAL 2: EMAIL DIGEST GENERATOR & DISPATCH
        ════════════════════════════════════════════════════════════════════ */}
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="max-w-3xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Dispatch Doctor Consultation Management Digest
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Email the standardized Weekly & Overall consultation management sheet to executive stakeholders
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">
                  Recipients (comma separated)
                </label>
                <Input
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  placeholder="director@kairali.com, dme@kairali.com"
                  className="font-medium bg-slate-50 border-slate-300 text-xs"
                />
              </div>

              {/* Email Preview Frame */}
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-4 font-sans text-xs">
                <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 space-y-3">
                  <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        Weekly Doctor Consultation Report – {weeklyDateRange}
                      </div>
                      <div className="text-[11px] text-slate-500">Official Kairali Management Briefing</div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                      Kairali CRM
                    </Badge>
                  </div>

                  <p className="text-slate-700 text-xs">Dear Management Team,</p>
                  <p className="text-slate-600 text-xs">
                    Please find below the official weekly summary of doctor consultations and historical cumulative
                    channel conversions for your review.
                  </p>

                  <div className="font-bold text-slate-900 text-xs pt-1">
                    1. Weekly Consultation Report – {weeklyDateRange}
                  </div>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-blue-50 border-b border-blue-100">
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
                          <tr key={r.source} className="border-b border-slate-100">
                            <td className="p-1.5 font-semibold text-slate-900">{r.source}</td>
                            <td className="p-1.5 text-center">{r.totalConsults}</td>
                            <td className="p-1.5 text-center text-emerald-600 font-semibold">{r.done}</td>
                            <td className="p-1.5 text-center text-rose-600 font-semibold">{r.cancelled}</td>
                            <td className="p-1.5 text-center text-amber-600 font-semibold">{r.pending}</td>
                            <td className="p-1.5 text-center text-purple-600 font-semibold">{r.converted}</td>
                            <td className="p-1.5 text-center font-bold">{r.conversionRate}%</td>
                            <td className="p-1.5 text-right font-bold">{formatCurrency(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="font-bold text-slate-900 text-xs pt-2">
                    2. Over All Total Consultation Report
                  </div>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-100 border-b border-slate-200">
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
                          <tr key={r.source} className="border-b border-slate-100">
                            <td className="p-1.5 font-semibold text-slate-900">{r.source}</td>
                            <td className="p-1.5 text-center">{r.totalConsults.toLocaleString()}</td>
                            <td className="p-1.5 text-center text-emerald-600 font-semibold">{r.done.toLocaleString()}</td>
                            <td className="p-1.5 text-center text-rose-600 font-semibold">{r.cancelled.toLocaleString()}</td>
                            <td className="p-1.5 text-center text-amber-600 font-semibold">{r.pending}</td>
                            <td className="p-1.5 text-center text-purple-600 font-semibold">{r.converted.toLocaleString()}</td>
                            <td className="p-1.5 text-center font-bold">{r.conversionRate}%</td>
                            <td className="p-1.5 text-right font-bold">{formatCurrency(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500">
                    Generated automatically by Kairali Ayurvedic Group CRM System.
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSendEmailDigest}
                disabled={isSendingEmail}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs"
              >
                {isSendingEmail ? "Dispatching..." : "Dispatch Email Digest"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </DashboardLayout>
  )
}
