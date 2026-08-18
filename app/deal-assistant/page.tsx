"use client"

import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import Loader from "@/components/Loader"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  Search,
  CheckCircle,
  TableIcon,
  AlertCircle,
  Sparkles,
  ClipboardCheck,
  Clipboard,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  MessageCircleMore,
  RefreshCw,
} from "lucide-react"

interface StalledLead {
  id: string
  name: string
  phone: string
  email: string
  package_interested: string
  assigned_sales_rep: string
  assigned_date: string
  stage: 'new' | 'qualified' | 'proposal_sent' | 'negotiating' | 'payment_pending' | 'won' | 'lost'
  last_contact_date: string
  daysStalled: number
  quote_amount: number | null
  notes: string
  last_attempt_unreachable: boolean
  company: string
  pipeline_stage?: string
  health_score?: number
  next_best_action?: string
}

type DraftMode = "followup" | "summary" | "next_action"

type DraftCacheEntry = {
  message: string
  source?: string
  fetchedAt: number
}

const STAGE_META: Record<string, { label: string; badge: string }> = {
  new: { label: "New", badge: "bg-sky-100 text-sky-800 border-sky-200" },
  qualified: { label: "Qualified", badge: "bg-violet-100 text-violet-800 border-violet-200" },
  proposal_sent: { label: "Proposal Sent", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  negotiating: { label: "Negotiation", badge: "bg-orange-100 text-orange-800 border-orange-200" },
  payment_pending: { label: "Payment Pending", badge: "bg-rose-100 text-rose-800 border-rose-200" },
  won: { label: "Won", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  lost: { label: "Lost", badge: "bg-slate-200 text-slate-800 border-slate-300" },
}

function getStageMeta(stage: string) {
  return STAGE_META[stage] || STAGE_META.new
}

function getBrandLabel(company?: string): string {
  const normalized = String(company || "").toUpperCase()
  if (normalized === "VILLARAAG") return "Villa RAAG"
  return "Kairali Ayurvedic Group"
}

function getAssistantDisplayName(user?: { name?: string | null; email?: string | null } | null): string {
  return user?.name?.trim() || user?.email?.trim() || "Kairali Team"
}

// Parse "DD/MM/YYYY HH:MM:SS" — JS new Date() misreads DD as MM for this format
function parseCRMDate(str: string): number {
  if (!str) return 0
  const [datePart, timePart = '00:00:00'] = str.split(' ')
  const parts = datePart.split('/')
  if (parts.length !== 3) return new Date(str).getTime()
  const [dd, mm, yyyy] = parts
  return new Date(`${yyyy}-${mm}-${dd}T${timePart}`).getTime()
}

// Helper to format date as DD/MM/YYYY format
function formatCRMDateToDDMMYYYY(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A"
  
  // If it's already in DD/MM/YYYY format or similar
  if (typeof dateStr === "string" && dateStr.includes("/")) {
    const parts = dateStr.split(" ")[0].split("/")
    if (parts.length === 3) {
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`
    }
  }

  // Fallback to JS Date parsing
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "N/A"
  
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function AIDealClosingAssistantPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const requestCacheRef = useRef<Map<string, { stalledLeads: StalledLead[]; stats: any; fetchedAt: number }>>(new Map())
  const draftCacheRef = useRef<Map<string, DraftCacheEntry>>(new Map())
  const stalledDealsAbortRef = useRef<AbortController | null>(null)

  // State variables
  const [stalledLeads, setStalledLeads] = useState<StalledLead[]>([])
  const [stats, setStats] = useState<any>({
    totalStalled: 0,
    stageCounts: { new: 0, qualified: 0, proposal_sent: 0, negotiating: 0, payment_pending: 0, won: 0, lost: 0 },
    pipelineCounts: { new: 0, qualified: 0, proposal_sent: 0, negotiating: 0, payment_pending: 0, won: 0, lost: 0 },
    totalPipelineValueAtRisk: 0,
    averageHealthScore: 0,
    pipelineCountsTotal: 0,
    summary: ""
  })
  
  const [searchInput, setSearchInput] = useState("")
  const [stageFilter, setStageFilter] = useState("all")
  const [selectedCompany, setSelectedCompany] = useState("ALL")
  const deferredSearchInput = useDeferredValue(searchInput)
  
  // Loading states
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isFilterFetching, setIsFilterFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI Follow-up Generation Modal States
  const [selectedLead, setSelectedLead] = useState<StalledLead | null>(null)
  const [generatedMessage, setGeneratedMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [draftMode, setDraftMode] = useState<DraftMode>("followup")
  const [markingLeadId, setMarkingLeadId] = useState<string | null>(null)

  // Date Filter states matching app/leads/assign/page.tsx format
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "yesterday" | "this_week" | "last_week" |
    "this_month" | "last_month" | "this_year" | "last_year" | "custom"
  >("this_week")

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Sorting states
  const [sortField, setSortField] = useState<string>("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [gotoPage, setGotoPage] = useState("")

  const assistantName = getAssistantDisplayName(user)
  const activeBrandLabel = getBrandLabel(selectedCompany)

  // Helper to format date in IST
  const formatIST = (date: Date): string => {
    const ist = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, "0");
    const d = String(ist.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Compute date ranges matching leads/assign/page.tsx exactly
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

      default:
        return null
    }
  }

  const isFirstRender = React.useRef(true)

  // Handle initial mount date setup and load data
  useEffect(() => {
    const dates = computeDatesForFilter("this_week")
    if (dates) {
      setStartDate(dates.from)
      setEndDate(dates.to)
      fetchStalledDeals(dates.from, dates.to, selectedCompany)
    }
  }, [])

  // Listen to dateFilter and company changes (skipping first render to avoid double fetch)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (dateFilter === "all") {
      setStartDate("")
      setEndDate("")
      fetchStalledDeals("", "", selectedCompany)
      return
    }

    if (dateFilter === "custom") {
      // User manual inputs
      return
    }

    const dates = computeDatesForFilter(dateFilter)
    if (dates) {
      setStartDate(dates.from)
      setEndDate(dates.to)
      fetchStalledDeals(dates.from, dates.to, selectedCompany)
    }
  }, [dateFilter, selectedCompany])

  // Custom date selection handler
  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      fetchStalledDeals(startDate, endDate, selectedCompany)
    }
  }

  // Fetch stalled deals from DB
  const fetchStalledDeals = async (from = startDate, to = endDate, comp = selectedCompany, silent = false) => {
    const cacheKey = `${from || ""}|${to || ""}|${comp || "ALL"}`
    const cached = requestCacheRef.current.get(cacheKey)
    const cacheAgeMs = cached ? Date.now() - cached.fetchedAt : Number.POSITIVE_INFINITY
    const isCacheFresh = cacheAgeMs < 5 * 60 * 1000

    if (isCacheFresh && cached) {
      setError(null)
      setStalledLeads(cached.stalledLeads)
      setStats(cached.stats)
      setCurrentPage(1)
      setIsInitialLoad(false)
      setIsFilterFetching(false)
      return
    }

    try {
      if (!silent) {
        setIsFilterFetching(true)
      }
      setError(null)

      stalledDealsAbortRef.current?.abort()
      const controller = new AbortController()
      stalledDealsAbortRef.current = controller
      
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (comp) params.set('company', comp)

      const res = await fetch(`/api/stalled-deals?${params.toString()}`, { signal: controller.signal })
      const json = await res.json()
      
      if (json.success) {
        setStalledLeads(json.stalledDeals || [])
        const nextStats = json.stats || {
          totalStalled: 0,
          stageCounts: { new: 0, qualified: 0, proposal_sent: 0, negotiating: 0, payment_pending: 0, won: 0, lost: 0 },
          pipelineCounts: { new: 0, qualified: 0, proposal_sent: 0, negotiating: 0, payment_pending: 0, won: 0, lost: 0 },
          totalPipelineValueAtRisk: 0,
          averageHealthScore: 0,
          pipelineCountsTotal: 0,
          summary: ""
        }
        setStats(nextStats)
        requestCacheRef.current.set(cacheKey, {
          stalledLeads: json.stalledDeals || [],
          stats: nextStats,
          fetchedAt: Date.now()
        })
        setCurrentPage(1) // Reset to page 1 on filter
      } else {
        setError(json.error || "Failed to load stalled deals")
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return
      }
      setError(err.message || "An unexpected error occurred while fetching data.")
    } finally {
      if (stalledDealsAbortRef.current) {
        stalledDealsAbortRef.current = null
      }
      setIsInitialLoad(false)
      setIsFilterFetching(false)
    }
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/dashboard")
    }
  }, [user, authLoading, router])

  // Mark lead as followed up
  const handleMarkFollowedUp = async (leadId: string, customNotes = "Sales representative followed up manually") => {
    try {
      setMarkingLeadId(leadId)
      const res = await fetch("/api/mark-followed-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          markedBy: user?.name || user?.email || "Sales Rep",
          notes: customNotes
        })
      })
      const json = await res.json()
      if (json.success) {
        requestCacheRef.current.clear()
        draftCacheRef.current.clear()
        await fetchStalledDeals(startDate, endDate, selectedCompany, true)
      } else {
        toast.error(json.error || "Failed to log follow-up action.")
      }
    } catch (err: any) {
      toast.error("Error logging follow-up: " + err.message)
    } finally {
      setMarkingLeadId(null)
    }
  }

  // Generate AI draft content
  const buildDraftCacheKey = (lead: StalledLead, mode: DraftMode) => [
    lead.id,
    mode,
    lead.stage,
    lead.package_interested || "",
    lead.quote_amount ?? "",
    lead.daysStalled,
    lead.notes || "",
    assistantName,
    lead.assigned_sales_rep || "",
  ].join("|")

  const handleGenerateMessage = async (lead: StalledLead, mode: DraftMode = "followup", forceRegenerate = false) => {
    setSelectedLead(lead)
    setDraftMode(mode)
    setCopied(false)
    const cacheKey = buildDraftCacheKey(lead, mode)
    const cachedDraft = draftCacheRef.current.get(cacheKey)
    const isFresh = cachedDraft && Date.now() - cachedDraft.fetchedAt < 12 * 60 * 60 * 1000

    if (isFresh && !forceRegenerate) {
      setGeneratedMessage(cachedDraft.message)
      setIsGenerating(false)
      return
    }

    setIsGenerating(true)
    setGeneratedMessage("")
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 30000)

    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          regenerate: forceRegenerate,
          name: lead.name,
          stage: lead.stage,
          package_interested: lead.package_interested,
          quote_amount: lead.quote_amount,
          notes: lead.notes,
          daysStalled: lead.daysStalled,
          assigned_sales_rep: lead.assigned_sales_rep,
          representative_name: assistantName,
        })
      })
      const json = await res.json()
      if (json.success) {
        setGeneratedMessage(json.message)
        draftCacheRef.current.set(cacheKey, {
          message: json.message,
          source: json.source || "gemini",
          fetchedAt: Date.now(),
        })
      } else {
        setGeneratedMessage("Error: " + (json.error || "Failed to draft AI content."))
      }
    } catch (err: any) {
      const isAbort = err?.name === "AbortError"
      setGeneratedMessage(
        isAbort
          ? "Error: Generation timed out. Please try again."
          : "Error: " + (err.message || "Failed to reach generator.")
      )
    } finally {
      window.clearTimeout(timeoutId)
      setIsGenerating(false)
    }
  }

  // Copy message to clipboard
  const handleCopyMessage = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      if (selectedLead && draftMode === "followup") {
        handleMarkFollowedUp(selectedLead.id, `AI-Generated Follow-up message copied to clipboard. Content: "${generatedMessage.substring(0, 50)}..."`)
      }
    }
  }

  const handleRegenerateDraft = () => {
    if (selectedLead) {
      draftCacheRef.current.delete(buildDraftCacheKey(selectedLead, draftMode))
      handleGenerateMessage(selectedLead, draftMode, true)
    }
  }

  const handleEmailDraft = () => {
    if (!selectedLead || !generatedMessage) return
    const recipient = selectedLead.email || window.prompt("Enter recipient email address")?.trim()
    if (!recipient) return

    const confirmed = window.confirm(`Open an email draft for ${recipient}?`)
    if (!confirmed) return

    const subject = `Deal update for ${selectedLead.name} - ${getStageMeta(selectedLead.pipeline_stage || selectedLead.stage).label}`
    const body = `${generatedMessage}\n\nRegards,\n${assistantName}\n${activeBrandLabel}`
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, "_blank", "noopener,noreferrer")
  }

  const handleWhatsAppDraft = async () => {
    if (!selectedLead) return

    let messageToSend = generatedMessage
    if (draftMode !== "followup") {
      const followupCacheKey = buildDraftCacheKey(selectedLead, "followup")
      const cachedFollowup = draftCacheRef.current.get(followupCacheKey)
      const isFreshFollowup = cachedFollowup && Date.now() - cachedFollowup.fetchedAt < 12 * 60 * 60 * 1000

      if (isFreshFollowup && cachedFollowup) {
        messageToSend = cachedFollowup.message
      } else {
        await handleGenerateMessage(selectedLead, "followup")
        const generatedFollowup = draftCacheRef.current.get(followupCacheKey)
        messageToSend = generatedFollowup?.message || ""
      }
    }

    if (!messageToSend) return

    const phone = selectedLead.phone?.replace(/\D/g, "") || window.prompt("Enter WhatsApp number")?.replace(/\D/g, "")
    if (!phone) return

    const confirmed = window.confirm(`Open WhatsApp draft for ${phone}?`)
    if (!confirmed) return

    const text = `${messageToSend}\n\n${assistantName} · ${activeBrandLabel}`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
  }

  // Sorting helpers
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
    setCurrentPage(1)
  }

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-white/50" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 text-white" />
      : <ArrowDown className="h-3 w-3 text-white" />
  }

  // Filters and Sorting logic
  const filteredLeads = useMemo(() => {
    let result = stalledLeads.filter(lead => {
      // Stage filter
      if (stageFilter !== "all" && lead.stage !== stageFilter) return false
      
      // Search filter
      if (deferredSearchInput) {
        const q = deferredSearchInput.trim().toLowerCase()
        const matchesId = lead.id?.toLowerCase().includes(q)
        const matchesName = lead.name?.toLowerCase().includes(q)
        const matchesPhone = lead.phone?.includes(q)
        const matchesEmail = lead.email?.toLowerCase().includes(q)
        const matchesRep = lead.assigned_sales_rep?.toLowerCase().includes(q)
        const matchesPackage = lead.package_interested?.toLowerCase().includes(q)
        return matchesId || matchesName || matchesPhone || matchesEmail || matchesRep || matchesPackage
      }

      return true
    })

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let aValue: any = a[sortField as keyof StalledLead]
        let bValue: any = b[sortField as keyof StalledLead]

        if (sortField === "assigned_date" || sortField === "last_contact_date") {
          const da = aValue ? parseCRMDate(aValue) : 0
          const db = bValue ? parseCRMDate(bValue) : 0
          return sortDirection === "asc" ? da - db : db - da
        }

        if (typeof aValue === "string") aValue = aValue.toLowerCase()
        if (typeof bValue === "string") bValue = bValue.toLowerCase()

        if (aValue == null) return 1
        if (bValue == null) return -1

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [stalledLeads, stageFilter, deferredSearchInput, sortField, sortDirection])

  // Pagination calculation
  const totalEntries = filteredLeads.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalEntries)
  const totalValueAtRisk = useMemo(() => {
    return filteredLeads.reduce((acc, lead) => acc + (lead.quote_amount || 0), 0)
  }, [filteredLeads])
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(startIndex, endIndex)
  }, [filteredLeads, startIndex, endIndex])

  const handleGotoPage = () => {
    const pageNum = parseInt(gotoPage)
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum)
      setGotoPage("")
    }
  }

  if (authLoading || !user) {
    return <Loader isLoading={true} contentOnly />
  }

  return (
    <DashboardLayout>
      <Loader isLoading={isInitialLoad || isFilterFetching} contentOnly />
      
      <div className="space-y-6">
        
        {/* ================= HERO HEADER SECTION (MATCHING HUB BANNER STYLE) ================= */}
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
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 lg:h-9 lg:w-9 text-white animate-pulse" />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight break-words">
                      AI Deal Closing Assistant
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-white/90 mt-1 sm:mt-2 font-medium">
                      Track stalled leads, analyze objection logs, and auto-draft tailor-made follow-ups.
                    </p>
                    <p className="text-xs sm:text-sm text-white/80 mt-2 font-medium">
                      {activeBrandLabel} · Personalized by {assistantName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Section - KPI Widget */}
              <div className="flex w-full lg:w-auto justify-start lg:justify-end">
                <div className="w-full sm:w-auto text-left sm:text-right bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                  <p className="text-xs uppercase tracking-wide text-white/70 font-semibold mb-1">
                    Total Leads
                  </p>
                  <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
                    {totalEntries}
                  </p>
                  <p className="text-[11px] text-white/70 mt-1">
                    AI-ready stalled pipeline
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ================= FILTERS & SEARCH CARD (MATCHING HUB STYLE) ================= */}
        <div className="mt-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-md">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-blue-100 via-white to-indigo-100 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-md border border-blue-700/30">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                    Filters & Search
                  </h3>
                  <p className="text-xs text-slate-500">
                    Refine and locate stalled leads efficiently
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("")
                  setStageFilter("all")
                  setSelectedCompany("ALL")
                  setDateFilter("all")
                  setStartDate("")
                  setEndDate("")
                  fetchStalledDeals("", "", "ALL")
                }}
                className="w-full sm:w-auto bg-white border-slate-300 text-slate-700 font-medium hover:bg-blue-100"
              >
                Clear Filters
              </Button>
            </div>

            <div className="px-4 sm:px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                
                {/* 1. Search */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Search Leads
                  </label>
                  <Input
                    placeholder="Name, email, phone, rep..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-10 w-full rounded-md border-gray-300"
                  />
                </div>

                {/* 2. Date Range */}
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

                {/* 3. Company Filter */}
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

                {/* 4. Pipeline Stage */}
                <div className="flex flex-col gap-1.5 lg:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Pipeline Stage
                  </label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger className="h-10 w-full rounded-md border-gray-300">
                      <SelectValue placeholder="All Stages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                      <SelectItem value="negotiating">Negotiating</SelectItem>
                      <SelectItem value="payment_pending">Payment Pending</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Custom Date Inputs */}
              {dateFilter === "custom" && (
                <div className="flex flex-wrap items-end gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-slate-500">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    onClick={handleCustomDateApply}
                    className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-xs"
                  >
                    Apply Filter
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ================= KPI SECTION (MATCHING HUB KPI LAYOUT) ================= */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
              <TableIcon className="h-4 w-4 text-blue-700" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Key Performance Indicators</h4>
              <p className="text-xs text-slate-500">Overview of stalled lead distributions, pipeline health, and value at risk</p>
            </div>
          </div>

          <Card className="mb-4 border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Deal Summary</p>
                <p className="mt-1 text-sm text-slate-700">{stats.summary || "Loading pipeline summary..."}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 border border-slate-200">
                  Avg Health: {stats.averageHealthScore || 0}/100
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 border border-slate-200">
                  Pipeline Total: {stats.pipelineCountsTotal || 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 border border-slate-200">
                  Won: {stats.pipelineCounts?.won || 0}
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 border border-slate-200">
                  Lost: {stats.pipelineCounts?.lost || 0}
                </span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 sm:gap-6">
            
            {/* Total Stalled */}
            <Card className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 border-2 border-blue-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Total Leads
                  </p>
                  <p className="text-3xl font-extrabold text-blue-900 mt-2">
                    {filteredLeads.length}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#1e3a5f' }}>
                  <span className="text-white font-bold text-xl">T</span>
                </div>
              </div>
            </Card>

            {/* New Leads */}
            <Card className="bg-gradient-to-br from-green-50 via-green-100 to-green-200 border-2 border-green-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                    New Leads
                  </p>
                  <p className="text-3xl font-extrabold text-green-900 mt-2">
                    {stats.pipelineCounts?.new || 0}
                  </p>
                  <p className="text-xs font-medium text-green-700 mt-1">Pipeline status</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
              </div>
            </Card>

            {/* Qualified Leads */}
            <Card className="bg-gradient-to-br from-violet-50 via-violet-100 to-violet-200 border-2 border-violet-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">
                    Qualified Leads
                  </p>
                  <p className="text-3xl font-extrabold text-violet-900 mt-2">
                    {stats.pipelineCounts?.qualified || 0}
                  </p>
                  <p className="text-xs font-medium text-violet-700 mt-1">Pipeline status</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">Q</span>
                </div>
              </div>
            </Card>

            {/* Proposal Sent */}
            <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 border-2 border-amber-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                    Proposal Sent
                  </p>
                  <p className="text-3xl font-extrabold text-amber-900 mt-2">
                    {stats.pipelineCounts?.proposal_sent || 0}
                  </p>
                  <p className="text-xs font-medium text-amber-700 mt-1">Pipeline status</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
              </div>
            </Card>

            {/* Negotiating */}
            <Card className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 border-2 border-orange-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">
                    Negotiating
                  </p>
                  <p className="text-3xl font-extrabold text-orange-900 mt-2">
                    {stats.pipelineCounts?.negotiating || 0}
                  </p>
                  <p className="text-xs font-medium text-orange-700 mt-1">Pipeline status</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">N</span>
                </div>
              </div>
            </Card>

            {/* Value at Risk */}
            <Card className="bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 border-2 border-purple-300 shadow-md hover:shadow-lg transition-shadow p-5 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                    Value at Risk
                  </p>
                  <p className="text-2xl font-extrabold text-purple-900 mt-2 tabular-nums">
                    ₹{filteredLeads.reduce((acc, l) => acc + (l.quote_amount || 0), 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">₹</span>
                </div>
              </div>
            </Card>

          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-red-900 text-sm">Failed to Load Stalled Leads</h5>
              <p className="text-red-700 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* ================= LEADS TABLE (MATCHING HUB TABLE STYLES & #1e3a5f STICKY HEADER) ================= */}
        <div className={`border-2 border-slate-200 rounded-xl shadow-xl bg-white overflow-hidden relative transition-all duration-200 ${isFilterFetching ? 'opacity-30 pointer-events-none' : ''}`}>
          
          {/* Table Header block */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200 rounded-t-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                  Stalled Leads Queue
                </h3>
              </div>
            </div>
            {totalEntries > 0 && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/70 border border-slate-200">
                <span className="text-xs font-semibold text-blue-700">
                  Total: {totalEntries}
                </span>
              </div>
            )}
          </div>

          {isInitialLoad || isFilterFetching ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-8 w-full bg-slate-100" />
              <Skeleton className="h-14 w-full bg-slate-100" />
              <Skeleton className="h-14 w-full bg-slate-100" />
              <Skeleton className="h-14 w-full bg-slate-100" />
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground flex flex-col items-center justify-center gap-2">
              <CheckCircle className="h-12 w-12 text-emerald-400" />
              <p className="font-semibold text-slate-700">No Stalled Leads Detected!</p>
              <p className="text-xs text-slate-400 max-w-sm">
                All leads have recently been followed up within the thresholds.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  
                  {/* Sticky Header exactly as app/leads/assign/page.tsx style */}
                  <thead className="sticky top-0 z-10 border-b-2 border-slate-400 shadow" style={{ backgroundColor: "#1e3a5f" }}>
                    <tr className="border-b-2 border-slate-400">
                      
                      {/* Date & Time (as first column!) */}
                      <th
                        onClick={() => handleSort("assigned_date")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Date & Time
                          {renderSortIcon("assigned_date")}
                        </div>
                      </th>

                      {/* ID */}
                      <th
                        onClick={() => handleSort("id")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          ID
                          {renderSortIcon("id")}
                        </div>
                      </th>

                      <th
                        onClick={() => handleSort("name")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Name of Client
                          {renderSortIcon("name")}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Contact Details
                      </th>

                      <th
                        onClick={() => handleSort("company")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Company
                          {renderSortIcon("company")}
                        </div>
                      </th>

                      <th
                        onClick={() => handleSort("stage")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Stage
                          {renderSortIcon("stage")}
                        </div>
                      </th>

                      <th
                        onClick={() => handleSort("daysStalled")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Days Stalled
                          {renderSortIcon("daysStalled")}
                        </div>
                      </th>

                      <th
                        onClick={() => handleSort("quote_amount")}
                        className="cursor-pointer px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider hover:bg-white/10 transition-all duration-200 border-r border-slate-400 whitespace-nowrap"
                        style={{ backgroundColor: "#1e3a5f" }}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          Quote Value
                          {renderSortIcon("quote_amount")}
                        </div>
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider border-r border-slate-400 whitespace-nowrap">
                        Latest Activity / Call Notes
                      </th>

                      <th className="px-4 py-3.5 text-center text-[11px] font-bold text-white uppercase tracking-wider whitespace-nowrap">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-slate-200">
                    {paginatedLeads.map((lead, index) => (
                      <tr
                        key={lead.id}
                        className="bg-white hover:bg-[#BFDBFF] transition-colors"
                      >
                        
                        {/* Date & Time (latest first sorted!) */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-semibold text-slate-900">
                              {formatCRMDateToDDMMYYYY(lead.assigned_date)}
                            </div>
                            <div className="text-xs text-slate-500">
                              {lead.assigned_date ? new Date(lead.assigned_date).toLocaleTimeString("en-GB", { hour12: false }) : ""}
                            </div>
                          </div>
                        </td>

                        {/* ID */}
                        <td className="px-4 py-3 border-r border-slate-100" style={{ maxWidth: '120px', minWidth: '100px' }}>
                          <div className="font-mono text-xs font-semibold text-black-600 break-words leading-tight">
                            {lead.id || "N/A"}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="font-semibold text-slate-900">{lead.name || "N/A"}</div>
                        </td>

                        {/* Contact details */}
                        <td className="px-4 py-3 whitespace-nowrap border-r border-slate-100">
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">{lead.phone || "N/A"}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[180px]" title={lead.email || "N/A"}>
                              {lead.email || "N/A"}
                            </div>
                          </div>
                        </td>

                        {/* Company Badge matching Hub exactly */}
                        <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
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
                            {lead.company || "KTAHV"}
                          </span>
                        </td>

                        {/* Stage */}
                        <td className="px-4 py-3 border-r border-slate-100">
                          <div className="flex flex-col gap-1">
                            <Badge className={getStageMeta(lead.stage).badge}>
                              {getStageMeta(lead.stage).label}
                            </Badge>
                            
                            {lead.last_attempt_unreachable && (
                              <div className="flex items-center gap-1 text-[10px] text-red-600 font-semibold mt-0.5">
                                <AlertTriangle className="h-3 w-3" /> Unreachable
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Days Stalled */}
                        <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-bold text-red-600">{lead.daysStalled} days</div>
                            <div className="text-[10px] text-slate-400">
                              Since {formatCRMDateToDDMMYYYY(lead.last_contact_date)}
                            </div>
                            {typeof lead.health_score === "number" && (
                              <div className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                Health {lead.health_score}/100
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Quote Value */}
                        <td className="px-4 py-3 border-r border-slate-100 text-sm font-bold text-slate-800 text-right">
                          {lead.quote_amount ? `₹${Math.floor(lead.quote_amount).toLocaleString("en-IN")}` : "—"}
                        </td>

                        {/* Latest Activity Notes */}
                        <td className="px-4 py-3 border-r border-slate-100 max-w-[300px]">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-sans">
                              {lead.notes || "No call notes logged."}
                            </p>
                            {lead.next_best_action && (
                              <div className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                                Next: {lead.next_best_action}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Action buttons matching Hub */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleGenerateMessage(lead)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 text-xs h-8"
                            >
                              <Sparkles className="h-3 w-3" /> Draft AI
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkFollowedUp(lead.id, "Sales representative marked as followed up via dashboard")}
                              disabled={markingLeadId === lead.id}
                              className="border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs h-8"
                            >
                              {markingLeadId === lead.id ? "Saving..." : "Mark Actioned"}
                            </Button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

              {/* ================= PAGINATION BLOCK (MATCHING HUB EXACTLY) ================= */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4 border-t bg-gradient-to-r from-slate-50 to-blue-50">
                
                {/* Left - Info */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Showing</span>
                  <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {startIndex + 1}–{endIndex}
                  </span>
                  <span>of</span>
                  <span className="font-bold text-blue-700">
                    {totalEntries}
                  </span>
                  <span>leads</span>
                </div>

                {/* Center - Page Numbers */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-8 w-8 p-0 text-xs"
                  >«</Button>

                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 text-xs"
                  >‹ Prev</Button>

                  {(() => {
                    const pages = []
                    const total = totalPages
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

                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 text-xs"
                  >Next ›</Button>

                  <Button
                    size="sm" variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-8 w-8 p-0 text-xs"
                  >»</Button>
                </div>

                {/* Right - Rows per page & Go to page */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Rows/page</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[10, 25, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Go to</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={gotoPage}
                      onChange={(e) => setGotoPage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGotoPage()}
                      className="h-8 w-16 rounded-md border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#"
                    />
                    <Button
                      size="sm"
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                      onClick={handleGotoPage}
                    >Go</Button>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>

      </div>

      {/* AI Draft Message Dialog */}
      <Dialog open={selectedLead !== null} onOpenChange={() => { setSelectedLead(null); setGeneratedMessage(""); setDraftMode("followup"); setCopied(false) }}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
            <Sparkles className="h-5 w-5 text-indigo-600 animate-pulse" />
            {draftMode === "followup" ? "Follow-up Message Draft" : draftMode === "summary" ? "AI Deal Summary" : "Next Best Action"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Drafted specifically for {selectedLead?.name} in {getStageMeta(selectedLead?.pipeline_stage || selectedLead?.stage || "new").label} stage.
          </DialogDescription>
        </DialogHeader>

        {selectedLead && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={draftMode === "followup" ? "default" : "outline"}
              onClick={() => handleGenerateMessage(selectedLead, "followup")}
              className="h-8 text-xs"
            >
              Follow-up
            </Button>
            <Button
              size="sm"
              variant={draftMode === "summary" ? "default" : "outline"}
              onClick={() => handleGenerateMessage(selectedLead, "summary")}
              className="h-8 text-xs"
            >
              AI Summary
            </Button>
            <Button
              size="sm"
              variant={draftMode === "next_action" ? "default" : "outline"}
              onClick={() => handleGenerateMessage(selectedLead, "next_action")}
              className="h-8 text-xs"
            >
              Next Best Action
            </Button>
          </div>
        )}

          {isGenerating ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">
                Gemini is composing your {draftMode === "followup" ? "follow-up" : draftMode === "summary" ? "summary" : "next action"}...
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-full overflow-hidden">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-800 font-sans leading-relaxed min-h-[100px] select-all whitespace-pre-wrap break-words">
                {generatedMessage}
              </div>

              {selectedLead && selectedLead.notes && draftMode === "followup" && (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-2.5 break-words">
                  <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wide">Objection Context Included:</p>
                  <p className="text-xs text-amber-900 mt-1 italic line-clamp-2 break-words">"{selectedLead.notes}"</p>
                </div>
              )}

              {generatedMessage && !generatedMessage.startsWith("Error:") && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEmailDraft}
                    className="h-9 justify-start gap-2 border-slate-300 bg-white text-slate-700 text-xs"
                    aria-label="Send via Email"
                    title="Send via Email"
                  >
                    <Mail className="h-4 w-4" />
                    Send via Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsAppDraft}
                    className="h-9 justify-start gap-2 border-slate-300 bg-white text-slate-700 text-xs"
                    aria-label="Send via WhatsApp"
                    title="Send via WhatsApp"
                  >
                    <MessageCircleMore className="h-4 w-4" />
                    Send via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyMessage}
                    className="h-9 justify-start gap-2 border-slate-300 bg-white text-slate-700 text-xs"
                    aria-label="Copy Draft"
                    title="Copy Draft"
                  >
                    Copy Draft
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateDraft}
                    className="h-9 justify-start gap-2 border-slate-300 bg-white text-slate-700 text-xs"
                    aria-label="Regenerate Draft"
                    title="Regenerate Draft"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate Draft
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLead(null)}
                  className="border-slate-300 hover:bg-slate-100 text-slate-700 font-medium h-9 text-xs"
                >
                  Close
                </Button>
                <Button
                  onClick={handleCopyMessage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 h-9 text-xs"
                >
                  {copied ? (
                    <>
                      <ClipboardCheck className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" /> Copy Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
