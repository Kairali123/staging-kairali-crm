"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import Loader from "@/components/Loader"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle,
  TableIcon,
  Filter,
  RefreshCw,
  FileText,
  AlertCircle,
  Check,
  XCircle,
  ExternalLink,
  PhoneCall,
  X,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js"
import { Bar, Doughnut, Pie } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

// Draws the total count in the center of the donut by default,
// and swaps to the hovered slice's label + value on hover.
const centerTextPlugin = {
  id: "centerText",
  afterDraw: (chart: any) => {
    const { ctx, chartArea } = chart
    if (!chartArea) return
    const { width, height, left, top } = chartArea
    const centerX = left + width / 2
    const centerY = top + height / 2

    const dataset = chart.data.datasets?.[0]
    if (!dataset) return

    const active = chart.getActiveElements?.() || []
    let mainText = ""
    let subText = "TOTAL"

    if (active.length > 0) {
      const idx = active[0].index
      mainText = String(dataset.data[idx])
      subText = String(chart.data.labels?.[idx] ?? "").toUpperCase()
    } else {
      const total = dataset.data.reduce((sum: number, v: number) => sum + (v || 0), 0)
      mainText = String(total)
    }

    ctx.save()
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = "700 26px sans-serif"
    ctx.fillStyle = "#0f172a"
    ctx.fillText(mainText, centerX, centerY - 8)
    ctx.font = "600 11px sans-serif"
    ctx.fillStyle = "#64748b"
    ctx.fillText(subText, centerX, centerY + 14)
    ctx.restore()
  },
}

function normalizeFinalOutcome(str: string | null | undefined): string {
  if (!str) return "—"
  const clean = str.trim().replace(/\s+/g, " ")

  // Normalize DNC variations (e.g. containing "dnc", "don't call", "dont't call", etc.)
  if (/dnc|dont?\'?t?\s*call/i.test(clean)) {
    return "DNC Client : Don't Call Further"
  }

  // Normalize "Max Auto Dial Attempts Completed"
  if (/max\s*auto\s*dial/i.test(clean)) {
    return "Max Auto Dial Attempts Completed"
  }

  // Normalize "Not Interested AHV"
  if (/not\s*in(ter)?ested\s*ahv/i.test(clean)) {
    return "Not Interested AHV"
  }

  return clean
}

interface LeadRecord {
  id: string
  initial_id: string
  company: string
  call_end_reason: string
  ai_call_category: string
  final_lead_outcome: string
  calculated_qualification_status: string
  timestamp: string
  extracted_reason: string
  client_name: string
  mobile: string
  email: string
  call_start_time: string
  call_end_time: string
}

function formatCallDateTime(val: string | null | undefined): string {
  if (!val) return "—"
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return val
    const p = (n: number) => String(n).padStart(2, "0")
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return val
  }
}

