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
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Download,
  Headphones,
  Mail,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useAuth } from "@/hooks/use-auth"

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
  { id: "DEMO-001", name: "Demo Agent A", initials: "DA", calls: 51, good: 14, bad: 37, score: 1.88, result: "Fail", disposition: "Not Interested", review: "Pending", emailStatus: "Sent" },
  { id: "DEMO-002", name: "Demo Agent B", initials: "DB", calls: 74, good: 10, bad: 64, score: 0.71, result: "Fail", disposition: "Callback", review: "Submitted", emailStatus: "Sent" },
  { id: "DEMO-003", name: "Demo Agent C", initials: "DC", calls: 51, good: 5, bad: 46, score: 1.38, result: "Fail", disposition: "Wrong Number", review: "Pending", emailStatus: "Not Sent" },
  { id: "DEMO-004", name: "Demo Agent D", initials: "DD", calls: 48, good: 3, bad: 45, score: 0.75, result: "Fail", disposition: "Not Interested", review: "Reviewed", emailStatus: "Sent" },
  { id: "DEMO-005", name: "Demo Agent E", initials: "DE", calls: 39, good: 31, bad: 8, score: 4.12, result: "Pass", disposition: "Follow-up", review: "Submitted", emailStatus: "Sent" },
  { id: "DEMO-006", name: "Demo Agent F", initials: "DF", calls: 42, good: 34, bad: 8, score: 4.35, result: "Pass", disposition: "Converted", review: "Reviewed", emailStatus: "Sent" },
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

const DISPOSITION_COLORS: Record<string, string> = {
  "Not Interested": "#ef4444",
  Callback: "#f59e0b",
  "Wrong Number": "#8b5cf6",
  "Follow-up": "#3b82f6",
  Converted: "#10b981",
}

const CALL_ROWS = [
  { id: "DEMO-CALL-001", time: "11:42 AM", prospect: "Synthetic Lead 01", duration: "04:18", declared: "Not Interested", verified: "Callback", score: 1.8, result: "Fail" as AuditResult },
  { id: "DEMO-CALL-002", time: "12:16 PM", prospect: "Synthetic Lead 02", duration: "06:05", declared: "Callback", verified: "Callback", score: 3.6, result: "Pass" as AuditResult },
  { id: "DEMO-CALL-003", time: "02:28 PM", prospect: "Synthetic Lead 03", duration: "03:41", declared: "Wrong Number", verified: "Not Interested", score: 1.2, result: "Fail" as AuditResult },
  { id: "DEMO-CALL-004", time: "04:07 PM", prospect: "Synthetic Lead 04", duration: "07:22", declared: "Follow-up", verified: "Follow-up", score: 3.1, result: "Pass" as AuditResult },
]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const actionKey = (date: string, employeeId: string) => `${date}:${employeeId}`

function ResultBadge({ result }: { result: AuditResult }) {
  return result === "Pass" ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" />PASS</Badge>
  ) : (
    <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50"><XCircle className="mr-1 h-3 w-3" />FAIL</Badge>
  )
}

function EmailBadge({ status }: { status: EmailStatus }) {
  return status === "Sent" ? (
    <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50"><Mail className="mr-1 h-3 w-3" />Sent</Badge>
  ) : (
    <Badge variant="outline" className="text-slate-500"><CircleAlert className="mr-1 h-3 w-3" />Not sent</Badge>
  )
}

