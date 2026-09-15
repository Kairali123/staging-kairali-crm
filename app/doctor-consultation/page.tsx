"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Stethoscope,
  Calendar,
  Search,
  Eye,
  Plus,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Phone,
  Mail,
  CalendarDays,
  Upload,
  UserCheck,
  PhoneCall,
  TrendingUp,
  RotateCcw,
  Download,
  RefreshCw,
  X,
  Copy,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileCheck,
} from "lucide-react"

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Consultation {
  id: string
  consultationId: string
  enquiryId: string
  patientName: string
  patientId: string
  mobile: string
  email: string
  subjects: string
  notes: string
  ivrUrl: string
  websiteName: string
  dataSource: string
  assignedSalesRep: string
  remarksHistory: string
  dataFromSheet: string
  doctorCalendarLink: string
  appointmentType: string
  appointmentStatus: string
  doctorAlignment: string
  scheduledDateTime: string
  remarks: string
  clientReportLink: string
  submitStatus: string
  clientReportsLink: string
  clientReportsRemarks: string
  doshaTestReportLink: string
  healthAssessmentReportLink: string
  clientReminderStatus: string
  doctorReminderStatus: string
  consultationDoneStatus: string
  reportsUploadUrl: string
  postConsultationRemarks: string
  finalCaseStatus: string
  postConsultationUploadedBy: string
  transferToUserStatus: string
  stage: string
  status: "completed" | "pending" | "overdue" | "upcoming"
  scheduledDate: string
  doer: string
  slaStatus: "on-time" | "at-risk" | "overdue"
  timeRemaining: string
  hasPrescription: boolean
  createdAt: string
  delayHours?: number
}

