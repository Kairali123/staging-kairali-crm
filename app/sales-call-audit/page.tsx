"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AuditedCallDetail } from "@/app/api/sales-call-audit/calls/route"
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
  ExternalLink,
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
  Trophy,
  Medal,
  UserCheck,
  Volume2,
  X,
  XCircle,
  Award,
  Zap,
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
  neutral: number | null
  not_rated: number | null
  overall_performance: string | null
  planned_hr: string | null
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
  // Needs Improvement + Bad (live pilot daily report)
  bad: number
  neutral: number
  notRated: number
  overallPerformance: string
  result: AuditResult
  disposition: string
  emailStatus: EmailStatus
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
  isMailSent: boolean
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Live pilot rule (dailyOverallPerformance_): Good when Good calls outnumber Bad
// (Bad includes Needs Improvement); with nothing rated, Neutral if any, else Not Rated.
function overallOf(good: number, bad: number, neutral: number): string {
  if (good + bad === 0) return neutral > 0 ? "Neutral" : "Not Rated"
  return good > bad ? "Good" : "Bad"
}

// Good ÷ (Good + Bad) as a percentage; Neutral and Not Rated calls are not rated.
function goodRateOf(good: number, bad: number): number | null {
  return good + bad > 0 ? Math.round((good / (good + bad)) * 100) : null
}

type CallGroupKey = "good" | "bad" | "neutral" | "not_rated"

// Popup tabs / table counts. "bad" = Needs Improvement + Bad, matching bad_calls.
const CALL_GROUPS: { key: CallGroupKey; label: string; countKey: "good" | "bad" | "neutral" | "notRated"; text: string }[] = [
  { key: "good", label: "Good", countKey: "good", text: "text-emerald-700" },
  { key: "bad", label: "Bad", countKey: "bad", text: "text-rose-600" },
  { key: "neutral", label: "Neutral", countKey: "neutral", text: "text-sky-700" },
  { key: "not_rated", label: "Not Rated", countKey: "notRated", text: "text-slate-600" },
]

const OVERALL_BADGE: Record<string, string> = {
  Good: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Bad: "bg-rose-100 text-rose-800 border-rose-300",
  Neutral: "bg-sky-100 text-sky-800 border-sky-300",
  "Not Rated": "bg-slate-100 text-slate-700 border-slate-300",
  "Needs Improvement": "bg-amber-100 text-amber-800 border-amber-300",
}

const HR_VERIFY_STATUS_OPTIONS = [
  "Half Day – Call Audit FAIL",
]

const HR_ACTION_OPTIONS = [
  "Half day leave Updated on Pagarbook",
]

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
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-semibold text-[11px] py-0 px-2 shadow-none">
      <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
      PASS
    </Badge>
  ) : (
    <Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 font-semibold text-[11px] py-0 px-2 shadow-none">
      <XCircle className="mr-1 h-3 w-3 text-rose-600" />
      FAIL
    </Badge>
  )
}