export default function NonQualifiedReportPage() {
  const { user, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  // Data states
  const [rawLeads, setRawLeads] = useState<LeadRecord[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  // Filter states
  const [searchInput, setSearchInput] = useState("")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [callEndFilter, setCallEndFilter] = useState("ALL")
  const [outcomeFilter, setOutcomeFilter] = useState("ALL")
  const [reasonFilter, setReasonFilter] = useState("ALL")
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "this_week" | "last_week" |
    "this_month" | "last_month" | "this_year" | "last_year" | "custom"
  >("this_week")
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // ── Sorting ──
  type SortKey = "timestamp" | "id" | "company" | "call_end_reason" | "final_lead_outcome" | "extracted_reason"
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
    setCurrentPage(1)
  }

  // Drawer detail state
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [gotoPageInput, setGotoPageInput] = useState("")

  // Redirect if not authenticated or lacks permission
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  // Fetch data from MySQL endpoint
  const fetchData = async () => {
    setIsFetching(true)
    setErrorMessage("")
    try {
      const res = await fetch("/api/voicecall/non-qualified")
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`)
      }
      const data = await res.json()
      setRawLeads(data)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || "An error occurred while loading data.")
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const companies = new Set<string>()
    const callEnds = new Set<string>()
    const outcomes = new Set<string>()
    const reasons = new Set<string>()

    rawLeads.forEach(lead => {
      if (lead.company) companies.add(lead.company)
      if (lead.call_end_reason) callEnds.add(lead.call_end_reason)
      if (lead.extracted_reason) reasons.add(lead.extracted_reason)

      if (lead.final_lead_outcome) {
        outcomes.add(normalizeFinalOutcome(lead.final_lead_outcome))
      }
    })

    return {
      companies: Array.from(companies).sort(),
      callEnds: Array.from(callEnds).sort(),
      outcomes: Array.from(outcomes).sort((a, b) => a.localeCompare(b)),
      reasons: Array.from(reasons).sort(),
    }
  }, [rawLeads])

  // Filter logic
  const filteredLeads = useMemo(() => {
    return rawLeads.filter(lead => {
      // 1. Search text filter
      const matchSearch = !searchInput ||
        lead.id.toLowerCase().includes(searchInput.toLowerCase()) ||
        lead.ai_call_category.toLowerCase().includes(searchInput.toLowerCase())

      // 2. Company filter
      const matchCompany = selectedCompany === "ALL" || lead.company === selectedCompany

      // 3. Call end filter
      const matchCallEnd = callEndFilter === "ALL" || lead.call_end_reason === callEndFilter

      // 4. Outcome filter
      const matchOutcome = outcomeFilter === "ALL" || (() => {
        if (!lead.final_lead_outcome) return false
        const leadOutcomeNorm = normalizeFinalOutcome(lead.final_lead_outcome).toLowerCase()
        const filterOutcomeNorm = outcomeFilter.toLowerCase()
        return leadOutcomeNorm === filterOutcomeNorm
      })()

      // 5. Extracted reason filter
      const matchReason = reasonFilter === "ALL" || lead.extracted_reason === reasonFilter

      // 6. Date filter
      let matchDate = true
      if (lead.timestamp) {
        const leadDate = new Date(lead.timestamp)
        const now = new Date()
        const todayStr = now.toISOString().split("T")[0]
        const leadStr = leadDate.toISOString().split("T")[0]

        if (dateFilter === "today") {
          matchDate = leadStr === todayStr
        } else if (dateFilter === "yesterday") {
          const yesterday = new Date(now)
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split("T")[0]
          matchDate = leadStr === yesterdayStr
        } else if (dateFilter === "this_week") {
          const startOfWeek = new Date(now)
          const day = startOfWeek.getDay()
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
          startOfWeek.setDate(diff)
          startOfWeek.setHours(0, 0, 0, 0)
          matchDate = leadDate >= startOfWeek
        } else if (dateFilter === "last_week") {
          const startOfThisWeek = new Date(now)
          const day = startOfThisWeek.getDay()
          const diff = startOfThisWeek.getDate() - day + (day === 0 ? -6 : 1)
          startOfThisWeek.setDate(diff)
          startOfThisWeek.setHours(0, 0, 0, 0)
          const startOfLastWeek = new Date(startOfThisWeek)
          startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)
          const endOfLastWeek = new Date(startOfThisWeek)
          endOfLastWeek.setMilliseconds(-1)
          matchDate = leadDate >= startOfLastWeek && leadDate <= endOfLastWeek
        } else if (dateFilter === "this_month") {
          matchDate = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear()
        } else if (dateFilter === "last_month") {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          matchDate = leadDate.getMonth() === lastMonth.getMonth() && leadDate.getFullYear() === lastMonth.getFullYear()
        } else if (dateFilter === "this_year") {
          matchDate = leadDate.getFullYear() === now.getFullYear()
        } else if (dateFilter === "last_year") {
          matchDate = leadDate.getFullYear() === now.getFullYear() - 1
        } else if (dateFilter === "custom" && customDateRange.start) {
          const start = new Date(customDateRange.start)
          start.setHours(0, 0, 0, 0)
          const end = customDateRange.end ? new Date(customDateRange.end) : new Date()
          end.setHours(23, 59, 59, 999)
          matchDate = leadDate >= start && leadDate <= end
        }
      }

      return matchSearch && matchCompany && matchCallEnd && matchOutcome && matchReason && matchDate
    })
  }, [rawLeads, searchInput, selectedCompany, callEndFilter, outcomeFilter, reasonFilter, dateFilter, customDateRange])

  // ── Apply sort on top of filtered leads ──
  const sortedLeads = useMemo(() => {
    if (!sortKey) return filteredLeads

    const getValue = (lead: LeadRecord): string | number => {
      if (sortKey === "timestamp") {
        return lead.timestamp ? new Date(lead.timestamp).getTime() : 0
      }
      if (sortKey === "final_lead_outcome") {
        return normalizeFinalOutcome(lead.final_lead_outcome).toLowerCase()
      }
      const raw = (lead as any)[sortKey]
      return typeof raw === "string" ? raw.toLowerCase() : raw ?? ""
    }

    return [...filteredLeads].sort((a, b) => {
      const aVal = getValue(a)
      const bVal = getValue(b)
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [filteredLeads, sortKey, sortDirection])

  // KPIs
  const stats = useMemo(() => {
    const total = filteredLeads.length
    const dialerMaxed = filteredLeads.filter(l => {
      if (!l.final_lead_outcome) return false
      return l.final_lead_outcome.trim().replace(/\s+/g, " ").toLowerCase() === "max auto dial attempts completed"
    }).length
    const disinterested = filteredLeads.filter(l => {
      if (!l.extracted_reason) return false
      return l.extracted_reason.trim().replace(/\s+/g, " ").toLowerCase() === "not interested / declined"
    }).length
    const mismatch = filteredLeads.filter(l => {
      if (!l.extracted_reason) return false
      const norm = l.extracted_reason.trim().replace(/\s+/g, " ").toLowerCase()
      return norm === "location mismatch" || norm === "budget / price issue"
    }).length
    const other = Math.max(0, total - (dialerMaxed + disinterested + mismatch))

    return {
      total,
      dialerMaxed,
      dialerMaxedPct: total > 0 ? ((dialerMaxed / total) * 100).toFixed(1) : "0.0",
      disinterested,
      disinterestPct: total > 0 ? ((disinterested / total) * 100).toFixed(1) : "0.0",
      mismatch,
      mismatchPct: total > 0 ? ((mismatch / total) * 100).toFixed(1) : "0.0",
      other,
      otherPct: total > 0 ? ((other / total) * 100).toFixed(1) : "0.0"
    }
  }, [filteredLeads])

  // Chart data: Company Breakdown
  const companyChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      counts[l.company] = (counts[l.company] || 0) + 1
    })

    return {
      labels: Object.keys(counts),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: ["#2563eb", "#7c3aed", "#db2777", "#d97706", "#059669"],
        borderWidth: 2,
        borderColor: "#fff"
      }]
    }
  }, [filteredLeads])

  // Chart data: Final Outcome Horizontal Bar
  const outcomeChartData = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredLeads.forEach(l => {
      const outcome = normalizeFinalOutcome(l.final_lead_outcome)
      counts[outcome] = (counts[outcome] || 0) + 1
    })

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

    return {
      labels: sorted.map(e => e[0]),
      datasets: [{
        label: "Leads Count",
        data: sorted.map(e => e[1]),
        backgroundColor: "rgba(37, 99, 235, 0.75)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 4
      }]
    }
  }, [filteredLeads])

  // Pagination bounds
  const totalPages = Math.ceil(sortedLeads.length / rowsPerPage)
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return sortedLeads.slice(start, start + rowsPerPage)
  }, [sortedLeads, currentPage, rowsPerPage])

  if (isLoading || !user) {
    return <Loader isLoading={true} contentOnly />
  }

  return (
    <>
      <Loader isLoading={isFetching} contentOnly />

      {/* ─── 1. HERO HEADER (Full Width, Bleeds Out) ─── */}
      <div className="-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 mb-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full">
          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
          >
            ← Back
          </button>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left — Title & Icon */}
            <div className="space-y-3 w-full">
              <div className="flex items-start sm:items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                    Kserve Non-Qualified Report
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                    Operational insights and call log analysis of disqualified leads
                  </p>
                </div>
              </div>
            </div>

            {/* Right — Total Count Badge */}
            <div className="flex w-full lg:w-auto justify-start lg:justify-end">
              <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                  Total Non-Qualified
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 w-full">
        {/* ─── 2. FILTERS & SEARCH SECTION ─── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-md w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                  Filters &amp; Search
                </h3>
                <p className="text-xs text-slate-500">
                  Filter non-qualified reports by brand, date range, or keywords
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput("")
                setSelectedCompany("ALL")
                setCallEndFilter("ALL")
                setOutcomeFilter("ALL")
                setReasonFilter("ALL")
                setDateFilter("all")
                setCustomDateRange({ start: "", end: "" })
              }}
              className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-50"
            >
              Clear Filters
            </Button>
          </div>

          {/* Controls */}
          <div className="px-4 sm:px-5 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Search Leads
                </label>
                <Input
                  placeholder="Search by ID, keyword..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-10 w-full rounded-md border-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Date Range
                </label>
                <Select value={dateFilter} onValueChange={(val: any) => setDateFilter(val)}>
                  <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                    <SelectValue placeholder="All Dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_week">Last Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Company
                </label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {filterOptions.companies.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Final Outcome
                </label>
                <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                  <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {filterOptions.outcomes.map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business Reason
                </label>
                <Select value={reasonFilter} onValueChange={setReasonFilter}>
                  <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    {filterOptions.reasons.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            {/* Custom Date Range */}
            {dateFilter === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</label>
                  <Input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                    className="h-10 w-full rounded-md border-gray-300"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</label>
                  <Input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                    className="h-10 w-full rounded-md border-gray-300"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. KPI SECTION ─── */}
        <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl w-full">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                  Key Performance Indicators
                </h3>
                <p className="text-[11px] text-slate-500">
                  Overview of disqualification metrics &amp; performance
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards Content */}
          <div className="p-5">
            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4">
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Disqualification Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Total Non-Qualified */}
                <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                    Total Non-Qualified
                  </p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                    {stats.total}
                  </p>
                  <span className="text-[10px] text-slate-500">Filtered leads count</span>
                </div>

                {/* Dialer Maxed Out */}
                <div className="bg-slate-50/70 border-2 border-slate-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 leading-tight mb-2">
                    MAX AUTO DIAL ATTEMPTE COMPLETED
                  </p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                    {stats.dialerMaxed}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Rate:</span>
                    <span className="text-blue-600 font-semibold">{stats.dialerMaxedPct}% of total</span>
                  </div>
                </div>

                {/* Explicit Disinterest */}
                <div className="bg-red-50/60 border-2 border-red-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight mb-2">
                    Explicit Disinterest
                  </p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                    {stats.disinterested}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Rate:</span>
                    <span className="text-red-600 font-semibold">{stats.disinterestPct}% disinterest</span>
                  </div>
                </div>

                {/* Offer Mismatches */}
                <div className="bg-amber-50/60 border-2 border-amber-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight mb-2">
                    Offer Mismatches
                  </p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                    {stats.mismatch}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Rate:</span>
                    <span className="text-amber-600 font-semibold">{stats.mismatchPct}% of total</span>
                  </div>
                </div>

                {/* Other Disqualifications */}
                <div className="bg-purple-50/60 border-2 border-purple-200 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 leading-tight mb-2">
                    Other Disqualifications
                  </p>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                    {stats.other}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 font-medium">Rate:</span>
                    <span className="text-purple-600 font-semibold">{stats.otherPct}% other</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4. CHARTS SECTION ─── */}
        {filteredLeads.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Pie: Company Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-sm border border-blue-500/30">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">Leads Share by Company</h3>
                  <p className="text-xs text-slate-500">Distribution of disqualified leads per brand</p>
                </div>
              </div>
              <div className="p-4">
                <div className="relative h-64 flex justify-center">
                  <Doughnut
                    data={companyChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "70%",
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 11, weight: "bold" },
                            generateLabels: (chart) => {
                              const data = chart.data
                              if (data.labels && data.labels.length && data.datasets.length) {
                                const dataset = data.datasets[0]
                                const total = dataset.data.reduce((sum: number, val: any) => sum + (val || 0), 0)
                                return data.labels.map((label: any, i: number) => {
                                  const val = dataset.data[i] as number
                                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"
                                  const meta = chart.getDatasetMeta(0)
                                  const style = meta.controller.getStyle(i, false) as any
                                  return {
                                    text: `${label}: ${val} (${pct}%)`,
                                    fillStyle: style.backgroundColor,
                                    strokeStyle: style.borderColor,
                                    lineWidth: style.borderWidth,
                                    hidden: isNaN(val) || !chart.getDataVisibility(i),
                                    index: i
                                  }
                                })
                              }
                              return []
                            }
                          }
                        }
                      }
                    }}
                    plugins={[centerTextPlugin]}
                  />
                </div>
              </div>
            </div>

            {/* Bar: Final Outcome Breakdown */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-sm border border-blue-500/30">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 leading-tight">Final Call Outcomes</h3>
                  <p className="text-xs text-slate-500">Distribution of final call outcomes for leads</p>
                </div>
              </div>
              <div className="p-4">
                <div className="relative h-64">
                  <Bar
                    data={outcomeChartData}
                    options={{
                      indexAxis: "y",
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── 5. DATA TABLE ─── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden w-full">
          {/* Table Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-blue-50/20 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                <TableIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">Leads Explorer</h3>
                <p className="text-xs text-slate-500">Browse and inspect disqualified call log details</p>
              </div>
            </div>
          </div>

          {filteredLeads.length > 0 ? (
            <>
              {/* ── Sticky-column scrollable table ── */}
              <style>{`
                .nq-table-scroll {
                  overflow-x: auto;
                  -webkit-overflow-scrolling: touch;
                  overscroll-behavior-x: contain;
                }
                .nq-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
                /* Sticky header cells */
                .nq-th {
                  background: #1e3a5f;
                  color: #fff;
                  font-weight: 700;
                  font-size: 10.5px;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                  padding: 10px 12px;
                  white-space: nowrap;
                  border-right: 1px solid rgba(255,255,255,0.08);
                  position: sticky;
                  top: 0;
                  z-index: 2;
                  user-select: none;
                }
                .nq-th.sticky-col { position: sticky; top: 0; z-index: 3; }
                .nq-th-col1 { left: 0;    min-width: 90px;  max-width: 90px;  z-index: 3; }
                .nq-th-col2 { left: 90px; min-width: 140px; max-width: 140px; z-index: 3; }
                /* Body cells */
                .nq-td {
                  padding: 9px 12px;
                  font-size: 11.5px;
                  color: #334155;
                  border-bottom: 1px solid #f1f5f9;
                  border-right: 1px solid #f1f5f9;
                  vertical-align: middle;
                  white-space: nowrap;
                }
                .nq-td.sticky-col {
                  position: sticky;
                  z-index: 1;
                  background: #fff;
                }
                .nq-td-col1 { left: 0;    min-width: 90px;  max-width: 90px;  box-shadow: 2px 0 4px rgba(0,0,0,0.04); }
                .nq-td-col2 { left: 90px; min-width: 140px; max-width: 140px; box-shadow: 2px 0 6px rgba(0,0,0,0.06); }
                .nq-row:hover .nq-td { background: #eff6ff; }
                .nq-row:hover .nq-td.sticky-col { background: #eff6ff; }
                /* Lead ID truncation */
                .nq-lead-id {
                  max-width: 130px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  font-weight: 600;
                  color: #1e3a5f;
                  font-size: 11px;
                  display: block;
                }
              `}</style>
              <div className="nq-table-scroll">
                <table className="nq-table">
                  <thead>
                    <tr>
                      {/* Sticky col 1 – Date */}
                      <th
                        className="nq-th sticky-col nq-th-col1"
                        onClick={() => handleSort("timestamp")}
                        style={{ cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Date
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "timestamp" ? 1 : 0.55 }} />
                          {sortKey === "timestamp" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      {/* Sticky col 2 – Lead ID */}
                      <th
                        className="nq-th sticky-col nq-th-col2"
                        onClick={() => handleSort("id")}
                        style={{ cursor: "pointer" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Lead ID
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "id" ? 1 : 0.55 }} />
                          {sortKey === "id" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      {/* Scrollable columns */}
                      <th className="nq-th" style={{ minWidth: 180 }}>Client Details</th>
                      <th
                        className="nq-th"
                        onClick={() => handleSort("company")}
                        style={{ cursor: "pointer", minWidth: 80 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Company
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "company" ? 1 : 0.55 }} />
                          {sortKey === "company" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      <th
                        className="nq-th"
                        onClick={() => handleSort("call_end_reason")}
                        style={{ cursor: "pointer", minWidth: 130 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Call End Reason
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "call_end_reason" ? 1 : 0.55 }} />
                          {sortKey === "call_end_reason" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      <th className="nq-th" style={{ minWidth: 130 }}>Call Start</th>
                      <th className="nq-th" style={{ minWidth: 130 }}>Call End</th>
                      <th
                        className="nq-th"
                        onClick={() => handleSort("final_lead_outcome")}
                        style={{ cursor: "pointer", minWidth: 160 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          Final Outcome
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "final_lead_outcome" ? 1 : 0.55 }} />
                          {sortKey === "final_lead_outcome" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      <th
                        className="nq-th"
                        onClick={() => handleSort("extracted_reason")}
                        style={{ cursor: "pointer", minWidth: 160 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          AI Extracted Reason
                          <ArrowUpDown style={{ width: 11, height: 11, opacity: sortKey === "extracted_reason" ? 1 : 0.55 }} />
                          {sortKey === "extracted_reason" && <span style={{ fontSize: 9 }}>{sortDirection === "asc" ? "▲" : "▼"}</span>}
                        </div>
                      </th>
                      <th className="nq-th" style={{ minWidth: 80, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => (
                      <tr key={lead.id} className="nq-row">
                        {/* Sticky col 1 – Date */}
                        <td className="nq-td sticky-col nq-td-col1" style={{ fontSize: 11 }}>
                          {lead.timestamp
                            ? new Date(lead.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        {/* Sticky col 2 – Lead ID (truncated with tooltip) */}
                        <td className="nq-td sticky-col nq-td-col2">
                          <span className="nq-lead-id" title={lead.id}>{lead.id}</span>
                        </td>
                        {/* Client Details */}
                        <td className="nq-td" style={{ minWidth: 180 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {lead.client_name && <span style={{ fontWeight: 600, color: "#1e293b", fontSize: 12 }}>{lead.client_name}</span>}
                            {lead.mobile    && <span style={{ color: "#334155", fontSize: 11 }}>{lead.mobile}</span>}
                            {lead.email     && <span style={{ color: "#64748b", fontSize: 10.5, maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", display: "block" }} title={lead.email}>{lead.email}</span>}
                            {!lead.client_name && !lead.mobile && !lead.email && <span style={{ color: "#cbd5e1" }}>—</span>}
                          </div>
                        </td>
                        {/* Company */}
                        <td className="nq-td">
                          <span style={{ background: "#f1f5f9", color: "#1e293b", borderRadius: 5, padding: "2px 8px", fontWeight: 600, fontSize: 11 }}>{lead.company}</span>
                        </td>
                        {/* Call End Reason */}
                        <td className="nq-td" style={{ color: "#475569" }}>{lead.call_end_reason}</td>
                        {/* Call Start */}
                        <td className="nq-td" style={{ color: "#475569" }}>{formatCallDateTime(lead.call_start_time)}</td>
                        {/* Call End */}
                        <td className="nq-td" style={{ color: "#475569" }}>{formatCallDateTime(lead.call_end_time)}</td>
                        {/* Final Outcome */}
                        <td className="nq-td" style={{ color: "#475569" }}>{normalizeFinalOutcome(lead.final_lead_outcome)}</td>
                        {/* AI Extracted Reason */}
                        <td className="nq-td">
                          <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 5, padding: "2px 8px", fontWeight: 700, fontSize: 10.5 }}>{lead.extracted_reason}</span>
                        </td>
                        {/* Action */}
                        <td className="nq-td" style={{ textAlign: "right", borderRight: "none" }}>
                          <button
                            style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", background: "transparent", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 5 }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            onClick={() => { setSelectedLead(lead); setIsDrawerOpen(true); }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 select-none">
                <span>
                  Showing <strong className="text-slate-800">{filteredLeads.length === 0 ? "0" : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filteredLeads.length)}`}</strong> of <strong className="text-slate-800">{filteredLeads.length}</strong> leads
                </span>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >«</button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >‹ Prev</button>

                  {(() => {
                    const pages: (number | "…")[] = [];
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push("…");
                      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                        pages.push(i);
                      }
                      if (currentPage < totalPages - 2) pages.push("…");
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) => p === "…"
                      ? <span key={`dots-${idx}`} className="w-7 text-center text-slate-400">…</span>
                      : <button
                        key={`page-${p}`}
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-[11px] font-semibold border transition ${currentPage === p ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
                      >
                        {p}
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-7 px-2 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-semibold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition whitespace-nowrap"
                  >Next ›</button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 text-[11px] font-bold hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >»</button>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 whitespace-nowrap">Rows/page</span>
                    <select
                      aria-label="Rows per page"
                      value={rowsPerPage}
                      onChange={e => {
                        setRowsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="h-7 rounded border border-slate-300 bg-white text-slate-700 text-[11px] font-semibold px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 whitespace-nowrap">Go to</span>
                    <input
                      aria-label="Go to page"
                      type="number"
                      min={1}
                      max={totalPages}
                      value={gotoPageInput}
                      onChange={e => setGotoPageInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const n = parseInt(gotoPageInput, 10)
                          if (!isNaN(n) && n >= 1 && n <= totalPages) {
                            setCurrentPage(n)
                            setGotoPageInput("")
                          }
                        }
                      }}
                      placeholder="Pag"
                      className="w-12 h-7 rounded border border-slate-300 bg-white text-slate-700 text-[11px] text-center font-semibold px-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        const n = parseInt(gotoPageInput, 10)
                        if (!isNaN(n) && n >= 1 && n <= totalPages) {
                          setCurrentPage(n)
                          setGotoPageInput("")
                        }
                      }}
                      className="h-7 px-3 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition"
                    >Go</button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <FileText className="h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-700">No Leads Found</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or keyword search.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Lead Details Modal ── */}
      {isDrawerOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">Lead Details</h2>
                <p className="text-xs text-white/80 mt-0.5 font-mono">ID: {selectedLead.id}</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/15 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 pb-5 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedLead.company}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Call End Reason</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedLead.call_end_reason}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Final Outcome</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{normalizeFinalOutcome(selectedLead.final_lead_outcome)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Extracted Reason</span>
                  <div className="mt-1">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 shadow-none font-semibold">
                      {selectedLead.extracted_reason}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {selectedLead.timestamp
                      ? new Date(selectedLead.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Call Summary &amp; Log</span>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {selectedLead.ai_call_category}
                </div>
              </div>

              <div className="flex justify-end pt-5">
                <Button
                  onClick={() => setIsDrawerOpen(false)}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5"
                >
                  Close Analysis
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
