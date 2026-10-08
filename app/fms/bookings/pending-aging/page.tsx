"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle, Clock, RefreshCw, Search, ChevronDown, ChevronUp,
  X, TrendingUp, Users, Flame, ShieldAlert, CheckCircle2,
  Calendar, FileText, BanknoteIcon, Trash2, MessageSquare,
  Info, XCircle, ArrowUpRight,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface PendingAgingBooking {
  bookingId: string; guestName: string; sheetName: string; stageName: string
  employee: string; plannedDate: string; agingDays: number
  actionStatus: string; doerRemarks: string; cancelReason: string
}

interface SheetSummary {
  sheetKey: string; sheetName: string
  total: number; normal: number; risky: number; critical: number
  bookings: PendingAgingBooking[]
}

interface EmployeeAgingSummary {
  employee: string; sheets: SheetSummary[]
  totalPending: number; totalCritical: number; totalRisky: number
}

interface ApiSummary {
  total: number; critical: number; risky: number; normal: number
  bySheet: Record<string, number>
}

interface ApiResponse {
  success: boolean; generatedAt?: string; summary?: ApiSummary
  data?: EmployeeAgingSummary[]; error?: string
}

// ── Sheet meta ─────────────────────────────────────────────────────────────

const SHEET_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string; dot: string }> = {
  newBookings:    { label: "New Bookings",    icon: <FileText className="w-3 h-3" />,      color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", dot: "bg-indigo-400" },
  accountVerify:  { label: "Account Verify",  icon: <BanknoteIcon className="w-3 h-3" />,  color: "text-sky-700",    bg: "bg-sky-50",     border: "border-sky-200",    dot: "bg-sky-400" },
  finalTransfer:  { label: "Final Transfer",  icon: <ArrowUpRight className="w-3 h-3" />,  color: "text-violet-700", bg: "bg-violet-50",  border: "border-violet-200", dot: "bg-violet-400" },
  deleteComplete: { label: "Delete Complete", icon: <Trash2 className="w-3 h-3" />,        color: "text-rose-700",   bg: "bg-rose-50",    border: "border-rose-200",   dot: "bg-rose-400" },
}

const SHEET_ORDER = ["newBookings", "accountVerify", "finalTransfer", "deleteComplete"]

// ── Helpers ────────────────────────────────────────────────────────────────

function agingTag(days: number): "normal" | "risky" | "critical" {
  if (days >= 6) return "critical"
  if (days >= 3) return "risky"
  return "normal"
}

function AgingPill({ days }: { days: number }) {
  const tag = agingTag(days)
  const cls = tag === "critical"
    ? "bg-red-100 text-red-700 border-red-300"
    : tag === "risky"
    ? "bg-orange-100 text-orange-700 border-orange-300"
    : "bg-emerald-100 text-emerald-700 border-emerald-300"
  const emoji = tag === "critical" ? "🚨" : tag === "risky" ? "⚠️" : "✅"
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${cls} whitespace-nowrap`}>
      {emoji} {days}d
    </span>
  )
}

function cellColor(value: number, type: "normal" | "risky" | "critical" | "total") {
  if (value === 0) return "text-slate-300"
  if (type === "critical") return "text-red-600 font-bold"
  if (type === "risky") return "text-orange-600 font-semibold"
  if (type === "normal") return "text-emerald-700 font-medium"
  return "text-slate-800 font-semibold"
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, gradient, border, textColor, loading,
  sheetBreakdown, agingType,
}: {
  label: string; value: number; icon: React.ElementType
  gradient: string; border: string; textColor: string; loading: boolean
  sheetBreakdown: { key: string; count: number }[]
  agingType: "total" | "critical" | "risky" | "normal"
}) {
  return (
    <Card className={`border ${border} shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-0">
        {/* Top section */}
        <div className="p-4 flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className={`text-3xl font-black ${textColor} leading-none`}>
              {loading ? <span className="text-slate-300">—</span> : value}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
          </div>
        </div>

        {/* Sheet breakdown */}
        {!loading && (
          <div className="border-t border-slate-100 px-4 pb-3 pt-2.5 space-y-1.5">
            {SHEET_ORDER.map((key) => {
              const item = sheetBreakdown.find(s => s.key === key)
              const count = item?.count ?? 0
              const meta = SHEET_META[key]
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium ${meta.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </div>
                  <span className={`text-[11px] font-bold min-w-[20px] text-right ${
                    count === 0 ? "text-slate-300"
                    : agingType === "critical" ? "text-red-600"
                    : agingType === "risky" ? "text-orange-600"
                    : agingType === "normal" ? "text-emerald-700"
                    : textColor
                  }`}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Popup (raw Radix to bypass sm:max-w-lg limitation) ──────────────────

function BookingPopup({
  open, onClose, employee, sheetName, agingType, bookings,
}: {
  open: boolean; onClose: () => void
  employee: string; sheetName: string; agingType: string
  bookings: PendingAgingBooking[]
}) {
  const tagLabel = agingType === "critical" ? "🚨 Critical"
    : agingType === "risky" ? "⚠️ Risky"
    : agingType === "normal" ? "✅ Normal" : "All Aging"

  const tagCls = agingType === "critical" ? "bg-red-500 text-white"
    : agingType === "risky" ? "bg-orange-500 text-white"
    : agingType === "normal" ? "bg-emerald-500 text-white"
    : "bg-slate-600 text-white"

  const critCount  = bookings.filter(b => agingTag(b.agingDays) === "critical").length
  const riskyCount = bookings.filter(b => agingTag(b.agingDays) === "risky").length
  const normCount  = bookings.filter(b => agingTag(b.agingDays) === "normal").length

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content — full custom, no sm:max-w-lg override */}
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2
            w-[96vw] max-w-6xl max-h-[90vh]
            flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-200
            bg-white
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
            duration-200"
        >
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="font-black text-white text-base truncate">{employee}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300 text-sm font-medium">{sheetName}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${tagCls}`}>
                  {tagLabel}
                </span>
              </div>
              <DialogPrimitive.Close className="text-slate-400 hover:text-white transition-colors shrink-0 mt-0.5">
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            {/* Mini summary bar */}
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs text-slate-400">{bookings.length} booking(s)</span>
              <div className="flex items-center gap-3">
                {critCount > 0  && <span className="text-xs font-bold text-red-400">🚨 {critCount} Critical</span>}
                {riskyCount > 0 && <span className="text-xs font-bold text-orange-400">⚠️ {riskyCount} Risky</span>}
                {normCount > 0  && <span className="text-xs font-bold text-emerald-400">✅ {normCount} Normal</span>}
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="overflow-auto flex-1 min-h-0">
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <CheckCircle2 className="h-10 w-10 text-emerald-300" />
                <p className="text-sm font-medium">No bookings in this category</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse" style={{ minWidth: 820 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 border-b-2 border-slate-200">
                    {["#", "Booking ID", "Guest Name", "Planned Date / Time", "Aging", "Action Status", "Doer Remarks", "Cancel Reason"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, idx) => {
                    const isCancelled = (b.actionStatus || "").toLowerCase().includes("cancel")
                    const rowBg = idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    const tag = agingTag(b.agingDays)
                    const rowAccent = tag === "critical" ? "border-l-4 border-l-red-400"
                      : tag === "risky" ? "border-l-4 border-l-orange-400"
                      : "border-l-4 border-l-emerald-300"
                    return (
                      <tr key={`${b.bookingId}-${idx}`}
                        className={`${rowBg} ${rowAccent} border-b border-slate-100 hover:bg-blue-50/30 transition-colors`}
                      >
                        {/* # */}
                        <td className="px-4 py-3 text-slate-400 text-xs w-8">{idx + 1}</td>

                        {/* Booking ID */}
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-indigo-700 text-xs bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 whitespace-nowrap">
                            {b.bookingId}
                          </span>
                        </td>

                        {/* Guest Name */}
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{b.guestName}</td>

                        {/* Planned Date */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{b.plannedDate || "—"}</span>
                          </div>
                        </td>

                        {/* Aging */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <AgingPill days={b.agingDays} />
                        </td>

                        {/* Action Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {b.actionStatus ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${
                              isCancelled
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              {isCancelled ? <XCircle className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                              {b.actionStatus}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Doer Remarks */}
                        <td className="px-4 py-3 max-w-[180px]">
                          {b.doerRemarks ? (
                            <div className="flex items-start gap-1 text-xs text-slate-600">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                              <span className="line-clamp-2">{b.doerRemarks}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Cancel Reason */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {b.cancelReason ? (
                            <div className="flex items-start gap-1 text-xs text-red-600">
                              <XCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{b.cancelReason}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Critical: {critCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Risky: {riskyCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Normal: {normCount}</span>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">Close</Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PendingAgingTrackerPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin" || user?.role === "super_admin"

  const [data, setData]       = useState<EmployeeAgingSummary[]>([])
  const [summary, setSummary] = useState<ApiSummary>({ total: 0, critical: 0, risky: 0, normal: 0, bySheet: {} })
  const [generatedAt, setGeneratedAt] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterSheet, setFilterSheet] = useState("all")
  const [filterAging, setFilterAging] = useState("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [popup, setPopup]     = useState<{ open: boolean; employee: string; sheetName: string; agingType: string; bookings: PendingAgingBooking[] }>(
    { open: false, employee: "", sheetName: "", agingType: "", bookings: [] }
  )

  async function fetchData() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch("/api/ktahv-bookings/pending-aging", { cache: "no-store" })
      const json: ApiResponse = await res.json()
      if (!json.success) throw new Error(json.error || "Failed to load")
      setData(json.data ?? [])
      setSummary(json.summary ?? { total: 0, critical: 0, risky: 0, normal: 0, bySheet: {} })
      setGeneratedAt(json.generatedAt ?? "")
    } catch (e: any) { setError(e.message ?? "Unknown error") }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const visibleData = useMemo(() => {
    let rows = data
    if (!isAdmin) rows = rows.filter(e => e.employee.toLowerCase() === (user?.name ?? "").toLowerCase())
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter(e =>
        e.employee.toLowerCase().includes(q) ||
        e.sheets.some(s => s.sheetName.toLowerCase().includes(q) || s.bookings.some(b => b.bookingId.toLowerCase().includes(q) || b.guestName.toLowerCase().includes(q)))
      )
    }
    if (filterSheet !== "all") rows = rows.map(e => ({ ...e, sheets: e.sheets.filter(s => s.sheetKey === filterSheet) })).filter(e => e.sheets.length > 0)
    if (filterAging !== "all") rows = rows.map(e => ({
      ...e, sheets: e.sheets.filter(s =>
        filterAging === "critical" ? s.critical > 0 : filterAging === "risky" ? s.risky > 0 : s.normal > 0
      )
    })).filter(e => e.sheets.length > 0)
    return rows
  }, [data, isAdmin, user, searchQuery, filterSheet, filterAging])

  function openPopup(employee: string, sheet: SheetSummary, agingType: "all" | "normal" | "risky" | "critical") {
    const bookings = agingType === "all" ? sheet.bookings : sheet.bookings.filter(b => agingTag(b.agingDays) === agingType)
    setPopup({ open: true, employee, sheetName: sheet.sheetName, agingType, bookings })
  }

  function toggleRow(key: string) {
    setExpandedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const lastUpdated = generatedAt
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(generatedAt))
    : ""

  const grandNormal = summary.total - summary.critical - summary.risky

  // Build sheet-breakdown arrays for each KPI card
  function sheetBreakdownFor(agingType: "total" | "critical" | "risky" | "normal") {
    return SHEET_ORDER.map(key => {
      let count = 0
      for (const emp of data) {
        const sheet = emp.sheets.find(s => s.sheetKey === key)
        if (!sheet) continue
        if (agingType === "total")    count += sheet.total
        if (agingType === "critical") count += sheet.critical
        if (agingType === "risky")    count += sheet.risky
        if (agingType === "normal")   count += sheet.normal
      }
      return { key, count }
    })
  }

  const kpiCards = [
    { label: "Total Pending",       value: summary.total,    icon: Users,        gradient: "from-indigo-500 to-indigo-700", border: "border-indigo-200", textColor: "text-indigo-700", agingType: "total"    as const },
    { label: "🚨 Critical (6+ d)",  value: summary.critical, icon: Flame,        gradient: "from-red-500 to-red-700",      border: "border-red-200",    textColor: "text-red-700",    agingType: "critical" as const },
    { label: "⚠️ Risky (3-5 d)",    value: summary.risky,    icon: AlertTriangle, gradient: "from-orange-500 to-orange-700", border: "border-orange-200", textColor: "text-orange-700", agingType: "risky"    as const },
    { label: "✅ Normal (1-2 d)",   value: grandNormal,      icon: CheckCircle2,  gradient: "from-emerald-500 to-emerald-700", border: "border-emerald-200", textColor: "text-emerald-700", agingType: "normal" as const },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-5">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md shrink-0">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">KTAHV Pending Stage Aging Tracker</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Employee-wise overdue bookings · Color-coded aging alerts
              {lastUpdated && <> · Updated: {lastUpdated} IST</>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="flex items-center gap-2 self-start md:self-auto h-9">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI CARDS — all 4 with same design + sheet breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpiCards.map(kpi => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            gradient={kpi.gradient}
            border={kpi.border}
            textColor={kpi.textColor}
            loading={loading}
            agingType={kpi.agingType}
            sheetBreakdown={sheetBreakdownFor(kpi.agingType)}
          />
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9 text-sm h-9" placeholder="Search employee, booking ID, guest…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}><X className="h-4 w-4 text-slate-400 hover:text-slate-600" /></button>}
        </div>
        <Select value={filterSheet} onValueChange={setFilterSheet}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Sheet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sheets</SelectItem>
            {SHEET_ORDER.map(k => <SelectItem key={k} value={k}>{SHEET_META[k].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAging} onValueChange={setFilterAging}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Aging" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Aging</SelectItem>
            <SelectItem value="critical">🚨 Critical (6+ days)</SelectItem>
            <SelectItem value="risky">⚠️ Risky (3-5 days)</SelectItem>
            <SelectItem value="normal">✅ Normal (1-2 days)</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || filterSheet !== "all" || filterAging !== "all") && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearchQuery(""); setFilterSheet("all"); setFilterAging("all") }}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* MAIN TABLE */}
      {loading ? (
        <Card className="p-8"><div className="flex flex-col items-center justify-center gap-4 py-12"><RefreshCw className="h-10 w-10 animate-spin text-indigo-500" /><p className="text-slate-500 font-medium">Loading aging data…</p></div></Card>
      ) : error ? (
        <Card className="p-8 border-red-200 bg-red-50"><div className="flex flex-col items-center gap-3 py-6 text-red-700"><AlertTriangle className="h-8 w-8" /><p className="font-semibold">Failed to load data</p><p className="text-sm">{error}</p><Button variant="outline" size="sm" onClick={fetchData}>Retry</Button></div></Card>
      ) : visibleData.length === 0 ? (
        <Card className="p-8 border-emerald-200 bg-emerald-50"><div className="flex flex-col items-center gap-3 py-6 text-emerald-700"><CheckCircle2 className="h-10 w-10" /><p className="font-semibold text-lg">All Clear! No pending aging bookings.</p></div></Card>
      ) : (
        <Card className="overflow-hidden shadow-md border-slate-200">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Employee-wise Aging — {visibleData.length} employee(s) with pending items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-amber-50 border-b-2 border-amber-200">
                    <th className="text-left px-4 py-3 font-bold text-slate-800 border-r border-amber-200 w-52">Employee</th>
                    <th className="text-left px-3 py-3 font-bold text-slate-700 border-r border-amber-200">Sheets Active</th>
                    <th className="text-center px-3 py-3 font-bold text-slate-700 border-r border-amber-200">Total</th>
                    <th className="text-center px-3 py-3 font-bold text-emerald-700 border-r border-amber-200">✅ Normal<br /><span className="text-[10px] font-normal text-slate-400">1-2 days</span></th>
                    <th className="text-center px-3 py-3 font-bold text-orange-600 border-r border-amber-200">⚠️ Risky<br /><span className="text-[10px] font-normal text-slate-400">3-5 days</span></th>
                    <th className="text-center px-3 py-3 font-bold text-red-600">🚨 Critical<br /><span className="text-[10px] font-normal text-slate-400">6+ days</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleData.map((emp, empIdx) => {
                    const rowKey = emp.employee
                    const isExpanded = expandedRows.has(rowKey)
                    const rowBg = empIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    const empNormal = emp.totalPending - emp.totalCritical - emp.totalRisky
                    return (
                      <>
                        <tr key={`emp-${rowKey}`}
                          className={`${rowBg} border-b border-slate-200 cursor-pointer hover:bg-indigo-50/40 transition-colors`}
                          onClick={() => toggleRow(rowKey)}
                        >
                          <td className="px-4 py-3 border-r border-slate-200">
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-indigo-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">{emp.employee}</div>
                                <div className="text-[11px] text-slate-400">{emp.sheets.length} sheet(s)</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 border-r border-slate-200">
                            <div className="flex flex-wrap gap-1">
                              {emp.sheets.map(s => {
                                const m = SHEET_META[s.sheetKey]
                                return (
                                  <span key={s.sheetKey} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${m.bg} ${m.color} border ${m.border}`}>
                                    {m.icon} {m.label}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center border-r border-slate-200"><span className={`text-base ${cellColor(emp.totalPending, "total")}`}>{emp.totalPending}</span></td>
                          <td className="px-3 py-3 text-center border-r border-slate-200"><span className={`text-base ${cellColor(empNormal, "normal")}`}>{empNormal}</span></td>
                          <td className="px-3 py-3 text-center border-r border-slate-200"><span className={`text-base ${cellColor(emp.totalRisky, "risky")}`}>{emp.totalRisky}</span></td>
                          <td className="px-3 py-3 text-center"><span className={`text-base ${cellColor(emp.totalCritical, "critical")}`}>{emp.totalCritical}</span></td>
                        </tr>

                        {isExpanded && emp.sheets.map((sheet, shIdx) => {
                          const meta = SHEET_META[sheet.sheetKey]
                          return (
                            <tr key={`sheet-${rowKey}-${sheet.sheetKey}-${shIdx}`}
                              className="bg-slate-50 border-b border-slate-100"
                            >
                              <td className="px-4 py-2.5 border-r border-slate-100 pl-12">
                                <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.color}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {sheet.sheetName}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 border-r border-slate-100">
                                <button className="text-xs text-indigo-500 hover:text-indigo-800 underline" onClick={e => { e.stopPropagation(); openPopup(emp.employee, sheet, "all") }}>
                                  View all {sheet.total} →
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-center border-r border-slate-100">
                                <button className={`text-sm font-semibold hover:underline ${cellColor(sheet.total, "total")}`} onClick={e => { e.stopPropagation(); openPopup(emp.employee, sheet, "all") }}>{sheet.total}</button>
                              </td>
                              <td className="px-3 py-2.5 text-center border-r border-slate-100">
                                {sheet.normal > 0 ? <button className={`text-sm font-semibold hover:underline ${cellColor(sheet.normal, "normal")}`} onClick={e => { e.stopPropagation(); openPopup(emp.employee, sheet, "normal") }}>{sheet.normal}</button> : <span className="text-slate-300">0</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center border-r border-slate-100">
                                {sheet.risky > 0 ? <button className={`text-sm font-bold hover:underline ${cellColor(sheet.risky, "risky")}`} onClick={e => { e.stopPropagation(); openPopup(emp.employee, sheet, "risky") }}>{sheet.risky}</button> : <span className="text-slate-300">0</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                {sheet.critical > 0 ? <button className={`text-sm font-bold hover:underline ${cellColor(sheet.critical, "critical")}`} onClick={e => { e.stopPropagation(); openPopup(emp.employee, sheet, "critical") }}>{sheet.critical}</button> : <span className="text-slate-300">0</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    )
                  })}

                  {/* Grand Total */}
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-900 border-t-2 border-slate-900">
                    <td className="px-4 py-2.5 font-bold text-white border-r border-slate-600" colSpan={2}>Grand Total</td>
                    <td className="px-3 py-2.5 text-center font-black text-white border-r border-slate-600 text-base">{summary.total}</td>
                    <td className="px-3 py-2.5 text-center font-black text-emerald-300 border-r border-slate-600 text-base">{grandNormal}</td>
                    <td className="px-3 py-2.5 text-center font-black text-orange-300 border-r border-slate-600 text-base">{summary.risky}</td>
                    <td className="px-3 py-2.5 text-center font-black text-red-300 text-base">{summary.critical}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LEGEND */}
      <div className="flex flex-wrap gap-5 text-xs text-slate-500 justify-center pb-2">
        {[
          { dot: "bg-emerald-500", label: "Normal (1-2 days) — monitor" },
          { dot: "bg-orange-500",  label: "Risky (3-5 days) — action needed" },
          { dot: "bg-red-500",     label: "Critical (6+ days) — escalate immediately" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.dot}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* POPUP */}
      <BookingPopup
        open={popup.open}
        onClose={() => setPopup(p => ({ ...p, open: false }))}
        employee={popup.employee}
        sheetName={popup.sheetName}
        agingType={popup.agingType}
        bookings={popup.bookings}
      />
    </div>
  )
}
