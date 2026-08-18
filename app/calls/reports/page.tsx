"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import useCallsData, { type CallsRow, type CallsDateGroup, type CallsEmployeeRow } from "@/hooks/use-calls-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Download, Printer, TrendingUp, TrendingDown, TableIcon, BarChart3,
  ChevronUp, ChevronDown, Filter, Search, Award, Activity,
  ChevronsUpDown, Phone, UserCheck, UserPlus, ChevronRight, Calendar, X,
  AlertTriangle, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, ReferenceLine, Cell, LabelList, Area, AreaChart,
} from "recharts"

// ─── Sticky column pixel constants ────────────────────────────────────────────
// Mirrors Sales page exactly — same frozen zone = 206 px
const RANK_W = 56     // px – Rank column
const NAME_W = 150    // px – Employee Name column
const NAME_L = RANK_W // left offset for Employee Name sticky cell
const TH_BG = '#1e293b'
const SHADOW_R = '3px 0 8px -2px rgba(0,0,0,0.30)'
// ──────────────────────────────────────────────────────────────────────────────

// Only fields that make sense to sort by
type SortKey =
  | "rank" | "empName" | "company" | "month" | "year"
  | "plannedCalls" | "actualCalls" | "varianceCalls" | "variancePercent"
  | "newClientsActual" | "oldClientsActual"

