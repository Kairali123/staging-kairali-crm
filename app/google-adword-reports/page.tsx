"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useAdwordReports } from "@/hooks/use-adword-reports"
import type { Company, SortKey, CampaignRow } from "@/hooks/use-adword-reports"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import {
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Calendar,
  TrendingUp,
  Target,
  IndianRupee,
  Eye,
  MousePointerClick,
  BarChart3,
  Percent,
  Wallet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Filter,
  Search,
  X,
  Activity,
  TableIcon,
  LineChart as LineChartIcon,
  TrendingDown,
  Layers,
} from "lucide-react"
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
} from "recharts"

// ─── UI-only config ──────────────────────────────────────────────────────────

const COMPANY_CONFIG: Record<
  Company,
  {
    label: string
    headerGradient: string
    tableHeader: string
    accentFrom: string
    accentTo: string
    // Extended CRM color tokens
    hex: { primary: string; secondary: string; light: string; border: string; text: string }
    tw: {
      bg: string          // solid bg  e.g. bg-blue-600
      bgLight: string     // light bg  e.g. bg-blue-50
      text: string        // text color e.g. text-blue-700
      textBold: string    // bold accent text e.g. text-blue-600
      border: string      // border e.g. border-blue-200
      ring: string        // focus ring e.g. focus:ring-blue-500
      badge: string       // badge combo classes
      tabActive: string   // active tab button classes
      btnPrimary: string  // primary action button
      gradClip: string    // bg-gradient-to-r + clip-text combo for title
    }
  }
> = {
  KTAHV: {
    label: "Kairali Ayurvedic",
    headerGradient: "from-slate-700 via-slate-600 to-green-700",
    tableHeader: "from-slate-700 to-slate-800",
    accentFrom: "from-green-500",
    accentTo: "to-teal-500",
    hex: {
      primary: "#4ade80",
      secondary: "#2dd4bf",
      light: "#f0fdf4",
      border: "#bbf7d0",
      text: "#16a34a"
    },
    tw: {
      bg: "bg-green-400",
      bgLight: "bg-green-50/60",
      text: "text-green-700",
      textBold: "text-green-600",
      border: "border-green-100",
      ring: "focus:ring-green-400 focus:ring-opacity-50",
      badge: "bg-green-50 text-green-700 border border-green-100",
      tabActive: "bg-white text-slate-800 shadow-sm border border-green-100",
      btnPrimary: "bg-green-500 hover:bg-green-600 text-white shadow-sm",
      gradClip: "bg-gradient-to-r from-green-500 to-teal-400 bg-clip-text text-transparent",
    },
  },

  KAPPL: {
    label: "KAPPL Wellness",
    headerGradient: "from-slate-700 via-slate-600 to-teal-700",
    tableHeader: "from-slate-700 to-slate-800",
    accentFrom: "from-teal-500",
    accentTo: "to-emerald-500",
    hex: {
      primary: "#14b8a6",
      secondary: "#10b981",
      light: "#f0fdfb",
      border: "#ccfbf1",
      text: "#0f766e"
    },
    tw: {
      bg: "bg-teal-500",
      bgLight: "bg-teal-50/60",
      text: "text-teal-700",
      textBold: "text-teal-600",
      border: "border-teal-100",
      ring: "focus:ring-teal-400 focus:ring-opacity-50",
      badge: "bg-teal-50 text-teal-700 border border-teal-100",
      tabActive: "bg-white text-slate-800 shadow-sm border border-teal-100",
      btnPrimary: "bg-teal-500 hover:bg-teal-600 text-white shadow-sm",
      gradClip: "bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent",
    },
  },

  VILLARAAG: {
    label: "Villa Raag Resort",
    headerGradient: "from-slate-700 via-stone-600 to-amber-800",
    tableHeader: "from-stone-700 to-stone-800",
    accentFrom: "from-amber-700",
    accentTo: "to-stone-600",
    hex: {
      primary: "#92400e",
      secondary: "#78350f",
      light: "#fffbeb",
      border: "#fde68a",
      text: "#b45309"
    },
    tw: {
      bg: "bg-amber-800",
      bgLight: "bg-amber-50/60",
      text: "text-amber-800",
      textBold: "text-amber-700",
      border: "border-amber-200",
      ring: "focus:ring-amber-500 focus:ring-opacity-50",
      badge: "bg-amber-50 text-amber-800 border border-amber-200",
      tabActive: "bg-white text-slate-800 shadow-sm border border-amber-200",
      btnPrimary: "bg-amber-700 hover:bg-amber-800 text-white shadow-sm",
      gradClip: "bg-gradient-to-r from-amber-700 to-stone-600 bg-clip-text text-transparent",
    },
  },
}
// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtRs(v: number) {
  if (!v || isNaN(v)) return "₹0"
  return `₹${v.toLocaleString("en-IN")}`
}
function fmtNum(v: number, d = 2) { return !v || isNaN(v) ? "0" : v.toFixed(d) }

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const startOfWeek = (d: Date) => {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.getFullYear(), d.getMonth(), diff)
  }
  switch (preset) {
    case "today": { const t = fmt(now); return { from: t, to: t } }
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate() - 1); const t = fmt(y); return { from: t, to: t } }
    case "this_week": { const s = startOfWeek(now); return { from: fmt(s), to: fmt(now) } }
    case "last_week": { const s = startOfWeek(now); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return { from: fmt(s), to: fmt(e) } }
    case "this_month": { const s = new Date(now.getFullYear(), now.getMonth(), 1); return { from: fmt(s), to: fmt(now) } }
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: fmt(s), to: fmt(e) } }
    case "this_year": { const s = new Date(now.getFullYear(), 0, 1); return { from: fmt(s), to: fmt(now) } }
    case "last_year": { const s = new Date(now.getFullYear() - 1, 0, 1); const e = new Date(now.getFullYear() - 1, 11, 31); return { from: fmt(s), to: fmt(e) } }
    default: return { from: "", to: "" }
  }
}

// ─── CSV Download helper ──────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Loader ───────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="fixed inset-0 z-[30] flex items-center justify-center bg-white pointer-events-auto">
      <div className="flex flex-col items-center gap-6">
        <img src="/grouploader.gif" alt="Loading" className="w-48 h-auto object-contain" />
        <p className="text-base font-semibold text-slate-700">Loading Campaign Data...</p>
      </div>
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-4 sm:px-5 py-5">
        <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="min-h-[140px] rounded-2xl border border-slate-200 bg-slate-50 animate-pulse p-5">
              <div className="h-8 w-8 rounded-xl bg-slate-200 mb-4" />
              <div className="h-3 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-5 w-20 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

// ─── Reusable Section Header ──────────────────────────────────────────────────

