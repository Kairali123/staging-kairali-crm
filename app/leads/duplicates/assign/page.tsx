'use client'

import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useSqlCallHistory } from "@/hooks/use-sql-call-history"
import { useRouter } from "next/navigation"
import React, { useEffect, useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import FollowUpModal from "@/components/lead-search/FollowUpModal"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  History,
  CheckCircle,
} from "lucide-react"
import type { Lead } from "@/types/lead"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useRef } from "react"

type DateFilter =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "this_year"
  | "last_year"
  | "custom"

type DuplicateLead = Omit<Lead, "urgency"> & {
  vSrc?: string
  sentStatus?: string
  mailStatus?: string
  verifiedSource?: string
  testCol?: string
  reasonAssignOrDelete?: string
  gptExtractionStatus?: string
  urgency?: Lead["urgency"] | "high"
}

const sanitizeIvrUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null
  const trimmedUrl = url.trim()
  if (!trimmedUrl || trimmedUrl === '' || trimmedUrl === 'N/A') return null
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) return trimmedUrl
  return `https://${trimmedUrl}`
}

export default function LeadAssignmentPage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const {
    leads,
    isLoading: isLeadLoading,
    error,
    getLeads,
    refreshLeads,
    isLeadsLoaded
  } = useLeads()
  const router = useRouter()

  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [dbSearchResults, setDbSearchResults] = useState<DuplicateLead[] | null>(null)
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")
  const [assignToFilter, setAssignToFilter] = useState("all")
  const [filteredLeads, setFilteredLeads] = useState<DuplicateLead[]>([])
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [gotoPage, setGotoPage] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const resultRef = useRef<HTMLDivElement | null>(null)

  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return firstDay.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return lastDay.toISOString().split('T')[0]
  })
  const [dateError, setDateError] = useState("")
  const [selectedLead, setSelectedLead] = useState<DuplicateLead | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCallHistoryDialogOpen, setIsCallHistoryDialogOpen] = useState(false)
  const { followUps, isLoading: isCallHistoryLoading, error: callHistoryError } = useSqlCallHistory(
    selectedLead?.id || null
  )
  const [isSqvDialogOpen, setIsSqvDialogOpen] = useState(false)
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [filteredByDateLeads, setFilteredByDateLeads] = useState<DuplicateLead[]>(leads as DuplicateLead[])

  const getSqvData = (leadId: string) => ({
    verifiedStatus: "Yes",
    sqvId: "1UI8LWPA2",
    outcomeStatus: "Prevention_Rejuvenation",
    recordingUrl: "https://squadiq-call-recs.s3.amazonaws.com/1UI8LWPA2.mp3",
    agentDisposition: "Prevention_Rejuvenation",
    agentRemarks: "Na",
    agentName: "Himani",
    priority: "High",
  })

  const handleLoadLeads = async () => { await refreshLeads({ force: true }) }

  const uniqueLeadSources = useMemo(() => {
    if (!leads || leads.length === 0) return []
    const sources = new Set<string>()
    ;(leads as DuplicateLead[]).forEach(lead => { if (lead.vSrc) sources.add(lead.vSrc) })
    return Array.from(sources).sort()
  }, [leads])

  const uniqueAssignedTo = useMemo(() => {
    if (!leads || leads.length === 0) return []
    const assignees = new Set<string>()
    leads.forEach(lead => { if (lead.assignedTo) assignees.add(lead.assignedTo) })
    return Array.from(assignees).sort()
  }, [leads])

  const formatDateToDDMMYYYY = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return '-'
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(date.getTime())) return '-'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const calculateTimeDelay = (dateInput?: string | Date) => {
    if (!dateInput) return "--:--:--"
    const created = new Date(dateInput)
    if (isNaN(created.getTime())) return "--:--:--"
    const now = new Date()
    const diffMs = now.getTime() - created.getTime()
    const isNegative = diffMs < 0
    const absDiffMs = Math.abs(diffMs)
    const totalSeconds = Math.floor(absDiffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    return isNegative ? `-${timeStr}` : timeStr
  }

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentLeads = filteredLeads.slice(startIndex, endIndex)

  useEffect(() => { setCurrentPage(1) }, [appliedSearch, priorityFilter, sourceFilter, urgencyFilter, assignToFilter])

  useEffect(() => {
    if (user && !selectedCompany) setSelectedCompany(user.company || "KTAHV")
  }, [user, selectedCompany])

  const formatIST = (date: Date) => {
    const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const y = ist.getFullYear()
    const m = String(ist.getMonth() + 1).padStart(2, "0")
    const d = String(ist.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  useEffect(() => {
    var filtered = selectedCompany === "ALL"
      ? leads as DuplicateLead[]
      : (leads as DuplicateLead[]).filter((lead) => lead.company === selectedCompany)

    filtered = filtered.sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())

    if (dateFilter !== "all") {
      const now = new Date()
      const todayIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
      const today = new Date(todayIST.getFullYear(), todayIST.getMonth(), todayIST.getDate())

      switch (dateFilter) {
        case "today": setStartDate(formatIST(today)); setEndDate(formatIST(today)); break
        case "yesterday": {
          const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
          setStartDate(formatIST(yesterday)); setEndDate(formatIST(yesterday)); break
        }
        case "this_week": {
          const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - weekStart.getDay())
          setStartDate(formatIST(weekStart)); setEndDate(formatIST(today)); break
        }
        case "last_week": {
          const lastWeekEnd = new Date(today); lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay() - 1)
          const lastWeekStart = new Date(lastWeekEnd); lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
          setStartDate(formatIST(lastWeekStart)); setEndDate(formatIST(lastWeekEnd)); break
        }
        case "this_month": {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          setStartDate(formatIST(monthStart)); setEndDate(formatIST(today)); break
        }
        case "last_month": {
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
          setStartDate(formatIST(lastMonthStart)); setEndDate(formatIST(lastMonthEnd)); break
        }
        case "this_year": {
          const yearStart = new Date(today.getFullYear(), 0, 1)
          setStartDate(formatIST(yearStart)); setEndDate(formatIST(today)); break
        }
        case "last_year": {
          const lastYearStart = new Date(today.getFullYear() - 1, 0, 1)
          const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31)
          setStartDate(formatIST(lastYearStart)); setEndDate(formatIST(lastYearEnd)); break
        }
        case "custom":
          if (customDateRange.start && customDateRange.end) {
            setStartDate(customDateRange.start); setEndDate(customDateRange.end)
          }
          break
        default: break
      }

      if (startDate && endDate) {
        if (endDate < startDate) {
          setDateError("End date cannot be earlier than start date")
        } else {
          setDateError("")
          filtered = filtered.filter((lead) => {
            const leadDate = new Date(lead.updatedAt ?? lead.createdAt).setHours(0, 0, 0, 0)
            const filterStartDate = new Date(startDate).setHours(0, 0, 0, 0)
            const filterEndDate = new Date(endDate).setHours(23, 59, 59, 999)
            return leadDate >= filterStartDate && leadDate <= filterEndDate
          })
        }
      } else if (startDate && !endDate) {
        filtered = filtered.filter((lead) => {
          const leadDate = new Date(lead.updatedAt ?? lead.createdAt).setHours(0, 0, 0, 0)
          return leadDate >= new Date(startDate).setHours(0, 0, 0, 0)
        })
      } else if (endDate && !startDate) {
        filtered = filtered.filter((lead) => {
          const leadDate = new Date(lead.updatedAt ?? lead.createdAt).setHours(0, 0, 0, 0)
          return leadDate <= new Date(endDate).setHours(23, 59, 59, 999)
        })
      }
    } else {
      setStartDate(""); setEndDate(""); setDateError("")
    }

    setFilteredByDateLeads(filtered)
  }, [leads, startDate, endDate, selectedCompany, dateFilter, customDateRange])

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.assign"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  // DB-level search fires when appliedSearch changes
  useEffect(() => {
    if (!appliedSearch) { setDbSearchResults(null); return }
    setIsSearching(true)
    fetch(`/api/leads/search?q=${encodeURIComponent(appliedSearch)}`)
      .then(r => r.json())
      .then(json => { if (json.success) setDbSearchResults(json.data as DuplicateLead[]) })
      .catch(err => console.error('[Search]', err))
      .finally(() => setIsSearching(false))
  }, [appliedSearch])

  useEffect(() => {
    // When DB search active, use those results; otherwise use date-filtered leads
    let filtered = (appliedSearch && dbSearchResults !== null)
      ? dbSearchResults
      : filteredByDateLeads

    if (priorityFilter !== "all") filtered = filtered.filter((lead) => lead.priority === priorityFilter)
    if (sourceFilter !== "all") filtered = filtered.filter((lead) => lead.vSrc === sourceFilter)
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const isUrgent = lead.priority == "high" || lead.tatBreached
        return urgencyFilter == "yes" ? isUrgent : !isUrgent
      })
    }
    if (assignToFilter !== "all") {
      if (assignToFilter === "unassigned") {
        filtered = filtered.filter((lead) => lead.sentStatus === "")
      } else {
        filtered = filtered.filter((lead) => lead.assignedTo === assignToFilter)
      }
    }
    if (sortField) {
      filtered.sort((a, b) => {
        let aValueN = a[sortField as keyof typeof a]
        let bValueN = b[sortField as keyof typeof b]
        if (typeof aValueN === "string") aValueN = aValueN.toLowerCase()
        if (typeof bValueN === "string") bValueN = bValueN.toLowerCase()
        const aComparable = aValueN == null ? "" : String(aValueN)
        const bComparable = bValueN == null ? "" : String(bValueN)
        if (aComparable < bComparable) return sortDirection === "asc" ? -1 : 1
        if (aComparable > bComparable) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }
    setFilteredLeads(filtered)
  }, [filteredByDateLeads, dbSearchResults, appliedSearch, priorityFilter, sourceFilter, urgencyFilter, assignToFilter, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleGotoPage = () => {
    const page = Number(gotoPage)
    if (!page || page < 1 || page > totalPages) return
    setCurrentPage(page)
    setGotoPage("")
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  if (isLoading || isLeadLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="flex items-center justify-center bg-transparent p-0 m-0">
            <img src="/grouploader.gif" alt="Company Loader" style={{ width: "160px", height: "160px" }} className="object-contain" />
          </div>
          <div className="mt-8 text-center">
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Loading Lead Assignment Page...</h3>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user || !hasPermission("leads.assign")) return null

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Hero Header ── */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
            <button
              onClick={() => window.history.back()}
              className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              ← Back
            </button>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-3 w-full">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                    <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                      Lead Assignment Hub
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                      Manage, monitor & assign incoming leads
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">Total Leads</p>
                  <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{filteredLeads.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div className="mt-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">Filters & Search</h3>
                  <p className="text-xs text-slate-500">Refine and locate leads efficiently</p>
                </div>
              </div>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  setSearchInput(""); setAppliedSearch(""); setDbSearchResults(null); setPriorityFilter("all")
                  setSourceFilter("all"); setUrgencyFilter("all"); setAssignToFilter("all")
                  setDateFilter("all"); setSelectedCompany("ALL")
                  setCustomDateRange({ start: "", end: "" }); setSortField(""); setSortDirection("asc")
                }}
                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
              >
                Clear Filters
              </Button>
            </div>

            <div className="px-4 sm:px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

                {/* Search */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Search Leads</label>
                  <div className="relative">
                    <Input
                      placeholder="Name, email, phone, Id, subject..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setAppliedSearch(searchInput); setCurrentPage(1)
                          setTimeout(() => { resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 100)
                        }
                      }}
                      className="h-10 w-full rounded-md border-gray-300 pr-10"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                    {appliedSearch && !isSearching && dbSearchResults !== null && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                        {dbSearchResults.length} found
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Date Range</label>
                  <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Dates" /></SelectTrigger>
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

                {/* Company */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Company</label>
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Companies" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="KTAHV">KTAHV</SelectItem>
                      <SelectItem value="KAPPL">KAPPL</SelectItem>
                      <SelectItem value="VILLARAAG">VILLARAAG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lead Source */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Lead Source</label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Sources" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueLeadSources.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgency */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Urgency</label>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assigned To */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Assigned To</label>
                  <Select value={assignToFilter} onValueChange={setAssignToFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300"><SelectValue placeholder="All Agents" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueAssignedTo.map((assignee) => <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Date Range */}
              {dateFilter === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start Date</label>
                    <Input type="date" value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                      className="h-10 w-full rounded-md border-gray-300" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End Date</label>
                    <Input type="date" value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                      className="h-10 w-full rounded-md border-gray-300" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Load / Refresh Button ── */}
        <div className="flex items-center justify-center py-4">
          <button
            onClick={handleLoadLeads}
            disabled={isLeadLoading}
            className={`${isLeadsLoaded
              ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
              : "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
              } text-white px-10 py-4 text-lg font-bold rounded-xl shadow-2xl transform transition-all hover:scale-105 disabled:cursor-not-allowed flex items-center gap-3`}
          >
            {isLeadLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading Data...
              </>
            ) : isLeadsLoaded ? (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Click here to Load Data
              </>
            )}
          </button>
        </div>

        {/* ── Leads Requiring Assignment Table ── */}
        <div ref={resultRef} className="border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden relative">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 mb-4 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200 rounded-t-xl shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">Leads Requiring Assignment</h3>
              </div>
            </div>
            {filteredLeads.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200">
                  <span className="text-xs font-semibold text-blue-700">Total: {filteredLeads.length}</span>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Users className="h-14 w-14 mx-auto mb-4 text-slate-300" />
              <p className="text-sm font-medium">No leads requiring assignment at this time.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200" style={{ fontSize: 'var(--text-sm)' }}>
                  <thead className="sticky top-0 z-10 border-b-2 border-slate-400 shadow" style={{ backgroundColor: "#1e3a5f" }}>
                    <tr className="border-b-2 border-slate-400">
                      <th scope="col" onClick={() => handleSort("createdAt")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Date & Time {renderSortIcon("createdAt")}</div>
                      </th>
                      <th scope="col" onClick={() => handleSort("id")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">ID {renderSortIcon("id")}</div>
                      </th>
                      <th scope="col" onClick={() => handleSort("name")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Name of Client {renderSortIcon("name")}</div>
                      </th>
                      <th scope="col" onClick={() => handleSort("phone")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Contact Details {renderSortIcon("phone")}</div>
                      </th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Subject</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Notes</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">IVR URL</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Website</th>
                      <th scope="col" onClick={() => handleSort("source")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Data Source {renderSortIcon("source")}</div>
                      </th>
                      <th scope="col" onClick={() => handleSort("company")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Lead Company {renderSortIcon("company")}</div>
                      </th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">User Details</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Country</th>
                      <th scope="col" onClick={() => handleSort("priority")} className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition border-r border-slate-400 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">Priority {renderSortIcon("priority")}</div>
                      </th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Urgency</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Contact Time</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Conversation Summary</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Lead Outcome</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Lead Category</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Preferred Contact</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Time Delay</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">Assign To</th>
                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {currentLeads.map((lead, index) => (
                      <tr key={lead.id === "-" ? `row-${index}` : lead.id} className="bg-white hover:bg-[#BFDBFF] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">{new Date(lead.updatedAt ?? lead.createdAt).toLocaleDateString("en-GB")}</div>
                            <div className="text-xs text-slate-500">{new Date(lead.updatedAt ?? lead.createdAt).toLocaleTimeString("en-GB", { hour12: false })}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-100" style={{ maxWidth: '120px', minWidth: '100px' }}>
                          <div className="font-mono text-xs font-semibold text-black-600 break-words leading-tight">{lead.id || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="font-semibold text-slate-900">{lead.name || "N/A"}</div>
                          {lead.tatBreached && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300 mt-1">TAT Breach</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">{lead.phone || "N/A"}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[180px]" title={lead.email || "N/A"}>{lead.email || "N/A"}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.subject || "N/A"}>{lead.subject || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.notes || "N/A"}>{lead.notes || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const sanitizedUrl = sanitizeIvrUrl(lead.ivrUrl)
                            return sanitizedUrl ? (
                              <a href={sanitizedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium">Listen Rec</a>
                            ) : (
                              <span className="text-xs text-slate-400">No IVR</span>
                            )
                          })()}
                        </td>
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.websiteName || "N/A"}>{lead.websiteName || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-900 border border-slate-200 capitalize">
                            {lead.source?.replace("_", " ") || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${lead.company?.toUpperCase() === "KAPPL" ? "bg-amber-100 text-amber-900 border-amber-300" : lead.company?.toUpperCase() === "KTAHV" ? "bg-green-100 text-green-900 border-green-300" : lead.company?.toUpperCase() === "VILLARAAG" ? "bg-blue-900 text-white border-blue-900" : "bg-slate-100 text-slate-900 border-slate-300"}`}>
                            {lead.company || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 max-w-[200px]">
                          <div className="text-sm">
                            <div className="truncate text-slate-900 font-medium" title={lead.userName || "N/A"}>{lead.userName || "N/A"}</div>
                            <div className="text-sm text-slate-900">{lead.userPhone || "N/A"}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[180px]" title={lead.userEmail || "N/A"}>{lead.userEmail || "N/A"}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-100">{lead.country || "N/A"}</td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${lead.priority?.toLowerCase() === "high" ? "bg-red-100 text-red-800 border border-red-300" : lead.priority?.toLowerCase() === "medium" ? "bg-yellow-100 text-yellow-800 border border-yellow-300" : lead.priority?.toLowerCase() === "low" ? "bg-green-100 text-green-800 border border-green-300" : "bg-slate-100 text-slate-800 border border-slate-300"}`}>
                            {lead.priority?.toUpperCase() || "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${lead.urgency === "high" || lead.tatBreached ? "bg-red-100 text-red-800 border border-red-300" : "bg-gray-100 text-gray-700 border border-gray-300"}`}>
                            {lead.urgency ? lead.urgency.toUpperCase() : "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.contactTime || "N/A"}>{lead.contactTime || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.conversationSummary || "N/A"}>{lead.conversationSummary || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.leadOutcome || "N/A"}>{lead.leadOutcome || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{lead.leadCategory || "N/A"}</span>
                        </td>
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.preferredContact || "N/A"}>{lead.preferredContact || "N/A"}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const delay = calculateTimeDelay(lead.updatedAt)
                              const isNegative = delay.startsWith("-")
                              const timeStr = isNegative ? delay.substring(1) : delay
                              const hours = parseInt(timeStr.split(':')[0])
                              const colorClass = isNegative ? "text-orange-600" : hours >= 1 ? "text-red-600" : "text-orange-600"
                              return <span className={`text-sm font-semibold ${colorClass}`}>{delay}</span>
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                            {lead.assignedTo || "Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                              onClick={() => { setSelectedLead(lead); setIsViewDialogOpen(true) }}>
                              <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-medium border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                              onClick={() => { setSelectedLead(lead); setIsCallHistoryDialogOpen(true) }}>
                              <History className="h-3.5 w-3.5 mr-1.5" /> Call History
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-blue-50">
                  <div className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-700">{startIndex + 1}</span> to{" "}
                    <span className="font-medium text-slate-700">{Math.min(endIndex, filteredLeads.length)}</span> of{" "}
                    <span className="font-medium text-slate-700">{filteredLeads.length}</span> leads
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>Previous</Button>
                    <span className="text-sm font-medium text-slate-700">Page {currentPage} of {totalPages}</span>
                    <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rows</span>
                      <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {[5, 10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Go to</span>
                      <input type="number" min={1} max={totalPages} value={gotoPage} onChange={(e) => setGotoPage(e.target.value)}
                        className="h-8 w-20 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Page" />
                      <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={handleGotoPage}>Go</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── View Dialog ── */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-screen max-w-none sm:w-[99vw] sm:max-w-[1920px] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl shadow-2xl mx-2">
            <DialogHeader className="border-b border-slate-200 pb-4 px-6 sticky top-0 bg-white z-10">
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700">Lead Details</DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1">Complete information about the selected lead</DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <div className="py-6 px-6 space-y-6">
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200 shadow-lg">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Lead ID</label>
                      <p className="text-sm font-mono bg-white p-3 rounded-lg border border-blue-200 font-semibold text-blue-700 shadow-sm break-all">{selectedLead.id}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Priority</label>
                      <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                        <Badge className={`font-bold text-xs px-3 py-1 ${selectedLead.priority === "high" ? "bg-red-500 text-white hover:bg-red-600" : selectedLead.priority === "medium" ? "bg-yellow-500 text-white hover:bg-yellow-600" : "bg-green-500 text-white hover:bg-green-600"}`}>
                          {selectedLead.priority?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide"><span className="w-2 h-2 rounded-full bg-purple-500"></span>Created At</label>
                      <p className="text-sm bg-white p-3 rounded-lg border border-blue-200 shadow-sm">{new Date(selectedLead.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</label><p className="text-base bg-slate-50 p-3 rounded-lg border border-slate-200 font-semibold text-slate-900">{selectedLead.name}</p></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Company</label><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><Badge variant="outline" className="font-semibold border-blue-400 text-blue-700 bg-blue-50">{selectedLead.company}</Badge></div></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 break-all text-blue-600">{selectedLead.email}</p></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-semibold text-slate-900">{selectedLead.phone}</p></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Country</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedLead.country || "N/A"}</p></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lead Category</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedLead.leadCategory || "N/A"}</p></div>
                  </div>
                </div>

                {/* Lead Details */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Lead Details</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Subject</label><div className="text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-200 break-all font-medium text-slate-800">{selectedLead.subject || "N/A"}</div></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</label><div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[80px] whitespace-pre-wrap break-all leading-relaxed">{selectedLead.notes || "N/A"}</div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Data Source</label><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><Badge variant="secondary" className="font-semibold bg-slate-700 text-white">{selectedLead.source}</Badge></div></div>
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Assigned To</label><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><Badge variant="secondary" className="font-semibold bg-orange-500 text-white">{selectedLead.assignedTo || "Unassigned"}</Badge></div></div>
                    </div>
                  </div>
                </div>

                {/* Contact Preferences */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Contact Preferences</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Contact Time</label><p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium">{selectedLead.contactTime || "N/A"}</p></div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Preferred Way to Contact</label><p className="text-sm bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium">{selectedLead.preferredContact || "N/A"}</p></div>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-3 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">AI Summary</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Summary of Conversation</label><div className="text-sm bg-purple-50 p-4 rounded-lg border border-purple-200 min-h-[80px] whitespace-pre-wrap break-all leading-relaxed">{selectedLead.conversationSummary || "N/A"}</div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lead Outcome</label><div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><Badge variant="outline" className="font-semibold border-purple-400 text-purple-700 bg-purple-50">{selectedLead.leadOutcome || "N/A"}</Badge></div></div>
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">GPT Extraction Status</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">{selectedLead.gptExtractionStatus || "N/A"}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Sent Status</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">{selectedLead.sentStatus || "N/A"}</p></div>
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mail Status</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">{selectedLead.mailStatus || "N/A"}</p></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Verified Source</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">{selectedLead.verifiedSource || "N/A"}</p></div>
                      <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Test Col</label><p className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium">{selectedLead.testCol || "N/A"}</p></div>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason (Why Assign or Delete?)</label><div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[60px] whitespace-pre-wrap break-all leading-relaxed">{selectedLead.reasonAssignOrDelete || "N/A"}</div></div>
                  </div>
                </div>

                {/* Call Recording */}
                {selectedLead?.callRecordingUrl && (
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-lg">Call Recording Available</h4>
                            <p className="text-blue-100 text-sm">Download the latest call recording</p>
                          </div>
                        </div>
                        <a href={selectedLead.callRecordingUrl} download rel="noopener noreferrer"
                          className="bg-white hover:bg-blue-50 text-blue-600 font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 group">
                          <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Call History Modal ── */}
        <FollowUpModal
          isOpen={isCallHistoryDialogOpen}
          onClose={() => setIsCallHistoryDialogOpen(false)}
          lead={selectedLead}
          followUps={followUps}
          isLoading={isCallHistoryLoading}
          error={callHistoryError}
        />

        {/* ── SQV Dialog ── */}
        <Dialog open={isSqvDialogOpen} onOpenChange={setIsSqvDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-emerald-700 flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-green-600" />
                SQV Verification Details
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1">Squad Voice Quality verification information for the selected lead</DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <div className="grid gap-5 py-5">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-green-900">Lead: {selectedLead.name}</p>
                      <p className="text-xs text-green-700 mt-0.5">{selectedLead.phone}</p>
                    </div>
                    <Badge className="bg-green-600 text-white font-bold shadow-md w-fit">{getSqvData(selectedLead.id).verifiedStatus}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV VERIFIED STATUS</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><Badge className={`font-bold shadow-sm ${getSqvData(selectedLead.id).verifiedStatus === "Yes" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>{getSqvData(selectedLead.id).verifiedStatus}</Badge></div></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV ID</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><p className="text-sm font-mono font-bold text-blue-600">{getSqvData(selectedLead.id).sqvId}</p></div></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV OUTCOME STATUS</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><Badge variant="outline" className="font-bold text-base border-indigo-300 text-indigo-700 bg-indigo-50">{getSqvData(selectedLead.id).outcomeStatus}</Badge></div></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV RECORDING URL</label><div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border-2 border-blue-300 shadow-sm"><a href={getSqvData(selectedLead.id).recordingUrl} download rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-semibold flex flex-col sm:flex-row sm:items-center gap-2 transition-colors break-all"><span className="truncate">{getSqvData(selectedLead.id).recordingUrl}</span><span className="text-xs bg-blue-100 px-2 py-1 rounded-md w-fit">Download ⬇</span></a></div></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT'S DISPOSITION</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><Badge variant="secondary" className="font-bold bg-slate-200 text-slate-900">{getSqvData(selectedLead.id).agentDisposition}</Badge></div></div>
                  <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT NAME</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><p className="text-sm font-bold text-slate-900">{getSqvData(selectedLead.id).agentName}</p></div></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT REMARKS</label><div className="bg-blue-50 p-4 rounded-lg border-2 border-slate-300 min-h-[60px] shadow-sm"><p className="text-sm text-slate-700">{getSqvData(selectedLead.id).agentRemarks}</p></div></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV PRIORITY</label><div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm"><Badge className={`font-bold shadow-sm ${getSqvData(selectedLead.id).priority === "High" ? "bg-red-600 text-white" : getSqvData(selectedLead.id).priority === "Medium" ? "bg-yellow-600 text-white" : "bg-green-600 text-white"}`}>{getSqvData(selectedLead.id).priority}</Badge></div></div>
                <div className="pt-4 border-t-2 border-slate-200">
                  <Button onClick={() => setIsSqvDialogOpen(false)} className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-lg rounded-xl transition-all">Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  )
}
