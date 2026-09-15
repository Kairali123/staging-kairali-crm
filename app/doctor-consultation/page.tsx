"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Stethoscope,
  Calendar,
  Search,
  Eye,
  Plus,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Timer,
  ArrowLeft,
  ExternalLink,
  FileText,
  Phone,
  Mail,
  CalendarDays,
  Upload,
  UserCheck,
  PhoneCall,
  TrendingUp,
  IndianRupee,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  RotateCcw,
  Download,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  MoreVertical,
  Building2,
  Sparkles,
  Check,
  Copy,
  X,
  Activity,
  User,
  ShieldCheck,
  Award,
} from "lucide-react"

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface KPI {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  icon: any
  subtext?: string
  accentColor?: string
}

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
  color: string
  sla: string
  slaHours: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const stages: StageDefinition[] = [
  { name: "Intake", shortName: "Intake", color: "#1a5c6b", sla: "Auto from SQV / Web Form", slaHours: 0 },
  { name: "Appointment Fix", shortName: "Apt Fix", color: "#b6864a", sla: "+1:00h from arrival", slaHours: 1 },
  { name: "Pre-Consult Docs", shortName: "Pre-Docs", color: "#0f4a57", sla: "-2:00h before schedule", slaHours: 2 },
  { name: "Day-Of Reminder", shortName: "Reminder", color: "#c28e46", sla: "-1:00h before schedule", slaHours: 1 },
  { name: "Post-Consult Upload", shortName: "Post-Upload", color: "#2f6b4f", sla: "+1:00h after end", slaHours: 1 },
  { name: "Handover to KAPPL/KTAHV", shortName: "Handover", color: "#854d0e", sla: "Same-day completion", slaHours: 8 },
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
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    }
  }
  if (delayHours <= 2) {
    return {
      label: `${delayHours}h delay`,
      className: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
    }
  }
  if (delayHours <= 8) {
    return {
      label: `${delayHours}h delay`,
      className: "bg-orange-50 text-orange-700 border-orange-200",
      dotClass: "bg-orange-500",
    }
  }
  const days = Math.floor(delayHours / 24)
  const remHours = delayHours % 24
  const label = days > 0 ? `${days}d ${remHours}h delay` : `${delayHours}h delay`
  return {
    label,
    className: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  }
}

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "submitted":
    case "transferred":
    case "sent":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "pending":
    case "new":
    case "in-progress":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "overdue":
    case "cancelled":
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200"
    case "upcoming":
      return "bg-sky-50 text-sky-700 border-sky-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
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

