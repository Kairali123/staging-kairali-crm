"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Database,
  Download,
  Filter,
  Headphones,
  Info,
  ListChecks,
  Loader2,
  Mail,
  PhoneCall,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  TableProperties,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  Volume2,
  X,
  XCircle,
  Award,
  Zap,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
import { BackButton } from "@/components/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

// The HR action modal's two picklists. These strings are written verbatim to
// `daily_sales_reports_log_fms.hr_verify_status` and
// `.hr_action_for_calling_fail_pass`, and they drive a half-day attendance
// deduction downstream — so HR picks from a fixed vocabulary rather than typing,
// which is what let spelling variants into the column before.
//
// One option each, by owner instruction. Adding a value here is all that is
// needed to widen either list; see `withCurrentValue` for how a value already
// saved on a row is kept selectable even when it is not in these lists.
const HR_VERIFY_STATUS_OPTIONS = ["Half Day \u2013 Call Audit FAIL"] as const
const HR_CALLING_ACTION_OPTIONS = ["Half day leave Updated on Pagarbook"] as const

// A `Select` renders an empty trigger for a value that is not among its items,
// which on a read-only row would silently blank a figure HR already recorded.
// So whatever the row currently holds is always offered, appended to the list.
// That covers rows saved before these lists existed and the "No action required"
// default `openAction` still applies to a PASS row.
function withCurrentValue(options: readonly string[], current: string): string[] {
  const trimmed = (current || "").trim()
  if (!trimmed || options.includes(trimmed)) return [...options]
  return [...options, trimmed]
}

type AuditResult = "Pass" | "Fail"
type EmailStatus = "Sent" | "Not Sent"

export type SalesCallAuditDbRow = {
  id: number
  time_stamp: string | null
  emp_id: string | null
  name: string | null
  designation: string | null
  mid: string | null
  daily_fail_pass: string | null
  total_calls_audited: number | null
  good_calls: number | null
  bad_calls: number | null
  product_knowledge: number | null
  customer_understanding: number | null
  communication_skills: number | null
  objection_handling: number | null
  closing_skills: number | null
  tone_volume: number | null
  avg_score: number | null
  planned_management: string | null
  actual_hr: string | null
  time_delay_hr: string | null
  hr_name: string | null
  hr_verify_status: string | null
  hr_action_for_calling_fail_pass: string | null
  other_remarks: string | null
  hr_level_whatsapp_update_status_to_sales: string | null
  update_master_attendance_tracker: string | null
  update_status_of_account_fms: string | null
  created_at: string | null
  updated_at: string | null
}

export type AgentAudit = {
  recordId: number
  mid: string
  id: string
  name: string
  designation: string
  initials: string
  calls: number
  good: number
  bad: number
  score: number
  result: AuditResult
  disposition: string
  emailStatus: EmailStatus
  productKnowledge: number | null
  customerUnderstanding: number | null
  communicationSkills: number | null
  objectionHandling: number | null
  closingSkills: number | null
  toneVolume: number | null
  timeDelayHr: string | null
  hrName: string | null
  hrVerifyStatus: string | null
  hrActionForCalling: string | null
  otherRemarks: string | null
  attendanceTrackerUpdated: boolean
  accountFmsUpdated: boolean
  actualHr: string | null
  rawDate: string
}