export default function CallReportPage() {

  /* ─── constants ─────────────────────────────────────────────────────────── */
  const normalizeEmployeeForApi = (name = "") =>
    name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim()

  const MONTH_ORDER = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
  ]

  /* ─── filter state ──────────────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState("all")
  const [customFromDate, setCustomFromDate] = useState("")
  const [customToDate, setCustomToDate] = useState("")
  const [monthFilter, setMonthFilter] = useState<string>("all")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [filterMode, setFilterMode] = useState<"dateRange" | "monthYear">("monthYear")
  const [employeeFilter, setEmployeeFilter] = useState("all")
  const [companyFilter, setCompanyFilter] = useState("all")
  const [sortBy, setSortBy] = useState<SortKey>("rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [view, setView] = useState<"table" | "graph">("table")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [goToPage, setGoToPage] = useState("")
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const toggleDate = (date: string) => setExpandedDates(prev => {
    const next = new Set(prev)
    next.has(date) ? next.delete(date) : next.add(date)
    return next
  })

  /* ─── loader overlay ────────────────────────────────────────────────────── */
  const PageLoader = () => (
    <div className="fixed inset-0 z-[30] flex items-center justify-center bg-white pointer-events-auto">
      <div className="flex flex-col items-center gap-6">
        <img src="/grouploader.gif" alt="Logo" className="w-48 h-auto object-contain" />
        <p className="text-base font-semibold text-slate-700">Loading data...</p>
      </div>
    </div>
  )

  /* ─── data from real hook ───────────────────────────────────────────────── */
  const { callsData, dateGroups, loading, error, refetch } = useCallsData()
  const isInitialLoad = useRef(true)
  const [showLoader, setShowLoader] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const loaderStartRef = useRef<number | null>(null)

  // Auto-select last month + KTAHV on first data load (same as Sales page)
  useEffect(() => {
    if (!loading && isInitialLoad.current && callsData.length > 0) {
      const now = new Date()
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      setMonthFilter(MONTH_ORDER[lastMonthDate.getMonth()])
      setYearFilter(lastMonthDate.getFullYear().toString())
      setEmployeeFilter("all")
      setCompanyFilter("KTAHV")
      setCurrentPage(1)
      isInitialLoad.current = false
    }
  }, [loading, callsData])

  // Minimum-display loader (700 ms)
  useEffect(() => {
    if (loading) {
      loaderStartRef.current = Date.now()
      setShowLoader(true)
    } else {
      const elapsed = Date.now() - (loaderStartRef.current || 0)
      const minDisplay = 700
      if (elapsed < minDisplay) {
        const t = setTimeout(() => { setShowLoader(false); setLastUpdated(new Date()) }, minDisplay - elapsed)
        return () => clearTimeout(t)
      }
      setShowLoader(false)
      setLastUpdated(new Date())
    }
  }, [loading])

  useEffect(() => {
    if (showLoader) { document.body.style.overflow = "hidden"; window.scrollTo(0, 0) }
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [showLoader])

  // Load failure is only surfaced once the loader has fully cleared
  const loadFailed = !loading && !showLoader && !!error

  /* ─── filter mode handlers ──────────────────────────────────────────────── */
  const handleDateFilterChange = (val: string) => {
    setDateFilter(val)
    if (val !== "all") { setFilterMode("dateRange"); setMonthFilter("all"); setYearFilter("all") }
    else setFilterMode("monthYear")
  }
  const handleMonthFilterChange = (val: string) => {
    setMonthFilter(val)
    if (val !== "all") { setFilterMode("monthYear"); setDateFilter("all"); setCustomFromDate(""); setCustomToDate("") }
    else if (yearFilter === "all") setFilterMode("monthYear")
  }
  const handleYearFilterChange = (val: string) => {
    setYearFilter(val)
    if (val !== "all") { setFilterMode("monthYear"); setDateFilter("all"); setCustomFromDate(""); setCustomToDate("") }
    else if (monthFilter === "all") setFilterMode("monthYear")
  }

  // Sync dateRange preset → monthFilter / yearFilter
  useEffect(() => {
    if (filterMode !== "dateRange") return
    const now = new Date()
    const currentMonth = MONTH_ORDER[now.getMonth()]
    const currentYear = now.getFullYear().toString()
    switch (dateFilter) {
      case "today": case "this_week": case "this_month":
        setMonthFilter(currentMonth); setYearFilter(currentYear); break
      case "last_month": {
        const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        setMonthFilter(MONTH_ORDER[d.getMonth()]); setYearFilter(d.getFullYear().toString()); break
      }
      case "this_quarter": case "last_quarter": case "this_year":
        setMonthFilter("all"); setYearFilter(currentYear); break
      case "last_year":
        setMonthFilter("all"); setYearFilter((now.getFullYear() - 1).toString()); break
      default: break
    }
  }, [dateFilter, filterMode])

  /* ─── derived lists ─────────────────────────────────────────────────────── */
  const availableYears = useMemo(() =>
    Array.from(new Set(callsData.map(d => d.year))).sort(), [callsData])

  const availableCompanies = useMemo(() =>
    Array.from(new Set(callsData.map(d => d.company).filter(Boolean))).sort(), [callsData])

  /* ─── previous-month reference ──────────────────────────────────────────── */
  const previousMonthData = useMemo(() => {
    if (monthFilter === "all" || yearFilter === "all")
      return { plannedCalls: 0, actualCalls: 0 }
    const idx = MONTH_ORDER.indexOf(monthFilter)
    const prevMonth = idx > 0 ? MONTH_ORDER[idx - 1] : MONTH_ORDER[11]
    const prev = callsData.filter(d => d.month === prevMonth && d.year === yearFilter)
    return {
      plannedCalls: prev.reduce((s, r) => s + (r.plannedCalls || 0), 0),
      actualCalls: prev.reduce((s, r) => s + (r.actualCalls || 0), 0),
    }
  }, [monthFilter, yearFilter, callsData])

  /* ─── filtered data ─────────────────────────────────────────────────────── */
  const filteredData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear().toString()

    const getQuarterMonths = (filter: string) => {
      const currentQ = Math.floor(now.getMonth() / 3)
      if (filter === "this_quarter") {
        const start = currentQ * 3
        return { months: MONTH_ORDER.slice(start, start + 3), year: currentYear }
      }
      if (filter === "last_quarter") {
        const prevQ = currentQ === 0 ? 3 : currentQ - 1
        const prevYear = currentQ === 0 ? (now.getFullYear() - 1).toString() : currentYear
        return { months: MONTH_ORDER.slice(prevQ * 3, prevQ * 3 + 3), year: prevYear }
      }
      return null
    }

    return callsData.filter(row => {
      const matchesCompany = companyFilter === "all" || row.company === companyFilter
      const matchesEmployee = employeeFilter === "all" || row.empName === employeeFilter
      const matchesSearch = searchQuery === "" ||
        row.empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.company.toLowerCase().includes(searchQuery.toLowerCase())

      let matchesDate = true
      if (dateFilter === "custom" && customFromDate && customToDate) {
        const mi = MONTH_ORDER.indexOf(row.month)
        if (mi === -1) return false
        const rowDate = new Date(Number(row.year), mi, 1)
        const fromDate = new Date(customFromDate); fromDate.setHours(0, 0, 0, 0)
        const toDate = new Date(customToDate); toDate.setHours(23, 59, 59, 999)
        matchesDate = rowDate >= fromDate && rowDate <= toDate
      }

      if (dateFilter === "this_quarter" || dateFilter === "last_quarter") {
        const q = getQuarterMonths(dateFilter)!
        return matchesCompany && matchesEmployee && matchesSearch &&
          q.months.includes(row.month) && row.year === q.year
      }

      const matchesMonth = dateFilter === "custom" ? true : monthFilter === "all" || row.month === monthFilter
      const matchesYear = dateFilter === "custom" ? true : yearFilter === "all" || row.year === yearFilter
      return matchesCompany && matchesEmployee && matchesSearch && matchesMonth && matchesYear && matchesDate
    })
  }, [callsData, monthFilter, yearFilter, companyFilter, employeeFilter, searchQuery, dateFilter, customFromDate, customToDate])


  /* ─── filtered date groups (for collapsible table) ──────────────────────── */
  const filteredDateGroups = useMemo(() => {
    return dateGroups.filter(group => {
      const matchesMonth = monthFilter === "all" || group.month === monthFilter
      const matchesYear = yearFilter === "all" || group.year === yearFilter
      const matchesCompany = companyFilter === "all" ||
        group.employees.some(e => e.company === companyFilter)
      const matchesEmployee = employeeFilter === "all" ||
        group.employees.some(e => e.empName === employeeFilter)
      const matchesSearch = searchQuery === "" ||
        group.employees.some(e =>
          e.empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.company.toLowerCase().includes(searchQuery.toLowerCase())
        )
      return matchesMonth && matchesYear && matchesCompany && matchesEmployee && matchesSearch
    }).map(group => {
      const filteredEmps = group.employees.filter(e => {
        const mc = companyFilter === "all" || e.company === companyFilter
        const me = employeeFilter === "all" || e.empName === employeeFilter
        const ms = searchQuery === "" ||
          e.empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.company.toLowerCase().includes(searchQuery.toLowerCase())
        return mc && me && ms
      })
      // Recompute totals from filtered employees only
      const tp = filteredEmps.reduce((s, e) => s + e.plannedCalls, 0)
      const ta = filteredEmps.reduce((s, e) => s + e.actualCalls, 0)
      return {
        ...group,
        employees: filteredEmps,
        totalPlanned: tp,
        totalActual: ta,
        totalVariance: ta - tp,
        totalNewPlanned: filteredEmps.reduce((s, e) => s + e.newClientsPlanned, 0),
        totalNewActual: filteredEmps.reduce((s, e) => s + e.newClientsActual, 0),
        totalOldPlanned: filteredEmps.reduce((s, e) => s + e.oldClientsPlanned, 0),
        totalOldActual: filteredEmps.reduce((s, e) => s + e.oldClientsActual, 0),
      }
    }).filter(g => g.employees.length > 0)
  }, [dateGroups, monthFilter, yearFilter, companyFilter, employeeFilter, searchQuery])

  /* ─── paginated date groups ──────────────────────────────────────────────── */
  const totalDatePages = Math.ceil(filteredDateGroups.length / itemsPerPage)
  const paginatedDateGroups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredDateGroups.slice(start, start + itemsPerPage)
  }, [filteredDateGroups, currentPage, itemsPerPage])

  /* ─── date group grand totals ────────────────────────────────────────────── */
  const dateGrandTotal = useMemo(() => {
    const allEmps = filteredDateGroups.flatMap(g => g.employees)
    const planned = allEmps.reduce((s, e) => s + e.plannedCalls, 0)
    const actual = allEmps.reduce((s, e) => s + e.actualCalls, 0)
    return {
      planned, actual,
      variance: actual - planned,
      variancePercent: planned !== 0 ? ((actual - planned) / planned) * 100 : 0,
      newActual: allEmps.reduce((s, e) => s + e.newClientsActual, 0),
      oldActual: allEmps.reduce((s, e) => s + e.oldClientsActual, 0),
      newPlanned: allEmps.reduce((s, e) => s + e.newClientsPlanned, 0),
      oldPlanned: allEmps.reduce((s, e) => s + e.oldClientsPlanned, 0),
    }
  }, [filteredDateGroups])
  /* ─── sorting + rank assignment ─────────────────────────────────────────── */
  const sortedData = useMemo(() => {
    // Rank = based on actualCalls descending within selected year scope
    const scoped = yearFilter === "all" ? filteredData : filteredData.filter(r => r.year === yearFilter)
    const withRanks = [...scoped]
      .sort((a, b) => (b.actualCalls || 0) - (a.actualCalls || 0))
      .map((r, i) => ({ ...r, rank: i + 1 }))

    if (sortBy === "rank" || sortBy === "actualCalls")
      return sortOrder === "asc" ? withRanks : [...withRanks].reverse()

    let base: typeof withRanks

    if (sortBy === "year") {
      base = [...withRanks].sort((a, b) => {
        if (a.year !== b.year) return Number(b.year) - Number(a.year)
        return MONTH_ORDER.indexOf(b.month.toUpperCase()) - MONTH_ORDER.indexOf(a.month.toUpperCase())
      })
    } else {
      base = [...withRanks].sort((a, b) => {
        const av = (a as any)[sortBy], bv = (b as any)[sortBy]
        if (av == null) return 1; if (bv == null) return -1
        if (typeof av === "string" && typeof bv === "string")
          return sortOrder === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
        if (typeof av === "number" && typeof bv === "number")
          return sortOrder === "asc" ? av - bv : bv - av
        return 0
      })
    }
    return base
  }, [filteredData, sortBy, sortOrder, yearFilter])

  /* ─── grand totals ──────────────────────────────────────────────────────── */
  const grandTotal = useMemo(() => {
    if (!filteredData.length) return {
      plannedCalls: 0, actualCalls: 0, varianceCalls: 0, variancePercent: 0,
      newClientsActual: 0, oldClientsActual: 0,
    }
    const planned = filteredData.reduce((s, r) => s + (r.plannedCalls || 0), 0)
    const actual = filteredData.reduce((s, r) => s + (r.actualCalls || 0), 0)
    const newC = filteredData.reduce((s, r) => s + (r.newClientsActual || 0), 0)
    const oldC = filteredData.reduce((s, r) => s + (r.oldClientsActual || 0), 0)
    const variance = actual - planned
    return {
      plannedCalls: planned, actualCalls: actual,
      varianceCalls: variance,
      variancePercent: planned !== 0 ? (variance / planned) * 100 : 0,
      newClientsActual: newC, oldClientsActual: oldC,
    }
  }, [filteredData])

  /* ─── monthly chart data ─────────────────────────────────────────────────── */
  const monthlyChartData = useMemo(() =>
    MONTH_ORDER.map(month => {
      const md = filteredData.filter(d => d.month.toUpperCase() === month && (yearFilter === "all" || d.year === yearFilter))
      const planned = md.reduce((s, d) => s + (d.plannedCalls || 0), 0)
      const actual = md.reduce((s, d) => s + (d.actualCalls || 0), 0)
      const newC = md.reduce((s, d) => s + (d.newClientsActual || 0), 0)
      const oldC = md.reduce((s, d) => s + (d.oldClientsActual || 0), 0)
      const variance = actual - planned
      return {
        month: month.substring(0, 3).charAt(0).toUpperCase() + month.substring(1, 3).toLowerCase(),
        planned, actual, newClients: newC, oldClients: oldC, variance,
        variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)),
      }
    }).filter(d => d.planned > 0 || d.actual > 0),
    [filteredData, yearFilter])

  /* ─── selected-month KPIs (graph view) ──────────────────────────────────── */
  const selectedMonthKPIs = useMemo(() => {
    const cd = filteredData.filter(d =>
      (monthFilter === "all" || d.month === monthFilter) &&
      (yearFilter === "all" || d.year === yearFilter))
    const planned = cd.reduce((s, d) => s + (d.plannedCalls || 0), 0)
    const actual = cd.reduce((s, d) => s + (d.actualCalls || 0), 0)
    const newC = cd.reduce((s, d) => s + (d.newClientsActual || 0), 0)
    const oldC = cd.reduce((s, d) => s + (d.oldClientsActual || 0), 0)
    const variance = actual - planned
    return {
      plannedCalls: planned, actualCalls: actual,
      newClientsActual: newC, oldClientsActual: oldC,
      varianceCalls: variance,
      variancePercent: planned !== 0 ? (variance / planned) * 100 : 0,
    }
  }, [filteredData, monthFilter, yearFilter])

  /* ─── quarterly metrics ─────────────────────────────────────────────────── */
  const quarterlyMetrics = useMemo(() => {
    const qs = {
      Q1: ["JANUARY", "FEBRUARY", "MARCH"], Q2: ["APRIL", "MAY", "JUNE"],
      Q3: ["JULY", "AUGUST", "SEPTEMBER"], Q4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
    }
    return Object.entries(qs).map(([quarter, months]) => {
      const qd = filteredData.filter(d => months.includes(d.month.toUpperCase()) && (yearFilter === "all" || d.year === yearFilter))
      const planned = qd.reduce((s, d) => s + (d.plannedCalls || 0), 0)
      const actual = qd.reduce((s, d) => s + (d.actualCalls || 0), 0)
      const variance = actual - planned
      return {
        quarter, planned, actual, variance,
        variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)),
        achieved: actual >= planned,
      }
    }).filter(q => q.planned > 0 || q.actual > 0)
  }, [filteredData, yearFilter])

  /* ─── cumulative chart data ──────────────────────────────────────────────── */
  const cumulativeCallData = useMemo(() => {
    let cp = 0, ca = 0, cn = 0, co = 0
    return monthlyChartData.map(m => {
      cp += m.planned; ca += m.actual; cn += m.newClients; co += m.oldClients
      return {
        month: m.month,
        cumulativePlanned: cp, cumulativeActual: ca,
        cumulativeNew: cn, cumulativeOld: co,
      }
    })
  }, [monthlyChartData])

  /* ─── pagination ─────────────────────────────────────────────────────────── */
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [dateFilter, monthFilter, yearFilter, employeeFilter, companyFilter])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedData.slice(start, start + itemsPerPage)
  }, [sortedData, currentPage, itemsPerPage])

  /* ─── helpers ────────────────────────────────────────────────────────────── */
  const formatNumber = (v: number | undefined | null) =>
    !v || isNaN(v) ? "0" : Math.round(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })
  const formatPct = (v: number | undefined | null) =>
    !v || isNaN(v) ? "0.0" : v.toFixed(1)

  const GT_CELL: React.CSSProperties = { backgroundColor: '#0f172a' }
  const GT_STICKY_NAME: React.CSSProperties = { ...GT_CELL, left: `${NAME_L}px`, boxShadow: SHADOW_R }

  const handleSort = (col: SortKey) => {
    if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortOrder("asc") }
  }
  const SortIcon = ({ col }: { col: SortKey }) =>
    sortBy !== col
      ? <ChevronsUpDown className="ml-1 h-3 w-3 text-slate-400" />
      : sortOrder === "asc"
        ? <ChevronUp className="ml-1 h-3 w-3 text-white" />
        : <ChevronDown className="ml-1 h-3 w-3 text-white" />

  /* ─── custom tooltip ─────────────────────────────────────────────────────── */
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload || {}
    const planned = Number(d.planned ?? 0)
    const actual = Number(d.actual ?? 0)
    const newC = Number(d.newClients ?? 0)
    const oldC = Number(d.oldClients ?? 0)
    const variance = actual - planned
    const vp = planned !== 0 ? (variance / planned) * 100 : 0
    return (
      <div style={{ borderRadius: 12, border: "2px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: 12, backgroundColor: "white", minWidth: 190 }}>
        <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8, fontSize: 14 }}>{label}</div>
        <div className="flex flex-col gap-1">
          {[
            ["Planned Calls", formatNumber(planned), "text-slate-600", "text-blue-700"],
            ["Actual Calls", formatNumber(actual), "text-slate-600", "text-green-700"],
            ["NBD Clients", formatNumber(newC), "text-slate-600", "text-violet-700"],
            ["CRR Clients", formatNumber(oldC), "text-slate-600", "text-amber-700"],
            ["Variance", formatNumber(variance), "text-slate-600", variance >= 0 ? "text-green-700" : "text-red-700"],
          ].map(([lbl, val, lc, vc]) => (
            <div key={lbl} className="flex justify-between">
              <div className={`text-xs ${lc}`}>{lbl}</div>
              <div className={`text-sm font-semibold ${vc}`}>{val}</div>
            </div>
          ))}
          <div className="flex justify-between">
            <div className="text-xs text-slate-600">Variance %</div>
            <div className={`text-sm font-semibold ${vp >= 0 ? "text-green-700" : "text-red-700"}`}>
              {vp >= 0 ? "+" : ""}{formatPct(vp)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Excel download ─────────────────────────────────────────────────────── */
  const handleExcelDownload = async () => {
    const ExcelJS = (await import("exceljs")).default
    const { saveAs } = await import("file-saver")

    const companyLabel = companyFilter === "all" ? "All Companies" : companyFilter
    const monthLabel = monthFilter === "all" ? "All Months" : monthFilter
    const yearLabel = yearFilter === "all" ? "All Years" : yearFilter
    const empLabel = employeeFilter === "all" ? "All Employees" : employeeFilter

    const wb = new ExcelJS.Workbook()
    wb.creator = "Kairali CRM"; wb.created = new Date()
    const ws = wb.addWorksheet(
      companyFilter === "all" ? "All Companies" : companyFilter.slice(0, 31),
      { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 } }
    )
    ws.columns = [
      { width: 6 }, { width: 22 }, { width: 12 }, { width: 12 }, { width: 7 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 14 },
    ]

    const titleFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
    const infoFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    const headerFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
    const greenFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }
    const redFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }
    const altFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
    const thin: any = { style: "thin", color: { argb: "FFE2E8F0" } }
    const borders = { top: thin, left: thin, bottom: thin, right: thin }

    ws.mergeCells("A1:K1")
    const titleRow = ws.getRow(1); titleRow.height = 28
    const titleCell = ws.getCell("A1")
    titleCell.value = "📞  Calls Performance Report"
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" }, name: "Arial" }
    titleCell.fill = titleFill
    titleCell.alignment = { vertical: "middle", horizontal: "center" }

    ws.mergeCells("A2:K2")
    const infoRow = ws.getRow(2); infoRow.height = 20
    const infoCell = ws.getCell("A2")
    infoCell.value = `Company: ${companyLabel}  |  Month: ${monthLabel}  |  Year: ${yearLabel}  |  Employee: ${empLabel}  |  Records: ${sortedData.length}  |  Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`
    infoCell.font = { size: 10, color: { argb: "FFE2E8F0" }, name: "Arial" }
    infoCell.fill = infoFill
    infoCell.alignment = { vertical: "middle", horizontal: "center" }

    ws.getRow(3).height = 6

    const headers = ["Rank", "Employee Name", "Company", "Month", "Year",
      "Planned Calls", "Actual Calls", "Variance", "Variance %", "NBD Clients", "CRR Clients"]
    const hRow = ws.getRow(4); hRow.height = 22
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1)
      cell.value = h
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Arial" }
      cell.fill = headerFill
      cell.alignment = { vertical: "middle", horizontal: i < 2 ? "left" : "center" }
      cell.border = borders
    })

    sortedData.forEach((item, idx) => {
      const r = ws.getRow(5 + idx); r.height = 18
      const isAlt = idx % 2 === 1
      const values = [
        item.rank, item.empName, item.company, item.month, item.year,
        item.plannedCalls || 0,
        item.actualCalls || 0,
        item.varianceCalls || 0,
        item.variancePercent || 0,
        item.newClientsActual || 0,
        item.oldClientsActual || 0,
      ]
      values.forEach((val, ci) => {
        const cell = r.getCell(ci + 1)
        cell.value = val
        cell.font = { size: 10, name: "Arial" }
        cell.border = borders
        cell.alignment = { vertical: "middle", horizontal: ci < 2 ? "left" : "center" }
        const colNum = ci + 1
        if (colNum === 9) {        // Variance %
          const v = Number(val)
          cell.font = { size: 10, name: "Arial", bold: true, color: { argb: v >= 0 ? "FF166534" : "FF991B1B" } }
          cell.fill = v >= 0 ? greenFill : redFill
          cell.numFmt = '0.00"%"'
        } else if (colNum === 8) { // Variance calls
          const v = Number(val)
          cell.font = { size: 10, name: "Arial", bold: true, color: { argb: v >= 0 ? "FF166534" : "FF991B1B" } }
          cell.fill = v >= 0 ? greenFill : redFill
        } else {
          cell.fill = isAlt ? altFill : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
        }
      })
    })

    const buf = await wb.xlsx.writeBuffer()
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `Calls_${companyLabel}_${monthLabel}_${yearLabel}_${format(new Date(), "yyyy-MM-dd")}.xlsx`
    )
  }

  /* ─── print ──────────────────────────────────────────────────────────────── */
  const handleTablePrint = () => {
    const companyLabel = companyFilter === "all" ? "All Companies" : companyFilter
    const monthLabel = monthFilter === "all" ? "All Months" : monthFilter
    const yearLabel = yearFilter === "all" ? "All Years" : yearFilter
    const employeeLabel = employeeFilter === "all" ? "All Employees" : employeeFilter

    const rows = sortedData.map(item => `
      <tr>
        <td>${item.rank}</td><td>${item.empName}</td><td>${item.company}</td>
        <td>${item.month}</td><td>${item.year}</td>
        <td>${item.plannedCalls || 0}</td>
        <td>${item.actualCalls || 0}</td>
        <td style="color:${(item.varianceCalls || 0) >= 0 ? '#166534' : '#991b1b'}">${item.varianceCalls || 0}</td>
        <td style="color:${(item.variancePercent || 0) >= 0 ? '#166534' : '#991b1b'}">${(item.variancePercent || 0).toFixed(1)}%</td>
        <td>${item.newClientsActual || 0}</td>
        <td>${item.oldClientsActual || 0}</td>
      </tr>`).join("")

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Calls Report – ${companyLabel}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b}.header{margin-bottom:12px;border-bottom:2px solid #1e293b;padding-bottom:8px}.title{font-size:18px;font-weight:bold;color:#1e293b}.company-badge{display:inline-block;margin-top:4px;background:#1e3a5f;color:white;padding:3px 12px;border-radius:4px;font-size:13px;font-weight:bold}.meta-row{margin-top:6px;font-size:10px;color:#475569}.meta-row span{margin-right:16px}.label{font-weight:600;color:#334155}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e293b;color:white;padding:6px 7px;text-align:left;font-size:9.5px;white-space:nowrap}td{padding:5px 7px;border-bottom:1px solid #e2e8f0;font-size:9.5px}tr:nth-child(even) td{background:#f8fafc}@page{margin:12mm 10mm;size:A4 landscape}</style>
</head><body>
<div class="header">
  <div class="title">Calls Performance Report</div>
  <div class="company-badge">🏢 ${companyLabel}</div>
  <div class="meta-row">
    <span><span class="label">Month:</span> ${monthLabel}</span>
    <span><span class="label">Year:</span> ${yearLabel}</span>
    <span><span class="label">Employee:</span> ${employeeLabel}</span>
    <span><span class="label">Records:</span> ${sortedData.length}</span>
    <span><span class="label">Printed:</span> ${format(new Date(), "dd MMM yyyy, hh:mm a")}</span>
  </div>
</div>
<table><thead><tr>
  <th>Rank</th><th>Employee Name</th><th>Company</th><th>Month</th><th>Year</th>
  <th>Planned Calls</th><th>Actual Calls</th><th>Variance</th><th>Variance %</th>
  <th>NBD Clients</th><th>CRR Clients</th>
</tr></thead><tbody>${rows}</tbody></table>
</body></html>`

    const win = window.open("", "_blank", "width=1200,height=800")
    if (!win) return
    win.document.write(html); win.document.close(); win.focus(); win.print(); win.close()
  }

  /* ─── static employees ───────────────────────────────────────────────────── */
  const staticEmployees = [
    "Puneet Endlay", "Pawan Kamra", "Sadik Rehman", "Vidisha Bahukhandi",
    "Harpal Singh", "Zaki Ahmed", "Pushpanshu Kumar (KTAHV)", "Pushpanshu Kumar (KAPPL)",
    "Levil Kumar", "Pushpanshu Kumar (VILLARAAG)", "Pawan Kamra (VILLARAAG)",
    "Sadik Rehman (VILLARAAG)", "Harpal Singh (VILLARAAG)", "Levil Kumar (VILLARAAG)",
    "Online order", "OTA ", "Online Reservation",
  ]

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      {showLoader && <PageLoader />}

      <div className="relative z-10">
        <div className="w-full space-y-8">

          {/* ── HERO HEADER ────────────────────────────────────────────────── */}
          <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.08),transparent_40%)]" />
            <div className="relative px-6 py-8 md:px-8 md:py-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                    <Phone className="w-8 h-8 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">Calls Performance Dashboard</h1>
                    <p className="text-sm md:text-base text-white/90">Real-time call analytics and performance insights</p>
                  </div>
                </div>
                <div className="flex md:inline-flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-5 py-3 shadow-lg w-full md:w-auto">
                  <div className="text-center">
                    <p className="text-xs text-white/80 font-semibold tracking-wide mb-1">Last Updated</p>
                    {lastUpdated
                      ? <p className="text-sm font-bold text-white leading-snug">{lastUpdated.toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}</p>
                      : <p className="text-sm text-white/60 italic">Loading…</p>}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── LOAD FAILURE PANEL ─────────────────────────────────────────── */}
          {loadFailed && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-4 sm:px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-semibold text-red-800 leading-tight">Could not load calls report data</h3>
                  <p className="text-xs sm:text-sm text-red-700/90 mt-1 break-words">{error}</p>
                  <p className="text-xs text-red-700/70 mt-1">Metrics and tables below may be empty or out of date.</p>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 border border-red-600 shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all duration-200"
                >
                  <RefreshCw className="w-4 h-4" />Retry
                </button>
              </div>
            </div>
          )}

          {/* ── FILTERS ────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Filters & Search</h3>
                  <p className="text-xs text-slate-500">Narrow down results quickly</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const now = new Date()
                  setSearchQuery(""); setDateFilter("all"); setCustomFromDate(""); setCustomToDate("")
                  setMonthFilter(MONTH_ORDER[now.getMonth()]); setYearFilter(now.getFullYear().toString())
                  setFilterMode("monthYear"); setEmployeeFilter("all"); setCompanyFilter("all")
                  setSortBy("rank"); setSortOrder("asc"); setView("table"); setCurrentPage(1)
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 shadow-sm hover:bg-slate-100 hover:border-slate-400 active:scale-[0.98] transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>

            <div className="px-4 sm:px-5 py-5">
              <form onSubmit={e => e.preventDefault()} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">

                {/* Search */}
                <div className="order-2 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Search</label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="Employee or company" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-11 sm:h-10 w-full rounded-md border-gray-300" />
                  </div>
                </div>

                {/* Date Range */}
                <div className="order-3 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "monthYear" ? "text-slate-300" : "text-slate-500"}`}>Date Range</label>
                  <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "monthYear" ? "opacity-40" : ""}`}><SelectValue placeholder="All Dates" /></SelectTrigger>
                    <SelectContent>
                      {[["all", "All Dates"], ["today", "Today"], ["this_week", "This Week"], ["this_month", "This Month"], ["this_quarter", "This Quarter"], ["this_year", "This Year"], ["last_month", "Last Month"], ["last_quarter", "Last Quarter"], ["last_year", "Last Year"], ["custom", "Custom Range"]].map(([v, l]) =>
                        <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month */}
                <div className="order-4 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "dateRange" ? "text-slate-300" : "text-slate-500"}`}>Month</label>
                  <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "dateRange" ? "opacity-40" : ""}`}><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTH_ORDER.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="order-5 sm:order-none">
                  <label className={`text-xs mb-1 block uppercase font-semibold tracking-wide ${filterMode === "dateRange" ? "text-slate-300" : "text-slate-500"}`}>Year</label>
                  <Select value={yearFilter} onValueChange={handleYearFilterChange}>
                    <SelectTrigger className={`h-11 sm:h-10 w-full rounded-md border-gray-300 transition-opacity ${filterMode === "dateRange" ? "opacity-40" : ""}`}><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee */}
                <div className="order-6 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Employee</label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All employees" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      {staticEmployees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company */}
                <div className="order-1 sm:order-none">
                  <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Company</label>
                  {/* Mobile pill buttons (hidden on sm+) */}
                  <div className="flex sm:hidden w-full rounded-lg overflow-hidden border border-slate-300">
                    {[{ value: "all", label: "ALL" }, { value: "KTAHV", label: "KTAHV" }, { value: "KAPPL", label: "KAPPL" }, { value: "VILLARAAG", label: "VILLA RAAG" }]
                      .map(({ value, label }, idx, arr) => (
                        <button key={value} type="button"
                          onClick={() => { setCompanyFilter(value); setCurrentPage(1) }}
                          className={`flex-1 py-2.5 text-xs font-bold transition-all duration-200 active:scale-95 ${idx !== arr.length - 1 ? "border-r border-slate-300" : ""} ${companyFilter === value ? "bg-teal-600 text-white" : "bg-white text-teal-700 hover:bg-teal-50"}`}>
                          {label}
                        </button>
                      ))}
                  </div>
                  {/* Desktop dropdown (hidden on mobile) */}
                  <div className="hidden sm:block">
                    <Select value={companyFilter} onValueChange={val => { setCompanyFilter(val); setCurrentPage(1) }}>
                      <SelectTrigger className="h-11 sm:h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All companies" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ALL</SelectItem>
                        <SelectItem value="KTAHV">KTAHV</SelectItem>
                        <SelectItem value="KAPPL">KAPPL</SelectItem>
                        <SelectItem value="VILLARAAG">VILLA RAAG</SelectItem>
                        {availableCompanies.filter(c => !["KTAHV", "KAPPL", "VILLARAAG"].includes(c)).map(c =>
                          <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </form>

              {/* Custom date range pickers */}
              {filterMode === "dateRange" && dateFilter === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-1 border-t border-slate-200">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">Start Date</label>
                    <Input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} className="h-11 w-full rounded-md border-gray-300" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block uppercase font-semibold tracking-wide">End Date</label>
                    <Input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} className="h-11 w-full rounded-md border-gray-300" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
          <div className="mt-8 hidden sm:block">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Key Performance Indicators</h3>
                    <p className="text-xs text-slate-500">Overview of call metrics & performance</p>
                  </div>
                </div>
              </div>
              <div className="px-4 sm:px-5 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 md:gap-4">

                  {/* Planned Calls */}
                  <div className="relative min-h-[170px] rounded-2xl border border-blue-200 bg-gradient-to-br from-white via-blue-50 to-blue-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-800">Planned Calls</p><p className="text-xs font-medium text-slate-600 mt-1">Target Calls</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-200/70 shrink-0 ml-2"><Phone className="h-5 w-5 text-blue-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-slate-900 leading-tight break-all">{formatNumber(grandTotal.plannedCalls)}</p>
                    </div>
                  </div>

                  {/* Actual Calls */}
                  <div className="relative min-h-[170px] rounded-2xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Actual Calls</p><p className="text-xs font-medium text-slate-600 mt-1">Calls Made</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-200/70 shrink-0 ml-2"><Activity className="h-5 w-5 text-emerald-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-slate-900 leading-tight break-all">{formatNumber(grandTotal.actualCalls)}</p>
                    </div>
                  </div>

                  {/* Variance */}
                  <div className={`relative min-h-[170px] rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 ${grandTotal.varianceCalls >= 0 ? "border-green-200 bg-gradient-to-br from-white via-green-50 to-green-100/70" : "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/70"}`}>
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className={`text-sm font-semibold uppercase tracking-wide ${grandTotal.varianceCalls >= 0 ? "text-green-800" : "text-red-800"}`}>Variance</p><p className="text-xs font-medium text-slate-600 mt-1">Gap Analysis</p></div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ml-2 ${grandTotal.varianceCalls >= 0 ? "bg-green-200/70" : "bg-red-200/70"}`}>
                          <Activity className={`h-5 w-5 ${grandTotal.varianceCalls >= 0 ? "text-green-700" : "text-red-700"}`} />
                        </div>
                      </div>
                      <p className={`text-[15px] xl:text-[17px] font-extrabold leading-tight break-all ${grandTotal.varianceCalls >= 0 ? "text-green-700" : "text-red-700"}`}>{formatNumber(grandTotal.varianceCalls)}</p>
                    </div>
                  </div>

                  {/* Variance % */}
                  <div className={`relative min-h-[170px] rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 ${grandTotal.variancePercent >= 0 ? "border-green-200 bg-gradient-to-br from-white via-green-50 to-green-100/70" : "border-red-200 bg-gradient-to-br from-white via-red-50 to-red-100/70"}`}>
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className={`text-sm font-semibold uppercase tracking-wide ${grandTotal.variancePercent >= 0 ? "text-green-800" : "text-red-800"}`}>Variance %</p><p className="text-xs font-medium text-slate-600 mt-1">Achievement Rate</p></div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ml-2 ${grandTotal.variancePercent >= 0 ? "bg-green-200/70" : "bg-red-200/70"}`}>
                          <Award className={`h-5 w-5 ${grandTotal.variancePercent >= 0 ? "text-green-700" : "text-red-700"}`} />
                        </div>
                      </div>
                      <p className={`text-[15px] xl:text-[17px] font-extrabold leading-tight break-all ${grandTotal.variancePercent >= 0 ? "text-green-700" : "text-red-700"}`}>{formatPct(grandTotal.variancePercent)}%</p>
                    </div>
                  </div>

                  {/* NBD Clients */}
                  <div className="relative min-h-[170px] rounded-2xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-violet-100/70 shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-violet-800">NBD Clients</p><p className="text-xs font-medium text-slate-600 mt-1">Acquired This Period</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-200/70 shrink-0 ml-2"><UserPlus className="h-5 w-5 text-violet-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-violet-700 leading-tight break-all">{formatNumber(grandTotal.newClientsActual)}</p>
                    </div>
                  </div>

                  {/* CRR Clients */}
                  <div className="group relative min-h-[170px] rounded-2xl border border-amber-200 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/40 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1">
                    <div className="flex h-full flex-col justify-between p-5">
                      <div className="flex items-start justify-between">
                        <div><p className="text-sm font-semibold uppercase tracking-wide text-amber-800">CRR Clients</p><p className="text-xs font-medium text-slate-500 mt-1">Returning Clients</p></div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shrink-0 ml-2"><UserCheck className="h-5 w-5 text-amber-700" /></div>
                      </div>
                      <p className="text-[15px] xl:text-[17px] font-extrabold text-amber-700 leading-tight break-all">{formatNumber(grandTotal.oldClientsActual)}</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>{/* end w-full space-y-8 */}

        {/* ── MAIN TABLE CARD ────────────────────────────────────────────── */}
        <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white mt-8">
          <div ref={resultsRef} className="w-full -mt-2 sm:-mt-3 px-4 sm:px-6 py-2.5 bg-[#f5f9ff] border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Calls Performance Analytics</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">{filteredDateGroups.length} Dates · {filteredDateGroups.reduce((s, g) => s + g.employees.length, 0)} Records</span>
              </div>
              <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                <button onClick={() => setView("table")} aria-pressed={view === "table"}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border transition-all duration-200 ${view === "table" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"}`}>
                  <TableIcon className="h-4 w-4" />Table View
                </button>
                <button onClick={() => setView("graph")} aria-pressed={view === "graph"}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border transition-all duration-200 ${view === "graph" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"}`}>
                  <BarChart3 className="h-4 w-4" />Graph View
                </button>
                {/* <button onClick={handleExcelDownload} title="Download Excel"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 transition-all duration-200">
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span>
                </button>
                <button onClick={handleTablePrint} title="Print Table"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-md border bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100 transition-all duration-200">
                  <Printer className="h-4 w-4" /><span className="hidden sm:inline">Print</span>
                </button> */}
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {view === "table" ? (
              <div className="space-y-0 p-0">

                {/* ── COLLAPSIBLE DATE-GROUPED TABLE (Adwords style) ───────── */}
                {loading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredDateGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    {loadFailed ? (
                      <>
                        <AlertTriangle className="h-12 w-12 text-red-300 mb-4" />
                        <p className="text-base font-semibold text-slate-600 mb-1">Data could not be loaded</p>
                        <button
                          type="button"
                          onClick={() => refetch()}
                          className="mt-2 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 shadow-sm hover:bg-slate-100 active:scale-[0.98] transition-all duration-200"
                        >
                          <RefreshCw className="w-4 h-4" />Retry
                        </button>
                      </>
                    ) : (
                      <>
                        <Calendar className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-base font-semibold text-slate-600 mb-1">No data found</p>
                        <p className="text-sm text-slate-400">Try adjusting your filters</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                      <table className="border-collapse" style={{ minWidth: "950px", width: "100%", tableLayout: "fixed" }}>
                        <colgroup>
                          <col style={{ width: "220px" }} /> {/* Date / Employee */}
                          <col style={{ width: "110px" }} /> {/* Company */}
                          <col style={{ width: "110px" }} /> {/* Planned */}
                          <col style={{ width: "110px" }} /> {/* Actual */}
                          <col style={{ width: "100px" }} /> {/* Variance */}
                          <col style={{ width: "80px" }} /> {/* Var% */}
                          <col style={{ width: "110px" }} /> {/* NBD Clients */}
                          <col style={{ width: "110px" }} /> {/* CRR Clients */}
                        </colgroup>

                        {/* ── THEAD ───────────────────────────────────────── */}
                        <thead>
                          <tr style={{ background: "linear-gradient(to right, #1e293b, #334155, #1e293b)" }}>

                            <th
                              style={{ backgroundColor: "#1e293b", position: "sticky", left: 0, zIndex: 3, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.4)" }}
                              className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600 min-w-[220px]"
                            >
                              <span className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                Date / Employee
                              </span>
                            </th>

                            <th
                              style={{ backgroundColor: "#1e293b" }}
                              className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-300 border-r border-slate-600"
                            >
                              Company
                            </th>

                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-blue-300 border-r border-slate-600">
                              Planned
                            </th>

                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-green-300 border-r border-slate-600">
                              Actual
                            </th>

                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600">
                              Variance
                            </th>

                            <th style={{ backgroundColor: "#1e293b" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-white border-r border-slate-600">
                              Var%
                            </th>

                            <th style={{ backgroundColor: "#4c1d95" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-violet-200 border-r border-violet-700">
                              NBD Clients
                            </th>

                            <th style={{ backgroundColor: "#78350f" }} className="px-3 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-amber-200 border-r border-amber-700">
                              CRR Clients
                            </th>

                          </tr>
                        </thead>

                        {/* ── TBODY — one tbody per date group ────────────── */}
                        {paginatedDateGroups.map((group) => {
                          const isExpanded = expandedDates.has(group.date)
                          const varPct = group.totalPlanned !== 0
                            ? ((group.totalVariance / group.totalPlanned) * 100) : 0
                          const dateRowBg = "#f1f5f9"
                          const dateRowHover = "#cbd5e1"

                          return (
                            <tbody key={group.date}>
                              {/* ── Date summary row ─────────────────────── */}
                              <tr
                                className="cursor-pointer border-b-2 border-slate-300 transition-colors"
                                style={{ backgroundColor: dateRowBg }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowHover}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowBg}
                                onClick={() => toggleDate(group.date)}
                              >
                                {/* Sticky date cell */}
                                <td
                                  style={{ backgroundColor: dateRowBg, position: "sticky", left: 0, zIndex: 2, boxShadow: "4px 0 8px -2px rgba(0,0,0,0.08), 2px 0 0 0 #e2e8f0", transition: "background-color 150ms" }}
                                  className="px-4 py-3 border-r border-slate-300 group-hover:!bg-slate-300"
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowHover}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = dateRowBg}
                                >
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`flex items-center justify-center w-5 h-5 rounded-md shrink-0 transition-all duration-200 ${isExpanded ? "bg-blue-600 text-white shadow-sm" : "bg-slate-300 text-slate-600"}`}>
                                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      </div>
                                      <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                      <span className="font-bold text-slate-900 text-xs tabular-nums">{group.displayDate}</span>
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-200 text-slate-600 border-slate-300 font-medium shrink-0">{group.employees.length}</Badge>
                                    </div>
                                    {/* Download & Print inline buttons — Google Ads style */}
                                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                      <button
                                        title={`Download ${group.displayDate}`}
                                        onClick={async () => {
                                          const ExcelJS = (await import("exceljs")).default
                                          const { saveAs } = await import("file-saver")
                                          const wb = new ExcelJS.Workbook()
                                          wb.creator = "Kairali CRM"; wb.created = new Date()
                                          const ws = wb.addWorksheet(group.displayDate)
                                          const COL_COUNT = 9

                                          // ── Row 1: Title ──────────────────────────────
                                          ws.mergeCells(1, 1, 1, COL_COUNT)
                                          const titleCell = ws.getCell("A1")
                                          titleCell.value = "📞  Calls Performance Report"
                                          titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" }, name: "Arial" }
                                          titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }
                                          titleCell.alignment = { vertical: "middle", horizontal: "center" }
                                          ws.getRow(1).height = 28

                                          // ── Row 2: Date info ──────────────────────────
                                          ws.mergeCells(2, 1, 2, COL_COUNT)
                                          const infoCell = ws.getCell("A2")
                                          infoCell.value = `Date: ${group.displayDate}  |  Company: ${companyFilter === "all" ? "All Companies" : companyFilter}  |  Employees: ${group.employees.length}  |  Generated: ${new Date().toLocaleString("en-IN")}`
                                          infoCell.font = { size: 10, color: { argb: "FFE2E8F0" }, name: "Arial" }
                                          infoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
                                          infoCell.alignment = { vertical: "middle", horizontal: "center" }
                                          ws.getRow(2).height = 20

                                          // ── Row 3: Spacer ─────────────────────────────
                                          ws.getRow(3).height = 6

                                          // ── Row 4: Column headers ─────────────────────
                                          ws.columns = [
                                            { key: "dt", width: 14 },
                                            { key: "emp", width: 26 },
                                            { key: "co", width: 12 },
                                            { key: "pl", width: 12 },
                                            { key: "ac", width: 12 },
                                            { key: "va", width: 12 },
                                            { key: "vp", width: 10 },
                                            { key: "nc", width: 10 },
                                            { key: "oc", width: 10 },
                                          ]
                                          const headerLabels = ["Date", "Employee", "Company", "Planned", "Actual", "Variance", "Var%", "NBD Clients", "CRR Clients"]
                                          const hRow = ws.getRow(4)
                                          hRow.height = 22
                                          headerLabels.forEach((lbl, i) => {
                                            const cell = hRow.getCell(i + 1)
                                            cell.value = lbl
                                            cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" }, name: "Arial" }
                                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
                                            cell.alignment = { vertical: "middle", horizontal: i < 2 ? "left" : "center" }
                                            cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } }
                                          })

                                          // ── Rows 5+: Data ─────────────────────────────
                                          const thin = { style: "thin" as const, color: { argb: "FFE2E8F0" } }
                                          const borders = { top: thin, left: thin, bottom: thin, right: thin }
                                          const greenFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }
                                          const redFill: any = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }

                                          group.employees.forEach((emp, i) => {
                                            const vp = emp.plannedCalls !== 0 ? (emp.varianceCalls / emp.plannedCalls) * 100 : 0
                                            const r = ws.getRow(5 + i)
                                            r.height = 18
                                            const altFill: any = i % 2 === 1
                                              ? { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } }
                                              : { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } }
                                            const vals = [group.displayDate, emp.empName, emp.company, emp.plannedCalls, emp.actualCalls, emp.varianceCalls, Number(vp.toFixed(1)), emp.newClientsActual, emp.oldClientsActual]
                                            vals.forEach((val, ci) => {
                                              const cell = r.getCell(ci + 1)
                                              cell.value = val
                                              cell.font = { size: 10, name: "Arial" }
                                              cell.border = borders
                                              cell.alignment = { vertical: "middle", horizontal: ci < 2 ? "left" : "center" }
                                              if (ci === 6) { // Var%
                                                cell.font = { size: 10, name: "Arial", bold: true, color: { argb: Number(val) >= 0 ? "FF166534" : "FF991B1B" } }
                                                cell.fill = Number(val) >= 0 ? greenFill : redFill
                                                cell.numFmt = '0.00"%"'
                                              } else if (ci === 5) { // Variance
                                                cell.font = { size: 10, name: "Arial", bold: true, color: { argb: Number(val) >= 0 ? "FF166534" : "FF991B1B" } }
                                                cell.fill = Number(val) >= 0 ? greenFill : redFill
                                              } else {
                                                cell.fill = altFill
                                              }
                                            })
                                          })

                                          const buf = await wb.xlsx.writeBuffer()
                                          saveAs(new Blob([buf], { type: "application/octet-stream" }), `Calls_${group.date}.xlsx`)
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-400 transition-all"
                                      >
                                        <Download className="h-3 w-3" />
                                      </button>
                                      <button
                                        title={`Print ${group.displayDate}`}
                                        onClick={() => {
                                          const rows = group.employees.map(emp => {
                                            const vp = emp.plannedCalls !== 0 ? (emp.varianceCalls / emp.plannedCalls * 100).toFixed(1) : "0.0"
                                            return `<tr><td>${emp.empName}</td><td>${emp.company}</td><td>${emp.plannedCalls}</td><td>${emp.actualCalls}</td><td style="color:${emp.varianceCalls >= 0 ? "#166534" : "#991b1b"}">${emp.varianceCalls}</td><td style="color:${Number(vp) >= 0 ? "#166534" : "#991b1b"}">${vp}%</td><td>${emp.newClientsActual}</td><td>${emp.oldClientsActual}</td></tr>`
                                          }).join("")
                                          const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Calls – ${group.displayDate}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;padding:16px}.title{font-size:16px;font-weight:bold;margin-bottom:4px}.date{font-size:12px;color:#475569;margin-bottom:12px}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:10px}td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px}tr:nth-child(even) td{background:#f8fafc}@page{margin:10mm;size:A4 landscape}</style></head><body><div class="title">Calls Report — ${group.displayDate}</div><div class="date">Company: ${companyFilter === "all" ? "All" : companyFilter} · ${group.employees.length} employees</div><table><thead><tr><th>Employee</th><th>Company</th><th>Planned</th><th>Actual</th><th>Variance</th><th>Var%</th><th>NBD</th><th>CRR</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
                                          const win = window.open("", "_blank", "width=1000,height=700")
                                          if (!win) return
                                          win.document.write(html); win.document.close(); win.focus(); win.print(); win.close()
                                        }}
                                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:border-slate-400 transition-all"
                                      >
                                        <Printer className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                {/* Company column (date row me blank rahega) */}
                                <td className="text-center px-3 py-3 text-xs text-slate-400">
                                  —
                                </td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-blue-700 bg-blue-50/60">{formatNumber(group.totalPlanned)}</td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-green-700 bg-green-50/60">{formatNumber(group.totalActual)}</td>
                                <td className={`text-center px-3 py-3 font-bold text-xs ${group.totalVariance >= 0 ? "text-green-700 bg-green-50/40" : "text-red-700 bg-red-50/40"}`}>{formatNumber(group.totalVariance)}</td>
                                <td className="text-center px-3 py-3">
                                  <Badge variant="outline" className={`font-bold px-1.5 py-0 text-xs ${varPct >= 0 ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}`}>
                                    {varPct >= 0 ? "+" : ""}{varPct.toFixed(1)}%
                                  </Badge>
                                </td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-violet-700 bg-violet-50/60">{formatNumber(group.totalNewActual)}</td>
                                <td className="text-center px-3 py-3 font-bold text-xs text-amber-700 bg-amber-50/60">{formatNumber(group.totalOldActual)}</td>
                                {/* <td className="text-center px-3 py-3 text-xs text-slate-400">—</td> */}
                              </tr>

                              {/* ── Expanded employee rows ────────────────── */}
                              {isExpanded && group.employees.map((emp, ri) => {
                                const evenRow = ri % 2 === 0
                                const rowBg = evenRow ? "#ffffff" : "#f8fafc"
                                const empVarPct = emp.plannedCalls !== 0
                                  ? (emp.varianceCalls / emp.plannedCalls) * 100 : 0

                                return (
                                  <tr
                                    key={`${group.date}-${emp.empName}-${ri}`}
                                    className="border-b border-slate-100 transition-colors"
                                    style={{ backgroundColor: rowBg }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#e2e8f0"}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = rowBg}
                                  >

                                    {/* Employee */}
                                    <td
                                      style={{
                                        backgroundColor: rowBg,
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 2,
                                        boxShadow: "4px 0 8px -2px rgba(0,0,0,0.06), 2px 0 0 0 #f1f5f9",
                                        transition: "background-color 150ms"
                                      }}
                                      className="px-4 py-2.5 border-r border-slate-100"
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "#e2e8f0"}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = rowBg}
                                    >
                                      <div className="flex items-center gap-2 pl-8">
                                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                                          {ri + 1}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]" title={emp.empName}>
                                          {emp.empName}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Company (SHIFTED HERE) */}
                                    <td className="text-center px-3 py-2.5">
                                      <Badge
                                        variant="outline"
                                        className={`font-bold px-1 py-0 text-xs ${emp.company === "KTAHV"
                                          ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300"
                                          : emp.company === "KAPPL"
                                            ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300"
                                            : "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300"
                                          }`}
                                      >
                                        {emp.company}
                                      </Badge>
                                    </td>

                                    {/* Planned */}
                                    <td className="text-center px-3 py-2.5 text-xs font-bold text-blue-700">
                                      {formatNumber(emp.plannedCalls)}
                                    </td>

                                    {/* Actual */}
                                    <td className="text-center px-3 py-2.5 text-xs font-bold text-green-700">
                                      {Number(emp.actualCalls) > 0 ? (
                                        <span className="relative group/tip">
                                          <a
                                            href={
                                              "https://script.google.com/macros/s/AKfycbwN81e5Do-rMD8etSgOu7QE9ZUn61zABmQQJP2pAsHzerT6dHKecbXVANS8Cot5aWs5Kg/exec" +
                                              `?company=${encodeURIComponent(emp.company)}&employee=${encodeURIComponent(normalizeEmployeeForApi(emp.empName))}&month=${encodeURIComponent(group.month)}&year=${encodeURIComponent(group.year)}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-700 underline font-bold hover:text-green-900 transition-colors"
                                          >
                                            {formatNumber(emp.actualCalls)}
                                          </a>

                                          <span className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover/tip:block bg-black text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-30">
                                            Click for detailed call report
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-green-700 font-medium">0</span>
                                      )}
                                    </td>

                                    {/* Variance */}
                                    <td className={`text-center px-3 py-2.5 text-xs font-bold ${emp.varianceCalls >= 0 ? "text-green-700" : "text-red-700"
                                      }`}>
                                      {formatNumber(emp.varianceCalls)}
                                    </td>

                                    {/* Variance % */}
                                    <td className="text-center px-3 py-2.5">
                                      <Badge
                                        variant="outline"
                                        className={`font-bold px-1 py-0 text-xs ${empVarPct >= 0
                                          ? "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300"
                                          : "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300"
                                          }`}
                                      >
                                        {empVarPct >= 0 ? "+" : ""}
                                        {empVarPct.toFixed(1)}%
                                      </Badge>
                                    </td>

                                    {/* NBD */}
                                    <td className="text-center px-3 py-2.5 text-xs font-semibold text-violet-700">
                                      {formatNumber(emp.newClientsActual)}
                                    </td>

                                    {/* CRR */}
                                    <td className="text-center px-3 py-2.5 text-xs font-semibold text-amber-700">
                                      {formatNumber(emp.oldClientsActual)}
                                    </td>

                                  </tr>
                                )
                              })}
                            </tbody>
                          )
                        })}

                        {/* ── GRAND TOTAL ──────────────────────────────── */}
                        {filteredDateGroups.length > 1 && (
                          <tfoot>
                            <tr style={{ borderTop: "4px solid #f59e0b" }}>

                              <td
                                style={{
                                  backgroundColor: "#0f172a",
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 2,
                                  boxShadow: "4px 0 8px -2px rgba(0,0,0,0.5)"
                                }}
                                className="font-extrabold text-xs text-white text-left px-4 py-4 border-r border-slate-700"
                              >
                                GRAND TOTAL
                              </td>

                              <td
                                className="text-center px-3 py-4 border-r border-slate-700 text-slate-400"
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                —
                              </td>

                              <td
                                className="font-bold text-sm text-blue-400 text-center px-3 py-4 border-r border-slate-700"
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {formatNumber(dateGrandTotal.planned)}
                              </td>

                              <td
                                className="font-bold text-sm text-green-400 text-center px-3 py-4 border-r border-slate-700"
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {formatNumber(dateGrandTotal.actual)}
                              </td>

                              <td
                                className={`font-bold text-sm text-center px-3 py-4 border-r border-slate-700 ${dateGrandTotal.variance >= 0 ? "text-green-400" : "text-red-400"
                                  }`}
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {formatNumber(dateGrandTotal.variance)}
                              </td>

                              <td
                                className={`font-bold text-sm text-center px-3 py-4 border-r border-slate-700 ${dateGrandTotal.variancePercent >= 0 ? "text-green-400" : "text-red-400"
                                  }`}
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {dateGrandTotal.variancePercent >= 0 ? "+" : ""}
                                {formatPct(dateGrandTotal.variancePercent)}%
                              </td>

                              <td
                                className="font-bold text-sm text-violet-400 text-center px-3 py-4 border-r border-slate-700"
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {formatNumber(dateGrandTotal.newActual)}
                              </td>

                              <td
                                className="font-bold text-sm text-amber-400 text-center px-3 py-4 border-r border-slate-700"
                                style={{ backgroundColor: "#0f172a" }}
                              >
                                {formatNumber(dateGrandTotal.oldActual)}
                              </td>

                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {/* ── PAGINATION ──────────────────────────────────────── */}
                    <div className="sticky bottom-0 z-20 sm:static border-t border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-600">
                          <span className="font-medium">Rows</span>
                          <select aria-label="Rows per page" value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                          </select>
                          <span className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-700">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredDateGroups.length)}–{Math.min(currentPage * itemsPerPage, filteredDateGroups.length)}</span> of <span className="font-semibold text-slate-700">{filteredDateGroups.length}</span> dates
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600">
                          <span>Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalDatePages}</span></span>
                          <div className="flex items-center gap-1">
                            <input aria-label="Go to page" type="number" min={1} max={totalDatePages} value={goToPage} onChange={e => setGoToPage(e.target.value)} placeholder="Go" className="w-16 h-9 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <button onClick={() => { const p = Number(goToPage); if (p >= 1 && p <= totalDatePages) { setCurrentPage(p); setGoToPage("") } }} className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">Go</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Previous</button>
                          <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalDatePages))} disabled={currentPage === totalDatePages} className="px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition">Next</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>) : (

              /* ── GRAPH VIEW ──────────────────────────────────────────────── */
              <div className="space-y-6">

                {/* Month KPI summary cards */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{monthFilter} {yearFilter}</h2>
                    <p className="text-sm text-slate-600 mt-1">Calls Performance Overview & Metrics</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-5">
                    {[
                      { icon: <Phone className="w-6 h-6 text-blue-600" />, bg: "bg-blue-100", badge: "PLANNED", badgeCls: "bg-blue-50 text-blue-700 border-blue-200", label: "Planned Calls", val: selectedMonthKPIs.plannedCalls, color: "text-slate-900", note: "Monthly target benchmark", hoverBorder: "hover:border-blue-300" },
                      { icon: <Activity className="w-6 h-6 text-green-600" />, bg: "bg-green-100", badge: "ACHIEVED", badgeCls: "bg-green-50 text-green-700 border-green-200", label: "Actual Calls", val: selectedMonthKPIs.actualCalls, color: "text-slate-900", note: null, hoverBorder: "hover:border-green-300" },
                      { icon: <UserPlus className="w-6 h-6 text-violet-600" />, bg: "bg-violet-100", badge: "NEW", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", label: "NBD Clients", val: selectedMonthKPIs.newClientsActual, color: "text-violet-700", note: "Newly acquired clients", hoverBorder: "hover:border-violet-300" },
                      { icon: <UserCheck className="w-6 h-6 text-amber-600" />, bg: "bg-amber-100", badge: "RETURNING", badgeCls: "bg-amber-50 text-amber-700 border-amber-200", label: "CRR Clients", val: selectedMonthKPIs.oldClientsActual, color: "text-amber-700", note: "Returning clients", hoverBorder: "hover:border-amber-300" },
                    ].map(c => (
                      <Card key={c.label} className={`border border-slate-200 ${c.hoverBorder} transition-colors`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 ${c.bg} rounded-lg`}>{c.icon}</div>
                            <Badge variant="outline" className={`${c.badgeCls} text-xs font-medium`}>{c.badge}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{c.label}</p>
                          <p className={`text-xl font-bold ${c.color} mb-2 break-all`}>{formatNumber(c.val)}</p>
                          {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
                        </CardContent>
                      </Card>
                    ))}
                    {/* Variance card */}
                    <Card className={`border border-slate-200 ${selectedMonthKPIs.varianceCalls >= 0 ? "hover:border-green-300" : "hover:border-red-300"} transition-colors`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg ${selectedMonthKPIs.varianceCalls >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                            <Activity className={`w-6 h-6 ${selectedMonthKPIs.varianceCalls >= 0 ? "text-green-600" : "text-red-600"}`} />
                          </div>
                          <Badge variant="outline" className={selectedMonthKPIs.varianceCalls >= 0 ? "bg-green-50 text-green-700 border-green-200 text-xs font-medium" : "bg-red-50 text-red-700 border-red-200 text-xs font-medium"}>
                            {selectedMonthKPIs.varianceCalls >= 0 ? "SURPLUS" : "DEFICIT"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Variance</p>
                        <p className={`text-xl font-bold mb-2 break-all ${selectedMonthKPIs.varianceCalls >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatNumber(Math.abs(selectedMonthKPIs.varianceCalls))}
                        </p>
                        <p className="text-xs text-slate-500">
                          <span className={`font-semibold text-sm ${selectedMonthKPIs.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {selectedMonthKPIs.variancePercent >= 0 ? "+" : ""}{formatPct(selectedMonthKPIs.variancePercent)}%
                          </span> from target
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Quarter + Performance Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 rounded-lg"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
                        <div><CardTitle className="text-base font-bold text-slate-800">Quarter Performance</CardTitle><p className="text-xs text-slate-500 mt-0.5">Q1 to Q4 calls breakdown</p></div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {quarterlyMetrics.length > 0 ? quarterlyMetrics.map(q => (
                          <div key={q.quarter} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${q.achieved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{q.quarter}</div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{formatNumber(q.actual)} calls</div>
                                <div className="text-xs text-slate-500">Target: {formatNumber(q.planned)}</div>
                              </div>
                            </div>
                            <div className={`text-sm font-bold ${q.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {q.variancePercent >= 0 ? "+" : ""}{q.variancePercent}%
                            </div>
                          </div>
                        )) : <div className="text-center py-8 text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">No quarterly data available</p></div>}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-slate-200 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-purple-100 rounded-lg"><Award className="w-5 h-5 text-purple-600" /></div>
                        <div><CardTitle className="text-base font-bold text-slate-800">Performance Summary</CardTitle><p className="text-xs text-slate-500 mt-0.5">Cumulative call totals</p></div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {cumulativeCallData.length > 0 && (<>
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Planned</div>
                            <div className="text-xl font-black text-blue-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativePlanned)}</div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Actual</div>
                            <div className="text-xl font-black text-green-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativeActual)}</div>
                          </div>
                          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                            <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative NBD Clients</div>
                            <div className="text-xl font-black text-violet-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativeNew)}</div>
                          </div>
                        </>)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cumulative Area Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div className="p-2.5 bg-purple-100 rounded-lg"><Activity className="w-5 h-5 text-purple-600" /></div>
                    <div><h3 className="text-lg font-semibold text-slate-800">Cumulative Calls Tracking</h3><p className="text-xs text-slate-500 mt-0.5">Year-to-date for {yearFilter}</p></div>
                  </div>
                  {cumulativeCallData.length > 0 ? (
                    <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                      <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                        <ResponsiveContainer width="100%" height={400}>
                          <AreaChart data={cumulativeCallData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                            <defs>
                              <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="cnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} /><stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} /></linearGradient>
                              <linearGradient id="coGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} /></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={55} />
                            <Tooltip content={({ active, payload, label }) => {
                              if (!active || !payload) return null
                              return (
                                <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-lg">
                                  <p className="font-bold text-slate-900 mb-2">{label}</p>
                                  <div className="space-y-1 text-sm">
                                    {([["Cumul. Planned", "text-blue-600", 0], ["Cumul. Actual", "text-green-600", 1], ["Cumul. NBD Clients", "text-violet-600", 2], ["Cumul. CRR Clients", "text-amber-600", 3]] as [string, string, number][]).map(([lbl, cls, i]) =>
                                      <div key={lbl} className="flex justify-between gap-6">
                                        <span className={`${cls} font-semibold`}>{lbl}:</span>
                                        <span className="font-bold">{formatNumber(payload[i]?.value as number || 0)}</span>
                                      </div>)}
                                  </div>
                                </div>
                              )
                            }} />
                            <Area type="monotone" dataKey="cumulativePlanned" stroke="#3b82f6" strokeWidth={3} fill="url(#cpGrad)" name="Cumulative Planned" />
                            <Area type="monotone" dataKey="cumulativeActual" stroke="#22c55e" strokeWidth={3} fill="url(#caGrad)" name="Cumulative Actual" />
                            <Area type="monotone" dataKey="cumulativeNew" stroke="#8b5cf6" strokeWidth={2} fill="url(#cnGrad)" name="Cumulative NBD Clients" />
                            <Area type="monotone" dataKey="cumulativeOld" stroke="#f59e0b" strokeWidth={2} fill="url(#coGrad)" name="Cumulative CRR Clients" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <Activity className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                      <p className="text-sm text-slate-500">Select a year to view cumulative tracking</p>
                    </div>
                  )}
                </div>

                {/* Monthly Bar Chart */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                    <div className="p-2.5 bg-slate-100 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
                    <div><h3 className="text-lg font-semibold text-slate-800">Year-to-Date Calls Trends</h3><p className="text-xs text-slate-500 mt-0.5">Monthly planned vs actual for {yearFilter}</p></div>
                  </div>
                  {monthlyChartData.length > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                        <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                          <ResponsiveContainer width="100%" height={monthlyChartData.length <= 3 ? 400 : monthlyChartData.length <= 6 ? 450 : 550}>
                            <BarChart data={monthlyChartData} margin={{ top: 40, right: 30, left: 20, bottom: 80 }}>
                              <defs>
                                <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={1} /></linearGradient>
                                <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} /><stop offset="100%" stopColor="#22c55e" stopOpacity={1} /></linearGradient>
                                <linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.9} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} /></linearGradient>
                                <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde68a" stopOpacity={0.9} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={1} /></linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="month" angle={monthlyChartData.length > 6 ? -45 : -35} textAnchor="end" height={90} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" interval={0} />
                              <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={55} />
                              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                              <Bar dataKey="planned" fill="url(#bg1)" name="Planned Calls" radius={[6, 6, 0, 0]} maxBarSize={60}
                                label={{ position: "top", formatter: ((v: any, e: any, i: number) => { const dp = monthlyChartData[i]; const vp = dp?.variancePercent ? Number(dp.variancePercent) : 0; return vp !== 0 ? `${vp > 0 ? "+" : ""}${vp.toFixed(1)}%` : "" }) as any, fill: "#64748b", fontSize: 11, fontWeight: "600", offset: 8 }} />
                              <Bar dataKey="actual" fill="url(#bg2)" name="Actual Calls" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="newClients" fill="url(#bg3)" name="NBD Clients" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="oldClients" fill="url(#bg4)" name="CRR Clients" radius={[6, 6, 0, 0]} maxBarSize={60} />
                              <Bar dataKey="variance" name="Variance" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                {monthlyChartData.map((e, i) => <Cell key={`c-${i}`} fill={e.variance >= 0 ? "#22c55e" : "#ef4444"} opacity={0.75} />)}
                                <LabelList dataKey="variancePercent" position="top" formatter={(v: any) => v !== undefined ? `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%` : ""} style={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div></div>
                      </div>
                      {/* Legend */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                          ["bg-blue-50 border-blue-100", "bg-blue-500", "Planned Calls", "Target benchmark"],
                          ["bg-green-50 border-green-100", "bg-green-500", "Actual Calls", "Calls completed"],
                          ["bg-violet-50 border-violet-100", "bg-violet-500", "NBD Clients", "Newly acquired"],
                          ["bg-amber-50 border-amber-100", "bg-amber-500", "CRR Clients", "Returning clients"],
                        ].map(([wrap, dot, lbl, sub]) => (
                          <div key={lbl} className={`flex items-center gap-3 p-4 ${wrap} rounded-lg border`}>
                            <div className={`w-3 h-3 ${dot} rounded`} />
                            <div><p className="text-xs text-slate-600 font-medium">{lbl}</p><p className="text-xs text-slate-500">{sub}</p></div>
                          </div>
                        ))}
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /><TrendingDown className="w-3.5 h-3.5 text-red-600" /></div>
                          <div><p className="text-xs text-slate-600 font-medium">Variance %</p><p className="text-xs text-slate-500">Performance gap</p></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                      <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
                      <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                      <p className="text-sm text-slate-500">Select a different year or add call data</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