export default function SalesCallAuditPage() {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission("sales_call_audit.write")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [dispositionFilter, setDispositionFilter] = useState("all")
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
  const [chartsReady, setChartsReady] = useState(false)
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null)
  const [savingAction, setSavingAction] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setChartsReady(true)
      const params = new URLSearchParams(window.location.search)
      const employeeId = params.get("employee")
      const requestedDate = params.get("date")
      if (employeeId) {
        const day = AUDIT_DAYS.find((item) => (!requestedDate || item.date === requestedDate) && item.agents.some((agent) => agent.id === employeeId))
        const agent = day?.agents.find((item) => item.id === employeeId)
        if (day && agent) {
          setEmployeeFilter(employeeId)
          setExpandedDates(new Set([day.date]))
          setSelectedRow({ date: day.date, agent })
        }
      }
    })

    let active = true
    void fetch("/api/sales-call-audit/actions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status))
        const payload = await response.json() as { actions?: Array<HrActionRecord & { auditDate: string; employeeId: string }> }
        if (!active) return
        const restored: Record<string, HrActionRecord> = {}
        for (const action of payload.actions ?? []) {
          restored[actionKey(action.auditDate, action.employeeId)] = action
        }
        setActions(restored)
        setStorageAvailable(true)
      })
      .catch(() => {
        if (active) setStorageAvailable(false)
      })

    return () => { active = false }
  }, [])

  const filteredDays = useMemo(() => AUDIT_DAYS.map(day => ({
    ...day,
    agents: day.agents.filter(agent => {
      const matchesEmployee = employeeFilter === "all" || agent.id === employeeFilter
      const matchesResult = resultFilter === "all" || agent.result === resultFilter
      const matchesDisposition = dispositionFilter === "all" || agent.disposition === dispositionFilter
      const matchesSearch = !search || `${agent.name} ${agent.id}`.toLowerCase().includes(search.toLowerCase())
      return matchesEmployee && matchesResult && matchesDisposition && matchesSearch
    }),
  })), [dispositionFilter, employeeFilter, resultFilter, search])

  const allFilteredAgents = filteredDays.flatMap(day => day.agents)
  const totalAudited = allFilteredAgents.reduce((sum, agent) => sum + agent.calls, 0)
  const passCount = allFilteredAgents.filter(agent => agent.result === "Pass").length
  const failCount = allFilteredAgents.filter(agent => agent.result === "Fail").length
  const averageScore = allFilteredAgents.length
    ? allFilteredAgents.reduce((sum, agent) => sum + agent.score, 0) / allFilteredAgents.length
    : 0
  const mismatchCount = allFilteredAgents.reduce((sum, agent) => sum + agent.bad, 0)
  const mismatchRate = totalAudited ? (mismatchCount / totalAudited) * 100 : 0
  const pendingActionCount = filteredDays.reduce((count, day) => count + day.agents.filter((agent) => (
    agent.result === "Fail" && !actions[actionKey(day.date, agent.id)]
  )).length, 0)

  const trendData = useMemo(() => [...filteredDays].reverse().map((day) => ({
    date: day.label.replace(" 2026", ""),
    pass: day.agents.filter((agent) => agent.result === "Pass").length,
    fail: day.agents.filter((agent) => agent.result === "Fail").length,
  })), [filteredDays])

  const dispositionData = useMemo(() => {
    const totalBad = allFilteredAgents.reduce((sum, agent) => sum + agent.bad, 0)
    const badByDisposition = new Map<string, number>()
    for (const agent of allFilteredAgents) {
      badByDisposition.set(agent.disposition, (badByDisposition.get(agent.disposition) ?? 0) + agent.bad)
    }
    return [...badByDisposition.entries()].map(([name, bad]) => ({
      name,
      value: totalBad ? Number(((bad / totalBad) * 100).toFixed(1)) : 0,
      color: DISPOSITION_COLORS[name] ?? "#64748b",
    })).sort((a, b) => b.value - a.value)
  }, [allFilteredAgents])

  const monthlyRows = useMemo(() => {
    return MONTHS.map((month, index) => {
      const monthDays = AUDIT_DAYS.filter((day) => {
        const [, monthPart, yearPart] = day.date.split("-").map(Number)
        return yearPart === selectedYear && monthPart === index + 1
      })
      const agents = monthDays.flatMap((day) => day.agents)
      const calls = agents.reduce((sum, agent) => sum + agent.calls, 0)
      const pass = agents.filter((agent) => agent.result === "Pass").length
      const fail = agents.filter((agent) => agent.result === "Fail").length
      const emailed = agents.filter((agent) => agent.emailStatus === "Sent").length
      return {
        month,
        calls,
        audited: agents.length,
        pass,
        fail,
        failRate: agents.length ? (fail / agents.length) * 100 : 0,
        emailSent: emailed,
      }
    })
  }, [selectedYear])

  const toggleDate = (date: string) => {
    setExpandedDates(previous => {
      const next = new Set(previous)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const openAction = (date: string, agent: AgentAudit) => {
    const existing = actions[actionKey(date, agent.id)]
    setActionTarget({ date, agent })
    setVerifyStatus(existing?.verifyStatus ?? "")
    setCallingAction(existing?.callingAction ?? (agent.result === "Fail" ? "Half day leave" : "No action required"))
    setRemarks(existing?.remarks ?? "")
    setHalfDayLeave(existing?.halfDayLeave ?? agent.result === "Fail")
    setPagarbookUpdated(existing?.pagarbookUpdated ?? false)
    setActionDialogOpen(true)
  }

  const saveAction = async () => {
    if (!actionTarget || !verifyStatus) {
      toast.error("HR Verify Status is required")
      return
    }
    if (!canWrite) {
      toast.error("HR write permission is required")
      return
    }
    setSavingAction(true)
    try {
      const response = await fetch("/api/sales-call-audit/actions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditDate: actionTarget.date,
          employeeId: actionTarget.agent.id,
          verifyStatus,
          callingAction,
          remarks,
          halfDayLeave,
          pagarbookUpdated,
        }),
      })
      const payload = await response.json() as { action?: HrActionRecord; error?: string }
      if (!response.ok || !payload.action) throw new Error(payload.error || "Unable to save HR action")
      setActions((previous) => ({ ...previous, [actionKey(actionTarget.date, actionTarget.agent.id)]: payload.action! }))
      setStorageAvailable(true)
      setActionDialogOpen(false)
      toast.success("HR action saved to secure server storage")
    } catch (error) {
      setStorageAvailable(false)
      toast.error(error instanceof Error ? error.message : "Unable to save HR action")
    } finally {
      setSavingAction(false)
    }
  }

  const exportReport = () => {
    const rows = [["Audit date", "Employee ID", "Employee", "Calls", "Good", "Bad", "Disposition", "Score", "Result", "Email status"]]
    for (const day of filteredDays) {
      for (const agent of day.agents) rows.push([day.date, agent.id, agent.name, String(agent.calls), String(agent.good), String(agent.bad), agent.disposition, agent.score.toFixed(2), agent.result, agent.emailStatus])
    }
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `sales-call-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Filtered audit report exported")
  }

  const playSyntheticRecording = (callId: string) => {
    if (playingCall === callId) return
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) {
      toast.error("Audio playback is not supported in this browser")
      return
    }
    const context = new AudioContextClass()
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.04, context.currentTime)
    gain.connect(context.destination)
    const oscillator = context.createOscillator()
    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(440, context.currentTime)
    oscillator.frequency.linearRampToValueAtTime(660, context.currentTime + 1.2)
    oscillator.connect(gain)
    oscillator.start()
    oscillator.stop(context.currentTime + 1.2)
    setPlayingCall(callId)
    oscillator.addEventListener("ended", () => {
      setPlayingCall(null)
      void context.close()
    }, { once: true })
  }

  const resetFilters = () => {
    setEmployeeFilter("all")
    setResultFilter("all")
    setDispositionFilter("all")
    setSearch("")
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            <ShieldCheck className="h-4 w-4" /> Sales quality intelligence
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sales Call Audit Report</h1>
          <p className="mt-1 text-sm text-slate-500">Date-wise employee performance, call evidence, HR verification and attendance action.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/sales-call-audit/email-template"><Mail className="mr-2 h-4 w-4" />Email template</Link></Button>
          <Button onClick={exportReport} className="bg-indigo-600 hover:bg-indigo-700"><Download className="mr-2 h-4 w-4" />Export report</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
        <span><strong>Prototype data:</strong> every employee, lead, KPI and recording on this page is synthetic. No personnel or customer data is stored in the repository.</span>
        <Badge variant="outline" className="w-fit border-amber-300 bg-white text-amber-800">Synthetic fixtures</Badge>
      </div>

      {storageAvailable === false && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Secure HR storage is not provisioned in this environment. Report viewing remains available; HR action writes are disabled until the approved database table is provisioned.
        </div>
      )}

      <Card className="gap-0 border-slate-200 py-0">
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Search employee or ID" />
          </div>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger><SelectValue placeholder="All sales persons" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All sales persons</SelectItem>{BASE_AGENTS.map(agent => <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger><SelectValue placeholder="Pass / Fail" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All outcomes</SelectItem><SelectItem value="Pass">Pass</SelectItem><SelectItem value="Fail">Fail</SelectItem></SelectContent>
          </Select>
          <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
            <SelectTrigger><SelectValue placeholder="Disposition" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All dispositions</SelectItem>{Object.keys(DISPOSITION_COLORS).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={resetFilters}><RotateCcw className="mr-2 h-4 w-4" />Reset filters</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total audited", value: totalAudited, sub: "Across 4 audit dates", icon: ClipboardCheck, iconClass: "text-blue-500" },
          { label: "Pass", value: passCount, sub: "Employee outcomes", icon: CheckCircle2, iconClass: "text-emerald-500" },
          { label: "Fail", value: failCount, sub: "HR review required", icon: XCircle, iconClass: "text-red-500" },
          { label: "Average score", value: averageScore.toFixed(2), sub: "Benchmark 3.00 / 5", icon: BarChart3, iconClass: "text-violet-500" },
          { label: "Outcome mismatch", value: `${mismatchRate.toFixed(1)}%`, sub: `${mismatchCount} bad outcomes`, icon: CircleAlert, iconClass: "text-amber-500" },
          { label: "Pending HR actions", value: pendingActionCount, sub: "Action form pending", icon: Users, iconClass: "text-slate-500" },
        ].map(item => (
          <Card key={item.label} className="gap-0 border-slate-200 py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2"><span className="text-xs font-medium text-slate-500">{item.label}</span><item.icon className={`h-5 w-5 ${item.iconClass}`} /></div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{item.value}</div>
              <div className="mt-1 text-[11px] text-slate-400">{item.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className="gap-0 overflow-hidden border-slate-200 py-0">
          <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-white to-indigo-50/50 px-5 py-4">
            <div><CardTitle className="text-sm">Pass / Fail performance trend</CardTitle><p className="mt-1 text-xs text-slate-400">Daily employee audit outcome rate</p></div>
            <div className="flex items-center gap-3 text-xs"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Pass</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Fail</span></div>
          </CardHeader>
          <CardContent className="h-72 p-4">
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
                <defs><linearGradient id="passFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.28} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="failFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 10px 30px rgba(15,23,42,.08)" }} />
                <Area type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={3} fill="url(#passFill)" animationDuration={900} />
                <Area type="monotone" dataKey="fail" stroke="#ef4444" strokeWidth={3} fill="url(#failFill)" animationDuration={1100} />
              </AreaChart>
            </ResponsiveContainer>}
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden border-slate-200 py-0">
          <CardHeader className="border-b bg-gradient-to-r from-white to-sky-50 px-5 py-4"><CardTitle className="text-sm">Disposition quality</CardTitle><p className="mt-1 text-xs text-slate-400">Mismatch contribution by disposition</p></CardHeader>
          <CardContent className="h-72 p-4">
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dispositionData} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[0, 75]} hide />
                <YAxis type="category" dataKey="name" width={92} tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} formatter={(value) => [`${value}%`, "Mismatch"]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={850}>{dispositionData.map(item => <Cell key={item.name} fill={item.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 overflow-hidden border-slate-200 py-0">
        <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-cyan-50 to-blue-50 px-5 py-4">
          <div><CardTitle className="text-sm">Employee audit performance · Date wise</CardTitle><p className="mt-1 text-xs text-slate-500">Use + / − to expand a date. Click an employee row for call-level details.</p></div>
          <Badge variant="outline" className="bg-white"><CalendarDays className="mr-1 h-3.5 w-3.5" />{filteredDays.length} dates</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader className="bg-[#223f66]">
              <TableRow className="hover:bg-[#223f66]"><TableHead className="text-white">Audit date</TableHead><TableHead className="text-center text-white">Total calls</TableHead><TableHead className="text-center text-white">Avg. score</TableHead><TableHead className="text-center text-white">Pass</TableHead><TableHead className="text-center text-white">Fail</TableHead><TableHead className="text-center text-white">Fail %</TableHead><TableHead className="text-center text-white">Email sent</TableHead><TableHead className="text-center text-white">HR actions done</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filteredDays.map(day => {
                const isOpen = expandedDates.has(day.date)
                const pass = day.agents.filter(agent => agent.result === "Pass").length
                const fail = day.agents.filter(agent => agent.result === "Fail").length
                const calls = day.agents.reduce((sum, agent) => sum + agent.calls, 0)
                const score = day.agents.length ? day.agents.reduce((sum, agent) => sum + agent.score, 0) / day.agents.length : 0
                const emailSent = day.agents.filter(agent => agent.emailStatus === "Sent").length
                const actionDone = day.agents.filter(agent => actions[actionKey(day.date, agent.id)]).length
                return [
                  <TableRow key={day.date} onClick={() => toggleDate(day.date)} className="cursor-pointer border-b-blue-200 bg-blue-50/70 hover:bg-blue-100/70">
                    <TableCell><div className="flex items-center gap-3"><Button variant="outline" size="icon" className="h-7 w-7 border-blue-200 bg-white text-blue-600">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button><div><div className="font-semibold text-slate-800">{day.label}</div><div className="text-[11px] text-slate-500">{day.agents.length} employees</div></div></div></TableCell>
                    <TableCell className="text-center font-semibold">{calls}</TableCell><TableCell className="text-center font-semibold">{score.toFixed(2)} / 5</TableCell><TableCell className="text-center font-semibold text-emerald-700">{pass}</TableCell><TableCell className="text-center font-semibold text-red-700">{fail}</TableCell><TableCell className="text-center">{day.agents.length ? ((fail / day.agents.length) * 100).toFixed(1) : "0.0"}%</TableCell><TableCell className="text-center">{emailSent} / {day.agents.length}</TableCell><TableCell className="text-center">{actionDone} / {day.agents.length}</TableCell>
                  </TableRow>,
                  isOpen && (
                    <TableRow key={`${day.date}-agents`} className="hover:bg-white">
                      <TableCell colSpan={8} className="bg-white p-3 sm:p-4">
                        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                          <Table className="min-w-[1120px]">
                            <TableHeader className="bg-slate-800"><TableRow className="hover:bg-slate-800"><TableHead className="text-white">Employee</TableHead><TableHead className="text-center text-white">Calls</TableHead><TableHead className="text-center text-white">Good / Bad</TableHead><TableHead className="text-white">Disposition</TableHead><TableHead className="text-center text-white">Score</TableHead><TableHead className="text-center text-white">Result</TableHead><TableHead className="text-center text-white">Email status</TableHead><TableHead className="text-white">HR action status</TableHead><TableHead className="text-right text-white">Action</TableHead></TableRow></TableHeader>
                            <TableBody>{day.agents.map(agent => {
                              const record = actions[actionKey(day.date, agent.id)]
                              const isSelected = selectedRow?.date === day.date && selectedRow.agent.id === agent.id
                              return <TableRow key={agent.id} onClick={() => setSelectedRow({ date: day.date, agent })} className={`cursor-pointer transition-colors ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                                <TableCell><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">{agent.initials}</span><div><div className="font-semibold text-slate-800">{agent.name}</div><div className="text-[11px] text-slate-400">{agent.id}</div></div></div></TableCell>
                                <TableCell className="text-center">{agent.calls}</TableCell><TableCell className="text-center">{agent.good} / {agent.bad}</TableCell><TableCell>{agent.disposition}</TableCell><TableCell className="text-center font-semibold">{agent.score.toFixed(2)} / 5</TableCell><TableCell className="text-center"><ResultBadge result={agent.result} /></TableCell><TableCell className="text-center"><EmailBadge status={agent.emailStatus} /></TableCell>
                                <TableCell>{record ? <div><Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" />Done</Badge><div className="mt-1 text-[11px] text-slate-500">{record.callingAction || record.verifyStatus}</div>{record.pagarbookUpdated && <div className="text-[11px] font-medium text-emerald-700">Pagarbook updated</div>}</div> : <Badge variant="outline" className="text-amber-700">Pending</Badge>}</TableCell>
                                <TableCell className="text-right"><Button size="sm" disabled={!canWrite || storageAvailable === false} title={!canWrite ? "sales_call_audit.write permission required" : undefined} onClick={event => { event.stopPropagation(); openAction(day.date, agent) }} className={record ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"}>{record ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <ClipboardCheck className="mr-1 h-3.5 w-3.5" />}{record ? "View / Edit" : "Action"}</Button></TableCell>
                              </TableRow>
                            })}</TableBody>
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
      </Card>

      {selectedRow && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 gap-0 overflow-hidden border-indigo-200 py-0 duration-300">
          <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-indigo-50 to-cyan-50 px-5 py-4">
            <div><CardTitle className="text-sm">{selectedRow.agent.name} · Call audit details</CardTitle><p className="mt-1 text-xs text-slate-500">{selectedRow.date} · {selectedRow.agent.id} · Click recording to play</p></div>
            <Button size="sm" variant="outline" disabled={!canWrite || storageAvailable === false} onClick={() => openAction(selectedRow.date, selectedRow.agent)}><ClipboardCheck className="mr-2 h-4 w-4" />HR action</Button>
          </CardHeader>
          {actions[actionKey(selectedRow.date, selectedRow.agent.id)] && (() => {
            const record = actions[actionKey(selectedRow.date, selectedRow.agent.id)]
            return <div className="m-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5"><div><span className="text-xs text-emerald-700">Status</span><div className="font-semibold text-emerald-900">Done · {record.verifyStatus}</div></div><div><span className="text-xs text-emerald-700">HR action</span><div className="font-semibold text-emerald-900">{record.callingAction || "—"}</div></div><div><span className="text-xs text-emerald-700">Half day leave</span><div className="font-semibold text-emerald-900">{record.halfDayLeave ? "Yes" : "No"}</div></div><div><span className="text-xs text-emerald-700">Pagarbook</span><div className="font-semibold text-emerald-900">{record.pagarbookUpdated ? "Updated" : "Pending"}</div></div><div><span className="text-xs text-emerald-700">Remarks</span><div className="font-semibold text-emerald-900">{record.remarks || "No remarks"}</div></div></div>
          })()}
          <div className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader className="bg-slate-50"><TableRow><TableHead>Call time</TableHead><TableHead>Prospect / Lead</TableHead><TableHead>Duration</TableHead><TableHead>Agent disposition</TableHead><TableHead>Verified disposition</TableHead><TableHead className="text-center">KPI score</TableHead><TableHead className="text-center">Result</TableHead><TableHead className="text-right">Recording</TableHead></TableRow></TableHeader><TableBody>{CALL_ROWS.map(call => <TableRow key={call.id}><TableCell>{call.time}</TableCell><TableCell><div className="font-medium">{call.prospect}</div><div className="text-[11px] text-slate-400">{call.id} · synthetic fixture</div></TableCell><TableCell>{call.duration}</TableCell><TableCell>{call.declared}</TableCell><TableCell>{call.verified}</TableCell><TableCell className="text-center font-semibold">{call.score.toFixed(1)} / 5</TableCell><TableCell className="text-center"><ResultBadge result={call.result} /></TableCell><TableCell className="text-right"><Button size="sm" variant={playingCall === call.id ? "default" : "outline"} onClick={() => playSyntheticRecording(call.id)}><Headphones className="mr-1.5 h-3.5 w-3.5" />{playingCall === call.id ? "Playing sample…" : "Listen"}</Button></TableCell></TableRow>)}</TableBody></Table></div>
        </Card>
      )}

      <Card className="gap-0 overflow-hidden border-slate-200 py-0">
        <CardHeader className="flex-row items-center justify-between border-b bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
          <div><CardTitle className="text-sm">Monthly audit summary</CardTitle><p className="mt-1 text-xs text-slate-500">January–December pass/fail and email coverage</p></div>
          <Select value={String(selectedYear)} onValueChange={value => setSelectedYear(Number(value))}><SelectTrigger className="w-28 bg-white"><SelectValue /></SelectTrigger><SelectContent>{[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>
        </CardHeader>
        <div className="overflow-x-auto"><Table className="min-w-[820px]"><TableHeader className="bg-[#223f66]"><TableRow className="hover:bg-[#223f66]"><TableHead className="text-white">Month</TableHead><TableHead className="text-center text-white">Total calls</TableHead><TableHead className="text-center text-white">Audited</TableHead><TableHead className="text-center text-white">Pass</TableHead><TableHead className="text-center text-white">Fail</TableHead><TableHead className="text-center text-white">Fail %</TableHead><TableHead className="text-center text-white">Email sent</TableHead><TableHead className="text-center text-white">Email coverage</TableHead></TableRow></TableHeader><TableBody>{monthlyRows.map(row => <TableRow key={row.month} className={row.audited === 0 ? "text-slate-400" : ""}><TableCell className="font-semibold">{row.month}-{selectedYear}</TableCell><TableCell className="text-center">{row.calls.toLocaleString("en-IN")}</TableCell><TableCell className="text-center">{row.audited}</TableCell><TableCell className="text-center font-medium text-emerald-700">{row.pass}</TableCell><TableCell className="text-center font-medium text-red-700">{row.fail}</TableCell><TableCell className="text-center">{row.failRate.toFixed(1)}%</TableCell><TableCell className="text-center">{row.emailSent}</TableCell><TableCell className="text-center">{row.audited ? ((row.emailSent / row.audited) * 100).toFixed(1) : "0.0"}%</TableCell></TableRow>)}</TableBody></Table></div>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-indigo-600" />HR Calling Audit Action</DialogTitle><DialogDescription>{actionTarget?.agent.name} · {actionTarget?.agent.id} · {actionTarget?.date}</DialogDescription></DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2"><Label>HR Verify Status <span className="text-red-500">*</span></Label><Select value={verifyStatus} onValueChange={setVerifyStatus}><SelectTrigger><SelectValue placeholder="Select HR verification status" /></SelectTrigger><SelectContent><SelectItem value="Verified">Verified</SelectItem><SelectItem value="Need clarification">Need clarification</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label>HR Action for Calling Fail/Pass</Label><Select value={callingAction} onValueChange={setCallingAction}><SelectTrigger><SelectValue placeholder="Select HR action" /></SelectTrigger><SelectContent><SelectItem value="Half day leave">Half day leave</SelectItem><SelectItem value="No action required">No action required</SelectItem><SelectItem value="Coaching required">Coaching required</SelectItem><SelectItem value="Warning issued">Warning issued</SelectItem><SelectItem value="Re-audit required">Re-audit required</SelectItem></SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="other-remarks">Other Remarks</Label><Textarea id="other-remarks" value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="Add HR notes or clarification..." /></div>
            <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3"><Checkbox id="half-day" checked={halfDayLeave} onCheckedChange={checked => setHalfDayLeave(checked === true)} /><div><Label htmlFor="half-day">Half day leave</Label><p className="mt-1 text-xs text-slate-500">Apply half-day attendance action for the audited date.</p></div></div>
              <div className="flex items-start gap-3"><Checkbox id="pagarbook" checked={pagarbookUpdated} onCheckedChange={checked => setPagarbookUpdated(checked === true)} /><div><Label htmlFor="pagarbook">Half day leave updated on Pagarbook</Label><p className="mt-1 text-xs text-slate-500">Confirm only after the attendance entry is updated in Pagarbook.</p></div></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button><Button disabled={savingAction || !canWrite || storageAvailable === false} onClick={() => void saveAction()} className="bg-indigo-600 hover:bg-indigo-700"><Save className="mr-2 h-4 w-4" />{savingAction ? "Saving…" : "Save HR action"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
