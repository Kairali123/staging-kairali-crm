"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  Search,
  Eye,
  Plus,
  CheckCircle,
  AlertCircle,
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
  Clock,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface KPI {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  icon: any
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

const stages = [
  { name: "Intake", color: "#2f6b4f", sla: "Auto from SQV/Users/Google Form", slaHours: 0 },
  { name: "Appointment Fix", color: "#b6864a", sla: "+1:00:00 from data arrival", slaHours: 1 },
  { name: "Pre-Consult Docs", color: "#2f6b4f", sla: "-2:00:00 before scheduled", slaHours: 2 },
  { name: "Day-Of Reminder", color: "#b6864a", sla: "-1:00:00 before scheduled", slaHours: 1 },
  { name: "Post-Consult Upload", color: "#2f6b4f", sla: "+1:00:00 after end", slaHours: 1 },
  { name: "Handover to KAPPL/KTAHV", color: "#b6864a", sla: "Same-day completion", slaHours: 8 },
]

const calculateDelayTime = (consultation: Consultation, stageSlaHours: number): number => {
  const now = new Date()
  const createdAt = new Date(consultation.createdAt)
  const hoursSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
  const delayHours = Math.max(0, hoursSinceCreation - stageSlaHours)
  return delayHours
}

const getDelayColor = (delayHours: number): string => {
  if (delayHours === 0) return "bg-green-500"
  if (delayHours <= 2) return "bg-yellow-500"
  if (delayHours <= 8) return "bg-orange-500"
  return "bg-red-500"
}

const formatDelayTime = (delayHours: number): string => {
  if (delayHours === 0) return "On Time"
  if (delayHours < 24) return `${delayHours}h delay`
  const days = Math.floor(delayHours / 24)
  const hours = delayHours % 24
  return `${days}d ${hours}h delay`
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800"
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "overdue":
      return "bg-red-100 text-red-800"
    case "upcoming":
      return "bg-blue-100 text-blue-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getSLAColor = (slaStatus: string) => {
  switch (slaStatus) {
    case "on-time":
      return "text-green-600"
    case "at-risk":
      return "text-yellow-600"
    case "overdue":
      return "text-red-600"
    default:
      return "text-gray-600"
  }
}

export default function DoctorConsultationOverview() {
  const router = useRouter()
  const [kpis, setKpis] = useState<KPI[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [stageBreakup, setStageBreakup] = useState<any[]>([])
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [stageFilter, setStageFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [actionDialog, setActionDialog] = useState<{
    type: string
    consultation: Consultation | null
    open: boolean
  }>({ type: "", consultation: null, open: false })
  const itemsPerPage = 10

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch KPIs
      const kpiResponse = await fetch("/api/doctor/kpis")
      const kpiData = await kpiResponse.json()

      const transformedKPIs = [
        {
          title: "Total Consultations",
          value: kpiData.totalConsultations?.toString() || "0",
          change: "+12% from last month",
          trend: "up" as const,
          icon: Calendar,
        },
        {
          title: "Completed",
          value: kpiData.completedConsultations?.toString() || "0",
          change: "+8% from last month",
          trend: "up" as const,
          icon: CheckCircle,
        },
        {
          title: "Pending",
          value: kpiData.pendingConsultations?.toString() || "0",
          change: "-5% from last month",
          trend: "down" as const,
          icon: Timer,
        },
        {
          title: "Converted Count",
          value: Math.floor((kpiData.completedConsultations || 0) * 0.75).toString(),
          change: "+18% from last month",
          trend: "up" as const,
          icon: TrendingUp,
        },
        {
          title: "Conversion %",
          value: `${Math.round((((kpiData.completedConsultations || 0) * 0.75) / (kpiData.totalConsultations || 1)) * 100)}%`,
          change: "+3% from last month",
          trend: "up" as const,
          icon: CheckCircle,
        },
        {
          title: "Revenue (₹)",
          value: `₹${((kpiData.completedConsultations || 0) * 2500).toLocaleString()}`,
          change: "+22% from last month",
          trend: "up" as const,
          icon: IndianRupee,
        },
        {
          title: "Prescriptions",
          value: kpiData.prescriptionsIssued?.toString() || "0",
          change: "+15% from last month",
          trend: "up" as const,
          icon: Plus,
        },
        {
          title: "Avg TAT (mins)",
          value: kpiData.avgTATMinutes?.toString() || "0",
          change: "-3 mins from last month",
          trend: "up" as const,
          icon: AlertCircle,
        },
      ]
      setKpis(transformedKPIs)

      // Fetch consultations
      const consultationsResponse = await fetch("/api/doctor/consultations")
      const consultationsData = await consultationsResponse.json()

      const consultationsList = consultationsData.consultations || consultationsData.items || []
      setConsultations(consultationsList)

      const breakup = stages.map((stage) => {
        const stageConsultations = consultationsList.filter((c: Consultation) => c.stage === stage.name)
        const pendingConsultations = stageConsultations.filter(
          (c: Consultation) => c.status === "pending" || c.status === "overdue",
        )

        // Calculate delay times for pending consultations
        const consultationsWithDelay = pendingConsultations.map((c: Consultation) => ({
          ...c,
          delayHours: calculateDelayTime(c, stage.slaHours),
        }))

        const totalDelayHours = consultationsWithDelay.reduce(
          (sum: number, c: Consultation & { delayHours?: number }) => sum + (c.delayHours || 0),
          0,
        )
        const avgDelayHours =
          pendingConsultations.length > 0 ? Math.round(totalDelayHours / pendingConsultations.length) : 0

        const pendingCount = pendingConsultations.length
        const totalCount = stageConsultations.length
        const percentage = consultationsList.length > 0 ? (totalCount / consultationsList.length) * 100 : 0

        // Calculate progress based on completion rate
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

      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setConsultations([])
      setStageBreakup([])
      setKpis([])
      setLoading(false)
    }
  }

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUp className="h-3 w-3 text-gray-400" />
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-3 w-3 text-blue-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-blue-600" />
    )
  }

  const handleActionClick = (type: string, consultation: Consultation) => {
    setActionDialog({ type, consultation, open: true })
  }

  const handleStageClick = (stageName: string) => {
    setSelectedStage(selectedStage === stageName ? null : stageName)
    setStageFilter(selectedStage === stageName ? "all" : stageName)
  }

  const filteredConsultations = consultations.filter((consultation) => {
    const matchesSearch =
      (consultation.patientName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (consultation.patientId?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (consultation.consultationId?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || consultation.status === statusFilter
    const matchesStage = stageFilter === "all" || consultation.stage === stageFilter
    const matchesDate = !dateFilter || consultation.scheduledDate?.includes(dateFilter)
    return matchesSearch && matchesStatus && matchesStage && matchesDate
  })

  const sortedConsultations = [...filteredConsultations].sort((a, b) => {
    if (!sortConfig) return 0

    const aValue = a[sortConfig.key as keyof Consultation] || ""
    const bValue = b[sortConfig.key as keyof Consultation] || ""

    if (sortConfig.direction === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const paginatedConsultations = sortedConsultations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(sortedConsultations.length / itemsPerPage)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2f6b4f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-4 mt-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="text-[#2f6b4f] hover:bg-[#2f6b4f]/10 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1f2a2e] break-words leading-tight">
                Doctor Consultation
              </h1>
              <p className="text-sm sm:text-base text-gray-600 break-words leading-relaxed mt-1">
                Manage patient consultations and prescriptions
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#dfe7e2] focus:border-[#2f6b4f] text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border-[#dfe7e2] focus:border-[#2f6b4f] w-full sm:w-40 text-sm"
                placeholder="Filter by date"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 border-[#dfe7e2] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full sm:w-32 border-[#dfe7e2] text-sm">
                  <SelectValue placeholder="Stage" />
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className="border-[#dfe7e2] hover:shadow-lg transition-all duration-200 overflow-hidden">
            <CardContent className="p-0">
              <div
                className={`p-3 md:p-4 ${
                  kpi.trend === "up"
                    ? "bg-gradient-to-br from-green-50 to-emerald-100"
                    : kpi.trend === "down"
                      ? "bg-gradient-to-br from-red-50 to-rose-100"
                      : "bg-gradient-to-br from-gray-50 to-slate-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-gray-700 break-words leading-tight mb-1 font-medium">
                      {kpi.title}
                    </p>
                    <p className="text-base md:text-xl lg:text-2xl font-bold text-[#1f2a2e] break-all leading-tight mb-2">
                      {kpi.value}
                    </p>
                    <div className="flex items-center gap-1">
                      {kpi.trend === "up" ? (
                        <ChevronUp className="h-3 w-3 text-green-600" />
                      ) : kpi.trend === "down" ? (
                        <ChevronDown className="h-3 w-3 text-red-600" />
                      ) : null}
                      <p
                        className={`text-xs leading-tight break-words font-medium ${
                          kpi.trend === "up"
                            ? "text-green-600"
                            : kpi.trend === "down"
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {kpi.change}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      kpi.trend === "up" ? "bg-green-100" : kpi.trend === "down" ? "bg-red-100" : "bg-gray-100"
                    }`}
                  >
                    <kpi.icon
                      className={`h-5 w-5 md:h-6 md:w-6 ${
                        kpi.trend === "up" ? "text-green-600" : kpi.trend === "down" ? "text-red-600" : "text-gray-600"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[#dfe7e2] shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#f8faf9] to-white border-b border-[#dfe7e2]">
          <CardTitle className="text-[#1f2a2e] text-lg md:text-xl flex items-center gap-2">
            📊 Stage Breakup - Pending Items
            <Badge variant="outline" className="ml-auto text-xs">
              {stageBreakup.reduce((sum, stage) => sum + stage.pendingCount, 0)} pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stageBreakup.map((stage, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
                  selectedStage === stage.name
                    ? "border-[#2f6b4f] bg-[#2f6b4f]/5"
                    : "border-gray-200 hover:border-[#2f6b4f]/50"
                }`}
                onClick={() => handleStageClick(stage.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#1f2a2e] text-sm break-words flex-1 min-w-0">{stage.name}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {stage.pendingCount > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-xs px-2 py-1">{stage.pendingCount} pending</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {stage.count} total
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Completion</span>
                      <span className="font-medium">{stage.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          stage.progressPercentage >= 80
                            ? "bg-green-500"
                            : stage.progressPercentage >= 60
                              ? "bg-yellow-500"
                              : stage.progressPercentage >= 40
                                ? "bg-orange-500"
                                : "bg-red-500"
                        }`}
                        style={{ width: `${stage.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Delay Time Display */}
                  {stage.pendingCount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-600">Avg Delay</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getDelayColor(stage.avgDelayHours)}`} />
                        <span
                          className={`font-medium text-xs ${
                            stage.avgDelayHours === 0
                              ? "text-green-600"
                              : stage.avgDelayHours <= 2
                                ? "text-yellow-600"
                                : stage.avgDelayHours <= 8
                                  ? "text-orange-600"
                                  : "text-red-600"
                          }`}
                        >
                          {formatDelayTime(stage.avgDelayHours)}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 break-words leading-relaxed">SLA: {stage.sla}</p>
                </div>

                {selectedStage === stage.name && stage.pendingCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-[#1f2a2e] mb-2">Pending Items:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {stage.consultations
                        .filter((c: Consultation) => c.status === "pending" || c.status === "overdue")
                        .slice(0, 5)
                        .map((consultation: Consultation, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded border text-xs hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActionClick("view", consultation)
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-[#1f2a2e] break-words">{consultation.patientName}</p>
                              <p className="text-gray-500 break-words">ID: {consultation.consultationId}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-gray-400" />
                                <span
                                  className={`text-xs ${
                                    (consultation.delayHours || 0) === 0
                                      ? "text-green-600"
                                      : (consultation.delayHours || 0) <= 2
                                        ? "text-yellow-600"
                                        : (consultation.delayHours || 0) <= 8
                                          ? "text-orange-600"
                                          : "text-red-600"
                                  }`}
                                >
                                  {formatDelayTime(consultation.delayHours || 0)}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className={`text-xs ${getStatusColor(consultation.status)}`}>
                                {consultation.status}
                              </Badge>
                              <div className={`w-2 h-2 rounded-full ${getDelayColor(consultation.delayHours || 0)}`} />
                            </div>
                          </div>
                        ))}
                      {stage.consultations.filter((c: Consultation) => c.status === "pending" || c.status === "overdue")
                        .length > 5 && (
                        <p className="text-xs text-gray-500 text-center py-1">
                          +
                          {stage.consultations.filter(
                            (c: Consultation) => c.status === "pending" || c.status === "overdue",
                          ).length - 5}{" "}
                          more items
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#dfe7e2] shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#f8faf9] to-white border-b border-[#dfe7e2]">
          <CardTitle className="text-[#1f2a2e] text-lg md:text-xl flex items-center gap-2 break-words">
            📋 Comprehensive Consultations
            <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
              {sortedConsultations.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#2f6b4f] to-[#3a7a5c] hover:from-[#2f6b4f] hover:to-[#3a7a5c]">
                    <TableHead
                      className="min-w-[140px] cursor-pointer hover:bg-white/10 text-white font-semibold text-xs md:text-sm sticky left-0 bg-[#2f6b4f] z-10"
                      onClick={() => handleSort("scheduledDateTime")}
                    >
                      <div className="flex items-center gap-1 py-2 break-words">
                        📅 Date & Time
                        {getSortIcon("scheduledDateTime")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[120px] cursor-pointer hover:bg-white/10 text-white font-semibold text-xs md:text-sm"
                      onClick={() => handleSort("consultationId")}
                    >
                      <div className="flex items-center gap-1 py-2 break-words">
                        🆔 Consultation ID
                        {getSortIcon("consultationId")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[120px] cursor-pointer hover:bg-white/10 text-white font-semibold text-xs md:text-sm"
                      onClick={() => handleSort("enquiryId")}
                    >
                      <div className="flex items-center gap-1 py-2 break-words">
                        📝 Enquiry ID
                        {getSortIcon("enquiryId")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="min-w-[220px] cursor-pointer hover:bg-white/10 text-white font-semibold text-xs md:text-sm"
                      onClick={() => handleSort("patientName")}
                    >
                      <div className="flex items-center gap-1 py-2 break-words">
                        👤 Client Details
                        {getSortIcon("patientName")}
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🏷️ Subjects</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📄 Notes</div>
                    </TableHead>
                    <TableHead className="min-w-[100px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🔗 IVR</div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🌐 Website</div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📊 Data Source</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">👨‍💼 Sales Rep</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">💬 Remarks History</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📋 Sheet Data</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📅 Doctor Calendar</div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🏥 Appointment Type</div>
                    </TableHead>
                    <TableHead className="min-w-[150px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">✅ Status</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">⚖️ Doctor Alignment</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🕐 Scheduled Time</div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">💭 Remarks</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📊 Client Report</div>
                    </TableHead>
                    <TableHead className="min-w-[140px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📤 Submit Status</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🔗 Reports Link</div>
                    </TableHead>
                    <TableHead className="min-w-[180px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">💬 Report Remarks</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🧬 Dosha Test</div>
                    </TableHead>
                    <TableHead className="min-w-[180px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🏥 Health Assessment</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🔔 Client Reminder</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">👨‍⚕️ Doctor Reminder</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">✅ Consultation Done</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📤 Upload URL</div>
                    </TableHead>
                    <TableHead className="min-w-[180px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">📝 Post Consultation</div>
                    </TableHead>
                    <TableHead className="min-w-[150px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🏁 Final Status</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">👤 Uploaded By</div>
                    </TableHead>
                    <TableHead className="min-w-[160px] text-white font-semibold text-xs md:text-sm">
                      <div className="py-2 break-words">🔄 Transfer Status</div>
                    </TableHead>
                    <TableHead className="min-w-[220px] text-white font-semibold text-xs md:text-sm sticky right-0 bg-[#2f6b4f] z-10">
                      <div className="py-2 break-words">⚡ Actions</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedConsultations.map((consultation, index) => (
                    <TableRow
                      key={consultation.id}
                      className={`
                        ${index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                        hover:bg-blue-50/50 transition-colors border-b border-gray-100
                      `}
                    >
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                        <div className="font-medium text-[#1f2a2e] break-all">
                          {consultation.scheduledDateTime || consultation.scheduledDate}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm break-all py-3 px-4">
                        <div className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-medium">
                          {consultation.consultationId}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs md:text-sm break-all py-3 px-4">
                        <div className="bg-purple-50 px-2 py-1 rounded text-purple-700 font-medium">
                          {consultation.enquiryId}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[220px] py-3 px-4">
                        <div className="space-y-2">
                          <div className="font-semibold text-[#1f2a2e] break-words text-sm">
                            {consultation.patientName}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="h-3 w-3 flex-shrink-0 text-green-600" />
                            <span className="break-all font-mono">{consultation.mobile}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Mail className="h-3 w-3 flex-shrink-0 text-blue-600" />
                            <span className="break-all font-mono">{consultation.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[140px]">
                        <div className="line-clamp-2" title={consultation.subjects}>
                          {consultation.subjects}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-3 break-words" title={consultation.notes}>
                          {consultation.notes}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.ivrUrl && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.ivrUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-blue-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[140px]">
                        <div className="line-clamp-2" title={consultation.websiteName}>
                          {consultation.websiteName}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-xs break-words bg-orange-50 text-orange-700 border-orange-200"
                        >
                          {consultation.dataSource}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-2 font-medium" title={consultation.assignedSalesRep}>
                          {consultation.assignedSalesRep}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-3 break-words" title={consultation.remarksHistory}>
                          {consultation.remarksHistory}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-2" title={consultation.dataFromSheet}>
                          {consultation.dataFromSheet}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.doctorCalendarLink && (
                          <Button variant="ghost" size="sm" asChild className="text-xs px-2 py-1 h-auto">
                            <a href={consultation.doctorCalendarLink} target="_blank" rel="noopener noreferrer">
                              <Calendar className="h-3 w-3 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-xs break-words bg-teal-50 text-teal-700 border-teal-200"
                        >
                          {consultation.appointmentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.appointmentStatus)}`}>
                          {consultation.appointmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-2" title={consultation.doctorAlignment}>
                          {consultation.doctorAlignment}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4">
                        <div className="font-mono">{consultation.scheduledDateTime}</div>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-3 px-4 max-w-[140px]">
                        <div className="line-clamp-3 break-words" title={consultation.remarks}>
                          {consultation.remarks}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.clientReportLink && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.clientReportLink} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 text-green-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.submitStatus)}`}>
                          {consultation.submitStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.clientReportsLink && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.clientReportsLink} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 text-blue-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-3 px-4 max-w-[180px]">
                        <div className="line-clamp-3 break-words" title={consultation.clientReportsRemarks}>
                          {consultation.clientReportsRemarks}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.doshaTestReportLink && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.doshaTestReportLink} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 text-purple-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.healthAssessmentReportLink && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.healthAssessmentReportLink} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3 w-3 text-red-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.clientReminderStatus)}`}>
                          {consultation.clientReminderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.doctorReminderStatus)}`}>
                          {consultation.doctorReminderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.consultationDoneStatus)}`}>
                          {consultation.consultationDoneStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {consultation.reportsUploadUrl && (
                          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                            <a href={consultation.reportsUploadUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 text-orange-600" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-xs md:text-sm py-3 px-4 max-w-[180px]">
                        <div className="line-clamp-3 break-words" title={consultation.postConsultationRemarks}>
                          {consultation.postConsultationRemarks}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.finalCaseStatus)}`}>
                          {consultation.finalCaseStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs md:text-sm break-words py-3 px-4 max-w-[160px]">
                        <div className="line-clamp-2 font-medium" title={consultation.postConsultationUploadedBy}>
                          {consultation.postConsultationUploadedBy}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge className={`text-xs ${getStatusColor(consultation.transferToUserStatus)}`}>
                          {consultation.transferToUserStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 sticky right-0 bg-inherit z-10 border-l border-gray-200">
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("view", consultation)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs px-2 py-1 h-auto"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="break-words">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("schedule", consultation)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 text-xs px-2 py-1 h-auto"
                          >
                            <CalendarDays className="h-3 w-3 mr-1" />
                            <span className="break-words">Schedule</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("reports", consultation)}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 text-xs px-2 py-1 h-auto"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            <span className="break-words">Reports</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("reminder", consultation)}
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 text-xs px-2 py-1 h-auto"
                          >
                            <PhoneCall className="h-3 w-3 mr-1" />
                            <span className="break-words">Reminder</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("prescription", consultation)}
                            className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 text-xs px-2 py-1 h-auto"
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            <span className="break-words">Prescription</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActionClick("transfer", consultation)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 text-xs px-2 py-1 h-auto"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            <span className="break-words">Transfer</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 px-4 pb-4">
            <p className="text-sm text-gray-600 text-center sm:text-left">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, sortedConsultations.length)}</span> of{" "}
              <span className="font-medium">{sortedConsultations.length}</span> results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="border-[#dfe7e2] hover:bg-[#2f6b4f]/10"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="border-[#dfe7e2] hover:bg-[#2f6b4f]/10"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
        type={actionDialog.type}
        consultation={actionDialog.consultation}
      />
    </div>
  )
}

function ConsultationDrawer({ consultation }: { consultation: Consultation | null }) {
  if (!consultation) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2a2e]">Consultation Details</h1>
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-3">
          <div className="text-[#1f2a2e]">Details</div>
          <div className="text-[#1f2a2e]">Edit</div>
          <div className="text-[#1f2a2e]">Audit</div>
        </div>

        <div className="space-y-4">
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient Name</label>
                  <p className="text-[#1f2a2e]">{consultation.patientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Patient ID</label>
                  <p className="text-[#1f2a2e]">{consultation.patientId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Current Stage</label>
                  <Badge variant="outline" className="border-[#2f6b4f] text-[#2f6b4f]">
                    {consultation.stage}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={getStatusColor(consultation.status)}>{consultation.status}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Edit Consultation</CardTitle>
              <p className="text-sm text-gray-600">Fields marked in purple are editable</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#9a16ff]">Scheduled Date *</label>
                  <Input
                    type="datetime-local"
                    defaultValue={consultation.scheduledDate}
                    className="border-[#9a16ff] focus:border-[#9a16ff]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#9a16ff]">Assigned Doer *</label>
                  <div defaultValue={consultation.doer}>
                    <div className="border-[#9a16ff] focus:border-[#9a16ff]">
                      <div />
                    </div>
                    <div>
                      <div>Dr. Smith</div>
                      <div>Dr. Johnson</div>
                      <div>Dr. Williams</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-[#1f2a2e]">Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="border-l-2 border-[#2f6b4f] pl-4">
                  <p className="text-sm font-medium text-[#1f2a2e]">Consultation Created</p>
                  <p className="text-xs text-gray-600">{consultation.createdAt} by System</p>
                </div>
                <div className="border-l-2 border-[#b6864a] pl-4">
                  <p className="text-sm font-medium text-[#1f2a2e]">Stage Updated to {consultation.stage}</p>
                  <p className="text-xs text-gray-600">2 hours ago by {consultation.doer}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

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
      case "view":
        return "View Consultation Details"
      case "schedule":
        return "Appointment Schedule"
      case "reports":
        return "Reports Update"
      case "reminder":
        return "Reminder Call Update"
      case "prescription":
        return "Prescription Upload"
      case "transfer":
        return "Transfer to User"
      default:
        return "Action"
    }
  }

  const renderDialogContent = () => {
    switch (type) {
      case "view":
        return <ViewConsultationContent consultation={consultation} />
      case "schedule":
        return <ScheduleAppointmentContent consultation={consultation} />
      case "reports":
        return <ReportsUpdateContent consultation={consultation} />
      case "reminder":
        return <ReminderCallContent consultation={consultation} />
      case "prescription":
        return <PrescriptionUploadContent consultation={consultation} />
      case "transfer":
        return <TransferUserContent consultation={consultation} />
      default:
        return <div>Content not available</div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#1f2a2e]">{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  )
}

function ViewConsultationContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Patient Name</label>
          <p className="text-[#1f2a2e]">{consultation.patientName}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Consultation ID</label>
          <p className="text-[#1f2a2e]">{consultation.consultationId}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Mobile</label>
          <p className="text-[#1f2a2e]">{consultation.mobile}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Email</label>
          <p className="text-[#1f2a2e]">{consultation.email}</p>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-600">Notes</label>
          <p className="text-[#1f2a2e]">{consultation.notes}</p>
        </div>
      </div>
    </div>
  )
}

function ScheduleAppointmentContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Current Scheduled Date</label>
          <p className="text-[#1f2a2e]">{consultation.scheduledDateTime}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Appointment Status</label>
          <Badge className={getStatusColor(consultation.appointmentStatus)}>{consultation.appointmentStatus}</Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">New Scheduled Date *</label>
          <Input type="datetime-local" className="border-[#2f6b4f]" />
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Appointment Type *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consultation">Consultation</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#2f6b4f]">Remarks</label>
          <Textarea placeholder="Add scheduling remarks..." className="border-[#2f6b4f]" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Update Schedule</Button>
      </div>
    </div>
  )
}

function ReportsUpdateContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Current Report Status</label>
          <Badge className={getStatusColor(consultation.submitStatus)}>{consultation.submitStatus}</Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Reports Upload URL</label>
          {consultation.reportsUploadUrl ? (
            <Button variant="ghost" size="sm" asChild>
              <a href={consultation.reportsUploadUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Report
              </a>
            </Button>
          ) : (
            <p className="text-gray-500">No report uploaded</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Upload New Report *</label>
          <Input type="file" accept=".pdf,.doc,.docx" className="border-[#2f6b4f]" />
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Report Type *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consultation">Consultation Report</SelectItem>
              <SelectItem value="prescription">Prescription</SelectItem>
              <SelectItem value="lab">Lab Report</SelectItem>
              <SelectItem value="follow-up">Follow-up Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#2f6b4f]">Report Remarks</label>
          <Textarea placeholder="Add report remarks..." className="border-[#2f6b4f]" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Upload Report</Button>
      </div>
    </div>
  )
}

function ReminderCallContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Client Reminder Status</label>
          <Badge className={getStatusColor(consultation.clientReminderStatus)}>
            {consultation.clientReminderStatus}
          </Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Doctor Reminder Status</label>
          <Badge className={getStatusColor(consultation.doctorReminderStatus)}>
            {consultation.doctorReminderStatus}
          </Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Call Type *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select call type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Call to Client</SelectItem>
              <SelectItem value="doctor">Call to Doctor</SelectItem>
              <SelectItem value="both">Call to Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Call Status *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#2f6b4f]">Call Notes</label>
          <Textarea placeholder="Add call notes and follow-up actions..." className="border-[#2f6b4f]" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Update Reminder</Button>
      </div>
    </div>
  )
}

function PrescriptionUploadContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Patient Name</label>
          <p className="text-[#1f2a2e]">{consultation.patientName}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Consultation Date</label>
          <p className="text-[#1f2a2e]">{consultation.scheduledDateTime}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Upload Prescription *</label>
          <Input type="file" accept=".pdf,.jpg,.png" className="border-[#2f6b4f]" />
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Prescription Type *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial">Initial Prescription</SelectItem>
              <SelectItem value="follow-up">Follow-up Prescription</SelectItem>
              <SelectItem value="modified">Modified Prescription</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#2f6b4f]">Prescription Notes</label>
          <Textarea placeholder="Add prescription notes and instructions..." className="border-[#2f6b4f]" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Upload Prescription</Button>
      </div>
    </div>
  )
}

function TransferUserContent({ consultation }: { consultation: Consultation }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Current Status</label>
          <Badge className={getStatusColor(consultation.transferToUserStatus)}>
            {consultation.transferToUserStatus}
          </Badge>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Current Assigned Rep</label>
          <p className="text-[#1f2a2e]">{consultation.assignedSalesRep}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Transfer To *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kappl">KAPPL Team</SelectItem>
              <SelectItem value="ktahv">KTAHV Team</SelectItem>
              <SelectItem value="sales">Sales Team</SelectItem>
              <SelectItem value="support">Support Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-[#2f6b4f]">Priority *</label>
          <Select>
            <SelectTrigger className="border-[#2f6b4f]">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-[#2f6b4f]">Transfer Notes</label>
          <Textarea placeholder="Add transfer notes and handover instructions..." className="border-[#2f6b4f]" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button className="bg-[#2f6b4f] hover:bg-[#2f6b4f]/90">Transfer User</Button>
      </div>
    </div>
  )
}