function EmailBadge({ status }: { status: EmailStatus }) {
  return status === "Sent" ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-semibold px-2 py-0 text-[11px] inline-flex items-center gap-1 shadow-none">
      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
      Mail Sent
    </Badge>
  ) : (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-500 text-[11px] inline-flex items-center gap-1 font-normal py-0 px-2 shadow-none">
      <CircleAlert className="h-3 w-3 text-slate-400" />
      Not Sent
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
  const [sentDates, setSentDates] = useState<string[]>([])

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

  // Manual mail status toggle state
  const [togglingDate, setTogglingDate] = useState<string | null>(null)

  const handleToggleMailStatus = async (dateStr: string, currentIsSent: boolean) => {
    try {
      setTogglingDate(dateStr)
      const nextStatus = currentIsSent ? "Pending" : "Sent"
      const res = await fetch("/api/sales-call-audit/toggle-mail-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, status: nextStatus }),
      })
      const json = await res.json()
      if (json.success) {
        if (Array.isArray(json.sentDates)) {
          setSentDates(json.sentDates)
        }
        toast.success(
          nextStatus === "Sent"
            ? `Marked report for ${dateStr} as Mail Sent!`
            : `Marked report for ${dateStr} as Pending.`
        )
      } else {
        toast.error(json.error || "Failed to update mail status")
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update mail status")
    } finally {
      setTogglingDate(null)
    }
  }

  // Call detail popup — calls from sales_call_audit_live_pilot_calls for one daily record.
  // Counts come from the daily record itself so they always match the table.
  const [callDetailModal, setCallDetailModal] = useState<{
    open: boolean
    type: "all" | CallGroupKey
    agent: AgentAudit
    date: string
  } | null>(null)
  const [modalCalls, setModalCalls] = useState<AuditedCallDetail[]>([])
  const [modalCallsLoading, setModalCallsLoading] = useState(false)
  const [modalCallTab, setModalCallTab] = useState<"all" | CallGroupKey>("all")
  const [modalCallSearch, setModalCallSearch] = useState("")

  useEffect(() => {
    if (!callDetailModal?.open || !callDetailModal.agent) {
      setModalCalls([])
      return
    }
    setModalCallTab(callDetailModal.type)
    setModalCallSearch("")

    const fetchModalCalls = async () => {
      try {
        setModalCallsLoading(true)
        const params = new URLSearchParams({ record_id: String(callDetailModal.agent.recordId) })
        const res = await fetch(`/api/sales-call-audit/calls?${params.toString()}`)
        const json = await res.json().catch(() => null)
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setModalCalls(json.data)
        } else {
          setModalCalls([])
          toast.error(json?.error || "Failed to load call details")
        }
      } catch (e) {
        console.error("Failed to load call details", e)
        setModalCalls([])
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
        if (Array.isArray(json.sentDates)) {
          setSentDates(json.sentDates)
        }
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
        neutral: row.neutral || 0,
        notRated: row.not_rated || 0,
        overallPerformance: row.overall_performance || overallOf(row.good_calls || 0, row.bad_calls || 0, row.neutral || 0),
        result: isPass ? "Pass" : "Fail",
        disposition: isPass ? "Follow-up / Converted" : "Callback / Not Interested",
        emailStatus: (() => {
          const s = String(row.hr_level_whatsapp_update_status_to_sales || "").trim().toLowerCase()
          return s === "sent" || s === "success" || s === "delivered" ? "Sent" : "Not Sent"
        })(),
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

    const result: AuditDay[] = Object.keys(groups).map(dateKey => {
      const dayAgents = groups[dateKey].agents
      const firstRawDate = dayAgents[0]?.rawDate ? dayAgents[0].rawDate.slice(0, 10) : ""
      const isDateInSentList = sentDates.some(sd => {
        if (!sd) return false
        const sdNorm = sd.trim().toLowerCase()
        const parts = dateKey.split("-")
        const ymdFromKey = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : ""
        return sdNorm === dateKey.toLowerCase() || sdNorm === ymdFromKey || (firstRawDate && sdNorm === firstRawDate)
      })
      const isMailSent = isDateInSentList || (dayAgents.length > 0 && dayAgents.some(a => a.emailStatus === "Sent"))

      if (isMailSent) {
        dayAgents.forEach(a => {
          a.emailStatus = "Sent"
        })
      }

      return {
        date: dateKey,
        label: groups[dateKey].label,
        agents: dayAgents,
        isMailSent,
      }
    })

    return result
  }, [dbRecords, sentDates])

  // Automatically expand only the first (latest) date on initial load
  const hasInitializedDateRef = useRef(false)
  useEffect(() => {
    if (!hasInitializedDateRef.current && auditDays.length > 0) {
      setExpandedDates(new Set([auditDays[0].date]))
      hasInitializedDateRef.current = true
    }
  }, [auditDays])

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

  // Aggregate KPIs calculated from live DB data
  const allFilteredAgents = filteredDays.flatMap(day => day.agents)
  const totalAuditedCalls = allFilteredAgents.reduce((sum, agent) => sum + agent.calls, 0)
  const passCount = allFilteredAgents.filter(agent => agent.result === "Pass").length
  const failCount = allFilteredAgents.filter(agent => agent.result === "Fail").length
  const passRate = allFilteredAgents.length ? Math.round((passCount / allFilteredAgents.length) * 100) : 0
  const failRate = allFilteredAgents.length ? Math.round((failCount / allFilteredAgents.length) * 100) : 0
  const teamGoodRate = goodRateOf(
    allFilteredAgents.reduce((sum, agent) => sum + agent.good, 0),
    allFilteredAgents.reduce((sum, agent) => sum + agent.bad, 0)
  )

  const hrActionsCompleted = allFilteredAgents.filter(
    agent => agent.hrVerifyStatus || agent.hrActionForCalling || agent.otherRemarks
  ).length
  const pendingHrActions = Math.max(0, failCount - hrActionsCompleted)
  const attendanceSyncCount = allFilteredAgents.filter(agent => agent.attendanceTrackerUpdated || agent.accountFmsUpdated).length

  // Sales Agents Ranking Leaderboard based on good-call rate & overall performance
  const agentLeaderboard = useMemo(() => {
    const map = new Map<string, {
      id: string
      name: string
      designation: string
      initials: string
      totalRecords: number
      totalCalls: number
      goodCalls: number
      badCalls: number
      neutralCalls: number
      passCount: number
      failCount: number
    }>()

    allFilteredAgents.forEach(agent => {
      const key = agent.id || agent.name
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          id: agent.id,
          name: agent.name,
          designation: agent.designation,
          initials: agent.initials,
          totalRecords: 1,
          totalCalls: agent.calls,
          goodCalls: agent.good,
          badCalls: agent.bad,
          neutralCalls: agent.neutral,
          passCount: agent.result === "Pass" ? 1 : 0,
          failCount: agent.result === "Fail" ? 1 : 0,
        })
      } else {
        existing.totalRecords += 1
        existing.totalCalls += agent.calls
        existing.goodCalls += agent.good
        existing.badCalls += agent.bad
        existing.neutralCalls += agent.neutral
        if (agent.result === "Pass") existing.passCount += 1
        if (agent.result === "Fail") existing.failCount += 1
      }
    })

    const list = Array.from(map.values()).map(item => {
      const goodRate = goodRateOf(item.goodCalls, item.badCalls)
      const overall = overallOf(item.goodCalls, item.badCalls, item.neutralCalls)

      return {
        id: item.id,
        name: item.name,
        designation: item.designation,
        initials: item.initials,
        goodRate,
        overall,
        totalCalls: item.totalCalls,
        goodCalls: item.goodCalls,
        badCalls: item.badCalls,
        passCount: item.passCount,
        failCount: item.failCount,
        totalRecords: item.totalRecords,
      }
    })

    // Sort by good-call rate (unrated agents last), then Good overall, then calls
    list.sort((a, b) => {
      if ((b.goodRate ?? -1) !== (a.goodRate ?? -1)) return (b.goodRate ?? -1) - (a.goodRate ?? -1)
      if (a.overall !== b.overall) return a.overall === "Good" ? -1 : b.overall === "Good" ? 1 : 0
      return b.totalCalls - a.totalCalls
    })

    return list.map((agent, index) => ({
      rank: index + 1,
      ...agent,
    }))
  }, [allFilteredAgents])

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

  // Manual accordion toggle: expand or collapse dates on user click
  const toggleDate = (date: string) => {
    setExpandedDates(previous => {
      const next = new Set(previous)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
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
          neutral: actionTarget.agent.neutral,
          not_rated: actionTarget.agent.notRated,
          overall_performance: actionTarget.agent.overallPerformance,
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
      "Bad Calls (incl. Needs Improvement)",
      "Neutral",
      "Not Rated",
      "Overall Performance",
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
        agent.neutral,
        agent.notRated,
        `"${agent.overallPerformance}"`,
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

              {/* Good-call rate */}
              <div className="bg-white border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Good-Call Rate</p>
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{teamGoodRate === null ? "—" : `${teamGoodRate}%`}</p>
                <div className="mt-1 text-[11px] text-slate-500">Good ÷ (Good + Bad); Neutral &amp; Not Rated excluded</div>
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

          {/* Row 3: Sales Agents Quality Audit Ranking & Performance Leaderboard */}
          <div className="bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    Sales Agents Quality Ranking Leaderboard
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ranked by good-call rate (Good ÷ Good + Bad), then overall performance and audited calls
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs">
                  {agentLeaderboard.length} Sales Agents
                </span>
              </div>
            </div>

            {agentLeaderboard.length === 0 ? (
              <div className="py-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-slate-500">
                No sales agents found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs max-h-96 overflow-y-auto">
                <Table className="min-w-[640px]">
                  <TableHeader className="bg-slate-100/90 sticky top-0 z-10">
                    <TableRow className="hover:bg-slate-100/90 border-b border-slate-200 text-[11px]">
                      <TableHead className="w-16 font-bold text-slate-700 text-center py-2.5">Rank</TableHead>
                      <TableHead className="font-bold text-slate-700 py-2.5">Sales Agent</TableHead>
                      <TableHead className="w-28 font-bold text-slate-700 text-center py-2.5">Overall</TableHead>
                      <TableHead className="w-36 font-bold text-slate-700 text-center py-2.5">Good-Call Rate</TableHead>
                      <TableHead className="w-40 font-bold text-slate-700 text-center py-2.5">Audited Calls</TableHead>
                      <TableHead className="w-32 font-bold text-slate-700 text-center py-2.5">Audited Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agentLeaderboard.map(agent => {
                      const isGood = agent.overall === "Good"
                      const isTop1 = agent.rank === 1
                      const isTop2 = agent.rank === 2
                      const isTop3 = agent.rank === 3

                      return (
                        <TableRow
                          key={agent.id}
                          className="hover:bg-blue-50/40 transition-colors border-b border-slate-100 text-xs"
                        >
                          {/* Rank */}
                          <TableCell className="text-center font-bold py-2.5">
                            {isTop1 ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[11px] shadow-2xs">
                                🥇 #1
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-extrabold text-[11px] shadow-2xs">
                                🥈 #2
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[11px] shadow-2xs">
                                🥉 #3
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-xs">
                                #{agent.rank}
                              </span>
                            )}
                          </TableCell>

                          {/* Agent Name */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="h-7 w-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0 border border-blue-200">
                                {agent.initials}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-xs truncate">{agent.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                  <span>{agent.id}</span>
                                  {agent.designation && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[140px] text-slate-600 font-sans">{agent.designation}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Overall (live pilot majority rule over the period) */}
                          <TableCell className="text-center py-2.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs border ${OVERALL_BADGE[agent.overall] || OVERALL_BADGE["Not Rated"]}`}>
                              {agent.overall.toUpperCase()}
                            </span>
                          </TableCell>

                          {/* Good-call rate */}
                          <TableCell className="text-center py-2.5">
                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-xs font-extrabold ${isGood ? "text-emerald-700" : "text-rose-600"}`}>
                                {agent.goodRate === null ? "—" : `${agent.goodRate}%`}
                              </span>
                              <div className="w-20 bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${isGood ? "bg-emerald-500" : "bg-rose-500"}`}
                                  style={{ width: `${agent.goodRate ?? 0}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* Audited Calls */}
                          <TableCell className="text-center py-2.5">
                            <span className="font-semibold text-slate-800 text-xs">{agent.totalCalls}</span>
                            <div className="text-[10px] font-medium text-slate-500 mt-0.5">
                              <span className="text-emerald-700 font-semibold">{agent.goodCalls} Good</span>
                              <span className="mx-1 text-slate-300">/</span>
                              <span className="text-rose-700 font-semibold">{agent.badCalls} Bad</span>
                            </div>
                          </TableCell>

                          {/* Records */}
                          <TableCell className="text-center py-2.5 text-slate-600 text-xs">
                            <span className="font-medium">{agent.totalRecords} {agent.totalRecords === 1 ? "Day" : "Days"}</span>
                            <div className="text-[10px] text-slate-400">
                              {agent.passCount}P • {agent.failCount}F
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
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
                      data={allFilteredAgents.map(a => ({ name: a.name.split(" ")[0], calls: a.calls }))}
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
                <TableRow className="hover:bg-[#1e3a5f] border-b-0">
                  <TableHead className="text-white font-semibold pl-6 pr-3 text-left">Sales Person</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-left">Designation</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-right">Calls</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-center" title="Bad includes Needs Improvement">Good / Bad / Neutral / Not Rated</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-center">Overall</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-center">Outcome</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-left">HR Action Status</TableHead>
                  <TableHead className="text-white font-semibold px-3 text-left">Delay (HR)</TableHead>
                  {canWrite && <TableHead className="text-white font-semibold pr-4 pl-3 text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDays.map(day => {
                  const isOpen = expandedDates.has(day.date)
                  const pass = day.agents.filter(agent => agent.result === "Pass").length
                  const fail = day.agents.filter(agent => agent.result === "Fail").length
                  const calls = day.agents.reduce((sum, agent) => sum + agent.calls, 0)
                  const goodTotal = day.agents.reduce((sum, agent) => sum + agent.good, 0)
                  const badTotal = day.agents.reduce((sum, agent) => sum + agent.bad, 0)
                  const neutralTotal = day.agents.reduce((sum, agent) => sum + agent.neutral, 0)
                  const notRatedTotal = day.agents.reduce((sum, agent) => sum + agent.notRated, 0)
                  const dayGoodRate = goodRateOf(goodTotal, badTotal)
                  const actionDone = day.agents.filter(
                    agent => agent.hrVerifyStatus || agent.hrActionForCalling
                  ).length
                  const totalCols = canWrite ? 9 : 8

                  return (
                    <Fragment key={day.date}>
                      {/* Date Row (Parent) - Styled matching /leads/assign Data Source Breakdown */}
                      <TableRow
                        onClick={() => toggleDate(day.date)}
                        className="cursor-pointer font-semibold border-b-2 border-slate-300 hover:opacity-95 transition-all select-none"
                        style={{ backgroundColor: isOpen ? "#BFDBFF" : "#f1f5f9" }}
                      >
                        {/* Column 1: Sales Person -> Date, Records Count, Mail Status */}
                        <TableCell className="py-2.5 pl-4 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 min-w-max">
                            {isOpen ? (
                              <ChevronDown className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                            <Calendar className="w-4 h-4 text-slate-600 shrink-0" />
                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{day.label}</span>
                            <span className="text-xs text-slate-600">({day.agents.length} Records)</span>
                            {day.isMailSent ? (
                              <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-semibold px-2 py-0 text-[11px] inline-flex items-center gap-1 shadow-none ml-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Mail Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-300 bg-amber-100/70 text-amber-800 font-medium text-[11px] px-2 py-0 inline-flex items-center gap-1 shadow-none ml-1">
                                <CircleAlert className="h-3 w-3 text-amber-600" />
                                Mail Pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Column 2: Designation */}
                        <TableCell className="py-2.5 px-3 text-left">
                          <span className="text-xs text-slate-400 font-normal">—</span>
                        </TableCell>

                        {/* Column 3: Calls (numeric right-aligned) */}
                        <TableCell className="py-2.5 px-3 text-right">
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {calls}
                          </span>
                        </TableCell>

                        {/* Column 4: Good / Bad / Neutral / Not Rated (centered) */}
                        <TableCell className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center text-xs tabular-nums font-bold">
                            <span className="text-emerald-700">{goodTotal}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-700">{badTotal}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-sky-700">{neutralTotal}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-slate-600">{notRatedTotal}</span>
                          </span>
                        </TableCell>

                        {/* Column 5: Good-call rate for the day */}
                        <TableCell className="py-2.5 px-3 text-center" title="Good-call rate: Good ÷ (Good + Bad)">
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {dayGoodRate === null ? "—" : `${dayGoodRate}%`}
                          </span>
                          <span className="text-slate-500 text-[11px] font-normal ml-1">good</span>
                        </TableCell>

                        {/* Column 6: Outcome (centered pass / fail counts) */}
                        <TableCell className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center text-xs tabular-nums font-bold">
                            <span className="text-emerald-700">{pass}P</span>
                            <span className="text-slate-400 mx-1">•</span>
                            <span className={fail > 0 ? "text-rose-700" : "text-slate-600"}>{fail}F</span>
                          </span>
                        </TableCell>

                        {/* Column 7: HR Action Status */}
                        <TableCell className="py-2.5 px-3 text-left">
                          <span className="text-xs font-bold text-slate-900 tabular-nums">
                            {actionDone} / {day.agents.length}
                          </span>
                          <span className="text-[11px] text-slate-500 ml-1 font-normal">Processed</span>
                        </TableCell>

                        {/* Column 8: Delay (HR) */}
                        <TableCell className="py-2.5 px-3 text-left">
                          <span className="text-xs text-slate-400 font-normal">—</span>
                        </TableCell>

                        {/* Column 9: Action (Date Actions: Mark as Pending/Sent & View / Send Email) */}
                        {canWrite && (
                          <TableCell className="py-2.5 pr-4 pl-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const dStr = day.agents[0]?.rawDate ? day.agents[0].rawDate.slice(0, 10) : day.date
                                  handleToggleMailStatus(dStr, day.isMailSent)
                                }}
                                disabled={togglingDate !== null}
                                className={
                                  day.isMailSent
                                    ? "h-7 px-2.5 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium shadow-none cursor-pointer"
                                    : "h-7 px-2.5 text-xs border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold shadow-none cursor-pointer"
                                }
                                title={day.isMailSent ? "Click to revert to pending" : "Click if you already sent the email report manually"}
                              >
                                {togglingDate === (day.agents[0]?.rawDate ? day.agents[0].rawDate.slice(0, 10) : day.date) ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : day.isMailSent ? (
                                  <RotateCcw className="mr-1 h-3 w-3 text-slate-500" />
                                ) : (
                                  <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                                )}
                                {day.isMailSent ? "Mark as Pending" : "Mark as Sent"}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 px-2.5 text-xs gap-1 border-blue-300 bg-white text-blue-700 hover:bg-blue-50 font-medium shadow-none cursor-pointer"
                              >
                                <Link href={`/sales-call-audit/email-template?date=${encodeURIComponent(day.agents[0]?.rawDate ? day.agents[0].rawDate.slice(0, 10) : day.date)}`}>
                                  <Mail className="h-3 w-3 text-blue-600" />
                                  View / Send Email
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Employee Rows under this Date */}
                      {isOpen &&
                        (day.agents.length === 0 ? (
                          <TableRow key={`${day.date}-empty`}>
                            <TableCell colSpan={totalCols} className="text-center text-slate-400 py-4 text-xs italic bg-white border-b border-slate-100">
                              No sales agent records found for this date matching current filters.
                            </TableCell>
                          </TableRow>
                        ) : (
                          day.agents.map(agent => {
                            const hasAction = Boolean(agent.hrVerifyStatus || agent.hrActionForCalling)
                            const isSelected =
                              selectedAgent?.date === day.date && selectedAgent.agent.recordId === agent.recordId

                            return (
                              <TableRow
                                key={`${day.date}-${agent.recordId}`}
                                onClick={() => setSelectedAgent({ date: day.date, agent })}
                                className={`cursor-pointer transition-colors border-b border-slate-100 last:border-b-slate-200 ${
                                  isSelected ? "bg-blue-50/70 border-l-2 border-l-blue-600" : "bg-white hover:bg-slate-50"
                                }`}
                              >
                                {/* Sales Person (indented pl-10 to match nested child hierarchy in /leads/assign) */}
                                <TableCell className="py-2.5 pl-10 pr-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 shrink-0 border border-slate-200/60">
                                      {agent.initials}
                                    </span>
                                    <div>
                                      <div className="font-semibold text-slate-900 text-xs sm:text-sm leading-tight">{agent.name}</div>
                                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                        <span>{agent.id}</span>
                                        <span className="text-slate-300">•</span>
                                        <span>{agent.mid}</span>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>

                                {/* Designation */}
                                <TableCell className="py-2.5 px-3">
                                  <span className="inline-block text-[11px] text-slate-600 bg-slate-100/80 border border-slate-200/60 rounded px-2 py-0.5 font-normal">
                                    {agent.designation}
                                  </span>
                                </TableCell>

                                {/* Calls (numeric right-aligned) */}
                                <TableCell className="py-2.5 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={event => {
                                      event.stopPropagation()
                                      setCallDetailModal({ open: true, type: "all", agent, date: day.date })
                                    }}
                                    className="text-xs font-semibold text-slate-800 hover:text-blue-600 tabular-nums cursor-pointer transition-colors"
                                    title="Click to view full call audit details"
                                  >
                                    {agent.calls}
                                  </button>
                                </TableCell>

                                {/* Good / Bad / Neutral / Not Rated — each opens its popup tab */}
                                <TableCell className="py-2.5 px-3 text-center">
                                  <span className="inline-flex items-center text-xs tabular-nums font-medium">
                                    {CALL_GROUPS.map((g, i) => (
                                      <Fragment key={g.key}>
                                        {i > 0 && <span className="text-slate-300 mx-1">/</span>}
                                        <button
                                          type="button"
                                          onClick={event => {
                                            event.stopPropagation()
                                            setCallDetailModal({ open: true, type: g.key, agent, date: day.date })
                                          }}
                                          className={`${g.text} font-semibold hover:underline cursor-pointer`}
                                          title={`Click to view ${g.label} calls`}
                                        >
                                          {agent[g.countKey]}
                                        </button>
                                      </Fragment>
                                    ))}
                                  </span>
                                </TableCell>

                                {/* Overall Performance (as written by the live pilot) */}
                                <TableCell className="py-2.5 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${OVERALL_BADGE[agent.overallPerformance] || OVERALL_BADGE["Not Rated"]}`}>
                                    {agent.overallPerformance}
                                  </span>
                                </TableCell>

                                {/* Outcome */}
                                <TableCell className="py-2.5 px-3 text-center">
                                  <ResultBadge result={agent.result} />
                                </TableCell>

                                {/* HR Action Status */}
                                <TableCell className="py-2.5 px-3 text-left">
                                  {hasAction ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-[11px] font-semibold py-0 px-1.5 shadow-none">
                                          <CheckCircle2 className="mr-1 h-3 w-3" />
                                          {agent.hrVerifyStatus || "Verified"}
                                        </Badge>
                                        {agent.accountFmsUpdated && (
                                          <span className="text-[10px] font-medium text-emerald-700">✓ FMS Synced</span>
                                        )}
                                      </div>
                                      {agent.hrActionForCalling && (
                                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={agent.hrActionForCalling}>
                                          {agent.hrActionForCalling}
                                        </div>
                                      )}
                                    </div>
                                  ) : agent.result === "Fail" ? (
                                    <Badge variant="outline" className="border-amber-200 bg-amber-50/80 text-amber-800 font-medium text-[11px] py-0 px-1.5 shadow-none">
                                      Action Pending
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </TableCell>

                                {/* Delay (HR) */}
                                <TableCell className="py-2.5 px-3 text-left text-xs font-mono text-slate-600">
                                  {agent.timeDelayHr ? (
                                    <span className="inline-flex items-center gap-1 text-slate-600">
                                      <Clock className="h-3 w-3 text-slate-400" />
                                      {agent.timeDelayHr}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>

                                {/* Action */}
                                {canWrite && (
                                  <TableCell className="py-2.5 pr-4 pl-3 text-right">
                                    {agent.result === "Pass" && !hasAction ? (
                                      <span className="text-xs text-slate-400 pr-2">—</span>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant={hasAction ? "outline" : "default"}
                                        onClick={event => {
                                          event.stopPropagation()
                                          openAction(day.date, agent)
                                        }}
                                        className={
                                          hasAction
                                            ? "h-7 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-none cursor-pointer"
                                            : "h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-none cursor-pointer"
                                        }
                                      >
                                        {hasAction ? (
                                          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
                                        ) : (
                                          <ClipboardCheck className="mr-1 h-3 w-3" />
                                        )}
                                        {hasAction ? "View" : "Take Action"}
                                      </Button>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            )
                          })
                        ))}
                    </Fragment>
                  )
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
              {canWrite && (selectedAgent.agent.result !== "Pass" || selectedAgent.agent.hrVerifyStatus || selectedAgent.agent.hrActionForCalling) && (
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

          {/* Call breakdown from the live pilot daily report */}
          <div className="p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-blue-600" />
              Audited Call Breakdown
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CALL_GROUPS.map(g => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setCallDetailModal({ open: true, type: g.key, agent: selectedAgent.agent, date: selectedAgent.date })}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm text-left hover:border-blue-300 cursor-pointer transition-colors"
                  title={`View ${g.label} calls`}
                >
                  <p className="text-[10px] font-semibold uppercase text-slate-500">
                    {g.label}{g.key === "bad" && " (incl. Needs Improvement)"}
                  </p>
                  <p className={`text-xl font-bold mt-1 ${g.text}`}>{selectedAgent.agent[g.countKey]}</p>
                </button>
              ))}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 shadow-sm">
                <p className="text-[10px] font-semibold uppercase text-slate-500">Overall Performance</p>
                <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${OVERALL_BADGE[selectedAgent.agent.overallPerformance] || OVERALL_BADGE["Not Rated"]}`}>
                  {selectedAgent.agent.overallPerformance}
                </span>
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
                {isReadOnly ? (
                  <Input
                    value={verifyStatus}
                    disabled
                    readOnly
                    className="h-10 text-xs bg-slate-100/90 text-slate-900 font-semibold border-slate-200 cursor-not-allowed opacity-90"
                  />
                ) : (
                  <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                    <SelectTrigger className="h-10 text-xs border-slate-300 bg-white w-full">
                      <SelectValue placeholder="Select HR Verify Status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([verifyStatus, ...HR_VERIFY_STATUS_OPTIONS].filter(Boolean))).map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                {isReadOnly ? (
                  <Input
                    value={callingAction}
                    disabled
                    readOnly
                    className="h-10 text-xs bg-slate-100/90 text-slate-900 font-semibold border-slate-200 cursor-not-allowed opacity-90"
                  />
                ) : (
                  <Select value={callingAction} onValueChange={setCallingAction}>
                    <SelectTrigger className="h-10 text-xs border-slate-300 bg-white w-full">
                      <SelectValue placeholder="Select HR Action for Calling..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([callingAction, ...HR_ACTION_OPTIONS].filter(Boolean))).map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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

      {/* ─── Call Audit Details Popup (sales_call_audit_live_pilot_calls) ─── */}
      <Dialog
        open={Boolean(callDetailModal?.open)}
        onOpenChange={open => !open && setCallDetailModal(null)}
      >
        <DialogContent className="max-h-[92vh] sm:max-w-4xl p-0 gap-0 rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden bg-white">
          {callDetailModal && (() => {
            const agent = callDetailModal.agent
            const isPass = agent.result === "Pass"
            const tabs: { key: "all" | CallGroupKey; label: string; count: number; active: string; idle: string }[] = [
              { key: "all", label: "All", count: agent.calls, active: "bg-slate-800 text-white", idle: "text-slate-600 hover:bg-slate-100" },
              ...CALL_GROUPS.map(g => ({
                key: g.key,
                label: g.label,
                count: agent[g.countKey],
                active: g.key === "good" ? "bg-emerald-600 text-white" : g.key === "bad" ? "bg-rose-600 text-white" : g.key === "neutral" ? "bg-sky-600 text-white" : "bg-slate-600 text-white",
                idle: `${g.text} hover:bg-slate-100`,
              })),
            ]
            const q = modalCallSearch.trim().toLowerCase()
            const filtered = modalCalls.filter(call => {
              if (modalCallTab !== "all" && call.group !== modalCallTab) return false
              if (!q) return true
              return [call.callId, call.leadId, call.clientName, call.crmOutcome, call.crmNotes, call.performanceRemarks, call.remarks]
                .some(v => v && v.toLowerCase().includes(q))
            })

            return (
              <>
                {/* Header */}
                <div className="flex-shrink-0 p-5 text-white bg-gradient-to-r from-blue-600 via-indigo-700 to-blue-800">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md flex-shrink-0">
                      <Headphones className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold text-white leading-tight">Call Audit Details</DialogTitle>
                      <DialogDescription className="text-xs text-white/80 mt-0.5">
                        Audited calls for {agent.name} on {callDetailModal.date}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-white text-slate-800 font-bold flex items-center justify-center text-[10px]">
                        {agent.initials}
                      </span>
                      <span className="font-semibold">{agent.name}</span>
                      <span className="text-white/70 font-mono text-[11px]">({agent.id})</span>
                      <span className="text-white/80 text-[10px] bg-white/10 px-1.5 py-0.5 rounded">{agent.designation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${OVERALL_BADGE[agent.overallPerformance] || OVERALL_BADGE["Not Rated"]}`}>
                        Overall: {agent.overallPerformance}
                      </span>
                      <span className={`${isPass ? "bg-emerald-500" : "bg-rose-500"} text-white px-2 py-0.5 rounded text-[10px] font-bold`}>
                        {agent.result.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabs & Search */}
                <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-xs w-full sm:w-auto">
                    {tabs.map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setModalCallTab(t.key)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${modalCallTab === t.key ? t.active : t.idle}`}
                        title={t.key === "bad" ? "Includes Needs Improvement" : undefined}
                      >
                        {t.label} ({t.count})
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={modalCallSearch}
                      onChange={e => setModalCallSearch(e.target.value)}
                      placeholder="Search client, lead, notes..."
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

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50">
                  {!modalCallsLoading && modalCalls.length !== agent.calls && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Showing {modalCalls.length} audited call record(s); the daily report counts {agent.calls}. The call log may still be syncing from the audit sheet.
                    </p>
                  )}
                  {modalCallsLoading ? (
                    <div className="py-16 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">Loading audited calls...</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="py-12 text-center bg-white rounded-xl border border-slate-200 p-6">
                      <Headphones className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700 text-xs">
                        {modalCalls.length === 0 ? "No audited calls found for this date" : "No calls match this filter"}
                      </p>
                      {modalCalls.length > 0 && (
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
                      )}
                    </div>
                  ) : (
                    filtered.map(call => {
                      const cold = [
                        ["Recommended action", call.recommendedAction],
                        ["Cold reason", call.coldReason],
                        ["Action mode", call.actionMode],
                        ["Follow-up owner", call.followupOwner],
                        ["Follow-up due", call.followupDue],
                        ["Target team", call.targetTeam],
                        ["Escalation reason", call.escalationReason],
                        ["Remarks", call.remarks],
                        ["What went wrong", call.whatWentWrong],
                        ["Suggested solution", call.suggestedSolution],
                      ].filter((entry): entry is [string, string] => Boolean(entry[1]))

                      return (
                        <div key={call.callId} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 bg-slate-50/60">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">
                                  {call.clientName ? `Client: ${call.clientName}` : "Client not recorded"}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${OVERALL_BADGE[call.performance]}`}>
                                  {call.performance.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                {call.leadId && <span className="font-mono font-semibold text-slate-700">{call.leadId}</span>}
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {call.callTime}
                                </span>
                                {call.businessUnit && <span>• {call.businessUnit}</span>}
                                {call.callStage && <span>• {call.callStage}</span>}
                              </div>
                            </div>
                            {call.recordingUrl && (
                              <a
                                href={call.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 self-start sm:self-auto text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-2.5 py-1 bg-white rounded-md border border-blue-200 shadow-2xs"
                              >
                                <Volume2 className="h-3 w-3" />
                                Open recording
                              </a>
                            )}
                          </div>

                          <div className="p-3.5 space-y-3">
                            {call.performanceRemarks && (
                              <div className="text-xs text-slate-700">
                                <span className="font-bold text-slate-900 block mb-1">Overall performance remarks</span>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{call.performanceRemarks}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">CRM outcome (by salesperson)</span>
                                <p className="font-semibold text-slate-800 mt-0.5">{call.crmOutcome || "—"}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">CRM notes</span>
                                <p className="text-slate-700 mt-0.5 whitespace-pre-line">{call.crmNotes || "—"}</p>
                              </div>
                            </div>

                            {cold.length > 0 && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                                <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Cold lead review</span>
                                <dl className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                  {cold.map(([label, value]) => (
                                    <div key={label} className={value.length > 80 ? "sm:col-span-2" : undefined}>
                                      <dt className="text-[10px] font-semibold text-slate-500">{label}</dt>
                                      <dd className="text-slate-800 whitespace-pre-line">{value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer */}
                <DialogFooter className="flex-shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Agent ID: {agent.id} • Date: {callDetailModal.date}
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
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