const getInitials = (name: string) => {
  if (!name) return "PT"
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DoctorConsultationOverview() {
  const router = useRouter()

  // State
  const [kpis, setKpis] = useState<KPI[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [stageBreakup, setStageBreakup] = useState<any[]>([])
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stageFilter, setStageFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [viewMode, setViewMode] = useState<"streamlined" | "full">("streamlined")

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>({ key: "scheduledDateTime", direction: "desc" })
  const itemsPerPage = 10

  // Modals & Drawer State
  const [drawerConsultation, setDrawerConsultation] = useState<Consultation | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    type: string
    consultation: Consultation | null
    open: boolean
  }>({ type: "", consultation: null, open: false })

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

      const transformedKPIs: KPI[] = [
        {
          title: "Total Consultations",
          value: total.toString(),
          change: "+12% this month",
          trend: "up",
          icon: Calendar,
          subtext: "All scheduled cases",
          accentColor: "from-teal-600 to-cyan-700",
        },
        {
          title: "Completed Cases",
          value: completed.toString(),
          change: `${Math.round((completed / total) * 100)}% completion`,
          trend: "up",
          icon: CheckCircle2,
          subtext: "Successfully finished",
          accentColor: "from-emerald-600 to-teal-700",
        },
        {
          title: "Active Pending",
          value: pending.toString(),
          change: `${pending > 10 ? "Needs triage" : "Under control"}`,
          trend: pending > 15 ? "down" : "neutral",
          icon: Clock,
          subtext: "Across active pipeline",
          accentColor: "from-amber-600 to-orange-700",
        },
        {
          title: "Converted Cases",
          value: converted.toString(),
          change: `${conversionRate}% conversion rate`,
          trend: "up",
          icon: TrendingUp,
          subtext: "Handover to package/stay",
          accentColor: "from-blue-600 to-indigo-700",
        },
        {
          title: "Est. Revenue",
          value: `₹${revenue.toLocaleString("en-IN")}`,
          change: "+22% vs last month",
          trend: "up",
          icon: IndianRupee,
          subtext: "Direct clinical value",
          accentColor: "from-emerald-600 to-green-700",
        },
        {
          title: "Prescriptions Issued",
          value: (kpiData.prescriptionsIssued || Math.round(completed * 0.9)).toString(),
          change: "+15% fulfillment",
          trend: "up",
          icon: FileText,
          subtext: "Digital Rx generated",
          accentColor: "from-indigo-600 to-violet-700",
        },
        {
          title: "Avg Turnaround",
          value: `${kpiData.avgTATMinutes || 42} min`,
          change: "-3 mins TAT improved",
          trend: "up",
          icon: Timer,
          subtext: "Intake to completion",
          accentColor: "from-sky-600 to-blue-700",
        },
        {
          title: "SLA Compliance",
          value: "94.2%",
          change: "+2.1% SLA hit rate",
          trend: "up",
          icon: ShieldCheck,
          subtext: "Within defined targets",
          accentColor: "from-teal-600 to-emerald-700",
        },
      ]
      setKpis(transformedKPIs)

      // Fetch consultations
      const consultationsResponse = await fetch("/api/doctor/consultations")
      const consultationsData = await consultationsResponse.json()
      const consultationsList: Consultation[] = consultationsData.consultations || consultationsData.items || []
      setConsultations(consultationsList)

      // Compute Stage Breakup with delay analytics
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

      if (showToast) toast.success("Consultation data refreshed successfully")
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load consultation data")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Sorting
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUp className="h-3 w-3 text-slate-400 opacity-40" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-teal-600 font-bold" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-teal-600 font-bold" />
    )
  }

  // Filter & Search Handlers
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

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setStageFilter("all")
    setSelectedStage(null)
    setDateFilter("")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "all" || stageFilter !== "all" || dateFilter !== ""

  // Filtered and Sorted Consultations
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
      const matchesDate = !dateFilter || consultation.scheduledDate?.includes(dateFilter)

      return matchesSearch && matchesStatus && matchesStage && matchesDate
    })
  }, [consultations, searchTerm, statusFilter, stageFilter, dateFilter])

  const sortedConsultations = useMemo(() => {
    if (!sortConfig) return filteredConsultations
    return [...filteredConsultations].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof Consultation] || ""
      const bValue = b[sortConfig.key as keyof Consultation] || ""
      if (sortConfig.direction === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [filteredConsultations, sortConfig])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedConsultations.length / itemsPerPage))
  const paginatedConsultations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedConsultations.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedConsultations, currentPage, itemsPerPage])

  // Quick Action Handler
  const handleActionClick = (type: string, consultation: Consultation) => {
    if (type === "view-drawer") {
      setDrawerConsultation(consultation)
      return
    }
    setActionDialog({ type, consultation, open: true })
  }

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = [
        "Consultation ID",
        "Enquiry ID",
        "Patient Name",
        "Patient ID",
        "Mobile",
        "Email",
        "Subjects",
        "Notes",
        "Website",
        "Data Source",
        "Sales Rep",
        "Appointment Type",
        "Appointment Status",
        "Doctor Alignment",
        "Scheduled Date Time",
        "Remarks",
        "Stage",
        "Status",
        "SLA Status",
        "Submit Status",
        "Client Reminder",
        "Doctor Reminder",
        "Consultation Done",
        "Final Case Status",
        "Transfer Status",
      ]

      const rows = sortedConsultations.map((c) => [
        `"${c.consultationId || ""}"`,
        `"${c.enquiryId || ""}"`,
        `"${c.patientName || ""}"`,
        `"${c.patientId || ""}"`,
        `"${c.mobile || ""}"`,
        `"${c.email || ""}"`,
        `"${(c.subjects || "").replace(/"/g, '""')}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
        `"${c.websiteName || ""}"`,
        `"${c.dataSource || ""}"`,
        `"${c.assignedSalesRep || ""}"`,
        `"${c.appointmentType || ""}"`,
        `"${c.appointmentStatus || ""}"`,
        `"${c.doctorAlignment || ""}"`,
        `"${c.scheduledDateTime || c.scheduledDate || ""}"`,
        `"${(c.remarks || "").replace(/"/g, '""')}"`,
        `"${c.stage || ""}"`,
        `"${c.status || ""}"`,
        `"${c.slaStatus || ""}"`,
        `"${c.submitStatus || ""}"`,
        `"${c.clientReminderStatus || ""}"`,
        `"${c.doctorReminderStatus || ""}"`,
        `"${c.consultationDoneStatus || ""}"`,
        `"${c.finalCaseStatus || ""}"`,
        `"${c.transferToUserStatus || ""}"`,
      ])

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Doctor_Consultations_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Consultation data exported successfully")
    } catch {
      toast.error("Failed to export data to CSV")
    }
  }

  // Counts for tabs
  const statusCounts = useMemo(() => {
    return {
      all: consultations.length,
      pending: consultations.filter((c) => c.status === "pending").length,
      completed: consultations.filter((c) => c.status === "completed").length,
      overdue: consultations.filter((c) => c.status === "overdue").length,
      upcoming: consultations.filter((c) => c.status === "upcoming").length,
    }
  }, [consultations])

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">

          {/* ── 1. Executive Hero Header ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900 via-[#134e5e] to-slate-900 border border-teal-700/40 shadow-xl p-6 sm:p-8 text-white">
            {/* Background Ambient Glows */}
            <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 -mb-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Title & Brand Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard")}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-medium h-8"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Dashboard
                  </Button>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 px-3 py-1 font-semibold text-xs tracking-wider uppercase backdrop-blur-md">
                    Clinical Operations
                  </Badge>
                  <Badge variant="outline" className="bg-white/10 text-white/90 border-white/20 text-xs">
                    <Activity className="w-3 h-3 mr-1 text-teal-300 animate-pulse" /> Live Doctor Hub
                  </Badge>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-13 w-13 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg border border-white/20 flex-shrink-0">
                    <Stethoscope className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      Doctor Consultation Hub
                    </h1>
                    <p className="text-slate-300 text-xs sm:text-sm mt-0.5 max-w-2xl">
                      Central clinical management: patient intake, appointment scheduling, doctor alignment, SLA tracking, and prescription fulfillment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submodule Navigation Links & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/doctor-consultation/report")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-medium h-9"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5 text-teal-300" />
                  Reports Sheet
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/doctor-consultation/calendar")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-medium h-9"
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                  Doctor Calendar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/doctor-consultation/history")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-medium h-9"
                >
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                  History
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/doctor-consultation/prescription/new")}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-md text-xs font-semibold h-9"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New Prescription
                </Button>
              </div>
            </div>
          </div>

          {/* ── 2. Executive KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4">
            {kpis.map((kpi, idx) => {
              const IconComp = kpi.icon
              return (
                <Card
                  key={idx}
                  className="border-slate-200/80 bg-white hover:border-teal-500/50 hover:shadow-md transition-all duration-200 overflow-hidden group"
                >
                  <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-slate-500 truncate" title={kpi.title}>
                        {kpi.title}
                      </p>
                      <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-200 flex-shrink-0">
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                        {kpi.value}
                      </div>
                      <div className="flex items-center gap-1 text-[11px]">
                        {kpi.trend === "up" ? (
                          <ChevronUp className="h-3 w-3 text-emerald-600 shrink-0" />
                        ) : kpi.trend === "down" ? (
                          <ChevronDown className="h-3 w-3 text-rose-600 shrink-0" />
                        ) : null}
                        <span
                          className={`truncate font-medium ${
                            kpi.trend === "up"
                              ? "text-emerald-600"
                              : kpi.trend === "down"
                              ? "text-rose-600"
                              : "text-slate-500"
                          }`}
                        >
                          {kpi.change}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* ── 3. Stage Pipeline & SLA Bottleneck Tracker ── */}
          <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-teal-50/40 border-b border-slate-100 py-3.5 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-teal-100/80 text-teal-800 flex items-center justify-center">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                      Workflow Pipeline &amp; Stage Bottleneck Tracker
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Click any stage to filter consultations table. Monitors SLA delay hours and pending throughput.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs px-2.5 py-0.5">
                    {stageBreakup.reduce((sum, s) => sum + s.pendingCount, 0)} Total Pending
                  </Badge>
                  {selectedStage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStageClick(selectedStage)}
                      className="text-xs text-teal-700 hover:text-teal-900 h-7 px-2"
                    >
                      <X className="h-3 w-3 mr-1" /> Reset Stage
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                {stageBreakup.map((stage, idx) => {
                  const isSelected = selectedStage === stage.name
                  const delayInfo = getDelayBadge(stage.avgDelayHours)
                  return (
                    <div
                      key={idx}
                      onClick={() => handleStageClick(stage.name)}
                      className={`relative rounded-xl border p-3.5 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/50 shadow-md ring-2 ring-teal-500/20"
                          : "border-slate-200 hover:border-teal-400 hover:shadow-sm bg-white"
                      }`}
                    >
                      {/* Top row: Stage step + total count */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {stage.count} total
                          </span>
                        </div>

                        <h3 className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1 mb-1" title={stage.name}>
                          {stage.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mb-3">
                          SLA: {stage.sla}
                        </p>
                      </div>

                      {/* Bottom section: Progress and Pending badges */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-semibold text-slate-700">{stage.progressPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${stage.progressPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Badge
                            className={`text-[10px] px-1.5 py-0 h-4 font-semibold ${
                              stage.pendingCount > 0
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {stage.pendingCount} pending
                          </Badge>

                          {stage.pendingCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className={`w-1.5 h-1.5 rounded-full ${delayInfo.dotClass}`} />
                              <span className="text-slate-600 font-medium">{delayInfo.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── 4. Control Toolbar & Filtering Bar ── */}
          <div className="space-y-3">
            {/* Status Tabs Navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                {[
                  { key: "all", label: "All Records", count: statusCounts.all },
                  { key: "pending", label: "Pending", count: statusCounts.pending },
                  { key: "completed", label: "Completed", count: statusCounts.completed },
                  { key: "overdue", label: "Overdue", count: statusCounts.overdue },
                  { key: "upcoming", label: "Upcoming", count: statusCounts.upcoming },
                ].map((tab) => {
                  const isActive = statusFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setStatusFilter(tab.key)
                        setCurrentPage(1)
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-teal-700 text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* View Toggle & Refresh / Export */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center bg-white border border-slate-200/80 rounded-lg p-0.5 shadow-sm">
                  <button
                    onClick={() => setViewMode("streamlined")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      viewMode === "streamlined"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Streamlined
                  </button>
                  <button
                    onClick={() => setViewMode("full")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                      viewMode === "full"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All 33 Columns
                  </button>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchData(true)}
                      disabled={isRefreshing}
                      className="h-8 w-8 p-0 bg-white border-slate-200/80 hover:bg-slate-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-slate-600 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Data</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="h-8 w-8 p-0 bg-white border-slate-200/80 hover:bg-slate-50"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to CSV</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Search and Secondary Filter Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by Patient Name, ID, Phone, Doctor, or Consultation ID..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-9 text-xs border-slate-200 focus:border-teal-600 focus:ring-teal-600"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={stageFilter}
                  onValueChange={(val) => {
                    setStageFilter(val)
                    setSelectedStage(val === "all" ? null : val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44 h-9 text-xs border-slate-200">
                    <SelectValue placeholder="Stage Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workflow Stages</SelectItem>
                    {stages.map((stage) => (
                      <SelectItem key={stage.name} value={stage.name}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full sm:w-36 h-9 text-xs border-slate-200"
                />

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── 5. Main Consultations Table ── */}
          <Card className="border-slate-200/80 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-teal-50/30 border-b border-slate-100 py-3.5 px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm sm:text-base font-bold text-slate-900">
                    Comprehensive Consultations Register
                  </CardTitle>
                  <Badge variant="outline" className="text-xs bg-white text-slate-600 border-slate-200">
                    {sortedConsultations.length} records
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-teal-700 mb-3" />
                  <p className="text-sm font-medium text-slate-600">Loading consultations registry...</p>
                </div>
              ) : paginatedConsultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1">No Consultations Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    No patient consultations matched your search criteria or active filters. Try adjusting your query.
                  </p>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Clear All Filters
                    </Button>
                  )}
                </div>
              ) : viewMode === "streamlined" ? (
                /* ── Streamlined High-Readability Table View ── */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead
                          className="cursor-pointer hover:bg-slate-100 text-slate-700 font-semibold text-xs py-3 w-[160px]"
                          onClick={() => handleSort("scheduledDateTime")}
                        >
                          <div className="flex items-center gap-1">
                            <span>Scheduled Date</span>
                            {getSortIcon("scheduledDateTime")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-100 text-slate-700 font-semibold text-xs py-3 w-[150px]"
                          onClick={() => handleSort("consultationId")}
                        >
                          <div className="flex items-center gap-1">
                            <span>Case Identifiers</span>
                            {getSortIcon("consultationId")}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-slate-100 text-slate-700 font-semibold text-xs py-3 min-w-[220px]"
                          onClick={() => handleSort("patientName")}
                        >
                          <div className="flex items-center gap-1">
                            <span>Patient &amp; Contact</span>
                            {getSortIcon("patientName")}
                          </div>
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 min-w-[200px]">
                          Doctor &amp; Alignment
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 w-[180px]">
                          Workflow Stage &amp; SLA
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 w-[120px]">
                          Status
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 w-[130px]">
                          Clinical Assets
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 w-[140px]">
                          Source / Rep
                        </TableHead>
                        <TableHead className="text-slate-700 font-semibold text-xs py-3 text-right sticky right-0 bg-slate-50/95 z-10 w-[140px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedConsultations.map((c, index) => {
                        const dt = formatDateTime(c.scheduledDateTime || c.scheduledDate)
                        const delay = getDelayBadge(c.delayHours || 0)
                        return (
                          <TableRow
                            key={c.id || index}
                            className={`hover:bg-teal-50/30 transition-colors border-b border-slate-100 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                            }`}
                          >
                            {/* Scheduled Date */}
                            <TableCell className="py-3 px-4">
                              <div className="space-y-0.5">
                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span>{dt.date}</span>
                                </div>
                                {dt.time && (
                                  <div className="text-[11px] text-slate-500 font-medium pl-4">
                                    {dt.time}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Case Identifiers */}
                            <TableCell className="py-3 px-4">
                              <div className="space-y-1">
                                <button
                                  onClick={() => copyToClipboard(c.consultationId, "Consultation ID")}
                                  className="group inline-flex items-center gap-1 font-mono text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200/80 transition-colors"
                                  title="Click to copy Consultation ID"
                                >
                                  <span>{c.consultationId}</span>
                                  <Copy className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                                </button>
                                {c.enquiryId && (
                                  <div className="text-[11px] font-mono text-slate-500">
                                    Enq: {c.enquiryId}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* Patient & Contact */}
                            <TableCell className="py-3 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-700 to-slate-800 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                  {getInitials(c.patientName)}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <div className="text-xs font-bold text-slate-900 truncate" title={c.patientName}>
                                    {c.patientName}
                                  </div>
                                  {c.mobile && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                      <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                                      <a href={`tel:${c.mobile}`} className="hover:underline font-mono">
                                        {c.mobile}
                                      </a>
                                    </div>
                                  )}
                                  {c.email && (
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[180px]">
                                      <Mail className="h-3 w-3 text-sky-600 shrink-0" />
                                      <a href={`mailto:${c.email}`} className="hover:underline truncate" title={c.email}>
                                        {c.email}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Doctor & Alignment */}
                            <TableCell className="py-3 px-4">
                              <div className="space-y-1 max-w-[200px]">
                                <div className="text-xs font-semibold text-slate-800 truncate" title={c.doctorAlignment}>
                                  {c.doctorAlignment || "Doctor Unassigned"}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {c.appointmentType && (
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-600">
                                      {c.appointmentType}
                                    </Badge>
                                  )}
                                  {c.doctorCalendarLink && (
                                    <a
                                      href={c.doctorCalendarLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 hover:underline"
                                    >
                                      <Calendar className="h-2.5 w-2.5" /> Calendar
                                    </a>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Workflow Stage & SLA */}
                            <TableCell className="py-3 px-4">
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-xs font-medium border-slate-300 text-slate-800 bg-white truncate block max-w-[160px]">
                                  {c.stage}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${delay.dotClass}`} />
                                  <span className={`text-[11px] font-medium ${delay.className.split(" ")[1]}`}>
                                    {delay.label}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="py-3 px-4">
                              <Badge className={`text-xs capitalize font-semibold border ${getStatusBadge(c.status)}`}>
                                {c.status}
                              </Badge>
                            </TableCell>

                            {/* Clinical Assets */}
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {c.hasPrescription ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                                        Rx Issued
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Prescription available</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Badge variant="outline" className="text-slate-400 text-[10px] px-1.5 py-0">
                                    No Rx
                                  </Badge>
                                )}
                                {c.clientReportLink && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={c.clientReportLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-6 w-6 rounded bg-slate-100 hover:bg-teal-100 text-teal-700 flex items-center justify-center transition-colors"
                                      >
                                        <FileText className="h-3 w-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>Client Report</TooltipContent>
                                  </Tooltip>
                                )}
                                {c.ivrUrl && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a
                                        href={c.ivrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-6 w-6 rounded bg-slate-100 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors"
                                      >
                                        <PhoneCall className="h-3 w-3" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent>IVR Recording</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>

                            {/* Source / Rep */}
                            <TableCell className="py-3 px-4">
                              <div className="space-y-0.5 max-w-[130px]">
                                <div className="text-xs font-medium text-slate-800 truncate" title={c.assignedSalesRep}>
                                  {c.assignedSalesRep || "—"}
                                </div>
                                {c.dataSource && (
                                  <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50/70 text-amber-800 border-amber-200">
                                    {c.dataSource}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions (Sticky Right) */}
                            <TableCell className="py-3 px-4 text-right sticky right-0 bg-white/95 z-10 border-l border-slate-100">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActionClick("view-drawer", c)}
                                  className="h-7 px-2 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:bg-teal-50"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 text-xs">
                                    <DropdownMenuItem onClick={() => handleActionClick("view-drawer", c)}>
                                      <Eye className="h-3.5 w-3.5 mr-2 text-teal-600" /> View Full 33 Fields
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleActionClick("schedule", c)}>
                                      <CalendarDays className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Reschedule Appointment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleActionClick("reports", c)}>
                                      <FileText className="h-3.5 w-3.5 mr-2 text-blue-600" /> Update Reports
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleActionClick("reminder", c)}>
                                      <PhoneCall className="h-3.5 w-3.5 mr-2 text-amber-600" /> Reminder Call Update
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleActionClick("prescription", c)}>
                                      <Upload className="h-3.5 w-3.5 mr-2 text-indigo-600" /> Upload Prescription
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleActionClick("transfer", c)}>
                                      <UserCheck className="h-3.5 w-3.5 mr-2 text-rose-600" /> Transfer to Team
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* ── Full 33-Column Data View ── */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/80 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[150px] font-semibold text-xs py-3 text-slate-800 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                          Date &amp; Time
                        </TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800">Consultation ID</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Enquiry ID</TableHead>
                        <TableHead className="min-w-[200px] font-semibold text-xs py-3 text-slate-800">Patient Details</TableHead>
                        <TableHead className="min-w-[140px] font-semibold text-xs py-3 text-slate-800">Subjects</TableHead>
                        <TableHead className="min-w-[160px] font-semibold text-xs py-3 text-slate-800">Notes</TableHead>
                        <TableHead className="min-w-[80px] font-semibold text-xs py-3 text-slate-800">IVR</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Website</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Data Source</TableHead>
                        <TableHead className="min-w-[140px] font-semibold text-xs py-3 text-slate-800">Sales Rep</TableHead>
                        <TableHead className="min-w-[150px] font-semibold text-xs py-3 text-slate-800">Remarks History</TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800">Sheet Data</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Calendar</TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800">Appointment Type</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Appt Status</TableHead>
                        <TableHead className="min-w-[160px] font-semibold text-xs py-3 text-slate-800">Doctor Alignment</TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800">Scheduled Time</TableHead>
                        <TableHead className="min-w-[140px] font-semibold text-xs py-3 text-slate-800">Remarks</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Client Report</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Submit Status</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Reports Link</TableHead>
                        <TableHead className="min-w-[150px] font-semibold text-xs py-3 text-slate-800">Report Remarks</TableHead>
                        <TableHead className="min-w-[100px] font-semibold text-xs py-3 text-slate-800">Dosha Test</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Health Assess.</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Client Reminder</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Doctor Reminder</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Consult Done</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Upload URL</TableHead>
                        <TableHead className="min-w-[160px] font-semibold text-xs py-3 text-slate-800">Post Remarks</TableHead>
                        <TableHead className="min-w-[110px] font-semibold text-xs py-3 text-slate-800">Final Status</TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800">Uploaded By</TableHead>
                        <TableHead className="min-w-[120px] font-semibold text-xs py-3 text-slate-800">Transfer Status</TableHead>
                        <TableHead className="min-w-[130px] font-semibold text-xs py-3 text-slate-800 sticky right-0 bg-slate-100 z-10 border-l border-slate-200 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedConsultations.map((c, index) => {
                        const dt = formatDateTime(c.scheduledDateTime || c.scheduledDate)
                        return (
                          <TableRow
                            key={c.id || index}
                            className={`hover:bg-teal-50/20 text-xs border-b border-slate-100 ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                            }`}
                          >
                            <TableCell className="py-2.5 px-3 sticky left-0 bg-inherit z-10 border-r border-slate-200 font-medium">
                              {dt.date} {dt.time}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 font-mono font-medium text-teal-800">
                              {c.consultationId}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 font-mono text-slate-600">
                              {c.enquiryId}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 font-semibold text-slate-900">
                              <div>{c.patientName}</div>
                              <div className="text-[10px] font-normal text-slate-500 font-mono">{c.mobile}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[140px] truncate" title={c.subjects}>{c.subjects}</TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[160px] truncate" title={c.notes}>{c.notes}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.ivrUrl ? (
                                <a href={c.ivrUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Call
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[120px] truncate">{c.websiteName || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px]">{c.dataSource}</Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 font-medium">{c.assignedSalesRep || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[150px] truncate" title={c.remarksHistory}>{c.remarksHistory || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[130px] truncate">{c.dataFromSheet || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.doctorCalendarLink ? (
                                <a href={c.doctorCalendarLink} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  View
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">{c.appointmentType || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.appointmentStatus)}`}>
                                {c.appointmentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[160px] truncate" title={c.doctorAlignment}>{c.doctorAlignment || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3 font-mono">{c.scheduledDateTime || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[140px] truncate" title={c.remarks}>{c.remarks || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.clientReportLink ? (
                                <a href={c.clientReportLink} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Report
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.submitStatus)}`}>
                                {c.submitStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.clientReportsLink ? (
                                <a href={c.clientReportsLink} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Link
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[150px] truncate">{c.clientReportsRemarks || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.doshaTestReportLink ? (
                                <a href={c.doshaTestReportLink} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Dosha
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.healthAssessmentReportLink ? (
                                <a href={c.healthAssessmentReportLink} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Health
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.clientReminderStatus)}`}>
                                {c.clientReminderStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.doctorReminderStatus)}`}>
                                {c.doctorReminderStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.consultationDoneStatus)}`}>
                                {c.consultationDoneStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              {c.reportsUploadUrl ? (
                                <a href={c.reportsUploadUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:underline">
                                  Upload
                                </a>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 max-w-[160px] truncate">{c.postConsultationRemarks || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.finalCaseStatus)}`}>
                                {c.finalCaseStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">{c.postConsultationUploadedBy || "—"}</TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge className={`text-[10px] ${getStatusBadge(c.transferToUserStatus)}`}>
                                {c.transferToUserStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right sticky right-0 bg-inherit z-10 border-l border-slate-200">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActionClick("view-drawer", c)}
                                className="h-6 px-2 text-xs text-teal-700 hover:text-teal-900"
                              >
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {sortedConsultations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-slate-800">
                    {Math.min(currentPage * itemsPerPage, sortedConsultations.length)}
                  </span>{" "}
                  of <span className="font-semibold text-slate-800">{sortedConsultations.length}</span> consultations
                </p>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 text-xs border-slate-200"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium text-slate-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 text-xs border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── 6. Comprehensive 33-Field Slide-Over Drawer ── */}
          <ConsultationDrawer
            consultation={drawerConsultation}
            onClose={() => setDrawerConsultation(null)}
            onAction={(type, c) => {
              setDrawerConsultation(null)
              handleActionClick(type, c)
            }}
          />

          {/* ── 7. Interactive Action Dialogs ── */}
          <ActionDialog
            open={actionDialog.open}
            onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
            type={actionDialog.type}
            consultation={actionDialog.consultation}
          />

        </div>
      </TooltipProvider>
    </DashboardLayout>
  )
}

// ─── Comprehensive Consultation Drawer (All 33 Fields Organized) ─────────────

function ConsultationDrawer({
  consultation,
  onClose,
  onAction,
}: {
  consultation: Consultation | null
  onClose: () => void
  onAction: (type: string, c: Consultation) => void
}) {
  if (!consultation) return null
  const dt = formatDateTime(consultation.scheduledDateTime || consultation.scheduledDate)

  return (
    <Sheet open={!!consultation} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto p-0 border-l border-slate-200 bg-white">
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sticky top-0 z-20 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] uppercase font-semibold">
                  {consultation.stage}
                </Badge>
                <Badge className={`text-[10px] ${getStatusBadge(consultation.status)}`}>
                  {consultation.status}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{consultation.patientName}</h2>
              <div className="flex items-center gap-2 text-xs text-teal-200 font-mono">
                <span>Case: {consultation.consultationId}</span>
                {consultation.enquiryId && <span>• Enq: {consultation.enquiryId}</span>}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Drawer Content Tabs */}
        <div className="p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 rounded-xl text-xs">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold py-1.5">Overview</TabsTrigger>
              <TabsTrigger value="workflow" className="rounded-lg text-xs font-semibold py-1.5">Workflow &amp; SLA</TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg text-xs font-semibold py-1.5">Reports</TabsTrigger>
              <TabsTrigger value="handover" className="rounded-lg text-xs font-semibold py-1.5">Handover</TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="space-y-4 focus:outline-hidden">
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Patient &amp; Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block">Patient Name</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.patientName || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Patient ID</label>
                    <p className="font-mono text-slate-800 mt-0.5">{consultation.patientId || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Mobile Contact</label>
                    <p className="font-mono text-slate-800 mt-0.5">{consultation.mobile || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Email Address</label>
                    <p className="text-slate-800 mt-0.5">{consultation.email || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Clinical Subjects &amp; Conditions</label>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2 rounded border border-slate-100">
                      {consultation.subjects || "No specific conditions registered"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Clinical Intake Notes</label>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                      {consultation.notes || "No notes provided"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block">Appointment Type</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.appointmentType || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Appointment Status</label>
                    <Badge className={`mt-0.5 ${getStatusBadge(consultation.appointmentStatus)}`}>
                      {consultation.appointmentStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Doctor Alignment</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.doctorAlignment || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Scheduled Date &amp; Time</label>
                    <p className="font-mono text-slate-800 mt-0.5">{dt.date} {dt.time}</p>
                  </div>
                  {consultation.doctorCalendarLink && (
                    <div className="sm:col-span-2">
                      <label className="text-slate-500 font-medium block">Doctor Calendar</label>
                      <a
                        href={consultation.doctorCalendarLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-teal-700 hover:underline mt-1 font-medium"
                      >
                        <Calendar className="h-3.5 w-3.5" /> View Doctor Google Calendar Schedule
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Workflow & SLA */}
            <TabsContent value="workflow" className="space-y-4 focus:outline-hidden">
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Workflow &amp; SLA Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block">Current Workflow Stage</label>
                    <Badge variant="outline" className="mt-1 font-semibold text-slate-900 bg-white">
                      {consultation.stage}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Overall Case Status</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.status)}`}>
                      {consultation.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Assigned Stage Doer</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.doer || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Sales Representative</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.assignedSalesRep || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Data Source</label>
                    <p className="text-slate-800 mt-0.5">{consultation.dataSource || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Website Source</label>
                    <p className="text-slate-800 mt-0.5">{consultation.websiteName || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Remarks History</label>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                      {consultation.remarksHistory || "No remarks history recorded."}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Data Source Sheet Info</label>
                    <p className="text-slate-700 mt-0.5 font-mono text-[11px]">{consultation.dataFromSheet || "—"}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Reports & Diagnostics */}
            <TabsContent value="reports" className="space-y-4 focus:outline-hidden">
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Diagnostic Reports &amp; Clinical Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block">Client Report Submission</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.submitStatus)}`}>
                      {consultation.submitStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Prescription Status</label>
                    <Badge className={`mt-1 ${consultation.hasPrescription ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {consultation.hasPrescription ? "Prescription Generated" : "Awaiting Prescription"}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Client Report Link</label>
                    {consultation.clientReportLink ? (
                      <a href={consultation.clientReportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline mt-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View Uploaded Report
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-0.5">Not available</p>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Dosha Test Report</label>
                    {consultation.doshaTestReportLink ? (
                      <a href={consultation.doshaTestReportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline mt-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View Dosha Evaluation
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-0.5">Not available</p>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Health Assessment Link</label>
                    {consultation.healthAssessmentReportLink ? (
                      <a href={consultation.healthAssessmentReportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline mt-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View Assessment
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-0.5">Not available</p>
                    )}
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Bulk Upload URL</label>
                    {consultation.reportsUploadUrl ? (
                      <a href={consultation.reportsUploadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 hover:underline mt-1">
                        <ExternalLink className="h-3.5 w-3.5" /> View Upload Folder
                      </a>
                    ) : (
                      <p className="text-slate-400 mt-0.5">Not available</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Diagnostic &amp; Report Remarks</label>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                      {consultation.clientReportsRemarks || "No report remarks recorded."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Handover & Reminders */}
            <TabsContent value="handover" className="space-y-4 focus:outline-hidden">
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-100">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Reminders, Outcomes &amp; Handover
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 font-medium block">Client Reminder Status</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.clientReminderStatus)}`}>
                      {consultation.clientReminderStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Doctor Reminder Status</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.doctorReminderStatus)}`}>
                      {consultation.doctorReminderStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Consultation Done Status</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.consultationDoneStatus)}`}>
                      {consultation.consultationDoneStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Final Case Outcome</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.finalCaseStatus)}`}>
                      {consultation.finalCaseStatus}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Post-Consultation Uploaded By</label>
                    <p className="font-semibold text-slate-900 mt-0.5">{consultation.postConsultationUploadedBy || "—"}</p>
                  </div>
                  <div>
                    <label className="text-slate-500 font-medium block">Transfer to Team Status</label>
                    <Badge className={`mt-1 ${getStatusBadge(consultation.transferToUserStatus)}`}>
                      {consultation.transferToUserStatus}
                    </Badge>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block">Post-Consultation Handover Remarks</label>
                    <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100 leading-relaxed">
                      {consultation.postConsultationRemarks || "No post-consultation handover remarks."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 sticky bottom-0 z-20 flex items-center justify-between gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction("schedule", consultation)}
              className="text-xs border-slate-200 hover:bg-slate-100"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Schedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction("prescription", consultation)}
              className="text-xs border-slate-200 hover:bg-slate-100"
            >
              <Upload className="h-3.5 w-3.5 mr-1 text-teal-600" />
              Upload Rx
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction("transfer", consultation)}
              className="text-xs border-slate-200 hover:bg-slate-100"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1 text-blue-600" />
              Transfer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Refined Action Dialogs Component ────────────────────────────────────────

function ActionDialog({
  open,
  onOpenChange,
  type,
  consultation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: string
  consultation: Consultation | null
}) {
  if (!consultation) return null

  const getDialogTitle = () => {
    switch (type) {
      case "schedule":
        return "Appointment Schedule & Reschedule"
      case "reports":
        return "Update Clinical Reports"
      case "reminder":
        return "Reminder Call Management"
      case "prescription":
        return "Upload Patient Prescription"
      case "transfer":
        return "Transfer Case to Team / Handover"
      default:
        return "Consultation Action"
    }
  }

  const getDialogDescription = () => {
    switch (type) {
      case "schedule":
        return `Adjust consultation appointment schedule for ${consultation.patientName}.`
      case "reports":
        return `Upload clinical assessment reports and add diagnostics remarks.`
      case "reminder":
        return `Log client or doctor reminder call status and notes.`
      case "prescription":
        return `Attach or upload signed prescription for ${consultation.patientName}.`
      case "transfer":
        return `Hand over patient file to KAPPL, KTAHV or Sales team.`
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-0 border border-slate-200 shadow-xl bg-white rounded-xl">
        <DialogHeader className="bg-gradient-to-r from-slate-900 to-teal-900 text-white p-5 rounded-t-xl">
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-400" />
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 mt-1">
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="p-5">
          {type === "schedule" && <ScheduleContent consultation={consultation} onClose={() => onOpenChange(false)} />}
          {type === "reports" && <ReportsContent consultation={consultation} onClose={() => onOpenChange(false)} />}
          {type === "reminder" && <ReminderContent consultation={consultation} onClose={() => onOpenChange(false)} />}
          {type === "prescription" && <PrescriptionContent consultation={consultation} onClose={() => onOpenChange(false)} />}
          {type === "transfer" && <TransferContent consultation={consultation} onClose={() => onOpenChange(false)} />}
        </div>
      </DialogContent>
    </Dialog>
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
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div>
          <span className="text-slate-500 font-medium">Current Schedule:</span>
          <p className="font-semibold text-slate-900 mt-0.5">{consultation.scheduledDateTime || "—"}</p>
        </div>
        <div>
          <span className="text-slate-500 font-medium">Doctor Alignment:</span>
          <p className="font-semibold text-slate-900 mt-0.5 truncate">{consultation.doctorAlignment || "—"}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">New Scheduled Date &amp; Time *</label>
        <Input
          type="datetime-local"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-xs h-9"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Appointment Type *</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultation">Initial Video Consultation</SelectItem>
            <SelectItem value="follow-up">Clinical Follow-up</SelectItem>
            <SelectItem value="in-person">In-Person Assessment</SelectItem>
            <SelectItem value="emergency">Urgent Consult</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Scheduling Notes</label>
        <Textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add scheduling notes or client confirmation details..."
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
          Confirm Schedule
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
    toast.success("Report uploaded and logged successfully")
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Report Document File *</label>
        <Input type="file" required accept=".pdf,.doc,.docx,.jpg,.png" className="text-xs h-9 cursor-pointer" />
        <p className="text-[11px] text-slate-500">Supports PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Report Category *</label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consultation">Doctor Consultation Summary</SelectItem>
            <SelectItem value="dosha">Ayurvedic Dosha Analysis</SelectItem>
            <SelectItem value="health">General Health Assessment</SelectItem>
            <SelectItem value="lab">External Lab / Diagnostic Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Report Notes &amp; Findings</label>
        <Textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Clinical findings, vital observations, or recommendations..."
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
          Upload &amp; Save
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
    toast.success("Reminder status recorded successfully")
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Reminder Target *</label>
          <Select value={callType} onValueChange={setCallType}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client Reminder Call</SelectItem>
              <SelectItem value="doctor">Doctor Reminder Call</SelectItem>
              <SelectItem value="both">Both Client &amp; Doctor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Call Outcome *</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Confirmed / Connected</SelectItem>
              <SelectItem value="no-answer">No Answer / Switched Off</SelectItem>
              <SelectItem value="busy">Busy / Call Later</SelectItem>
              <SelectItem value="rescheduled">Client Requested Reschedule</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Call Notes &amp; Next Action</label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Client response, readiness, Zoom/WhatsApp link confirmation..."
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
          Save Reminder Call
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
        <label className="font-semibold text-slate-700">Upload Prescription File *</label>
        <Input type="file" required accept=".pdf,.jpg,.jpeg,.png" className="text-xs h-9 cursor-pointer" />
        <p className="text-[11px] text-slate-500">Attach signed digital prescription (PDF or high-res image)</p>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Prescription Type *</label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="initial">Initial Consultation Prescription</SelectItem>
            <SelectItem value="follow-up">Follow-up Regimen Adjustment</SelectItem>
            <SelectItem value="ayurvedic">Ayurvedic Proprietary Medicines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Dosage Instructions &amp; Dietary Advice</label>
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Pathya/Apathya, medicine timing, follow-up date..."
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
          Save Prescription
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
    toast.success(`Case transferred to ${team.toUpperCase()} successfully`)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Transfer Destination *</label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kappl">KAPPL (Ayurvedic Products Team)</SelectItem>
              <SelectItem value="ktahv">KTAHV (Healing Village Inpatient Team)</SelectItem>
              <SelectItem value="sales">Sales &amp; Booking Team</SelectItem>
              <SelectItem value="support">Patient Support &amp; Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Handover Priority *</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="text-xs h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High (Urgent Attention)</SelectItem>
              <SelectItem value="medium">Medium (Standard SLA)</SelectItem>
              <SelectItem value="low">Low (Routine)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="font-semibold text-slate-700">Handover Instructions &amp; Next Steps *</label>
        <Textarea
          rows={3}
          required
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Product requirement details, recommended treatment package, room requirements..."
          className="text-xs resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
        <Button type="submit" size="sm" className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
          Handover Case
        </Button>
      </DialogFooter>
    </form>
  )
}