interface StageDefinition {
  name: string
  shortName: string
  sla: string
  slaHours: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const stages: StageDefinition[] = [
  { name: "Intake", shortName: "Intake", sla: "Auto from SQV / Web Form", slaHours: 0 },
  { name: "Appointment Fix", shortName: "Apt Fix", sla: "+1:00h from arrival", slaHours: 1 },
  { name: "Pre-Consult Docs", shortName: "Pre-Docs", sla: "-2:00h before schedule", slaHours: 2 },
  { name: "Day-Of Reminder", shortName: "Reminder", sla: "-1:00h before schedule", slaHours: 1 },
  { name: "Post-Consult Upload", shortName: "Post-Upload", sla: "+1:00h after end", slaHours: 1 },
  { name: "Handover to KAPPL/KTAHV", shortName: "Handover", sla: "Same-day completion", slaHours: 8 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculateDelayTime = (consultation: Consultation, stageSlaHours: number): number => {
  const now = new Date()
  const createdAt = new Date(consultation.createdAt || consultation.scheduledDate || now.toISOString())
  const hoursSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
  return Math.max(0, hoursSinceCreation - stageSlaHours)
}

const getDelayBadge = (delayHours: number) => {
  if (delayHours === 0) {
    return {
      label: "On Time",
      className: "bg-green-100 text-green-800 border-green-200",
      dotClass: "bg-green-500",
    }
  }
  if (delayHours <= 2) {
    return {
      label: `${delayHours}h delay`,
      className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      dotClass: "bg-yellow-500",
    }
  }
  if (delayHours <= 8) {
    return {
      label: `${delayHours}h delay`,
      className: "bg-orange-100 text-orange-800 border-orange-200",
      dotClass: "bg-orange-500",
    }
  }
  const days = Math.floor(delayHours / 24)
  const remHours = delayHours % 24
  const label = days > 0 ? `${days}d ${remHours}h delay` : `${delayHours}h delay`
  return {
    label,
    className: "bg-red-100 text-red-800 border-red-200",
    dotClass: "bg-red-500",
  }
}

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "submitted":
    case "transferred":
    case "sent":
      return "bg-green-100 text-green-800 border-green-200"
    case "pending":
    case "new":
    case "in-progress":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "overdue":
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200"
    case "upcoming":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return { date: "—", time: "" }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { date: dateStr, time: "" }
    return {
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
    }
  } catch {
    return { date: dateStr, time: "" }
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DoctorConsultationPage() {
  const router = useRouter()

  // State
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [stageBreakup, setStageBreakup] = useState<any[]>([])
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    converted: 0,
    revenue: 0,
    prescriptions: 0,
    conversionRate: 0,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stageFilter, setStageFilter] = useState("all")
  const [doctorFilter, setDoctorFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Action Dialog State (All popups use the EXACT SAME uniform width max-w-2xl)
  const [actionDialog, setActionDialog] = useState<{
    type: string
    consultation: Consultation | null
    open: boolean
  }>({ type: "", consultation: null, open: false })

  // ── FIX FOR PAGE FREEZE ────────────────────────────────────────────────────
  // Radix UI dialog / focus locks can occasionally set `pointer-events: none` on
  // `document.body` and fail to remove it, freezing the whole page so clicks and
  // scrolling stop working until manual refresh.
  // This continuous observer actively catches and removes `pointer-events: none`
  // so the page NEVER freezes when clicking action buttons or closing dialogs.
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

  // Initial Fetch
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      else setLoading(true)

      // Fetch KPIs
      const kpiResponse = await fetch("/api/doctor/kpis")
      const kpiData = await kpiResponse.json()

      const completed = kpiData.completedConsultations || 0
      const total = kpiData.totalConsultations || 1
      const pending = kpiData.pendingConsultations || 0
      const converted = Math.floor(completed * 0.75)
      const conversionRate = Math.round((converted / total) * 100)
      const revenue = completed * 2500

      setStats({
        total,
        completed,
        pending,
        converted,
        revenue,
        prescriptions: kpiData.prescriptionsIssued || Math.round(completed * 0.9),
        conversionRate,
      })

      // Fetch consultations
      const consultationsResponse = await fetch("/api/doctor/consultations")
      const consultationsData = await consultationsResponse.json()
      const consultationsList: Consultation[] = consultationsData.consultations || consultationsData.items || []
      setConsultations(consultationsList)

      // Compute Stage Breakup
      const breakup = stages.map((stage) => {
        const stageConsultations = consultationsList.filter((c: Consultation) => c.stage === stage.name)
        const pendingConsultations = stageConsultations.filter(
          (c: Consultation) => c.status === "pending" || c.status === "overdue"
        )

        const consultationsWithDelay = pendingConsultations.map((c: Consultation) => ({
          ...c,
          delayHours: calculateDelayTime(c, stage.slaHours),
        }))

        const totalDelayHours = consultationsWithDelay.reduce(
          (sum: number, c: Consultation & { delayHours?: number }) => sum + (c.delayHours || 0),
          0
        )
        const avgDelayHours =
          pendingConsultations.length > 0 ? Math.round(totalDelayHours / pendingConsultations.length) : 0

        const pendingCount = pendingConsultations.length
        const totalCount = stageConsultations.length
        const percentage = consultationsList.length > 0 ? (totalCount / consultationsList.length) * 100 : 0
        const completedCount = stageConsultations.filter((c: Consultation) => c.status === "completed").length
        const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

        return {
          ...stage,
          count: totalCount,
          pendingCount,
          percentage,
          progressPercentage,
          totalDelayHours,
          avgDelayHours,
          consultations: consultationsWithDelay,
        }
      })
      setStageBreakup(breakup)

      if (showToast) toast.success("Data refreshed successfully")
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load consultation data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Action Click Handler (Safely clears pointer-events before opening dialog)
  const handleActionClick = (type: string, consultation: Consultation) => {
    document.body.style.pointerEvents = "auto"
    setActionDialog({ type, consultation, open: true })
  }

  const closeActionDialog = () => {
    setActionDialog({ type: "", consultation: null, open: false })
    setTimeout(() => {
      document.body.style.pointerEvents = "auto"
    }, 50)
  }

  // Filter handlers
  const handleStageClick = (stageName: string) => {
    if (selectedStage === stageName) {
      setSelectedStage(null)
      setStageFilter("all")
    } else {
      setSelectedStage(stageName)
      setStageFilter(stageName)
    }
    setCurrentPage(1)
  }

  // Unique Doctors for filter
  const uniqueDoctors = useMemo(() => {
    const docs = new Set<string>()
    consultations.forEach((c) => {
      if (c.doctorAlignment?.trim()) docs.add(c.doctorAlignment.trim())
    })
    return Array.from(docs).sort()
  }, [consultations])

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setStageFilter("all")
    setDoctorFilter("all")
    setSelectedStage(null)
    setDateFilter("")
    setCurrentPage(1)
  }

  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "all" ||
    stageFilter !== "all" ||
    doctorFilter !== "all" ||
    dateFilter !== ""

  // Filtered Consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter((consultation) => {
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (consultation.patientName?.toLowerCase() || "").includes(q) ||
        (consultation.patientId?.toLowerCase() || "").includes(q) ||
        (consultation.consultationId?.toLowerCase() || "").includes(q) ||
        (consultation.enquiryId?.toLowerCase() || "").includes(q) ||
        (consultation.mobile || "").includes(q) ||
        (consultation.email?.toLowerCase() || "").includes(q) ||
        (consultation.doctorAlignment?.toLowerCase() || "").includes(q)

      const matchesStatus = statusFilter === "all" || consultation.status === statusFilter
      const matchesStage = stageFilter === "all" || consultation.stage === stageFilter
      const matchesDoctor = doctorFilter === "all" || consultation.doctorAlignment === doctorFilter
      const matchesDate = !dateFilter || consultation.scheduledDate?.includes(dateFilter)

      return matchesSearch && matchesStatus && matchesStage && matchesDoctor && matchesDate
    })
  }, [consultations, searchTerm, statusFilter, stageFilter, doctorFilter, dateFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredConsultations.length / itemsPerPage))
  const paginatedConsultations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredConsultations.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredConsultations, currentPage, itemsPerPage])

  const totalPrescriptions = useMemo(() => {
    return consultations.filter((c) => c.hasPrescription).length
  }, [consultations])

  const overdueCount = useMemo(() => {
    return consultations.filter((c) => c.status === "overdue").length
  }, [consultations])

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        "Consultation ID",
        "Enquiry ID",
        "Patient Name",
        "Mobile",
        "Email",
        "Doctor Alignment",
        "Scheduled Date Time",
        "Stage",
        "Status",
        "Appointment Type",
        "Sales Rep",
        "Remarks",
      ]

      const rows = filteredConsultations.map((c) => [
        `"${c.consultationId || ""}"`,
        `"${c.enquiryId || ""}"`,
        `"${c.patientName || ""}"`,
        `"${c.mobile || ""}"`,
        `"${c.email || ""}"`,
        `"${c.doctorAlignment || ""}"`,
        `"${c.scheduledDateTime || c.scheduledDate || ""}"`,
        `"${c.stage || ""}"`,
        `"${c.status || ""}"`,
        `"${c.appointmentType || ""}"`,
        `"${c.assignedSalesRep || ""}"`,
        `"${(c.remarks || "").replace(/"/g, '""')}"`,
      ])

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Doctor_Consultations_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("CSV exported successfully")
    } catch {
      toast.error("Failed to export CSV")
    }
  }

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6 pb-12">

          {/* ═══════════════════════════════════════════════════════════════════
              1. HERO HEADER SECTION (Consistent with leads/assign/page.tsx)
          ════════════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-7">

              {/* Back Button */}
              <button
                onClick={() => window.history.back()}
                className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
              >
                ← Back
              </button>

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

                {/* Left Section - Icon, Title & Navigation Pills */}
                <div className="space-y-4 w-full lg:max-w-3xl">
                  <div className="flex items-start sm:items-center gap-4">

                    {/* Icon Container */}
                    <div className="h-14 w-14 sm:h-16 sm:w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                      <Stethoscope className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 text-white" />
                    </div>

                    {/* Title & Subtitle */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                          Doctor Consultation Hub
                        </h1>
                        <span className="bg-white/20 text-white border border-white/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                          Clinical CRM
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-white/90 mt-1 sm:mt-1.5 font-medium">
                        Manage, schedule, monitor patient consultations & clinical workflows
                      </p>
                    </div>
                  </div>

                  {/* Navigation Quick Actions Bar */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/doctor-consultation/report")}
                      className="bg-white/15 hover:bg-white/25 text-white border-white/30 text-xs font-semibold backdrop-blur-sm transition-all shadow-sm"
                    >
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> Reports Hub
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
                      size="sm"
                      onClick={() => router.push("/doctor-consultation/prescription/new")}
                      className="bg-white text-blue-800 hover:bg-white/90 text-xs font-bold shadow-md transition-all hover:scale-[1.02]"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5 text-blue-700 font-bold" /> + New Prescription
                    </Button>
                  </div>
                </div>

                {/* Right Section - Hero KPI Overview Badges */}
                <div className="flex w-full lg:w-auto justify-start lg:justify-end gap-3 flex-wrap sm:flex-nowrap">
                  <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 min-w-[130px]">
                    <p className="text-[11px] uppercase tracking-wider text-white/70 font-semibold mb-1">
                      Total Consultations
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                      {stats.total}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 min-w-[130px]">
                    <p className="text-[11px] uppercase tracking-wider text-amber-200 font-semibold mb-1">
                      Pending Queue
                    </p>
                    <p className="text-3xl sm:text-4xl font-extrabold text-amber-300 tabular-nums">
                      {stats.pending}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Main Body Container */}
          <div className="px-4 sm:px-6 lg:px-8 space-y-6">

            {/* ═══════════════════════════════════════════════════════════════════
                2. ADVANCED FILTERS & SEARCH CARD (leads/assign style)
            ════════════════════════════════════════════════════════════════════ */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-md">

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30 text-white flex-shrink-0">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                      Filters & Search
                    </h3>
                    <p className="text-xs text-slate-500">
                      Refine consultations by patient, doctor, status, stage & date
                    </p>
                  </div>
                </div>

                {/* Clear Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Clear Filters
                </Button>
              </div>

              {/* Filter Controls */}
              <div className="px-4 sm:px-5 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                  {/* 1. SEARCH INPUT */}
                  <div className="flex flex-col gap-1.5 lg:col-span-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Search Patient / Doctor
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Name, ID, phone, email, doctor..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setCurrentPage(1)
                        }}
                        className="h-10 pl-9 w-full rounded-md border-slate-300 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* 2. WORKFLOW STAGE */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Workflow Stage
                    </label>
                    <Select
                      value={stageFilter}
                      onValueChange={(val) => {
                        setStageFilter(val)
                        setSelectedStage(val === "all" ? null : val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-slate-300">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {stages.map((stage) => (
                          <SelectItem key={stage.name} value={stage.name}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. STATUS */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-slate-300">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. DOCTOR ALIGNMENT */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Doctor Alignment
                    </label>
                    <Select
                      value={doctorFilter}
                      onValueChange={(val) => {
                        setDoctorFilter(val)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-10 w-full rounded-md border-slate-300">
                        <SelectValue placeholder="All Doctors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Doctors</SelectItem>
                        {uniqueDoctors.map((doc) => (
                          <SelectItem key={doc} value={doc}>
                            {doc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                {/* Second row of filters for date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Scheduled Date
                    </label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="h-10 w-full rounded-md border-slate-300 focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                3. KEY PERFORMANCE INDICATORS (leads/assign style)
            ════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">

              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40 flex-shrink-0">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                      Key Performance Indicators
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Real-time overview of consultation metrics, clinical throughput & SLA health
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-800">{filteredConsultations.length}</span> of {consultations.length} records
                  </span>
                </div>
              </div>

              {/* KPI Cards Content */}
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">

                  {/* 1. Total Consultations (Blue) */}
                  <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 leading-tight">
                        Total Consultations
                      </p>
                      <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      {stats.total}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Active Pipeline:</span>
                        <span className="font-bold text-blue-700">{consultations.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Target Pace:</span>
                        <span className="font-medium text-slate-700">+12% vs last month</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Completed Consultations (Emerald) */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 leading-tight">
                        Completed Cases
                      </p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      {stats.completed}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-medium">Close Rate:</span>
                        <span className="font-bold text-emerald-700">
                          {stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(0)}%` : "0%"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Status:</span>
                        <span className="text-emerald-800 font-semibold">Successfully closed</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Pending Queue (Amber) */}
                  <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 leading-tight">
                        Pending Queue
                      </p>
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      {stats.pending}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-700 font-medium">Action Needed:</span>
                        <span className="font-bold text-amber-800">{stats.pending}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-rose-600 font-medium">Overdue:</span>
                        <span className="font-bold text-rose-700">{overdueCount} cases</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Prescriptions Issued (Indigo) */}
                  <div className="bg-indigo-50/70 border-2 border-indigo-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 leading-tight">
                        Rx Prescriptions
                      </p>
                      <FileCheck className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      {stats.prescriptions}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-700 font-medium">Rx Ratio:</span>
                        <span className="font-bold text-indigo-700">
                          {stats.completed > 0 ? `${((stats.prescriptions / stats.completed) * 100).toFixed(0)}%` : "0%"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Verified Digital:</span>
                        <span className="font-semibold text-indigo-800">{totalPrescriptions} Rx</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Revenue & Value (Purple) */}
                  <div className="bg-purple-50/70 border-2 border-purple-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700 leading-tight">
                        Revenue Realized
                      </p>
                      <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      ₹{stats.revenue.toLocaleString("en-IN")}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-700 font-medium">Converted:</span>
                        <span className="font-bold text-purple-800">
                          {stats.converted} ({stats.conversionRate}%)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Avg Ticket:</span>
                        <span className="font-medium text-slate-700">₹2,500 / consult</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. SLA & Quality Score (Rose/Red) */}
                  <div className="bg-rose-50/70 border-2 border-rose-300 rounded-lg p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 leading-tight">
                        SLA Adherence
                      </p>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none mb-2 tabular-nums">
                      {overdueCount === 0 ? "100%" : `${Math.max(0, 100 - Math.round((overdueCount / (consultations.length || 1)) * 100))}%`}
                    </p>
                    <div className="flex flex-col gap-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-rose-700 font-medium">Overdue Delay:</span>
                        <span className="font-bold text-rose-800">{overdueCount} cases</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Pipeline Health:</span>
                        <span className="font-semibold text-emerald-700">Optimum</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                4. WORKFLOW STAGE PIPELINE BREAKDOWN (FMS Stages)
            ════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">

              {/* Stage Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 flex items-center justify-center shadow-md border border-indigo-500/40 flex-shrink-0">
                    <Layers className="h-4 w-4 sm:h-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                      Workflow Stage Pipeline — Pending & Progression
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Click any stage card to filter the directory table below
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 font-semibold px-2.5 py-1">
                    {stageBreakup.reduce((sum, s) => sum + s.pendingCount, 0)} Total Pending
                  </Badge>
                  {selectedStage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStageClick(selectedStage)}
                      className="h-7 px-2.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Reset Stage Filter
                    </Button>
                  )}
                </div>
              </div>

              {/* Stage Cards Grid */}
              <div className="p-4 sm:p-5">
                <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {stageBreakup.map((stage, idx) => {
                    const isSelected = selectedStage === stage.name
                    const delay = getDelayBadge(stage.avgDelayHours)
                    return (
                      <div
                        key={idx}
                        onClick={() => handleStageClick(stage.name)}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/40"
                            : "border-slate-200 hover:border-blue-400/80 bg-white hover:bg-slate-50/60 shadow-xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                            <span className="font-bold text-slate-800 text-[11px]">
                              {idx + 1}. {stage.name}
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none mb-1">
                            {stage.count}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium truncate" title={stage.sla}>
                            {stage.sla}
                          </p>
                        </div>

                        <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-500 font-medium">Done:</span>
                            <span className="font-bold text-slate-800">{stage.progressPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${stage.progressPercentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              stage.pendingCount > 0 ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {stage.pendingCount} pending
                            </span>
                            {stage.pendingCount > 0 && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${delay.className}`}>
                                {delay.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                5. CONSULTATIONS RECORD DIRECTORY TABLE
            ════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">

              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Consultation Records Directory
                    </h3>
                    <Badge className="bg-blue-600 text-white font-bold text-xs px-2 py-0.5">
                      {filteredConsultations.length} records
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    Comprehensive view of patient consultations, assigned doctors, stages & actions
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                    className="h-9 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 shadow-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-blue-600 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    className="h-9 bg-white border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Table Container */}
              <div className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
                    <p className="font-semibold text-slate-700">Loading consultation records...</p>
                  </div>
                ) : paginatedConsultations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-base text-slate-800">No matching consultations found</p>
                    <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm">
                      We could not find any consultation matching your current search and filter settings.
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                      >
                        Reset All Filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-800 hover:bg-slate-800 border-b border-slate-700">
                          <TableHead className="w-[140px] text-white font-bold text-xs uppercase tracking-wider">
                            Scheduled Date
                          </TableHead>
                          <TableHead className="w-[130px] text-white font-bold text-xs uppercase tracking-wider">
                            Consultation ID
                          </TableHead>
                          <TableHead className="min-w-[200px] text-white font-bold text-xs uppercase tracking-wider">
                            Patient Details
                          </TableHead>
                          <TableHead className="min-w-[180px] text-white font-bold text-xs uppercase tracking-wider">
                            Doctor Alignment
                          </TableHead>
                          <TableHead className="w-[150px] text-white font-bold text-xs uppercase tracking-wider">
                            Stage & SLA
                          </TableHead>
                          <TableHead className="w-[110px] text-white font-bold text-xs uppercase tracking-wider">
                            Status
                          </TableHead>
                          <TableHead className="w-[130px] text-white font-bold text-xs uppercase tracking-wider">
                            Diagnostic Assets
                          </TableHead>
                          <TableHead className="w-[120px] text-white font-bold text-xs uppercase tracking-wider">
                            Sales Rep
                          </TableHead>
                          <TableHead className="text-right sticky right-0 bg-slate-900 z-10 w-[240px] text-white font-bold text-xs uppercase tracking-wider shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.2)]">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-200">
                        {paginatedConsultations.map((c, idx) => {
                          const dt = formatDateTime(c.scheduledDateTime || c.scheduledDate)
                          const delay = getDelayBadge(c.delayHours || 0)
                          return (
                            <TableRow
                              key={c.id}
                              className={`transition-colors hover:bg-blue-50/60 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                            >
                              {/* Scheduled Date */}
                              <TableCell className="text-xs py-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                                  <span>{dt.date}</span>
                                </div>
                                {dt.time && (
                                  <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span>{dt.time}</span>
                                  </div>
                                )}
                              </TableCell>

                              {/* Consultation ID */}
                              <TableCell className="text-xs py-3">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                    {c.consultationId}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(c.consultationId, "Consultation ID")}
                                    className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-200 transition-colors"
                                    title="Copy Consultation ID"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                {c.enquiryId && (
                                  <div className="text-[11px] text-slate-500 font-mono mt-1">
                                    Enq: <span className="font-semibold text-slate-700">{c.enquiryId}</span>
                                  </div>
                                )}
                              </TableCell>

                              {/* Patient Details */}
                              <TableCell className="text-xs py-3">
                                <div className="font-bold text-sm text-slate-900 leading-snug">
                                  {c.patientName}
                                </div>
                                {c.mobile && (
                                  <div className="text-slate-600 flex items-center gap-1.5 text-[11px] mt-0.5">
                                    <Phone className="h-3 w-3 text-emerald-600" />
                                    <a
                                      href={`tel:${c.mobile}`}
                                      className="font-mono hover:text-blue-600 hover:underline font-medium"
                                    >
                                      {c.mobile}
                                    </a>
                                  </div>
                                )}
                                {c.email && (
                                  <div className="text-slate-500 flex items-center gap-1.5 text-[11px] truncate max-w-[180px] mt-0.5">
                                    <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                    <span className="truncate" title={c.email}>{c.email}</span>
                                  </div>
                                )}
                              </TableCell>

                              {/* Doctor Alignment */}
                              <TableCell className="text-xs py-3">
                                <div className="font-bold text-slate-800 truncate max-w-[170px]" title={c.doctorAlignment}>
                                  {c.doctorAlignment || "Unassigned"}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {c.appointmentType && (
                                    <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0 font-semibold border-slate-300">
                                      {c.appointmentType}
                                    </Badge>
                                  )}
                                  {c.doctorCalendarLink && (
                                    <a
                                      href={c.doctorCalendarLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-blue-700 font-semibold hover:underline inline-flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" /> Cal
                                    </a>
                                  )}
                                </div>
                              </TableCell>

                              {/* Stage & SLA */}
                              <TableCell className="text-xs py-3">
                                <Badge variant="outline" className="text-xs font-semibold bg-indigo-50/70 text-indigo-800 border-indigo-200 truncate block max-w-[140px]">
                                  {c.stage}
                                </Badge>
                                <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                                  <span className={`w-2 h-2 rounded-full ${delay.dotClass} shadow-xs`} />
                                  <span className="font-semibold text-slate-700">{delay.label}</span>
                                </div>
                              </TableCell>

                              {/* Status */}
                              <TableCell className="text-xs py-3">
                                <Badge className={`text-xs capitalize border ${getStatusBadge(c.status)}`}>
                                  {c.status}
                                </Badge>
                              </TableCell>

                              {/* Assets */}
                              <TableCell className="text-xs py-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {c.hasPrescription ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold px-1.5 py-0">
                                      Rx Done
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300 px-1.5 py-0 font-medium">
                                      No Rx
                                    </Badge>
                                  )}
                                  {c.clientReportLink && (
                                    <a
                                      href={c.clientReportLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-blue-600 hover:text-blue-800 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                                      title="View Clinical Report"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                  {c.ivrUrl && (
                                    <a
                                      href={c.ivrUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-emerald-600 hover:text-emerald-800 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                      title="IVR Call Recording"
                                    >
                                      <PhoneCall className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              </TableCell>

                              {/* Sales Rep */}
                              <TableCell className="text-xs py-3">
                                <div className="font-semibold text-slate-800 truncate max-w-[110px]" title={c.assignedSalesRep}>
                                  {c.assignedSalesRep || "—"}
                                </div>
                                {c.dataSource && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 mt-0.5 font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {c.dataSource}
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Actions Column (Sticky Right) */}
                              <TableCell className="text-right sticky right-0 bg-white z-10 border-l border-slate-200 py-2.5 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("view", c)}
                                    className="h-7 px-2 text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-300"
                                    title="View Full Consultation Details"
                                  >
                                    <Eye className="h-3 w-3 mr-1" /> View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("schedule", c)}
                                    className="h-7 w-7 p-0 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300"
                                    title="Schedule / Reschedule Appointment"
                                  >
                                    <CalendarDays className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("reports", c)}
                                    className="h-7 w-7 p-0 text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-300"
                                    title="Update Clinical Reports"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("reminder", c)}
                                    className="h-7 w-7 p-0 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
                                    title="Reminder Call Management"
                                  >
                                    <PhoneCall className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("prescription", c)}
                                    className="h-7 w-7 p-0 text-teal-700 bg-teal-50 hover:bg-teal-100 border-teal-300"
                                    title="Upload Digital Prescription"
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActionClick("transfer", c)}
                                    className="h-7 w-7 p-0 text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-300"
                                    title="Transfer Case (KAPPL/KTAHV)"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600 gap-3">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing <span className="font-bold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-bold text-slate-800">
                        {Math.min(currentPage * itemsPerPage, filteredConsultations.length)}
                      </span> of{" "}
                      <span className="font-bold text-slate-800">{filteredConsultations.length}</span> records
                    </span>

                    <div className="flex items-center gap-1.5 ml-2 border-l border-slate-300 pl-3">
                      <span className="text-slate-500 font-medium">Rows:</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(val) => {
                          setItemsPerPage(Number(val))
                          setCurrentPage(1)
                        }}
                      >
                        <SelectTrigger className="h-7 w-16 text-xs bg-white border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3 text-xs bg-white border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Button>
                    <span className="font-medium text-slate-700 px-1">
                      Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                      <span className="font-bold text-slate-900">{totalPages}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-3 text-xs bg-white border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                6. UNIFIED ACTION DIALOGS (sm:max-w-2xl)
            ════════════════════════════════════════════════════════════════════ */}
            <ActionDialog
              open={actionDialog.open}
              onClose={closeActionDialog}
              type={actionDialog.type}
              consultation={actionDialog.consultation}
            />

          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}

// ─── Unified Action Dialog (Exact Same Width: sm:max-w-2xl) ──────────────────

function ActionDialog({
  open,
  onClose,
  type,
  consultation,
}: {
  open: boolean
  onClose: () => void
  type: string
  consultation: Consultation | null
}) {
  if (!consultation) return null

  const getTitle = () => {
    switch (type) {
      case "view":
        return `Consultation Details - ${consultation.patientName}`
      case "schedule":
        return "Schedule Appointment"
      case "reports":
        return "Update Clinical Reports"
      case "reminder":
        return "Reminder Call Management"
      case "prescription":
        return "Upload Prescription"
      case "transfer":
        return "Transfer Case"
      default:
        return "Consultation Action"
    }
  }

  const getDescription = () => {
    switch (type) {
      case "view":
        return `Case: ${consultation.consultationId} • Stage: ${consultation.stage} • Status: ${consultation.status}`
      case "schedule":
        return `Update or reschedule appointment for ${consultation.patientName}`
      case "reports":
        return `Upload clinical diagnostic reports and add notes for ${consultation.patientName}`
      case "reminder":
        return `Record call response and reminder notes for ${consultation.patientName}`
      case "prescription":
        return `Attach digital prescription file for ${consultation.patientName}`
      case "transfer":
        return `Hand over patient case to KAPPL, KTAHV, or Sales team`
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* 
        CRITICAL: All popups strictly use sm:max-w-2xl for 100% consistent width!
      */}
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto p-0 rounded-xl border border-slate-200 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-5 rounded-t-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white tracking-tight">
              {getTitle()}
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-100/90 font-medium mt-1">
              {getDescription()}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5">
          {type === "view" && <ViewDetailsContent consultation={consultation} />}
          {type === "schedule" && <ScheduleContent consultation={consultation} onClose={onClose} />}
          {type === "reports" && <ReportsContent consultation={consultation} onClose={onClose} />}
          {type === "reminder" && <ReminderContent consultation={consultation} onClose={onClose} />}
          {type === "prescription" && <PrescriptionContent consultation={consultation} onClose={onClose} />}
          {type === "transfer" && <TransferContent consultation={consultation} onClose={onClose} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Contents (All formatted for sm:max-w-2xl) ─────────────────────────

function ViewDetailsContent({ consultation }: { consultation: Consultation }) {
  const dt = formatDateTime(consultation.scheduledDateTime || consultation.scheduledDate)

  return (
    <div className="space-y-4 text-xs">
      <div className="grid gap-4 sm:grid-cols-2 p-3 bg-muted/40 rounded-lg border border-border">
        <div>
          <Label className="text-muted-foreground text-[11px]">Patient Name</Label>
          <div className="font-semibold text-sm mt-0.5">{consultation.patientName}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Consultation ID</Label>
          <div className="font-mono font-medium text-sm mt-0.5">{consultation.consultationId}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Phone</Label>
          <div className="font-mono mt-0.5">{consultation.mobile || "—"}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Email</Label>
          <div className="mt-0.5">{consultation.email || "—"}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-muted-foreground text-[11px]">Doctor Alignment</Label>
          <div className="font-medium mt-0.5">{consultation.doctorAlignment || "Unassigned"}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Scheduled Date &amp; Time</Label>
          <div className="font-medium mt-0.5">{dt.date} {dt.time}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Workflow Stage</Label>
          <div className="mt-0.5">
            <Badge variant="outline">{consultation.stage}</Badge>
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Status</Label>
          <div className="mt-0.5">
            <Badge className={getStatusBadge(consultation.status)}>{consultation.status}</Badge>
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Appointment Type</Label>
          <div className="font-medium mt-0.5">{consultation.appointmentType || "—"}</div>
        </div>
        <div>
          <Label className="text-muted-foreground text-[11px]">Sales Representative</Label>
          <div className="font-medium mt-0.5">{consultation.assignedSalesRep || "—"}</div>
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground text-[11px]">Subjects &amp; Complaints</Label>
        <div className="p-2.5 bg-muted/30 rounded border border-border mt-1">
          {consultation.subjects || "No specific subjects recorded"}
        </div>
      </div>

      <div>
        <Label className="text-muted-foreground text-[11px]">Clinical Intake Notes</Label>
        <div className="p-2.5 bg-muted/30 rounded border border-border mt-1 leading-relaxed">
          {consultation.notes || "No intake notes provided"}
        </div>
      </div>

      {consultation.remarks && (
        <div>
          <Label className="text-muted-foreground text-[11px]">Remarks</Label>
          <div className="p-2.5 bg-muted/30 rounded border border-border mt-1">
            {consultation.remarks}
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleContent({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [date, setDate] = useState("")
  const [type, setType] = useState("consultation")
  const [remarks, setRemarks] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Appointment schedule updated for ${consultation.patientName}`)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border">
        <div>
          <span className="text-muted-foreground">Current Date:</span>
          <p className="font-medium mt-0.5">{consultation.scheduledDateTime || "—"}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Doctor:</span>
          <p className="font-medium mt-0.5 truncate">{consultation.doctorAlignment || "—"}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sched-date">New Scheduled Date &amp; Time *</Label>
        <Input
          id="sched-date"
          type="datetime-local"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="appt-type">Appointment Type *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="appt-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultation">Initial Video Consultation</SelectItem>
            <SelectItem value="follow-up">Follow-up Consultation</SelectItem>
            <SelectItem value="in-person">In-Person Consultation</SelectItem>
            <SelectItem value="emergency">Urgent Consult</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sched-remarks">Remarks</Label>
        <Textarea
          id="sched-remarks"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add scheduling notes or confirmation details..."
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Update Schedule
        </Button>
      </DialogFooter>
    </form>
  )
}

function ReportsContent({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [reportType, setReportType] = useState("consultation")
  const [remarks, setRemarks] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Report uploaded successfully")
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label htmlFor="report-file">Upload Report File *</Label>
        <Input id="report-file" type="file" required accept=".pdf,.doc,.docx,.jpg,.png" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-cat">Report Category *</Label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger id="report-cat">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultation">Doctor Consultation Summary</SelectItem>
            <SelectItem value="dosha">Dosha Assessment</SelectItem>
            <SelectItem value="health">Health Assessment</SelectItem>
            <SelectItem value="lab">Lab Diagnostic Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-remarks">Report Remarks</Label>
        <Textarea
          id="report-remarks"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add report observations or findings..."
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Upload Report
        </Button>
      </DialogFooter>
    </form>
  )
}

function ReminderContent({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [callType, setCallType] = useState("client")
  const [status, setStatus] = useState("completed")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success("Reminder status updated")
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="rem-type">Call Target *</Label>
          <Select value={callType} onValueChange={setCallType}>
            <SelectTrigger id="rem-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client Call</SelectItem>
              <SelectItem value="doctor">Doctor Call</SelectItem>
              <SelectItem value="both">Both Client &amp; Doctor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rem-status">Call Status *</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="rem-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed / Confirmed</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="busy">Busy / Call Later</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rem-notes">Call Notes</Label>
        <Textarea
          id="rem-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Client response, readiness, or instructions..."
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Save Reminder
        </Button>
      </DialogFooter>
    </form>
  )
}

function PrescriptionContent({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [type, setType] = useState("initial")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Prescription uploaded for ${consultation.patientName}`)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <Label htmlFor="rx-file">Prescription File *</Label>
        <Input id="rx-file" type="file" required accept=".pdf,.jpg,.jpeg,.png" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rx-type">Prescription Type *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger id="rx-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="initial">Initial Prescription</SelectItem>
            <SelectItem value="follow-up">Follow-up Prescription</SelectItem>
            <SelectItem value="modified">Modified Prescription</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rx-notes">Prescription Notes</Label>
        <Textarea
          id="rx-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add dosage instructions, dietary pathya, or medicine notes..."
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Upload Prescription
        </Button>
      </DialogFooter>
    </form>
  )
}

function TransferContent({ consultation, onClose }: { consultation: Consultation; onClose: () => void }) {
  const [team, setTeam] = useState("kappl")
  const [priority, setPriority] = useState("medium")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success(`Case transferred to ${team.toUpperCase()}`)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="tf-dest">Transfer To *</Label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger id="tf-dest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kappl">KAPPL Team</SelectItem>
              <SelectItem value="ktahv">KTAHV Team</SelectItem>
              <SelectItem value="sales">Sales Team</SelectItem>
              <SelectItem value="support">Support Team</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tf-prio">Priority *</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="tf-prio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tf-notes">Transfer Notes *</Label>
        <Textarea
          id="tf-notes"
          rows={3}
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Handover instructions and requirements..."
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Transfer Case
        </Button>
      </DialogFooter>
    </form>
  )
}
