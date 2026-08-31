"use client"

import { useEffect, useMemo, useState } from "react"
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
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Filter,
  Headphones,
  Mail,
  PhoneCall,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  TableProperties,
  TrendingUp,
  UserCheck,
  X,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type AuditResult = "Pass" | "Fail"
type EmailStatus = "Sent" | "Not Sent"
type ReviewStatus = "Pending" | "Submitted" | "Reviewed"

type AgentAudit = {
  id: string
  name: string
  initials: string
  calls: number
  good: number
  bad: number
  score: number
  result: AuditResult
  disposition: string
  review: ReviewStatus
  emailStatus: EmailStatus
}

type AuditDay = {
  date: string
  label: string
  agents: AgentAudit[]
}

type HrActionRecord = {
  verifyStatus: string
  callingAction: string
  remarks: string
  halfDayLeave: boolean
  pagarbookUpdated: boolean
  savedAt: string
}

const BASE_AGENTS: AgentAudit[] = [
  { id: "EMP-1042", name: "Pushpanshu Kumar", initials: "PK", calls: 51, good: 14, bad: 37, score: 1.88, result: "Fail", disposition: "Not Interested", review: "Pending", emailStatus: "Sent" },
  { id: "EMP-1108", name: "Sadik Rehman", initials: "SR", calls: 74, good: 10, bad: 64, score: 0.71, result: "Fail", disposition: "Callback", review: "Submitted", emailStatus: "Sent" },
  { id: "EMP-1131", name: "Vidisha Bahukhandi", initials: "VB", calls: 51, good: 5, bad: 46, score: 1.38, result: "Fail", disposition: "Wrong Number", review: "Pending", emailStatus: "Not Sent" },
  { id: "EMP-1066", name: "Zaki Ahmed", initials: "ZA", calls: 48, good: 3, bad: 45, score: 0.75, result: "Fail", disposition: "Not Interested", review: "Reviewed", emailStatus: "Sent" },
  { id: "EMP-1019", name: "Neha Sharma", initials: "NS", calls: 39, good: 31, bad: 8, score: 4.12, result: "Pass", disposition: "Follow-up", review: "Submitted", emailStatus: "Sent" },
  { id: "EMP-1097", name: "Arjun Mehta", initials: "AM", calls: 42, good: 34, bad: 8, score: 4.35, result: "Pass", disposition: "Converted", review: "Reviewed", emailStatus: "Sent" },
]

const makeDay = (date: string, label: string, scoreDelta: number, callDelta: number): AuditDay => ({
  date,
  label,
  agents: BASE_AGENTS.map((agent, index) => ({
    ...agent,
    calls: Math.max(12, agent.calls - callDelta - (index % 3)),
    good: Math.max(2, agent.good - (index % 2)),
    bad: Math.max(1, agent.bad - callDelta),
    score: Math.max(0.5, Math.min(4.9, agent.score + scoreDelta + (index % 2 ? 0.08 : 0))),
    emailStatus: index === 2 && date !== "05-03-2026" ? "Not Sent" : agent.emailStatus,
  })),
})

const AUDIT_DAYS: AuditDay[] = [
  { date: "05-03-2026", label: "05 March 2026", agents: BASE_AGENTS },
  makeDay("04-03-2026", "04 March 2026", 0.18, 2),
  makeDay("03-03-2026", "03 March 2026", 0.3, 4),
  makeDay("02-03-2026", "02 March 2026", 0.44, 5),
]

const TREND_DATA = [
  { date: "28 Feb", pass: 42, fail: 64 },
  { date: "01 Mar", pass: 58, fail: 48 },
  { date: "02 Mar", pass: 62, fail: 43 },
  { date: "03 Mar", pass: 49, fail: 61 },
  { date: "04 Mar", pass: 67, fail: 39 },
  { date: "05 Mar", pass: 35, fail: 74 },
]

