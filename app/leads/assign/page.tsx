"use client"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import { useLeads } from "@/hooks/use-leads"
import { useSqlCallHistory } from "@/hooks/use-sql-call-history"
import { useRouter } from "next/navigation"
import React, { useEffect, useState, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getIDBCache, setIDBCache } from "@/lib/idb"
import FollowUpModal from "@/components/lead-search/FollowUpModal"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import LeadDetailModal from "@/components/LeadDetailModal"
import VerifiedDetailModal from "@/components/VerifiedDetailModal"
import UnverifiedDetailModal from "@/components/UnverifiedDetailModal"
import CollectionDetailModal from "@/components/CollectionDetailModal"
import WastedDetailModal from "@/components/WastedLeadsDetailModal"


import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  History,
  CheckCircle,
  TableIcon,
  BarChart3,
  DollarSign,
  Target,
  LineChart,
  EyeOff,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  Download,
  Printer,
} from "lucide-react"
import { BackButton } from "@/components/back-button"
import type { Lead } from "@/types/lead"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRef } from "react"
import Loader from "@/components/Loader"
import { registerLeadsMemoryCacheReset, LEADS_CACHE_CLEARED_EVENT } from "@/lib/leads-cache-control"
import { normalizeVSrc, normalizeVSrcKey } from "@/lib/lead-source"
import { parseCRMDate, formatIST } from "@/lib/lead-date"
import { formatDelay, delayColor } from "@/lib/lead-delay"
import { sanitizeIvrUrl } from "@/lib/lead-media"
import { PField } from "@/components/lead-detail-field"
interface CallHistory {
  id: string
  callDate: string
  disposition: string
  remarks: string
  recordingUrl: string | null
  duration: string
}

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

type AssignmentLead = Lead & {
  intent?: string
  vSrc?: string
  sentStatus?: string
  "NBD/CRR"?: string
  NBD_CRR?: string
  reasonAssignOrDelete?: string
  gptExtractionStatus?: string
  mailStatus?: string
  verifiedSource?: string
  testCol?: string
}


const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes cache validity
const globalLeadsCache = new Map<string, { timestamp: number, data: any[] }>();