export type AuditDay = {
  date: string
  label: string
  agents: AgentAudit[]
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function getInitials(name: string): string {
  if (!name) return "AG"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDateKey(isoDate: string | null): { dateKey: string; label: string } {
  if (!isoDate) {
    return { dateKey: "Unknown Date", label: "Unknown Date" }
  }
  try {
    const d = new Date(isoDate)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    return {
      dateKey: `${day}-${month}-${year}`,
      label: `${day} ${monthNames[d.getMonth()]} ${year}`,
    }
  } catch {
    return { dateKey: "Unknown Date", label: "Unknown Date" }
  }
}

function ResultBadge({ result }: { result: AuditResult }) {
  return result === "Pass" ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-bold">
      <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
      PASS
    </Badge>
  ) : (
    <Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 font-bold">
      <XCircle className="mr-1 h-3 w-3 text-rose-600" />
      FAIL
    </Badge>
  )
}

function EmailBadge({ status }: { status: EmailStatus }) {
  return status === "Sent" ? (
    <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50 font-medium">
      <Mail className="mr-1 h-3 w-3 text-blue-600" />
      Sent
    </Badge>
  ) : (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500">
      <CircleAlert className="mr-1 h-3 w-3 text-slate-400" />
      Not sent
    </Badge>
  )
}

export default function SalesCallAuditPage() {
  const { user } = useAuth()
  const [dbRecords, setDbRecords] = useState<SalesCallAuditDbRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAction, setSavingAction] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  // Which rows this session received. The server decides this from
  // `sales_call_audit.viewSelf` / `.viewAll` and reports it on the response, so
  // the page no longer filters rows itself: what arrives is already in scope.
  //
  // This replaces a client-side `isUserRecord` filter that narrowed the table in
  // a `useMemo` while the API returned every row regardless — anyone could read
  // the whole team out of the network tab (#48).
  const [scope, setScope] = useState<"all" | "self" | "none">("none")
  const [accessError, setAccessError] = useState<string>("")

  // Saving HR actions is its own permission. `sales_call_audit.view` used to
  // imply it; now only `.write` grants it, and `super_admin` keeps blanket
  // access by owner ruling.
  const canWrite = useMemo(() => {
    if (!user) return false
    const role = String(user.role || "").trim().toLowerCase().replace(/[\s\-_]+/g, "")
    if (role === "superadmin") return true
    return Boolean(
      user.permissions?.includes("all") ||
      user.permissions?.includes("sales_call_audit.write")
    )
  }, [user])

  // Filter States
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [search, setSearch] = useState("")

  // UI state
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [selectedAgent, setSelectedAgent] = useState<{ date: string; agent: AgentAudit } | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "analytics">("table")
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Good / Bad Call Detail Modal
  const [callDetailModal, setCallDetailModal] = useState<{
    open: boolean
    type: "good" | "bad" | "all"
    agent: AgentAudit
    date: string
  } | null>(null)
  const [modalCalls, setModalCalls] = useState<any[]>([])
  const [modalAgentMeta, setModalAgentMeta] = useState<any>(null)
  const [modalCallsLoading, setModalCallsLoading] = useState(false)
  const [modalCallTab, setModalCallTab] = useState<"all" | "good" | "bad">("all")
  const [modalCallSearch, setModalCallSearch] = useState("")
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  const getAudioStreamUrl = (url?: string): string => {
    if (!url) return ""
    const trimmed = url.trim()
    const gDriveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
    if (gDriveMatch && gDriveMatch[1]) {
      return `https://docs.google.com/uc?export=download&id=${gDriveMatch[1]}`
    }
    return trimmed
  }

  // Fetch granular audited call details when modal is opened
  useEffect(() => {
    if (!callDetailModal?.open || !callDetailModal.agent) {
      setModalCalls([])
      setModalAgentMeta(null)
      return
    }
    setModalCallTab(callDetailModal.type)
    setModalCallSearch("")
    setExpandedCallId(null)

    const fetchModalCalls = async () => {
      try {
        setModalCallsLoading(true)
        const params = new URLSearchParams({
          record_id: String(callDetailModal.agent.recordId || ""),
          emp_id: callDetailModal.agent.id || "",
          name: callDetailModal.agent.name || "",
          date: callDetailModal.date || "",
          type: "all",
        })
        const res = await fetch(`/api/sales-call-audit/calls?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            if (Array.isArray(json.data)) {
              setModalCalls(json.data)
            }
            if (json.agent) {
              setModalAgentMeta(json.agent)
            }
          }
        }
      } catch (e) {
        console.error("Failed to load call details", e)
      } finally {
        setModalCallsLoading(false)
      }
    }

    fetchModalCalls()
  }, [callDetailModal])

  // HR Action Dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState<{ date: string; agent: AgentAudit } | null>(null)
  const [verifyStatus, setVerifyStatus] = useState("")
  const [callingAction, setCallingAction] = useState("")
  const [remarks, setRemarks] = useState("")
  const [halfDayLeave, setHalfDayLeave] = useState(false)
  const [pagarbookUpdated, setPagarbookUpdated] = useState(false)

  // Fetch actual data from daily_sales_reports_log_fms
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setAccessError("")
      const res = await fetch("/api/sales-call-audit")

      // A permission failure is a state to render, not an error to toast: the
      // user reached the page legitimately and simply holds no data scope.
      if (res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => null)
        setDbRecords([])
        setScope("none")
        setAccessError(
          body?.error ||
            "You do not have permission to view sales call audit data."
        )
        return
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch audit data (status: ${res.status})`)
      }
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setDbRecords(json.data)
        setScope(json.scope === "all" || json.scope === "self" ? json.scope : "none")
        const now = new Date()
        setLastUpdated(
          now.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) + " " + now.toLocaleTimeString("en-GB", { hour12: false })
        )
      } else {
        toast.error(json.error || "Failed to load audit data")
      }
    } catch (err: any) {
      console.error("[sales-call-audit] Error fetching live data:", err)
      toast.error("Error connecting to daily_sales_reports_log_fms database")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Transform raw DB rows into structured date groups (applying role-based user filtering)
  const auditDays = useMemo<AuditDay[]>(() => {
    if (!dbRecords.length) return []

    const groups: Record<string, { label: string; agents: AgentAudit[] }> = {}

    dbRecords.forEach(row => {
      const { dateKey, label } = formatDateKey(row.time_stamp || row.created_at)
      if (!groups[dateKey]) {
        groups[dateKey] = { label, agents: [] }
      }

      const isPass = (row.daily_fail_pass || "").toUpperCase() === "PASS"
      const agent: AgentAudit = {
        recordId: row.id,
        mid: row.mid || `rec_${row.id}`,
        id: row.emp_id || `EMP-${row.id}`,
        name: row.name || "Unknown Agent",
        designation: row.designation || "Sales Executive",
        initials: getInitials(row.name || "Sales Agent"),
        calls: row.total_calls_audited || 0,
        good: row.good_calls || 0,
        bad: row.bad_calls || 0,
        score: Number(row.avg_score || 0),
        result: isPass ? "Pass" : "Fail",
        disposition: isPass ? "Follow-up / Converted" : "Callback / Not Interested",
        emailStatus: row.hr_level_whatsapp_update_status_to_sales === "Sent" ? "Sent" : "Not Sent",
        productKnowledge: row.product_knowledge !== null ? Number(row.product_knowledge) : null,
        customerUnderstanding: row.customer_understanding !== null ? Number(row.customer_understanding) : null,
        communicationSkills: row.communication_skills !== null ? Number(row.communication_skills) : null,
        objectionHandling: row.objection_handling !== null ? Number(row.objection_handling) : null,
        closingSkills: row.closing_skills !== null ? Number(row.closing_skills) : null,
        toneVolume: row.tone_volume !== null ? Number(row.tone_volume) : null,
        timeDelayHr: row.time_delay_hr,
        hrName: row.hr_name,
        hrVerifyStatus: row.hr_verify_status,
        hrActionForCalling: row.hr_action_for_calling_fail_pass,
        otherRemarks: row.other_remarks,
        attendanceTrackerUpdated: row.update_master_attendance_tracker === "Yes",
        accountFmsUpdated: row.update_status_of_account_fms === "Yes",
        actualHr: row.actual_hr,
        rawDate: row.time_stamp || row.created_at || "",
      }

      groups[dateKey].agents.push(agent)
    })

    const result = Object.keys(groups).map(dateKey => ({
      date: dateKey,
      label: groups[dateKey].label,
      agents: groups[dateKey].agents,
    }))

    return result
  }, [dbRecords])

  // Automatically expand only the first (latest) date on initial load (Accordion behavior)
  useEffect(() => {
    if (auditDays.length > 0 && expandedDates.size === 0) {
      setExpandedDates(new Set([auditDays[0].date]))
    }
  }, [auditDays, expandedDates.size])

  // Unique list of sales agents for the filter dropdown
  const uniqueAgents = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    dbRecords.forEach(r => {
      if (r.emp_id && !map.has(r.emp_id)) {
        map.set(r.emp_id, { id: r.emp_id, name: r.name || r.emp_id })
      }
    })
    return Array.from(map.values())
  }, [dbRecords])

  // Filtered dataset
  const filteredDays = useMemo(() => {
    let days = auditDays
    if (dateFilter !== "all") {
      days = days.filter(d => d.date === dateFilter)
    }

    return days.map(day => ({
      ...day,
      agents: day.agents.filter(agent => {
        const matchesEmployee = employeeFilter === "all" || agent.id === employeeFilter
        const matchesResult = resultFilter === "all" || agent.result === resultFilter
        const matchesSearch =
          !search ||
          `${agent.name} ${agent.id} ${agent.designation} ${agent.hrVerifyStatus || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        return matchesEmployee && matchesResult && matchesSearch
      }),
    }))
  }, [auditDays, dateFilter, employeeFilter, resultFilter, search])

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [employeeFilter, resultFilter, dateFilter, search, pageSize])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredDays.length / pageSize))
  const paginatedDays = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredDays.slice(start, start + pageSize)
  }, [filteredDays, currentPage, pageSize])

  // Auto-expand paginated dates on page change
  useEffect(() => {
    if (paginatedDays.length > 0) {
      setExpandedDates(prev => {
        const next = new Set(prev)
        paginatedDays.forEach(d => next.add(d.date))
        return next
      })
    }
  }, [paginatedDays])

  // Aggregate KPIs calculated from live DB data
  const allFilteredAgents = filteredDays.flatMap(day => day.agents)
  const totalAuditedCalls = allFilteredAgents.reduce((sum, agent) => sum + agent.calls, 0)
  const passCount = allFilteredAgents.filter(agent => agent.result === "Pass").length
  const failCount = allFilteredAgents.filter(agent => agent.result === "Fail").length
  const passRate = allFilteredAgents.length ? Math.round((passCount / allFilteredAgents.length) * 100) : 0
  const failRate = allFilteredAgents.length ? Math.round((failCount / allFilteredAgents.length) * 100) : 0
  const averageScore = allFilteredAgents.length
    ? allFilteredAgents.reduce((sum, agent) => sum + agent.score, 0) / allFilteredAgents.length
    : 0

  const hrActionsCompleted = allFilteredAgents.filter(
    agent => agent.hrVerifyStatus || agent.hrActionForCalling || agent.otherRemarks
  ).length
  const pendingHrActions = Math.max(0, failCount - hrActionsCompleted)
  const attendanceSyncCount = allFilteredAgents.filter(agent => agent.attendanceTrackerUpdated || agent.accountFmsUpdated).length

  // Trend Data computed from live DB dates
  const trendData = useMemo(() => {
    return auditDays
      .slice(-7)
      .reverse()
      .map(day => ({
        date: day.date.substring(0, 5),
        pass: day.agents.filter(a => a.result === "Pass").length,
        fail: day.agents.filter(a => a.result === "Fail").length,
      }))
  }, [auditDays])

  // Monthly aggregated data
  const monthlyRows = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    return MONTHS.map((month, index) => {
      const isFuture = selectedYear === currentYear && index > currentMonth
      if (isFuture) return { month, calls: 0, audited: 0, pass: 0, fail: 0, failRate: 0, emailSent: 0 }

      const agentsInMonth = dbRecords.filter(r => {
        if (!r.time_stamp && !r.created_at) return false
        const d = new Date(r.time_stamp || r.created_at!)
        return d.getFullYear() === selectedYear && d.getMonth() === index
      })

      const audited = agentsInMonth.length
      const calls = agentsInMonth.reduce((s, a) => s + (a.total_calls_audited || 0), 0)
      const pass = agentsInMonth.filter(a => (a.daily_fail_pass || "").toUpperCase() === "PASS").length
      const fail = agentsInMonth.filter(a => (a.daily_fail_pass || "").toUpperCase() === "FAIL").length
      const emailSent = agentsInMonth.filter(a => a.hr_level_whatsapp_update_status_to_sales === "Sent").length

      return {
        month,
        calls,
        audited,
        pass,
        fail,
        failRate: audited ? (fail / audited) * 100 : 0,
        emailSent,
      }
    })
  }, [dbRecords, selectedYear])

  // Single-Accordion toggle behavior: Only ONE date row can be open at a time
  const toggleDate = (date: string) => {
    setExpandedDates(previous => {
      if (previous.has(date)) {
        return new Set() // Collapse if already open
      }
      return new Set([date]) // Expand ONLY this date, automatically closing all others
    })
  }

  const isReadOnly = useMemo(() => {
    if (!actionTarget) return false
    const { agent } = actionTarget
    return Boolean(
      agent.hrVerifyStatus ||
      agent.hrActionForCalling ||
      agent.otherRemarks ||
      agent.attendanceTrackerUpdated ||
      agent.accountFmsUpdated
    )
  }, [actionTarget])

  const openAction = (date: string, agent: AgentAudit) => {
    setActionTarget({ date, agent })
    setVerifyStatus(agent.hrVerifyStatus || "Half Day – Call Audit FAIL")
    setCallingAction(
      agent.hrActionForCalling ||
      (agent.result === "Fail" ? "Half day leave Updated on Pagarbook" : "No action required")
    )
    setRemarks(agent.otherRemarks || "")
    setHalfDayLeave(agent.attendanceTrackerUpdated || agent.result === "Fail")
    setPagarbookUpdated(agent.accountFmsUpdated || false)
    setActionDialogOpen(true)
  }

  const isActionFormValid = useMemo(() => {
    const hasVerifyStatus = Boolean(verifyStatus && verifyStatus.trim().length > 0)
    const hasCallingAction = Boolean(callingAction && callingAction.trim().length > 0)
    const hasRemarks = Boolean(remarks && remarks.trim().length > 0)
    const hasCheckbox = Boolean(halfDayLeave || pagarbookUpdated)
    return hasVerifyStatus && hasCallingAction && hasRemarks && hasCheckbox
  }, [verifyStatus, callingAction, remarks, halfDayLeave, pagarbookUpdated])

  const saveAction = async () => {
    if (!actionTarget) return
    if (!verifyStatus.trim()) {
      toast.error("HR Verify Status is required")
      return
    }
    if (!callingAction.trim()) {
      toast.error("HR Action for Calling Fail/Pass is required")
      return
    }
    if (!remarks.trim()) {
      toast.error("Remarks / Notes are required")
      return
    }
    if (!halfDayLeave && !pagarbookUpdated) {
      toast.error("Please select at least one attendance action checkbox")
      return
    }

    try {
      setSavingAction(true)
      const res = await fetch("/api/sales-call-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionTarget.agent.recordId,
          mid: actionTarget.agent.mid,
          emp_id: actionTarget.agent.id,
          empId: actionTarget.agent.id,
          name: actionTarget.agent.name,
          employee_name: actionTarget.agent.name,
          designation: actionTarget.agent.designation,
          date: actionTarget.date,
          daily_fail_pass: actionTarget.agent.result,
          result: actionTarget.agent.result,
          total_calls_audited: actionTarget.agent.calls,
          good_calls: actionTarget.agent.good,
          bad_calls: actionTarget.agent.bad,
          avg_score: actionTarget.agent.score,
          hr_verify_status: verifyStatus.trim(),
          hr_action_for_calling_fail_pass: callingAction.trim(),
          other_remarks: remarks.trim(),
          update_master_attendance_tracker: halfDayLeave ? "Yes" : "No",
          update_status_of_account_fms: pagarbookUpdated ? "Yes" : "No",
          halfDayLeave,
          pagarbookUpdated,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast.success("HR Action saved and posted to Google Sheet & Database")
        setActionDialogOpen(false)
        await fetchData()
      } else {
        toast.error(json.error || "Failed to save HR action")
      }
    } catch (err: any) {
      console.error("[sales-call-audit] Save action error:", err)
      toast.error("Error saving HR action")
    } finally {
      setSavingAction(false)
    }
  }

  const resetFilters = () => {
    setEmployeeFilter("all")
    setResultFilter("all")
    setDateFilter("all")
    setSearch("")
  }

  const downloadCSV = () => {
    const headers = [
      "ID",
      "Date",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Calls Audited",
      "Good Calls",
      "Bad Calls",
      "Product Knowledge",
      "Customer Understanding",
      "Communication Skills",
      "Objection Handling",
      "Closing Skills",
      "Tone & Volume",
      "Average Score",
      "Result",
      "Time Delay HR",
      "HR Name",
      "HR Verify Status",
      "HR Action Taken",
      "HR Remarks",
      "Attendance Tracker Updated",
      "Account FMS Updated",
    ]

    const rows = filteredDays.flatMap(day =>
      day.agents.map(agent => [
        agent.recordId,
        day.date,
        agent.id,
        `"${agent.name}"`,
        `"${agent.designation}"`,
        agent.calls,
        agent.good,
        agent.bad,
        agent.productKnowledge ?? "",
        agent.customerUnderstanding ?? "",
        agent.communicationSkills ?? "",
        agent.objectionHandling ?? "",
        agent.closingSkills ?? "",
        agent.toneVolume ?? "",
        agent.score.toFixed(2),
        agent.result,
        `"${agent.timeDelayHr || ""}"`,
        `"${agent.hrName || ""}"`,
        `"${agent.hrVerifyStatus || "Pending"}"`,
        `"${agent.hrActionForCalling || ""}"`,
        `"${agent.otherRemarks || ""}"`,
        agent.attendanceTrackerUpdated ? "Yes" : "No",
        agent.accountFmsUpdated ? "Yes" : "No",
      ])
    )

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `daily_sales_reports_log_fms_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Actual database records exported as CSV")
  }

  const activeFiltersCount = [
    employeeFilter !== "all",
    resultFilter !== "all",
    dateFilter !== "all",
    search !== "",
  ].filter(Boolean).length

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header Banner ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="w-full px-4 sm:px-6 lg:px-8 py-7 relative z-10">
          <div className="mb-4">
            <BackButton className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm" />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2 w-full lg:w-auto">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                      Sales Call Audit Report
                    </h1>
                    {/* <Badge className="bg-emerald-500/90 text-white border border-emerald-300/40 text-xs px-2.5 py-0.5 font-bold shadow-sm inline-flex items-center gap-1">
                      <Database className="h-3 w-3" /> Live DB ({dbRecords.length} records)
                    </Badge> */}
                  </div>
                  <p className="text-sm sm:text-base text-white/90 mt-1 font-medium">
                    Table: <code className="font-mono bg-white/15 px-1.5 py-0.5 rounded text-xs text-white">daily_sales_reports_log_fms</code> • Quality Assurance • HR Attendance Action
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing..." : "Refresh DB"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Link href="/sales-call-audit/email-template">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Template
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={downloadCSV}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <div className="hidden sm:flex flex-col items-end justify-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                <span className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">LAST SYNC</span>
                <span className="text-xs font-bold text-white font-mono">{lastUpdated || "Connecting..."}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Data Scope Notice ──────────────────────────────────────────────────── */}
      {/* `sales_call_audit.view` opens this page but grants no rows, so the empty
          table needs to say why rather than looking like a loading failure. */}
      {!loading && (accessError || scope === "none") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm px-4 sm:px-5 py-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-amber-900">No audit data available for your account</h2>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {accessError ||
                "You can open this page, but you have not been granted a data scope. Ask an administrator for “Sales Call Audit — Own Data” to see your own scorecard, or “All Data” to see the team."}
            </p>
          </div>
        </div>
      )}

      {!loading && scope === "self" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 shadow-sm px-4 sm:px-5 py-3 flex items-center gap-3">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            You are viewing your own audit records only. Team-wide figures require the “All Data” permission.
          </p>
        </div>
      )}

      {/* ─── Filters & Search ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30 flex-shrink-0">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">Filters & Search</h2>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 font-bold">
                    {activeFiltersCount} active
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">Refine audit records across agents, outcomes, and dates</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={resetFilters}
              className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 font-medium hover:bg-blue-50 px-4 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Clear Filters
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Search Keyword */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Search Agent / ID / Designation
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name, ID or title..."
                className="w-full h-10 pl-9 pr-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* 2. Audit Date Range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Audit Date
            </label>
            <select
              value={dateFilter}
              onChange={event => setDateFilter(event.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Dates ({auditDays.length} dates)</option>
              {auditDays.map(day => (
                <option key={day.date} value={day.date}>
                  {day.label} ({day.agents.length} records)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Sales Person */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sales Person
            </label>
            <select
              value={employeeFilter}
              onChange={event => setEmployeeFilter(event.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Sales Persons ({uniqueAgents.length})</option>
              {uniqueAgents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.id})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Audit Outcome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Audit Outcome
            </label>
            <select
              value={resultFilter}
              onChange={event => setResultFilter(event.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="Pass">Pass Only</option>
              <option value="Fail">Fail Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── KPI Summary Section ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40 flex-shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Key Performance Indicators</h2>
              <p className="text-[11px] text-slate-500">Live quality metrics, pass/fail evaluation & HR attendance actions</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === "table"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${viewMode === "analytics"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics View
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Row 1: Call Quality & Performance */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Call Volume & Quality Benchmarks (From Live DB)
              </h4>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-full">
                {filteredDays.length} Dates Audited
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Audited Calls */}
              <div className="bg-white border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Total Audited Calls</p>
                  <PhoneCall className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{totalAuditedCalls}</p>
                <div className="mt-1 text-[11px] text-slate-500">Across {allFilteredAgents.length} database logs</div>
              </div>

              {/* Average KPI Score */}
              <div className="bg-white border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Average Quality Score</p>
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{averageScore.toFixed(2)} <span className="text-sm font-normal text-slate-400">/ 5.0</span></p>
                <div className="mt-1 text-[11px] text-slate-500">Benchmark requirement: 3.00+</div>
              </div>

              {/* Passed Audits */}
              <div className="bg-white border-2 border-emerald-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Pass Rate</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 leading-tight">{passCount} <span className="text-sm font-normal text-slate-400">({passRate}%)</span></p>
                <div className="mt-1 text-[11px] text-slate-500">Qualified audit results</div>
              </div>

              {/* Total Audited Agents */}
              <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Good vs Bad Calls</p>
                  <Award className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">
                  <span className="text-emerald-600">{allFilteredAgents.reduce((s, a) => s + a.good, 0)}</span>
                  <span className="text-slate-400 font-normal mx-1">/</span>
                  <span className="text-rose-600">{allFilteredAgents.reduce((s, a) => s + a.bad, 0)}</span>
                </p>
                <div className="mt-1 text-[11px] text-slate-500">Good calls vs Bad calls tally</div>
              </div>
            </div>
          </div>

          {/* Row 2: Audit Actions & HR Compliance */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                HR Verification & Attendance Action Status
              </h4>
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-full">
                Attendance Compliance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Failed Audits */}
              <div className="bg-rose-50/70 border-2 border-rose-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Audit Failures</p>
                  <XCircle className="h-4 w-4 text-rose-600" />
                </div>
                <p className="text-2xl font-bold text-rose-600 leading-tight">{failCount} <span className="text-sm font-normal text-slate-400">({failRate}%)</span></p>
                <div className="mt-1 text-[11px] text-slate-500">Mandatory HR review required</div>
              </div>

              {/* Pending HR Actions */}
              <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Pending HR Actions</p>
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600 leading-tight">{pendingHrActions}</p>
                <div className="mt-1 text-[11px] text-slate-500">Awaiting attendance/leave decision</div>
              </div>

              {/* HR Actions Completed */}
              <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Actions Processed</p>
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 leading-tight">{hrActionsCompleted}</p>
                <div className="mt-1 text-[11px] text-slate-500">Verified & saved in database</div>
              </div>

              {/* Pagarbook / Attendance Sync */}
              <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Attendance / FMS Synced</p>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600 leading-tight">{attendanceSyncCount}</p>
                <div className="mt-1 text-[11px] text-slate-500">Half-day / Master tracker synced</div>
              </div>
            </div>
          </div>

          {/* Analytics View Charts */}
          {viewMode === "analytics" && (
            <div className="grid gap-4 lg:grid-cols-2 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Pass vs Fail Trend (Database Logs)</h3>
                    <p className="text-[11px] text-slate-500">Outcome distribution across dates</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Pass</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Fail</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData.length > 0 ? trendData : [{ date: "No Data", pass: 0, fail: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="passFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="failFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
                      <Area type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={2.5} fill="url(#passFill)" name="Pass" />
                      <Area type="monotone" dataKey="fail" stroke="#ef4444" strokeWidth={2.5} fill="url(#failFill)" name="Fail" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">Calls Audited by Agent</h3>
                  <p className="text-[11px] text-slate-500">Live call evaluation distribution</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={allFilteredAgents.map(a => ({ name: a.name.split(" ")[0], calls: a.calls, score: a.score }))}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Audited Calls" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Date-Wise Employee Performance Table ──────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Date-Wise Employee Call Audit Summary</h3>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto bg-white border-slate-200 text-slate-700">
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
            {filteredDays.length} Dates Available
          </Badge>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Fetching real audit records from database...</p>
          </div>
        ) : filteredDays.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ShieldAlert className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No sales call audit records found matching your filters.</p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 text-xs cursor-pointer">
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-[#1e3a5f]">
                <TableRow className="hover:bg-[#1e3a5f]">
                  <TableHead className="text-white font-semibold">Audit Date</TableHead>
                  <TableHead className="text-center text-white font-semibold">Total Calls</TableHead>
                  <TableHead className="text-center text-white font-semibold">Avg Score</TableHead>
                  <TableHead className="text-center text-white font-semibold">Pass</TableHead>
                  <TableHead className="text-center text-white font-semibold">Fail</TableHead>
                  <TableHead className="text-center text-white font-semibold">Fail Rate</TableHead>
                  <TableHead className="text-center text-white font-semibold">Good / Bad</TableHead>
                  <TableHead className="text-center text-white font-semibold">HR Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDays.map(day => {
                  const isOpen = expandedDates.has(day.date)
                  const pass = day.agents.filter(agent => agent.result === "Pass").length
                  const fail = day.agents.filter(agent => agent.result === "Fail").length
                  const calls = day.agents.reduce((sum, agent) => sum + agent.calls, 0)
                  const score = day.agents.length
                    ? day.agents.reduce((sum, agent) => sum + agent.score, 0) / day.agents.length
                    : 0
                  const goodTotal = day.agents.reduce((sum, agent) => sum + agent.good, 0)
                  const badTotal = day.agents.reduce((sum, agent) => sum + agent.bad, 0)
                  const actionDone = day.agents.filter(
                    agent => agent.hrVerifyStatus || agent.hrActionForCalling
                  ).length

                  return [
                    <TableRow
                      key={day.date}
                      onClick={() => toggleDate(day.date)}
                      className="cursor-pointer border-b border-blue-100 bg-blue-50/50 hover:bg-blue-100/60 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          <div>
                            <div className="font-bold text-slate-900">{day.label}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{day.agents.length} Audit Records</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-800">{calls}</TableCell>
                      <TableCell className="text-center font-bold text-indigo-700">{score.toFixed(2)} / 5</TableCell>
                      <TableCell className="text-center font-bold text-emerald-700">{pass}</TableCell>
                      <TableCell className="text-center font-bold text-rose-700">{fail}</TableCell>
                      <TableCell className="text-center font-medium">
                        <span className={fail > 0 ? "text-rose-600 font-bold" : "text-slate-600"}>
                          {day.agents.length ? ((fail / day.agents.length) * 100).toFixed(1) : "0.0"}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <span className="text-emerald-700">{goodTotal}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-rose-700">{badTotal}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            actionDone === fail && fail > 0
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-bold"
                              : "border-slate-300 bg-white text-slate-700 font-medium"
                          }
                        >
                          {actionDone} / {day.agents.length}
                        </Badge>
                      </TableCell>
                    </TableRow>,
                    isOpen && (
                      <TableRow key={`${day.date}-agents`} className="hover:bg-transparent">
                        <TableCell colSpan={8} className="bg-slate-50/50 p-3 sm:p-4">
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                            <Table className="min-w-[1100px]">
                              <TableHeader className="bg-slate-800">
                                <TableRow className="hover:bg-slate-800">
                                  <TableHead className="text-white font-semibold">Sales Person</TableHead>
                                  <TableHead className="text-white font-semibold">Designation</TableHead>
                                  <TableHead className="text-center text-white font-semibold">Calls</TableHead>
                                  <TableHead className="text-center text-white font-semibold">Good / Bad</TableHead>
                                  <TableHead className="text-center text-white font-semibold">Avg Score</TableHead>
                                  <TableHead className="text-center text-white font-semibold">Outcome</TableHead>
                                  <TableHead className="text-white font-semibold">HR Action Status</TableHead>
                                  <TableHead className="text-white font-semibold">Delay (HR)</TableHead>
                                  {canWrite && <TableHead className="text-right text-white font-semibold">Action</TableHead>}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {day.agents.map(agent => {
                                  const hasAction = Boolean(agent.hrVerifyStatus || agent.hrActionForCalling)
                                  const isSelected =
                                    selectedAgent?.date === day.date && selectedAgent.agent.recordId === agent.recordId

                                  return (
                                    <TableRow
                                      key={agent.recordId}
                                      onClick={() => setSelectedAgent({ date: day.date, agent })}
                                      className={`cursor-pointer transition-colors ${isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                                        }`}
                                    >
                                      <TableCell>
                                        <div className="flex items-center gap-3">
                                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                            {agent.initials}
                                          </span>
                                          <div>
                                            <div className="font-bold text-slate-900">{agent.name}</div>
                                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                                              <span>{agent.id}</span>
                                              <span className="text-slate-300">•</span>
                                              <span className="text-[10px] text-slate-400">{agent.mid}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-[11px]">
                                          {agent.designation}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-center font-semibold text-slate-800">
                                        <button
                                          type="button"
                                          onClick={event => {
                                            event.stopPropagation()
                                            setCallDetailModal({ open: true, type: "all", agent, date: day.date })
                                          }}
                                          className="hover:underline hover:text-blue-700 transition cursor-pointer"
                                          title="Click to view full call audit details"
                                        >
                                          {agent.calls}
                                        </button>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <button
                                          type="button"
                                          onClick={event => {
                                            event.stopPropagation()
                                            setCallDetailModal({ open: true, type: "good", agent, date: day.date })
                                          }}
                                          className="inline-flex items-center text-emerald-700 font-bold hover:bg-emerald-100 hover:text-emerald-900 px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-xs"
                                          title="Click to view Good Calls details"
                                        >
                                          {agent.good}
                                        </button>
                                        <span className="text-slate-400 mx-1">/</span>
                                        <button
                                          type="button"
                                          onClick={event => {
                                            event.stopPropagation()
                                            setCallDetailModal({ open: true, type: "bad", agent, date: day.date })
                                          }}
                                          className="inline-flex items-center text-rose-700 font-bold hover:bg-rose-100 hover:text-rose-900 px-1.5 py-0.5 rounded cursor-pointer transition-colors shadow-xs"
                                          title="Click to view Bad Calls details"
                                        >
                                          {agent.bad}
                                        </button>
                                      </TableCell>
                                      <TableCell className="text-center font-bold text-indigo-700">
                                        {agent.score.toFixed(2)} / 5
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <ResultBadge result={agent.result} />
                                      </TableCell>
                                      <TableCell>
                                        {hasAction ? (
                                          <div>
                                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                              <CheckCircle2 className="mr-1 h-3 w-3" />
                                              {agent.hrVerifyStatus || "Verified"}
                                            </Badge>
                                            <div className="mt-0.5 text-[11px] text-slate-600 font-medium truncate max-w-[200px]">
                                              {agent.hrActionForCalling}
                                            </div>
                                            {agent.accountFmsUpdated && (
                                              <div className="text-[10px] font-bold text-emerald-700">
                                                ✓ Pagarbook / FMS Synced
                                              </div>
                                            )}
                                          </div>
                                        ) : agent.result === "Fail" ? (
                                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 font-bold">
                                            Action Pending
                                          </Badge>
                                        ) : (
                                          <span className="text-xs text-slate-400">No action needed</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-xs font-mono text-slate-600">
                                        {agent.timeDelayHr ? (
                                          <span className="inline-flex items-center gap-1 text-slate-700">
                                            <Clock className="h-3 w-3 text-slate-400" />
                                            {agent.timeDelayHr}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                      {canWrite && (
                                        <TableCell className="text-right">
                                          <Button
                                            size="sm"
                                            onClick={event => {
                                              event.stopPropagation()
                                              openAction(day.date, agent)
                                            }}
                                            className={
                                              hasAction
                                                ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs h-8 cursor-pointer shadow-sm font-semibold"
                                                : "bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 cursor-pointer shadow-sm font-bold"
                                            }
                                          >
                                            {hasAction ? (
                                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                                            )}
                                            {hasAction ? "View Details" : "Take Action"}
                                          </Button>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    ),
                  ]
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredDays.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-medium text-slate-500">Dates per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm"
              >
                <option value={3}>3 dates</option>
                <option value={5}>5 dates</option>
                <option value={10}>10 dates</option>
                <option value={20}>20 dates</option>
                <option value={50}>50 dates</option>
              </select>
              <span className="text-slate-300 mx-1">|</span>
              <span>
                Showing <strong className="text-slate-800">{Math.min((currentPage - 1) * pageSize + 1, filteredDays.length)}</strong> to{" "}
                <strong className="text-slate-800">{Math.min(currentPage * pageSize, filteredDays.length)}</strong> of{" "}
                <strong className="text-slate-800">{filteredDays.length}</strong> dates ({allFilteredAgents.length} total records)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="h-8 px-2 text-xs border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1
                    )
                  })
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1]
                    const showEllipsis = prevPage && page - prevPage > 1

                    return (
                      <Fragment key={page}>
                        {showEllipsis && <span className="text-xs text-slate-400 px-1">...</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 p-0 text-xs font-bold cursor-pointer ${currentPage === page
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                          {page}
                        </Button>
                      </Fragment>
                    )
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 px-2 text-xs border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Detailed Parameter Breakdown Drawer (When Agent Selected) ─────────── */}
      {selectedAgent && (
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                {selectedAgent.agent.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedAgent.agent.name}
                  </h3>
                  <Badge variant="outline" className="text-[11px] border-blue-200 bg-blue-50 text-blue-700 font-semibold">
                    {selectedAgent.agent.designation}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Audit Date: <strong>{selectedAgent.date}</strong> • Emp ID: <strong>{selectedAgent.agent.id}</strong> • MID: <code className="font-mono text-[11px]">{selectedAgent.agent.mid}</code> • Evaluator: <strong>{selectedAgent.agent.hrName || "Dhaneshwar Chaturvedi"}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canWrite && (
                <Button
                  size="sm"
                  onClick={() => openAction(selectedAgent.date, selectedAgent.agent)}
                  className={
                    selectedAgent.agent.hrVerifyStatus || selectedAgent.agent.hrActionForCalling
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs shadow-sm font-semibold cursor-pointer"
                      : "bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  }
                >
                  {selectedAgent.agent.hrVerifyStatus || selectedAgent.agent.hrActionForCalling ? (
                    <>
                      <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
                      View HR Action
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="mr-1.5 h-4 w-4" />
                      HR Action Form
                    </>
                  )}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedAgent(null)}
                className="text-xs border-slate-200 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>

          {/* 6 Audit Quality Parameter Cards from database */}
          <div className="p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              6 Core Evaluation Metrics (Database Scores)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Parameter 1: Product Knowledge */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Product Knowledge</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.productKnowledge !== null ? selectedAgent.agent.productKnowledge.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: product_knowledge</div>
              </div>

              {/* Parameter 2: Customer Understanding */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Customer Understanding</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.customerUnderstanding !== null ? selectedAgent.agent.customerUnderstanding.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: customer_understanding</div>
              </div>

              {/* Parameter 3: Communication Skills */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Communication Skills</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.communicationSkills !== null ? selectedAgent.agent.communicationSkills.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: communication_skills</div>
              </div>

              {/* Parameter 4: Objection Handling */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Objection Handling</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.objectionHandling !== null ? selectedAgent.agent.objectionHandling.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: objection_handling</div>
              </div>

              {/* Parameter 5: Closing Skills */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Closing Skills</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.closingSkills !== null ? selectedAgent.agent.closingSkills.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: closing_skills</div>
              </div>

              {/* Parameter 6: Tone & Volume */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Tone & Volume</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {selectedAgent.agent.toneVolume !== null ? selectedAgent.agent.toneVolume.toFixed(2) : "—"}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-mono">Column: tone_volume</div>
              </div>
            </div>

            {/* Current HR Action Record in Database */}
            {selectedAgent.agent.hrVerifyStatus && (
              <div className="grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs sm:grid-cols-2 lg:grid-cols-5 mt-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">HR Verify Status</span>
                  <div className="mt-0.5 font-bold text-slate-900">{selectedAgent.agent.hrVerifyStatus}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Calling Action</span>
                  <div className="mt-0.5 font-bold text-slate-900">{selectedAgent.agent.hrActionForCalling || "—"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Attendance Tracker</span>
                  <div className="mt-0.5 font-bold text-slate-900">{selectedAgent.agent.attendanceTrackerUpdated ? "✓ Updated" : "No"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Pagarbook / FMS</span>
                  <div className="mt-0.5 font-bold text-slate-900">{selectedAgent.agent.accountFmsUpdated ? "✓ Updated" : "No"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Remarks</span>
                  <div className="mt-0.5 font-medium text-slate-700">{selectedAgent.agent.otherRemarks || "No remarks"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Monthly Aggregate Summary ────────────────────────────────────────── 
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Call Audit & Performance Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Aggregated audit totals and fail rate history for {selectedYear}</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={event => setSelectedYear(Number(event.target.value))}
              className="h-8 px-2.5 rounded-md border border-slate-300 text-xs font-semibold bg-white text-slate-700 cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Month</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Total Calls</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Audited</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Pass</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Fail</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Fail Rate</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Email Updates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyRows.map(row => (
                <TableRow key={row.month} className="hover:bg-slate-50">
                  <TableCell className="font-semibold text-slate-900">{row.month} {selectedYear}</TableCell>
                  <TableCell className="text-center text-slate-700">{row.calls.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-semibold text-slate-800">{row.audited}</TableCell>
                  <TableCell className="text-center font-semibold text-emerald-700">{row.pass}</TableCell>
                  <TableCell className="text-center font-semibold text-rose-700">{row.fail}</TableCell>
                  <TableCell className="text-center font-bold">
                    {row.audited > 0 ? (
                      <span className={row.failRate > 30 ? "text-rose-600" : "text-slate-700"}>
                        {row.failRate.toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center text-slate-700">{row.emailSent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      

      {/* ─── HR Action Modal (Persisted to Database) ────────────────────────────── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-h-[88vh] sm:max-w-2xl p-0 gap-0 rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden bg-white">
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-lg font-bold text-white leading-tight">
                      HR Calling Audit Action
                    </DialogTitle>
                    {isReadOnly && (
                      <Badge className="bg-emerald-500 text-white text-[10px] font-bold border border-emerald-300/40">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Recorded (Read Only)
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-blue-100 mt-0.5">
                    {isReadOnly
                      ? "Attendance verification recorded in database table daily_sales_reports_log_fms"
                      : "Save attendance verification directly to daily_sales_reports_log_fms"}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {actionTarget && (
              <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-white text-blue-700 font-bold flex items-center justify-center text-[10px]">
                    {actionTarget.agent.initials}
                  </span>
                  <span className="font-semibold text-white">{actionTarget.agent.name}</span>
                  <span className="text-white/70 font-mono text-[11px]">({actionTarget.agent.id})</span>
                  <span className="text-white/80 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{actionTarget.agent.designation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] text-white">
                    Date: <strong>{actionTarget.date}</strong>
                  </span>
                  <span className={actionTarget.agent.result === "Fail" ? "bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold" : "bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"}>
                    {actionTarget.agent.result.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs bg-white">
            {isReadOnly && (
              <div className="flex items-center gap-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/80 text-emerald-800 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">Verified & Recorded in Database:</span> This HR action has already been processed and is displayed in read-only mode.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: HR Verify Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    HR Verify Status {!isReadOnly && <span className="text-rose-500">*</span>}
                  </span>
                  {!isReadOnly && !verifyStatus && (
                    <span className="text-[10px] text-rose-500 font-normal">Required</span>
                  )}
                </Label>
                <Select
                  value={verifyStatus}
                  disabled={isReadOnly}
                  onValueChange={setVerifyStatus}
                >
                  <SelectTrigger className={`h-10 text-xs ${isReadOnly
                    ? "bg-slate-100/90 text-slate-900 font-semibold border-slate-200 cursor-not-allowed opacity-90"
                    : "border-slate-300 bg-white"
                    }`}>
                    <SelectValue placeholder="Select HR verify status" />
                  </SelectTrigger>
                  <SelectContent>
                    {withCurrentValue(HR_VERIFY_STATUS_OPTIONS, verifyStatus).map(option => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2: HR Action for Calling Fail/Pass */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    HR Action for Calling {!isReadOnly && <span className="text-rose-500">*</span>}
                  </span>
                  {!isReadOnly && !callingAction && (
                    <span className="text-[10px] text-rose-500 font-normal">Required</span>
                  )}
                </Label>
                <Select
                  value={callingAction}
                  disabled={isReadOnly}
                  onValueChange={setCallingAction}
                >
                  <SelectTrigger className={`h-10 text-xs ${isReadOnly
                    ? "bg-slate-100/90 text-slate-900 font-semibold border-slate-200 cursor-not-allowed opacity-90"
                    : "border-slate-300 bg-white"
                    }`}>
                    <SelectValue placeholder="Select HR action" />
                  </SelectTrigger>
                  <SelectContent>
                    {withCurrentValue(HR_CALLING_ACTION_OPTIONS, callingAction).map(option => (
                      <SelectItem key={option} value={option} className="text-xs">
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Other Remarks / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="other-remarks" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>
                  Other Remarks / Notes {!isReadOnly && <span className="text-rose-500">*</span>}
                </span>
                {!isReadOnly && !remarks.trim() && (
                  <span className="text-[10px] text-rose-500 font-normal">Required</span>
                )}
              </Label>
              <Textarea
                id="other-remarks"
                value={remarks}
                disabled={isReadOnly}
                readOnly={isReadOnly}
                onChange={event => setRemarks(event.target.value)}
                placeholder={isReadOnly ? "No remarks entered" : "Enter mandatory HR remarks, coaching advice, or verification notes..."}
                className={`text-xs min-h-[75px] resize-none ${isReadOnly
                  ? "bg-slate-100/90 text-slate-900 font-medium border-slate-200 cursor-not-allowed opacity-90"
                  : !remarks.trim()
                    ? "border-slate-300 bg-slate-50/50"
                    : "border-blue-400 bg-white shadow-sm"
                  }`}
              />
            </div>

            {/* Row 3: Attendance Adjustments & Master Tracker Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Attendance & Payroll Actions {!isReadOnly && <span className="text-rose-500">*</span>}
                </Label>
                {!isReadOnly && !halfDayLeave && !pagarbookUpdated && (
                  <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Select at least 1 action
                  </span>
                )}
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-3.5 transition-colors ${!isReadOnly && !halfDayLeave && !pagarbookUpdated
                  ? "border-amber-300 bg-amber-50/40"
                  : "border-slate-200 bg-slate-50/70"
                  }`}
              >
                {/* Checkbox 1: Updated in Master Attendance Tracker */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <Checkbox
                    id="half-day"
                    checked={halfDayLeave}
                    disabled={isReadOnly}
                    onCheckedChange={checked => setHalfDayLeave(checked === true)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:cursor-not-allowed"
                  />
                  <div>
                    <Label htmlFor="half-day" className={`font-bold text-xs text-slate-900 ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}>
                      Updated in Master Attendance Tracker
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {halfDayLeave ? "Status: Updated in Tracker (Yes)" : "Status: Not Updated"}
                    </p>
                  </div>
                </div>

                {/* Checkbox 2: Updated in Pagarbook */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <Checkbox
                    id="pagarbook"
                    checked={pagarbookUpdated}
                    disabled={isReadOnly}
                    onCheckedChange={checked => setPagarbookUpdated(checked === true)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:cursor-not-allowed"
                  />
                  <div>
                    <Label htmlFor="pagarbook" className={`font-bold text-xs text-slate-900 ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}>
                      Updated in Pagarbook
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {pagarbookUpdated ? "Status: Synced with Pagarbook / FMS (Yes)" : "Status: Not Synced"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {isReadOnly ? (
                <span className="text-[11px] text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  Recorded in database table daily_sales_reports_log_fms
                </span>
              ) : !isActionFormValid ? (
                <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  Fill all fields with * & select at least 1 checkbox
                </span>
              ) : (
                <span className="text-[11px] text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  Ready to save to database
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isReadOnly ? (
                <Button
                  size="sm"
                  onClick={() => setActionDialogOpen(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-5 shadow-sm font-semibold cursor-pointer"
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionDialogOpen(false)}
                    className="text-xs border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!isActionFormValid || savingAction}
                    onClick={saveAction}
                    className={
                      isActionFormValid && !savingAction
                        ? "bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md transition-all font-bold cursor-pointer"
                        : "bg-slate-300 text-slate-500 text-xs cursor-not-allowed opacity-60 font-semibold"
                    }
                  >
                    {savingAction ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1.5 h-4 w-4" />
                    )}
                    {savingAction ? "Saving to DB..." : "Save HR Action"}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Good / Bad Call Quality Breakdown Modal Dialog ──────────────────────── */}
      <Dialog
        open={Boolean(callDetailModal?.open)}
        onOpenChange={open => !open && setCallDetailModal(null)}
      >
        <DialogContent className="max-h-[92vh] sm:max-w-4xl p-0 gap-0 rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden bg-white">
          {callDetailModal && (
            <>
              {/* Header */}
              <div
                className={`flex-shrink-0 p-5 text-white ${callDetailModal.type === "good"
                  ? "bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800"
                  : callDetailModal.type === "bad"
                    ? "bg-gradient-to-r from-rose-600 via-rose-700 to-red-800"
                    : "bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-md flex-shrink-0">
                      {callDetailModal.type === "good" ? (
                        <ThumbsUp className="h-6 w-6" />
                      ) : callDetailModal.type === "bad" ? (
                        <ThumbsDown className="h-6 w-6" />
                      ) : (
                        <Headphones className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-lg font-bold text-white leading-tight">
                          {callDetailModal.type === "good"
                            ? "Good Quality Calls Breakdown & Logs"
                            : callDetailModal.type === "bad"
                              ? "Deficient Calls & Quality Audit Logs"
                              : "Complete Call Audit Breakdown & Logs"}
                        </DialogTitle>
                        <Badge
                          className={
                            callDetailModal.type === "good"
                              ? "bg-emerald-500/90 text-white text-[10px] font-bold border border-emerald-300/40"
                              : callDetailModal.type === "bad"
                                ? "bg-rose-500/90 text-white text-[10px] font-bold border border-rose-300/40"
                                : "bg-white/20 text-white text-[10px] font-bold border border-white/30"
                          }
                        >
                          {callDetailModal.type === "good"
                            ? `${callDetailModal.agent.good} Good Calls`
                            : callDetailModal.type === "bad"
                              ? `${callDetailModal.agent.bad} Bad Calls`
                              : `${callDetailModal.agent.calls} Total Calls`}
                        </Badge>
                      </div>
                      <DialogDescription className="text-xs text-white/80 mt-0.5">
                        Individual call evaluations for {callDetailModal.agent.name} on {callDetailModal.date}
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                {/* Sub-header meta bar */}
                <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-white text-slate-800 font-bold flex items-center justify-center text-[10px]">
                      {callDetailModal.agent.initials}
                    </span>
                    <span className="font-semibold text-white">{callDetailModal.agent.name}</span>
                    <span className="text-white/70 font-mono text-[11px]">({callDetailModal.agent.id})</span>
                    <span className="text-white/80 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">
                      {callDetailModal.agent.designation}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] text-white">
                      Avg Score: <strong>{callDetailModal.agent.score.toFixed(2)} / 5</strong>
                    </span>
                    <span
                      className={
                        callDetailModal.agent.result === "Pass"
                          ? "bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs"
                          : "bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs"
                      }
                    >
                      {callDetailModal.agent.result.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Overall 6 Metrics Banner (Outside and Above the Call List) */}
                <div className="mt-3.5 pt-3 border-t border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
                      <ListChecks className="h-3.5 w-3.5 text-white/90" />
                      <span>Employee Daily Overall 6 Metrics</span>
                      <span className="text-[10px] text-white/70 font-normal">(Aggregated Daily Audit)</span>
                    </div>
                    <span className="text-[10px] text-white/75 font-mono">
                      Target Benchmark: ≥ 2.5 / 5.0
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-slate-800">
                    {[
                      {
                        label: "Product Knowledge",
                        val: callDetailModal.agent.productKnowledge ?? modalAgentMeta?.overallMetrics?.productKnowledge,
                      },
                      {
                        label: "Customer Understanding",
                        val: callDetailModal.agent.customerUnderstanding ?? modalAgentMeta?.overallMetrics?.customerUnderstanding,
                      },
                      {
                        label: "Communication Skills",
                        val: callDetailModal.agent.communicationSkills ?? modalAgentMeta?.overallMetrics?.communicationSkills,
                      },
                      {
                        label: "Objection Handling",
                        val: callDetailModal.agent.objectionHandling ?? modalAgentMeta?.overallMetrics?.objectionHandling,
                      },
                      {
                        label: "Closing Skills",
                        val: callDetailModal.agent.closingSkills ?? modalAgentMeta?.overallMetrics?.closingSkills,
                      },
                      {
                        label: "Tone & Volume",
                        val: callDetailModal.agent.toneVolume ?? modalAgentMeta?.overallMetrics?.toneVolume,
                      },
                    ].map((m, mIdx) => {
                      const num = m.val !== null && m.val !== undefined && m.val !== "NA" ? Number(m.val) : null
                      return (
                        <div
                          key={mIdx}
                          className="bg-white/95 backdrop-blur-sm rounded-lg p-2 border border-white/40 shadow-xs flex flex-col justify-between"
                        >
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate block">
                            {m.label}
                          </span>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span
                              className={`text-xs font-black ${
                                num === null
                                  ? "text-slate-400"
                                  : num >= 3.5
                                    ? "text-emerald-700"
                                    : num >= 2.5
                                      ? "text-amber-700"
                                      : "text-rose-700"
                              }`}
                            >
                              {num !== null && !isNaN(num) ? `${num.toFixed(1)} / 5.0` : "N/A"}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setModalCallTab("all")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      modalCallTab === "all"
                        ? "bg-slate-800 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    All Calls ({modalCalls.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCallTab("good")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      modalCallTab === "good"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Good Calls ({callDetailModal.agent.good})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalCallTab("bad")}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      modalCallTab === "bad"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Bad Calls ({callDetailModal.agent.bad})
                  </button>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={modalCallSearch}
                    onChange={e => setModalCallSearch(e.target.value)}
                    placeholder="Search Lead ID, Call ID, findings..."
                    className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                  {modalCallSearch && (
                    <button
                      type="button"
                      onClick={() => setModalCallSearch("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: List of Detailed Calls */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs bg-slate-50">
                {modalCallsLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">Loading call recordings & audit evaluation logs...</p>
                  </div>
                ) : modalCalls.length === 0 ? (
                  <div className="py-16 text-center bg-white rounded-xl border border-slate-200 p-8">
                    <Headphones className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700 text-sm">No individual calls found for this date</p>
                    <p className="text-xs text-slate-400 mt-1">Audit metrics were aggregated for this reporting batch.</p>
                  </div>
                ) : (
                  (() => {
                    const filtered = modalCalls.filter(call => {
                      if (modalCallTab === "good" && call.qualityType !== "good") return false
                      if (modalCallTab === "bad" && call.qualityType !== "bad") return false
                      if (modalCallSearch.trim()) {
                        const q = modalCallSearch.toLowerCase()
                        const match =
                          (call.callId && call.callId.toLowerCase().includes(q)) ||
                          (call.leadId && call.leadId.toLowerCase().includes(q)) ||
                          (call.clientName && call.clientName.toLowerCase().includes(q)) ||
                          (call.statedOutcome && call.statedOutcome.toLowerCase().includes(q)) ||
                          (call.verifiedOutcome && call.verifiedOutcome.toLowerCase().includes(q)) ||
                          (call.auditorObservation && call.auditorObservation.toLowerCase().includes(q))
                        if (!match) return false
                      }
                      return true
                    })

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6">
                          <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-bold text-slate-700 text-xs">No calls match "{modalCallSearch}" in {modalCallTab} filter</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setModalCallSearch("")
                              setModalCallTab("all")
                            }}
                            className="mt-3 text-xs h-7 border-slate-300 cursor-pointer"
                          >
                            Reset filters
                          </Button>
                        </div>
                      )
                    }

                    return filtered.map((call, idx) => {
                      const isGood = call.qualityType === "good"
                      const isExpanded = expandedCallId === call.callId

                      return (
                        <div
                          key={call.callId || idx}
                          className={`bg-white rounded-xl border transition-all duration-200 shadow-xs hover:shadow-sm overflow-hidden ${
                            isGood
                              ? "border-emerald-200/80 hover:border-emerald-300"
                              : "border-rose-200/80 hover:border-rose-300"
                          }`}
                        >
                          {/* Call Card Header: Agent → Lead ID → Call ID → Date/Time */}
                          <div
                            className={`p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b ${
                              isGood ? "bg-emerald-50/40 border-emerald-100" : "bg-rose-50/40 border-rose-100"
                            }`}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs mt-0.5 sm:mt-0 ${
                                  isGood ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                                }`}
                              >
                                {isGood ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                              </div>
                              <div className="space-y-1">
                                {/* Flow line: Agent → Lead ID → Call ID */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <Badge
                                    className={`text-[10px] font-bold px-1.5 py-0.2 ${
                                      isGood
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : "bg-rose-100 text-rose-800 border-rose-300"
                                    }`}
                                  >
                                    {isGood ? "GOOD CALL" : "BAD CALL"}
                                  </Badge>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-[11px] text-slate-700 font-semibold">
                                    Agent: <strong className="text-slate-900">{callDetailModal.agent.name}</strong> ({callDetailModal.agent.id})
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                                  <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                    <span className="text-slate-400 font-normal text-[10px]">Lead ID:</span>
                                    <span className="text-blue-700">{call.leadId}</span>
                                  </span>
                                  <span className="text-slate-400 font-bold">→</span>
                                  <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {call.callId}
                                  </span>
                                  <span className="text-slate-400 font-bold">→</span>
                                  <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    {call.callTime} {call.callDuration && call.callDuration !== "—" ? `(${call.callDuration})` : ""}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Call Score & Toggle 6 Metrics Button */}
                            <div className="flex items-center gap-2.5 justify-end">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none mb-1">
                                  Call Score
                                </span>
                                <div
                                  className={`text-sm font-black ${
                                    isGood ? "text-emerald-700" : "text-rose-700"
                                  }`}
                                >
                                  {call.avgScore !== undefined && call.avgScore !== null ? Number(call.avgScore).toFixed(2) : "—"} / 5.0
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedCallId(isExpanded ? null : call.callId)}
                                className={`h-7 px-2.5 text-[11px] font-semibold border transition-all cursor-pointer ${
                                  isExpanded
                                    ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-900"
                                    : "border-slate-200 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isExpanded ? "Hide Metrics" : "6 Metrics"}
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Call Card Body */}
                          <div className="p-3.5 space-y-3">
                            {/* Call Recording Bar (Playable Audio + External Link) */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                                  <Volume2 className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                  Call Recording:
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1 justify-start sm:justify-end">
                                {call.recordingUrl ? (
                                  <>
                                    <audio
                                      controls
                                      preload="none"
                                      src={getAudioStreamUrl(call.recordingUrl)}
                                      className="h-8 w-full sm:w-72 rounded text-xs bg-white border border-slate-200 shadow-2xs"
                                    />
                                    <a
                                      href={call.recordingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs cursor-pointer flex-shrink-0"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      <span>Open Audio</span>
                                    </a>
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    No recording audio available for this call
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 6 Call-Specific Metrics Breakdown */}
                            {isExpanded && (
                              <div className="border border-blue-200/80 bg-blue-50/40 p-3 rounded-lg space-y-2 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                  <span className="flex items-center gap-1.5 text-blue-900">
                                    <ListChecks className="h-3.5 w-3.5 text-blue-600" />
                                    <span>6 Call-Specific Metrics Evaluation</span>
                                    <span className="text-[10px] text-slate-500 font-normal">
                                      (Strictly for {call.callId} • Lead: {call.leadId})
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">Scores out of 5.0</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                                  {[
                                    { label: "Product Knowledge", val: call.productKnowledge },
                                    { label: "Customer Understanding", val: call.customerUnderstanding },
                                    { label: "Communication Skills", val: call.communicationSkills },
                                    { label: "Objection Handling", val: call.objectionHandling },
                                    { label: "Closing Skills", val: call.closingSkills },
                                    { label: "Tone & Volume", val: call.toneVolume },
                                  ].map((p, pIdx) => {
                                    const isNA = p.val === "NA" || p.val === null || p.val === undefined
                                    const num = !isNA ? Number(p.val) : null
                                    return (
                                      <div
                                        key={pIdx}
                                        className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between"
                                      >
                                        <span className="text-[9px] font-semibold text-slate-500 uppercase block truncate">
                                          {p.label}
                                        </span>
                                        <span
                                          className={`font-black text-xs mt-1 ${
                                            isNA
                                              ? "text-slate-400"
                                              : (num ?? 0) >= 3.5
                                                ? "text-emerald-700"
                                                : (num ?? 0) >= 2.5
                                                  ? "text-amber-700"
                                                  : "text-rose-700"
                                          }`}
                                        >
                                          {isNA ? "N/A" : `${(num ?? 0).toFixed(1)} / 5.0`}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Stated vs Verified Outcomes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400">Agent Stated Outcome:</span>
                                <p className="font-semibold text-slate-800 mt-0.5">{call.statedOutcome || "—"}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400">Auditor Evaluation:</span>
                                <p
                                  className={`font-semibold mt-0.5 ${
                                    isGood ? "text-emerald-700" : "text-rose-700 font-bold"
                                  }`}
                                >
                                  {call.verifiedOutcome || "—"}
                                </p>
                              </div>
                            </div>

                            {/* Auditor Observation / Finding */}
                            {call.auditorObservation && (
                              <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                <span className="font-bold text-slate-900 block mb-0.5">Auditor Quality Finding:</span>
                                <p className="text-slate-600 leading-relaxed">{call.auditorObservation}</p>
                              </div>
                            )}

                            {/* Strengths & Deficiencies Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {call.strengths &&
                                call.strengths.map((str: string, sIdx: number) => (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {str}
                                  </span>
                                ))}
                              {call.deficiencies &&
                                call.deficiencies.map((def: string, dIdx: number) => (
                                  <span
                                    key={dIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    <AlertCircle className="h-3 w-3 text-rose-600" />
                                    {def}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  })()
                )}
              </div>

              {/* Footer */}
              <DialogFooter className="flex-shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Agent ID: {callDetailModal.agent.id} • Date: {callDetailModal.date}
                </span>
                <Button
                  size="sm"
                  onClick={() => setCallDetailModal(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-5 shadow-sm font-semibold cursor-pointer"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