function SectionHeader({
  accentFrom, accentTo, icon: Icon, title, subtitle, right,
}: {
  accentFrom: string
  accentTo: string
  icon: React.ElementType
  title: React.ReactNode
  subtitle?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center shadow-md shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {right && <div className="w-full sm:w-auto shrink-0">{right}</div>}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50]

interface PaginationProps {
  total: number; page: number; rowsPerPage: number
  onPageChange: (p: number) => void; onRowsPerPageChange: (r: number) => void
  btnPrimary?: string
}

function Pagination({ total, page, rowsPerPage, onPageChange, onRowsPerPageChange, btnPrimary = "bg-blue-600 hover:bg-blue-700 text-white" }: PaginationProps) {
  const [goToValue, setGoToValue] = useState("")
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage))
  const start = total === 0 ? 0 : (page - 1) * rowsPerPage + 1
  const end = Math.min(page * rowsPerPage, total)

  useEffect(() => { setGoToValue("") }, [page])

  const handleGo = useCallback(() => {
    const n = parseInt(goToValue, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) { onPageChange(n); setGoToValue("") }
  }, [goToValue, totalPages, onPageChange])

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3 rounded-b-2xl overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="font-medium text-xs text-slate-600">Rows</span>
          <select
            aria-label="Rows per page"
            value={rowsPerPage}
            onChange={e => { onRowsPerPageChange(Number(e.target.value)); onPageChange(1) }}
            className={`h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 ${btnPrimary.includes("emerald") ? "focus:ring-emerald-500" : btnPrimary.includes("violet") ? "focus:ring-violet-500" : "focus:ring-blue-500"}`}
          >
            {ROWS_PER_PAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <span className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of{" "}
            <span className="font-semibold text-slate-700">{total}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-600">Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span></span>
          <div className="flex items-center gap-1">
            <input
              aria-label="Go to page"
              type="number" min={1} max={totalPages} value={goToValue}
              onChange={e => setGoToValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleGo() } }}
              placeholder="Go"
              className={`w-16 h-9 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 ${btnPrimary.includes("emerald") ? "focus:ring-emerald-500" : btnPrimary.includes("violet") ? "focus:ring-violet-500" : "focus:ring-blue-500"} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <button onClick={handleGo} className={`h-9 px-3 rounded-md text-sm font-semibold transition ${btnPrimary}`}>Go</button>
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-end gap-2">
          <button onClick={() => onPageChange(Math.max(page - 1, 1))} disabled={page <= 1} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Previous</button>
          <button onClick={() => onPageChange(Math.min(page + 1, totalPages))} disabled={page >= totalPages} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 min-w-[160px]">
      <p className="text-xs font-bold text-slate-700 mb-2 border-b border-slate-100 pb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-bold text-slate-800">
            {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value?.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Graph View Component ─────────────────────────────────────────────────────
function GraphView({ chartData, topCampaignsData, computedGrandTotals, cfg, filteredGroups }: {
  chartData: any[]
  topCampaignsData: any[]
  computedGrandTotals: any
  cfg: any
  filteredGroups: any[]
}) {
  const [activeMetric, setActiveMetric] = useState<"traffic" | "cost" | "conversion" | "efficiency">("traffic")

  const CHART_COLORS = {
    impressions: "#0ea5e9",
    clicks: "#06b6d4",
    cost: "#ef4444",
    conversions: "#22c55e",
    convValue: "#10b981",
    ctr: "#f59e0b",
    avgCpc: "#f97316",
    costPerConv: "#a855f7",
    impShare: "#64748b",
    budget: "#8b5cf6",
  }

  const metricTabs = [
    { key: "traffic", label: "Traffic", icon: Eye, desc: "Impressions & Clicks over time" },
    { key: "cost", label: "Spend", icon: IndianRupee, desc: "Cost & Budget over time" },
    { key: "conversion", label: "Conversions", icon: Target, desc: "Conversions & Conv. Value over time" },
    { key: "efficiency", label: "Efficiency", icon: Percent, desc: "CTR, Avg CPC & Cost/Conv over time" },
  ] as const

  const fmtTooltip = (val: number, name: string) => {
    if (name === "Cost" || name === "Conv. Value" || name === "Budget") return `₹${val?.toLocaleString("en-IN")}`
    if (name === "CTR" || name === "Imp. Share") return `${val}%`
    if (name === "Avg CPC" || name === "Cost/Conv") return `₹${val}`
    return val?.toLocaleString("en-IN")
  }

  const noData = chartData.length === 0

  // Summary stat cards for graph view
  const summaryStats = [
    { label: "Total Spend", value: `₹${computedGrandTotals.cost.toLocaleString("en-IN")}`, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    { label: "Total Clicks", value: computedGrandTotals.clicks.toLocaleString("en-IN"), color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
    { label: "Conversions", value: computedGrandTotals.conversions.toLocaleString("en-IN"), color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
    { label: "Conv. Value", value: `₹${computedGrandTotals.convValue.toLocaleString("en-IN")}`, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Total CTR", value: `${computedGrandTotals.avgCtr.toFixed(2)}`, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Total Cost/Conv", value: `₹${computedGrandTotals.costPerConversion.toFixed(2)}`, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  ]

  return (
    <div className="px-4 sm:px-5 py-5 space-y-6">

      {/* Summary mini-cards — company accent top stripe */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summaryStats.map(s => (
          <div
            key={s.label}
            className={`rounded-xl border ${s.border} ${s.bg} px-3 py-3 flex flex-col gap-0.5 relative overflow-hidden`}
          >
            {/* top accent stripe using company primary color */}
            <span className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ backgroundColor: cfg.hex.primary }} />
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wide mt-1">{s.label}</span>
            <span className={`text-sm font-extrabold ${s.color} truncate`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Metric Tab Switcher */}
      <div className="flex flex-wrap gap-2">
        {metricTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveMetric(tab.key)}
            style={activeMetric === tab.key ? { backgroundColor: cfg.hex.primary, borderColor: cfg.hex.primary } : {}}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${activeMetric === tab.key
              ? "text-white shadow-md"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
              }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {noData ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <BarChart3 className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">No data to display</p>
        </div>
      ) : (
        <>
          {/* ── Main Time-series Chart ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {metricTabs.find(t => t.key === activeMetric)?.label} Trend
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {metricTabs.find(t => t.key === activeMetric)?.desc} · {chartData.length} days
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={280}>
                {activeMetric === "traffic" ? (
                  // Image-1 style: clean single-color bar chart per metric
                  // Impressions = deep sky bars | Clicks = teal bars — split on dual Y
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                    <defs>
                      <linearGradient id="impBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0369a1" stopOpacity={1} />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.85} />
                      </linearGradient>
                      <linearGradient id="clkBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0e7490" stopOpacity={1} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="shortDate"
                      tick={{ fontSize: 10, fill: "#64748b", fontWeight: 500 }}
                      tickLine={false}
                      axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="imp"
                      tick={{ fontSize: 10, fill: "#0369a1" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <YAxis
                      yAxisId="clk"
                      orientation="right"
                      tick={{ fontSize: 10, fill: "#0e7490" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtTooltip} />} />
                    <Legend iconType="square" iconSize={11} wrapperStyle={{ fontSize: "11px", paddingTop: "14px" }} />
                    <Bar yAxisId="imp" dataKey="impressions" name="Impressions" fill="url(#impBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="clk" dataKey="clicks" name="Clicks" fill="url(#clkBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </ComposedChart>
                ) : activeMetric === "cost" ? (
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtTooltip} />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Bar dataKey="budget" name="Budget" fill={CHART_COLORS.budget} fillOpacity={0.25} radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="cost" name="Cost" stroke={CHART_COLORS.cost} strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                ) : activeMetric === "conversion" ? (
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtTooltip} />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Bar yAxisId="left" dataKey="conversions" name="Conversions" fill={CHART_COLORS.conversions} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
                    <Line yAxisId="right" type="monotone" dataKey="convValue" name="Conv. Value" stroke={CHART_COLORS.convValue} strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtTooltip} />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                    <Line yAxisId="left" type="monotone" dataKey="ctr" name="CTR" stroke={CHART_COLORS.ctr} strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    <Line yAxisId="right" type="monotone" dataKey="avgCpc" name="Avg CPC" stroke={CHART_COLORS.avgCpc} strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="costPerConv" name="Cost/Conv" stroke={CHART_COLORS.costPerConv} strokeWidth={2} dot={false} strokeDasharray="6 3" />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Bottom row: Top Campaigns Bar + Channel Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Top Campaigns by Cost — Distinct color per bar */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">Top Campaigns by Spend</p>
                <p className="text-xs text-slate-400 mt-0.5">Top 8 campaigns · cost comparison</p>
              </div>
              <div className="p-4 sm:p-5">
                {(() => {
                  const SPEND_COLORS = ["#dc2626", "#ea580c", "#d97706", "#16a34a", "#0891b2", "#2563eb", "#7c3aed", "#db2777"]
                  return (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={topCampaignsData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }} barCategoryGap="20%">
                        <defs>
                          {SPEND_COLORS.map((color, i) => (
                            <linearGradient key={i} id={`spendGrad${i}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="0" vertical={true} horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#475569", fontWeight: 500 }} tickLine={false} axisLine={false} width={115} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />} />
                        <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                          {topCampaignsData.map((_, i) => (
                            <Cell key={i} fill={`url(#spendGrad${i % SPEND_COLORS.length})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </div>
            </div>

            {/* Top Campaigns by Clicks — Pie Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">Top Campaigns by Clicks</p>
                <p className="text-xs text-slate-400 mt-0.5">Top 8 campaigns · click share distribution</p>
              </div>
              <div className="p-4 sm:p-5">
                {(() => {
                  const PIE_COLORS = ["#06b6d4", "#0ea5e9", "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f97316", "#22c55e"]
                  const totalClicks = topCampaignsData.reduce((s, d) => s + d.clicks, 0)
                  const RADIAN = Math.PI / 180
                  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                    if (percent < 0.04) return null
                    const r = innerRadius + (outerRadius - innerRadius) * 0.55
                    const x = cx + r * Math.cos(-midAngle * RADIAN)
                    const y = cy + r * Math.sin(-midAngle * RADIAN)
                    return (
                      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    )
                  }
                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={topCampaignsData}
                            dataKey="clicks"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            labelLine={false}
                            label={renderLabel}
                          >
                            {topCampaignsData.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [value.toLocaleString("en-IN"), name]}
                            contentStyle={{ fontSize: "11px", borderRadius: "10px", border: "1px solid #e2e8f0" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Custom legend */}
                      <div className="flex flex-col gap-1.5 min-w-0 w-full sm:w-auto sm:max-w-[180px] shrink-0">
                        {topCampaignsData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-[10px] text-slate-600 truncate flex-1" title={d.name}>{d.name}</span>
                            <span className="text-[10px] font-bold text-slate-800 shrink-0 tabular-nums">
                              {totalClicks > 0 ? `${((d.clicks / totalClicks) * 100).toFixed(1)}%` : "0%"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

          </div>

          {/* ── Impressions vs Cost — Histogram + Curve Overlay (Image 2 style) ── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">Impressions vs Cost — Histogram</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bars = Impressions · Curve overlay = Cost trend · dual axis</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "linear-gradient(180deg,#0369a1,#7dd3fc)" }} />Impressions</span>
                  <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 inline-block rounded" style={{ background: "#dc2626", borderTop: "2px dashed #dc2626" }} />Cost</span>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }} barCategoryGap="6%">
                  <defs>
                    <linearGradient id="histImpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0369a1" stopOpacity={0.95} />
                      <stop offset="60%" stopColor="#38bdf8" stopOpacity={0.75} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="imp"
                    tick={{ fontSize: 10, fill: "#0369a1" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <YAxis
                    yAxisId="cost"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "#dc2626" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<ChartTooltip valueFormatter={fmtTooltip} />} />
                  {/* Histogram bars — Impressions */}
                  <Bar
                    yAxisId="imp"
                    dataKey="impressions"
                    name="Impressions"
                    fill="url(#histImpGrad)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={40}
                  />
                  {/* Smooth curve overlay — Cost (Image 2 style) */}
                  <Line
                    yAxisId="cost"
                    type="monotoneX"
                    dataKey="cost"
                    name="Cost"
                    stroke="#dc2626"
                    strokeWidth={3}
                    dot={false}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoogleAdwordReportsPage() {
  const {
    rawRows, sortedGroups, grandTotals, uniqueCampaignCount,
    selectedCompany, loading, error, lastFetched, expandedDates,
    sortKey, sortDir, fromDate, toDate, setFromDate, setToDate,
    handleCompanyChange, toggleDate, handleSort, clearDateFilter, refresh,
  } = useAdwordReports()

  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [channelFilter, setChannelFilter] = useState("all")
  const [datePreset, setDatePreset] = useState("all")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [activeView, setActiveView] = useState<"table" | "graph">("table")

  const tableRef = useRef<HTMLDivElement>(null)
  const cfg = COMPANY_CONFIG[selectedCompany]

  // ─── Date preset ─────────────────────────────────────────────────────────────
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset)
    if (preset === "all") { setFromDate(""); setToDate("") }
    else if (preset !== "custom") { const { from, to } = getDateRange(preset); setFromDate(from); setToDate(to) }
  }
  const handleCustomFrom = (v: string) => { setCustomFrom(v); setDatePreset("custom"); setFromDate(v) }
  const handleCustomTo = (v: string) => { setCustomTo(v); setDatePreset("custom"); setToDate(v) }

  // ─── Unique dropdown values ───────────────────────────────────────────────────
  const uniqueStatuses = useMemo(() => {
    const s = new Set<string>(); rawRows.forEach(r => { if (r.status) s.add(r.status) }); return Array.from(s)
  }, [rawRows])

  const uniqueChannels = useMemo(() => {
    const s = new Set<string>(); rawRows.forEach(r => { if (r.channelType) s.add(r.channelType) }); return Array.from(s)
  }, [rawRows])

  // ─── Client-side filtering ────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    if (!searchQuery && statusFilter === "all" && channelFilter === "all") return sortedGroups
    const q = searchQuery.toLowerCase().trim()
    return sortedGroups.map(group => {
      const filteredCampaigns = group.campaigns.filter(row => {
        const matchSearch = !q || (row.campaignName?.toLowerCase().includes(q)) || (row.campaignId?.toLowerCase().includes(q)) || (row.biddingStrategy?.toLowerCase().includes(q))
        const matchStatus = statusFilter === "all" || row.status?.toUpperCase() === statusFilter.toUpperCase()
        const matchChannel = channelFilter === "all" || row.channelType === channelFilter
        return matchSearch && matchStatus && matchChannel
      })
      return { ...group, campaigns: filteredCampaigns, campaignCount: filteredCampaigns.length }
    }).filter(g => g.campaignCount > 0)
  }, [sortedGroups, searchQuery, statusFilter, channelFilter])

  // ─── Search ───────────────────────────────────────────────────────────────────
  const commitSearch = useCallback((val: string) => {
    setSearchQuery(val); setPage(1)
    setTimeout(() => { tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 60)
  }, [])
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitSearch(searchInput)
      setTimeout(() => { tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 80)
    }
  }
  const handleSearchClear = () => { setSearchInput(""); commitSearch("") }

  // ─── Pagination ───────────────────────────────────────────────────────────────
  const totalDays = filteredGroups.length
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredGroups.slice(start, start + rowsPerPage)
  }, [filteredGroups, page, rowsPerPage])

  const handlePageChange = (p: number) => {
    setPage(p)
    setTimeout(() => { tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 60)
  }

  const handleClearAll = () => {
    setSearchInput(""); setSearchQuery(""); setStatusFilter("all"); setChannelFilter("all")
    setDatePreset("all"); setFromDate(""); setToDate(""); setCustomFrom(""); setCustomTo(""); setPage(1)
  }

  // ─── Download / Print ─────────────────────────────────────────────────────────
  const handleDownload = (group: (typeof sortedGroups)[0]) => {
    const headers = ["Campaign Name", "Campaign ID", "Status", "Channel", "Bidding", "Start", "End",
      "Budget", "Impressions", "Clicks", "CTR%", "Avg CPC", "Cost", "Conversions", "Conv. Value", "Cost/Conv.", "Imp. Share%"]
    const rows = group.campaigns.map(r => [
      r.campaignName || "", r.campaignId || "", r.status || "", r.channelType || "",
      r.biddingStrategy || "", r.startDate || "", r.endDate || "",
      fmtNum(r.budget, 0), r.impressions.toLocaleString("en-IN"), r.clicks.toLocaleString("en-IN"),
      fmtNum(r.ctr, 2), fmtNum(r.avgCpc, 2), fmtRs(r.cost), fmtNum(r.conversions, 1),
      fmtRs(r.conversionValue), fmtNum(r.costPerConversion, 2), fmtNum(r.searchImpressionShare, 2),
    ])
    downloadCSV(`${selectedCompany}_${group.date}_campaigns.csv`, [headers, ...rows])
  }

  const handlePrint = (group: (typeof sortedGroups)[0]) => {
    const headers = ["Campaign", "Status", "Channel", "Bidding", "Budget", "Impressions", "Clicks", "CTR", "CPC", "Cost", "Conv.", "Conv.Val", "Cost/Conv", "Imp.Share"]
    const rows = group.campaigns.map(r => [
      r.campaignName || "—", r.status || "—", r.channelType || "—", r.biddingStrategy || "—",
      fmtNum(r.budget, 0), r.impressions.toLocaleString("en-IN"), r.clicks.toLocaleString("en-IN"),
      `${fmtNum(r.ctr, 2)}%`, fmtNum(r.avgCpc, 2), fmtRs(r.cost),
      fmtNum(r.conversions, 1), fmtRs(r.conversionValue), fmtNum(r.costPerConversion, 2),
      `${fmtNum(r.searchImpressionShare, 2)}%`,
    ])
    const html = `<html><head><title>${selectedCompany} – ${group.displayDate}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px;color:#1e293b}h2{margin-bottom:8px;font-size:14px}
      table{border-collapse:collapse;width:100%}th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
      td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px}tr:nth-child(even) td{background:#f8fafc}
      @page{margin:12mm 10mm;size:A4 landscape}</style></head>
      <body><h2>${selectedCompany} — Campaign Report: ${group.displayDate}</h2>
      <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`
    const win = window.open("", "_blank", "width=1200,height=800")
    if (win) { win.document.write(html); win.document.close(); win.focus(); setTimeout(() => { win.print(); win.close() }, 300) }
  }

  // ─── Computed Grand Totals — pure column SUM for every field (no averages) ───
  const computedGrandTotals = useMemo(() => {
    const allRows = filteredGroups.flatMap(g => g.campaigns)

    const totalImpressions = allRows.reduce((s, r) => s + (r.impressions ?? 0), 0)
    const totalClicks = allRows.reduce((s, r) => s + (r.clicks ?? 0), 0)
    const totalCost = allRows.reduce((s, r) => s + (r.cost ?? 0), 0)
    const totalConversions = allRows.reduce((s, r) => s + (r.conversions ?? 0), 0)
    const totalConvValue = allRows.reduce((s, r) => s + (r.conversionValue ?? 0), 0)
    const totalBudget = allRows.reduce((s, r) => s + (r.budget ?? 0), 0)
    const totalCtr = allRows.reduce((s, r) => s + (r.ctr ?? 0), 0)
    const totalAvgCpc = allRows.reduce((s, r) => s + (r.avgCpc ?? 0), 0)
    const totalCostPerConversion = allRows.reduce((s, r) => s + (r.costPerConversion ?? 0), 0)
    const totalSearchImpShare = allRows.reduce((s, r) => s + (r.searchImpressionShare ?? 0), 0)

    return {
      impressions: totalImpressions,
      clicks: totalClicks,
      cost: totalCost,
      conversions: totalConversions,
      convValue: totalConvValue,
      budget: totalBudget,
      avgCtr: totalCtr,
      avgCpc: totalAvgCpc,
      costPerConversion: totalCostPerConversion,
      searchImpressionShare: totalSearchImpShare,
    }
  }, [filteredGroups])

  // ─── Graph chart data (per-day aggregated, filtered) ──────────────────────────
  const chartData = useMemo(() => {
    return filteredGroups.map(g => {
      const t = g.totals
      return {
        date: g.displayDate,
        shortDate: g.displayDate.replace(/^(\d{2})-(\w{3})-(\d{4})$/, "$1 $2") || g.displayDate,
        impressions: t.impressions,
        clicks: t.clicks,
        cost: Math.round(t.cost),
        conversions: parseFloat(t.conversions.toFixed(1)),
        convValue: Math.round(t.conversionValue ?? 0),
        ctr: parseFloat(t.ctr.toFixed(2)),
        avgCpc: parseFloat(t.avgCpc.toFixed(2)),
        costPerConv: parseFloat(t.costPerConversion.toFixed(2)),
        impShare: parseFloat(t.searchImpressionShare.toFixed(2)),
        budget: Math.round(t.budget),
      }
    }).sort((a, b) => a.date < b.date ? -1 : 1)
  }, [filteredGroups])

  // ─── Top campaigns by cost (for bar chart) ────────────────────────────────────
  const topCampaignsData = useMemo(() => {
    const campaignMap = new Map<string, { name: string; cost: number; clicks: number; conversions: number; impressions: number }>()
    filteredGroups.forEach(g => {
      g.campaigns.forEach(r => {
        const key = r.campaignId || r.campaignName || "Unknown"
        const existing = campaignMap.get(key)
        if (existing) {
          existing.cost += r.cost ?? 0
          existing.clicks += r.clicks ?? 0
          existing.conversions += r.conversions ?? 0
          existing.impressions += r.impressions ?? 0
        } else {
          campaignMap.set(key, {
            name: r.campaignName?.length > 22 ? r.campaignName.slice(0, 22) + "…" : (r.campaignName || "Unknown"),
            cost: r.cost ?? 0,
            clicks: r.clicks ?? 0,
            conversions: r.conversions ?? 0,
            impressions: r.impressions ?? 0,
          })
        }
      })
    })
    return Array.from(campaignMap.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8)
  }, [filteredGroups])
  const kpis = [
    {
      label: "Impressions", sublabel: "Total Views",
      value: computedGrandTotals.impressions.toLocaleString("en-IN"),
      icon: Eye, iconBg: "bg-sky-100", iconColor: "text-sky-600",
      border: "border-sky-200", bg: "from-white via-sky-50 to-sky-100/70", textColor: "text-sky-800"
    },
    {
      label: "Clicks", sublabel: "Total Clicks",
      value: computedGrandTotals.clicks.toLocaleString("en-IN"),
      icon: MousePointerClick, iconBg: "bg-cyan-100", iconColor: "text-cyan-600",
      border: "border-cyan-200", bg: "from-white via-cyan-50 to-cyan-100/70", textColor: "text-cyan-800"
    },
    {
      label: "Total CTR", sublabel: "Sum of CTR",
      value: fmtNum(computedGrandTotals.avgCtr, 2),
      icon: Percent, iconBg: "bg-amber-100", iconColor: "text-amber-600",
      border: "border-amber-200", bg: "from-white via-amber-50 to-amber-100/70", textColor: "text-amber-800"
    },
    {
      label: "Total CPC", sublabel: "Sum of CPC",
      value: `₹${computedGrandTotals.avgCpc.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      icon: Wallet, iconBg: "bg-orange-100", iconColor: "text-orange-600",
      border: "border-orange-200", bg: "from-white via-orange-50 to-orange-100/70", textColor: "text-orange-800"
    },
    {
      label: "Total Cost", sublabel: "Amount Spent",
      value: `₹${computedGrandTotals.cost.toLocaleString("en-IN")}`,
      icon: IndianRupee, iconBg: "bg-red-100", iconColor: "text-red-600",
      border: "border-red-200", bg: "from-white via-red-50 to-red-100/70", textColor: "text-red-800"
    },
    {
      label: "Conversions", sublabel: "Total Conv.",
      value: computedGrandTotals.conversions.toLocaleString("en-IN"),
      icon: Target, iconBg: "bg-green-100", iconColor: "text-green-600",
      border: "border-green-200", bg: "from-white via-green-50 to-green-100/70", textColor: "text-green-800"
    },
    {
      label: "Conv. Value", sublabel: "Revenue",
      value: `₹${computedGrandTotals.convValue.toLocaleString("en-IN")}`,
      icon: TrendingUp, iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
      border: "border-emerald-200", bg: "from-white via-emerald-50 to-emerald-100/70", textColor: "text-emerald-800"
    },
    {
      label: "Total Budget", sublabel: "Allocated",
      value: `₹${computedGrandTotals.budget.toLocaleString("en-IN")}`,
      icon: BarChart3, iconBg: "bg-purple-100", iconColor: "text-purple-600",
      border: "border-purple-200", bg: "from-white via-purple-50 to-purple-100/70", textColor: "text-purple-800"
    },
  ]

  // ─── Column definitions ────────────────────────────────────────────────────────
  // headerBg = solid hex color for <th> inline style (no transparency — ensures clear visibility)
  // rowBg    = Tailwind class for body <td> (light tint is fine for body rows)
  // textCls  = Tailwind class for body <td> text color
  const columns: [SortKey, string, string, string, string, string][] = [
    ["budget", "Budget", "#92400e", "text-amber-100", "bg-amber-50/50", "text-amber-700"],
    ["impressions", "Impressions", "#075985", "text-sky-100", "bg-sky-50/50", "text-sky-700"],
    ["clicks", "Clicks", "#164e63", "text-cyan-100", "bg-cyan-50/40", "text-cyan-700"],
    ["ctr", "CTR", "#78350f", "text-amber-100", "bg-amber-50/40", "text-amber-700"],
    ["avgCpc", "Avg CPC", "#7c2d12", "text-orange-100", "bg-orange-50/40", "text-orange-700"],
    ["cost", "Cost", "#7f1d1d", "text-red-100", "bg-red-50/40", "text-red-700"],
    ["conversions", "Conv.", "#14532d", "text-green-100", "bg-green-50/40", "text-green-700"],
    ["conversionValue", "Conv. Value", "#064e3b", "text-emerald-100", "bg-emerald-50/40", "text-emerald-700"],
    ["costPerConversion", "Cost/Conv.", "#4c1d95", "text-purple-100", "bg-purple-50/40", "text-purple-700"],
    ["searchImpressionShare", "Imp. Share", "#1e293b", "text-slate-100", "bg-slate-50/40", "text-slate-700"],
  ]

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40 shrink-0" />
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />
  }

  const getCellValue = (col: SortKey, v: number) => {
    if (col === "ctr" || col === "searchImpressionShare") return `${fmtNum(v, 2)}%`
    if (col === "avgCpc" || col === "costPerConversion") return fmtNum(v, 2)
    if (col === "cost" || col === "conversionValue") return fmtRs(v)
    if (col === "impressions" || col === "clicks") return v.toLocaleString("en-IN")
    if (col === "conversions") return fmtNum(v, 1)
    return fmtNum(v, 2)
  }

  const DATE_PRESETS = [
    { value: "all", label: "All Dates" }, { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" }, { value: "this_week", label: "This Week" },
    { value: "last_week", label: "Last Week" }, { value: "this_month", label: "This Month" },
    { value: "last_month", label: "Last Month" }, { value: "this_year", label: "This Year" },
    { value: "last_year", label: "Last Year" }, { value: "custom", label: "Custom Range" },
  ]

  const hasActiveFilters = !!(searchQuery || statusFilter !== "all" || channelFilter !== "all" || fromDate || toDate)

  const selectCls = `w-full h-11 sm:h-10 appearance-none pl-3 pr-8 text-sm border border-slate-300 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 ${cfg.tw.ring} transition-all`
  const inputRing = `${cfg.tw.ring} focus:border-${cfg.tw.border.replace("border-", "")}`

  // ─── Sticky column background colors (must be solid, not transparent) ─────────
  // These must match exactly what each row uses — no opacity/alpha allowed on sticky cells
  const STICKY_BG = {
    thead: "#1e293b",       // slate-800
    dateRow: {
      default: "#f1f5f9",   // slate-100
      hover: "#cbd5e1",     // slate-300 (handled via CSS group-hover)
    },
    evenRow: "#ffffff",     // white
    oddRow: "#f8fafc",     // slate-50
    tfoot: "#0f172a",     // slate-900
  }

  return (
    <DashboardLayout>
      {loading && <PageLoader />}

      {/*
        ── KEY FIX ──────────────────────────────────────────────────────────────
        The root cause of sticky + scroll breaking on mobile/webkit is that any
        ancestor element with  overflow: hidden  or  overflow: auto/scroll  that
        is NOT the direct scroll container will clip/break position:sticky.

        Solution:
          1. The outer card wrapper must NOT have overflow:hidden — use
             overflow:visible or simply remove it.
          2. The scroll wrapper uses overflow-x: auto with
             -webkit-overflow-scrolling: touch.
          3. All sticky <th>/<td> use an explicit solid backgroundColor (inline
             style) — no Tailwind bg-* with opacity, because on iOS Safari
             rgba backgrounds on sticky cells bleed through when scrolling.
          4. The sticky column width is constrained so it doesn't push content
             off screen on small viewports.
        ─────────────────────────────────────────────────────────────────────────
      */}

      <div className="relative z-10">
        <div className="w-full space-y-8" style={{ minWidth: 0 }}>

          {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
          <header className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.headerGradient} text-white shadow-2xl`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.08),transparent_40%)]" />
            <div className="relative px-6 py-8 md:px-8 md:py-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 shrink-0">
                    <Activity className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">Google Adword Reports</h1>
                    <p className="text-sm md:text-base text-white/90">
                      {cfg.label}
                      {rawRows.length > 0 && rawRows[0]?.customerId && (
                        <span className="ml-2 text-white/60 text-xs">· ID: {rawRows[0].customerId}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 w-full md:w-auto">
                  <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 border border-white/20">
                    {(["KTAHV", "KAPPL", "VILLARAAG"] as Company[]).map(c => (
                      <button
                        key={c} type="button"
                        onClick={() => handleCompanyChange(c)}
                        className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${selectedCompany === c ? "bg-white text-slate-900 shadow-md" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
                      >{c}</button>
                    ))}
                  </div>
                  {!loading && lastFetched && (
                    <div className="flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-5 py-3 shadow-lg w-full">
                      <div className="text-center">
                        <p className="text-xs text-white/80 font-semibold tracking-wide mb-1">Last Updated</p>
                        <p className="text-sm font-bold text-white leading-snug">
                          {lastFetched.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* ── FILTERS ──────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
            <SectionHeader
              accentFrom={cfg.accentFrom} accentTo={cfg.accentTo}
              icon={Filter} title="Filters & Search" subtitle="Narrow down results quickly"
              right={
                <button type="button" onClick={handleClearAll}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border shadow-sm transition-all duration-200 active:scale-[0.98] ${hasActiveFilters ? "text-red-600 bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300" : "text-slate-700 bg-white border-slate-300 hover:bg-slate-100 hover:border-slate-400"}`}>
                  {hasActiveFilters && <X className="h-3.5 w-3.5" />}
                  Clear Filters
                </button>
              }
            />
            <div className="px-4 sm:px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">Search Campaigns</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input placeholder="Name, ID, bidding... press Enter" value={searchInput}
                      onChange={e => setSearchInput(e.target.value)} onKeyDown={handleSearchKeyDown}
                      className={`pl-9 h-11 sm:h-10 w-full rounded-lg border-slate-300 pr-8 focus:ring-2 ${cfg.tw.ring}`} />
                    {searchInput && (
                      <button type="button" onClick={handleSearchClear} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">Status</label>
                  <div className="relative">
                    <select aria-label="Status filter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className={selectCls}>
                      <option value="all">All Status</option>
                      {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">Channel</label>
                  <div className="relative">
                    <select aria-label="Channel filter" value={channelFilter} onChange={e => { setChannelFilter(e.target.value); setPage(1) }} className={selectCls}>
                      <option value="all">All Channels</option>
                      {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">Date Range</label>
                  <div className="relative">
                    <select aria-label="Date range filter" value={datePreset} onChange={e => handleDatePreset(e.target.value)} className={selectCls}>
                      {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              {datePreset === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-200">
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">Start Date</label>
                    <Input type="date" value={customFrom} onChange={e => handleCustomFrom(e.target.value)} className={`h-11 w-full rounded-lg border-slate-300 focus:ring-2 ${cfg.tw.ring}`} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block uppercase font-semibold tracking-wide">End Date</label>
                    <Input type="date" value={customTo} onChange={e => handleCustomTo(e.target.value)} className={`h-11 w-full rounded-lg border-slate-300 focus:ring-2 ${cfg.tw.ring}`} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPI CARDS ────────────────────────────────────────────────────── */}
          {loading ? <KpiSkeleton /> : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
              <SectionHeader accentFrom={cfg.accentFrom} accentTo={cfg.accentTo} icon={BarChart3}
                title="Key Performance Indicators" subtitle="Overview of campaign metrics & performance" />
              <div className="px-4 sm:px-5 py-5">
                <div className="grid grid-cols-2 md:grid-cols-4 2xl:grid-cols-8 gap-3 md:gap-4">
                  {kpis.map(kpi => (
                    <div key={kpi.label} className={`rounded-2xl border ${kpi.border} bg-gradient-to-br ${kpi.bg} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
                      <div className="flex flex-col justify-between p-4 sm:p-5 min-h-[130px] h-full">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide leading-tight ${kpi.textColor}`}>{kpi.label}</p>
                            <p className="text-[10px] font-medium text-slate-500 mt-0.5 leading-tight">{kpi.sublabel}</p>
                          </div>
                          <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${kpi.iconBg} shrink-0`}>
                            <kpi.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${kpi.iconColor}`} />
                          </div>
                        </div>
                        <p className="text-base sm:text-lg xl:text-[17px] font-extrabold text-slate-900 leading-tight break-all mt-3">
                          {kpi.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ERROR ────────────────────────────────────────────────────────── */}
          {error && !loading && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-700 shadow-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-semibold">Failed to load data</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
              </div>
              <button type="button" onClick={() => refresh()}
                className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* ── EMPTY ────────────────────────────────────────────────────────── */}
          {!loading && !error && filteredGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-5 bg-slate-100 rounded-2xl mb-4">
                <BarChart3 className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-600 mb-1">No data found</p>
              <p className="text-sm text-slate-400">No campaign data available for {selectedCompany}</p>
            </div>
          )}

          {/* ── MAIN TABLE ───────────────────────────────────────────────────── */}
          {(loading || filteredGroups.length > 0) && (
            <div
              ref={tableRef}
              className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-visible"
            >
              {/* Inner wrapper — overflow-visible so sticky works on iOS Safari */}
              <div className="overflow-visible">

                <SectionHeader
                  accentFrom={cfg.accentFrom} accentTo={cfg.accentTo} icon={BarChart3}
                  title={
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className={`${cfg.tw.gradClip} font-bold`}>
                        Campaign Performance Analytics
                      </span>
                      {!loading && (
                        <>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.tw.badge}`}>
                            {uniqueCampaignCount} Campaigns
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 whitespace-nowrap border border-slate-300">
                            {filteredGroups.reduce((s, d) => s + d.campaignCount, 0)} Records
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 whitespace-nowrap border border-indigo-200">
                            {filteredGroups.length} Days
                          </span>
                        </>
                      )}
                    </span>
                  }
                  subtitle={activeView === "table" ? "Daily grouped data · click a row to expand campaigns" : "Visual analytics · filtered data · 4 chart types"}
                  right={
                    <div className="flex items-center gap-2">
                      {/* View toggle tabs */}
                      <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveView("table")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeView === "table"
                            ? cfg.tw.tabActive
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                            }`}
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          Table View
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView("graph")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeView === "graph"
                            ? cfg.tw.tabActive
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                            }`}
                        >
                          <LineChartIcon className="w-3.5 h-3.5" />
                          Graph View
                        </button>
                      </div>
                      <span className={`hidden sm:inline-flex text-xs font-bold px-3 py-1.5 rounded-lg border ${cfg.tw.text} ${cfg.tw.bgLight} ${cfg.tw.border}`}>
                        {selectedCompany}
                      </span>
                    </div>
                  }
                />

                {loading ? <TableSkeleton /> : (
                  <>
                    {/* ── GRAPH VIEW ─────────────────────────────────────────── */}
                    {activeView === "graph" && (
                      <GraphView
                        chartData={chartData}
                        topCampaignsData={topCampaignsData}
                        computedGrandTotals={computedGrandTotals}
                        cfg={cfg}
                        filteredGroups={filteredGroups}
                      />
                    )}

                    {/* ── TABLE VIEW ─────────────────────────────────────────── */}
                    {activeView === "table" && (
                      <>
                        {/*
                      ── SCROLL CONTAINER ────────────────────────────────────────
                      CRITICAL RULES for sticky + horizontal scroll on iOS Safari:
                      1. overflow-x: auto  on THIS element (the direct table parent)
                      2. NO overflow:hidden on any ancestor of THIS element
                      3. Sticky cells need  position: sticky  + solid background
                      4. Add  isolation: isolate  so z-index stacking works correctly
                      ────────────────────────────────────────────────────────────
                    */}
                        <div
                          style={{
                            overflowX: "auto",
                            WebkitOverflowScrolling: "touch",  // smooth momentum scroll on iOS
                            // NOTE: Do NOT add isolation:isolate here — it creates a new
                            // stacking context that causes non-sticky <th> cells to appear
                            // behind the sticky column (the "blur/hidden header" bug).
                          }}
                        >
                          <table
                            className="text-sm border-collapse"
                            style={{ minWidth: "1080px", tableLayout: "auto", width: "100%" }}
                          >
                            <thead>
                              <tr>
                                {/*
                              ── STICKY TH ──────────────────────────────────────
                              backgroundColor MUST be a solid hex/rgb — Tailwind's
                              bg-slate-800 compiles to oklch which Safari may
                              treat as semi-transparent on sticky elements.
                              Use inline style={{ backgroundColor: "#1e293b" }}.
                              ────────────────────────────────────────────────────
                            */}
                                <th
                                  onClick={() => handleSort("date")}
                                  style={{
                                    backgroundColor: STICKY_BG.thead,
                                    position: "sticky",
                                    left: 0,
                                    // z-index: 3 — must be > regular <th> cells (z-index:1)
                                    // but low enough to not bleed over non-table UI.
                                    // Regular <th> must have z-index:1 explicitly so
                                    // this sticky cell stays on top while scrolling.
                                    zIndex: 3,
                                    boxShadow: "4px 0 8px -2px rgba(0,0,0,0.5), 2px 0 0 0 rgba(255,255,255,0.08)",
                                  }}
                                  className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-white min-w-[200px] max-w-[260px] cursor-pointer transition-colors hover:brightness-125"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                    <span className="truncate">Date / Campaign</span>
                                    <SortIcon col="date" />
                                  </span>
                                </th>

                                <th style={{ backgroundColor: "#166534", position: "relative", zIndex: 1 }}
                                  className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-green-100 min-w-[90px] whitespace-nowrap border-r border-green-700">
                                  Status
                                </th>
                                <th style={{ backgroundColor: "#1d4ed8", position: "relative", zIndex: 1 }}
                                  className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-blue-100 min-w-[130px] whitespace-nowrap border-r border-blue-700">
                                  Channel
                                </th>
                                <th style={{ backgroundColor: "#7c3aed", position: "relative", zIndex: 1 }}
                                  className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-violet-100 min-w-[130px] whitespace-nowrap border-r border-violet-700">
                                  Bidding
                                </th>
                                <th style={{ backgroundColor: "#0369a1", position: "relative", zIndex: 1 }}
                                  className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-sky-100 min-w-[90px] whitespace-nowrap border-r border-sky-700">
                                  Start
                                </th>
                                <th style={{ backgroundColor: "#b45309", position: "relative", zIndex: 1 }}
                                  className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-amber-100 min-w-[90px] whitespace-nowrap border-r border-amber-700">
                                  End
                                </th>

                                {columns.map(([key, label, headerBg, headerText]) => (
                                  <th key={key} onClick={() => handleSort(key)}
                                    style={{ backgroundColor: headerBg, position: "relative", zIndex: 1 }}
                                    className={`px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider min-w-[95px] whitespace-nowrap cursor-pointer transition-all hover:brightness-125 ${headerText}`}>
                                    <span className="flex items-center justify-center gap-1">
                                      {label}
                                      <SortIcon col={key} />
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>

                            {paginatedGroups.map(group => {
                              const isExpanded = expandedDates.has(group.date)
                              const t = group.totals
                              return (
                                <tbody key={group.date}>
                                  {/* ── Date summary row ── */}
                                  <tr
                                    className="group/daterow cursor-pointer border-b-2 border-slate-300 transition-colors"
                                    style={{ backgroundColor: STICKY_BG.dateRow.default }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = STICKY_BG.dateRow.hover}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = STICKY_BG.dateRow.default}
                                    onClick={() => toggleDate(group.date)}
                                  >
                                    {/*
                                  ── STICKY TD for date row ──────────────────────
                                  backgroundColor must match the tr background exactly.
                                  We use onMouseEnter/Leave on the <tr> to sync.
                                  We replicate that on the sticky cell too.
                                  ────────────────────────────────────────────────
                                */}
                                    <td
                                      style={{
                                        backgroundColor: STICKY_BG.dateRow.default,
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 2,
                                        boxShadow: "4px 0 8px -2px rgba(0,0,0,0.08), 2px 0 0 0 #e2e8f0",
                                      }}
                                      className="px-4 py-3 border-r border-slate-300 transition-colors group-hover/daterow:!bg-slate-300"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-all duration-200 ${isExpanded ? `${cfg.tw.bg} text-white shadow-sm` : "bg-slate-300 text-slate-600"}`}>
                                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </div>
                                        <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                        <span className="font-bold text-slate-900 text-xs tabular-nums truncate">{group.displayDate}</span>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-200 text-slate-600 border-slate-300 font-medium shrink-0">{group.campaignCount}</Badge>
                                        <div className="flex items-center gap-0.5 ml-auto">
                                          <button type="button" title="Download CSV"
                                            className={`p-1.5 rounded-md ${cfg.tw.bgLight} hover:${cfg.tw.bg} border ${cfg.tw.border} hover:border-transparent transition-all duration-200 group/dl`}
                                            onClick={e => { e.stopPropagation(); handleDownload(group) }}>
                                            <Download className={`h-3.5 w-3.5 ${cfg.tw.textBold} group-hover/dl:text-white transition-colors`} />
                                          </button>
                                          <button type="button" title="Print"
                                            className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-700 border border-slate-300 hover:border-slate-700 transition-all duration-200 group/pr"
                                            onClick={e => { e.stopPropagation(); handlePrint(group) }}>
                                            <Printer className="h-3.5 w-3.5 text-slate-500 group-hover/pr:text-white transition-colors" />
                                          </button>
                                        </div>
                                      </div>
                                    </td>

                                    {[...Array(5)].map((_, i) => (
                                      <td key={i} className="text-center px-3 py-3 text-xs text-slate-400">—</td>
                                    ))}
                                    <td className="text-center px-3 py-3 font-bold text-xs text-amber-700 bg-amber-50/60">{fmtNum(t.budget, 0)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-sky-700 bg-sky-50/60">{t.impressions.toLocaleString("en-IN")}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-cyan-700 bg-cyan-50/60">{t.clicks.toLocaleString("en-IN")}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-amber-700 bg-amber-50/60">{fmtNum(t.ctr, 2)}%</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-orange-700 bg-orange-50/60">{fmtNum(t.avgCpc, 2)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-red-700 bg-red-50/60">{fmtRs(t.cost)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-green-700 bg-green-50/60">{fmtNum(t.conversions, 1)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-emerald-700 bg-emerald-50/60">{fmtRs(t.conversionValue)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-purple-700 bg-purple-50/60">{fmtNum(t.costPerConversion, 2)}</td>
                                    <td className="text-center px-3 py-3 font-bold text-xs text-slate-700">{fmtNum(t.searchImpressionShare, 2)}%</td>
                                  </tr>

                                  {/* ── Expanded campaign rows ── */}
                                  {isExpanded && group.campaigns.map((row, ri) => {
                                    const evenRow = ri % 2 === 0
                                    const rowBg = evenRow ? STICKY_BG.evenRow : STICKY_BG.oddRow
                                    return (
                                      <tr
                                        key={`${row.date}-${row.campaignId}-${ri}`}
                                        className="group/camprow border-b border-slate-100 transition-colors hover:bg-slate-300"
                                        style={{ backgroundColor: rowBg }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = STICKY_BG.dateRow.hover}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = rowBg}
                                      >
                                        {/*
                                      ── STICKY TD for campaign row ──────────────
                                      backgroundColor matches the row's alternating bg.
                                      group-hover synced via onMouseEnter/Leave above.
                                      ────────────────────────────────────────────
                                    */}
                                        <td
                                          style={{
                                            backgroundColor: rowBg,
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 2,
                                            boxShadow: "4px 0 8px -2px rgba(0,0,0,0.06), 2px 0 0 0 #f1f5f9",
                                            transition: "background-color 150ms",
                                          }}
                                          className="px-4 py-2.5 border-r border-slate-100 group-hover/camprow:!bg-slate-300"
                                        >
                                          <div className="flex items-center gap-2 pl-8">
                                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0 border border-slate-200">{ri + 1}</span>
                                            <div className="min-w-0">
                                              <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]" title={row.campaignName}>{row.campaignName || "—"}</p>
                                              {row.campaignId && <p className="text-[9px] text-slate-400 font-mono">{row.campaignId}</p>}
                                            </div>
                                          </div>
                                        </td>
                                        <td className="text-center px-3 py-2.5">
                                          <Badge className={`text-[9px] px-1.5 py-0 font-semibold ${row.status?.toUpperCase() === "ENABLED" ? "bg-green-100 text-green-700 border border-green-200" : "bg-orange-100 text-orange-700 border border-orange-200"}`}>
                                            {row.status || "—"}
                                          </Badge>
                                        </td>
                                        <td className="text-center px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{row.channelType || "—"}</td>
                                        <td className="text-center px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{row.biddingStrategy || "—"}</td>
                                        <td className="text-center px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{row.startDate || "—"}</td>
                                        <td className="text-center px-3 py-2.5 text-[10px] text-slate-500 whitespace-nowrap">{row.endDate || "—"}</td>
                                        {columns.map(([key, , , , rowColor, rowText]) => (
                                          <td key={key} className={`text-center px-3 py-2.5 text-xs ${rowColor} ${rowText}`}>
                                            {getCellValue(key, row[key as keyof CampaignRow] as number)}
                                          </td>
                                        ))}
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              )
                            })}

                            {/* ── Grand Total ── */}
                            {filteredGroups.length > 1 && (
                              <tfoot>
                                <tr style={{ borderTop: "4px solid #f59e0b" }}>
                                  <td
                                    style={{
                                      backgroundColor: STICKY_BG.tfoot,
                                      position: "sticky",
                                      left: 0,
                                      zIndex: 2,
                                      boxShadow: "4px 0 8px -2px rgba(0,0,0,0.5), 2px 0 0 0 rgba(255,255,255,0.05)",
                                    }}
                                    className="font-extrabold text-xs text-white text-left px-4 py-4 border-r border-slate-700"
                                  >
                                    GRAND TOTAL
                                  </td>
                                  {[...Array(5)].map((_, i) => (
                                    <td key={i} style={{ backgroundColor: STICKY_BG.tfoot }} className="border-r border-slate-700 px-4 py-4" />
                                  ))}
                                  <td className="font-bold text-sm text-amber-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.budget, 0)}</td>
                                  <td className="font-bold text-sm text-sky-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{computedGrandTotals.impressions.toLocaleString("en-IN")}</td>
                                  <td className="font-bold text-sm text-cyan-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{computedGrandTotals.clicks.toLocaleString("en-IN")}</td>
                                  <td className="font-bold text-sm text-amber-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.avgCtr, 2)}</td>
                                  <td className="font-bold text-sm text-orange-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.avgCpc, 2)}</td>
                                  <td className="font-bold text-sm text-red-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtRs(computedGrandTotals.cost)}</td>
                                  <td className="font-bold text-sm text-green-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.conversions, 1)}</td>
                                  <td className="font-bold text-sm text-emerald-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtRs(computedGrandTotals.convValue)}</td>
                                  <td className="font-bold text-sm text-purple-400 text-center px-4 py-4 border-r border-slate-700" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.costPerConversion, 2)}</td>
                                  <td className="font-bold text-sm text-slate-400 text-center px-4 py-4" style={{ backgroundColor: STICKY_BG.tfoot }}>{fmtNum(computedGrandTotals.searchImpressionShare, 2)}</td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>

                        <Pagination
                          total={totalDays} page={page} rowsPerPage={rowsPerPage}
                          onPageChange={handlePageChange} onRowsPerPageChange={setRowsPerPage}
                          btnPrimary={cfg.tw.btnPrimary}
                        />
                      </>
                    )} {/* end activeView === "table" */}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}