const DISPOSITION_DATA = [
  { name: "Not Interested", value: 65, color: "#ef4444" },
  { name: "Callback", value: 46, color: "#f59e0b" },
  { name: "Wrong Number", value: 31, color: "#8b5cf6" },
  { name: "Follow-up", value: 24, color: "#3b82f6" },
  { name: "Converted", value: 12, color: "#10b981" },
]

const CALL_ROWS = [
  { id: "AUD-05032026-01", time: "11:42 AM", prospect: "Prospect #KA-3812", duration: "04:18", declared: "Not Interested", verified: "Callback", score: 1.8, result: "Fail" as AuditResult },
  { id: "AUD-05032026-02", time: "12:16 PM", prospect: "Prospect #KA-3844", duration: "06:05", declared: "Callback", verified: "Callback", score: 3.6, result: "Pass" as AuditResult },
  { id: "AUD-05032026-03", time: "02:28 PM", prospect: "Prospect #KA-3901", duration: "03:41", declared: "Wrong Number", verified: "Not Interested", score: 1.2, result: "Fail" as AuditResult },
  { id: "AUD-05032026-04", time: "04:07 PM", prospect: "Prospect #KA-3977", duration: "07:22", declared: "Follow-up", verified: "Follow-up", score: 3.1, result: "Pass" as AuditResult },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const ACTION_STORAGE_KEY = "kairali-sales-call-audit-hr-actions-v1"

const actionKey = (date: string, employeeId: string) => `${date}:${employeeId}`

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
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [dispositionFilter, setDispositionFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(["05-03-2026"]))
  const [selectedRow, setSelectedRow] = useState<{ date: string; agent: AgentAudit } | null>(null)
  const [playingCall, setPlayingCall] = useState<string | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionTarget, setActionTarget] = useState<{ date: string; agent: AgentAudit } | null>(null)
  const [actions, setActions] = useState<Record<string, HrActionRecord>>({})
  const [verifyStatus, setVerifyStatus] = useState("")
  const [callingAction, setCallingAction] = useState("")
  const [remarks, setRemarks] = useState("")
  const [halfDayLeave, setHalfDayLeave] = useState(false)
  const [pagarbookUpdated, setPagarbookUpdated] = useState(false)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [viewMode, setViewMode] = useState<"table" | "analytics">("table")
  const [lastUpdated, setLastUpdated] = useState<string>("")

  useEffect(() => {
    const now = new Date()
    setLastUpdated(
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) + " " + now.toLocaleTimeString("en-GB", { hour12: false })
    )

    try {
      const stored = window.localStorage.getItem(ACTION_STORAGE_KEY)
      if (stored) setActions(JSON.parse(stored) as Record<string, HrActionRecord>)
    } catch {
      toast.error("Saved HR actions could not be loaded")
    }
  }, [])

  const filteredDays = useMemo(() => {
    let days = AUDIT_DAYS
    if (dateFilter !== "all") {
      days = days.filter(d => d.date === dateFilter)
    }

    return days.map(day => ({
      ...day,
      agents: day.agents.filter(agent => {
        const matchesEmployee = employeeFilter === "all" || agent.id === employeeFilter
        const matchesResult = resultFilter === "all" || agent.result === resultFilter
        const matchesDisposition = dispositionFilter === "all" || agent.disposition === dispositionFilter
        const matchesSearch =
          !search ||
          `${agent.name} ${agent.id} ${agent.disposition}`.toLowerCase().includes(search.toLowerCase())
        return matchesEmployee && matchesResult && matchesDisposition && matchesSearch
      }),
    }))
  }, [dateFilter, dispositionFilter, employeeFilter, resultFilter, search])

  const allFilteredAgents = filteredDays.flatMap(day => day.agents)
  const totalAuditedCalls = allFilteredAgents.reduce((sum, agent) => sum + agent.calls, 0)
  const passCount = allFilteredAgents.filter(agent => agent.result === "Pass").length
  const failCount = allFilteredAgents.filter(agent => agent.result === "Fail").length
  const passRate = allFilteredAgents.length ? Math.round((passCount / allFilteredAgents.length) * 100) : 0
  const failRate = allFilteredAgents.length ? Math.round((failCount / allFilteredAgents.length) * 100) : 0
  const averageScore = allFilteredAgents.length
    ? allFilteredAgents.reduce((sum, agent) => sum + agent.score, 0) / allFilteredAgents.length
    : 0
  const pendingHrActions = Math.max(0, failCount - Object.keys(actions).length)

  const monthlyRows = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    return MONTHS.map((month, index) => {
      const isFuture = selectedYear === currentYear && index > currentMonth
      if (isFuture) return { month, calls: 0, audited: 0, pass: 0, fail: 0, failRate: 0, emailSent: 0 }
      const yearFactor = Math.max(0.72, 1 - (currentYear - selectedYear) * 0.04)
      const audited = Math.round((184 + index * 17) * yearFactor)
      const fail = Math.round(audited * (0.22 + (index % 4) * 0.025))
      return {
        month,
        calls: Math.round((3920 + index * 267) * yearFactor),
        audited,
        pass: audited - fail,
        fail,
        failRate: audited ? (fail / audited) * 100 : 0,
        emailSent: Math.max(0, audited - (index % 3) * 2),
      }
    })
  }, [selectedYear])

  const toggleDate = (date: string) => {
    setExpandedDates(previous => {
      const next = new Set(previous)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  const openAction = (date: string, agent: AgentAudit) => {
    const existing = actions[actionKey(date, agent.id)]
    setActionTarget({ date, agent })
    setVerifyStatus(existing?.verifyStatus ?? "")
    setCallingAction(existing?.callingAction ?? (agent.result === "Fail" ? "Half day leave" : "No action required"))
    setRemarks(existing?.remarks ?? "")
    setHalfDayLeave(existing?.halfDayLeave ?? (agent.result === "Fail"))
    setPagarbookUpdated(existing?.pagarbookUpdated ?? false)
    setActionDialogOpen(true)
  }

  // ── Validation: All fields compulsory & at least 1 checkbox selected ────────
  const isActionFormValid = useMemo(() => {
    const hasVerifyStatus = Boolean(verifyStatus && verifyStatus.trim().length > 0)
    const hasCallingAction = Boolean(callingAction && callingAction.trim().length > 0)
    const hasRemarks = Boolean(remarks && remarks.trim().length > 0)
    const hasCheckbox = Boolean(halfDayLeave || pagarbookUpdated)
    return hasVerifyStatus && hasCallingAction && hasRemarks && hasCheckbox
  }, [verifyStatus, callingAction, remarks, halfDayLeave, pagarbookUpdated])

  const saveAction = () => {
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

    const record: HrActionRecord = {
      verifyStatus,
      callingAction,
      remarks: remarks.trim(),
      halfDayLeave,
      pagarbookUpdated,
      savedAt: new Date().toISOString(),
    }
    const next = { ...actions, [actionKey(actionTarget.date, actionTarget.agent.id)]: record }
    setActions(next)
    window.localStorage.setItem(ACTION_STORAGE_KEY, JSON.stringify(next))
    setActionDialogOpen(false)
    toast.success("HR action saved successfully")
  }

  const resetFilters = () => {
    setEmployeeFilter("all")
    setResultFilter("all")
    setDispositionFilter("all")
    setDateFilter("all")
    setSearch("")
  }

  const downloadCSV = () => {
    const headers = ["Date", "Employee ID", "Employee Name", "Calls", "Good", "Bad", "Disposition", "Score", "Result", "Email Status", "HR Action"]
    const rows = filteredDays.flatMap(day =>
      day.agents.map(agent => {
        const action = actions[actionKey(day.date, agent.id)]
        return [
          day.date,
          agent.id,
          `"${agent.name}"`,
          agent.calls,
          agent.good,
          agent.bad,
          `"${agent.disposition}"`,
          agent.score.toFixed(2),
          agent.result,
          agent.emailStatus,
          action ? `"${action.verifyStatus} - ${action.callingAction}"` : "Pending",
        ]
      })
    )
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `sales_call_audit_report_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Audit report exported as CSV")
  }

  const activeFiltersCount = [
    employeeFilter !== "all",
    resultFilter !== "all",
    dispositionFilter !== "all",
    dateFilter !== "all",
    search !== "",
  ].filter(Boolean).length

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Standard CRM Header Banner ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="w-full px-4 sm:px-6 lg:px-8 py-7 relative z-10">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm" />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title & Icon */}
            <div className="space-y-2 w-full lg:w-auto">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                    Sales Call Audit Report
                  </h1>
                  <p className="text-sm sm:text-base text-white/90 mt-1 font-medium">
                    Quality Assurance • Performance Evaluation • HR Verification & Attendance Action
                  </p>
                </div>
              </div>
            </div>

            {/* Header Action Buttons & Stats */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
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
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <div className="hidden sm:flex flex-col items-end justify-center bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                <span className="text-[10px] uppercase tracking-wide text-white/70 font-semibold">LAST SYNC</span>
                <span className="text-xs font-bold text-white font-mono">{lastUpdated || "Loading..."}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search Section (Standard CRM FiltersCard - Placed Before KPI) ─── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden relative">
        {/* Header of Section Card */}
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
              <p className="text-xs text-slate-500">Refine audit records across agents, outcomes, dispositions and dates</p>
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

        {/* Filter Inputs Grid (5 columns on desktop) */}
        <div className="px-4 sm:px-5 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Search Keyword */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Search Agent / ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search by name or EMP-ID..."
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
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 10px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Dates ({AUDIT_DAYS.length} days)</option>
              {AUDIT_DAYS.map(day => (
                <option key={day.date} value={day.date}>
                  {day.label}
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
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 10px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Sales Persons</option>
              {BASE_AGENTS.map(agent => (
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
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 10px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Outcomes</option>
              <option value="Pass">Pass Only</option>
              <option value="Fail">Fail Only</option>
            </select>
          </div>

          {/* 5. Call Disposition */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Call Disposition
            </label>
            <select
              value={dispositionFilter}
              onChange={event => setDispositionFilter(event.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 10px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">All Dispositions</option>
              {DISPOSITION_DATA.map(item => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── KPI Summary Section (Standard CRM KPI Container) ───────────────────── */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40 flex-shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Key Performance Indicators</h2>
              <p className="text-[11px] text-slate-500">Quality metrics, pass/fail evaluation & HR attendance actions</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              Table View
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "analytics"
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
                Call Volume & Quality Benchmarks
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
                <div className="mt-1 text-[11px] text-slate-500">Across {allFilteredAgents.length} agent reviews</div>
              </div>

              {/* Average KPI Score */}
              <div className="bg-white border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Average Quality Score</p>
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 leading-tight">{averageScore.toFixed(2)} <span className="text-sm font-normal text-slate-400">/ 5.0</span></p>
                <div className="mt-1 text-[11px] text-slate-500">Target benchmark: 3.00+</div>
              </div>

              {/* Passed Audits */}
              <div className="bg-white border-2 border-emerald-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Pass Rate</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 leading-tight">{passCount} <span className="text-sm font-normal text-slate-400">({passRate}%)</span></p>
                <div className="mt-1 text-[11px] text-slate-500">Meets quality standard</div>
              </div>

              {/* Outcome Mismatch */}
              <div className="bg-white border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Disposition Mismatch</p>
                  <CircleAlert className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600 leading-tight">65.3%</p>
                <div className="mt-1 text-[11px] text-slate-500">145 disposition discrepancies</div>
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
                <p className="text-2xl font-bold text-emerald-600 leading-tight">{Object.keys(actions).length}</p>
                <div className="mt-1 text-[11px] text-slate-500">Verified & updated by HR</div>
              </div>

              {/* Pagarbook Updates */}
              <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Pagarbook Synced</p>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600 leading-tight">
                  {Object.values(actions).filter(a => a.pagarbookUpdated).length}
                </p>
                <div className="mt-1 text-[11px] text-slate-500">Half-day leave marked</div>
              </div>
            </div>
          </div>

          {/* Analytics View Charts */}
          {viewMode === "analytics" && (
            <div className="grid gap-4 lg:grid-cols-2 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Pass vs Fail Outcome Trend</h3>
                    <p className="text-[11px] text-slate-500">Daily outcome distribution over time</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Pass</span>
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Fail</span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  <h3 className="text-sm font-bold text-slate-800">Disposition Mismatch Contribution</h3>
                  <p className="text-[11px] text-slate-500">Percentage of mismatches found by call disposition</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={DISPOSITION_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" domain={[0, 75]} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value) => [`${value}%`, "Mismatch Share"]} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={600}>
                        {DISPOSITION_DATA.map(item => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Bar>
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
            <p className="text-xs text-slate-500 mt-0.5">
              Click an audit date to expand agent records. Click an employee to view call-level recordings and evidence.
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto bg-white border-slate-200 text-slate-700">
            <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
            {filteredDays.length} Dates Available
          </Badge>
        </div>

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
                <TableHead className="text-center text-white font-semibold">Email Sent</TableHead>
                <TableHead className="text-center text-white font-semibold">HR Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDays.map(day => {
                const isOpen = expandedDates.has(day.date)
                const pass = day.agents.filter(agent => agent.result === "Pass").length
                const fail = day.agents.filter(agent => agent.result === "Fail").length
                const calls = day.agents.reduce((sum, agent) => sum + agent.calls, 0)
                const score = day.agents.length
                  ? day.agents.reduce((sum, agent) => sum + agent.score, 0) / day.agents.length
                  : 0
                const emailSent = day.agents.filter(agent => agent.emailStatus === "Sent").length
                const actionDone = day.agents.filter(agent => actions[actionKey(day.date, agent.id)]).length

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
                          <div className="text-[11px] text-slate-500 font-medium">{day.agents.length} Sales Agents</div>
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
                    <TableCell className="text-center text-slate-700">
                      {emailSent} / {day.agents.length}
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
                                <TableHead className="text-center text-white font-semibold">Calls</TableHead>
                                <TableHead className="text-center text-white font-semibold">Good / Bad</TableHead>
                                <TableHead className="text-white font-semibold">Disposition</TableHead>
                                <TableHead className="text-center text-white font-semibold">Score</TableHead>
                                <TableHead className="text-center text-white font-semibold">Outcome</TableHead>
                                <TableHead className="text-center text-white font-semibold">Email Status</TableHead>
                                <TableHead className="text-white font-semibold">HR Action Status</TableHead>
                                <TableHead className="text-right text-white font-semibold">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {day.agents.map(agent => {
                                const record = actions[actionKey(day.date, agent.id)]
                                const isSelected =
                                  selectedRow?.date === day.date && selectedRow.agent.id === agent.id

                                return (
                                  <TableRow
                                    key={agent.id}
                                    onClick={() => setSelectedRow({ date: day.date, agent })}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                                    }`}
                                  >
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                          {agent.initials}
                                        </span>
                                        <div>
                                          <div className="font-bold text-slate-900">{agent.name}</div>
                                          <div className="text-[11px] text-slate-500 font-mono">{agent.id}</div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-slate-800">
                                      {agent.calls}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <span className="text-emerald-700 font-bold">{agent.good}</span>
                                      <span className="text-slate-400 mx-1">/</span>
                                      <span className="text-rose-700 font-bold">{agent.bad}</span>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                        {agent.disposition}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-indigo-700">
                                      {agent.score.toFixed(2)} / 5
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <ResultBadge result={agent.result} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <EmailBadge status={agent.emailStatus} />
                                    </TableCell>
                                    <TableCell>
                                      {record ? (
                                        <div>
                                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                            Done
                                          </Badge>
                                          <div className="mt-0.5 text-[11px] text-slate-600 font-medium">
                                            {record.callingAction || record.verifyStatus}
                                          </div>
                                          {record.pagarbookUpdated && (
                                            <div className="text-[10px] font-bold text-emerald-700">
                                              ✓ Pagarbook Updated
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
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        onClick={event => {
                                          event.stopPropagation()
                                          openAction(day.date, agent)
                                        }}
                                        className={
                                          record
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                                            : "bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                        }
                                      >
                                        {record ? (
                                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                        ) : (
                                          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        {record ? "View / Edit" : "Take Action"}
                                      </Button>
                                    </TableCell>
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
      </div>

      {/* ─── Call-Level Detail Drawer (When Agent Row Selected) ────────────────── */}
      {selectedRow && (
        <div className="bg-white rounded-xl border-2 border-blue-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                {selectedRow.agent.initials}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedRow.agent.name} · Call Audit Details
                </h3>
                <p className="text-xs text-slate-500">
                  Audit Date: {selectedRow.date} • Employee ID: {selectedRow.agent.id} • Click &ldquo;Listen&rdquo; to review call recording
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => openAction(selectedRow.date, selectedRow.agent)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                <ClipboardCheck className="mr-1.5 h-4 w-4" />
                HR Action Form
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRow(null)}
                className="text-xs border-slate-200"
              >
                Close
              </Button>
            </div>
          </div>

          {actions[actionKey(selectedRow.date, selectedRow.agent.id)] && (() => {
            const record = actions[actionKey(selectedRow.date, selectedRow.agent.id)]
            return (
              <div className="m-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">HR Verify Status</span>
                  <div className="mt-0.5 font-bold text-slate-900">{record.verifyStatus}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Calling Action</span>
                  <div className="mt-0.5 font-bold text-slate-900">{record.callingAction || "—"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Half Day Leave</span>
                  <div className="mt-0.5 font-bold text-slate-900">{record.halfDayLeave ? "Applied" : "No"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Pagarbook Synced</span>
                  <div className="mt-0.5 font-bold text-slate-900">{record.pagarbookUpdated ? "✓ Updated" : "Pending"}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Remarks</span>
                  <div className="mt-0.5 font-medium text-slate-700">{record.remarks || "No remarks"}</div>
                </div>
              </div>
            )
          })()}

          <div className="overflow-x-auto p-4">
            <Table className="min-w-[920px] rounded-lg border border-slate-200">
              <TableHeader className="bg-slate-100">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Call Time</TableHead>
                  <TableHead className="font-semibold text-slate-700">Prospect / Lead</TableHead>
                  <TableHead className="font-semibold text-slate-700">Duration</TableHead>
                  <TableHead className="font-semibold text-slate-700">Agent Declared</TableHead>
                  <TableHead className="font-semibold text-slate-700">Auditor Verified</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Quality Score</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Outcome</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Call Audio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {CALL_ROWS.map(call => {
                  const isMismatch = call.declared !== call.verified
                  return (
                    <TableRow key={call.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs text-slate-700">{call.time}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{call.prospect}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{call.id}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">{call.duration}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-xs">
                          {call.declared}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            isMismatch
                              ? "border-rose-300 bg-rose-50 text-rose-700 font-bold text-xs"
                              : "border-emerald-300 bg-emerald-50 text-emerald-700 text-xs"
                          }
                        >
                          {call.verified} {isMismatch && " (Mismatch)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-indigo-700">
                        {call.score.toFixed(1)} / 5.0
                      </TableCell>
                      <TableCell className="text-center">
                        <ResultBadge result={call.result} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={playingCall === call.id ? "default" : "outline"}
                          onClick={() => setPlayingCall(playingCall === call.id ? null : call.id)}
                          className={
                            playingCall === call.id
                              ? "bg-blue-600 text-white text-xs h-7"
                              : "border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-7"
                          }
                        >
                          {playingCall === call.id ? (
                            <>
                              <span className="mr-1.5 flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                              Playing…
                            </>
                          ) : (
                            <>
                              <Headphones className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                              Listen
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ─── Monthly Overview Summary Table ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50 border-b border-slate-200">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Monthly Call Audit & Compliance Summary</h3>
            <p className="text-xs text-slate-500 mt-0.5">Year-round evaluation of pass/fail trends and email coverage</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Select Year:</span>
            <Select value={String(selectedYear)} onValueChange={value => setSelectedYear(Number(value))}>
              <SelectTrigger className="w-28 h-8 text-xs bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader className="bg-[#1e3a5f]">
              <TableRow className="hover:bg-[#1e3a5f]">
                <TableHead className="text-white font-semibold">Month</TableHead>
                <TableHead className="text-center text-white font-semibold">Total Calls</TableHead>
                <TableHead className="text-center text-white font-semibold">Audited</TableHead>
                <TableHead className="text-center text-white font-semibold">Pass</TableHead>
                <TableHead className="text-center text-white font-semibold">Fail</TableHead>
                <TableHead className="text-center text-white font-semibold">Fail Rate %</TableHead>
                <TableHead className="text-center text-white font-semibold">Email Sent</TableHead>
                <TableHead className="text-center text-white font-semibold">Email Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyRows.map(row => (
                <TableRow key={row.month} className={row.audited === 0 ? "text-slate-400 bg-slate-50/50" : "hover:bg-slate-50"}>
                  <TableCell className="font-bold text-slate-900">{row.month}-{selectedYear}</TableCell>
                  <TableCell className="text-center font-mono">{row.calls.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-center font-bold text-slate-800">{row.audited}</TableCell>
                  <TableCell className="text-center font-bold text-emerald-700">{row.pass}</TableCell>
                  <TableCell className="text-center font-bold text-rose-700">{row.fail}</TableCell>
                  <TableCell className="text-center font-semibold">
                    {row.audited > 0 ? (
                      <span className={row.failRate > 30 ? "text-rose-600" : "text-slate-700"}>
                        {row.failRate.toFixed(1)}%
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-center text-slate-700">{row.emailSent}</TableCell>
                  <TableCell className="text-center font-medium">
                    {row.audited ? `${((row.emailSent / row.audited) * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── HR Action Modal (Professional CRM Form Design with 2-Column Layout & Pinned Action Footer) ── */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-h-[88vh] sm:max-w-2xl p-0 gap-0 rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden bg-white">
          {/* Top Gradient Header (Pinned) */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white shadow-md flex-shrink-0">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white leading-tight">
                    HR Calling Audit Action
                  </DialogTitle>
                  <DialogDescription className="text-xs text-blue-100 mt-0.5">
                    Attendance verification & compliance adjustment workflow
                  </DialogDescription>
                </div>
              </div>
            </div>

            {/* Employee Quick Info Badge Banner */}
            {actionTarget && (
              <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-white text-blue-700 font-bold flex items-center justify-center text-[10px]">
                    {actionTarget.agent.initials}
                  </span>
                  <span className="font-semibold text-white">{actionTarget.agent.name}</span>
                  <span className="text-white/70 font-mono text-[11px]">({actionTarget.agent.id})</span>
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

          {/* Form Body (Scrollable with custom scrollbar) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs bg-white">
            {/* Row 1: 2-Column Grid for Status & Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: HR Verify Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    HR Verify Status <span className="text-rose-500">*</span>
                  </span>
                  {!verifyStatus && (
                    <span className="text-[10px] text-rose-500 font-normal">Required</span>
                  )}
                </Label>
                <Select value={verifyStatus} onValueChange={setVerifyStatus}>
                  <SelectTrigger className={`h-10 text-xs ${!verifyStatus ? "border-slate-300 bg-slate-50/50" : "border-blue-400 bg-white shadow-sm"}`}>
                    <SelectValue placeholder="Select HR status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Need clarification">Need clarification</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2: HR Action for Calling Fail/Pass */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    HR Action for Calling <span className="text-rose-500">*</span>
                  </span>
                  {!callingAction && (
                    <span className="text-[10px] text-rose-500 font-normal">Required</span>
                  )}
                </Label>
                <Select value={callingAction} onValueChange={setCallingAction}>
                  <SelectTrigger className={`h-10 text-xs ${!callingAction ? "border-slate-300 bg-slate-50/50" : "border-blue-400 bg-white shadow-sm"}`}>
                    <SelectValue placeholder="Select HR action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Half day leave">Half day leave</SelectItem>
                    <SelectItem value="No action required">No action required</SelectItem>
                    <SelectItem value="Coaching required">Coaching required</SelectItem>
                    <SelectItem value="Warning issued">Warning issued</SelectItem>
                    <SelectItem value="Re-audit required">Re-audit required</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Other Remarks / Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="other-remarks" className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>
                  Other Remarks / Notes <span className="text-rose-500">*</span>
                </span>
                {!remarks.trim() && (
                  <span className="text-[10px] text-rose-500 font-normal">Required</span>
                )}
              </Label>
              <Textarea
                id="other-remarks"
                value={remarks}
                onChange={event => setRemarks(event.target.value)}
                placeholder="Enter mandatory HR remarks, coaching advice, or clarification details..."
                className={`text-xs min-h-[75px] resize-none ${!remarks.trim() ? "border-slate-300 bg-slate-50/50" : "border-blue-400 bg-white shadow-sm"}`}
              />
            </div>

            {/* Row 3: Attendance Adjustments & Pagarbook Sync Checkboxes (2-Column Grid, Independent) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Attendance & Payroll Actions <span className="text-rose-500">*</span>
                </Label>
                {!halfDayLeave && !pagarbookUpdated && (
                  <span className="text-[10px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Select at least 1 action
                  </span>
                )}
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-3.5 transition-colors ${
                  !halfDayLeave && !pagarbookUpdated
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-slate-50/70"
                }`}
              >
                {/* Checkbox 1: Apply Half-Day Leave */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <Checkbox
                    id="half-day"
                    checked={halfDayLeave}
                    onCheckedChange={checked => setHalfDayLeave(checked === true)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div>
                    <Label htmlFor="half-day" className="font-bold text-xs text-slate-900 cursor-pointer">
                      Apply Half-Day Leave
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Deduct half-day attendance for audit date.
                    </p>
                  </div>
                </div>

                {/* Checkbox 2: Half-Day Updated on Pagarbook */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                  <Checkbox
                    id="pagarbook"
                    checked={pagarbookUpdated}
                    onCheckedChange={checked => setPagarbookUpdated(checked === true)}
                    className="mt-0.5 border-slate-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <div>
                    <Label htmlFor="pagarbook" className="font-bold text-xs text-slate-900 cursor-pointer">
                      Pagarbook Updated
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Confirm adjustment recorded in Pagarbook.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Footer (Pinned at Bottom) */}
          <DialogFooter className="flex-shrink-0 px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {!isActionFormValid ? (
                <span className="text-[11px] text-amber-700 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  Fill all fields with * & select at least 1 checkbox
                </span>
              ) : (
                <span className="text-[11px] text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  Ready to save action
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionDialogOpen(false)}
                className="text-xs border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!isActionFormValid}
                onClick={saveAction}
                className={
                  isActionFormValid
                    ? "bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-md transition-all font-bold cursor-pointer"
                    : "bg-slate-300 text-slate-500 text-xs cursor-not-allowed opacity-60 font-semibold"
                }
              >
                <Save className="mr-1.5 h-4 w-4" />
                Save HR Action
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