export default function LeadAssignmentPage() {
  const { user, isLoading, hasPermission, getAllUsers } = useAuth()
  const allLeadsBufferRef = useRef<any[]>([])
  const lastFetchedTimestampRef = useRef<string | null>(null)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [newLeadsCount, setNewLeadsCount] = React.useState(0)
  const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false)
  const {
    leads,
    conversion,
    spent: spendData,
    isLoading: isLeadLoading,
    isInitialLoading,
    error,
    getLeads,
    isLeadsLoaded
  } = useLeads()

  const router = useRouter()
  const [unassignedLeads, setUnassignedLeads] = useState<AssignmentLead[]>([])
  //const [searchTerm, setSearchTerm] = useState("")
  // Search states
  const [searchInput, setSearchInput] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [urgencyFilter, setUrgencyFilter] = useState("all")
  const [assignToFilter, setAssignToFilter] = useState("all")
  // const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [dataSourceSortField, setDataSourceSortField] = useState<string>("")
  const [dataSourceSortDirection, setDataSourceSortDirection] = useState<"asc" | "desc">("asc")
  const [dataSourceTableVisible, setDataSourceTableVisible] = useState(true)
  // const { leads, getLeads } = useLeads()
  const [filteredLeads, setFilteredLeads] = useState<any[]>([])
  const [tableLeads, setTableLeads] = useState<any[]>([])
  const [analyticsLeads, setAnalyticsLeads] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const [isLeadDetailModalOpen, setIsLeadDetailModalOpen] = useState(false)
  const [leadDetailModalMeta, setLeadDetailModalMeta] = useState<any>(null)
  const [isVerifiedModalOpen, setIsVerifiedModalOpen] = useState(false)
  const [verifiedModalMeta, setVerifiedModalMeta] = useState<any>(null)
  const [isUnverifiedModalOpen, setIsUnverifiedModalOpen] = useState(false)
  const [unverifiedModalMeta, setUnverifiedModalMeta] = useState<any>(null)
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [collectionModalMeta, setCollectionModalMeta] = useState<any>(null)
  const [isWastedModalOpen, setIsWastedModalOpen] = useState(false)
  const [wastedModalMeta, setWastedModalMeta] = useState<any>(null)


  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [displayLimit, setDisplayLimit] = useState(1000)
  const [isFetchingMore, setIsFetchingMore] = useState(true)   // true = loading until all data fetched
  const [isAllDataLoaded, setIsAllDataLoaded] = useState(false)
  const [localLeadsLoaded, setLocalLeadsLoaded] = useState(false)
  const [gotoPage, setGotoPage] = useState("")
  const [totalPages, setTotalPages] = useState(1)
  const [totalLeads, setTotalLeads] = useState(0)
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_week")
  const resultRef = useRef<HTMLDivElement | null>(null)
  const [startDate, setStartDate] = useState(() => {
    // Default: this Sunday (IST)
    const now = new Date()
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate())
    const weekStart = new Date(today)
    const day = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    weekStart.setDate(today.getDate() - day)
    return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
  })

  const [isFilterFetching, setIsFilterFetching] = React.useState(false)

  // ── Server-side date range fetch ─────────────────────────────────────────
  // Called on initial load AND whenever startDate/endDate change
  const fetchLeadsByDateRange = async (from: string, to: string, isInitial = false, force = false, silent = false) => {
    try {
      if (isInitial) setLocalLeadsLoaded(false)
      if (!silent) {
        setIsFilterFetching(true)
        setIsFetchingMore(true)
      }

      const url = from && to
        ? `/api/leads?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=999999&unassigned=true`
        : `/api/leads?page=1&limit=999999&unassigned=true`
      const requestUrl = new URL(url, window.location.origin)
      if (force) requestUrl.searchParams.set("force", "1")

      const cacheKey = `leads_v2_${from || "all"}_${to || "all"}`
      let leadsData = null

      if (!force) {
        // 1. Check in-memory global cache (survives soft navigation)
        const memCache = globalLeadsCache.get(cacheKey)
        if (memCache && (Date.now() - memCache.timestamp < CACHE_EXPIRY_MS)) {
          leadsData = memCache.data
        }

        // 2. Check IndexedDB if memory cache misses (survives hard refresh and has 1GB+ limit)
        if (!leadsData && typeof window !== 'undefined') {
          try {
            const idbCache = await getIDBCache(cacheKey);
            if (idbCache && (Date.now() - idbCache.timestamp < CACHE_EXPIRY_MS)) {
              leadsData = idbCache.data;
              globalLeadsCache.set(cacheKey, idbCache); // Promote back to memory
            }
          } catch (e) {
            console.warn("IndexedDB cache read error:", e)
          }
        }
      }

      // 3. Network Fetch if all caches miss
      if (!leadsData) {
        const res = await fetch(requestUrl.toString(), {
          cache: force ? "no-store" : "default",
          headers: force ? { "Cache-Control": "no-cache" } : undefined,
        })
        const data = await res.json()

        if (!data.success) {
          console.error("Lead fetch failed")
          if (!silent) {
            setLocalLeadsLoaded(true)
            setIsFetchingMore(false)
            setIsFilterFetching(false)
          }
          return
        }

        leadsData = data.data ?? []

        // Save successfully fetched data to memory and IndexedDB
        const cacheEntry = { timestamp: Date.now(), data: leadsData }
        globalLeadsCache.set(cacheKey, cacheEntry)

        if (typeof window !== 'undefined') {
          try {
            await setIDBCache(cacheKey, cacheEntry);
          } catch (e) {
            console.warn("Could not write to IndexedDB", e)
          }
        }
      }

      // Sirf context aur analytics update karo
      // tableLeads + filteredLeads → useEffect chain handle karega (company + priority/source/urgency filters automatically apply honge)
      getLeads(leadsData)
      // analyticsLeads = company filtered version (for Data Source Breakdown)
      const currentCompany = selectedCompany
      const filteredForAnalytics = currentCompany && currentCompany !== 'ALL'
        ? leadsData.filter((l: any) => l.company === currentCompany)
        : leadsData
      setAnalyticsLeads(filteredForAnalytics)
      allLeadsBufferRef.current = leadsData

      // totalLeads = company filtered count (not ALL companies)
      const companyFilteredCount = filteredForAnalytics.length
      setTotalLeads(companyFilteredCount)
      setTotalPages(Math.ceil(companyFilteredCount / itemsPerPage))
      setCurrentPage(1)
      updateLastTimestamp(leadsData)

      setLocalLeadsLoaded(true)
      setIsAllDataLoaded(true)
      if (!silent) {
        setIsFetchingMore(false)
        setIsFilterFetching(false)
      }

    } catch (error) {
      console.error("Lead fetch error", error)
      if (!silent) {
        setIsFetchingMore(false)
        setIsFilterFetching(false)
      }
    }
  }

  // Keep refreshLeads as alias for backward compatibility (auto-refresh uses it)
  const refreshLeads = (options?: { force?: boolean; silent?: boolean } | boolean) => {
    const normalized = typeof options === "boolean" ? { force: options } : (options ?? {})
    return fetchLeadsByDateRange(startDate, endDate, false, normalized.force ?? false, normalized.silent ?? false)
  }
  const refreshLeadsRef = useRef(refreshLeads)

  useEffect(() => {
    refreshLeadsRef.current = refreshLeads
  }, [refreshLeads])

  useEffect(() => {
    const unregister = registerLeadsMemoryCacheReset(() => {
      globalLeadsCache.clear()
    })

    const handleCacheClear = () => {
      globalLeadsCache.clear()
      refreshLeadsRef.current({ force: true, silent: true })
    }

    window.addEventListener(LEADS_CACHE_CLEARED_EVENT, handleCacheClear)
    return () => {
      unregister()
      window.removeEventListener(LEADS_CACHE_CLEARED_EVENT, handleCacheClear)
    }
  }, [])

  const [endDate, setEndDate] = useState(() => {
    // Default: today (IST)
    const now = new Date()
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    return `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`
  })
  const [dateError, setDateError] = useState("")

  const [selectedLead, setSelectedLead] = useState<AssignmentLead | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCallHistoryDialogOpen, setIsCallHistoryDialogOpen] = useState(false)
  // Call History: only fetch when dialog is opened (not on every selectedLead change)
  const [callHistoryLeadId, setCallHistoryLeadId] = useState<string | null>(null)
  const { followUps, isLoading: isCallHistoryLoading, error: callHistoryError } = useSqlCallHistory(
    callHistoryLeadId
  )
  const [isSqvDialogOpen, setIsSqvDialogOpen] = useState(false)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [dataSourceView, setDataSourceView] = useState<"table" | "chart">("table")

  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" })
  const [activeChartTab, setActiveChartTab] = useState<"leads" | "breakdown">("leads")
  const [expandedDataSourceDates, setExpandedDataSourceDates] = useState<Set<string>>(new Set())

  // Pagination state for Data Source Breakdown
  const [dataSourceCurrentPage, setDataSourceCurrentPage] = useState(1)
  const [dataSourceItemsPerPage, setDataSourceItemsPerPage] = useState(5)
  const [dataSourceGotoPage, setDataSourceGotoPage] = useState("")

  // ── CHANGE 1: DB se Total Traffic (/api/total-traffic) ───────────────────
  // Format returned: { COMPANY: { "DD-MM-YYYY": { medium: count } } }
  const [dbTrafficData, setDbTrafficData] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const params = new URLSearchParams()
        // ✅ FIX: Traffic - no date filter (DB dates differ from lead dates)

        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)
        const res = await fetch(`/api/total-traffic?${params.toString()}`)
        const json = await res.json()
        if (json.success) {
          setDbTrafficData(json.data || {})
        }
        else console.error('[Total Traffic DB] Fetch failed:', json.error)
      } catch (err) { console.error('[Total Traffic DB] Error:', err) }
    }
    fetchTraffic()
  }, [selectedCompany])

  // ── CHANGE 2: DB se Spend/Expense (/api/expense) ─────────────────────────
  // Format returned: { COMPANY: { "DD-MM-YYYY": { source: amount } } }
  const [dbExpenseData, setDbExpenseData] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const params = new URLSearchParams()
        // ✅ FIX: Expense - no date filter

        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)
        const res = await fetch(`/api/expense?${params.toString()}`)
        const json = await res.json()
        if (json.success) {
          setDbExpenseData(json.data || {})
        }
        else console.error('[Expense DB] Fetch failed:', json.error)
      } catch (err) { console.error('[Expense DB] Error:', err) }
    }
    fetchExpense()
  }, [selectedCompany])

  // ── CHANGE 3: DB se Payment/Collection (/api/leads/payment) ──────────────
  // Format returned: { COMPANY: { "DD-MM-YYYY": totalAmount } }
  const [dbPaymentData, setDbPaymentData] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const params = new URLSearchParams()
        if (startDate) params.set('from', startDate)
        if (endDate) params.set('to', endDate)
        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)
        const res = await fetch(`/api/payment?${params.toString()}`)
        const json = await res.json()
        if (json.success) {
          setDbPaymentData(json.data || {})
        }
        else console.error('[Payment DB] Fetch failed:', json.error)
      } catch (err) { console.error('[Payment DB] Error:', err) }
    }
    fetchPayment()
  }, [startDate, endDate, selectedCompany])
  // ─────────────────────────────────────────────────────────────────────────

  // ── CHANGE 4+5: /api/conversion se Verified + Unverified + Cancelled data ──
  // API format: { COMPANY: { "DD-MM-YYYY": { source: {
  //   verified_conversion_count, verified_conversion_amount,
  //   unverified_conversion_count, unverified_conversion_amount,
  //   canceled_booking_order_qty, cancelled_order_amount } } } }
  const [dbConversionData, setDbConversionData] = useState<Record<string, any>>({})

  // useEffect(() => {
  //   const fetchConversion = async () => {
  //     try {
  //       const params = new URLSearchParams()
  //       if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)

  //       const res = await fetch(`/api/conversion?${params.toString()}`)
  //       const json = await res.json()
  //       if (json.success) {
  //         setDbConversionData(json.data || {})
  //           totalRows: json.totalRows,
  //           filterApplied: json.filterApplied,
  //           data: json.data || {},
  //         })
  //       }
  //       else console.error('[Conversion DB] Fetch failed:', json.error)
  //     } catch (err) { console.error('[Conversion DB] Error:', err) }
  //   }
  //   fetchConversion()
  // }, [selectedCompany])

  // useEffect(() => {
  //   const rows: Array<{
  //     company: string
  //     date: string
  //     source: string
  //     verifiedCount: number
  //     verifiedAmount: number
  //     unverifiedCount: number
  //     cancelledQty: number
  //   }> = []

  //   Object.entries(dbConversionData).forEach(([company, dates]: any) => {
  //     Object.entries(dates || {}).forEach(([date, sources]: any) => {
  //       if (startDate || endDate) {
  //         const [dd, mm, yyyy] = String(date).split('-')
  //         const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
  //         if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
  //         if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
  //       }

  //       Object.entries(sources || {}).forEach(([source, data]: any) => {
  //         rows.push({
  //           company,
  //           date,
  //           source,
  //           verifiedCount: Number(data?.verified_conversion_count || 0),
  //           verifiedAmount: Number(data?.verified_conversion_amount || 0),
  //           unverifiedCount: Number(data?.unverified_conversion_count || 0),
  //           cancelledQty: Number(data?.canceled_booking_order_qty || 0),
  //         })
  //       })
  //     })
  //   })

  //   if (!rows.length) return

  //   const totals = rows.reduce(
  //     (acc, row) => ({
  //       verifiedCount: acc.verifiedCount + row.verifiedCount,
  //       verifiedAmount: acc.verifiedAmount + row.verifiedAmount,
  //       unverifiedCount: acc.unverifiedCount + row.unverifiedCount,
  //       cancelledQty: acc.cancelledQty + row.cancelledQty,
  //     }),
  //     { verifiedCount: 0, verifiedAmount: 0, unverifiedCount: 0, cancelledQty: 0 }
  //   )

  // }, [dbConversionData, selectedCompany, startDate, endDate])

  useEffect(() => {
    const fetchConversion = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)

        const res = await fetch(`/api/conversion?${params.toString()}`)
        const json = await res.json()
        if (json.success) {
          setDbConversionData(json.data || {})
        }
        else console.error('[Conversion DB] Fetch failed:', json.error)
      } catch (err) { console.error('[Conversion DB] Error:', err) }
    }
    fetchConversion()
  }, [selectedCompany])


  useEffect(() => {
    const rows: Array<{
      company: string
      date: string
      source: string
      verifiedCount: number
      verifiedAmount: number
      unverifiedCount: number
      cancelledQty: number
    }> = []

    Object.entries(dbConversionData).forEach(([company, dates]: any) => {
      Object.entries(dates || {}).forEach(([date, sources]: any) => {
        if (startDate || endDate) {
          const [dd, mm, yyyy] = String(date).split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        Object.entries(sources || {}).forEach(([source, data]: any) => {
          rows.push({
            company,
            date,
            source,
            verifiedCount: Number(data?.verified_conversion_count || 0),
            verifiedAmount: Number(data?.verified_conversion_amount || 0),
            unverifiedCount: Number(data?.unverified_conversion_count || 0),
            cancelledQty: Number(data?.canceled_booking_order_qty || 0),
          })
        })
      })
    })

    if (!rows.length) return

    const totals = rows.reduce(
      (acc, row) => ({
        verifiedCount: acc.verifiedCount + row.verifiedCount,
        verifiedAmount: acc.verifiedAmount + row.verifiedAmount,
        unverifiedCount: acc.unverifiedCount + row.unverifiedCount,
        cancelledQty: acc.cancelledQty + row.cancelledQty,
      }),
      { verifiedCount: 0, verifiedAmount: 0, unverifiedCount: 0, cancelledQty: 0 }
    )
  }, [dbConversionData, selectedCompany, startDate, endDate])


  // ── CHANGE 6: /api/wasted-leads se Wasted Qty + % + Reasons ──────────────
  // API format: { COMPANY: { "DD-MM-YYYY": { source: {
  //   total_leads, wasted_leads, wasted_percentage, reasons: { reason: count } } } } }
  const [dbWastedData, setDbWastedData] = useState<Record<string, any>>({})
  const [dbPotentialValueData, setDbPotentialValueData] = useState<Record<string, any>>({})

  useEffect(() => {
    const fetchWasted = async () => {
      setDbWastedData({})
      setDbPotentialValueData({})
      try {
        const params = new URLSearchParams()
        if (startDate) params.set('from', startDate)
        if (endDate) params.set('to', endDate)
        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)

        const isSmallRange = dateFilter === 'today' || dateFilter === 'yesterday' || dateFilter === 'this_week'
        params.set('pageSize', isSmallRange ? '2000' : '50000')

        const res = await fetch(`/api/wasted-leads?${params.toString()}`)
        const json = await res.json()
        if (json.success && json.data) {
          if (json.data.all) {
            const grouped: Record<string, any> = {}
            json.data.all.forEach((lead: any) => {
              const company = lead.company || 'KTAHV'
              
              // Normalize date to DD-MM-YYYY format
              let date = '-'
              if (lead.dateTime) {
                const str = String(lead.dateTime).trim()
                const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
                if (ymdMatch) {
                  date = `${ymdMatch[3]}-${ymdMatch[2]}-${ymdMatch[1]}`
                } else {
                  const dmyMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/)
                  if (dmyMatch) {
                    date = `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`
                  } else {
                    date = str.split('T')[0]
                  }
                }
              }

              const { key: sourceKey } = normalizeVSrc(lead.source)

              if (!grouped[company]) grouped[company] = {}
              if (!grouped[company][date]) grouped[company][date] = {}
              if (!grouped[company][date][sourceKey]) {
                grouped[company][date][sourceKey] = { leads: [], wastedQty: 0, potentialLostValue: 0, reasons: {} }
              }
              const entry = grouped[company][date][sourceKey]
              entry.leads.push(lead)
              entry.wastedQty++
              entry.potentialLostValue += lead.lostValue || 0

              const reason = lead.disposition || lead.cancellationRemarks || 'N/A'
              entry.reasons[reason] = (entry.reasons[reason] || 0) + 1
            })
            setDbWastedData(grouped)
          } else {
            setDbWastedData(json.data || {})
          }
        }
      } catch (err) { console.error('[Wasted DB] Error:', err) }
    }
    fetchWasted()
  }, [startDate, endDate, selectedCompany, dateFilter])
  // ─────────────────────────────────────────────────────────────────────────

  const getCallHistory = (leadId: string): CallHistory[] => {
    const callCount = Math.floor(Math.random() * 5) + 1
    return Array.from({ length: callCount }, (_, i) => ({
      id: `call-${leadId}-${i + 1}`,
      callDate: new Date(Date.now() - i * 86400000 * 2).toLocaleString(),
      disposition: ["Interested", "Not Interested", "Call Back", "No Answer", "Busy"][Math.floor(Math.random() * 5)],
      remarks: [
        "Customer wants more information about pricing",
        "Requested callback tomorrow morning",
        "Not available, will call back later",
        "Very interested in Panchakarma treatment",
        "Needs to discuss with family first",
      ][Math.floor(Math.random() * 5)],
      recordingUrl: Math.random() > 0.5 ? `https://recordings.example.com/${leadId}-${i + 1}.mp3` : null,
      duration: `${Math.floor(Math.random() * 10) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
    }))
  }

  const getSqvData = (leadId: string) => {
    return {
      verifiedStatus: "Yes",
      sqvId: "1UI8LWPA2",
      outcomeStatus: "Prevention_Rejuvenation",
      recordingUrl: "https://squadiq-call-recs.s3.amazonaws.com/1UI8LWPA2.mp3",
      agentDisposition: "Prevention_Rejuvenation",
      agentRemarks: "Na",
      agentName: "Himani",
      priority: "High",
    }
  }

  // ============ DYNAMIC FILTER OPTIONS FROM COMPANY-FILTERED LEADS ============
  // Extract unique Lead Sources (vSrc) — company filter applied
  const uniqueLeadSources = useMemo(() => {
    const buf = allLeadsBufferRef?.current
    const srcLeads = (Array.isArray(buf) && buf.length > 0) ? buf : (Array.isArray(leads) ? leads : [])
    if (srcLeads.length === 0) return []

    const sources = new Map<string, string>()

    srcLeads.forEach(lead => {
      const rawSource = lead.vSrc || lead.source
      if (rawSource) {
        const { key, label } = normalizeVSrc(rawSource)
        if (!sources.has(key)) sources.set(key, label)
      }
    })

    return Array.from(sources.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [leads])

  // Extract unique Assigned To values — company filter applied
  const uniqueAssignedTo = useMemo(() => {
    const buf = allLeadsBufferRef?.current; const srcLeads = (Array.isArray(buf) && buf.length > 0) ? buf : (Array.isArray(leads) ? leads : []); if (srcLeads.length === 0) return []
    const assignees = new Set<string>()
    srcLeads.forEach(lead => {
      if (lead.assignedTo) {
        assignees.add(lead.assignedTo)
      }
    })
    return Array.from(assignees).sort()
  }, [leads])
  // ============================================================


  // Toggle function for expanding/collapsing date rows in Data Source Breakdown
  const toggleDataSourceDate = (date: string) => {
    const newExpanded = new Set(expandedDataSourceDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDataSourceDates(newExpanded)
  }
  // Initialize first date as expanded in Data Source Breakdown

  useEffect(() => {
    if (analyticsLeads && analyticsLeads.length > 0) {
      // Get first date from grouped data
      const groupedByDateAndSource = (() => {
        const grouped: Record<string, Record<string, any>> = {}

        // Lead Distribution counts:
        // - isAllDataLoaded=true: leads (useLeads state, full data from getLeads(allData))
        // - company filter apply karo manually
        // - loading: filteredLeads (1000 rows, jo table mein already hain)
        const countSource = (() => {
          if (isAllDataLoaded && leads && leads.length > 0) {
            // Full data from useLeads — company filter apply karo
            if (selectedCompany && selectedCompany !== 'ALL') {
              return leads.filter((l: any) => l.company === selectedCompany)
            }
            return leads
          }
          return analyticsLeads
        })()

        countSource.forEach((lead) => {
          // Optimize: avoid expensive `new Date()` and `parseCRMDate` inside loops for 50k+ items
          // lead.updatedAt is 'DD/MM/YYYY HH:MM:SS', so substring(0, 10) gives 'DD/MM/YYYY', replace gives 'DD-MM-YYYY'
          const dateStr = lead.updatedAt && lead.updatedAt.length >= 10
            ? lead.updatedAt.substring(0, 10).replace(/\//g, '-')
            : '-'
          const srcRaw = lead.vSrc || "Others"
          const src = srcRaw.trim().charAt(0).toUpperCase() + srcRaw.trim().slice(1).toLowerCase()

          if (!grouped[dateStr]) {
            grouped[dateStr] = {}
          }

          if (!grouped[dateStr][src]) {
            grouped[dateStr][src] = {
              dataSource: src,
              totalLeads: 0,
              highPriority: 0,
              mediumPriority: 0,
              lowPriority: 0,
              nbd: 0,
              crr: 0,
              convertedCount: 0,
              conversionAmount: 0,
              spendAmount: 0,
              wastedQty: 0,
              lostReasons: {} as Record<string, number>,
              potentialLostValue: 0
            }
          }

          grouped[dateStr][src].totalLeads++
          if (lead.priority === "high") grouped[dateStr][src].highPriority++
          else if (lead.priority === "medium") grouped[dateStr][src].mediumPriority++
          else if (lead.priority === "low") grouped[dateStr][src].lowPriority++
        })





        return grouped
      })()

      const firstDateKey = Object.keys(groupedByDateAndSource).sort((a, b) => {
        const dateA = new Date(a.split('-').reverse().join('-'))
        const dateB = new Date(b.split('-').reverse().join('-'))
        return dateB.getTime() - dateA.getTime()
      })[0]

      if (firstDateKey && !expandedDataSourceDates.has(firstDateKey)) {
        setExpandedDataSourceDates(new Set([firstDateKey]))
      }
    }
  }, [filteredLeads])

  // Helper to format date to DD-MM-YYYY
  const isConversionArray = (data: any): data is Array<{ key: string; value: any }> => {
    return Array.isArray(data)
  }

  const isSpendArray = (data: any): data is Array<{ key: string; value: any }> => {
    return Array.isArray(data)
  }

  // Helper to get conversion data
  const getConversionData = (company: string) => {
    if (isConversionArray(conversion)) {
      if (company === "ALL") {
        return conversion.flatMap(item => item.value) as any[]
      }
      return conversion.find(item => item.key === company)?.value || []
    } else if (conversion instanceof Map) {
      if (company === "ALL") {
        return Array.from(conversion.values()).flat() as any[]
      }
      return conversion.get(company) || []
    }
    return []
  }

  // Helper to get spend data
  const getSpendData = () => {
    if (isSpendArray(spendData)) {
      return spendData.find(item => item.key === 'OtherExp')?.value as Record<string, any> | undefined
    } else if (spendData instanceof Map) {
      return spendData.get('OtherExp') as Record<string, any> | undefined
    }
    return undefined
  }
  // Helper to get TotalTraffic data
  const getTotalTrafficData = () => {
    if (isSpendArray(spendData)) {
      return spendData.find(item => item.key === 'TotalTraffic')?.value as Record<string, any> | undefined
    } else if (spendData instanceof Map) {
      return spendData.get('TotalTraffic') as Record<string, any> | undefined
    }
    return undefined
  }

  const getTotalSpendFromDB = () => {
    let total = 0

    const companies = selectedCompany === "ALL"
      ? Object.keys(dbExpenseData)
      : [selectedCompany]

    companies.forEach(company => {
      const companyData = dbExpenseData[company] || {}

      Object.entries(companyData).forEach(([date, sources]: any) => {

        // ✅ Apply same date filter
        if (startDate && endDate) {
          const [dd, mm, yyyy] = date.split('-')
          const formatted = `${yyyy}-${mm}-${dd}`
          if (formatted < startDate || formatted > endDate) return
        }

        Object.values(sources || {}).forEach((amount: any) => {
          total += Number(amount) || 0
        })
      })
    })

    return total
  }

  // ✅ FIXED VERSION
  // const formatDateToDDMMYYYY = (dateInput: string | Date | null | undefined) => {
  //   // Handle null or undefined
  //   if (!dateInput) return '-';

  //   const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  //   // Check if the date is valid
  //   if (isNaN(date.getTime())) return '-';

  //   const day = String(date.getDate()).padStart(2, '0');
  //   const month = String(date.getMonth() + 1).padStart(2, '0');
  //   const year = date.getFullYear();
  //   return `${day}-${month}-${year}`;
  // };

  const formatDateToDDMMYYYY = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return '-';

    let ms: number;
    if (typeof dateInput === 'string') {
      ms = parseCRMDate(dateInput)          // already handles DD/MM/YYYY correctly
    } else {
      ms = dateInput.getTime()
    }

    if (!ms || isNaN(ms)) return '-';

    const date = new Date(ms);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Reformat "yyyy-MM-dd" → "DD-MM-YYYY" directly (no new Date() to avoid timezone shift)
  const formatConvDate = (dateStr: string): string => {
    if (!dateStr) return '-'
    const datePart = dateStr.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return formatDateToDDMMYYYY(new Date(dateStr))
  };

  // Helper function to calculate time delay from lead creation to now in HH:MM:SS format
  // Uses parseCRMDate — same parsing as the "Date & Time" first column — so the delay
  // exactly reflects: current time − the timestamp shown in column 1.

  // const calculateTimeDelay = (dateInput?: string | Date) => {
  //   if (!dateInput) return "--:--:--"

  //   const createdMs = typeof dateInput === 'string'
  //     ? parseCRMDate(dateInput)   // identical to how the Date & Time column parses it
  //     : dateInput.getTime()

  //   if (!createdMs || isNaN(createdMs)) return "--:--:--"

  //   const diffMs = Date.now() - createdMs
  //   const isNegative = diffMs < 0
  //   const absDiffMs = Math.abs(diffMs)

  //   const totalSeconds = Math.floor(absDiffMs / 1000)
  //   const hours = Math.floor(totalSeconds / 3600)
  //   const minutes = Math.floor((totalSeconds % 3600) / 60)
  //   const seconds = totalSeconds % 60

  //   const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`

  //   return isNegative ? `-${timeStr}` : timeStr
  // }

  const calculateTimeDelay = (dateInput?: string | Date) => {
    if (!dateInput) return "--:--:--"

    // Same parsing as column 1 display — browser runs in IST, no timezone conversion needed
    const createdMs = typeof dateInput === 'string'
      ? parseCRMDate(dateInput)
      : dateInput.getTime()

    if (!createdMs || isNaN(createdMs)) return "--:--:--"

    const diffMs = Date.now() - createdMs
    const isNegative = diffMs < 0
    const absDiffMs = Math.abs(diffMs)

    const totalSeconds = Math.floor(absDiffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    return isNegative ? `-${timeStr}` : timeStr
  }





  // Client-side pagination — filteredLeads mein sab data hai, slice karke dikhao
  const tableRowsPerPage = itemsPerPage  // rows per page selector se control hoga
  const tableTotalPages = Math.max(1, Math.ceil(tableLeads.length / tableRowsPerPage))
  const tableStartIndex = (currentPage - 1) * tableRowsPerPage
  const tableEndIndex = Math.min(tableStartIndex + tableRowsPerPage, tableLeads.length)
  const currentLeads = tableLeads.slice(tableStartIndex, tableEndIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchInput, priorityFilter, sourceFilter, urgencyFilter, assignToFilter])


  // Last fetched data ka max Timestamp save karo
  const updateLastTimestamp = (data: any[]) => {
    if (!data || data.length === 0) return
    let maxTs = lastFetchedTimestampRef.current ? new Date(lastFetchedTimestampRef.current).getTime() : 0
    data.forEach((lead) => {
      if (lead.updatedAt) {
        const t = new Date(lead.updatedAt).getTime()
        if (t > maxTs) maxTs = t
      }
    })
    if (maxTs > 0) {
      lastFetchedTimestampRef.current = new Date(maxTs).toISOString()
    }
  }

  // Har 5 min mein: last timestamp ke baad naya data check karo
  const checkForNewLeads = React.useCallback(async () => {
    if (!lastFetchedTimestampRef.current) return
    setIsAutoRefreshing(true)
    try {
      const since = encodeURIComponent(lastFetchedTimestampRef.current)
      const res = await fetch(`/api/leads?since=${since}&unassigned=true`)
      const data = await res.json()

      if (data.success && data.data && data.data.length > 0) {
        const existingIds = new Set(allLeadsBufferRef.current.map((l: any) => l.id))
        const trulyNew = data.data.filter((l: any) => !existingIds.has(l.id))

        if (trulyNew.length > 0) {
          // 1. Determine which of these trulyNew leads belong in the current DATE/COMPANY view
          const matchingForBuffer = trulyNew.filter((lead: AssignmentLead) => {
            if (selectedCompany !== 'ALL' && lead.company !== selectedCompany) return false

            if (dateFilter === "all") return true
            if (!startDate || !endDate) return false

            const leadMs = parseCRMDate(lead.updatedAt || lead.createdAt)
            const startMs = new Date(startDate).setHours(0, 0, 0, 0)
            const endMs = new Date(endDate).setHours(23, 59, 59, 999)

            return leadMs >= startMs && leadMs <= endMs
          })

          if (matchingForBuffer.length > 0) {
            const merged = [...matchingForBuffer, ...allLeadsBufferRef.current]
            allLeadsBufferRef.current = merged
            getLeads(merged)

            const analyticsFiltered = selectedCompany && selectedCompany !== 'ALL'
              ? merged.filter((l: any) => l.company === selectedCompany)
              : merged
            setAnalyticsLeads(analyticsFiltered)

            setTotalLeads(merged.length)

            // 2. Increment newLeadsCount ONLY if the lead matches the currently active micro-filters (search, priority, etc.)
            const matchingActiveFilters = matchingForBuffer.filter((lead: AssignmentLead) => {
              // Search filter
              if (searchInput) {
                const term = searchInput.toLowerCase()
                const searchMatch =
                  String(lead.id ?? "").toLowerCase().includes(term) ||
                  String(lead.name ?? "").toLowerCase().includes(term) ||
                  String(lead.email ?? "").toLowerCase().includes(term) ||
                  String(lead.phone ?? "").toLowerCase().includes(term) ||
                  String(lead.subject ?? "").toLowerCase().includes(term)
                if (!searchMatch) return false
              }

              // Priority filter
              if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false

              // Source filter
              if (sourceFilter !== "all") {
                const leadSourceKey = normalizeVSrcKey(lead.vSrc || lead.source)
                if (leadSourceKey !== sourceFilter) return false
              }

              // Urgency filter
              if (urgencyFilter !== "all") {
                const isUrgent = lead.priority === "high" || lead.tatBreached
                if (urgencyFilter === "yes" && !isUrgent) return false
                if (urgencyFilter === "no" && isUrgent) return false
              }

              // Assign To filter
              if (assignToFilter !== "all") {
                if (assignToFilter === "unassigned") {
                  if (lead.sentStatus !== "") return false
                } else {
                  if (lead.assignedTo !== assignToFilter) return false
                }
              }

              return true
            })

            if (matchingActiveFilters.length > 0) {
              setNewLeadsCount(prev => prev + matchingActiveFilters.length)
            }
            updateLastTimestamp(matchingForBuffer)
          }

          // 3. Update Global Cache
          for (let [key, val] of Array.from(globalLeadsCache.entries())) {
            const parts = key.split('_')
            const cacheFrom = parts[1]
            const cacheTo = parts[2]

            const leadsForThisCache = trulyNew.filter((lead: AssignmentLead) => {
              if (cacheFrom === 'all') return true
              const leadMs = parseCRMDate(lead.updatedAt || lead.createdAt)
              const cStartMs = new Date(cacheFrom).setHours(0, 0, 0, 0)
              const cEndMs = new Date(cacheTo).setHours(23, 59, 59, 999)
              return leadMs >= cStartMs && leadMs <= cEndMs
            })

            if (leadsForThisCache.length > 0) {
              const updatedEntry = { timestamp: Date.now(), data: [...leadsForThisCache, ...val.data] }
              globalLeadsCache.set(key, updatedEntry)
              if (typeof window !== 'undefined') {
                try { setIDBCache(key, updatedEntry) } catch (e) { }
              }
            }
          }
          updateLastTimestamp(trulyNew)
        }
      }
    } catch (e) {
      console.error('Auto-refresh error', e)
    } finally {
      setIsAutoRefreshing(false)
    }
  }, [getLeads, selectedCompany, dateFilter, startDate, endDate, searchInput, priorityFilter, sourceFilter, urgencyFilter, assignToFilter])

  // ── SINGLE SOURCE OF TRUTH: dateFilter → compute dates → fetch directly ──
  // Removes intermediate startDate/endDate chain which had race conditions

  const computeDatesForFilter = (filter: string) => {
    const now = new Date()
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
    const today = new Date(istNow.getFullYear(), istNow.getMonth(), istNow.getDate())

    switch (filter) {
      case "today":
        return { from: formatIST(today), to: formatIST(today) }

      case "yesterday": {
        const y = new Date(today); y.setDate(y.getDate() - 1)
        return { from: formatIST(y), to: formatIST(y) }
      }

      case "this_week": {
        const ws = new Date(today)
        const day = today.getDay()
        ws.setDate(today.getDate() - day) // Start from Sunday
        return { from: formatIST(ws), to: formatIST(today) }
      }

      case "last_week": {
        const lwe = new Date(today)
        lwe.setDate(today.getDate() - today.getDay() - 1)
        const lws = new Date(lwe)
        lws.setDate(lwe.getDate() - 6)
        return { from: formatIST(lws), to: formatIST(lwe) }
      }

      case "this_month": {
        const ms = new Date(today.getFullYear(), today.getMonth(), 1)
        return { from: formatIST(ms), to: formatIST(today) }
      }

      case "last_month": {
        const lms = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lme = new Date(today.getFullYear(), today.getMonth(), 0)
        return { from: formatIST(lms), to: formatIST(lme) }
      }

      case "this_year": {
        const ys = new Date(today.getFullYear(), 0, 1)
        return { from: formatIST(ys), to: formatIST(today) }
      }

      case "last_year": {
        const lys = new Date(today.getFullYear() - 1, 0, 1)
        const lye = new Date(today.getFullYear() - 1, 11, 31)
        return { from: formatIST(lys), to: formatIST(lye) }
      }

      case "custom":
        if (customDateRange.start && customDateRange.end)
          return { from: customDateRange.start, to: customDateRange.end }
        return null

      default:
        return null
    }
  }

  // Initial load on mount
  useEffect(() => {
    const dates = computeDatesForFilter("this_week")
    if (dates) {
      setStartDate(dates.from)
      setEndDate(dates.to)
      fetchLeadsByDateRange(dates.from, dates.to, true)
    }
  }, [])  // only on mount

  // Background Silent Pre-fetcher for heavy date ranges
  useEffect(() => {
    if (!localLeadsLoaded) return; // Wait until initial "This Week" load finishes

    const prefetchTargets = ["this_year", "last_year", "all"];

    // Fire sequentially in background to avoid database connection pool exhaustion
    const runPrefetch = async () => {
      for (const target of prefetchTargets) {
        let from = "";
        let to = "";
        if (target !== "all") {
          const dates = computeDatesForFilter(target);
          if (dates) {
            from = dates.from;
            to = dates.to;
          }
        }

        const cacheKey = `leads_v2_${from || "all"}_${to || "all"}`;

        // If already in memory cache or session cache, skip it
        if (globalLeadsCache.has(cacheKey)) continue;

        const url = from && to
          ? `/api/leads?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=999999&unassigned=true`
          : `/api/leads?page=1&limit=999999&unassigned=true`;

        try {
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.data) {
            const cacheEntry = { timestamp: Date.now(), data: data.data };
            globalLeadsCache.set(cacheKey, cacheEntry);
            if (typeof window !== 'undefined') {
              try { setIDBCache(cacheKey, cacheEntry); } catch (e) { }
            }
          }
        } catch (e) {
          console.warn("Silent prefetch failed for " + target, e);
        }
      }
    };

    // Run after a short delay so the UI finishes rendering and main requests process
    const timer = setTimeout(() => {
      runPrefetch();
    }, 2000);

    return () => clearTimeout(timer);
  }, [localLeadsLoaded]);

  // dateFilter ya customDateRange change → directly compute & fetch
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return  // mount pe skip — upar wala useEffect handle karta hai
    }

    if (dateFilter === "all") {
      setStartDate("")
      setEndDate("")
      setDateError("")
      // "all" = no date filter, fetch without date range
      fetchLeadsByDateRange("", "", false)
      return
    }

    const dates = computeDatesForFilter(dateFilter)
    if (!dates) return  // custom with empty fields

    if (dates.to < dates.from) {
      setDateError("End date cannot be earlier than start date")
      return
    }

    setDateError("")
    setStartDate(dates.from)
    setEndDate(dates.to)
    setNewLeadsCount(0) // Reset new leads count when date filter changes
    fetchLeadsByDateRange(dates.from, dates.to, false)  // ← DIRECT CALL, no chain

  }, [dateFilter, customDateRange])

  // Jaise hi data load ho — har 5 min mein naya data check karo
  useEffect(() => {
    if (!isAllDataLoaded) return

    if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current)

    autoRefreshIntervalRef.current = setInterval(() => {
      checkForNewLeads()
    }, 5 * 60 * 1000)

    return () => {
      if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current)
    }
  }, [isAllDataLoaded, checkForNewLeads])

  // Reset Data Source Breakdown page when sorting changes
  useEffect(() => {
    setDataSourceCurrentPage(1)
  }, [dataSourceSortField, dataSourceSortDirection])

  const [filteredByDateLeads, setFilteredByDateLeads] = useState<AssignmentLead[]>(leads as AssignmentLead[])

  useEffect(() => {
    if (user && !selectedCompany) {
      setSelectedCompany(user.company || "KTAHV")
    }
  }, [user, selectedCompany])

  // Company and Date filter — applies to both filteredByDateLeads (table) and analyticsLeads (Data Source Breakdown)
  useEffect(() => {
    let filtered = selectedCompany === "ALL"
      ? [...leads]
      : leads.filter((lead) => lead.company === selectedCompany)

    // ✅ ADDED: Local date filtering to ensure UI strictly follows the selected range
    if (dateFilter !== "all" && startDate && endDate) {
      const startMs = new Date(startDate).setHours(0, 0, 0, 0)
      const endMs = new Date(endDate).setHours(23, 59, 59, 999)

      filtered = filtered.filter((lead) => {
        const leadMs = parseCRMDate(lead.updatedAt || lead.createdAt)
        return leadMs >= startMs && leadMs <= endMs
      })
    }

    setFilteredByDateLeads(filtered)

    const allBuf = allLeadsBufferRef.current
    if (allBuf && allBuf.length > 0) {
      let analyticsFiltered = selectedCompany === "ALL"
        ? [...allBuf]
        : allBuf.filter((l: any) => l.company === selectedCompany)

      // Also apply date filter to analytics if needed (though usually allBuf is already date-filtered)
      if (dateFilter !== "all" && startDate && endDate) {
        const startMs = new Date(startDate).setHours(0, 0, 0, 0)
        const endMs = new Date(endDate).setHours(23, 59, 59, 999)
        analyticsFiltered = analyticsFiltered.filter((l: any) => {
          const leadMs = parseCRMDate(l.updatedAt || l.createdAt)
          return leadMs >= startMs && leadMs <= endMs
        })
      }
      setAnalyticsLeads(analyticsFiltered)
    }
    setNewLeadsCount(0)
  }, [leads, selectedCompany, startDate, endDate, dateFilter])

  // ⚠️ dateFilter intentionally NOT in deps — date changes trigger a fresh fetch, not client filter

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.assign"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  useEffect(() => {
    const filtered = filteredLeads.filter(
      (lead) =>
        (!lead.assignedTo || lead.assignedTo.toLowerCase() === "unassigned") &&
        (user?.permissions.includes("all") || lead.company === user?.company)
    )
    setUnassignedLeads(filtered)
  }, [leads, user, filteredLeads])

  useEffect(() => {
    let filtered = filteredByDateLeads

    // Search filter
    if (searchInput) {
      const term = searchInput.toLowerCase()

      filtered = filtered.filter((lead) =>
        String(lead.id ?? "").toLowerCase().includes(term) ||
        String(lead.name ?? "").toLowerCase().includes(term) ||
        String(lead.email ?? "").toLowerCase().includes(term) ||
        String(lead.phone ?? "").toLowerCase().includes(term) ||
        String(lead.subject ?? "").toLowerCase().includes(term)
      )
    }

    // Intent (Priority) filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const itnt = (lead.intent || "").toLowerCase().trim();
        return itnt === priorityFilter.toLowerCase();
      })
    }

    // Source filter (using vSrc)
    if (sourceFilter !== "all") {
      filtered = filtered.filter((lead) => normalizeVSrcKey(lead.vSrc || lead.source) === sourceFilter)
    }

    // Urgency filter
    if (urgencyFilter !== "all") {
      filtered = filtered.filter((lead) => {
        const isUrgent = lead.priority == "high" || lead.tatBreached
        return urgencyFilter == "yes" ? isUrgent : !isUrgent
      })
    }

    // Assign To filter
    if (assignToFilter !== "all") {
      if (assignToFilter === "unassigned") {
        filtered = filtered.filter((lead) => lead.sentStatus === "")
      } else {
        filtered = filtered.filter((lead) => lead.assignedTo === assignToFilter)
      }
    }

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValueN = a[sortField as keyof typeof a]
        let bValueN = b[sortField as keyof typeof b]

        if (typeof aValueN === "string") aValueN = aValueN.toLowerCase()
        if (typeof bValueN === "string") bValueN = bValueN.toLowerCase()

        if (aValueN == null && bValueN == null) return 0
        if (aValueN == null) return sortDirection === "asc" ? -1 : 1
        if (bValueN == null) return sortDirection === "asc" ? 1 : -1
        if (aValueN < bValueN) return sortDirection === "asc" ? -1 : 1
        if (aValueN > bValueN) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    setTableLeads(filtered)      // ← TABLE mein bhi filters apply hone chahiye
    setCurrentPage(1)            // ← filter change pe page 1 pe reset
    setTotalLeads(filtered.length) // ← header count bhi filtered count dikhaye
    setFilteredLeads(filtered)
    // Note: analyticsLeads is updated separately via selectedCompany useEffect
  }, [
    filteredByDateLeads,
    isFetchingMore,
    searchInput,
    priorityFilter,
    sourceFilter,
    urgencyFilter,
    assignToFilter,
    sortField,
    sortDirection,
  ])

  useEffect(() => {
    setNewLeadsCount(0)
  }, [searchInput, priorityFilter, sourceFilter, urgencyFilter, assignToFilter])

  const salesAgents = getAllUsers().filter(
    (u) =>
      (u.role === "sales_agent" || u.role === "sales_manager") &&
      u.isActive &&
      (user?.permissions.includes("all") || u.company === user?.company)
  )

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc")
      } else {
        setSortField("")
        setSortDirection("asc")
      }
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleDataSourceSort = (field: string) => {
    if (dataSourceSortField === field) {
      if (dataSourceSortDirection === "asc") {
        setDataSourceSortDirection("desc")
      } else {
        setDataSourceSortField("")
        setDataSourceSortDirection("asc")
      }
    } else {
      setDataSourceSortField(field)
      setDataSourceSortDirection("asc")
    }
  }
  const handleGotoPage = async () => {
    const page = Number(gotoPage)

    if (!page || page < 1 || page > totalPages) return

    setCurrentPage(page)
    setGotoPage("")

    // Client-side pagination — no refetch needed
  }

  const handleDataSourceGotoPage = () => {
    const dataSourceTotalPages = Math.ceil(dataSourceDateGroups.length / dataSourceItemsPerPage)
    const page = Number(dataSourceGotoPage)

    if (!page || page < 1 || page > dataSourceTotalPages) {
      return
    }

    setDataSourceCurrentPage(page)
    setDataSourceGotoPage("")
  }

  // ── Download CSV ──────────────────────────────────────────────────────────
  const handleDownloadCSV = (dateGroup: typeof dataSourceDateGroups[number]) => {
    const headers = [
      "Data Source", "Total Traffic", "Total Leads", "Avg TAT",
      "High Intent", "High %", "High TAT", "Medium Intent", "Medium %", "Medium TAT", "Low Intent", "Low %", "Low TAT",
      "Converted Qty", "Conv. Amount (₹)", "Conv. %",
      "Spend Amt (₹)", "ROAS", "CAC",
      "Wasted Qty", "Wasted %", "Potential Lost Value (₹)",
      "Unverified Conv. Amt (₹)",
      "Cancelled Qty", "Cancelled Amt (₹)", "Cancelled %"
    ]

    const rows = dateGroup.sources.map(source => [
      source.dataSource, source.totalTraffic || 0, source.totalLeads,
      formatDelay(source.avgTat || 0),
      source.highPriority,
      source.totalLeads > 0 ? ((source.highPriority / source.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(source.highPriorityAvgTat || 0),
      source.mediumPriority,
      source.totalLeads > 0 ? ((source.mediumPriority / source.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(source.mediumPriorityAvgTat || 0),
      source.lowPriority,
      source.totalLeads > 0 ? ((source.lowPriority / source.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(source.lowPriorityAvgTat || 0),
      source.convertedCount, Math.floor(source.conversionAmount), source.conversionPercentage + "%",
      Math.floor(source.spendAmount), source.roas, source.cac,
      source.wastedQty || 0,
      source.totalLeads > 0 ? ((source.wastedQty / source.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      Math.floor(source.potentialLostValue || 0),
      Math.floor(source.unverifiedConversionAmount || 0),
      source.cancelledLeadQty || 0, Math.floor(source.cancelledLeadAmount || 0),
      source.totalLeads > 0 ? ((source.cancelledLeadQty / source.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
    ])

    const t = dateGroup.totals
    const grandAvgTat = t.tatCount > 0 ? Math.round(t.tatSum / t.tatCount) : 0
    const highAvgTat = t.highPriorityTatCount > 0 ? Math.round(t.highPriorityTatSum / t.highPriorityTatCount) : 0
    const mediumAvgTat = t.mediumPriorityTatCount > 0 ? Math.round(t.mediumPriorityTatSum / t.mediumPriorityTatCount) : 0
    const lowAvgTat = t.lowPriorityTatCount > 0 ? Math.round(t.lowPriorityTatSum / t.lowPriorityTatCount) : 0

    rows.push([
      "TOTAL", t.totalTraffic || 0, t.totalLeads,
      formatDelay(grandAvgTat),
      t.highPriority,
      t.totalLeads > 0 ? ((t.highPriority / t.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(highAvgTat),
      t.mediumPriority,
      t.totalLeads > 0 ? ((t.mediumPriority / t.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(mediumAvgTat),
      t.lowPriority,
      t.totalLeads > 0 ? ((t.lowPriority / t.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      formatDelay(lowAvgTat),
      t.convertedCount, Math.floor(t.conversionAmount), t.conversionPercentage + "%",
      Math.floor(t.spendAmount), t.roas, t.cac,
      t.wastedQty || 0,
      t.totalLeads > 0 ? ((t.wastedQty / t.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
      Math.floor(t.potentialLostValue || 0), Math.floor(t.unverifiedConversionAmount || 0),
      t.cancelledLeadQty || 0, Math.floor(t.cancelledLeadAmount || 0),
      t.totalLeads > 0 ? ((t.cancelledLeadQty / t.totalLeads) * 100).toFixed(1) + "%" : "0.0%",
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `lead_report_${dateGroup.date}_${selectedCompany}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenLeadDetailModal = (date: string, source: string, priority: string = "All") => {
    // 1. Use filteredLeads (same dataset the table counts from) so modal count always matches table count.
    //    filteredLeads already has company + date + all UI filters (search, urgency, assignTo) applied.
    //    We only additionally filter by the clicked date row and source key, plus the priority param.
    const normalizedSourceKey = normalizeVSrcKey(source)
    let filtered = filteredLeads.filter(l => {
      const leadDate = formatDateToDDMMYYYY(l.updatedAt)
      const leadSourceKey = normalizeVSrcKey(l.vSrc)
      const dateMatch = leadDate === date
      const sourceMatch = leadSourceKey === normalizedSourceKey

      if (priority === "All") return dateMatch && sourceMatch
      return dateMatch && sourceMatch && (l.intent || "").toLowerCase().trim() === priority.toLowerCase().trim()
    })

    // 3. Map to LeadRow type expected by LeadDetailModal
    const mappedLeads = filtered.map((l, index) => ({
      srNo: index + 1,
      dateTime: l.updatedAt || l.createdAt || "",
      id: l.id || "",
      name: l.name || "",
      mobile: l.phone || "",
      email: l.email || "",
      subject: l.subject || "",
      notes: l.notes || (Array.isArray(l.remarks) ? l.remarks.join(", ") : ""),
      ivrUrl: l.ivrUrl || "",
      websiteName: l.websiteName || "",
      dataSource: l.vSrc || "Others",
      assignTo: l.assignedTo || "",
      intent: l.intent || "",
      nbdCrr: l["NBD/CRR"] || "",
      transcription: l.transcription || "",
      leadCompany: l.company || "",
      priority: l.priority || "",
      urgency: l.urgency || "",
      summary: l.conversationSummary || "",
      leadOutcome: l.leadOutcome || "",
      leadCategory: l.leadCategory || "",
      preferredContact: l.preferredContact || "",
      campaignName: l.campaignName,
      tat: l.tat != null ? Number(l.tat) : null,

    }))

    setLeadDetailModalMeta({
      type: `Date: ${date} | Source: ${source} | Priority: ${priority}`,
      leads: mappedLeads
    })
    setIsLeadDetailModalOpen(true)
  }
  const handleOpenVerifiedModal = (date: string, source: string) => {
    // Pull verified_conversion_row directly from dbConversionData
    let rawRows: any[] = []

    const companiesToCheck = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : [selectedCompany]

    companiesToCheck.forEach(company => {
      const dateData = dbConversionData?.[company]?.[date]
      if (dateData) {
        const matchedSource = Object.keys(dateData).find(k => normalizeVSrcKey(k) === normalizeVSrcKey(source))
        const sourceData = matchedSource ? dateData[matchedSource] : null
        if (sourceData) {
          const rows = sourceData.verified_conversion_row || []
          rawRows = [...rawRows, ...rows]
        }
      }
    })

    // Apply dashboard filters (Search, Agent) - Priority/Urgency usually not available for conversions
    let filteredRows = rawRows;
    if (assignToFilter && assignToFilter !== 'all') {
      filteredRows = filteredRows.filter(l => l.sales_person_name === assignToFilter)
    }
    if (searchInput && searchInput.trim() !== '') {
      const term = searchInput.toLowerCase().trim()
      filteredRows = filteredRows.filter(l =>
        String(l.booking_order_id || "").toLowerCase().includes(term) ||
        String(l.name_of_client || "").toLowerCase().includes(term) ||
        String(l.mobile || "").toLowerCase().includes(term) ||
        String(l.email || "").toLowerCase().includes(term)
      )
    }

    const mappedLeads = filteredRows.map((l, index) => ({
      srNo: index + 1,
      dateTime: l.date_and_time
        ? new Date(l.date_and_time).toLocaleString('en-GB')
        : "",
      weekNumber: String(l.week_number || ""),
      monthName: l.month_name || "",
      year: String(l.year || ""),
      bookingId: l.booking_order_id || "",
      clientName: l.name_of_client || "",
      mobile: l.mobile || "",
      email: l.email || "",
      amount: l.company === "KAPPL" ? (l.amount_after_return > 0 ? String(l.amount_after_return || l.conversion_amount || "") : String(l.conversion_amount || "")) : String(l.conversion_amount || ""),
      salesPerson: l.sales_person_name || "",
      bookingStatus: l.booking_status || "",
      type: l.NBD_CRR || "",
      company: l.company || "",
    }))

    setVerifiedModalMeta({
      type: `Date: ${date} | Source: ${source} | Verified Conversions`,
      leads: mappedLeads,
    })
    setIsVerifiedModalOpen(true)
  }
  const handleOpenUnverifiedModal = (date: string, source: string) => {
    let rawRows: any[] = []

    const companiesToCheck = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : [selectedCompany]

    companiesToCheck.forEach(company => {
      const dateData = dbConversionData?.[company]?.[date]
      if (dateData) {
        const matchedSource = Object.keys(dateData).find(k => normalizeVSrcKey(k) === normalizeVSrcKey(source))
        const sourceData = matchedSource ? dateData[matchedSource] : null
        if (sourceData) {
          const rows = sourceData.unverified_conversion_row || []
          rawRows = [...rawRows, ...rows]
        }
      }
    })

    // Apply dashboard filters (Search, Agent)
    let filteredRows = rawRows;
    if (assignToFilter && assignToFilter !== 'all') {
      filteredRows = filteredRows.filter(l => l.sales_person_name === assignToFilter)
    }
    if (searchInput && searchInput.trim() !== '') {
      const term = searchInput.toLowerCase().trim()
      filteredRows = filteredRows.filter(l =>
        String(l.booking_order_id || "").toLowerCase().includes(term) ||
        String(l.name_of_client || "").toLowerCase().includes(term) ||
        String(l.mobile || "").toLowerCase().includes(term) ||
        String(l.email || "").toLowerCase().includes(term)
      )
    }

    const mappedLeads = filteredRows.map((l, index) => ({
      srNo: index + 1,
      dateTime: l.date_and_time
        ? new Date(l.date_and_time).toLocaleString('en-GB')
        : "",
      weekNumber: String(l.week_number || ""),
      monthName: l.month_name || "",
      year: String(l.year || ""),
      bookingId: l.booking_order_id || "",
      clientName: l.name_of_client || "",
      mobile: l.mobile || "",
      email: l.email || "",
      amount: String(l.conversion_amount || ""),
      salesPerson: l.sales_person_name || "",
      bookingStatus: l.booking_status || "",
      type: l.NBD_CRR || "",
      company: l.company || "",
    }))

    setUnverifiedModalMeta({
      type: `Date: ${date} | Source: ${source} | Unverified Conversions`,
      leads: mappedLeads,
    })
    setIsUnverifiedModalOpen(true)
  }
  const handleOpenCollectionModal = (date: string) => {
    let rawRows: any[] = []

    const companiesToCheck = selectedCompany === 'ALL'
      ? Object.keys(dbPaymentData)
      : [selectedCompany]

    companiesToCheck.forEach(company => {
      const dateData = dbPaymentData?.[company]?.[date]
      if (!dateData) return
      const rows = dateData.rows || []
      rawRows = [...rawRows, ...rows]
    })

    const mappedLeads = rawRows.map((l, index) => ({
      srNo: index + 1,
      dateTime: l.payment_date || "",
      bookingId: l.booking_id || "",
      clientName: l.name || "",
      mobile: l.mobile_no || "",
      amount: String(l.received_amount || ""),
      invoice_amount: String(l.invoice_amount || ""),
      salesPerson: l.payment_collected_by || "",
      received_status: l.received_status || "",
      payment_mode: l.payment_mode || "",
      company: l.company || "",
    }))

    setCollectionModalMeta({
      type: `Date: ${date} | Collection`,
      leads: mappedLeads,
    })
    setIsCollectionModalOpen(true)
  }
  const [isWastedModalLoading, setIsWastedModalLoading] = React.useState(false)

  const handleOpenWastedModal = async (date: string, source: string, reason?: string, expectedCount?: number) => {
    const sourceLabel = normalizeVSrc(source).label
    const sourceKey = normalizeVSrcKey(source)
    const reasonLabel = reason && reason.trim() ? reason.trim() : ""

    setIsWastedModalOpen(true)
    setWastedModalMeta({
      type: `${date} · ${sourceLabel}${reasonLabel ? ` · ${reasonLabel}` : ""} · Wasted Leads`,
      leads: [],
      loading: true, // Add loading state
    })

    const key = `${date}__${sourceKey}`
    const sourceData = wastedByDateAndSource[key]

    let filteredRows = sourceData ? sourceData.leads : []

    // 🚀 ALWAYS fetch on demand to ensure data parity with fixed API
    if (true) {
      try {
        const [d, m, y] = date.split('-')
        const apiDate = `${y}-${m}-${d}`

        const params = new URLSearchParams()
        params.set('from', apiDate)
        params.set('to', apiDate)
        params.set('source', source) // 🚀 FIX: Pass the source to the API
        if (selectedCompany && selectedCompany !== 'ALL') params.set('company', selectedCompany)
        params.set('pageSize', '5000') // 🚀 Show up to 5000 leads in modal

        const res = await fetch(`/api/wasted-leads?${params.toString()}`)
        const json = await res.json()

        if (json.success && json.data) {
          // 🚀 FIX: The optimized API returns a flat list in json.data.all
          if (json.data.all) {
            filteredRows = json.data.all
          } else {
            // Fallback for legacy format if needed
            let fetchedLeads: any[] = []
            Object.values(json.data).forEach((compData: any) => {
              const dateData = compData[date]
              if (dateData) {
                Object.keys(dateData).forEach(s => {
                  if (normalizeVSrcKey(s) === sourceKey && dateData[s].leads) {
                    fetchedLeads = [...fetchedLeads, ...dateData[s].leads]
                  }
                })
              }
            })
            filteredRows = fetchedLeads
          }
        }
      } catch (err) {
        console.error('[handleOpenWastedModal] Fetch failed:', err)
      }
    }

    if (reasonLabel) {
      const term = reasonLabel.toLowerCase()
      filteredRows = filteredRows.filter(l =>
        String(l.disposition || "").toLowerCase().includes(term)
      )
    }

    // 3. Map to modal format (Using fields directly from the optimized API)
    const mappedLeads = filteredRows.map((l: any, index: number) => ({
      srNo: l.srNo || index + 1,
      dateTime: l.dateTime || "",
      leadId: l.leadId || "",
      clientName: l.clientName || "-",
      mobile: l.mobile || "-",
      email: l.email || "-",
      priority: l.priority || "",
      urgency: l.urgency || "",
      dataSource: l.dataSource || "",
      source: l.source || "",
      disposition: l.disposition || "Cold Reverified",
      leadOutcome: l.leadOutcome || "",
      leadCategory: l.leadCategory || "",
      summary: l.summary || "",
      agent: l.agent || "",
      company: l.company || "",
      reason: l.reason || l.disposition || "Cold Reverified",
      cancellationRemarks: l.cancellationRemarks || "",
      lostValue: Number(l.lostValue) || 0,
    }))

    setWastedModalMeta({
      type: `${date} · ${sourceLabel}${reasonLabel ? ` · ${reasonLabel}` : ""} · Wasted Leads`,
      leads: mappedLeads,
      loading: false,
    })
  }
  const handlePrint = (dateGroup: typeof dataSourceDateGroups[number]) => {

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const t = dateGroup.totals

    const filteredSources = dateGroup.sources.filter(source => {
      return !(
        (source.totalTraffic || 0) === 0 &&
        (source.totalLeads || 0) === 0 &&
        (source.highPriority || 0) === 0 &&
        (source.mediumPriority || 0) === 0 &&
        (source.lowPriority || 0) === 0 &&
        (source.convertedCount || 0) === 0 &&
        (source.conversionAmount || 0) === 0 &&
        (source.wastedQty || 0) === 0 &&
        (source.potentialLostValue || 0) === 0 &&
        (source.unverifiedConversionAmount || 0) === 0 &&
        (source.cancelledLeadQty || 0) === 0 &&
        (source.cancelledLeadAmount || 0) === 0
      )
    })

    const sourceRows = filteredSources
      .map(source => `
      <tr>
        <td class="left">${source.dataSource}</td>
        <td>${source.totalTraffic || 0}</td>
        <td>${source.totalLeads}</td>
        <td>${formatDelay(source.avgTat || 0)}</td>
        <td style="background:#f0fdf4;color:#166534">${source.highPriority}</td>
        <td style="background:#f0fdf4;color:#166534">${source.totalLeads > 0 ? ((source.highPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
        <td style="background:#f0fdf4;color:#166534">${formatDelay(source.highPriorityAvgTat || 0)}</td>
        <td style="background:#fefce8;color:#92400e">${source.mediumPriority}</td>
        <td style="background:#fefce8;color:#92400e">${source.totalLeads > 0 ? ((source.mediumPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
        <td style="background:#fefce8;color:#92400e">${formatDelay(source.mediumPriorityAvgTat || 0)}</td>
        <td style="background:#fef2f2;color:#991b1b">${source.lowPriority}</td>
        <td style="background:#fef2f2;color:#991b1b">${source.totalLeads > 0 ? ((source.lowPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
        <td style="background:#fef2f2;color:#991b1b">${formatDelay(source.lowPriorityAvgTat || 0)}</td>
        <td>${source.convertedCount}</td>
        <td>₹${Math.floor(source.conversionAmount).toLocaleString("en-IN")}</td>
        <td>${source.conversionPercentage}%</td>
        <td>₹${Math.floor(source.spendAmount).toLocaleString("en-IN")}</td>
        <td>${parseFloat(source.roas) === 0 ? "0x" : source.roas + "x"}</td>
        <td>${parseFloat(source.cac) === 0 ? "0x" : source.cac + "x"}</td>
        <td>${source.wastedQty || 0}</td>
        <td>${source.totalLeads > 0 ? ((source.wastedQty / source.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
        <td>₹${Math.floor(source.potentialLostValue || 0).toLocaleString("en-IN")}</td>
        <td style="background:#f3e8ff;color:#6b21a8">₹${Math.floor(source.unverifiedConversionAmount || 0).toLocaleString("en-IN")}</td>
        <td>${source.cancelledLeadQty || 0}</td>
        <td>₹${Math.floor(source.cancelledLeadAmount || 0).toLocaleString("en-IN")}</td>
        <td>${source.totalLeads > 0 ? ((source.cancelledLeadQty / source.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
    `)
      .join("")

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lead Report — ${dateGroup.date}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1e293b; }

          .report-title {
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
            text-align: center;
            margin-bottom: 4px;
          }
          .report-meta {
            font-size: 12px;
            color: #475569;
            margin-bottom: 16px;
          }
          .report-meta span { font-weight: 600; color: #1e40af; }

          table { width: 100%; border-collapse: collapse; }
          th {
            background: #1e3a5f; color: white; padding: 7px 5px;
            text-align: center; font-size: 10px; white-space: nowrap;
          }
          th.green  { background: #166534; }
          th.amber  { background: #92400e; }
          th.red    { background: #991b1b; }
          th.purple { background: #7c3aed; }
          td {
            padding: 6px 5px; border: 1px solid #e2e8f0;
            text-align: center; white-space: nowrap; font-size: 10px;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .left { text-align: left !important; }
          .total-row td { background: #1e293b !important; color: white !important; font-weight: bold; }
          @media print { body { padding: 8px; } }
        </style>
      </head>
      <body>

        <div class="report-title">Lead Report &nbsp;—&nbsp; ${dateGroup.date}</div>
        <!--
<div class="report-meta">
  Company: <span>${selectedCompany}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  
  Sources: <span>${filteredSources.length}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  
  Total Leads: <span>${t.totalLeads}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  
  Converted: <span>${t.convertedCount}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  
  Collection:
  <span>₹${Math.floor(t.collectionAmount || 0).toLocaleString("en-IN")}</span>
</div>
-->

        <div class="report-meta">
  Company: <span>${selectedCompany}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Sources: <span>${filteredSources.length}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Total Leads: <span>${t.totalLeads}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Converted: <span>${t.convertedCount}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Conversion Amount:
  <span>₹${Math.floor(t.conversionAmount || 0).toLocaleString("en-IN")}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Collection Amt:
  <span>₹${Math.floor(t.collectionAmount || 0).toLocaleString("en-IN")}</span>
  &nbsp;&nbsp;|&nbsp;&nbsp;

  Unverified Amt:
<span>₹${Math.floor(t.unverifiedConversionAmount || 0).toLocaleString("en-IN")}</span>
&nbsp;&nbsp;|&nbsp;&nbsp;

Cancelled Qty:
<span>${t.cancelledLeadQty || 0}</span>
&nbsp;&nbsp;|&nbsp;&nbsp;

Cancelled Amt:
<span>₹${Math.floor(t.cancelledLeadAmount || 0).toLocaleString("en-IN")}</span>
</div>

        <table>
          <thead>
            <tr>
              <th class="left">Data Source</th>
              <th>Traffic</th>
              <th colspan="2">Total Leads</th>
              <!-- <th>Avg TAT</th> -->
              <th class="green" colspan="3">High Quality</th>
              <th class="amber" colspan="3">Medium Quality</th>
              <th class="red"   colspan="3">Low Quality</th>
              <th>Conv. Qty</th>
              <th>Conv. Amt</th>
              <th>Conv. %</th>
              <th>Spend</th>
              <th>ROAS</th>
              <th>CAC</th>
              <th>Wasted</th>
              <th>Wasted %</th>
              <th>Lost Value</th>
              <th class="purple">Unverified Amt</th>
              <th>Cancelled Qty</th>
              <th>Cancelled Amt</th>
              <th>Cancelled %</th>
            </tr>
          </thead>
          <tbody>${sourceRows}</tbody>
          <tfoot>
            <tr class="total-row">
              <td class="left">TOTAL</td>
              <td>${t.totalTraffic || 0}</td>
              <td>${t.totalLeads}</td>
              <td>${formatDelay(t.tatCount > 0 ? Math.round(t.tatSum / t.tatCount) : 0)}</td>
              <td>${t.highPriority}</td>
              <td>${t.totalLeads > 0 ? ((t.highPriority / t.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
              <td>${formatDelay(t.highPriorityTatCount > 0 ? Math.round(t.highPriorityTatSum / t.highPriorityTatCount) : 0)}</td>
              <td>${t.mediumPriority}</td>
              <td>${t.totalLeads > 0 ? ((t.mediumPriority / t.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
              <td>${formatDelay(t.mediumPriorityTatCount > 0 ? Math.round(t.mediumPriorityTatSum / t.mediumPriorityTatCount) : 0)}</td>
              <td>${t.lowPriority}</td>
              <td>${t.totalLeads > 0 ? ((t.lowPriority / t.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
              <td>${formatDelay(t.lowPriorityTatCount > 0 ? Math.round(t.lowPriorityTatSum / t.lowPriorityTatCount) : 0)}</td>
              <td>${t.convertedCount}</td>
              <td>₹${Math.floor(t.conversionAmount).toLocaleString("en-IN")}</td>
              <td>${t.conversionPercentage}%</td>
              <td>₹${Math.floor(t.spendAmount).toLocaleString("en-IN")}</td>
              <td>${parseFloat(t.roas) === 0 ? "0x" : t.roas + "x"}</td>
              <td>${parseFloat(t.cac) === 0 ? "0" : t.cac + ""}</td>
              <td>${t.wastedQty || 0}</td>
              <td>${t.totalLeads > 0 ? ((t.wastedQty / t.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
              <td>₹${Math.floor(t.potentialLostValue || 0).toLocaleString("en-IN")}</td>
              <td>₹${Math.floor(t.unverifiedConversionAmount || 0).toLocaleString("en-IN")}</td>
              <td>${t.cancelledLeadQty || 0}</td>
              <td>₹${Math.floor(t.cancelledLeadAmount || 0).toLocaleString("en-IN")}</td>
              <td>${t.totalLeads > 0 ? ((t.cancelledLeadQty / t.totalLeads) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
          </tfoot>
        </table>
        <script>window.onload = () => { window.print() }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const renderDataSourceSortIcon = (field: string) => {
    if (dataSourceSortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return dataSourceSortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + leads.length
  // Calculate statistics (memoized for performance)
  const {
    totalNBDCount,
    totalCRRCount,
    totalSentSQVNBDCount,
    totalSentSQVCRRCount,
    totalSentDialerNBDCount,
    totalSentDialerCRRCount,
    totalSentAppsheetNBDCount,
    totalSentAppsheetCRRCount,
    totalSentDeleteNBDCount,
    totalSentDeleteCRRCount,
    totalFilteredLeads,
    srcData,
    avgTotalTat,
    avgDialerTat,
    avgSqvTat,
    avgAppsheetTat,
    avgDeleteTat,
    avgTotalNbdTat,
    avgTotalCrrTat,
    avgDialerNbdTat,
    avgDialerCrrTat,
    avgSqvNbdTat,
    avgSqvCrrTat,
    avgAppsheetNbdTat,
    avgAppsheetCrrTat,
    avgDeleteNbdTat,
    avgDeleteCrrTat
  } = useMemo(() => {
    let _totalNBDCount = 0
    let _totalCRRCount = 0
    let _totalSentSQVNBDCount = 0
    let _totalSentSQVCRRCount = 0
    let _totalSentDialerNBDCount = 0
    let _totalSentDialerCRRCount = 0
    let _totalSentAppsheetNBDCount = 0
    let _totalSentAppsheetCRRCount = 0
    let _totalSentDeleteNBDCount = 0
    let _totalSentDeleteCRRCount = 0
    let _sourceWiseMap = new Map<string, { dataSource: string; totalLeads: number; nbd: number; crr: number; highPriority: number; mediumPriority: number; lowPriority: number }>()
    let _totalFilteredLeads = 0

    let totalTatSum = 0
    let totalTatCount = 0
    let totalNbdTatSum = 0
    let totalNbdTatCount = 0
    let totalCrrTatSum = 0
    let totalCrrTatCount = 0

    let dialerTatSum = 0
    let dialerTatCount = 0
    let dialerNbdTatSum = 0
    let dialerNbdTatCount = 0
    let dialerCrrTatSum = 0
    let dialerCrrTatCount = 0

    let sqvTatSum = 0
    let sqvTatCount = 0
    let sqvNbdTatSum = 0
    let sqvNbdTatCount = 0
    let sqvCrrTatSum = 0
    let sqvCrrTatCount = 0

    let appsheetTatSum = 0
    let appsheetTatCount = 0
    let appsheetNbdTatSum = 0
    let appsheetNbdTatCount = 0
    let appsheetCrrTatSum = 0
    let appsheetCrrTatCount = 0

    let deleteTatSum = 0
    let deleteTatCount = 0
    let deleteNbdTatSum = 0
    let deleteNbdTatCount = 0
    let deleteCrrTatSum = 0
    let deleteCrrTatCount = 0

    filteredLeads.forEach((lead) => {
      const isCrr = lead["NBD/CRR"] === "CRR"
      if (isCrr) _totalCRRCount++
      else _totalNBDCount++

      const tat = lead.tat != null ? Number(lead.tat) : null
      if (tat !== null) {
        totalTatSum += tat
        totalTatCount++
        if (isCrr) {
          totalCrrTatSum += tat
          totalCrrTatCount++
        } else {
          totalNbdTatSum += tat
          totalNbdTatCount++
        }
      }

      if (lead.sentStatus) {
        if (lead.assignedTo && lead.assignedTo.includes("KServe")) {
          if (isCrr) _totalSentSQVCRRCount++
          else _totalSentSQVNBDCount++
          if (tat !== null) {
            sqvTatSum += tat
            sqvTatCount++
            if (isCrr) {
              sqvCrrTatSum += tat
              sqvCrrTatCount++
            } else {
              sqvNbdTatSum += tat
              sqvNbdTatCount++
            }
          }
        } else if (
          ['Main_Followup',
            'CommonRedirect',
            'buffer',
            'AHV',
            'KAPPL',
            'CRR',
            'ColdCalling',
            'VILLARAAG NBD SALES',
            'INTERNATIONAL KTAHV NBD B2C SALES',
            ' INTERNATIONAL KTAHV NBD B2B SALES',
            ' INTERNATIONAL KTAHV CRR B2C SALES',
            'INTERNATIONAL KTAHV CRR B2B SALES',
            'INTERNATIONAL KAPPL NBD B2C SALES',
            'INTERNATIONAL KAPPL NBD B2B SALES',
            'INTERNATIONAL KAPPL CRR B2C SALES',
            'INTERNATIONAL KAPPL CRR B2B SALES',
            'INTERNATIONAL VILLARAAG NBD B2C SALES',
            'INTERNATIONAL VILLARAAG NBD B2B SALES',
            'INTERNATIONAL VILLARAAG CRR B2C SALES',
            'INTERNATIONAL VILLARAAG CRR B2B SALES',
            'VILLARAAG CRR SALES',
            'LANGUAGE BARRIER CALLS',
            'KTAHV FEEDBACK',
            'KTAHV REFERRAL',
            'KTAHV GUEST TREATMENT RESULT FOLLOW UP',
            'DOCTOR CONSULTATION CALLS',
            'Pre-Dispatch Verify Calls',
            'Post-Dispatch Confirmation Calls',
            'Cold-Reverify',
            'KTAHV COLD CALLING',
            'KTAHV CRR SALES',
            'POB CRR SALES',
            'Drop_Leads'].indexOf(
              lead.assignedTo
            ) > -1
        ) {
          if (isCrr) _totalSentDialerCRRCount++
          else _totalSentDialerNBDCount++
          if (tat !== null) {
            dialerTatSum += tat
            dialerTatCount++
            if (isCrr) {
              dialerCrrTatSum += tat
              dialerCrrTatCount++
            } else {
              dialerNbdTatSum += tat
              dialerNbdTatCount++
            }
          }
        } else if (lead.assignedTo && lead.assignedTo.includes("Delete")) {
          if (isCrr) _totalSentDeleteCRRCount++
          else _totalSentDeleteNBDCount++
          if (tat !== null) {
            deleteTatSum += tat
            deleteTatCount++
            if (isCrr) {
              deleteCrrTatSum += tat
              deleteCrrTatCount++
            } else {
              deleteNbdTatSum += tat
              deleteNbdTatCount++
            }
          }
        } else {
          if ((lead.assignedTo && !lead.assignedTo.includes("Squard Voice"))) {
            if (isCrr) _totalSentAppsheetCRRCount++
            else _totalSentAppsheetNBDCount++
            if (tat !== null) {
              appsheetTatSum += tat
              appsheetTatCount++
              if (isCrr) {
                appsheetCrrTatSum += tat
                appsheetCrrTatCount++
              } else {
                appsheetNbdTatSum += tat
                appsheetNbdTatCount++
              }
            }
          }
        }
      }

      const srcKey = normalizeVSrcKey(lead.vSrc)
      const srcLabel = normalizeVSrc(srcKey).label
      if (_sourceWiseMap.has(srcKey)) {
        var entry = _sourceWiseMap.get(srcKey)
        entry!.totalLeads += 1
        if (isCrr) entry!.crr += 1
        else entry!.nbd += 1

        const itnt = (lead.intent || "").toLowerCase().trim();
        if (itnt === "high") entry!.highPriority += 1
        else if (itnt === "medium") entry!.mediumPriority += 1
        else if (itnt === "low") entry!.lowPriority += 1

        _sourceWiseMap.set(srcKey, entry!)
      } else {
        const newEntry = {
          dataSource: srcLabel,
          totalLeads: 1,
          nbd: isCrr ? 0 : 1,
          crr: isCrr ? 1 : 0,
          highPriority: (lead.intent || "").toLowerCase().trim() === "high" ? 1 : 0,
          mediumPriority: (lead.intent || "").toLowerCase().trim() === "medium" ? 1 : 0,
          lowPriority: (lead.intent || "").toLowerCase().trim() === "low" ? 1 : 0
        }
        _sourceWiseMap.set(srcKey, newEntry)
      }
      _totalFilteredLeads++;
    })

    var _srcData = Array.from(_sourceWiseMap, ([sourceKey, values]) => ({ sourceKey, ...values }))
    if (dataSourceSortField) {
      _srcData.sort((a, b) => {
        let aValue = a[dataSourceSortField as keyof typeof a]
        let bValue = b[dataSourceSortField as keyof typeof b]

        if (typeof aValue === "string") aValue = aValue.toLowerCase()
        if (typeof bValue === "string") bValue = bValue.toLowerCase()

        if (aValue < bValue) return dataSourceSortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return dataSourceSortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    const _avgTotalTat = totalTatCount > 0 ? Math.round(totalTatSum / totalTatCount) : 0
    const _avgDialerTat = dialerTatCount > 0 ? Math.round(dialerTatSum / dialerTatCount) : 0
    const _avgSqvTat = sqvTatCount > 0 ? Math.round(sqvTatSum / sqvTatCount) : 0
    const _avgAppsheetTat = appsheetTatCount > 0 ? Math.round(appsheetTatSum / appsheetTatCount) : 0
    const _avgDeleteTat = deleteTatCount > 0 ? Math.round(deleteTatSum / deleteTatCount) : 0

    const _avgTotalNbdTat = totalNbdTatCount > 0 ? Math.round(totalNbdTatSum / totalNbdTatCount) : 0
    const _avgTotalCrrTat = totalCrrTatCount > 0 ? Math.round(totalCrrTatSum / totalCrrTatCount) : 0

    const _avgDialerNbdTat = dialerNbdTatCount > 0 ? Math.round(dialerNbdTatSum / dialerNbdTatCount) : 0
    const _avgDialerCrrTat = dialerCrrTatCount > 0 ? Math.round(dialerCrrTatSum / dialerCrrTatCount) : 0

    const _avgSqvNbdTat = sqvNbdTatCount > 0 ? Math.round(sqvNbdTatSum / sqvNbdTatCount) : 0
    const _avgSqvCrrTat = sqvCrrTatCount > 0 ? Math.round(sqvCrrTatSum / sqvCrrTatCount) : 0

    const _avgAppsheetNbdTat = appsheetNbdTatCount > 0 ? Math.round(appsheetNbdTatSum / appsheetNbdTatCount) : 0
    const _avgAppsheetCrrTat = appsheetCrrTatCount > 0 ? Math.round(appsheetCrrTatSum / appsheetCrrTatCount) : 0

    const _avgDeleteNbdTat = deleteNbdTatCount > 0 ? Math.round(deleteNbdTatSum / deleteNbdTatCount) : 0
    const _avgDeleteCrrTat = deleteCrrTatCount > 0 ? Math.round(deleteCrrTatSum / deleteCrrTatCount) : 0

    return {
      totalNBDCount: _totalNBDCount,
      totalCRRCount: _totalCRRCount,
      totalSentSQVNBDCount: _totalSentSQVNBDCount,
      totalSentSQVCRRCount: _totalSentSQVCRRCount,
      totalSentDialerNBDCount: _totalSentDialerNBDCount,
      totalSentDialerCRRCount: _totalSentDialerCRRCount,
      totalSentAppsheetNBDCount: _totalSentAppsheetNBDCount,
      totalSentAppsheetCRRCount: _totalSentAppsheetCRRCount,
      totalSentDeleteNBDCount: _totalSentDeleteNBDCount,
      totalSentDeleteCRRCount: _totalSentDeleteCRRCount,
      totalFilteredLeads: _totalFilteredLeads,
      srcData: _srcData,
      avgTotalTat: _avgTotalTat,
      avgDialerTat: _avgDialerTat,
      avgSqvTat: _avgSqvTat,
      avgAppsheetTat: _avgAppsheetTat,
      avgDeleteTat: _avgDeleteTat,
      avgTotalNbdTat: _avgTotalNbdTat,
      avgTotalCrrTat: _avgTotalCrrTat,
      avgDialerNbdTat: _avgDialerNbdTat,
      avgDialerCrrTat: _avgDialerCrrTat,
      avgSqvNbdTat: _avgSqvNbdTat,
      avgSqvCrrTat: _avgSqvCrrTat,
      avgAppsheetNbdTat: _avgAppsheetNbdTat,
      avgAppsheetCrrTat: _avgAppsheetCrrTat,
      avgDeleteNbdTat: _avgDeleteNbdTat,
      avgDeleteCrrTat: _avgDeleteCrrTat
    }
  }, [filteredLeads, dataSourceSortField, dataSourceSortDirection])

  // Show loader only while initial data (yesterday's) is being fetched
  // if (!localLeadsLoaded) {
  //   return (
  //     <DashboardLayout>
  //       <div className="flex flex-col items-center justify-center min-h-screen">
  //         <div className="flex items-center justify-center bg-transparent p-0 m-0">
  //           <img
  //             src="/grouploader.gif"
  //             alt="Company Loader"
  //             style={{ width: "160px", height: "160px" }}
  //             className="object-contain bg-transparent p-0 m-0 border-0 shadow-none"
  //           />
  //         </div>
  //         <div className="mt-8 text-center">
  //           <h3 className="text-xl font-semibold text-slate-700 mb-2">
  //             Loading Lead Assignment Page...
  //           </h3>
  //         </div>
  //       </div>
  //     </DashboardLayout>
  //   )
  // }



  // const indexOfLastItem = currentPage * itemsPerPage
  // const indexOfFirstItem = indexOfLastItem - itemsPerPage

  // const handlePageChange = (pageNumber: number) => {
  //   setCurrentPage(pageNumber)
  // }



  // ── processConversionData: dbConversionData (new /api/conversion) se ──────
  // format: { COMPANY: { "DD-MM-YYYY": { source: { verified_conversion_count, verified_conversion_amount } } } }
  const processConversionFromDB = React.useCallback((applyDateFilter: boolean) => {
    const map = new Map<string, { convertedCount: number, conversionAmount: number }>()

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : Object.keys(dbConversionData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbConversionData[company]
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter — DD-MM-YYYY format
        if (applyDateFilter && (startDate || endDate)) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dateData = companyData[dateKey]
        if (!dateData) return

        Object.keys(dateData).forEach((source) => {
          const srcData = dateData[source]
          if (!srcData) return

          const count = Number(srcData.verified_conversion_count || 0)
          const amount = Number(srcData.verified_conversion_amount || 0)
          if (count === 0 && amount === 0) return

          const { key: sourceKey } = normalizeVSrc(source)
          if (map.has(sourceKey)) {
            const existing = map.get(sourceKey)!
            existing.convertedCount += count
            existing.conversionAmount += amount
          } else {
            map.set(sourceKey, { convertedCount: count, conversionAmount: amount })
          }
        })
      })
    })

    return map
  }, [dbConversionData, selectedCompany, startDate, endDate])

  const conversionMap = useMemo(() => processConversionFromDB(true), [processConversionFromDB])
  const conversionMapForMetrics = useMemo(() => processConversionFromDB(true), [processConversionFromDB])

  // Process spend data from hook
  // const processSpendData = () => {
  //   const spendMap = new Map<string, number>()
  //   // Get spend data for selected company
  //   if (!spendData?.CampaignExp) return spendMap

  //   // Iterate through all months
  //   Object.keys(spendData.CampaignExp).forEach((monthYear) => {
  //     const monthData = spendData.CampaignExp[monthYear]
  //     const companyData = monthData?.[selectedCompany]

  //     if (!companyData) return

  //     // Check if month falls within date range
  //     const monthDate = parseMonthYear(monthYear) // We'll create this helper
  //     if (startDate || endDate) {
  //       const isInRange = isDateInRange(monthDate, startDate, endDate)
  //       if (!isInRange) return
  //     }

  //     // Process Google campaigns
  //     if (companyData.Google && Array.isArray(companyData.Google)) {
  //       companyData.Google.forEach(([campaignName, amount]: [string, number]) => {
  //         const sourceKey = "Google" // or map campaign to specific source
  //         const currentSpend = spendMap.get(sourceKey) || 0
  //         spendMap.set(sourceKey, currentSpend + Number(amount) || 0)
  //       })
  //     }

  //     // Process Facebook campaigns
  //     if (companyData.Facebook && Array.isArray(companyData.Facebook)) {
  //       companyData.Facebook.forEach(([campaignName, amount]: [string, number]) => {
  //         const sourceKey = "Facebook" // or map campaign to specific source
  //         const currentSpend = spendMap.get(sourceKey) || 0
  //         spendMap.set(sourceKey, currentSpend + Number(amount) || 0)
  //       })
  //     }
  //   })

  //   return spendMap
  // }

  // Helper: Parse "Month-Year" string to Date
  const parseMonthYear = (monthYear: string): Date => {
    const [month, year] = monthYear.split('-')
    const monthIndex = new Date(`${month} 1, ${year}`).getMonth()
    return new Date(Number(year), monthIndex, 1)
  }

  // Helper: Check if date is in range
  const isDateInRange = (date: Date, startDate: string, endDate: string): boolean => {
    const checkDate = date.getTime()

    if (startDate && !endDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0)
      return checkDate >= start
    }

    if (endDate && !startDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999)
      return checkDate <= end
    }

    if (startDate && endDate) {
      const start = new Date(startDate).setHours(0, 0, 0, 0)
      const end = new Date(endDate).setHours(23, 59, 59, 999)
      return checkDate >= start && checkDate <= end
    }

    return true
  }

  // ✅ CHANGE 2: Spend data ab /api/expense (DB) se aa raha hai
  // dbExpenseData format: { COMPANY: { "DD-MM-YYYY": { source: amount } } }
  //
  // 🔧 FIX: DB mein expense source = "Google", "Facebook" etc. — exact same as vSrc!
  // Koi mapping nahi chahiye, direct use karo
  const spendByDateAndSource = useMemo(() => {
    const map: Record<string, number> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbExpenseData)
      : Object.keys(dbExpenseData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbExpenseData[company] as Record<string, Record<string, number>> | undefined
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // dateKey already "DD-MM-YYYY"
        const dayData = companyData[dateKey]
        if (!dayData) return
        // Apply same date filter as spendMap — keeps Data Source Breakdown
        // grand total and Performance Metrics spend on the same date window
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }
        Object.keys(dayData).forEach((source) => {
          const amount = Number(dayData[source]) || 0
          if (amount === 0) return

          const sourceKey = normalizeVSrcKey(source)

          // ── 18% GST on Google and Facebook ──
          const GST_SOURCES = ['GOOGLE', 'FACEBOOK']
          const finalAmount = GST_SOURCES.includes(sourceKey)
            ? amount * 1.18
            : amount

          const key = `${dateKey}__${sourceKey}`
          map[key] = (map[key] || 0) + finalAmount
        })
      })
    })

    return map
  }, [dbExpenseData, selectedCompany, startDate, endDate])

  // Derive spendMap (source → total spend) from spendByDateAndSource, filtered by date range
  const spendMap = useMemo(() => {
    const map = new Map<string, number>();
    Object.keys(spendByDateAndSource).forEach((key) => {
      const [date, source] = key.split("__");
      const [dd, mm, yyyy] = date.split("-");
      const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0);
      if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return;
      if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return;
      map.set(source, (map.get(source) || 0) + spendByDateAndSource[key]);
    });
    return map;
  }, [spendByDateAndSource, startDate, endDate]);


  // Helper: Map data source to platform
  // const mapSourceToPlatform = (source: string): string => {
  //   // Add your mapping logic based on your data sources
  //   const googleSources = ["Google", "Website", "PriyaSharma AI Chat", "Others"]
  //   const facebookSources = ["Facebook", "Instagram", "Meta"]

  //   if (googleSources.includes(source)) return "Google"
  //   if (facebookSources.includes(source)) return "Facebook"

  //   return "Others" // Default
  // }
  // const sourceKey = mapSourceToPlatform(item.dataSource)

  // Data for charts
  // const chartData = srcData.map((item) => ({
  //   ...item,
  //   growth: (Math.random() * 30 - 10).toFixed(1),
  //   convertedCount: Math.floor(item.totalLeads * (0.15 + Math.random() * 0.25)),
  //   conversionAmount: Math.floor(item.totalLeads * (0.15 + Math.random() * 0.25)) * (50000 + Math.random() * 150000),
  //   conversionPercentage: item.totalLeads > 0 ? ((Math.floor(item.totalLeads * 0.25) / item.totalLeads) * 100).toFixed(2) : "0.00",
  //   spendAmount: item.totalLeads * (500 + Math.random() * 1500),
  //   roas: item.totalLeads > 0 ? ((Math.floor(item.totalLeads * 0.25) * 85000) / (item.totalLeads * 1000)).toFixed(2) : "0.00",
  // }))

  const chartData = useMemo(() => srcData.map((item) => {
    // Get conversion data for this source
    const conversionData = conversionMap.get(item.sourceKey) || {
      convertedCount: 0,
      conversionAmount: 0
    }

    const convertedCount = conversionData.convertedCount
    const conversionAmount = conversionData.conversionAmount

    // Get REAL spend data for this source
    const spendAmount = spendMap.get(item.sourceKey) || 0

    // Calculate conversion percentage
    const conversionPercentage = item.totalLeads > 0
      ? ((convertedCount / item.totalLeads) * 100).toFixed(2)
      : "0.00"

    // Calculate REAL ROAS with actual spend and revenue
    const roas = spendAmount > 0
      ? (conversionAmount / spendAmount).toFixed(2)
      : "0.00"

    // Calculate CAC (Customer Acquisition Cost)
    const cac = item.totalLeads > 0
      ? (spendAmount / item.totalLeads).toFixed(2)
      : "0.00"

    return {
      ...item,
      convertedCount,
      conversionAmount,
      conversionPercentage,
      spendAmount, // Now using REAL spend data!
      roas, // Now using REAL ROAS calculation!
      cac, // Customer Acquisition Cost
      growth: "0",
    }
  }), [srcData, conversionMap, spendMap])

  // === DATE-WISE GROUPING FOR DATA SOURCE BREAKDOWN ===

  // ✅ CHANGE 4: Verified Conversion — /api/conversion se
  // Key: "DD-MM-YYYY__source" → { convertedCount, conversionAmount }
  const conversionByDateAndSource = useMemo(() => {
    const map: Record<string, { convertedCount: number; conversionAmount: number }> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : Object.keys(dbConversionData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbConversionData[company]
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter apply karo
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dateData = companyData[dateKey]
        if (!dateData) return

        Object.keys(dateData).forEach((source) => {
          const sourceData = dateData[source]
          if (!sourceData) return
          const key = `${dateKey}__${normalizeVSrcKey(source)}`

          const count = Number(sourceData.verified_conversion_count || 0)
          const amount = Number(sourceData.verified_conversion_amount || 0)

          if (map[key]) {
            map[key].convertedCount += count
            map[key].conversionAmount += amount
          } else {
            map[key] = { convertedCount: count, conversionAmount: amount }
          }
        })
      })
    })

    return map
  }, [dbConversionData, selectedCompany, startDate, endDate])

  // ✅ CHANGE 5: Unverified Conversion — /api/conversion se
  // Key: "DD-MM-YYYY__source" → unverifiedAmount
  const unverifiedByDateAndSource = useMemo(() => {
    const map: Record<string, number> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : Object.keys(dbConversionData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbConversionData[company]
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dateData = companyData[dateKey]
        if (!dateData) return

        Object.keys(dateData).forEach((source) => {
          const sourceData = dateData[source]
          if (!sourceData) return
          const key = `${dateKey}__${normalizeVSrcKey(source)}`
          const unverifiedAmt = Number(sourceData.unverified_conversion_amount || 0)
          map[key] = (map[key] || 0) + unverifiedAmt
        })
      })
    })

    return map
  }, [dbConversionData, selectedCompany, startDate, endDate])

  // ✅ CHANGE 6: Cancelled — /api/conversion se
  // Key: "DD-MM-YYYY__source" → { cancelledCount, cancelledAmount }
  const cancelledByDateAndSource = useMemo(() => {
    const map: Record<string, { cancelledCount: number; cancelledAmount: number }> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbConversionData)
      : Object.keys(dbConversionData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbConversionData[company]
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dateData = companyData[dateKey]
        if (!dateData) return

        Object.keys(dateData).forEach((source) => {
          const sourceData = dateData[source]
          if (!sourceData) return
          const key = `${dateKey}__${normalizeVSrcKey(source)}`
          const cCount = Number(sourceData.canceled_booking_order_qty || 0)
          const cAmount = Number(sourceData.cancelled_order_amount || 0)
          if (cCount === 0 && cAmount === 0) return
          if (map[key]) {
            map[key].cancelledCount += cCount
            map[key].cancelledAmount += cAmount
          } else {
            map[key] = { cancelledCount: cCount, cancelledAmount: cAmount }
          }
        })
      })
    })

    return map
  }, [dbConversionData, selectedCompany, startDate, endDate])

  // ✅ CHANGE 7: Wasted Leads — /api/wasted-leads se
  // Key: "DD-MM-YYYY__source" → { wastedQty, wastedPercentage, reasons: { reason: count } }
  const wastedByDateAndSource = useMemo(() => {
    const map: Record<string, { wastedQty: number; potentialLostValue: number; reasons: Record<string, number>; leads: any[] }> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbWastedData)
      : Object.keys(dbWastedData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbWastedData[company]
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dateData = companyData[dateKey]
        if (!dateData) return

        Object.keys(dateData).forEach((source) => {
          const sourceData = dateData[source]
          if (!sourceData) return
          const key = `${dateKey}__${normalizeVSrcKey(source)}`

          // Apply active dashboard filters to the detailed leads array
          let filteredLeadsList = sourceData.leads || []

          if (priorityFilter && priorityFilter !== 'all') {
            filteredLeadsList = filteredLeadsList.filter((l: any) => String(l.priority || "").toLowerCase() === priorityFilter.toLowerCase())
          }
          if (urgencyFilter && urgencyFilter !== 'all') {
            filteredLeadsList = filteredLeadsList.filter((l: any) => {
              const isUrgent = String(l.priority || "").toLowerCase() === 'high' || String(l.urgency || "").toLowerCase() === 'yes'
              return urgencyFilter === 'yes' ? isUrgent : !isUrgent
            })
          }
          if (assignToFilter && assignToFilter !== 'all') {
            if (assignToFilter === "unassigned") {
              filteredLeadsList = filteredLeadsList.filter((l: any) => !l.assign_to_mr_main || l.assign_to_mr_main === "")
            } else {
              filteredLeadsList = filteredLeadsList.filter((l: any) => l.assign_to_mr_main === assignToFilter)
            }
          }
          if (searchInput && searchInput.trim() !== '') {
            const term = searchInput.toLowerCase().trim()
            filteredLeadsList = filteredLeadsList.filter((l: any) =>
              String(l.id || "").toLowerCase().includes(term) ||
              String(l.name_of_client || l.name || "").toLowerCase().includes(term) ||
              String(l.mobile || l.phone || "").toLowerCase().includes(term) ||
              String(l.email || "").toLowerCase().includes(term) ||
              String(l.subject || "").toLowerCase().includes(term)
            )
          }

          const wQty = filteredLeadsList.length
          const reasons: Record<string, number> = {}
          filteredLeadsList.forEach((l: any) => {
            const r = String(l.disposition || "unknown").toLowerCase()
            reasons[r] = (reasons[r] || 0) + 1
          })

          if (map[key]) {
            map[key].wastedQty += wQty
            map[key].potentialLostValue += filteredLeadsList.reduce((s: number, l: any) => s + (l.lostValue || 0), 0)
            map[key].leads = [...map[key].leads, ...filteredLeadsList]
            Object.keys(reasons).forEach(r => {
              map[key].reasons[r] = (map[key].reasons[r] || 0) + (reasons[r] || 0)
            })
          } else {
            const pLV = filteredLeadsList.reduce((s: number, l: any) => s + (l.lostValue || 0), 0)
            map[key] = { wastedQty: wQty, potentialLostValue: pLV, reasons: { ...reasons }, leads: [...filteredLeadsList] }

          }
        })
      })
    })

    return map
  }, [dbWastedData, selectedCompany, startDate, endDate, priorityFilter, urgencyFilter, assignToFilter, searchInput])

  // ── Collection by Date ──────────────────────────────────────────────────
  // The API returns [convDate, status, source, amount, collectionAmount].
  // collectionAmount (index 4) is a DAILY company-level total — the same value
  // ✅ CHANGE 3: Collection data ab /api/leads/payment (DB) se aa raha hai
  // dbPaymentData format: { COMPANY: { "DD-MM-YYYY": totalAmount } }
  const collectionByDate = useMemo(() => {
    const map: Record<string, number> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbPaymentData)
      : Object.keys(dbPaymentData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbPaymentData[company] as Record<string, { total_amount: number; rows: any[] }> | undefined
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter — DD-MM-YYYY format
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const amount = Number(companyData[dateKey]?.total_amount) || 0
        if (amount === 0) return
        map[dateKey] = (map[dateKey] || 0) + amount
      })
    })

    return map
  }, [dbPaymentData, selectedCompany, startDate, endDate])



  // ✅ CHANGE 1: Traffic data ab /api/total-traffic (DB) se aa raha hai
  // dbTrafficData format: { COMPANY: { "DD-MM-YYYY": { medium: count } } }
  //
  // 🔧 FIX: DB mein medium = "google"/"facebook" etc. (lowercase)
  //         Leads mein source = "Google"/"Facebook"/"PriyaSharma AI-Web" etc.
  //         Isliye hum DO maps banate hain:
  //         1. trafficByDate       → DD-MM-YYYY → total traffic (date-level, column header row ke liye)
  //         2. trafficByDateAndSource → DD-MM-YYYY__SOURCE → traffic (source row ke liye, normalized)
  //
  // trafficByDate: date → total traffic (saari mediums ka sum) — date row ke liye
  // 🔧 FIX: DB mein medium = "Google", "Facebook", "Website", "Others" — exact same as vSrc!
  // Isliye koi mapping nahi chahiye, direct use karo
  const trafficByDate = useMemo(() => {
    const map: Record<string, number> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbTrafficData)
      : Object.keys(dbTrafficData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbTrafficData[company] as Record<string, Record<string, number>> | undefined
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter — DD-MM-YYYY format
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dayData = companyData[dateKey]
        if (!dayData) return
        Object.keys(dayData).forEach((medium) => {
          const count = Number(dayData[medium]) || 0
          map[dateKey] = (map[dateKey] || 0) + count
        })
      })
    })

    return map
  }, [dbTrafficData, selectedCompany])

  // trafficByDateAndSource: DD-MM-YYYY__source → traffic — source row ke liye
  // DB medium values already match karte hain lead vSrc values se (Google, Facebook etc.)
  const trafficByDateAndSource = useMemo(() => {
    const map: Record<string, number> = {}

    const companiesToProcess = selectedCompany === 'ALL'
      ? Object.keys(dbTrafficData)
      : Object.keys(dbTrafficData).filter(k => k.toLowerCase() === selectedCompany.toLowerCase())

    companiesToProcess.forEach((company) => {
      const companyData = dbTrafficData[company] as Record<string, Record<string, number>> | undefined
      if (!companyData) return

      Object.keys(companyData).forEach((dateKey) => {
        // Date filter — DD-MM-YYYY format
        if (startDate || endDate) {
          const [dd, mm, yyyy] = dateKey.split('-')
          const dateObj = new Date(`${yyyy}-${mm}-${dd}`).setHours(0, 0, 0, 0)
          if (startDate && dateObj < new Date(startDate).setHours(0, 0, 0, 0)) return
          if (endDate && dateObj > new Date(endDate).setHours(23, 59, 59, 999)) return
        }

        const dayData = companyData[dateKey]
        if (!dayData) return
        Object.keys(dayData).forEach((medium) => {
          const count = Number(dayData[medium]) || 0
          if (count === 0) return
          // medium directly use karo — DB values match karte hain vSrc se
          const key = `${dateKey}__${normalizeVSrcKey(medium)}`
          map[key] = (map[key] || 0) + count
        })
      })
    })

    return map
  }, [dbTrafficData, selectedCompany, startDate, endDate])

  // ─── DATE-WISE GROUPING FOR DATA SOURCE BREAKDOWN ───
  const groupDataSourceByDateAndSource = React.useCallback(() => {
    const grouped: Record<string, Record<string, any>> = {}


    const isMicroFiltered =
      (priorityFilter !== "all") ||
      (urgencyFilter !== "all") ||
      (assignToFilter !== "all") ||
      (searchInput !== "");

    // 2. Calculate Global Proration Factor (matching KPI cards)
    let macroTotalLeadsCount = 0;
    analyticsLeads.forEach(l => {
      const srcKey = normalizeVSrcKey(l.vSrc);
      if (sourceFilter !== "all" && srcKey !== sourceFilter) return;
      macroTotalLeadsCount++;
    });

    const globalProrationFactor = macroTotalLeadsCount > 0
      ? filteredLeads.length / macroTotalLeadsCount
      : 0;

    // 3. Pre-compute micro metrics from filteredLeads
    const microMetricMap = new Map<string, {
      convCount: number,
      convAmount: number,
      wastedQty: number,
      cancelledQty: number,
      cancelledAmount: number
    }>();

    filteredLeads.forEach(l => {
      const date = formatDateToDDMMYYYY(l.updatedAt);
      const srcKey = normalizeVSrcKey(l.vSrc);
      const key = `${date}__${srcKey}`;
      const existing = microMetricMap.get(key) || {
        convCount: 0,
        convAmount: 0,
        wastedQty: 0,
        cancelledQty: 0,
        cancelledAmount: 0
      };

      const isConverted = l.leadOutcome?.toLowerCase() === 'converted' ||
        l.status?.toLowerCase() === 'converted' ||
        (Number(l.convertedAmount) > 0);

      const isWasted = l.assignedTo?.includes("Delete");
      const isCancelled = l.status?.toLowerCase() === 'cancelled';

      microMetricMap.set(key, {
        convCount: existing.convCount + (isConverted ? 1 : 0),
        convAmount: existing.convAmount + (isConverted ? (Number(l.convertedAmount) || 0) : 0),
        wastedQty: existing.wastedQty + (isWasted ? 1 : 0),
        cancelledQty: existing.cancelledQty + (isCancelled ? 1 : 0),
        cancelledAmount: existing.cancelledAmount + (isCancelled ? (Number(l.convertedAmount) || 0) : 0),
      });
    });

    // 3. (Deleted redundant macro count map, replaced by global factor logic)

    // 3. Helper to create a new source entry
    const createSourceEntry = (date: string, sourceKey: string) => {
      const { label } = normalizeVSrc(sourceKey)
      const dateSourceKey = `${date}__${sourceKey}`

      let convData = { convertedCount: 0, conversionAmount: 0 };
      let spendAmount = 0;
      let trafficCount = trafficByDateAndSource[dateSourceKey] || 0;
      let wastedQty = 0;
      let cancelledCount = 0;
      let cancelledAmount = 0;

      if (isMicroFiltered) {
        const metrics = microMetricMap.get(dateSourceKey) || {
          convCount: 0, convAmount: 0, wastedQty: 0, cancelledQty: 0, cancelledAmount: 0
        };
        convData = { convertedCount: metrics.convCount, conversionAmount: metrics.convAmount };
        const wastedData = wastedByDateAndSource[dateSourceKey] || { wastedQty: 0 };
        wastedQty = wastedData.wastedQty;
        const cancelledData = cancelledByDateAndSource[dateSourceKey] || { cancelledCount: 0, cancelledAmount: 0 };
        cancelledCount = cancelledData.cancelledCount;
        cancelledAmount = cancelledData.cancelledAmount;

        // Use Global Proration Factor to match KPI card logic exactly
        spendAmount = (spendByDateAndSource[dateSourceKey] || 0) * globalProrationFactor;
        trafficCount = (trafficByDateAndSource[dateSourceKey] || 0) * globalProrationFactor;
      } else {
        convData = conversionByDateAndSource[dateSourceKey] || { convertedCount: 0, conversionAmount: 0 };
        spendAmount = spendByDateAndSource[dateSourceKey] || 0;
        const wastedData = wastedByDateAndSource[dateSourceKey] || { wastedQty: 0 };
        wastedQty = wastedData.wastedQty;
        const cancelledData = cancelledByDateAndSource[dateSourceKey] || { cancelledCount: 0, cancelledAmount: 0 };
        cancelledCount = cancelledData.cancelledCount;
        cancelledAmount = cancelledData.cancelledAmount;
      }

      const unverifiedAmount = unverifiedByDateAndSource[dateSourceKey] || 0
      const wastedDataRaw = wastedByDateAndSource[dateSourceKey] || { reasons: {} }

      // 🚀 NEW: Pull both Wasted Qty and Potential Lost Value from DB aggregation
      // This ensures they are always in sync and not limited by the 500-row details API
      let potentialLostValue = 0
      let dbAggregatedWastedQty = 0

      const isDashboardFiltered = (searchInput && searchInput.trim() !== '') || priorityFilter !== 'all' || urgencyFilter !== 'all' || assignToFilter !== 'all';

      // Only pull from DB aggregates if NO dashboard filters are active
      if (!isDashboardFiltered) {
        const companiesToSum = selectedCompany === 'ALL'
          ? Object.keys(dbPotentialValueData)
          : [selectedCompany]

        companiesToSum.forEach(comp => {
          // Normalize company name for lookup
          const compKey = Object.keys(dbPotentialValueData).find(
            k => k.toLowerCase() === comp.toLowerCase()
          )
          if (!compKey) return

          const companyData = dbPotentialValueData[compKey]?.[date]
          if (companyData) {
            const matchedSource = Object.keys(companyData).find(k => normalizeVSrcKey(k) === sourceKey)
            const val = matchedSource ? companyData[matchedSource] : null

            if (val) {
              dbAggregatedWastedQty += val[1] // index 1 is cold_lead_count
              potentialLostValue += val[2]   // index 2 is total_lost_value
            }
          }
        })
      }

      const finalWastedQty = isDashboardFiltered ? wastedQty : (dbAggregatedWastedQty > 0 ? dbAggregatedWastedQty : wastedQty)

      // If no DB data for value, fallback to estimation (only if quantity exists)
      if (potentialLostValue === 0 && finalWastedQty > 0) {
        const avgConvValue = convData.convertedCount > 0
          ? convData.conversionAmount / convData.convertedCount
          : 0
        potentialLostValue = finalWastedQty * avgConvValue
      }

      const lostReasons = Object.entries(wastedDataRaw.reasons || {})
        .map(([reason, count]) => {
          const capitalized = reason.charAt(0).toUpperCase() + reason.slice(1);
          return `${capitalized} (${count})`;
        })
        .join(', ')

      return {
        date,
        dataSource: label,
        sourceKey,
        totalLeads: 0,
        totalTraffic: trafficCount,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        nbd: 0,
        crr: 0,
        growth: "0",
        convertedCount: convData.convertedCount,
        conversionAmount: convData.conversionAmount,
        conversionPercentage: "0.00",
        spendAmount: spendAmount,
        roas: "0.00",
        cac: "0.00",
        wastedQty: finalWastedQty,
        potentialLostValue: potentialLostValue,
        lostReasons: lostReasons,
        unverifiedConversionAmount: unverifiedAmount,
        cancelledLeadQty: cancelledCount,
        cancelledLeadAmount: cancelledAmount,
        tatSum: 0,
        tatCount: 0,
        avgTat: 0,
        highPriorityTatSum: 0,
        highPriorityTatCount: 0,
        highPriorityAvgTat: 0,
        mediumPriorityTatSum: 0,
        mediumPriorityTatCount: 0,
        mediumPriorityAvgTat: 0,
        lowPriorityTatSum: 0,
        lowPriorityTatCount: 0,
        lowPriorityAvgTat: 0,
      }
    }

    // 4. Create entries and count leads (using filteredLeads)
    filteredLeads.forEach(lead => {
      const date = formatDateToDDMMYYYY(lead.updatedAt)
      const { key: sourceKey } = normalizeVSrc(lead?.vSrc)

      if (!grouped[date]) {
        grouped[date] = {}
      }

      if (!grouped[date][sourceKey]) {
        grouped[date][sourceKey] = createSourceEntry(date, sourceKey)
      }

      const entry = grouped[date][sourceKey]
      entry.totalLeads++

      const tat = lead.tat != null ? Number(lead.tat) : null
      const itnt = (lead.intent || "").toLowerCase().trim();
      if (itnt === "high") {
        entry.highPriority++
        if (tat !== null) {
          entry.highPriorityTatSum += tat
          entry.highPriorityTatCount++
        }
      } else if (itnt === "medium") {
        entry.mediumPriority++
        if (tat !== null) {
          entry.mediumPriorityTatSum += tat
          entry.mediumPriorityTatCount++
        }
      } else if (itnt === "low") {
        entry.lowPriority++
        if (tat !== null) {
          entry.lowPriorityTatSum += tat
          entry.lowPriorityTatCount++
        }
      }

      if (lead["NBD/CRR"] === "CRR") entry.crr++
      else entry.nbd++

      if (tat !== null) {
        entry.tatSum += tat
        entry.tatCount++
      }
    })

    // 5. Add entries for sources matching the filter even if they have 0 leads
    // This allows the breakdown sum to match the KPI totals (which include all marketing costs)
    const sourcesToLoop = [conversionByDateAndSource, spendByDateAndSource, trafficByDateAndSource];
    sourcesToLoop.forEach(mapObj => {
      Object.keys(mapObj).forEach(dateSourceKey => {
        const [date, source] = dateSourceKey.split('__')
        if (sourceFilter !== "all" && source !== sourceFilter) return;

        if (!grouped[date]) grouped[date] = {}
        if (!grouped[date][source]) {
          grouped[date][source] = createSourceEntry(date, source)
        }
      })
    })

    // 6. Calculate derived metrics
    Object.keys(grouped).forEach(date => {
      Object.keys(grouped[date]).forEach(source => {
        const entry = grouped[date][source]
        entry.conversionPercentage = entry.totalLeads > 0
          ? ((entry.convertedCount / entry.totalLeads) * 100).toFixed(2)
          : "0.00"
        entry.roas = entry.spendAmount > 0
          ? (entry.conversionAmount / entry.spendAmount).toFixed(2)
          : "0.00"

        // CAC = total spend / total leads
        entry.cac = entry.totalLeads > 0
          ? (entry.spendAmount / entry.totalLeads).toFixed(2)
          : "0.00"

        entry.avgTat = entry.tatCount > 0
          ? Math.round(entry.tatSum / entry.tatCount)
          : 0

        entry.highPriorityAvgTat = entry.highPriorityTatCount > 0
          ? Math.round(entry.highPriorityTatSum / entry.highPriorityTatCount)
          : 0

        entry.mediumPriorityAvgTat = entry.mediumPriorityTatCount > 0
          ? Math.round(entry.mediumPriorityTatSum / entry.mediumPriorityTatCount)
          : 0

        entry.lowPriorityAvgTat = entry.lowPriorityTatCount > 0
          ? Math.round(entry.lowPriorityTatSum / entry.lowPriorityTatCount)
          : 0

        // Potential lost value is already set in createSourceEntry or initialized to 0.
        // We only re-compute if it was 0 and we have wasted leads (fallback logic).
        if (entry.potentialLostValue === 0 && entry.wastedQty > 0) {
          const avgConv = entry.convertedCount > 0
            ? entry.conversionAmount / entry.convertedCount
            : 0
          entry.potentialLostValue = entry.wastedQty * avgConv
        }
      })
    })

    return grouped
  }, [
    filteredLeads,
    analyticsLeads,
    priorityFilter,
    urgencyFilter,
    assignToFilter,
    searchInput,
    trafficByDateAndSource,
    conversionByDateAndSource,
    spendByDateAndSource,
    unverifiedByDateAndSource,
    cancelledByDateAndSource,
    wastedByDateAndSource,
    dbPotentialValueData,
    selectedCompany,
  ])

  const groupedByDateAndSource = useMemo(() => groupDataSourceByDateAndSource(), [groupDataSourceByDateAndSource])

  // Create date groups with totals for rendering
  const dataSourceDateGroupsBase = useMemo(() => Object.entries(groupedByDateAndSource).map(([date, sources]) => {
    const sourceArray = Object.values(sources)
    const visibleSources = sourceArray.filter(s =>
      s.totalLeads > 0 ||
      s.convertedCount > 0 ||
      s.conversionAmount > 0 ||
      s.totalTraffic > 0 ||
      s.wastedQty > 0 ||
      s.cancelledLeadQty > 0 ||
      s.unverifiedConversionAmount > 0
    )
    const totals = visibleSources.reduce(
      (acc, source) => ({
        totalLeads: acc.totalLeads + source.totalLeads,
        totalTraffic: acc.totalTraffic + (source.totalTraffic || 0),
        highPriority: acc.highPriority + source.highPriority,
        mediumPriority: acc.mediumPriority + source.mediumPriority,
        lowPriority: acc.lowPriority + source.lowPriority,
        nbd: acc.nbd + source.nbd,
        crr: acc.crr + source.crr,
        convertedCount: acc.convertedCount + source.convertedCount,
        conversionAmount: acc.conversionAmount + source.conversionAmount,
        spendAmount: acc.spendAmount + source.spendAmount,
        wastedQty: acc.wastedQty + (source.wastedQty || 0),
        potentialLostValue: acc.potentialLostValue + (source.potentialLostValue || 0),
        lostReasons: [...acc.lostReasons, ...(source.lostReasons ? source.lostReasons.split(',').map((r: string) => r.trim()).filter(Boolean) : [])],
        unverifiedConversionAmount: acc.unverifiedConversionAmount + (source.unverifiedConversionAmount || 0),
        cancelledLeadQty: acc.cancelledLeadQty + (source.cancelledLeadQty || 0),
        cancelledLeadAmount: acc.cancelledLeadAmount + (source.cancelledLeadAmount || 0),
        tatSum: acc.tatSum + (source.tatSum || 0),
        tatCount: acc.tatCount + (source.tatCount || 0),
        highPriorityTatSum: acc.highPriorityTatSum + (source.highPriorityTatSum || 0),
        highPriorityTatCount: acc.highPriorityTatCount + (source.highPriorityTatCount || 0),
        mediumPriorityTatSum: acc.mediumPriorityTatSum + (source.mediumPriorityTatSum || 0),
        mediumPriorityTatCount: acc.mediumPriorityTatCount + (source.mediumPriorityTatCount || 0),
        lowPriorityTatSum: acc.lowPriorityTatSum + (source.lowPriorityTatSum || 0),
        lowPriorityTatCount: acc.lowPriorityTatCount + (source.lowPriorityTatCount || 0),
      }),
      {
        totalLeads: 0,
        totalTraffic: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        nbd: 0,
        crr: 0,
        convertedCount: 0,
        conversionAmount: 0,
        spendAmount: 0,
        wastedQty: 0,
        potentialLostValue: 0,
        lostReasons: [] as string[],
        unverifiedConversionAmount: 0,
        cancelledLeadQty: 0,
        cancelledLeadAmount: 0,
        tatSum: 0,
        tatCount: 0,
        highPriorityTatSum: 0,
        highPriorityTatCount: 0,
        mediumPriorityTatSum: 0,
        mediumPriorityTatCount: 0,
        lowPriorityTatSum: 0,
        lowPriorityTatCount: 0,
      }
    )

    // Collection is a DAILY company-level total from conversion API (conv[4]).
    // Lookup by table's date key (DD-MM-YYYY) from the pre-built collectionByDate map.
    const dateCollectionAmount = collectionByDate[date] || 0

    // 🔧 FIX: Date row ka totalTraffic — trafficByDate se lo (date ka full total)
    // Source-wise traffic sum unreliable hai kyunki medium→vSrc mapping partial ho sakte hai
    const dateTotalTraffic = trafficByDate[date] || totals.totalTraffic

    // Calculate derived metrics for the date subtotal
    const conversionPercentage = totals.totalLeads > 0
      ? ((totals.convertedCount / totals.totalLeads) * 100).toFixed(1)
      : "0.0"

    const roas = totals.spendAmount > 0
      ? (totals.conversionAmount / totals.spendAmount).toFixed(2)
      : "0.00"

    const cac = totals.totalLeads > 0
      ? (totals.spendAmount / totals.totalLeads).toFixed(2)
      : "0.00"

    const avgTat = totals.tatCount > 0 ? Math.round(totals.tatSum / totals.tatCount) : 0
    const highPriorityAvgTat = totals.highPriorityTatCount > 0 ? Math.round(totals.highPriorityTatSum / totals.highPriorityTatCount) : 0
    const mediumPriorityAvgTat = totals.mediumPriorityTatCount > 0 ? Math.round(totals.mediumPriorityTatSum / totals.mediumPriorityTatCount) : 0
    const lowPriorityAvgTat = totals.lowPriorityTatCount > 0 ? Math.round(totals.lowPriorityTatSum / totals.lowPriorityTatCount) : 0

    return {
      date,
      sources: visibleSources,
      totals: {
        ...totals,
        totalTraffic: dateTotalTraffic,  // ✅ Date row: DB ka real total traffic
        collectionAmount: dateCollectionAmount,
        conversionPercentage,
        roas,
        cac,
        avgTat,
        highPriorityAvgTat,
        mediumPriorityAvgTat,
        lowPriorityAvgTat,
        lostReasons: Array.from(new Set(totals.lostReasons)).filter(Boolean), // Unique reasons only
      },
    }
  }).filter(dateGroup =>
    dateGroup.totals.totalLeads > 0 ||
    dateGroup.totals.convertedCount > 0 ||
    dateGroup.totals.conversionAmount > 0 ||

    dateGroup.totals.totalTraffic > 0 ||
    dateGroup.totals.wastedQty > 0 ||
    dateGroup.totals.cancelledLeadQty > 0 ||
    dateGroup.totals.unverifiedConversionAmount > 0
  ).sort((a, b) => {
    // Sort by date descending (most recent first)
    const dateA = new Date(a.date.split('-').reverse().join('-'))
    const dateB = new Date(b.date.split('-').reverse().join('-'))
    return dateB.getTime() - dateA.getTime()
  }), [groupedByDateAndSource, collectionByDate, trafficByDate])

  // Apply sorting based on dataSourceSortField and dataSourceSortDirection
  const dataSourceDateGroups = useMemo(() => {
    if (!dataSourceSortField) return dataSourceDateGroupsBase

    return [...dataSourceDateGroupsBase].sort((a, b) => {
      let valueA: any
      let valueB: any

      // Get the values to compare based on the sort field
      if (dataSourceSortField === "dataSource") {
        // For dataSource, we can't really sort date groups by source name
        // So we'll just return unsorted
        return 0
      } else {
        // For other fields, compare the totals
        valueA = a.totals[dataSourceSortField as keyof typeof a.totals]
        valueB = b.totals[dataSourceSortField as keyof typeof b.totals]
      }

      // Handle numeric values
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return dataSourceSortDirection === "asc" ? valueA - valueB : valueB - valueA
      }

      // Handle string values
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB)
        return dataSourceSortDirection === "asc" ? comparison : -comparison
      }

      return 0
    })
  }, [dataSourceDateGroupsBase, dataSourceSortField, dataSourceSortDirection])

  // Grand totals derived from the fully-built date groups (filter-reactive)
  const grandTotals = useMemo(() => dataSourceDateGroups.reduce(
    (acc, dateGroup) => {
      const t = dateGroup.totals || {}

      acc.totalLeads += t.totalLeads || 0
      acc.totalTraffic += t.totalTraffic || 0
      acc.high += t.highPriority || 0
      acc.medium += t.mediumPriority || 0
      acc.low += t.lowPriority || 0
      acc.nbd += t.nbd || 0
      acc.crr += t.crr || 0
      acc.converted += t.convertedCount || 0
      acc.convAmount += t.conversionAmount || 0
      acc.spend += t.spendAmount || 0
      acc.collectionAmount += t.collectionAmount || 0
      acc.wastedQty += t.wastedQty || 0
      acc.potentialLostValue += t.potentialLostValue || 0
      acc.unverifiedConversionAmount += t.unverifiedConversionAmount || 0
      acc.cancelledLeadQty += t.cancelledLeadQty || 0
      acc.cancelledLeadAmount += t.cancelledLeadAmount || 0
      acc.tatSum += t.tatSum || 0
      acc.tatCount += t.tatCount || 0
      acc.highPriorityTatSum += t.highPriorityTatSum || 0
      acc.highPriorityTatCount += t.highPriorityTatCount || 0
      acc.mediumPriorityTatSum += t.mediumPriorityTatSum || 0
      acc.mediumPriorityTatCount += t.mediumPriorityTatCount || 0
      acc.lowPriorityTatSum += t.lowPriorityTatSum || 0
      acc.lowPriorityTatCount += t.lowPriorityTatCount || 0

      return acc
    },
    {
      totalLeads: 0,
      totalTraffic: 0,
      high: 0,
      medium: 0,
      low: 0,
      nbd: 0,
      crr: 0,
      converted: 0,
      convAmount: 0,
      spend: 0,
      collectionAmount: 0,
      wastedQty: 0,
      potentialLostValue: 0,
      unverifiedConversionAmount: 0,
      cancelledLeadQty: 0,
      cancelledLeadAmount: 0,
      tatSum: 0,
      tatCount: 0,
      highPriorityTatSum: 0,
      highPriorityTatCount: 0,
      mediumPriorityTatSum: 0,
      mediumPriorityTatCount: 0,
      lowPriorityTatSum: 0,
      lowPriorityTatCount: 0,
    }
  ), [dataSourceDateGroups])
  const grandConversionPercentage =
    grandTotals.totalLeads > 0
      ? ((grandTotals.converted / grandTotals.totalLeads) * 100).toFixed(1)
      : "0.0"

  const grandROAS =
    grandTotals.spend > 0
      ? (grandTotals.convAmount / grandTotals.spend).toFixed(2)
      : "0.00"

  const grandCAC =
    grandTotals.totalLeads > 0
      ? (grandTotals.spend / grandTotals.totalLeads).toFixed(2)
      : "0.00"
  // Calculate aggregate totals for cards
  const aggregateTotals = (() => {
    let totalConversionCount = 0
    let totalConversionAmount = 0
    let totalSpendAmount = 0
    let totalNBDConversions = 0
    let totalCRRConversions = 0
    let totalNBDAmount = 0
    let totalCRRAmount = 0
    //     let uniqueLeadsReceived = 0

    //     // Calculate unique leads based on filtered data
    // const uniqueLeadIds = new Set(filteredLeads.map(lead => lead.id))
    // uniqueLeadsReceived = uniqueLeadIds.size

    // Sum up from FILTERED conversion map for Performance Metrics
    // sourceFilter applied — keeps Performance Metrics in sync with active source filter
    conversionMapForMetrics.forEach((data, source) => {
      if (sourceFilter !== "all" && source !== sourceFilter) return
      totalConversionCount += data.convertedCount
      totalConversionAmount += data.conversionAmount
    })

    // Sum spend from spendMap — sourceFilter applied, no extra gate needed
    // spendMap is already date + company filtered
    spendMap.forEach((amount, source) => {
      if (sourceFilter !== "all" && source !== sourceFilter) return
      totalSpendAmount += amount
    })

    // To prevent percentage explosions (e.g. 948200%) when 'searchInput' drops 'filteredLeads' to 1,
    // we MUST use the macro base leads count that matches our macro conversion/spend metrics.
    // analyticsLeads contains all leads for the current date & company BEFORE text search.
    let macroTotalLeads = 0;
    let macroNbdLeadsCount = 0;
    let macroCrrLeadsCount = 0;

    analyticsLeads.forEach(l => {
      const srcKey = normalizeVSrcKey(l.vSrc);
      if (sourceFilter !== "all" && srcKey !== sourceFilter) return;

      macroTotalLeads++;
      if (l["NBD/CRR"] === "CRR") macroCrrLeadsCount++;
      else macroNbdLeadsCount++;
    });

    // Keep conversion count/amount API-backed unless a lead-level filter is active.
    const isMicroFiltered =
      (priorityFilter !== "all") ||
      (urgencyFilter !== "all") ||
      (assignToFilter !== "all") ||
      (searchInput !== "");

    // By default, use Macro totals from /api/conversion and /api/expense
    if (isMicroFiltered) {
      // ─── MICRO CALCULATION ───
      // The user searched for particular leads, or used priority/urgency filters.
      // We must show metrics strictly for the filtered leads.
      totalConversionCount = 0;
      totalConversionAmount = 0;
      totalNBDConversions = 0;
      totalCRRConversions = 0;
      totalNBDAmount = 0;
      totalCRRAmount = 0;

      filteredLeads.forEach(l => {
        const isConverted = l.leadOutcome?.toLowerCase() === 'converted' ||
          l.status?.toLowerCase() === 'converted' ||
          (Number(l.convertedAmount) > 0);

        if (isConverted) {
          totalConversionCount++;
          const amt = Number(l.convertedAmount) || 0;
          totalConversionAmount += amt;

          if (l["NBD/CRR"] === "CRR") {
            totalCRRConversions++;
            totalCRRAmount += amt;
          } else {
            totalNBDConversions++;
            totalNBDAmount += amt;
          }
        }
      });

      // Pro-rate spend for micro leads based on the average macro CAC
      totalSpendAmount = macroTotalLeads > 0
        ? Math.round((totalSpendAmount / macroTotalLeads) * filteredLeads.length)
        : 0;
    } else {
      // ─── MACRO CALCULATION ───
      const nbdRatio = macroTotalLeads > 0 ? macroNbdLeadsCount / macroTotalLeads : 0.9;
      const crrRatio = macroTotalLeads > 0 ? macroCrrLeadsCount / macroTotalLeads : 0.1;

      // Apply ratio to get NBD/CRR split from total verified conversions
      totalNBDConversions = Math.round(totalConversionCount * nbdRatio);
      totalCRRConversions = totalConversionCount - totalNBDConversions;
      totalNBDAmount = Math.round(totalConversionAmount * nbdRatio);
      totalCRRAmount = totalConversionAmount - totalNBDAmount;
    }

    // Determine the base denominator for percentages
    const baseTotalLeads = isMicroFiltered ? filteredLeads.length : macroTotalLeads;
    const baseNbdLeads = isMicroFiltered
      ? filteredLeads.filter(l => l["NBD/CRR"] !== "CRR").length
      : macroNbdLeadsCount;
    const baseCrrLeads = isMicroFiltered
      ? filteredLeads.filter(l => l["NBD/CRR"] === "CRR").length
      : macroCrrLeadsCount;

    // Calculate conversion percentage
    const conversionPercentage = baseTotalLeads > 0
      ? ((totalConversionCount / baseTotalLeads) * 100).toFixed(1)
      : "0.0"

    const nbdConversionPercentage = baseNbdLeads > 0
      ? ((totalNBDConversions / baseNbdLeads) * 100).toFixed(1)
      : "0.0"

    const crrConversionPercentage = baseCrrLeads > 0
      ? ((totalCRRConversions / baseCrrLeads) * 100).toFixed(1)
      : "0.0"

    // Calculate ROAS
    const roas = totalSpendAmount > 0
      ? (totalConversionAmount / totalSpendAmount).toFixed(2)
      : "0.00"

    const nbdROAS = totalSpendAmount > 0
      ? (totalNBDAmount / (totalSpendAmount * 0.6)).toFixed(2) // Assuming 60% spend on NBD
      : "0.00"

    const crrROAS = totalSpendAmount > 0
      ? (totalCRRAmount / (totalSpendAmount * 0.4)).toFixed(2) // Assuming 40% spend on CRR
      : "0.00"

    return {
      totalConversionCount,
      totalConversionAmount,
      totalSpendAmount,
      conversionPercentage,
      roas,
      // NBD breakdown
      totalNBDConversions,
      totalNBDAmount,
      nbdConversionPercentage,
      nbdROAS,
      // CRR breakdown
      totalCRRConversions,
      totalCRRAmount,
      crrConversionPercentage,
      crrROAS,
    }
  })()

  const performanceCardTotals = useMemo(() => {
    const totalConversionCount = grandTotals.converted || 0
    const totalConversionAmount = grandTotals.convAmount || 0
    const totalSpendAmount = grandTotals.spend || 0
    const totalLeads = grandTotals.totalLeads || 0
    const totalNbdLeads = grandTotals.nbd || 0
    const totalCrrLeads = grandTotals.crr || 0

    const nbdRatio = totalLeads > 0 ? (totalNbdLeads / totalLeads) : 0.9

    const totalNBDConversions = Math.round(totalConversionCount * nbdRatio)
    const totalCRRConversions = totalConversionCount - totalNBDConversions
    const totalNBDAmount = Math.round(totalConversionAmount * nbdRatio)
    const totalCRRAmount = totalConversionAmount - totalNBDAmount

    const nbdConversionPercentage = totalNbdLeads > 0
      ? ((totalNBDConversions / totalNbdLeads) * 100).toFixed(1)
      : "0.0"

    const crrConversionPercentage = totalCrrLeads > 0
      ? ((totalCRRConversions / totalCrrLeads) * 100).toFixed(1)
      : "0.0"

    const nbdROAS = totalSpendAmount > 0
      ? (totalNBDAmount / (totalSpendAmount * 0.6)).toFixed(2)
      : "0.00"

    const crrROAS = totalSpendAmount > 0
      ? (totalCRRAmount / (totalSpendAmount * 0.4)).toFixed(2)
      : "0.00"

    return {
      totalConversionCount,
      totalConversionAmount,
      totalSpendAmount,
      conversionPercentage: grandConversionPercentage,
      roas: grandROAS,
      totalNBDConversions,
      totalNBDAmount,
      nbdConversionPercentage,
      nbdROAS,
      totalCRRConversions,
      totalCRRAmount,
      crrConversionPercentage,
      crrROAS,
    }
  }, [grandTotals, grandConversionPercentage, grandROAS])

  // Show loader while leads are loading
  // if (!isLeadsLoaded) {
  //   return (
  //     <DashboardLayout>
  //       <Loader isLoading={true} />
  //     </DashboardLayout>
  //   )
  // }
  if (!user || !hasPermission("leads.assign")) {
    return null
  }

  if (!localLeadsLoaded) {
    return <Loader isLoading={true} contentOnly />
  }

  return (
    <DashboardLayout>
      <Loader isLoading={isFilterFetching} contentOnly />
      <div className="space-y-6">
        {/* Hero Header Section with Back Button */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)]">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="mb-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              ← Back
            </button>

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">

              {/* Left Section - Title */}
              <div className="space-y-3 w-full">
                <div className="flex items-start sm:items-center gap-4">

                  {/* Icon Container */}
                  <div className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                    <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white" />
                  </div>

                  {/* Title & Subtitle */}
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

              {/* Right Section - KPI Card */}
              <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                    Total Leads
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                    {totalLeads}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
        {/* Advanced Filters Card */}
        <div className="mt-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-md">

            {/* ================= HEADER (VILLA RAAG / KTAHV STYLE) ================= */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">

              {/* Left: Title */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                    Filters & Search
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine and locate leads efficiently
                  </p>
                </div>
              </div>

              {/* Right: Clear Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("")
                  setPriorityFilter("all")
                  setSourceFilter("all")
                  setUrgencyFilter("all")
                  setAssignToFilter("all")
                  setDateFilter("this_week")   // this_week pe reset → fresh fetch trigger hoga
                  setSelectedCompany("ALL")
                  setCustomDateRange({ start: "", end: "" })
                  setSortField("")
                  setSortDirection("asc")
                }}
                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
              >
                Clear Filters
              </Button>
            </div>

            {/* ================= CONTENT ================= */}
            <div className="px-4 sm:px-5 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">

                {/* 1. SEARCH */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Search Leads
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name, email, phone, Id, subject..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setCurrentPage(1)
                          setTimeout(() => {
                            resultRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            })
                          }, 100)
                        }
                      }}
                      className="h-10 w-full rounded-md border-gray-300"
                    />
                    {/* <Button
                      size="sm"
                      className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                      onClick={() => {
                        setAppliedSearch(searchInput)
                        setCurrentPage(1)
                        setTimeout(() => {
                          resultRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                        }, 100)
                      }}
                    >
                      Search
                    </Button> */}
                  </div>
                </div>

                {/* 2. DATE RANGE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date Range
                  </label>
                  <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
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

                {/* 3. COMPANY */}
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
                      <SelectItem value="KTAHV">KTAHV</SelectItem>
                      <SelectItem value="KAPPL">KAPPL</SelectItem>
                      <SelectItem value="VILLARAAG">VILLARAAG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. LEAD SOURCE */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Lead Source
                  </label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueLeadSources.map((source) => (
                        <SelectItem key={source.key} value={source.key}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. PRIORITY */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Intent
                  </label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Intent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. URGENCY */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Urgency
                  </label>
                  <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 7. ASSIGNED TO */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Assigned To
                  </label>
                  <Select value={assignToFilter} onValueChange={setAssignToFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {uniqueAssignedTo.map((assignee) => (
                        <SelectItem key={assignee} value={assignee}>
                          {assignee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CUSTOM DATE RANGE (UNCHANGED) */}
              {dateFilter === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) =>
                        setCustomDateRange({ ...customDateRange, start: e.target.value })
                      }
                      className="h-10 w-full rounded-md border-gray-300"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) =>
                        setCustomDateRange({ ...customDateRange, end: e.target.value })
                      }
                      className="h-10 w-full rounded-md border-gray-300"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>



        {/* KPI SECTION*/}

        <div className="relative">
          <div className="bg-white border-2 border-slate-200 rounded-xl shadow-xl">

            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-100 via-white to-blue-100 border-b border-slate-200 rounded-t-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 flex items-center justify-center shadow-md border border-blue-500/40">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight break-words">
                    Key Performance Indicators
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Overview of lead metrics & performance
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards Content */}
            <div className="p-5 space-y-5">

              {/* First Row - Lead Distribution */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-4 relative">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Lead Distribution
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">

                  {/* Total Unique Lead Received */}
                  <div className="bg-blue-50/70 border-2 border-blue-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight mb-2">
                      Total Unique Lead Received
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {grandTotals.totalLeads > 0 ? grandTotals.totalLeads : <span className="text-blue-400 animate-pulse">···</span>}
                      {!isAllDataLoaded && grandTotals.totalLeads > 0 && (
                        <span className="text-xs font-normal text-blue-500 ml-1">/ {totalLeads}</span>
                      )}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">NBD:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-semibold">
                            {grandTotals.totalLeads > 0 ? `${grandTotals.nbd} (${((grandTotals.nbd / grandTotals.totalLeads) * 100).toFixed(1)}%)` : '···'}
                          </span>
                          {avgTotalNbdTat > 0 && (() => {
                            const dc = delayColor(avgTotalNbdTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgTotalNbdTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-700 font-medium">CRR:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">
                            {grandTotals.totalLeads > 0 ? `${grandTotals.crr} (${((grandTotals.crr / grandTotals.totalLeads) * 100).toFixed(1)}%)` : '···'}
                          </span>
                          {avgTotalCrrTat > 0 && (() => {
                            const dc = delayColor(avgTotalCrrTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgTotalCrrTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {avgTotalTat > 0 && (() => {
                        const dc = delayColor(avgTotalTat)
                        return (
                          <div className="flex items-center justify-between pt-1 border-t border-blue-200 mt-1">
                            <span className="text-slate-600 font-medium">Avg TAT:</span>
                            <span className={`text-[9px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 ${dc.text}`}>
                              {formatDelay(avgTotalTat)}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Transfer to Dialer */}
                  <div className="bg-blue-50/70 border-2 border-slate-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 leading-tight mb-2">
                      Transfer to Dialer
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {totalSentDialerNBDCount + totalSentDialerCRRCount}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">NBD:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-semibold">
                            {totalSentDialerNBDCount} ({totalSentDialerNBDCount + totalSentDialerCRRCount > 0 ? ((totalSentDialerNBDCount / (totalSentDialerNBDCount + totalSentDialerCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgDialerNbdTat > 0 && (() => {
                            const dc = delayColor(avgDialerNbdTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgDialerNbdTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">CRR:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-semibold">
                            {totalSentDialerCRRCount} ({totalSentDialerNBDCount + totalSentDialerCRRCount > 0 ? ((totalSentDialerCRRCount / (totalSentDialerNBDCount + totalSentDialerCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgDialerCrrTat > 0 && (() => {
                            const dc = delayColor(avgDialerCrrTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgDialerCrrTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {avgDialerTat > 0 && (() => {
                        const dc = delayColor(avgDialerTat)
                        return (
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200 mt-1">
                            <span className="text-slate-600 font-medium">Avg TAT:</span>
                            <span className={`text-[9px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 ${dc.text}`}>
                              {formatDelay(avgDialerTat)}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Transfer to SQV */}
                  <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight mb-2">
                      Transfer to KSERVE
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {totalSentSQVNBDCount + totalSentSQVCRRCount}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">NBD:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-semibold">
                            {totalSentSQVNBDCount} ({totalSentSQVNBDCount + totalSentSQVCRRCount > 0 ? ((totalSentSQVNBDCount / (totalSentSQVNBDCount + totalSentSQVCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgSqvNbdTat > 0 && (() => {
                            const dc = delayColor(avgSqvNbdTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgSqvNbdTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-700 font-medium">CRR:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">
                            {totalSentSQVCRRCount} ({totalSentSQVNBDCount + totalSentSQVCRRCount > 0 ? ((totalSentSQVCRRCount / (totalSentSQVNBDCount + totalSentSQVCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgSqvCrrTat > 0 && (() => {
                            const dc = delayColor(avgSqvCrrTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgSqvCrrTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {avgSqvTat > 0 && (() => {
                        const dc = delayColor(avgSqvTat)
                        return (
                          <div className="flex items-center justify-between pt-1 border-t border-emerald-200 mt-1">
                            <span className="text-slate-600 font-medium">Avg TAT:</span>
                            <span className={`text-[9px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 ${dc.text}`}>
                              {formatDelay(avgSqvTat)}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Transfer to Appsheet */}
                  <div className="bg-cyan-50/70 border-2 border-cyan-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 leading-tight mb-2">
                      Transfer to Appsheet
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {totalSentAppsheetNBDCount + totalSentAppsheetCRRCount}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">NBD:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600 font-semibold">
                            {totalSentAppsheetNBDCount} ({totalSentAppsheetNBDCount + totalSentAppsheetCRRCount > 0 ? ((totalSentAppsheetNBDCount / (totalSentAppsheetNBDCount + totalSentAppsheetCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgAppsheetNbdTat > 0 && (() => {
                            const dc = delayColor(avgAppsheetNbdTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgAppsheetNbdTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-700 font-medium">CRR:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">
                            {totalSentAppsheetCRRCount} ({totalSentAppsheetNBDCount + totalSentAppsheetCRRCount > 0 ? ((totalSentAppsheetCRRCount / (totalSentAppsheetNBDCount + totalSentAppsheetCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgAppsheetCrrTat > 0 && (() => {
                            const dc = delayColor(avgAppsheetCrrTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgAppsheetCrrTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {avgAppsheetTat > 0 && (() => {
                        const dc = delayColor(avgAppsheetTat)
                        return (
                          <div className="flex items-center justify-between pt-1 border-t border-cyan-200 mt-1">
                            <span className="text-slate-600 font-medium">Avg TAT:</span>
                            <span className={`text-[9px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 ${dc.text}`}>
                              {formatDelay(avgAppsheetTat)}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Transfer to Delete Sheet */}
                  <div className="bg-red-50/70 border-2 border-red-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 leading-tight mb-2">
                      Transfer to Delete Sheet
                    </p>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {totalSentDeleteNBDCount + totalSentDeleteCRRCount}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-red-700 font-medium">NBD:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">
                            {totalSentDeleteNBDCount} ({totalSentDeleteNBDCount + totalSentDeleteCRRCount > 0 ? ((totalSentDeleteNBDCount / (totalSentDeleteNBDCount + totalSentDeleteCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgDeleteNbdTat > 0 && (() => {
                            const dc = delayColor(avgDeleteNbdTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgDeleteNbdTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-red-700 font-medium">CRR:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-red-600 font-semibold">
                            {totalSentDeleteCRRCount} ({totalSentDeleteNBDCount + totalSentDeleteCRRCount > 0 ? ((totalSentDeleteCRRCount / (totalSentDeleteNBDCount + totalSentDeleteCRRCount)) * 100).toFixed(2) : 0}%)
                          </span>
                          {avgDeleteCrrTat > 0 && (() => {
                            const dc = delayColor(avgDeleteCrrTat)
                            return (
                              <span className={`text-[8px] font-bold ${dc.bg} border ${dc.border} rounded px-1 ${dc.text}`}>
                                {formatDelay(avgDeleteCrrTat)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                      {avgDeleteTat > 0 && (() => {
                        const dc = delayColor(avgDeleteTat)
                        return (
                          <div className="flex items-center justify-between pt-1 border-t border-red-200 mt-1">
                            <span className="text-slate-600 font-medium">Avg TAT:</span>
                            <span className={`text-[9px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 ${dc.text}`}>
                              {formatDelay(avgDeleteTat)}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Unassign (Pending To Transfer) */}
                  <div className="bg-orange-50/70 border-2 border-orange-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 leading-tight">
                        Unassign (Pending To Transfer)
                      </p>
                      <Users className="h-4 w-4 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none">
                      {unassignedLeads.length}
                    </p>
                  </div>

                </div>
              </div>

              {/* Second Row - Performance Metrics */}
              <div className="bg-green-50/60 border border-green-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Performance Metrics
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-full">
                    Table-synced totals
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

                  {/* Conversion Count */}
                  <div className="bg-green-50/70 border-2 border-green-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-green-700 leading-tight">
                        Conversion Count
                      </p>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {performanceCardTotals.totalConversionCount}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-medium">NBD:</span>
                        <span className="text-blue-600 font-semibold">
                          {performanceCardTotals.totalNBDConversions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 font-medium">CRR:</span>
                        <span className="text-orange-600 font-semibold">
                          {performanceCardTotals.totalCRRConversions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conversion Amount */}
                  <div className="bg-purple-50/70 border-2 border-purple-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 leading-tight">
                        Conversion Amount
                      </p>
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      ₹{Math.floor(performanceCardTotals.totalConversionAmount).toLocaleString("en-IN")}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-medium">NBD:</span>
                        <span className="text-blue-600 font-semibold">
                          ₹{Math.floor(performanceCardTotals.totalNBDAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 font-medium">CRR:</span>
                        <span className="text-orange-600 font-semibold">
                          ₹{Math.floor(performanceCardTotals.totalCRRAmount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Conversion % */}
                  <div className="bg-teal-50/70 border-2 border-teal-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700 leading-tight">
                        Conversion %
                      </p>
                      <TrendingUp className="h-4 w-4 text-teal-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {performanceCardTotals.conversionPercentage}%
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-medium">NBD:</span>
                        <span className="text-blue-600 font-semibold">
                          {performanceCardTotals.nbdConversionPercentage}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 font-medium">CRR:</span>
                        <span className="text-orange-600 font-semibold">
                          {performanceCardTotals.crrConversionPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Spend Amount */}
                  <div className="bg-indigo-50/70 border-2 border-indigo-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 leading-tight">
                        Spend Amount
                      </p>
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      ₹{Math.floor(performanceCardTotals.totalSpendAmount).toLocaleString("en-IN")}
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">Total Marketing Spend</span>
                      </div>
                      <div className="text-slate-500">
                        Across all channels
                      </div>
                    </div>
                  </div>

                  {/* ROAS */}
                  <div className="bg-amber-50/70 border-2 border-amber-300 rounded-lg p-3 shadow-sm hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 leading-tight">
                        ROAS
                      </p>
                      <Target className="h-4 w-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 leading-none mb-2">
                      {performanceCardTotals.roas}x
                    </p>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-medium">NBD:</span>
                        <span className="text-blue-600 font-semibold">
                          {performanceCardTotals.nbdROAS}x
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-orange-700 font-medium">CRR:</span>
                        <span className="text-orange-600 font-semibold">
                          {performanceCardTotals.crrROAS}x
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Data Source Breakdown Table with Real Data */}
        {/* <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Source Breakdown - Total Unique Lead Received ({selectedCompany})</CardTitle>
                <CardDescription>Analyze lead performance across different data sources</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={dataSourceView === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDataSourceView("table")}
                  className={dataSourceView === "table" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={dataSourceView === "chart" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDataSourceView("chart")}
                  className={dataSourceView === "chart" ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Chart
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dataSourceView === "table" ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleDataSourceSort("dataSource")}>
                        <div className="flex items-center gap-2">
                          Data Source
                          {renderDataSourceSortIcon("dataSource")}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleDataSourceSort("totalLeads")}>
                        <div className="flex items-center gap-2">
                          Total Leads
                          {renderDataSourceSortIcon("totalLeads")}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleDataSourceSort("nbd")}>
                        <div className="flex items-center gap-2">
                          NBD
                          {renderDataSourceSortIcon("nbd")}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleDataSourceSort("crr")}>
                        <div className="flex items-center gap-2">
                          CRR
                          {renderDataSourceSortIcon("crr")}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleDataSourceSort("growth")}>
                        <div className="flex items-center gap-2">
                          Growth
                          {renderDataSourceSortIcon("growth")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {srcData.map((src) => (
                      <TableRow key={src.dataSource}>
                        <TableCell className="font-medium">{src.dataSource}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold">
                            {src.totalLeads}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-600 font-medium">
                            {src.nbd} ({((src.nbd / src.totalLeads) * 100).toFixed(2)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-orange-600 font-medium">
                            {src.crr} ({((src.crr / src.totalLeads) * 100).toFixed(2)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          {src.totalLeads > 0 ? (
                            src.nbd > src.crr ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <ArrowUp className="h-4 w-4" />
                                <span>{(((src.nbd - src.crr) / src.totalLeads) * 100).toFixed(2)}%</span>
                              </div>
                            ) : src.crr > src.nbd ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <ArrowDown className="h-4 w-4" />
                                <span>{(((src.crr - src.nbd) / src.totalLeads) * 100).toFixed(2)}%</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-600">
                                <span>0%</span>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center gap-1 text-gray-600">
                              <span>N/A</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="space-y-4">
                <Tabs defaultValue="leads" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50">
                    <TabsTrigger
                      value="leads"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all px-4 py-3"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        <span className="text-xs font-medium">Total Leads</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="breakdown"
                      className="data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all px-4 py-3"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs font-medium">NBD vs CRR</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="leads" className="h-[600px] mt-6">
                    <div className="border rounded-lg p-4 h-full bg-gradient-to-br from-blue-50 to-white">
                      <h3 className="text-sm font-semibold mb-3 text-blue-900">Lead Distribution by Source</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={srcData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="dataSource" angle={-45} textAnchor="end" height={120} fontSize={11} />
                          <YAxis stroke="#6b7280" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "10px" }} />
                          <Bar dataKey="totalLeads" fill="#3b82f6" name="Total Leads" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>

                  <TabsContent value="breakdown" className="h-[600px] mt-6">
                    <div className="border rounded-lg p-4 h-full bg-gradient-to-br from-green-50 to-white">
                      <h3 className="text-sm font-semibold mb-3 text-green-900">NBD vs CRR Distribution</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={srcData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="dataSource" angle={-45} textAnchor="end" height={120} fontSize={11} />
                          <YAxis stroke="#6b7280" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Bar dataKey="nbd" fill="#10b981" name="NBD" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="crr" fill="#f59e0b" name="CRR" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Data Source Breakdown Section - With Date-wise Grouping */}
        <div className="relative">
          <div className="border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden">

            {/* ---------- Header (matches Leads Table style) ---------- */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 
    px-4 sm:px-5 py-3 
    bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50
    border-b border-slate-200 
    rounded-t-xl 
    shadow-sm">

              {/* Left: Title with Icon */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                    Data Source Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Overview of lead priorities by data source – {selectedCompany === "ALL" ? "All Companies" : selectedCompany}
                  </p>
                </div>
              </div>

              {/* Right: Table / Chart toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDataSourceView("table")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
               ${dataSourceView === "table"
                      ? "bg-white text-blue-700 shadow border border-blue-200"
                      : "text-blue-700/80 hover:bg-white/50 hover:text-blue-800"
                    }`}
                >
                  <TableIcon className="w-3.5 h-3.5" /> Table
                </button>

                <button
                  onClick={() => setDataSourceView("chart")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
          ${dataSourceView === "chart"
                      ? "bg-white text-blue-700 shadow border border-blue-200"
                      : "text-blue-700/80 hover:bg-white/50 hover:text-blue-800"
                    }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Charts
                </button>
              </div>

            </div>



            {/* ---------- Table / Chart Content ---------- */}
            <div className="bg-white pt-4">
              {dataSourceView === "table" ? (
                <>
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full divide-y divide-slate-300">
                      <thead style={{ backgroundColor: '#1e3a5f' }}>
                        <tr>
                          {/* STICKY - Data Source Column */}
                          <th
                            className="sticky left-0 z-20 px-4 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10"
                            style={{ backgroundColor: '#1e3a5f' }}
                            onClick={() => handleDataSourceSort("dataSource")}
                          >
                            <div className="flex items-center gap-1">
                              Data Source {renderDataSourceSortIcon("dataSource")}
                            </div>
                          </th>


                          {/* STICKY - Total Traffic Column */}
                          <th
                            className="sticky left-[180px] z-20 px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            style={{ backgroundColor: '#1e3a5f' }}
                            onClick={() => handleDataSourceSort("totalTraffic")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Total Traffic {renderDataSourceSortIcon("totalTraffic")}
                            </div>
                          </th>

                          {/* STICKY - Total Leads Column */}
                          <th
                            colSpan={2}
                            className="sticky left-[300px] z-20 px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            style={{ backgroundColor: '#1e3a5f' }}
                            onClick={() => handleDataSourceSort("totalLeads")}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center justify-center gap-1">
                                Total Leads {renderDataSourceSortIcon("totalLeads")}
                              </div>
                              <div className="flex gap-3 text-[11px] font-semibold normal-case mt-0.5">
                                <span>Count</span>
                                <span className="text-white/40">|</span>
                                <span>TAT</span>
                              </div>
                            </div>
                          </th>

                          {/* Avg TAT Column - Commented out as requested
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("avgTat")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Avg TAT {renderDataSourceSortIcon("avgTat")}
                            </div>
                          </th>
                          */}

                          {/* HIGH QUALITY */}
                          <th
                            colSpan={3}
                            className="px-2 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider border-l border-white/20 cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("highPriority")}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                High Intent {renderDataSourceSortIcon("highPriority")}
                              </div>
                              <div className="flex gap-3 text-[11px] font-semibold normal-case mt-0.5">
                                <span>Count</span>
                                <span className="text-white/40">|</span>
                                <span>%</span>
                                <span className="text-white/40">|</span>
                                <span>TAT</span>
                              </div>
                            </div>
                          </th>

                          {/* MEDIUM QUALITY */}
                          <th
                            colSpan={3}
                            className="px-2 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider border-l border-white/20 cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("mediumPriority")}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                Medium Intent {renderDataSourceSortIcon("mediumPriority")}
                              </div>
                              <div className="flex gap-3 text-[11px] font-semibold normal-case mt-0.5">
                                <span>Count</span>
                                <span className="text-white/40">|</span>
                                <span>%</span>
                                <span className="text-white/40">|</span>
                                <span>TAT</span>
                              </div>
                            </div>
                          </th>

                          {/* LOW QUALITY */}
                          <th
                            colSpan={3}
                            className="px-2 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider border-l border-white/20 cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("lowPriority")}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1">
                                Low Intent {renderDataSourceSortIcon("lowPriority")}
                              </div>
                              <div className="flex gap-3 text-[11px] font-semibold normal-case mt-0.5">
                                <span>Count</span>
                                <span className="text-white/40">|</span>
                                <span>%</span>
                                <span className="text-white/40">|</span>
                                <span>TAT</span>
                              </div>
                            </div>
                          </th>

                          {/* 🔹 DIVIDER COLUMN */}
                          <th className="w-[2px] px-0 py-0 bg-white/30"></th>

                          {/* CONVERSION METRICS */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("convertedCount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Verified Converted Quantity {renderDataSourceSortIcon("convertedCount")}
                            </div>
                          </th>
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("conversionAmount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Verified Conv. Amount {renderDataSourceSortIcon("conversionAmount")}
                            </div>
                          </th>
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("conversionPercentage")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Verified Conv. % {renderDataSourceSortIcon("conversionPercentage")}
                            </div>
                          </th>

                          {/* SPEND & ROI METRICS */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("spendAmount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Spend Amt {renderDataSourceSortIcon("spendAmount")}
                            </div>
                          </th>
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("roas")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              ROAS % {renderDataSourceSortIcon("roas")}
                            </div>
                          </th>
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10"
                            onClick={() => handleDataSourceSort("cac")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              CAC {renderDataSourceSortIcon("cac")}
                            </div>
                          </th>

                          {/* BLUE COLUMN - COLLECTION AMOUNT */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-blue-600/90"
                            style={{ backgroundColor: '#2563eb' }}
                            onClick={() => handleDataSourceSort("collectionAmount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Collection Amt {renderDataSourceSortIcon("collectionAmount")}
                            </div>
                          </th>

                          {/* RED HEADERS - WASTE ANALYSIS */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("wastedQty")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Wasted Lead Qty {renderDataSourceSortIcon("wastedQty")}
                            </div>
                          </th>

                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("wastePercentage")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Wasted Lead % {renderDataSourceSortIcon("wastePercentage")}
                            </div>
                          </th>

                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider"
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Lost Reason
                            </div>
                          </th>

                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("potentialLostValue")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Potential Lost Value {renderDataSourceSortIcon("potentialLostValue")}
                            </div>
                          </th>

                          {/* PURPLE COLUMN - UNVERIFIED CONVERSION AMOUNT */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-purple-600/90"
                            style={{ backgroundColor: '#9333ea' }}
                            onClick={() => handleDataSourceSort("unverifiedConversionAmount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Unverified Conv. Amt {renderDataSourceSortIcon("unverifiedConversionAmount")}
                            </div>
                          </th>

                          {/* RED HEADERS - CANCELLED LEAD ANALYSIS */}
                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("cancelledLeadQty")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Cancelled Booking / Order Qty {renderDataSourceSortIcon("cancelledLeadQty")}
                            </div>
                          </th>

                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("cancelledLeadAmount")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Cancelled Booking / Order Amount {renderDataSourceSortIcon("cancelledLeadAmount")}
                            </div>
                          </th>

                          <th
                            className="px-4 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-red-600/90"
                            style={{ backgroundColor: '#dc2626' }}
                            onClick={() => handleDataSourceSort("cancellationLeadPercentage")}
                          >
                            <div className="flex items-center justify-center gap-1">
                              Cancelled Booking / Order % {renderDataSourceSortIcon("cancellationLeadPercentage")}
                            </div>
                          </th>

                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(() => {
                          // Pagination calculations
                          const allDateGroups = dataSourceDateGroups
                          const startIndex =
                            (dataSourceCurrentPage - 1) * dataSourceItemsPerPage

                          const paginatedDateGroups =
                            dataSourceDateGroups.slice(
                              startIndex,
                              startIndex + dataSourceItemsPerPage
                            )


                          return paginatedDateGroups.map((dateGroup) => (
                            <React.Fragment key={dateGroup.date}>
                              {/* Date Row (Parent) */}
                              <tr
                                className="cursor-pointer font-semibold border-b-2 border-slate-300 hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#BFDBFF' : '#f1f5f9' }}
                                onClick={() => toggleDataSourceDate(dateGroup.date)}
                              >
                                {/* STICKY - Data Source/Date Column */}
                                <td
                                  className="sticky left-0 z-10 px-4 py-3 text-sm text-slate-900 whitespace-nowrap"
                                  style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#BFDBFF' : '#f1f5f9' }}
                                >
                                  <div className="flex items-center gap-2 min-w-max">
                                    {expandedDataSourceDates.has(dateGroup.date) ? (
                                      <ChevronDown className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                    )}
                                    <Calendar className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                    <span className="font-bold text-slate-800">{dateGroup.date}</span>
                                    <span className="text-xs text-slate-600 ml-1">({dateGroup.sources.length} sources)</span>
                                    <div
                                      className="flex items-center gap-1 ml-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        onClick={() => handleDownloadCSV(dateGroup)}
                                        title="Download CSV"
                                        className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handlePrint(dateGroup)}
                                        title="Print"
                                        className="p-1 rounded hover:bg-slate-300 text-slate-600 transition-colors"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </td>

                                {/* STICKY - Total Traffic Column */}
                                <td
                                  className="sticky left-[180px] z-10 px-4 py-3 text-center"
                                  style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#BFDBFF' : '#f1f5f9' }}
                                >
                                  <span className="text-sm font-bold text-slate-900">
                                    {dateGroup.totals.totalTraffic || 0}
                                  </span>
                                </td>

                                {/* STICKY - Total Leads Column */}
                                <td
                                  className="sticky left-[300px] z-10 px-4 py-3 text-center"
                                  style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#BFDBFF' : '#f1f5f9' }}
                                >
                                  <span className="text-sm font-bold text-slate-900">
                                    {dateGroup.totals.totalLeads}
                                  </span>
                                </td>

                                {/* Avg TAT Column */}
                                <td className="px-4 py-3 text-center">
                                  {(() => {
                                    const avgTat = dateGroup.totals.avgTat || 0
                                    const dc = delayColor(avgTat)
                                    return (
                                      <span className={`inline-flex items-center ${dc.bg} border ${dc.border} rounded-full px-2.5 py-0.5 shadow-sm`}>
                                        <span className={`text-[10px] font-bold ${dc.text}`}>
                                          {formatDelay(avgTat)}
                                        </span>
                                      </span>
                                    )
                                  })()}
                                </td>

                                {/* High Priority - Count */}
                                <td className="px-2 py-3 text-center border-l border-slate-300" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#d1fae5' : 'transparent' }}>
                                  <span className="text-sm font-bold text-green-900">
                                    {dateGroup.totals.highPriority}
                                  </span>
                                </td>
                                {/* High Priority - % */}
                                <td className="px-2 py-3 text-center" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#d1fae5' : 'transparent' }}>
                                  <span className="text-xs font-semibold text-green-800">
                                    {dateGroup.totals.totalLeads > 0 ? ((dateGroup.totals.highPriority / dateGroup.totals.totalLeads) * 100).toFixed(1) : '0.0'}%
                                  </span>
                                </td>
                                {/* High Priority - TAT */}
                                <td className="px-2 py-3 text-center" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#d1fae5' : 'transparent' }}>
                                  {(() => {
                                    const t = dateGroup.totals.highPriorityAvgTat || 0
                                    if (!t) return <span className="text-xs text-slate-400">—</span>
                                    const dc = delayColor(t)
                                    return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                  })()}
                                </td>

                                {/* Medium Priority - Count */}
                                <td className="px-2 py-3 text-center border-l border-slate-300" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fef3c7' : 'transparent' }}>
                                  <span className="text-sm font-bold text-amber-900">
                                    {dateGroup.totals.mediumPriority}
                                  </span>
                                </td>
                                {/* Medium Priority - % */}
                                <td className="px-2 py-3 text-center" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fef3c7' : 'transparent' }}>
                                  <span className="text-xs font-semibold text-amber-800">
                                    {dateGroup.totals.totalLeads > 0 ? ((dateGroup.totals.mediumPriority / dateGroup.totals.totalLeads) * 100).toFixed(1) : '0.0'}%
                                  </span>
                                </td>
                                {/* Medium Priority - TAT */}
                                <td className="px-2 py-3 text-center" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fef3c7' : 'transparent' }}>
                                  {(() => {
                                    const t = dateGroup.totals.mediumPriorityAvgTat || 0
                                    if (!t) return <span className="text-xs text-slate-400">—</span>
                                    const dc = delayColor(t)
                                    return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                  })()}
                                </td>

                                {/* Low Priority - Count */}
                                <td
                                  className="px-2 py-3 text-center border-l border-slate-300"
                                  style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fee2e2' : 'transparent' }}
                                >
                                  <span className="text-sm font-bold text-red-900">
                                    {dateGroup.totals.lowPriority}
                                  </span>
                                </td>
                                {/* Low Priority - % */}
                                <td
                                  className="px-2 py-3 text-center"
                                  style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fee2e2' : 'transparent' }}
                                >
                                  <span className="text-xs font-semibold text-red-800">
                                    {dateGroup.totals.totalLeads > 0
                                      ? ((dateGroup.totals.lowPriority / dateGroup.totals.totalLeads) * 100).toFixed(1)
                                      : '0.0'}%
                                  </span>
                                </td>
                                {/* Low Priority - TAT */}
                                <td className="px-2 py-3 text-center" style={{ backgroundColor: expandedDataSourceDates.has(dateGroup.date) ? '#fee2e2' : 'transparent' }}>
                                  {(() => {
                                    const t = dateGroup.totals.lowPriorityAvgTat || 0
                                    if (!t) return <span className="text-xs text-slate-400">—</span>
                                    const dc = delayColor(t)
                                    return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                  })()}
                                </td>

                                {/* 🔹 SEPARATOR COLUMN (LINE) */}
                                <td className="px-0 py-0 border-l border-slate-300"></td>

                                {/* Conversion Metrics */}
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.convertedCount}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  ₹{Math.floor(dateGroup.totals.conversionAmount).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.conversionPercentage}%
                                </td>

                                {/* Spend & ROI Metrics */}
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  ₹{Math.floor(dateGroup.totals.spendAmount).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {parseFloat(dateGroup.totals.roas) === 0 ? "0x" : `${dateGroup.totals.roas}x`}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {parseFloat(dateGroup.totals.cac) === 0 ? "0" : `${dateGroup.totals.cac}`}
                                </td>

                                {/* BLUE COLUMN - Collection Amount */}
                                {/* <td
                                  className="px-4 py-3 text-center text-sm font-bold text-white"
                                  style={{ backgroundColor: '#3b82f6' }}
                                >
                                  {dateGroup.totals.collectionAmount > 0 ? (
                                    <a
                                      href={`https://script.google.com/macros/s/AKfycbwWgf5uN9xGWxkilhtaF5DEYmPeRpIgmdVPYfqOHoAqCqo9DJn4G6sVs_cRNIhNWK-T/exec?type=collection&company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'white', textDecoration: 'underline' }}
                                    >
                                      ₹{Math.floor(dateGroup.totals.collectionAmount).toLocaleString("en-IN")}
                                    </a>
                                  ) : (
                                    `₹0`
                                  )}
                                </td> */}
                                <td
                                  className="px-4 py-3 text-center text-sm font-bold text-white"
                                  style={{ backgroundColor: '#3b82f6' }}
                                >
                                  {dateGroup.totals.collectionAmount > 0 ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleOpenCollectionModal(dateGroup.date) }}
                                      style={{
                                        color: '#fff',
                                        textDecoration: 'underline',
                                        fontWeight: 700,
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ₹{Math.floor(dateGroup.totals.collectionAmount).toLocaleString("en-IN")}
                                    </button>
                                  ) : (
                                    `₹0`
                                  )}
                                </td>

                                {/* RED COLUMNS - Waste Analysis */}
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.wastedQty || 0}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.totalLeads > 0
                                    ? ((dateGroup.totals.wastedQty / dateGroup.totals.totalLeads) * 100).toFixed(1)
                                    : '0.0'}%
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-slate-700">
                                  {(dateGroup.totals.wastedQty || 0) > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {dateGroup.totals.lostReasons?.slice(0, 1).map((reason: string, idx: number) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 text-xs rounded-full"
                                          style={{
                                            backgroundColor: ['#fee2e2', '#fef3c7', '#dbeafe', '#f3e8ff', '#d1fae5'][idx % 5],
                                            color: ['#991b1b', '#92400e', '#1e40af', '#6b21a8', '#065f46'][idx % 5]
                                          }}
                                        >
                                          View Reason
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  ₹{Math.floor(dateGroup.totals.potentialLostValue || 0).toLocaleString("en-IN")}
                                </td>

                                {/* PURPLE COLUMN - Unverified Conversion Amount */}
                                <td className="px-4 py-3 text-center text-sm font-bold text-white" style={{ backgroundColor: '#a855f7' }}>
                                  ₹{Math.floor(dateGroup.totals.unverifiedConversionAmount || 0).toLocaleString("en-IN")}
                                </td>

                                {/* RED COLUMNS - Cancelled Lead Analysis */}
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.cancelledLeadQty || 0}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  ₹{Math.floor(dateGroup.totals.cancelledLeadAmount || 0).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                  {dateGroup.totals.totalLeads > 0
                                    ? ((dateGroup.totals.cancelledLeadQty / dateGroup.totals.totalLeads) * 100).toFixed(1)
                                    : '0.0'}%
                                </td>
                              </tr>

                              {/* Source Rows (Nested) - WITH CONDITIONAL LINKS */}
                              {expandedDataSourceDates.has(dateGroup.date) && dateGroup.sources.filter(source =>
                                source.totalLeads > 0 ||
                                source.convertedCount > 0 ||
                                source.conversionAmount > 0 ||
                                source.totalTraffic > 0 ||
                                source.wastedQty > 0 ||
                                source.cancelledLeadQty > 0 ||
                                source.unverifiedConversionAmount > 0
                              )
                                .map((source, sourceIdx) => (
                                  <tr
                                    key={`${dateGroup.date}-${source.dataSource}`}
                                    className="bg-white hover:bg-slate-50 transition-colors"
                                  >
                                    {/* STICKY - Data Source Name */}
                                    <td
                                      className="sticky left-0 z-10 bg-white px-4 py-3 pl-12 text-sm font-medium text-slate-700 border-b border-slate-100"
                                    >
                                      {source.dataSource}
                                    </td>

                                    {/* STICKY - Total Traffic with placeholder */}
                                    <td
                                      className="sticky left-[180px] z-10 bg-white px-4 py-3 text-center text-sm border-b border-slate-100"
                                    >
                                      <span className="text-slate-900 font-semibold">
                                        {source.totalTraffic || 0}
                                      </span>
                                    </td>

                                    {/* STICKY - Total Leads with Link */}
                                    <td
                                      className="sticky left-[300px] z-10 bg-white px-4 py-3 text-center text-sm border-b border-slate-100"
                                    >
                                      {source.totalLeads > 0 ? (
                                        <button
                                          onClick={() => handleOpenLeadDetailModal(dateGroup.date, source.dataSource, "All")}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          {source.totalLeads}
                                        </button>
                                      ) : (
                                        <span className="text-slate-900">{source.totalLeads}</span>
                                      )}

                                    </td>

                                    {/* Avg TAT Column */}
                                    <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {(() => {
                                        const avgTat = source.avgTat || 0
                                        const dc = delayColor(avgTat)
                                        return (
                                          <span className={`inline-flex items-center ${dc.bg} border ${dc.border} rounded-full px-2 py-0.5`}>
                                            <span className={`text-[10px] font-semibold ${dc.text}`}>
                                              {formatDelay(avgTat)}
                                            </span>
                                          </span>
                                        )
                                      })()}
                                    </td>

                                    {/* ✅ HIGH PRIORITY - CONDITIONAL LINK */}
                                    <td className="px-2 py-3 text-center border-l border-slate-200 border-b border-slate-100" style={{ backgroundColor: '#f0fdf4' }}>
                                      {source.highPriority > 0 ? (
                                        <button
                                          onClick={() => handleOpenLeadDetailModal(dateGroup.date, source.dataSource, "High")}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          <span className="text-sm">
                                            {source.highPriority}
                                          </span>
                                        </button>
                                      ) : (
                                        <span className="text-sm font-semibold text-green-900">
                                          {source.highPriority}
                                        </span>
                                      )}

                                    </td>
                                    {/* High Priority - % */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#f0fdf4' }}>
                                      <span className="text-xs text-green-700">
                                        {source.totalLeads > 0 ? ((source.highPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%
                                      </span>
                                    </td>
                                    {/* High Priority - TAT */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#f0fdf4' }}>
                                      {(() => {
                                        const t = source.highPriorityAvgTat || 0
                                        if (!t) return <span className="text-xs text-slate-400">—</span>
                                        const dc = delayColor(t)
                                        return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                      })()}
                                    </td>

                                    {/* ✅ MEDIUM PRIORITY - CONDITIONAL LINK */}
                                    <td className="px-2 py-3 text-center border-l border-slate-200 border-b border-slate-100" style={{ backgroundColor: '#fefce8' }}>
                                      {source.mediumPriority > 0 ? (
                                        <button
                                          onClick={() => handleOpenLeadDetailModal(dateGroup.date, source.dataSource, "Medium")}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          <span className="text-sm">
                                            {source.mediumPriority}
                                          </span>
                                        </button>
                                      ) : (
                                        <span className="text-sm font-semibold text-amber-900">
                                          {source.mediumPriority}
                                        </span>
                                      )}

                                    </td>
                                    {/* Medium Priority - % */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#fefce8' }}>
                                      <span className="text-xs text-amber-700">
                                        {source.totalLeads > 0 ? ((source.mediumPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%
                                      </span>
                                    </td>
                                    {/* Medium Priority - TAT */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#fefce8' }}>
                                      {(() => {
                                        const t = source.mediumPriorityAvgTat || 0
                                        if (!t) return <span className="text-xs text-slate-400">—</span>
                                        const dc = delayColor(t)
                                        return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                      })()}
                                    </td>

                                    {/* ✅ LOW PRIORITY - CONDITIONAL LINK */}
                                    <td className="px-2 py-3 text-center border-l border-slate-200 border-b border-slate-100" style={{ backgroundColor: '#fef2f2' }}>
                                      {source.lowPriority > 0 ? (
                                        <button
                                          onClick={() => handleOpenLeadDetailModal(dateGroup.date, source.dataSource, "Low")}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          <span className="text-sm">
                                            {source.lowPriority}
                                          </span>
                                        </button>
                                      ) : (
                                        <span className="text-sm font-semibold text-red-900">
                                          {source.lowPriority}
                                        </span>
                                      )}

                                    </td>
                                    {/* Low Priority - % */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#fef2f2' }}>
                                      <span className="text-xs text-red-700">
                                        {source.totalLeads > 0 ? ((source.lowPriority / source.totalLeads) * 100).toFixed(1) : '0.0'}%
                                      </span>
                                    </td>
                                    {/* Low Priority - TAT */}
                                    <td className="px-2 py-3 text-center border-b border-slate-100" style={{ backgroundColor: '#fef2f2' }}>
                                      {(() => {
                                        const t = source.lowPriorityAvgTat || 0
                                        if (!t) return <span className="text-xs text-slate-400">—</span>
                                        const dc = delayColor(t)
                                        return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                                      })()}
                                    </td>

                                    {/* 🔹 DIVIDER COLUMN */}
                                    <td className="px-0 py-0 border-l border-slate-200 bg-transparent"></td>

                                    {/* ✅ CONVERTED QUANTITY - CONDITIONAL LINK */}
                                    {/* <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {source.convertedCount > 0 ? (
                                        <a
                                          href={`https://script.google.com/a/macros/kairali.com/s/AKfycbwm61wP8sRe_okUPf2UCTzs1j3T2piYYeHbFsVTJGT-K1kIQUUykCEZ0mHoYFj-sHjBXQ/exec?company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}&src=${source.dataSource}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700 }}
                                        >
                                          {source.convertedCount}
                                        </a>
                                      ) : (
                                        <span className="text-slate-700">{source.convertedCount}</span>
                                      )}
                                    </td> */}
                                    <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {source.convertedCount > 0 ? (
                                        <button
                                          onClick={() => handleOpenVerifiedModal(dateGroup.date, source.dataSource)}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          {source.convertedCount}
                                        </button>
                                      ) : (
                                        <span className="text-slate-700">{source.convertedCount}</span>
                                      )}
                                    </td>

                                    {/* Conversion Amount */}
                                    {/* <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {source.conversionAmount > 0 ? (
                                        <a
                                          href={`https://script.google.com/a/macros/kairali.com/s/AKfycbwm61wP8sRe_okUPf2UCTzs1j3T2piYYeHbFsVTJGT-K1kIQUUykCEZ0mHoYFj-sHjBXQ/exec?company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}&src=${source.dataSource}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700 }}
                                        >
                                          ₹{Math.floor(source.conversionAmount).toLocaleString("en-IN")}
                                        </a>
                                      ) : (
                                        <span className="text-slate-700">₹0</span>
                                      )}
                                    </td> */}
                                    <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {source.conversionAmount > 0 ? (
                                        <button
                                          onClick={() => handleOpenVerifiedModal(dateGroup.date, source.dataSource)}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          ₹{Math.floor(source.conversionAmount).toLocaleString("en-IN")}
                                        </button>
                                      ) : (
                                        <span className="text-slate-700">₹0</span>
                                      )}
                                    </td>


                                    {/* Conversion Percentage */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {source.conversionPercentage}%
                                    </td>

                                    {/* Spend Amount */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      ₹{Math.floor(source.spendAmount).toLocaleString("en-IN")}
                                    </td>
                                    {/* ROAS */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {parseFloat(source.roas) === 0 ? "0x" : `${source.roas}x`}
                                    </td>
                                    {/* CAC */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {parseFloat(source.cac) === 0 ? "0" : `${source.cac}`}
                                    </td>

                                    {/* Collection Amount - Only at date subtotal & grand total level */}
                                    <td className="px-4 py-3 text-center text-sm border-b border-slate-100" style={{ backgroundColor: '#dbeafe', color: '#94a3b8' }}>
                                      —
                                    </td>

                                    {/* ✅ WASTED QTY - CONDITIONAL LINK */}
                                    {/* <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {(source.wastedQty || 0) > 0 ? (
                                        <a
                                          href={`https://script.google.com/macros/s/AKfycbyepUl170PJVzR2iecl7kMExjlRO_isTfOn1JrZftN3q5h4HoeJRv81K_QJUEVdp_YhoA/exec?company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}&src=${source.dataSource}&priority=All&showConverted=false`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700 }}
                                        >
                                          {source.wastedQty || 0}
                                        </a>
                                      ) : (
                                        <span className="text-slate-700">{source.wastedQty || 0}</span>
                                      )}
                                    </td> */}

                                    <td className="px-4 py-3 text-center text-sm border-b border-slate-100">
                                      {(source.wastedQty || 0) > 0 ? (
                                        <button
                                          onClick={() => handleOpenWastedModal(dateGroup.date, source.dataSource, undefined, source.wastedQty)}
                                          style={{ color: '#0037ba', textDecoration: 'underline', fontWeight: 700, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                                        >
                                          {source.wastedQty || 0}
                                        </button>
                                      ) : (
                                        <span className="text-slate-700">{source.wastedQty || 0}</span>
                                      )}
                                    </td>
                                    {/* Waste Percentage */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {source.totalLeads > 0 ? ((source.wastedQty / source.totalLeads) * 100).toFixed(1) : '0.0'}%
                                    </td>
                                    {/* Lost Reasons */}
                                    {/* <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {source.lostReasons?.split(',').map((reason, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-0.5 text-xs rounded-full"
                                          style={{
                                            backgroundColor: ['#fee2e2', '#fef3c7', '#dbeafe', '#f3e8ff', '#d1fae5'][idx % 5],
                                            color: ['#991b1b', '#92400e', '#1e40af', '#6b21a8', '#065f46'][idx % 5]
                                          }}
                                        >
                                          {reason}
                                        </span>
                                      ))}
                                    </div>
                                  </td> */}


                                    {/* <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {(source.wastedQty || 0) > 0 && (
                                        <div className="flex flex-wrap gap-1 justify-center">
                                          {source.lostReasons?.split(',').map((reason: string, idx: number) => {
                                            const cleanReason = reason.includes('(') ? reason.split('(')[0].trim() : reason.trim();
                                            const link = `https://script.google.com/macros/s/AKfycbyepUl170PJVzR2iecl7kMExjlRO_isTfOn1JrZftN3q5h4HoeJRv81K_QJUEVdp_YhoA/exec?company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}&src=${source.dataSource}&priority=All&showConverted=false&reason=${encodeURIComponent(cleanReason)}`;

                                            return (
                                              <a
                                                key={idx}
                                                href={link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-0.5 text-xs rounded-full cursor-pointer"
                                                style={{
                                                  backgroundColor: ['#fee2e2', '#fef3c7', '#dbeafe', '#f3e8ff', '#d1fae5'][idx % 5],
                                                  color: ['#991b1b', '#92400e', '#1e40af', '#6b21a8', '#065f46'][idx % 5],
                                                  textDecoration: 'underline',
                                                  fontWeight: 600
                                                }}
                                              >
                                                Reason
                                              </a>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </td> */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {(source.wastedQty || 0) > 0 && (
                                        <div className="flex flex-wrap gap-1 justify-center">
                                          {source.lostReasons?.split(',').map((reason: string, idx: number) => {
                                            const cleanReason = reason.includes('(')
                                              ? reason.split('(')[0].trim()
                                              : reason.trim();

                                            return (
                                              <button
                                                key={idx}
                                                onClick={() => handleOpenWastedModal(dateGroup.date, source.dataSource, cleanReason)}
                                                className="px-2 py-0.5 text-xs rounded-full cursor-pointer"
                                                style={{
                                                  backgroundColor: ['#fee2e2', '#fef3c7', '#dbeafe', '#f3e8ff', '#d1fae5'][idx % 5],
                                                  color: ['#633a3a', '#92400e', '#1e40af', '#6b21a8', '#065f46'][idx % 5],
                                                  textDecoration: 'underline',
                                                  fontWeight: 600,
                                                  border: 'none',
                                                }}
                                              >
                                                View Reason
                                              </button>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </td>

                                    {/* Potential Lost Value */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      ₹{Math.floor(source.potentialLostValue || 0).toLocaleString("en-IN")}
                                    </td>

                                    {/* Unverified Conversion Amount - Now date+source wise */}

                                    {/* <td
                                      className="px-4 py-3 text-center text-sm font-semibold border-b border-slate-100"
                                      style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                                    >
                                      {source.unverifiedConversionAmount > 0 ? (
                                        <a
                                          href={`https://script.google.com/macros/s/AKfycby5rkCGv10IXAKpBeut6SMcLENtEYaTOpzA8rYcR_Bv37gaSsorQJEn4c3sfYWh2Dac/exec?company=${selectedCompany}&date=${dateGroup.date.split("-").reverse().join("-")}&src=${source.dataSource}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            color: '#7c3aed',
                                            textDecoration: 'underline',
                                            fontWeight: 700
                                          }}
                                        >
                                          ₹{Math.floor(source.unverifiedConversionAmount).toLocaleString("en-IN")}
                                        </a>
                                      ) : (
                                        <span>
                                          ₹{Math.floor(source.unverifiedConversionAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                    </td> */}
                                    <td
                                      className="px-4 py-3 text-center text-sm font-semibold border-b border-slate-100"
                                      style={{ backgroundColor: '#f3e8ff', color: '#7c3aed' }}
                                    >
                                      {source.unverifiedConversionAmount > 0 ? (
                                        <button
                                          onClick={() => handleOpenUnverifiedModal(dateGroup.date, source.dataSource)}
                                          style={{
                                            color: '#7c3aed',
                                            textDecoration: 'underline',
                                            fontWeight: 700,
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          ₹{Math.floor(source.unverifiedConversionAmount).toLocaleString("en-IN")}
                                        </button>
                                      ) : (
                                        <span>
                                          ₹{Math.floor(source.unverifiedConversionAmount || 0).toLocaleString("en-IN")}
                                        </span>
                                      )}
                                    </td>
                                    {/* Cancelled Lead Qty */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {source.cancelledLeadQty || 0}
                                    </td>
                                    {/* Cancelled Lead Amount */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      ₹{Math.floor(source.cancelledLeadAmount || 0).toLocaleString("en-IN")}
                                    </td>
                                    {/* Cancellation Percentage */}
                                    <td className="px-4 py-3 text-center text-sm text-slate-700 border-b border-slate-100">
                                      {source.totalLeads > 0 ? ((source.cancelledLeadQty / source.totalLeads) * 100).toFixed(1) : '0.0'}%
                                    </td>
                                  </tr>
                                ))}
                            </React.Fragment>
                          ))
                        })()}
                      </tbody>

                      <tfoot className="bg-slate-800 border-t-2 border-slate-900">
                        <tr className="font-bold text-white">
                          {/* STICKY - Grand Total */}
                          <td
                            className="sticky left-0 z-10 px-4 py-3 uppercase text-sm tracking-wide"
                            style={{ backgroundColor: '#1e293b' }}
                          >
                            Grand Total
                          </td>

                          {/* STICKY - Total Traffic */}
                          <td
                            className="sticky left-[180px] z-10 px-4 py-3 text-center"
                            style={{ backgroundColor: '#1e293b' }}
                          >
                            {grandTotals.totalTraffic || 0}
                          </td>

                          {/* STICKY - Total Leads */}
                          <td
                            className="sticky left-[300px] z-10 px-4 py-3 text-center"
                            style={{ backgroundColor: '#1e293b' }}
                          >
                            {totalLeads}
                          </td>

                          {/* Avg TAT Column */}
                          <td className="px-4 py-3 text-center text-sm font-bold text-slate-200">
                            {(() => {
                              const grandAvgTat = grandTotals.tatCount > 0 ? Math.round(grandTotals.tatSum / grandTotals.tatCount) : 0
                              const dc = delayColor(grandAvgTat)
                              return (
                                <span className={`inline-flex items-center ${dc.bg} border ${dc.border} rounded-full px-2 py-0.5`}>
                                  <span className={`text-[10px] font-bold ${dc.text}`}>
                                    {formatDelay(grandAvgTat)}
                                  </span>
                                </span>
                              )
                            })()}
                          </td>

                          {/* High Priority */}
                          <td className="px-2 py-3 text-center text-green-300">
                            {grandTotals.high}
                          </td>
                          <td className="px-2 py-3 text-center text-green-300">
                            {grandTotals.totalLeads > 0
                              ? ((grandTotals.high / grandTotals.totalLeads) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                          <td className="px-2 py-3 text-center">
                            {(() => {
                              const t = grandTotals.highPriorityTatCount > 0 ? Math.round(grandTotals.highPriorityTatSum / grandTotals.highPriorityTatCount) : 0
                              if (!t) return <span className="text-xs text-slate-500">—</span>
                              const dc = delayColor(t)
                              return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                            })()}
                          </td>

                          {/* Medium Priority */}
                          <td className="px-2 py-3 text-center text-amber-300">
                            {grandTotals.medium}
                          </td>
                          <td className="px-2 py-3 text-center text-amber-300">
                            {grandTotals.totalLeads > 0
                              ? ((grandTotals.medium / grandTotals.totalLeads) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                          <td className="px-2 py-3 text-center">
                            {(() => {
                              const t = grandTotals.mediumPriorityTatCount > 0 ? Math.round(grandTotals.mediumPriorityTatSum / grandTotals.mediumPriorityTatCount) : 0
                              if (!t) return <span className="text-xs text-slate-500">—</span>
                              const dc = delayColor(t)
                              return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                            })()}
                          </td>

                          {/* Low Priority */}
                          <td className="px-2 py-3 text-center text-red-300">
                            {grandTotals.low}
                          </td>
                          <td className="px-2 py-3 text-center text-red-300">
                            {grandTotals.totalLeads > 0
                              ? ((grandTotals.low / grandTotals.totalLeads) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                          <td className="px-2 py-3 text-center">
                            {(() => {
                              const t = grandTotals.lowPriorityTatCount > 0 ? Math.round(grandTotals.lowPriorityTatSum / grandTotals.lowPriorityTatCount) : 0
                              if (!t) return <span className="text-xs text-slate-500">—</span>
                              const dc = delayColor(t)
                              return <span className={`text-[10px] font-bold ${dc.bg} border ${dc.border} rounded px-1.5 py-0.5 ${dc.text}`}>{formatDelay(t)}</span>
                            })()}
                          </td>

                          {/* Divider */}
                          <td className="px-0 py-0 border-l border-slate-600"></td>

                          {/* Converted */}
                          <td className="px-4 py-3 text-center">
                            {grandTotals.converted}
                          </td>

                          {/* Conversion Amount */}
                          <td className="px-4 py-3 text-center">
                            ₹{Math.floor(grandTotals.convAmount).toLocaleString("en-IN")}
                          </td>

                          {/* Conversion Percentage */}
                          <td className="px-4 py-3 text-center">{grandConversionPercentage}%</td>

                          {/* Spend Amount */}
                          <td className="px-4 py-3 text-center">
                            ₹{Math.floor(grandTotals.spend).toLocaleString("en-IN")}
                          </td>

                          {/* ROAS */}
                          <td className="px-4 py-3 text-center">
                            {parseFloat(grandROAS) === 0 ? "0x" : `${grandROAS}x`}
                          </td>
                          {/* CAC */}
                          <td className="px-4 py-3 text-center">
                            {parseFloat(grandCAC) === 0 ? "0" : `${grandCAC}`}
                          </td>

                          {/* BLUE COLUMN - Collection Amount */}
                          <td className="px-4 py-3 text-center" style={{ backgroundColor: '#1e40af' }}>
                            ₹{Math.floor(grandTotals.collectionAmount || 0).toLocaleString("en-IN")}
                          </td>

                          {/* RED COLUMNS - Waste Analysis */}
                          <td className="px-4 py-3 text-center">
                            {grandTotals.wastedQty || 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {grandTotals.totalLeads > 0
                              ? ((grandTotals.wastedQty / grandTotals.totalLeads) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                          <td className="px-4 py-3 text-center">—</td>
                          <td className="px-4 py-3 text-center">
                            ₹{Math.floor(grandTotals.potentialLostValue || 0).toLocaleString("en-IN")}
                          </td>

                          {/* PURPLE COLUMN - Unverified Conversion Amount */}
                          <td className="px-4 py-3 text-center" style={{ backgroundColor: '#7c3aed' }}>
                            ₹{Math.floor(grandTotals.unverifiedConversionAmount || 0).toLocaleString("en-IN")}
                          </td>

                          {/* RED COLUMNS - Cancelled Lead Analysis */}
                          <td className="px-4 py-3 text-center">
                            {grandTotals.cancelledLeadQty || 0}
                          </td>
                          <td className="px-4 py-3 text-center">
                            ₹{Math.floor(grandTotals.cancelledLeadAmount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {grandTotals.totalLeads > 0
                              ? ((grandTotals.cancelledLeadQty / grandTotals.totalLeads) * 100).toFixed(1)
                              : "0.0"}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {dataSourceDateGroups.length > 0 && (() => {
                  const dsTotalPages = Math.ceil(dataSourceDateGroups.length / dataSourceItemsPerPage)
                  const dsStart = (dataSourceCurrentPage - 1) * dataSourceItemsPerPage + 1
                  const dsEnd = Math.min(dataSourceCurrentPage * dataSourceItemsPerPage, dataSourceDateGroups.length)
                  return (
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">

                      {/* Left - Info */}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span>Showing</span>
                        <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {dsStart}–{dsEnd}
                        </span>
                        <span>of</span>
                        <span className="font-bold text-blue-700">{dataSourceDateGroups.length}</span>
                        <span>dates</span>
                      </div>

                      {/* Center - Page Numbers */}
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline"
                          disabled={dataSourceCurrentPage === 1}
                          onClick={() => setDataSourceCurrentPage(1)}
                          className="h-8 w-8 p-0 text-xs"
                        >«</Button>

                        <Button size="sm" variant="outline"
                          disabled={dataSourceCurrentPage === 1}
                          onClick={() => setDataSourceCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-8 px-3 text-xs"
                        >‹ Prev</Button>

                        {(() => {
                          const pages = []
                          const cur = dataSourceCurrentPage
                          let start = Math.max(1, cur - 2)
                          let end = Math.min(dsTotalPages, cur + 2)
                          if (cur <= 3) end = Math.min(5, dsTotalPages)
                          if (cur >= dsTotalPages - 2) start = Math.max(1, dsTotalPages - 4)
                          if (start > 1) pages.push(<span key="s-ellipsis" className="px-1 text-slate-400">…</span>)
                          for (let i = start; i <= end; i++) {
                            pages.push(
                              <button key={i} onClick={() => setDataSourceCurrentPage(i)}
                                className={`h-8 w-8 rounded-md text-xs font-semibold transition-all ${i === cur
                                  ? 'bg-blue-600 text-white shadow-md border border-blue-700'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                                  }`}
                              >{i}</button>
                            )
                          }
                          if (end < dsTotalPages) pages.push(<span key="e-ellipsis" className="px-1 text-slate-400">…</span>)
                          return pages
                        })()}

                        <Button size="sm" variant="outline"
                          disabled={dataSourceCurrentPage === dsTotalPages}
                          onClick={() => setDataSourceCurrentPage((p) => Math.min(dsTotalPages, p + 1))}
                          className="h-8 px-3 text-xs"
                        >Next ›</Button>

                        <Button size="sm" variant="outline"
                          disabled={dataSourceCurrentPage === dsTotalPages}
                          onClick={() => setDataSourceCurrentPage(dsTotalPages)}
                          className="h-8 w-8 p-0 text-xs"
                        >»</Button>
                      </div>

                      {/* Right - Rows per page & Go to page */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Rows/page</span>
                          <select
                            value={dataSourceItemsPerPage}
                            onChange={(e) => {
                              setDataSourceItemsPerPage(Number(e.target.value))
                              setDataSourceCurrentPage(1)
                            }}
                            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[5, 10, 15, 25, 50].map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Go to</span>
                          <input
                            type="number" min={1} max={dsTotalPages}
                            value={dataSourceGotoPage}
                            onChange={(e) => setDataSourceGotoPage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDataSourceGotoPage()}
                            className="h-8 w-16 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="#"
                          />
                          <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs px-3"
                            onClick={handleDataSourceGotoPage}
                          >Go</Button>
                        </div>
                      </div>

                    </div>
                  )
                })()}
              </>
              ) : (
                <div className="space-y-8 p-6">
                  {/* Lead Priority Distribution by Source */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border-2 border-slate-200 shadow-md">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Lead Priority Distribution by Source</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="dataSource"
                          angle={-45}
                          textAnchor="end"
                          height={120}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border-2 border-slate-300 rounded-lg shadow-xl">
                                  <p className="font-semibold text-slate-900 mb-1">{payload[0].payload.dataSource}</p>
                                  <p className="text-sm text-green-600">High Priority: {payload[0].value}</p>
                                  <p className="text-sm text-amber-600">Medium Priority: {payload[1].value}</p>
                                  <p className="text-sm text-red-600">Low Priority: {payload[2].value}</p>
                                  <p className="text-sm text-blue-600 mt-1">Total: {payload[0].payload.totalLeads}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend />
                        <Bar dataKey="highPriority" name="High Priority" fill="#16a34a" />
                        <Bar dataKey="mediumPriority" name="Medium Priority" fill="#f59e0b" />
                        <Bar dataKey="lowPriority" name="Low Priority" fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Priority Distribution Pie Chart */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-md">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Overall Priority Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: "High Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.highPriority, 0), color: "#16a34a" },
                              { name: "Medium Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.mediumPriority, 0), color: "#f59e0b" },
                              { name: "Low Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.lowPriority, 0), color: "#dc2626" },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent = 0 }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: "High Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.highPriority, 0), color: "#16a34a" },
                              { name: "Medium Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.mediumPriority, 0), color: "#f59e0b" },
                              { name: "Low Priority", value: dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.lowPriority, 0), color: "#dc2626" },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Total Leads by Source */}
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 shadow-md">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Total Leads by Source</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="dataSource" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-white p-3 border-2 border-slate-300 rounded-lg shadow-xl">
                                    <p className="font-semibold text-slate-900 mb-1">{payload[0].payload.dataSource}</p>
                                    <p className="text-sm text-blue-600">Total Leads: {payload[0].value}</p>
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Legend />
                          <Bar dataKey="totalLeads" name="Total Leads" fill="#1e3a5f" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 sm:gap-6">
                    <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                            Total Leads
                          </p>
                          <p className="text-3xl font-extrabold text-blue-900 mt-2">
                            {dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0)}
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full" style={{ backgroundColor: '#1e3a5f' }}>
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">T</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 via-green-100 to-green-200 border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                            High Priority
                          </p>
                          <p className="text-3xl font-extrabold text-green-900 mt-2">
                            {dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.highPriority, 0)}
                          </p>
                          <p className="text-sm font-medium text-green-700 mt-1">
                            ({dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0) > 0 ?
                              ((dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.highPriority, 0) / dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0)) * 100).toFixed(1) : '0.0'}%)
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl">H</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                            Medium Priority
                          </p>
                          <p className="text-3xl font-extrabold text-amber-900 mt-2">
                            {dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.mediumPriority, 0)}
                          </p>
                          <p className="text-sm font-medium text-amber-700 mt-1">
                            ({dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0) > 0 ?
                              ((dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.mediumPriority, 0) / dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0)) * 100).toFixed(1) : '0.0'}%)
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl">M</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 via-red-100 to-red-200 border-2 border-red-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                            Low Priority
                          </p>
                          <p className="text-3xl font-extrabold text-red-900 mt-2">
                            {dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.lowPriority, 0)}
                          </p>
                          <p className="text-sm font-medium text-red-700 mt-1">
                            ({dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0) > 0 ?
                              ((dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.lowPriority, 0) / dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.totalLeads, 0)) * 100).toFixed(1) : '0.0'}%)
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-xl">L</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                            Converted
                          </p>
                          <p className="text-3xl font-extrabold text-purple-900 mt-2">
                            {dataSourceDateGroups.reduce((sum, dateGroup) => sum + dateGroup.totals.convertedCount, 0)}
                          </p>
                        </div>
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <CheckCircle className="text-white h-6 w-6" />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leads Table with Real Data */}
        <div ref={resultRef} className="border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden relative">

          {/* ---------- Header ---------- */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 
    px-4 sm:px-5 py-3 mb-4
    bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50
    border-b border-slate-200
    rounded-t-xl
    shadow-sm">

            {/* Left: Title with Icon */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 
        flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                  Leads Requiring Assignment
                </h3>

                {/*
        <p className="text-[11px] text-slate-500">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} pending assignment
        </p>
        */}
              </div>
            </div>

            {/* Right: Stats + Auto-Refresh Status */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* New leads badge */}
              {newLeadsCount > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 border border-green-300 text-green-700 text-xs font-bold animate-pulse">
                  🆕 {newLeadsCount} new lead{newLeadsCount > 1 ? 's' : ''} added
                  <button
                    onClick={() => setNewLeadsCount(0)}
                    className="ml-1 text-green-500 hover:text-green-800"
                  >✕</button>
                </span>
              )}



              {filteredLeads.length > 0 && (
                <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200">
                  <span className="text-xs font-semibold text-blue-700">
                    Total: {totalLeads}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ---------- Content ---------- */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <Users className="h-14 w-14 mx-auto mb-4 text-slate-300" />
              <p className="text-sm font-medium">
                No leads requiring assignment at this time.
              </p>
            </div>
          ) : (
            <>
              {/* ---------- Table ---------- */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200" style={{ fontSize: 'var(--text-sm)' }}>

                  {/* Sticky Header */}
                  <thead
                    className="sticky top-0 z-10 border-b-2 border-slate-400 shadow"
                    style={{ backgroundColor: "#1e3a5f" }}
                  >

                    <tr className="border-b-2 border-slate-400">

                      <th
                        scope="col"
                        onClick={() => handleSort("createdAt")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                            text-white uppercase tracking-wider 
                            hover:bg-white/10 transition-all duration-200
                            border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Date & Time
                          {renderSortIcon("createdAt")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("id")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                        text-white uppercase tracking-wider 
                        hover:bg-white/10 transition-all duration-200
                        border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          ID
                          {renderSortIcon("id")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("name")}
                        className="sticky left-0 z-20 cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                          text-white uppercase tracking-wider 
                          hover:bg-white/10 transition-all duration-200
                          border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Name of Client
                          {renderSortIcon("name")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("phone")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                        text-white uppercase tracking-wider 
                        hover:bg-white/10 transition-all duration-200
                        border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Contact Details
                          {renderSortIcon("phone")}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Subject
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Notes
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        IVR URL
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Website
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("source")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                          text-white uppercase tracking-wider 
                          hover:bg-white/10 transition-all duration-200
                          border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Data Source
                          {renderSortIcon("source")}
                        </div>
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("company")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                        text-white uppercase tracking-wider 
                        hover:bg-white/10 transition-all duration-200
                        border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Lead Company
                          {renderSortIcon("company")}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        User Details
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Country
                      </th>

                      <th
                        scope="col"
                        onClick={() => handleSort("intent")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold 
                        text-white uppercase tracking-wider 
                        hover:bg-white/10 transition-all duration-200
                        border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Intent
                          {renderSortIcon("intent")}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Urgency
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Contact Time
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Conversation Summary
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Lead Outcome
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Lead Category
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Preferred Contact
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Time Delay
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Assign To
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                        Action
                      </th>

                    </tr>

                  </thead>

                  {/* Body */}
                  <tbody className="bg-white divide-y divide-slate-200">
                    {currentLeads.map((lead, index) => (
                      <tr
                        key={lead.id === "-" ? `row-${index}` : lead.id}
                        className="bg-white hover:bg-[#BFDBFF] transition-colors"
                      >
                        {/* Date & Time */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">
                              {/* {new Date(lead.updatedAt).toLocaleDateString("en-GB")} */}
                              {new Date(parseCRMDate(lead.updatedAt)).toLocaleDateString("en-GB")}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(parseCRMDate(lead.updatedAt)).toLocaleTimeString("en-GB", { hour12: false })}
                            </div>
                          </div>
                        </td>

                        {/* ID - With line break for long IDs */}
                        <td className="px-4 py-3 border-r border-slate-100" style={{ maxWidth: '120px', minWidth: '100px' }}>
                          <div className="font-mono text-xs font-semibold text-black-600 break-words leading-tight">
                            {lead.id || "N/A"}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="font-semibold text-slate-900">{lead.name || "N/A"}</div>
                          {/* {lead.tatBreached && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300 mt-1">
                              TAT Breach
                            </span>
                          )} */}
                        </td>

                        {/* Contact Details */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">{lead.phone || "N/A"}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[180px]" title={lead.email || "N/A"}>
                              {lead.email || "N/A"}
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.subject || "N/A"}>
                            {lead.subject || "N/A"}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.notes || "N/A"}>
                            {lead.notes || "N/A"}
                          </div>
                        </td>

                        {/* IVR URL */}
                        {/* <td className="px-4 py-3 whitespace-nowrap">
                          {lead.ivrUrl ? (
                            <a
                              href={lead.ivrUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium"
                            >
                              Listen Rec
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No IVR</span>
                          )}
                        </td> */}

                        {/* IVR URL - QUICK FIX */}
                        {/* <td className="px-4 py-3 whitespace-nowrap">
                          {lead.ivrUrl ? (
                            <a
                              href={
                                lead.ivrUrl.startsWith('http://') || lead.ivrUrl.startsWith('https://')
                                  ? lead.ivrUrl
                                  : `https://${lead.ivrUrl}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium"
                            >
                              Listen Rec
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No IVR</span>
                          )}
                        </td> */}



                        {/* IVR URL - FIXED VERSION WITH VALIDATION & FALLBACK */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(() => {
                            const url = lead.ivrUrl || lead.callRecordingUrl;
                            const sanitizedUrl = sanitizeIvrUrl(url);

                            return sanitizedUrl ? (
                              <a
                                href={sanitizedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium"
                              >
                                Listen Rec
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">No IVR</span>
                            );
                          })()}
                        </td>

                        {/* Website */}
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100" >
                          <div className="truncate text-sm text-slate-900" title={lead.websiteName || "N/A"}>
                            {lead.websiteName || "N/A"}
                          </div>
                        </td>

                        {/* Data Source */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-900 border border-slate-200 capitalize">
                            {lead.source?.replace("_", " ") || "N/A"}
                          </span>
                        </td>

                        {/* Lead Company - Different colors: KAPPL=Brown, KTAHV=Green, VILLARAAG=Dark Blue */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${lead.company?.toUpperCase() === "KAPPL"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : lead.company?.toUpperCase() === "KTAHV"
                                ? "bg-green-100 text-green-900 border-green-300"
                                : lead.company?.toUpperCase() === "VILLARAAG"
                                  ? "bg-blue-900 text-white border-blue-900"
                                  : "bg-slate-100 text-slate-900 border-slate-300"
                              }`}
                          >
                            {lead.company || "N/A"}
                          </span>
                        </td>

                        {/* User Details */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100 max-w-[200px]">
                          <div className="text-sm">
                            {/* User Name */}
                            <div
                              className="truncate text-slate-900 font-medium"
                              title={lead.userName || "N/A"}
                            >
                              {lead.userName || "N/A"}
                            </div>

                            {/* User Phone */}
                            <div className="text-sm text-slate-900">
                              {lead.userPhone || "N/A"}
                            </div>

                            {/* User Email */}
                            <div
                              className="text-xs text-slate-500 truncate max-w-[180px]"
                              title={lead.userEmail || "N/A"}
                            >
                              {lead.userEmail || "N/A"}
                            </div>
                          </div>
                        </td>

                        {/* Country */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-100">
                          {lead.country || "N/A"}
                        </td>

                        {/* Priority - High=Red, Medium=Yellow, Low=Green */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${lead.priority?.toLowerCase() === "high"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : lead.priority?.toLowerCase() === "medium"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                : lead.priority?.toLowerCase() === "low"
                                  ? "bg-green-100 text-green-800 border border-green-300"
                                  : "bg-slate-100 text-slate-800 border border-slate-300"
                              }`}
                          >
                            {lead.intent?.toUpperCase() || "N/A"}
                          </span>
                        </td>

                        {/* Urgency - Yes=Red, No=Gray */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${lead.urgency === "high" || lead.tatBreached
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-gray-100 text-gray-700 border border-gray-300"
                              }`}
                          >
                            {lead.urgency ? lead.urgency.toUpperCase() : "N/A"}
                            {/* {lead.urgency === "high" || lead.tatBreached ? "YES" : "NO"} */}
                          </span>
                        </td>

                        {/* Contact Time */}
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.contactTime || "N/A"}>
                            {lead.contactTime || "N/A"}
                          </div>
                        </td>

                        {/* Conversation Summary */}
                        <td className="px-4 py-3 max-w-40 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.conversationSummary || "N/A"}>
                            {lead.conversationSummary || "N/A"}
                          </div>
                        </td>

                        {/* Lead Outcome */}
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.leadOutcome || "N/A"}>
                            {lead.leadOutcome || "N/A"}
                          </div>
                        </td>

                        {/* Lead Category */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {lead.leadCategory || "N/A"}
                          </span>
                        </td>

                        {/* Preferred Contact */}
                        <td className="px-4 py-3 max-w-32 border-r border-slate-100">
                          <div className="truncate text-sm text-slate-900" title={lead.preferredContact || "N/A"}>
                            {lead.preferredContact || "N/A"}
                          </div>
                        </td>

                        {/* Time Delay */}

                        {/* Time Delay */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const delay = calculateTimeDelay(lead.updatedAt)
                              const isNegative = delay.startsWith("-")

                              // Parse hours for color determination
                              const timeStr = isNegative ? delay.substring(1) : delay
                              const hours = parseInt(timeStr.split(':')[0])

                              // Determine color based on rules:
                              // - Negative (future time): Orange (clock sync issue/warning)
                              // - Positive delay > 1 hour: Red (urgent - delayed)
                              // - Positive delay <= 1 hour: Orange (recent - less urgent)
                              let colorClass = ""
                              if (isNegative) {
                                // Future time - clock sync issue
                                colorClass = "text-orange-600"
                              } else if (hours >= 1) {
                                // Delayed more than 1 hour - urgent
                                colorClass = "text-red-600"
                              } else {
                                // Less than 1 hour delay - recent
                                colorClass = "text-orange-600"
                              }

                              return (
                                <span className={`text-sm font-semibold ${colorClass}`}>
                                  {delay}
                                </span>
                              )
                            })()}
                          </div>
                        </td>


                        {/* Assign To */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          {lead.assignedTo && lead.assignedTo.toLowerCase() !== "unassigned" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                              {lead.assignedTo}
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-dashed"
                              style={{ backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#f87171' }}
                            >
                              ⚠ Unassigned
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                              onClick={() => {
                                setSelectedLead(lead)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View
                            </Button>
                            {/* <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs font-medium border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                              onClick={() => {
                                setSelectedLead(lead)
                                setCallHistoryLeadId(lead.lead_id || lead.id || null)
                                setIsCallHistoryDialogOpen(true)
                              }}
                            >
                              <History className="h-3.5 w-3.5 mr-1.5" />
                              Call History
                            </Button> */}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ---------- Pagination ---------- */}
              {filteredLeads.length > 0 && (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">

                  {/* Left - Info */}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Showing</span>
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {tableStartIndex + 1}–{tableEndIndex}
                    </span>
                    <span>of</span>
                    <span className="font-bold text-blue-700">
                      {filteredLeads.length}
                      {!isAllDataLoaded && (
                        <span className="text-xs text-blue-400 font-normal ml-1">(of {totalLeads} total)</span>
                      )}
                    </span>
                    <span>leads</span>
                    {!isAllDataLoaded && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
                        ⟳ Loading more...
                      </span>
                    )}
                  </div>

                  {/* Center - Page Numbers */}
                  <div className="flex items-center gap-1">
                    {/* First page */}
                    <Button
                      size="sm" variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="h-8 w-8 p-0 text-xs"
                    >«</Button>

                    {/* Prev */}
                    <Button
                      size="sm" variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 px-3 text-xs"
                    >‹ Prev</Button>

                    {/* Page numbers */}
                    {(() => {
                      const pages = []
                      const total = tableTotalPages
                      const cur = currentPage
                      let start = Math.max(1, cur - 2)
                      let end = Math.min(total, cur + 2)
                      if (cur <= 3) end = Math.min(5, total)
                      if (cur >= total - 2) start = Math.max(1, total - 4)

                      if (start > 1) pages.push(<span key="s-ellipsis" className="px-1 text-slate-400">…</span>)
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`h-8 w-8 rounded-md text-xs font-semibold transition-all ${i === cur
                              ? 'bg-blue-600 text-white shadow-md border border-blue-700'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-300'
                              }`}
                          >{i}</button>
                        )
                      }
                      if (end < total) pages.push(<span key="e-ellipsis" className="px-1 text-slate-400">…</span>)
                      return pages
                    })()}

                    {/* Next */}
                    <Button
                      size="sm" variant="outline"
                      disabled={currentPage === tableTotalPages}
                      onClick={() => setCurrentPage((p) => Math.min(tableTotalPages, p + 1))}
                      className="h-8 px-3 text-xs"
                    >Next ›</Button>

                    {/* Last page */}
                    <Button
                      size="sm" variant="outline"
                      disabled={currentPage === tableTotalPages}
                      onClick={() => setCurrentPage(tableTotalPages)}
                      className="h-8 w-8 p-0 text-xs"
                    >»</Button>
                  </div>

                  {/* Right - Rows per page & Go to page */}
                  <div className="flex flex-wrap items-center gap-4">

                    {/* Rows per page */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rows/page</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setItemsPerPage(val)
                          setCurrentPage(1)
                        }}
                        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[10, 25, 50, 100].map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Go to page */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Go to</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={gotoPage}
                        onChange={(e) => setGotoPage(e.target.value)}
                        className="h-8 w-20 rounded-md border border-slate-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Page"
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700"
                        onClick={handleGotoPage}
                      >
                        Go
                      </Button>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialogs - keeping all the new dialog UI */}
        {isViewDialogOpen && selectedLead && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            style={{ backgroundColor: 'rgba(2,8,23,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setIsViewDialogOpen(false) }}
          >
            <div
              className="relative w-full bg-white flex flex-col overflow-hidden"
              style={{
                maxWidth: '780px',
                maxHeight: '92vh',
                borderRadius: '12px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
                animation: 'crmFadeIn 0.2s ease-out'
              }}
            >

              {/* ════ HEADER STRIP ════ */}
              <div style={{ background: '#0f2444', flexShrink: 0 }} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">

                  {/* Left: Name + meta */}
                  <div className="min-w-0 flex-1">
                    {/* Lead Name */}
                    <h2 className="text-white font-semibold text-lg sm:text-xl leading-tight truncate mb-2">
                      {selectedLead.name || "—"}
                    </h2>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">

                      {/* Priority badge */}
                      {selectedLead.priority && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          background: selectedLead.priority === 'high' ? 'rgba(239,68,68,0.18)' :
                            selectedLead.priority === 'medium' ? 'rgba(245,158,11,0.18)' : 'rgba(34,197,94,0.18)',
                          color: selectedLead.priority === 'high' ? '#fca5a5' :
                            selectedLead.priority === 'medium' ? '#fcd34d' : '#86efac',
                          border: `1px solid ${selectedLead.priority === 'high' ? 'rgba(239,68,68,0.35)' :
                            selectedLead.priority === 'medium' ? 'rgba(245,158,11,0.35)' : 'rgba(34,197,94,0.35)'}`
                        }}>
                          <span style={{
                            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                            background: selectedLead.priority === 'high' ? '#f87171' :
                              selectedLead.priority === 'medium' ? '#fbbf24' : '#4ade80'
                          }} />
                          {selectedLead.priority}
                        </span>
                      )}

                      {/* Company badge */}
                      {selectedLead.company && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)',
                          border: '1px solid rgba(255,255,255,0.15)'
                        }}>
                          {selectedLead.company}
                        </span>
                      )}

                      {/* NBD/CRR badge */}
                      {selectedLead['NBD/CRR'] && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: 'rgba(99,179,237,0.15)', color: '#90cdf4',
                          border: '1px solid rgba(99,179,237,0.25)'
                        }}>
                          {selectedLead['NBD/CRR']}
                        </span>
                      )}

                      {/* TAT Breach */}
                      {selectedLead.tatBreached && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
                          border: '1px solid rgba(239,68,68,0.35)'
                        }}>
                          TAT BREACH
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3" style={{ fontSize: '11.5px', color: 'rgba(148,163,184,0.9)' }}>
                      <span>ID: <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>{selectedLead.id}</span></span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                      {/* <span>{new Date(selectedLead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                      <span>{new Date(selectedLead.createdAt).toLocaleTimeString('en-GB', { hour12: false })}</span> */}
                      <span>{selectedLead.sentStatus
                        ? new Date(parseCRMDate(selectedLead.sentStatus)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : new Date(parseCRMDate(selectedLead.updatedAt ?? selectedLead.createdAt)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      }</span>
                      <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                      <span>{selectedLead.sentStatus
                        ? new Date(parseCRMDate(selectedLead.sentStatus)).toLocaleTimeString('en-GB', { hour12: false })
                        : new Date(parseCRMDate(selectedLead.updatedAt ?? selectedLead.createdAt)).toLocaleTimeString('en-GB', { hour12: false })
                      }</span>
                      {selectedLead.source && <>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                        <span>{selectedLead.source}</span>
                      </>}
                    </div>
                  </div>

                  {/* Right: Close button */}
                  <button
                    onClick={() => setIsViewDialogOpen(false)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  >
                    <svg width="14" height="14" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ════ TAB BAR ════ */}
              <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
                <div style={{ borderBottom: "1px solid #e5e9ef", background: "#fff", flexShrink: 0 }}

                >
                  <TabsList className="h-auto p-0 bg-transparent rounded-none w-full grid grid-cols-4 gap-0">
                    {[
                      { value: 'overview', label: 'Overview' },
                      { value: 'lead', label: 'Lead' },
                      { value: 'ai', label: 'AI' },
                      { value: 'system', label: 'System' },
                    ].map(tab => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        style={{ borderRadius: 0, padding: '11px 0', fontSize: '12.5px', fontWeight: 500, whiteSpace: 'nowrap', flex: 1 }}
                        className="text-slate-500 border-b-2 border-transparent data-[state=active]:border-[#1e40af] data-[state=active]:text-[#1e40af] bg-transparent hover:text-slate-700 transition-colors"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* ════ SCROLLABLE BODY ════ */}
                <div className="flex-1 overflow-y-auto" style={{ background: '#f8f9fb' }}>

                  {/* ── OVERVIEW TAB ── */}
                  <TabsContent value="overview" className="m-0 p-5 space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      {/* Contact Card */}
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#1e40af', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Contact</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <PField label="Name" value={selectedLead.name} />
                          <PField label="Phone" value={selectedLead.phone} />
                          <PField label="Email" value={selectedLead.email} />
                          <PField label="Country" value={selectedLead.country} />
                        </div>
                      </div>

                      {/* Assignment Card */}
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#0891b2', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Assignment</span>
                        </div>
                        <div className="p-4 space-y-3">
                          <PField label="Assigned To" value={selectedLead.assignedTo || 'Unassigned'} highlight={!selectedLead.assignedTo} />
                          <PField label="Sent Status" value={selectedLead.sentStatus} />
                          <PField label="Data Source" value={selectedLead.source} />
                          <PField label="V. Source" value={selectedLead.vSrc} />
                        </div>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#059669', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Subject / Enquiry</span>
                      </div>
                      <div className="px-4 py-3.5">
                        <p style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.65 }}>
                          {selectedLead.subject || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#7c3aed', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Notes</span>
                      </div>
                      <div className="px-4 py-3.5">
                        <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {selectedLead.notes || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Recordings row */}
                    {(sanitizeIvrUrl(selectedLead.ivrUrl) || selectedLead.callRecordingUrl) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(() => {
                          const url = sanitizeIvrUrl(selectedLead.ivrUrl)
                          return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textDecoration: 'none' }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <PhoneCall style={{ width: 16, height: 16, color: '#2563eb' }} />
                              </div>
                              <div>
                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>IVR Recording</p>
                                <p style={{ fontSize: '11px', color: '#64748b' }}>Click to listen</p>
                              </div>
                              <svg className="ml-auto" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : null
                        })()}

                        {selectedLead.callRecordingUrl && (
                          <a href={selectedLead.callRecordingUrl} download
                            className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', textDecoration: 'none' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="16" height="16" fill="none" stroke="#4f46e5" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                            </div>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Call Recording</p>
                              <p style={{ fontSize: '11px', color: '#64748b' }}>Download file</p>
                            </div>
                            <svg className="ml-auto" width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── LEAD INFO TAB ── */}
                  <TabsContent value="lead" className="m-0 p-5 space-y-4">

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#0891b2', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Contact Details</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                        <PField label="Full Name" value={selectedLead.name} />
                        <PField label="Phone" value={selectedLead.phone} />
                        <div className="col-span-2"><PField label="Email" value={selectedLead.email} /></div>
                        <PField label="Country" value={selectedLead.country} />
                        <PField label="Lead Category" value={selectedLead.leadCategory} />
                        <PField label="Best Time to Contact" value={selectedLead.contactTime} />
                        <PField label="Preferred Channel" value={selectedLead.preferredContact} />
                      </div>
                    </div>

                    {(selectedLead.userName || selectedLead.userPhone || selectedLead.userEmail) && (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#64748b', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Form Submitter</span>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                          <PField label="Name" value={selectedLead.userName} />
                          <PField label="Phone" value={selectedLead.userPhone} />
                          <div className="col-span-2"><PField label="Email" value={selectedLead.userEmail} /></div>
                          {selectedLead.websiteName && <div className="col-span-2"><PField label="Website / Page" value={selectedLead.websiteName} /></div>}
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#f59e0b', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Assignment</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                        <PField label="Assigned To" value={selectedLead.assignedTo || 'Unassigned'} />
                        <PField label="Sent Status" value={selectedLead.sentStatus} />
                        <PField label="Data Source" value={selectedLead.source} />
                        <PField label="Verified Source" value={selectedLead.vSrc} />
                        <PField label="Lead Outcome" value={selectedLead.leadOutcome} />
                        <PField label="NBD / CRR" value={selectedLead['NBD/CRR']} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── AI SUMMARY TAB ── */}
                  <TabsContent value="ai" className="m-0 p-5 space-y-4">

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#7c3aed', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Conversation Summary</span>
                      </div>
                      <div className="px-4 py-4">
                        <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {selectedLead.conversationSummary || 'No summary available.'}
                        </p>
                      </div>
                    </div>

                    {selectedLead.reasonAssignOrDelete && (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: '#dc2626', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Assign / Delete Reason</span>
                        </div>
                        <div className="px-4 py-4">
                          <p style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {selectedLead.reasonAssignOrDelete}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#475569', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Extracted Fields</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                        <PField label="Lead Outcome" value={selectedLead.leadOutcome} />
                        <PField label="GPT Extraction Status" value={selectedLead.gptExtractionStatus} />
                        <PField label="Mail Status" value={selectedLead.mailStatus} />
                        <PField label="Verified Source" value={selectedLead.verifiedSource} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── SYSTEM TAB ── */}
                  <TabsContent value="system" className="m-0 p-5 space-y-4">

                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#334155', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>System Information</span>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                        <div className="col-span-2">
                          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: 4 }}>Lead ID</p>
                          <p style={{ fontSize: '12.5px', fontFamily: 'monospace', color: '#1e3a5f', wordBreak: 'break-all', fontWeight: 600 }}>{selectedLead.id}</p>
                        </div>
                        <PField label="Company" value={selectedLead.company} />
                        <PField label="Data Source" value={selectedLead.source} />
                        {/* <PField label="Created At" value={new Date(selectedLead.createdAt).toLocaleString('en-GB')} />
                        <PField label="Updated At" value={new Date(selectedLead.updatedAt).toLocaleString('en-GB')} /> */}
                        <PField label="Created At" value={new Date(parseCRMDate(selectedLead.createdAt)).toLocaleString('en-GB')} />
                        <PField label="Updated At" value={new Date(parseCRMDate(selectedLead.updatedAt ?? selectedLead.createdAt)).toLocaleString('en-GB')} />
                        <PField label="Sent Status" value={selectedLead.sentStatus} />
                        <PField label="Mail Status" value={selectedLead.mailStatus} />
                        <PField label="NBD / CRR" value={selectedLead['NBD/CRR']} />
                        <PField label="Test Col" value={selectedLead.testCol} />
                      </div>
                    </div>

                    {/* Call History CTA — 
            <button
              onClick={() => {
                setIsViewDialogOpen(false)
                setTimeout(() => setIsCallHistoryDialogOpen(true), 150)
              }}
              className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3.5 transition-all group hover:border-blue-300 hover:bg-blue-50"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <History style={{ width: 16, height: 16, color: '#2563eb' }} />
                </div>
                <div className="text-left">
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>View Call History</p>
                  <p style={{ fontSize: '11.5px', color: '#64748b' }}>All follow-up activity for this lead</p>
                </div>
              </div>
              <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
            */}
                  </TabsContent>

                </div>
              </Tabs>

            </div>
          </div>
        )}
        {/* Call History / Follow-Up Modal */}
        <FollowUpModal
          isOpen={isCallHistoryDialogOpen}
          onClose={() => { setIsCallHistoryDialogOpen(false); setCallHistoryLeadId(null); }}
          lead={selectedLead}
          followUps={followUps}
          isLoading={isCallHistoryLoading}
          error={callHistoryError}
        />

        <Dialog open={isSqvDialogOpen} onOpenChange={setIsSqvDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl">
            <DialogHeader className="border-b border-slate-200 pb-4">
              <DialogTitle className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-700 to-emerald-700 flex items-center gap-3">
                <CheckCircle className="h-7 w-7 text-green-600" />
                SQV Verification Details
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1">
                Squad Voice Quality verification information for the selected lead
              </DialogDescription>
            </DialogHeader>

            {selectedLead && (
              <div className="grid gap-5 py-5">
                {/* Lead Summary Card */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-green-900">Lead: {selectedLead.name}</p>
                      <p className="text-xs text-green-700 mt-0.5">{selectedLead.phone}</p>
                    </div>
                    <Badge className="bg-green-600 text-white font-bold shadow-md w-fit">
                      {getSqvData(selectedLead.id).verifiedStatus}
                    </Badge>
                  </div>
                </div>

                {/* SQV Verified Status & SQV ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      SQV VERIFIED STATUS
                    </label>
                    <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                      <Badge
                        className={`font-bold shadow-sm ${getSqvData(selectedLead.id).verifiedStatus === "Yes"
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                          }`}
                      >
                        {getSqvData(selectedLead.id).verifiedStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV ID</label>
                    <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                      <p className="text-sm font-mono font-bold text-blue-600">
                        {getSqvData(selectedLead.id).sqvId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SQV Outcome Status */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV OUTCOME STATUS</label>
                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                    <Badge variant="outline" className="font-bold text-base border-indigo-300 text-indigo-700 bg-indigo-50">
                      {getSqvData(selectedLead.id).outcomeStatus}
                    </Badge>
                  </div>
                </div>

                {/* SQV Recording URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV RECORDING URL</label>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border-2 border-blue-300 shadow-sm">
                    <a
                      href={getSqvData(selectedLead.id).recordingUrl}
                      download
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-semibold flex flex-col sm:flex-row sm:items-center gap-2 transition-colors break-all"
                    >
                      <span className="truncate">{getSqvData(selectedLead.id).recordingUrl}</span>
                      <span className="text-xs bg-blue-100 px-2 py-1 rounded-md w-fit">Download ⬇</span>
                    </a>
                  </div>
                </div>

                {/* SQV Agent's Disposition & Agent Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT's DISPOSITION</label>
                    <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                      <Badge variant="secondary" className="font-bold bg-slate-200 text-slate-900">
                        {getSqvData(selectedLead.id).agentDisposition}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT NAME</label>
                    <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                      <p className="text-sm font-bold text-slate-900">
                        {getSqvData(selectedLead.id).agentName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SQV Agent Remarks */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV AGENT REMARKS</label>
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-slate-300 min-h-[60px] shadow-sm">
                    <p className="text-sm text-slate-700">{getSqvData(selectedLead.id).agentRemarks}</p>
                  </div>
                </div>

                {/* SQV Priority */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">SQV PRIORITY</label>
                  <div className="bg-blue-50 p-3 rounded-lg border-2 border-slate-300 shadow-sm">
                    <Badge
                      className={`font-bold shadow-sm ${getSqvData(selectedLead.id).priority === "High"
                        ? "bg-red-600 text-white"
                        : getSqvData(selectedLead.id).priority === "Medium"
                          ? "bg-yellow-600 text-white"
                          : "bg-green-600 text-white"
                        }`}
                    >
                      {getSqvData(selectedLead.id).priority}
                    </Badge>
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-4 border-t-2 border-slate-200">
                  <Button
                    onClick={() => setIsSqvDialogOpen(false)}
                    className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-lg rounded-xl transition-all"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div >
      <LeadDetailModal
        isOpen={isLeadDetailModalOpen}
        onClose={() => setIsLeadDetailModalOpen(false)}
        meta={leadDetailModalMeta}
      />
      <VerifiedDetailModal
        isOpen={isVerifiedModalOpen}
        onClose={() => setIsVerifiedModalOpen(false)}
        meta={verifiedModalMeta}
      />
      <UnverifiedDetailModal
        isOpen={isUnverifiedModalOpen}
        onClose={() => setIsUnverifiedModalOpen(false)}
        meta={unverifiedModalMeta}
      />
      <CollectionDetailModal
        isOpen={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        meta={collectionModalMeta}
      />
      <WastedDetailModal
        isOpen={isWastedModalOpen}
        onClose={() => setIsWastedModalOpen(false)}
        meta={wastedModalMeta}
      />
    </DashboardLayout >

  )
}
