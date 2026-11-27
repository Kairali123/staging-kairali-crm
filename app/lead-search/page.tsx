"use client"

import { useState, useRef, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Upload,
  Download,
  Eye,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  PhoneCall,
  User,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  RefreshCcw,
  Bot,
  Zap,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Activity,
  Sparkles,
  Phone,
  Mail,
  Building2,
  Database,
  Users,
  UserCheck,
  Hourglass,
  Volume2,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Share2,
  Tag,
  Info,
  CheckCircle2,
  Plus,
  Minus,
} from "lucide-react"

interface FollowUp {
  callDate: string
  agentName: string
  agentId?: string
  disposition: string
  callNotes: string
  callCount?: number
  callType?: string
  hangupReason?: string
  recordingUrl?: string
  duration?: string
  priority?: string
  plannedDate?: string
  transferTo?: string
  source?: string
}

interface LeadJourney {
  leadId: string
  clientName: string
  mobile: string
  altMobile: string
  email: string
  enquiryDate?: string
  bufferArrival: string
  dataSource?: string
  verifiedSource?: string
  leadSource: string
  category: string
  company: string
  companyRaw?: string
  assignedTo: string
  salesPerson?: string
  currentHolder?: string
  assignedDate?: string
  assignReason?: string
  isDeleted?: boolean
  isKserveOnly?: boolean
  isDirectRoute?: boolean
  routingType?: string
  kserveStatus: string
  kserveRoute: string
  kserveAgentName: string
  kserveDisposition: string
  qualificationStatus: string
  stagingDate: string
  finalStatus: string
  leadStatus?: "Converted" | "Cold" | "Followup" | "New"
  latestDisposition?: string
  tatMinutes?: number | null
  tatLabel?: string
  tatStage?: "1st Call" | "Assigned" | "Waiting" | ""
  conversionAmount?: number
  convertedDate?: string
  lastFollowupDate: string
  totalFollowups: number
  followups: FollowUp[]
  // Stuck alert
  stuckAlert?: {
    isStuck: boolean
    stuckStage: string
    reason: string
    severity: "high" | "medium" | "low"
  }
}

interface KpiMetric {
  current: number
  previous: number
  delta: number
  pctChange: number
}

interface LeadKpiSummary {
  comparisonLabel: string
  totalLeads: KpiMetric
  assignedLeads: KpiMetric
  contactedLeads: KpiMetric
  untouchedLeads: KpiMetric
  convertedLeads: KpiMetric
}

type CompanyFilter = "ALL" | "KAPPL" | "KTAHV" | "VILLARAAG" | "KAC"
type SortField =
  | "leadId"
  | "clientName"
  | "company"
  | "dataSource"
  | "enquiryDate"
  | "bufferArrival"
  | "kserveStatus"
  | "assignedTo"
  | "totalFollowups"
  | "tatMinutes"
  | "leadStatus"
  | "finalStatus"
  | "salesPerson"
type SortDir = "asc" | "desc"

function getCompanyBadgeStyle(company?: string) {
  const c = (company || "").trim().toUpperCase()
  if (c === "KAPPL") return "bg-blue-50 text-blue-700 border-blue-200"
  if (c === "KTAHV" || c === "KATAHV") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (c === "VILLARAAG" || c === "VILARAAG") return "bg-purple-50 text-purple-700 border-purple-200"
  if (c === "KAC") return "bg-amber-50 text-amber-800 border-amber-200"
  return "bg-slate-50 text-slate-600 border-slate-200"
}

function getLeadStatusBadgeStyle(status?: string) {
  switch (status) {
    case "Converted":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold"
    case "Followup":
      return "bg-blue-50 text-blue-700 border-blue-200 font-semibold"
    case "Cold":
      return "bg-rose-50 text-rose-700 border-rose-200 font-semibold"
    case "New":
      return "bg-amber-50 text-amber-800 border-amber-200 font-semibold"
    default:
      return "bg-slate-50 text-slate-600 border-slate-200"
  }
}

function getTatBadgeStyle(mins?: number | null, stage?: string) {
  if (mins === null || mins === undefined) return "bg-slate-50 text-slate-500 border-slate-200"
  if (stage === "Waiting") {
    if (mins >= 120) return "bg-rose-50 text-rose-700 border-rose-200"
    return "bg-amber-50 text-amber-800 border-amber-200"
  }
  if (mins <= 30) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (mins <= 240) return "bg-blue-50 text-blue-700 border-blue-200"
  return "bg-amber-50 text-amber-800 border-amber-200"
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    })
  } catch {
    return iso
  }
}

function formatDuration(diffMs: number): string {
  if (isNaN(diffMs)) return "—"
  const absMs = Math.abs(diffMs)
  const diffSec = Math.floor(absMs / 1000)
  if (diffSec < 60) return `${diffSec}s`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  const remMin = diffMin % 60
  if (diffHours < 24) return remMin > 0 ? `${diffHours}h ${remMin}m` : `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  const remHours = diffHours % 24
  return remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`
}

function calculateTat(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) return "—"
  try {
    const t1 = new Date(startDate).getTime()
    const t2 = new Date(endDate).getTime()
    if (isNaN(t1) || isNaN(t2)) return "—"
    if (t2 < t1) return "< 1m"
    return formatDuration(t2 - t1)
  } catch {
    return "—"
  }
}

function getFinalStatusColor(status: string) {
  const s = status?.toLowerCase() || ""
  if (s.includes("convert") || s.includes("order") || s.includes("won") || s.includes("close")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
  }
  if (s.includes("meet") || s.includes("visit") || s.includes("pitch")) {
    return "bg-purple-100 text-purple-800 border-purple-300 font-semibold"
  }
  if (s.includes("cold") || s.includes("lost") || s.includes("not interest") || s.includes("junk") || s.includes("wrong")) {
    return "bg-red-100 text-red-800 border-red-300"
  }
  if (s.includes("follow") || s.includes("future") || s.includes("interest") || s.includes("call back") || s.includes("callback")) {
    return "bg-blue-100 text-blue-800 border-blue-300 font-semibold"
  }
  if (s.includes("not connect") || s.includes("no answer") || s.includes("rnr") || s.includes("busy") || s.includes("switch off")) {
    return "bg-amber-100 text-amber-800 border-amber-300"
  }
  if (s.includes("qualified")) {
    return "bg-teal-100 text-teal-800 border-teal-300 font-semibold"
  }
  return "bg-slate-100 text-slate-800 border-slate-200 font-medium"
}

function getKserveStatusBadge(kserveStatus: string, kserveRoute: string) {
  if (!kserveStatus && (!kserveRoute || kserveRoute.toLowerCase().includes("direct"))) {
    return <Badge variant="outline" className="text-xs text-slate-600 bg-slate-50 border-slate-200">Direct Route</Badge>
  }
  const s = (kserveStatus || "").toLowerCase()
  // Negatives first: "Non-Qualified" / "Not Qualified" also contain "qualified".
  if (/\b(non|not)\b|un-?qualified|rejected/.test(s)) {
    return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">KServe ✗ Not Qualified</Badge>
  }
  if (s.includes("qualified") || s.includes("verified")) {
    return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">KServe ✓ Qualified</Badge>
  }
  if (s.includes("pending") || s.includes("sent to kserve")) {
    return <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">KServe: {kserveStatus}</Badge>
  }
  return <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">KServe: {kserveStatus || kserveRoute}</Badge>
}

function TimelineModal({ lead, onClose }: { lead: LeadJourney; onClose: () => void }) {
  // Compute key TATs
  const tatBufferToAssign = calculateTat(lead.bufferArrival, lead.assignedDate)
  const tatBufferToStaging = calculateTat(lead.bufferArrival, lead.stagingDate)
  const tatStagingToAssign = calculateTat(lead.stagingDate, lead.assignedDate)
  
  const firstCall = lead.followups?.[0]
  const lastCall = lead.followups?.[lead.followups.length - 1]
  
  const tatAssignToFirstCall = calculateTat(
    lead.assignedDate || lead.bufferArrival,
    firstCall?.callDate
  )
  const tatLastCallToOutcome = calculateTat(
    lastCall?.callDate || lead.assignedDate,
    lead.convertedDate
  )
  const totalJourneyTat = calculateTat(
    lead.bufferArrival,
    lead.convertedDate || lastCall?.callDate || lead.assignedDate
  )

  const isDirect = lead.isDirectRoute ?? (!lead.stagingDate && !lead.kserveAgentName && !lead.kserveStatus)
  const isDeleted = Boolean(lead.isDeleted) || /data\s*backup.*delete|deleted/i.test(lead.assignedTo || "")
  const isKserveOnly = Boolean(lead.isKserveOnly)

  // Current Ownership
  const currentOwner = isDeleted
    ? "Data Backup - Deleted"
    : lead.currentHolder || lastCall?.agentName || lead.assignedTo || "Unassigned"
  const currentOwnerId = lastCall?.agentId || ""
  const totalCallCount = Math.max(lead.totalFollowups, lead.followups.length)

  // Time elapsed since last call
  const timeSinceLastCall = lastCall?.callDate ? calculateTat(lastCall.callDate, new Date().toISOString()) : "—"

  // Determine Lifecycle Stage: 1: Coming -> 2: Routed -> 3: Assigned (or Deleted End) -> 4: Follow-up Active -> 5: Closed
  const isClosed = !isDeleted && Boolean(
    lead.finalStatus?.toLowerCase().includes("convert") ||
    lead.finalStatus?.toLowerCase().includes("cold") ||
    lead.finalStatus?.toLowerCase().includes("lost") ||
    lead.convertedDate
  )
  const isFollowupActive = !isDeleted && totalCallCount > 0 && !isClosed
  const isAssigned = !isDeleted && !isKserveOnly && Boolean(lead.assignedTo) && totalCallCount === 0 && !isClosed
  const isRouting = !isDeleted && (isKserveOnly || (!lead.assignedTo && Boolean(lead.bufferArrival))) && !isClosed

  // Current stage number for progress bar
  const currentStageNumber = isDeleted ? 3 : isClosed ? 5 : isFollowupActive ? 4 : isAssigned ? 3 : isRouting ? 2 : 1

  // Accordion state: by default null = all stages minimized!
  const [activeStage, setActiveStage] = useState<number | null>(null)

  const toggleStage = (stageNum: number) => {
    setActiveStage(prev => (prev === stageNum ? null : stageNum))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-6xl sm:max-w-6xl lg:max-w-7xl h-[92vh] max-h-[92vh] flex flex-col p-0 rounded-2xl shadow-2xl border border-slate-700 bg-white overflow-hidden"
      >
        {/* Styles defined globally in app/globals.css — journey-scroll, animate-dash-flow, animate-pulse-soft */}

        {/* Modal Fixed Header (Won't scroll away, stays docked at top) */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#130b2e] via-[#1c1142] to-[#231649] text-white p-4 sm:p-5 border-b border-white/10 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  Lead Journey — {lead.clientName || lead.leadId}
                </h3>
                {isDeleted ? (
                  <Badge className="bg-rose-500/20 text-rose-200 border border-rose-400/50 text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm">
                    <XCircle className="h-3.5 w-3.5 text-rose-300" /> Data Backup - Deleted (Ended at Stage 3)
                  </Badge>
                ) : isDirect ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm">
                    <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Direct Route (Bypassed KServe)
                  </Badge>
                ) : (
                  <Badge className="bg-purple-500/20 text-purple-200 border border-purple-400/50 text-xs px-2.5 py-0.5 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-purple-300" /> {isKserveOnly ? "KServe AI Voice Queue" : "KServe Voice Qualified"}
                  </Badge>
                )}
                {lead.finalStatus && !isDeleted && (
                  <Badge className={`text-xs font-bold px-2.5 py-0.5 ${getFinalStatusColor(lead.finalStatus)}`}>
                    {lead.finalStatus}
                  </Badge>
                )}
              </div>
              {/* Issue 1: Pipe | separators between ID, Phone, Category, Company */}
              <p className="text-xs text-slate-200 flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <span><strong className="text-white">ID:</strong> {lead.leadId}</span>
                <span className="text-slate-400 font-light">|</span>
                <span><strong className="text-white">Phone:</strong> {lead.mobile || "—"}</span>
                {lead.category && (
                  <>
                    <span className="text-slate-400 font-light">|</span>
                    <span><strong className="text-white">Category:</strong> {lead.category}</span>
                  </>
                )}
                {lead.company && (
                  <>
                    <span className="text-slate-400 font-light">|</span>
                    <span><strong className="text-white">Company:</strong> {lead.company}</span>
                  </>
                )}
              </p>
            </div>

            {/* Custom Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Issue 2: Connected Journey Lifecycle Pipeline */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs mb-2.5 px-0.5 flex-wrap gap-2">
              <span className="font-bold text-white tracking-wide text-xs flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-indigo-300" /> Journey Lifecycle Pipeline
              </span>
              <span className={`text-xs font-bold ${isDeleted ? "text-rose-300" : "text-amber-300"}`}>
                Current:{" "}
                {isDeleted
                  ? "Stage 3 · Ended (Data Backup - Deleted)"
                  : isClosed
                  ? "Stage 5 · Closed"
                  : isFollowupActive
                  ? `Stage 4 · Active Follow-up (${totalCallCount} Calls)`
                  : isKserveOnly
                  ? "Stage 2 · KServe AI Voice Queue"
                  : isAssigned
                  ? "Stage 3 · Sales Assigned"
                  : "Stage 1 · Buffer Arrival"}
              </span>
            </div>

            {/* Connected 5-Stage Pipeline Boxes with Horizontal Connector Lines */}
            <div className="flex items-center overflow-x-auto pb-1 journey-scroll">
              {/* Step 1 */}
              <div
                onClick={() => toggleStage(1)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-center transition-all cursor-pointer select-none hover:brightness-110 active:scale-[0.98] ${
                  activeStage === 1
                    ? "bg-indigo-600/80 border-2 border-indigo-300 text-white shadow-[0_0_16px_rgba(129,140,248,0.45)]"
                    : currentStageNumber >= 1
                    ? "bg-[#221d52]/90 border border-indigo-400/60 text-white"
                    : "bg-white/5 border border-white/15 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-indigo-300 flex-shrink-0" />
                  <span className="font-bold text-xs">1. Ingested</span>
                </div>
                <span className="text-[11px] text-slate-300 block truncate mt-0.5">
                  Buffer Arrival
                </span>
              </div>

              {/* Connector 1 -> 2 */}
              <div className={`h-[2px] w-4 sm:w-6 flex-shrink-0 ${currentStageNumber >= 2 ? "bg-purple-400/80" : "bg-white/20"}`} />

              {/* Step 2 */}
              <div
                onClick={() => toggleStage(2)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-center transition-all cursor-pointer select-none hover:brightness-110 active:scale-[0.98] ${
                  activeStage === 2
                    ? "bg-purple-700/85 border-2 border-purple-300 text-white shadow-[0_0_16px_rgba(192,132,252,0.5)]"
                    : currentStageNumber === 2 && isKserveOnly
                    ? "bg-purple-900/90 border-2 border-purple-400 text-white shadow-[0_0_16px_rgba(192,132,252,0.45)]"
                    : currentStageNumber >= 2
                    ? "bg-[#31125e]/90 border border-purple-400/70 text-white"
                    : "bg-white/5 border border-white/15 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {currentStageNumber === 2 && isKserveOnly ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-purple-300 flex items-center justify-center flex-shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-300 animate-pulse" />
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-purple-300 flex-shrink-0" />
                  )}
                  <span className="font-bold text-xs">2. Routed</span>
                </div>
                <span className="text-[11px] text-slate-300 block truncate mt-0.5">
                  {isDirect ? "Direct Bypass" : "KServe AI"}
                </span>
              </div>

              {/* Connector 2 -> 3 */}
              <div className={`h-[2px] w-4 sm:w-6 flex-shrink-0 ${isDeleted ? "bg-rose-400/80" : currentStageNumber >= 3 ? "bg-indigo-400/80" : "bg-white/20"}`} />

              {/* Step 3 */}
              <div
                onClick={() => toggleStage(3)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-center transition-all cursor-pointer select-none hover:brightness-110 active:scale-[0.98] ${
                  isDeleted
                    ? "bg-rose-950/90 border-2 border-rose-400 text-white shadow-[0_0_16px_rgba(251,113,133,0.45)]"
                    : activeStage === 3
                    ? "bg-indigo-600/85 border-2 border-indigo-300 text-white shadow-[0_0_16px_rgba(129,140,248,0.45)]"
                    : currentStageNumber >= 3
                    ? "bg-[#221d52]/90 border border-indigo-400/60 text-white"
                    : "bg-white/5 border border-white/15 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {isDeleted ? (
                    <XCircle className="h-4 w-4 text-rose-300 flex-shrink-0" />
                  ) : currentStageNumber >= 3 ? (
                    <CheckCircle2 className="h-4 w-4 text-indigo-300 flex-shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-400 flex-shrink-0" />
                  )}
                  <span className="font-bold text-xs">{isDeleted ? "3. Deleted (End)" : "3. Assigned"}</span>
                </div>
                <span className="text-[11px] text-slate-300 block truncate mt-0.5">
                  {isDeleted ? "Data Backup" : isKserveOnly ? "Pending KServe" : lead.assignedTo || "Pending"}
                </span>
              </div>

              {/* Connector 3 -> 4 */}
              <div className={`h-[2px] w-4 sm:w-6 flex-shrink-0 ${!isDeleted && currentStageNumber >= 4 ? "bg-amber-400/90" : "bg-white/20"}`} />

              {/* Step 4 */}
              <div
                onClick={() => toggleStage(4)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-center transition-all cursor-pointer select-none hover:brightness-110 active:scale-[0.98] ${
                  isDeleted
                    ? "bg-white/[0.03] border border-white/10 text-slate-500 opacity-50"
                    : activeStage === 4 || currentStageNumber === 4
                    ? "bg-gradient-to-b from-amber-700/70 to-amber-950/85 border-2 border-amber-400 text-white shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                    : currentStageNumber > 4
                    ? "bg-amber-950/60 border border-amber-400/50 text-amber-100"
                    : "bg-white/5 border border-white/15 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {!isDeleted && currentStageNumber === 4 ? (
                    <span className="h-4 w-4 rounded-full border-2 border-amber-300 flex items-center justify-center flex-shrink-0">
                      <span className="h-2 w-2 rounded-full bg-amber-300" />
                    </span>
                  ) : !isDeleted && currentStageNumber > 4 ? (
                    <CheckCircle2 className="h-4 w-4 text-amber-300 flex-shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-slate-400/70 flex-shrink-0" />
                  )}
                  <span className="font-bold text-xs">4. Follow-up</span>
                </div>
                <span className="text-[11px] text-slate-300 block truncate mt-0.5">
                  {isDeleted ? "Skipped" : `${totalCallCount} Calls Dialed`}
                </span>
              </div>

              {/* Connector 4 -> 5 */}
              <div className={`h-[2px] w-4 sm:w-6 flex-shrink-0 ${!isDeleted && isClosed ? "bg-emerald-400/90" : "bg-white/20"}`} />

              {/* Step 5 */}
              <div
                onClick={() => toggleStage(5)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-xl text-center transition-all cursor-pointer select-none hover:brightness-110 active:scale-[0.98] ${
                  isDeleted
                    ? "bg-white/[0.03] border border-white/10 text-slate-500 opacity-50"
                    : activeStage === 5
                    ? "bg-emerald-600/80 border-2 border-emerald-300 text-white shadow-[0_0_16px_rgba(52,211,153,0.45)]"
                    : isClosed
                    ? "bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                    : "bg-white/5 border border-white/15 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {!isDeleted && isClosed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 flex-shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-300/60 flex-shrink-0" />
                  )}
                  <span className="font-bold text-xs">5. Closing</span>
                </div>
                <span className="text-[11px] text-slate-300 block truncate mt-0.5">
                  {isDeleted ? "Ended at Stage 3" : isClosed ? lead.finalStatus : "In Progress"}
                </span>
              </div>
            </div>
          </div>

          {/* Issue 3: Single-Line Inline Metrics Bar matching screenshot */}
          <div className="mt-3 rounded-xl bg-white/[0.07] border border-white/15 px-3.5 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-300" />
              </span>
              <span className="text-xs text-slate-200 whitespace-nowrap">
                Total Journey TAT: <strong className="text-sm font-extrabold text-amber-300 ml-0.5">{totalJourneyTat}</strong>
              </span>
            </div>

            <div className="hidden lg:block w-px h-5 bg-white/15 flex-shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-indigo-200" />
              </span>
              <span className="text-xs text-slate-200 truncate">
                Current Owner: <strong className="text-sm font-extrabold text-white ml-0.5">{currentOwner}</strong>
              </span>
            </div>

            <div className="hidden lg:block w-px h-5 bg-white/15 flex-shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-indigo-500/25 border border-indigo-400/30 flex items-center justify-center flex-shrink-0">
                <PhoneCall className="h-3.5 w-3.5 text-indigo-200" />
              </span>
              <span className="text-xs text-slate-200 whitespace-nowrap">
                Follow-up Calls: <strong className="text-sm font-extrabold text-white ml-0.5">{totalCallCount} calls</strong>
              </span>
            </div>

            <div className="hidden lg:block w-px h-5 bg-white/15 flex-shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
              </span>
              <span className="text-xs text-slate-200 truncate">
                Final Outcome:{" "}
                <strong className={`text-sm font-extrabold ml-0.5 ${isDeleted ? "text-rose-300" : "text-emerald-300"}`}>
                  {lead.finalStatus || (isKserveOnly ? "KServe Pending" : "Follow-up Open")}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body — Accordion Stages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70 journey-scroll">

          {/* Stuck Alert */}
          {lead.stuckAlert?.isStuck && (
            <div className={`mb-4 p-4 rounded-xl flex gap-3 items-start border shadow-sm ${
              lead.stuckAlert.severity === "high"
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}>
              <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${lead.stuckAlert.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <span>Journey Stuck Alert:</span>
                  <Badge className={lead.stuckAlert.severity === "high" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"}>
                    {lead.stuckAlert.stuckStage}
                  </Badge>
                </p>
                <p className="text-xs text-slate-700 mt-1">{lead.stuckAlert.reason}</p>
              </div>
            </div>
          )}

          {/* Accordion Stage Cards Controller */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3 px-1 flex-wrap gap-2">
            <span className="font-semibold flex items-center gap-1.5 text-slate-600">
              <Info className="h-4 w-4 text-indigo-500" />
              <span>By default sabhi stages minimized hain. Kisi bhi stage ya <strong className="text-slate-800">[+]</strong> par click karke maximize karein (ek time pe ek stage open hoga).</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStage(null)}
                disabled={activeStage === null}
                className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                  activeStage !== null 
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer shadow-xs" 
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                }`}
              >
                Minimize All
              </button>
            </div>
          </div>

          {/* Accordion Stages Container */}
          <div className="space-y-3">
            {/* ========================================================= */}
            {/* STAGE 1: BUFFER ARRIVAL (LEAD INGESTION)                 */}
            {/* ========================================================= */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
              activeStage === 1
                ? "bg-white border-blue-400 ring-2 ring-blue-100 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
              {/* Header (Clickable) */}
              <div 
                onClick={() => toggleStage(1)}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-xs ${
                    activeStage === 1 ? "bg-blue-600 ring-4 ring-blue-100" : "bg-blue-500"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px] font-bold w-[68px] justify-center py-0.5 mt-0.5 flex-shrink-0">
                    Stage 1
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        Buffer Arrival (Lead Ingestion)
                      </h4>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-600 inline-flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(lead.bufferArrival)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      Source: <strong className="text-slate-800">{lead.dataSource || lead.leadSource || "Website"}</strong>
                      <span className="mx-2 text-slate-300">|</span>
                      Category: <strong className="text-slate-800">{lead.category || "—"}</strong>
                      <span className="mx-2 text-slate-300">|</span>
                      Company: <strong className="text-slate-800">{lead.company || "—"}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStage(1) }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      activeStage === 1
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 shadow-xs"
                    }`}
                  >
                    {activeStage === 1 ? (
                      <>
                        <Minus className="h-3.5 w-3.5" />
                        <span>Minimize</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body (Expanded Only When activeStage === 1) */}
              {activeStage === 1 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-b from-blue-50/30 to-white space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Arrival Date & Time:</span>
                      <span className="font-bold text-slate-800">{formatDate(lead.bufferArrival)}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Verified Lead Source:</span>
                      <span className="font-bold text-slate-800">{lead.leadSource || "Website / Organic"}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Lead Category:</span>
                      <span className="font-bold text-slate-800">{lead.category || "General"}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Company:</span>
                      <span className="font-bold text-slate-800">{lead.company || "—"}</span>
                    </div>
                    {lead.mobile && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-400 font-medium block mb-0.5">Primary Contact:</span>
                        <span className="font-bold text-slate-800">{lead.mobile}</span>
                      </div>
                    )}
                    {lead.altMobile && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-slate-400 font-medium block mb-0.5">Alternate Mobile:</span>
                        <span className="font-bold text-slate-800">{lead.altMobile}</span>
                      </div>
                    )}
                    {lead.email && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs sm:col-span-2">
                        <span className="text-slate-400 font-medium block mb-0.5">Email ID:</span>
                        <span className="font-bold text-slate-800">{lead.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Delay to Stage 2/3 */}
                  <div className="flex items-center justify-center pt-2">
                    <span className="text-xs font-bold text-blue-800 bg-blue-100/80 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-blue-600" />
                      Delay from Ingestion to Sales Assignment: <strong className="text-blue-950 underline">{tatBufferToAssign}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* STAGE 2: ROUTING DECISION (DIRECT BYPASS VS KSERVE)       */}
            {/* ========================================================= */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
              activeStage === 2
                ? "bg-white border-amber-400 ring-2 ring-amber-100 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
              {/* Header (Clickable) */}
              <div 
                onClick={() => toggleStage(2)}
                className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-xs ${
                    activeStage === 2 
                      ? isDirect ? "bg-amber-500 ring-4 ring-amber-100" : "bg-purple-600 ring-4 ring-purple-100" 
                      : isDirect ? "bg-amber-500" : "bg-purple-500"
                  }`}>
                    {isDirect ? <Zap className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <Badge className={`text-[11px] font-bold w-[68px] justify-center py-0.5 mt-0.5 flex-shrink-0 ${
                    isDirect 
                      ? "bg-amber-100 text-amber-800 border-amber-200" 
                      : "bg-purple-100 text-purple-800 border-purple-200"
                  }`}>
                    Stage 2
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        Routing Decision: {isDirect ? "Direct Route (Bypassed KServe)" : "KServe AI Voice"}
                      </h4>
                      {isDirect ? (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                          ⚡ Skipped AI Calling
                        </Badge>
                      ) : (
                        getKserveStatusBadge(lead.kserveStatus, lead.kserveRoute)
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      Routing TAT Delay: <strong className="text-slate-800">{tatBufferToAssign}</strong> · {isDirect ? "Directly forwarded to sales dialer" : `KServe Agent: ${lead.kserveAgentName || "KServe AI Bot"}${lead.kserveDisposition ? ` · Outcome: ${lead.kserveDisposition}` : ""}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStage(2) }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      activeStage === 2
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 shadow-xs"
                    }`}
                  >
                    {activeStage === 2 ? (
                      <>
                        <Minus className="h-3.5 w-3.5" />
                        <span>Minimize</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body (Expanded Only When activeStage === 2) */}
              {activeStage === 2 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-b from-amber-50/20 to-white space-y-4">
                  {isDirect ? (
                    /* DIRECT ROUTE HIGHWAY - VISUAL BRANCHING WITH TEDHE-MEDHE ANIMATED ARROW */
                    <div className="p-4 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/60 shadow-xs">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                            Direct Route Highway (AI Queue Bypassed)
                          </span>
                        </div>
                        <Badge className="bg-amber-500 text-white font-bold text-xs shadow-xs flex items-center gap-1">
                          <Zap className="h-3 w-3 fill-white" /> Bypassed KServe AI Voice
                        </Badge>
                      </div>

                      {/* Visual Tedhe-Medhe Animated Highway */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center py-1">
                        {/* Left: KServe Skipped Node */}
                        <div className="md:col-span-4 border-2 border-dashed border-slate-300 bg-white/90 rounded-xl p-3 text-center opacity-75">
                          <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-600 border-slate-300 mb-1">
                            🚫 SKIPPED / NOT VISITED
                          </Badge>
                          <div className="flex items-center justify-center gap-1.5 text-slate-600 font-semibold text-xs mt-1">
                            <Bot className="h-4 w-4 text-slate-400" /> KServe Voice Queue
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            0 AI calls triggered. Lead skipped qualification queue.
                          </p>
                        </div>

                        {/* Center: Tedhe-Medhe Curvy S-Curve Animated SVG Arrow */}
                        <div className="md:col-span-4 flex flex-col items-center justify-center px-1">
                          <div className="w-full relative flex items-center justify-center">
                            <svg className="w-full h-18 overflow-visible" viewBox="0 0 160 70" fill="none">
                              <defs>
                                <linearGradient id="curveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="50%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M 10 15 C 60 5, 80 65, 145 35"
                                stroke="url(#curveGradient2)"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                className="animate-dash-flow"
                              />
                              <polygon points="144,28 156,36 142,42" fill="#10b981" />
                            </svg>
                          </div>
                          <div className="bg-amber-100 border border-amber-300 px-3 py-1 rounded-full shadow-xs text-center -mt-2">
                            <span className="text-[11px] font-extrabold text-amber-900 flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3 text-amber-600" />
                              Routing Delay TAT: <span className="underline decoration-amber-500">{tatBufferToAssign}</span>
                            </span>
                          </div>
                        </div>

                        {/* Right: Direct to Sales Highway */}
                        <div className="md:col-span-4 bg-white border border-emerald-300 rounded-xl p-3 shadow-xs">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                            <Sparkles className="h-4 w-4 text-emerald-600" /> Direct to Sales Agent
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug">
                            <span className="font-semibold text-slate-800">Reason:</span>{" "}
                            {lead.assignReason || "Sent directly to sales dialer (Mobile Available & Call Preferred)"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* KSERVE ROUTE DETAILS */
                    <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-purple-600" />
                          <span className="font-bold text-xs text-purple-900">KServe AI Voice Processing Details</span>
                        </div>
                        {getKserveStatusBadge(lead.kserveStatus, lead.kserveRoute)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 font-medium block">KServe Agent:</span>
                          <span className="font-bold text-slate-800">{lead.kserveAgentName || "Automated AI Bot"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">KServe Disposition:</span>
                          <span className="font-bold text-slate-800">{lead.kserveDisposition || "—"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Processing TAT:</span>
                          <span className="font-bold text-purple-700">{tatBufferToStaging}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delay to Sales Assignment */}
                  <div className="flex items-center justify-center pt-1">
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      Delay to Sales Assignment: <strong className="text-indigo-950 underline">{tatBufferToAssign}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* STAGE 3: SALES ASSIGNMENT                                */}
            {/* ========================================================= */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
              activeStage === 3
                ? "bg-white border-indigo-400 ring-2 ring-indigo-100 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
              {/* Header (Clickable) */}
              <div 
                onClick={() => toggleStage(3)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isDeleted ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-xs ${
                    isDeleted
                      ? "bg-rose-600"
                      : activeStage === 3
                      ? "bg-indigo-600 ring-4 ring-indigo-100"
                      : "bg-indigo-500"
                  }`}>
                    {isDeleted ? <XCircle className="h-4 w-4" /> : isKserveOnly ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <Badge className={`text-[11px] font-bold w-[68px] justify-center py-0.5 mt-0.5 flex-shrink-0 ${
                    isDeleted
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : "bg-indigo-100 text-indigo-800 border-indigo-200"
                  }`}>
                    Stage 3
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        {isDeleted
                          ? "Data Backup - Deleted (Journey Ended)"
                          : isKserveOnly
                          ? "KServe AI Routing (Awaiting Sales Handoff)"
                          : "Sales Assignment"}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isDeleted
                            ? "text-rose-700 bg-rose-50 border-rose-200"
                            : isKserveOnly
                            ? "text-purple-700 bg-purple-50 border-purple-200"
                            : "text-indigo-700 bg-indigo-50 border-indigo-200"
                        }`}
                      >
                        {isDeleted ? "✕ Deleted" : isKserveOnly ? "🤖 KServe (AI Voice)" : `👤 ${lead.assignedTo || "Unassigned"}`}
                      </Badge>
                      <span className="text-slate-300">|</span>
                      <span className="text-xs text-slate-600 inline-flex items-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(lead.assignedDate)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {isDeleted ? (
                        <>Delete Reason: <strong className="text-rose-700">{lead.assignReason || "No actionable enquiry details"}</strong></>
                      ) : isKserveOnly ? (
                        <>Sent to KServe: <strong className="text-purple-700">{formatDate(lead.assignedDate)}</strong> · Not yet transferred to a Sales Person</>
                      ) : (
                        <>Assigned On: <strong className="text-slate-800">{formatDate(lead.assignedDate)}</strong> · 1st Call TAT: <strong className="text-slate-800">{tatAssignToFirstCall}</strong></>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStage(3) }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      activeStage === 3
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-xs"
                    }`}
                  >
                    {activeStage === 3 ? (
                      <>
                        <Minus className="h-3.5 w-3.5" />
                        <span>Minimize</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body (Expanded Only When activeStage === 3) */}
              {activeStage === 3 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-b from-indigo-50/20 to-white space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Assigned Sales Agent:</span>
                      <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="h-4 w-4 text-indigo-500" />
                        {lead.assignedTo || "Not yet assigned"}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Assignment Timestamp:</span>
                      <span className="font-bold text-slate-800">{formatDate(lead.assignedDate)}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-0.5">Delay to 1st Outreach Call:</span>
                      <span className="font-bold text-amber-700">{tatAssignToFirstCall}</span>
                    </div>
                    {lead.assignReason && (
                      <div className={`p-3 rounded-lg border shadow-xs sm:col-span-2 lg:col-span-3 ${isDeleted ? "bg-rose-50/70 border-rose-200" : "bg-white border-slate-200"}`}>
                        <span className={`font-semibold block mb-0.5 ${isDeleted ? "text-rose-700" : "text-slate-400"}`}>
                          {isDeleted ? "Reason for Deletion (Data Backup - Deleted):" : "Assignment Reason / Policy:"}
                        </span>
                        <p className={`font-medium leading-relaxed ${isDeleted ? "text-rose-900" : "text-slate-700"}`}>{lead.assignReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Delay to 1st Call connector */}
                  {firstCall && (
                    <div className="flex items-center justify-center pt-1">
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Assignment → 1st Follow-up Call Delay: <strong className="text-amber-950 underline">{tatAssignToFirstCall}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* STAGE 4: SALES FOLLOW-UP ACTIVE HUB                      */}
            {/* ========================================================= */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
              activeStage === 4
                ? "bg-white border-amber-400 ring-2 ring-amber-100 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
              {/* Header (Clickable) */}
              <div 
                onClick={() => toggleStage(4)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isDeleted
                    ? "bg-slate-50/70 opacity-65"
                    : currentStageNumber === 4
                    ? "bg-amber-50/50 hover:bg-amber-50/80"
                    : "hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-xs ${
                    isDeleted ? "bg-slate-400" : activeStage === 4 ? "bg-amber-600 ring-4 ring-amber-100" : "bg-amber-500"
                  }`}>
                    <PhoneCall className="h-4 w-4" />
                  </div>
                  <Badge className={`text-[11px] font-bold w-[68px] justify-center py-0.5 mt-0.5 flex-shrink-0 ${
                    isDeleted ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}>
                    Stage 4
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        Sales Follow-up Active Hub
                      </h4>
                      {isDeleted ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-slate-100 text-slate-500 border-slate-200">
                          Ended at Stage 3
                        </Badge>
                      ) : (
                        <>
                          <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                            📞 {totalCallCount} Calls Dialed
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-semibold">
                            {lastCall?.disposition || lead.latestDisposition || "In Follow-up"}
                          </Badge>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      {isDeleted ? (
                        <>Lead was deleted at Stage 3 (Data Backup - Deleted) — no follow-up calls required.</>
                      ) : (
                        <>Currently With: <strong className="text-slate-800">{currentOwner}</strong> · Delay Since Last Call: <strong className="text-rose-700">{timeSinceLastCall}</strong> · Last Contact: {lastCall ? formatDate(lastCall.callDate) : "Pending"}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStage(4) }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      activeStage === 4
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 shadow-xs"
                    }`}
                  >
                    {activeStage === 4 ? (
                      <>
                        <Minus className="h-3.5 w-3.5" />
                        <span>Minimize</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body (Expanded Only When activeStage === 4) */}
              {activeStage === 4 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-b from-amber-50/20 to-white space-y-4">
                  {/* ACTIVE OWNERSHIP & HEALTH DASHBOARD ("KIS KE PAAS HAI, KITNA BAAR CALL, STATUS, DELAY") */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-xl border border-slate-200 shadow-xs">
                    {/* 1. Kis ke paas hai (Current Holder) */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <User className="h-3 w-3 text-indigo-500" /> Currently With (Agent)
                      </span>
                      <p className="text-sm font-extrabold text-slate-800 flex items-center gap-1">
                        {currentOwner}
                        {currentOwnerId && (
                          <span className="text-[10px] font-normal text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                            #{currentOwnerId}
                          </span>
                        )}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {lead.assignedTo && lead.assignedTo !== currentOwner ? `Assigned to ${lead.assignedTo}` : "Active sales owner"}
                      </span>
                    </div>

                    {/* 2. Kitna baar call ho gaya (Calls Dialed) */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-amber-500" /> Total Calls Dialed
                      </span>
                      <p className="text-sm font-extrabold text-slate-800">
                        {totalCallCount} Attempt{totalCallCount === 1 ? "" : "s"}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {lastCall?.callCount ? `Latest: Call #${lastCall.callCount}` : "All follow-ups tracked"}
                      </span>
                    </div>

                    {/* 3. Latest Status / Disposition */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-blue-500" /> Latest Disposition
                      </span>
                      <div>
                        <Badge className="text-xs font-bold bg-blue-100 text-blue-800 border-blue-200">
                          {lastCall?.disposition || lead.latestDisposition || "Open"}
                        </Badge>
                      </div>
                      {lastCall?.hangupReason && (
                        <span className="text-[10px] text-slate-500 block">
                          Hangup: <strong>{lastCall.hangupReason}</strong>
                        </span>
                      )}
                    </div>

                    {/* 4. Follow-up Delay / Time Gap */}
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-rose-500" /> Delay Since Last Call
                      </span>
                      <p className="text-sm font-extrabold text-rose-700">
                        {timeSinceLastCall}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {tatAssignToFirstCall !== "—" ? `1st Call Delay: ${tatAssignToFirstCall}` : "No delay recorded"}
                      </span>
                    </div>
                  </div>

                  {/* CALL LOG: BEAUTIFULLY ARRANGED CHRONOLOGICAL CARDS */}
                  {lead.followups.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <PhoneCall className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No follow-up calls logged yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Assigned to {currentOwner}. Pending first outreach call.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                        <span>Call History Timeline ({lead.followups.length} recorded interactions)</span>
                        <span className="text-[11px] text-slate-400">Oldest to Newest (Chronological)</span>
                      </div>

                      {lead.followups.map((fu, idx) => {
                        const prevCall = idx > 0 ? lead.followups[idx - 1] : null
                        const callGap = prevCall ? calculateTat(prevCall.callDate, fu.callDate) : null

                        return (
                          <div key={idx} className="space-y-2">
                            {/* Inter-call delay connector */}
                            {callGap && (
                              <div className="flex items-center justify-center my-1.5">
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  Time Gap between Call #{idx} and Call #{idx + 1}: <strong className="text-amber-900">{callGap}</strong>
                                </span>
                              </div>
                            )}

                            {/* Call Card */}
                            <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-xs transition-all">
                              {/* Card Top Row */}
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-2 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className="bg-slate-900 text-white font-bold text-xs px-2 py-0.5">
                                    Call #{fu.callCount || idx + 1}
                                  </Badge>
                                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1">
                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                    {fu.agentName || "Agent"}
                                    {fu.agentId && (
                                      <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                        ID: {fu.agentId}
                                      </span>
                                    )}
                                  </span>
                                  {fu.callType && (
                                    <Badge variant="outline" className="text-[11px] font-medium bg-slate-50 text-slate-600 border-slate-200">
                                      {fu.callType}
                                    </Badge>
                                  )}
                                  {fu.source && (
                                    <span className="text-[10px] text-slate-400">
                                      via {fu.source}
                                    </span>
                                  )}
                                </div>

                                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  <Calendar className="h-3 w-3 text-slate-400" />
                                  {formatDate(fu.callDate)}
                                </span>
                              </div>

                              {/* Card Badges Row */}
                              <div className="flex items-center gap-2 flex-wrap my-2">
                                <Badge className={`text-xs font-bold ${
                                  fu.disposition.toLowerCase().includes("cold")
                                    ? "bg-red-100 text-red-800 border-red-200"
                                    : fu.disposition.toLowerCase().includes("meet") || fu.disposition.toLowerCase().includes("convert")
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                }`}>
                                  {fu.disposition || "No disposition"}
                                </Badge>

                                {fu.hangupReason && (
                                  <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-200">
                                    Hangup by: <strong className="ml-1 text-slate-800">{fu.hangupReason}</strong>
                                  </Badge>
                                )}

                                {fu.duration && fu.duration !== "00:00:00" && (
                                  <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-200 flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" /> Duration: {fu.duration}
                                  </Badge>
                                )}

                                {fu.priority && (
                                  <Badge variant="outline" className="text-[11px] text-slate-600 border-slate-200">
                                    Priority: {fu.priority}
                                  </Badge>
                                )}

                                {fu.transferTo && (
                                  <Badge className="text-xs font-bold bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 shadow-xs">
                                    <Share2 className="h-3 w-3 text-purple-600" />
                                    Transferred to: {fu.transferTo}
                                  </Badge>
                                )}

                                {/* Call Recording Button */}
                                {fu.recordingUrl && (
                                  <a
                                    href={fu.recordingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 rounded-full transition-colors ml-auto shadow-xs"
                                  >
                                    <Volume2 className="h-3 w-3 text-indigo-600" /> Listen Recording
                                  </a>
                                )}
                              </div>

                              {/* Remarks / Call Notes */}
                              {fu.callNotes && (
                                <div className="mt-2.5 bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                    Agent Call Remarks & Conversation Notes:
                                  </span>
                                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-normal">
                                    {fu.callNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Delay to Final Outcome */}
                  {lead.finalStatus && (
                    <div className="flex items-center justify-center pt-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        Last Call → Final Outcome Delay: <strong className="text-emerald-950 underline">{tatLastCallToOutcome}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* STAGE 5: FINAL OUTCOME & CLOSING STATUS                   */}
            {/* ========================================================= */}
            <div className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-xs ${
              activeStage === 5
                ? isClosed && lead.finalStatus?.toLowerCase().includes("convert")
                  ? "bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-100 shadow-md"
                  : "bg-white border-slate-400 ring-2 ring-slate-100 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}>
              {/* Header (Clickable) */}
              <div 
                onClick={() => toggleStage(5)}
                className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isDeleted ? "bg-slate-50/70 opacity-65" : "hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 font-bold text-xs shadow-xs ${
                    isDeleted
                      ? "bg-slate-400"
                      : activeStage === 5
                      ? isClosed && lead.finalStatus?.toLowerCase().includes("convert")
                        ? "bg-emerald-600 ring-4 ring-emerald-100"
                        : "bg-slate-700 ring-4 ring-slate-100"
                      : isClosed && lead.finalStatus?.toLowerCase().includes("convert")
                      ? "bg-emerald-600"
                      : "bg-slate-500"
                  }`}>
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <Badge className={`text-[11px] font-bold w-[68px] justify-center py-0.5 mt-0.5 flex-shrink-0 ${
                    isDeleted ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                  }`}>
                    Stage 5
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        {isDeleted ? "Closing Stage (Ended at Stage 3)" : isClosed ? "Final Closing & Journey Outcome" : "Current Closing Status"}
                      </h4>
                      <Badge className={`text-[10px] font-bold px-2 py-0.5 ${isDeleted ? "bg-rose-100 text-rose-700 border-rose-200" : getFinalStatusColor(lead.finalStatus)}`}>
                        {isDeleted ? "Data Backup - Deleted" : lead.finalStatus || "Follow-up In Progress"}
                      </Badge>
                      {lead.conversionAmount && lead.conversionAmount > 0 && (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-extrabold">
                          ₹{lead.conversionAmount.toLocaleString("en-IN")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-1">
                      Total Pipeline TAT: <strong className="text-slate-800">{totalJourneyTat}</strong> · {isDeleted ? "Journey terminated at Stage 3" : lead.convertedDate ? `Closed on: ${formatDate(lead.convertedDate)}` : "Pending final outcome"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleStage(5) }}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      activeStage === 5
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-xs"
                    }`}
                  >
                    {activeStage === 5 ? (
                      <>
                        <Minus className="h-3.5 w-3.5" />
                        <span>Minimize</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Maximize</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Body (Expanded Only When activeStage === 5) */}
              {activeStage === 5 && (
                <div className="p-4 sm:p-5 border-t border-slate-100 bg-gradient-to-b from-slate-50/30 to-white space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-1">Journey Outcome Status:</span>
                      <Badge className={`text-xs font-bold px-2.5 py-1 ${getFinalStatusColor(lead.finalStatus)}`}>
                        {lead.finalStatus || "Follow-up In Progress"}
                      </Badge>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-1">Deal Converted Value:</span>
                      {lead.conversionAmount && lead.conversionAmount > 0 ? (
                        <span className="font-black text-emerald-700 text-lg">
                          ₹{lead.conversionAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-medium">Not converted / In negotiation</span>
                      )}
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-slate-400 font-medium block mb-1">Total Pipeline Journey TAT:</span>
                      <span className="font-extrabold text-slate-800 text-base flex items-center gap-1">
                        <Clock className="h-4 w-4 text-amber-500" />
                        {totalJourneyTat}
                      </span>
                    </div>
                  </div>

                  {lead.convertedDate && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                      <span className="font-semibold">Deal Conversion Date:</span>
                      <span className="font-bold">{formatDate(lead.convertedDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getPresetDisplayName(preset: string): string {
  switch (preset) {
    case "today": return "Today"
    case "yesterday": return "Yesterday"
    case "last7days": return "Last 7 Days"
    case "thisMonth": return "This Month"
    case "lastMonth": return "Last Month"
    case "custom": return "Custom Range"
    default: return "Today"
  }
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)

  useEffect(() => {
    const startVal = prevRef.current
    const endVal = value
    if (startVal === endVal) {
      setDisplay(endVal)
      return
    }
    let rafId = 0
    const duration = 450
    const startTime = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(startVal + (endVal - startVal) * eased))
      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        prevRef.current = endVal
      }
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [value])

  return <>{display.toLocaleString("en-IN")}</>
}

function HeaderKpiCard({
  title,
  metric,
  comparisonLabel,
  icon,
  accent,
  invertTrend = false,
  subLabel,
  loading = false,
  delayMs = 0,
}: {
  title: string
  metric?: KpiMetric
  comparisonLabel?: string
  icon: React.ReactNode
  accent: "blue" | "indigo" | "emerald" | "amber"
  invertTrend?: boolean
  subLabel?: string
  loading?: boolean
  delayMs?: number
}) {
  const styles = {
    blue: {
      card: "from-blue-50/90 via-white to-white border-blue-200/80 hover:border-blue-300",
      iconBg: "bg-blue-600 text-white shadow-blue-200",
      bar: "bg-blue-500",
    },
    indigo: {
      card: "from-indigo-50/90 via-white to-white border-indigo-200/80 hover:border-indigo-300",
      iconBg: "bg-indigo-600 text-white shadow-indigo-200",
      bar: "bg-indigo-500",
    },
    emerald: {
      card: "from-emerald-50/90 via-white to-white border-emerald-200/80 hover:border-emerald-300",
      iconBg: "bg-emerald-600 text-white shadow-emerald-200",
      bar: "bg-emerald-500",
    },
    amber: {
      card: "from-amber-50/90 via-white to-white border-amber-200/80 hover:border-amber-300",
      iconBg: "bg-amber-500 text-white shadow-amber-200",
      bar: "bg-amber-500",
    },
  }[accent]

  const current = metric?.current ?? 0
  const previous = metric?.previous ?? 0
  const pct = metric?.pctChange ?? 0
  const isUp = pct > 0
  const isDown = pct < 0
  const isGood = invertTrend ? isDown : isUp
  const isBad = invertTrend ? isUp : isDown

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${styles.card} px-3.5 py-2.5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 animate-kpi-in`}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${styles.bar} opacity-75`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            {loading && !metric ? (
              <div className="h-6 w-16 rounded bg-slate-200 animate-pulse" />
            ) : (
              <span className="text-xl font-extrabold text-slate-900 tabular-nums tracking-tight">
                <AnimatedNumber value={current} />
              </span>
            )}
            {subLabel && (
              <span className="text-[11px] font-semibold text-slate-500">
                {subLabel}
              </span>
            )}
          </div>
        </div>
        <div className={`p-2 rounded-lg shadow-sm ${styles.iconBg} flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-100/90 flex items-center justify-between gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded-full ${
            pct === 0
              ? "bg-slate-100 text-slate-600"
              : isGood
              ? "bg-emerald-100 text-emerald-700"
              : isBad
              ? "bg-rose-100 text-rose-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isUp && <TrendingUp className="h-3 w-3" />}
          {isDown && <TrendingDown className="h-3 w-3" />}
          {pct > 0 ? `+${pct}%` : `${pct}%`}
        </span>
        <span className="text-slate-400 font-medium truncate" title={`Previous: ${previous.toLocaleString("en-IN")}`}>
          {comparisonLabel || "vs Prev"}: <strong className="text-slate-600">{previous.toLocaleString("en-IN")}</strong>
        </span>
      </div>
    </div>
  )
}

export default function LeadSearchPage() {
  const { user, isLoading, hasPermission } = useAuth()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<LeadJourney[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingDate, setIsLoadingDate] = useState(false)
  const [isDefaultView, setIsDefaultView] = useState(true)
  const [searchError, setSearchError] = useState("")
  const [selectedLead, setSelectedLead] = useState<LeadJourney | null>(null)
  const [bulkText, setBulkText] = useState("")
  const [isBulkMode, setIsBulkMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Date Filter, Company Filter, Datasource Filter, KPI, Sort & Pagination state
  const [datePreset, setDatePreset] = useState<"today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "custom">("today")
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>("ALL")
  const [datasourceFilter, setDatasourceFilter] = useState<string>("ALL")
  const [availableDatasources, setAvailableDatasources] = useState<string[]>([])
  const [kpiSummary, setKpiSummary] = useState<LeadKpiSummary | null>(null)
  const [sortField, setSortField] = useState<SortField>("bufferArrival")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isLoading && (!user || !hasPermission("leads.view"))) {
      router.push("/dashboard")
    }
  }, [user, isLoading, hasPermission, router])

  const loadDateLeads = async (
    preset: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "custom" = datePreset,
    page: number = 1,
    limit: number = pageSize,
    customStart: string = startDate,
    customEnd: string = endDate,
    company: CompanyFilter = companyFilter,
    datasource: string = datasourceFilter
  ) => {
    setIsLoadingDate(true)
    setSearchError("")
    setDatePreset(preset)
    setCompanyFilter(company)
    setDatasourceFilter(datasource)
    try {
      let url = `/api/lead-journey?preset=${preset}&page=${page}&limit=${limit}&company=${encodeURIComponent(company)}&datasource=${encodeURIComponent(datasource)}`
      if (preset === "custom" && customStart && customEnd) {
        url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`
      }
      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json()
      if (data.success && data.results) {
        setResults(data.results)
        setTotalCount(data.totalCount ?? data.count ?? data.results.length)
        setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.totalCount ?? data.results.length) / limit)))
        setCurrentPage(page)
        setKpiSummary(data.kpi ?? null)
        if (Array.isArray(data.availableDatasources)) {
          setAvailableDatasources(data.availableDatasources)
        }
        setIsDefaultView(true)
      } else {
        throw new Error(data.error || "Failed to load leads")
      }
    } catch (err: any) {
      console.error("Failed to load leads by date range:", err)
      setSearchError(err.message || "Failed to load leads for selected date range")
    } finally {
      setIsLoadingDate(false)
    }
  }

  // Load current date's leads automatically on initial page load
  useEffect(() => {
    if (!isLoading && user && hasPermission("leads.view")) {
      loadDateLeads("today", 1, pageSize, "", "", "ALL", "ALL")
    }
  }, [isLoading, user, hasPermission])

  const handlePresetChange = (preset: "today" | "yesterday" | "last7days" | "thisMonth" | "lastMonth" | "custom") => {
    setDatePreset(preset)
    if (preset !== "custom") {
      setSearchQuery("")
      setBulkText("")
      loadDateLeads(preset, 1, pageSize, startDate, endDate, companyFilter, datasourceFilter)
    }
  }

  const handleCompanyChange = (company: CompanyFilter) => {
    setCompanyFilter(company)
    if (isDefaultView) {
      loadDateLeads(datePreset, 1, pageSize, startDate, endDate, company, datasourceFilter)
    } else if (searchQuery.trim()) {
      handleSearchWithFilters(searchQuery.trim(), company, datasourceFilter)
    }
  }

  const handleDatasourceChange = (datasource: string) => {
    setDatasourceFilter(datasource)
    if (isDefaultView) {
      loadDateLeads(datePreset, 1, pageSize, startDate, endDate, companyFilter, datasource)
    } else if (searchQuery.trim()) {
      handleSearchWithFilters(searchQuery.trim(), companyFilter, datasource)
    }
  }

  const handleApplyCustomDate = () => {
    if (!startDate || !endDate) return
    setSearchQuery("")
    setBulkText("")
    loadDateLeads("custom", 1, pageSize, startDate, endDate, companyFilter, datasourceFilter)
  }

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    if (isDefaultView) {
      loadDateLeads(datePreset, 1, newSize, startDate, endDate, companyFilter, datasourceFilter)
    } else {
      setCurrentPage(1)
      setTotalPages(Math.max(1, Math.ceil(totalCount / newSize)))
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    if (isDefaultView) {
      loadDateLeads(datePreset, newPage, pageSize, startDate, endDate, companyFilter, datasourceFilter)
    } else {
      setCurrentPage(newPage)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "bufferArrival" || field === "enquiryDate" || field === "totalFollowups" || field === "tatMinutes" ? "desc" : "asc")
    }
  }

  const displayedResults = useMemo(() => {
    const base = isDefaultView
      ? [...results]
      : results.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const dir = sortDir === "asc" ? 1 : -1
    base.sort((a, b) => {
      switch (sortField) {
        case "leadId":
          return (a.leadId || "").localeCompare(b.leadId || "") * dir
        case "clientName":
          return (a.clientName || a.mobile || "").localeCompare(b.clientName || b.mobile || "") * dir
        case "company":
          return (a.company || "").localeCompare(b.company || "") * dir
        case "dataSource":
          return (a.dataSource || a.leadSource || "").localeCompare(b.dataSource || b.leadSource || "") * dir
        case "enquiryDate": {
          const ta = a.enquiryDate || a.bufferArrival ? new Date(a.enquiryDate || a.bufferArrival).getTime() : 0
          const tb = b.enquiryDate || b.bufferArrival ? new Date(b.enquiryDate || b.bufferArrival).getTime() : 0
          return (ta - tb) * dir
        }
        case "bufferArrival": {
          const ta = a.bufferArrival ? new Date(a.bufferArrival).getTime() : 0
          const tb = b.bufferArrival ? new Date(b.bufferArrival).getTime() : 0
          return (ta - tb) * dir
        }
        case "kserveStatus":
          return (a.kserveStatus || a.kserveRoute || "").localeCompare(b.kserveStatus || b.kserveRoute || "") * dir
        case "assignedTo":
          return (a.assignedTo || "").localeCompare(b.assignedTo || "") * dir
        case "totalFollowups":
          return ((a.totalFollowups || 0) - (b.totalFollowups || 0)) * dir
        case "tatMinutes":
          return ((a.tatMinutes ?? -1) - (b.tatMinutes ?? -1)) * dir
        case "leadStatus":
          return (a.leadStatus || "").localeCompare(b.leadStatus || "") * dir
        case "finalStatus":
          return (a.finalStatus || "").localeCompare(b.finalStatus || "") * dir
        case "salesPerson":
          return (a.salesPerson || a.currentHolder || a.assignedTo || "").localeCompare(b.salesPerson || b.currentHolder || b.assignedTo || "") * dir
        default:
          return 0
      }
    })
    return base
  }, [results, isDefaultView, currentPage, pageSize, sortField, sortDir])

  async function handleSearchWithFilters(
    queryStr: string,
    company: CompanyFilter = companyFilter,
    datasource: string = datasourceFilter
  ) {
    if (!queryStr) return
    setIsSearching(true)
    setSearchError("")
    setIsDefaultView(false)
    setKpiSummary(null)
    setResults([])
    try {
      const res = await fetch(
        `/api/lead-journey?q=${encodeURIComponent(queryStr)}&company=${encodeURIComponent(company)}&datasource=${encodeURIComponent(datasource)}`
      )
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Search failed")
      const list = data.results || []
      setResults(list)
      setTotalCount(list.length)
      setTotalPages(Math.max(1, Math.ceil(list.length / pageSize)))
      setCurrentPage(1)
    } catch (err: any) {
      setSearchError(err.message || "Failed to search")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!searchQuery.trim()) return
    await handleSearchWithFilters(searchQuery.trim(), companyFilter, datasourceFilter)
  }

  async function handleBulkSearch() {
    const ids = bulkText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) return
    setIsSearching(true)
    setSearchError("")
    setIsDefaultView(false)
    setResults([])
    try {
      const res = await fetch(`/api/lead-journey?ids=${encodeURIComponent(ids.join(","))}`)
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Bulk search failed")
      const list = data.results || []
      setResults(list)
      setTotalCount(list.length)
      setTotalPages(Math.max(1, Math.ceil(list.length / pageSize)))
      setCurrentPage(1)
    } catch (err: any) {
      setSearchError(err.message || "Failed to bulk search")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleViewJourney(lead: LeadJourney) {
    setSelectedLead(lead)
    // If followups are not loaded yet and lead has recorded followups, enrich details
    if (lead.followups.length === 0 && lead.totalFollowups > 0) {
      try {
        const res = await fetch(`/api/lead-journey?q=${encodeURIComponent(lead.leadId)}`)
        const data = await res.json()
        if (data.success && data.results?.[0]) {
          setSelectedLead(data.results[0])
        }
      } catch (err) {
        console.warn("Could not enrich lead journey:", err)
      }
    }
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string || ""
      // Extract first column values
      const ids = text.split("\n")
        .slice(1) // skip header
        .map(row => row.split(",")[0].trim().replace(/"/g, ""))
        .filter(Boolean)
      setBulkText(ids.join("\n"))
    }
    reader.readAsText(file)
  }

  function exportCSV() {
    if (results.length === 0) return
    const headers = ["Lead ID", "Client Name", "Mobile", "Email", "Company", "Datasource", "Verified Source", "Enquiry Date & Time", "Buffer Arrival", "TAT", "KServe Status", "Assigned To", "Follow-ups", "Last Followup", "Lead Status", "Final Status", "Sales Person", "Conversion Amount"]
    const rows = results.map(r => [
      r.leadId, r.clientName, r.mobile, r.email,
      r.company, r.dataSource || r.leadSource, r.verifiedSource || "",
      r.enquiryDate || r.bufferArrival, r.bufferArrival, r.tatLabel || "",
      r.kserveStatus || "Direct Route", r.assignedTo,
      r.totalFollowups, r.lastFollowupDate,
      r.leadStatus || "",
      r.finalStatus, r.salesPerson || "",
      r.conversionAmount ?? ""
    ])
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `lead-search-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/55 group-hover/th:text-white transition-colors flex-shrink-0" />
    }
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" />
      : <ArrowDown className="h-3.5 w-3.5 text-amber-300 flex-shrink-0" />
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCcw className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    )
  }

  const totalKpiCurrent = kpiSummary?.totalLeads.current ?? totalCount
  const assignedPct = totalKpiCurrent > 0 && kpiSummary ? Math.round((kpiSummary.assignedLeads.current / totalKpiCurrent) * 100) : 0
  const contactedPct = totalKpiCurrent > 0 && kpiSummary ? Math.round((kpiSummary.contactedLeads.current / totalKpiCurrent) * 100) : 0
  const untouchedPct = totalKpiCurrent > 0 && kpiSummary ? Math.round((kpiSummary.untouchedLeads.current / totalKpiCurrent) * 100) : 0

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header + Compact Animated KPI Summary */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Lead Search Dashboard</h1>
              {companyFilter !== "ALL" && (
                <Badge variant="outline" className={`text-xs font-bold px-2.5 py-0.5 ${getCompanyBadgeStyle(companyFilter)}`}>
                  <Building2 className="h-3 w-3 mr-1" /> {companyFilter}
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Track full lead lifecycle — from buffer arrival to final outcome</p>
          </div>

          {/* Search Mode Tabs */}
          <div className="flex gap-2">
            <Button
              variant={!isBulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsBulkMode(false)}
            >
              <Search className="h-4 w-4 mr-2" /> Single Search
            </Button>
            <Button
              variant={isBulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsBulkMode(true)}
            >
              <Upload className="h-4 w-4 mr-2" /> Bulk / CSV Upload
            </Button>
          </div>
        </div>

        {/* Compact Animated Header KPI Strip with Previous Period Comparison */}
        {isDefaultView && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeaderKpiCard
              title="Total Leads"
              metric={kpiSummary?.totalLeads}
              comparisonLabel={kpiSummary?.comparisonLabel}
              icon={<Users className="h-4 w-4" />}
              accent="blue"
              loading={isLoadingDate}
              delayMs={0}
            />
            <HeaderKpiCard
              title="Assigned / Routed"
              metric={kpiSummary?.assignedLeads}
              comparisonLabel={kpiSummary?.comparisonLabel}
              subLabel={kpiSummary ? `${assignedPct}%` : undefined}
              icon={<UserCheck className="h-4 w-4" />}
              accent="indigo"
              loading={isLoadingDate}
              delayMs={60}
            />
            <HeaderKpiCard
              title="Contacted / Follow-up"
              metric={kpiSummary?.contactedLeads}
              comparisonLabel={kpiSummary?.comparisonLabel}
              subLabel={kpiSummary ? `${contactedPct}%` : undefined}
              icon={<PhoneCall className="h-4 w-4" />}
              accent="emerald"
              loading={isLoadingDate}
              delayMs={120}
            />
            <HeaderKpiCard
              title="Pending / Untouched"
              metric={kpiSummary?.untouchedLeads}
              comparisonLabel={kpiSummary?.comparisonLabel}
              subLabel={kpiSummary ? `${untouchedPct}%` : undefined}
              icon={<Hourglass className="h-4 w-4" />}
              accent="amber"
              invertTrend
              loading={isLoadingDate}
              delayMs={180}
            />
          </div>
        )}

        {/* Search Panel + Date Range Filter Row */}
        {!isBulkMode ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-600" /> Single Record Search & Date Filter
                  </CardTitle>
                  <CardDescription>Search by Lead ID, Mobile, Name, or browse incoming leads by date range</CardDescription>
                </div>
                {/* Active Date Preset Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300 flex items-center gap-1.5 px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    <span>Active Filter: <strong className="text-slate-900 font-bold">{getPresetDisplayName(datePreset)}</strong></span>
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                {/* Search Form (Left Side) */}
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by Lead ID (e.g. FB_AHV-...), Mobile (9876543210), or Name..."
                    className="flex-1 h-10 text-sm"
                    disabled={isSearching}
                  />
                  <Button type="submit" disabled={isSearching || !searchQuery.trim()} className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white">
                    {isSearching ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    <span className="ml-1.5 hidden sm:inline font-semibold">Search</span>
                  </Button>
                </form>

                {/* Divider on large screens */}
                <div className="hidden lg:block w-px h-8 bg-slate-200" />

                {/* Date Presets Selector (Right Side of Search Section) */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date:
                  </span>
                  {[
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "last7days", label: "Last 7 Days" },
                    { key: "thisMonth", label: "This Month" },
                    { key: "lastMonth", label: "Last Month" },
                    { key: "custom", label: "Custom" },
                  ].map(p => {
                    const isActive = datePreset === p.key && isDefaultView
                    const isCurrentLoading = isLoadingDate && datePreset === p.key
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handlePresetChange(p.key as any)}
                        disabled={isLoadingDate}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-xs font-bold"
                            : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                        } ${isLoadingDate ? "cursor-wait opacity-80" : ""}`}
                      >
                        {isCurrentLoading && <RefreshCcw className="h-3 w-3 animate-spin text-white" />}
                        <span>{p.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Company & Datasource Filter Row */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Company Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" /> Company:
                    </span>
                    {(
                      [
                        { key: "ALL", label: "All Companies", activeClass: "bg-slate-800 text-white" },
                        { key: "KAPPL", label: "KAPPL", activeClass: "bg-blue-600 text-white" },
                        { key: "KTAHV", label: "KTAHV", activeClass: "bg-emerald-600 text-white" },
                        { key: "VILLARAAG", label: "VILLARAAG", activeClass: "bg-purple-600 text-white" },
                        { key: "KAC", label: "KAC", activeClass: "bg-amber-600 text-white" },
                      ] as const
                    ).map(c => {
                      const isActive = companyFilter === c.key
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => handleCompanyChange(c.key)}
                          disabled={isLoadingDate || isSearching}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                            isActive
                              ? `${c.activeClass} shadow-xs font-bold`
                              : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                          } ${isLoadingDate ? "cursor-wait opacity-80" : ""}`}
                        >
                          <span>{c.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Datasource Filter (Beside Company Filter) */}
                  <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 pl-2 pr-1 flex items-center gap-1">
                      <Database className="h-3.5 w-3.5 text-slate-400" /> Datasource:
                    </span>
                    <select
                      aria-label="Filter by Datasource"
                      value={datasourceFilter}
                      onChange={e => handleDatasourceChange(e.target.value)}
                      disabled={isLoadingDate || isSearching}
                      className="h-7 max-w-[230px] rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-60"
                    >
                      <option value="ALL">All Datasources</option>
                      {availableDatasources.map(src => (
                        <option key={src} value={src}>
                          {src}
                        </option>
                      ))}
                      {datasourceFilter !== "ALL" && !availableDatasources.includes(datasourceFilter) && (
                        <option value={datasourceFilter}>{datasourceFilter}</option>
                      )}
                    </select>
                  </div>
                </div>

                {(companyFilter !== "ALL" || datasourceFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyFilter("ALL")
                      setDatasourceFilter("ALL")
                      if (isDefaultView) {
                        loadDateLeads(datePreset, 1, pageSize, startDate, endDate, "ALL", "ALL")
                      } else if (searchQuery.trim()) {
                        handleSearchWithFilters(searchQuery.trim(), "ALL", "ALL")
                      }
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Custom Date Pickers (Shown when Custom is selected) */}
              {datePreset === "custom" && isDefaultView && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Custom Date Range:
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">From:</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="h-8 w-36 text-xs bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 font-medium">To:</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="h-8 w-36 text-xs bg-white"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3"
                    onClick={handleApplyCustomDate}
                    disabled={!startDate || !endDate || isLoadingDate}
                  >
                    Apply Filter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bulk ID Search</CardTitle>
              <CardDescription>Paste Lead IDs (one per line or comma-separated), or upload a CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full h-32 border border-slate-200 rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={"FB_AHV-1086456400903661\n5bc2452b-88e2-...\n9876543210"}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                <Button
                  size="sm"
                  onClick={handleBulkSearch}
                  disabled={isSearching || !bulkText.trim()}
                >
                  {isSearching ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search {bulkText.split(/[\n,]+/).filter(Boolean).length > 0 && `(${bulkText.split(/[\n,]+/).filter(Boolean).length} IDs)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{searchError}</p>
          </div>
        )}

        {/* Loading Date Range Leads */}
        {isLoadingDate && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <RefreshCcw className="h-7 w-7 animate-spin text-blue-600" />
            <p className="text-sm font-medium">Loading {getPresetDisplayName(datePreset)} leads...</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-slate-900">
                      {isDefaultView ? (
                        <>📅 {getPresetDisplayName(datePreset)}'s Leads</>
                      ) : (
                        <>🔍 Search Results</>
                      )}
                      <span className="text-sm font-normal text-slate-500 ml-1.5">
                        ({totalCount.toLocaleString("en-IN")} Total Leads)
                      </span>
                    </CardTitle>
                    {isDefaultView ? (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold">
                        {getPresetDisplayName(datePreset)}
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-blue-600 hover:text-blue-800 font-semibold"
                        onClick={() => {
                          setSearchQuery("")
                          setBulkText("")
                          handlePresetChange("today")
                        }}
                      >
                        ← Back to Today's Leads
                      </Button>
                    )}
                  </div>
                  <CardDescription className="mt-1 text-xs">
                    {isDefaultView
                      ? `Showing page ${currentPage} of ${totalPages} (${pageSize} leads/page). Click 'View Journey' to see full lifecycle timeline.`
                      : `Found ${results.length} results matching query. Click 'View Journey' to see full lifecycle timeline.`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isDefaultView && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => loadDateLeads(datePreset, currentPage, pageSize, startDate, endDate, companyFilter, datasourceFilter)} 
                      disabled={isLoadingDate}
                    >
                      <RefreshCcw className={`h-4 w-4 mr-2 ${isLoadingDate ? "animate-spin" : ""}`} /> Refresh
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative min-h-[220px]">
              {/* Visual Loading Overlay when switching dates, company, datasource or pages */}
              {isLoadingDate && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] z-40 flex flex-col items-center justify-center gap-2">
                  <RefreshCcw className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    Loading {getPresetDisplayName(datePreset)} {companyFilter !== "ALL" ? `(${companyFilter}) ` : ""}{datasourceFilter !== "ALL" ? `· ${datasourceFilter} ` : ""}leads...
                  </p>
                </div>
              )}
              <div className="relative w-full max-h-[68vh] overflow-auto journey-scroll">
                <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#231649] text-white">
                      {/* Frozen Col 1: Lead ID (locked exact 160px) */}
                      <th
                        onClick={() => handleSort("leadId")}
                        className="group/th sticky top-0 left-0 z-40 bg-[#231649] p-0 text-left text-xs font-bold text-white whitespace-nowrap border-b border-r border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors w-[160px] min-w-[160px] max-w-[160px] overflow-hidden"
                      >
                        <div className="w-[160px] max-w-[160px] px-3 py-3 flex items-center justify-between gap-1.5 overflow-hidden">
                          <span className="truncate">Lead ID</span>
                          {renderSortIcon("leadId")}
                        </div>
                      </th>
                      {/* Frozen Col 2: Client (Name, Mobile, Email — locked exact 260px at left-160px) */}
                      <th
                        onClick={() => handleSort("clientName")}
                        className="group/th sticky top-0 left-[160px] z-40 bg-[#231649] p-0 text-left text-xs font-bold text-white whitespace-nowrap border-b border-r border-[#432c84] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.32)] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors w-[260px] min-w-[260px] max-w-[260px] overflow-hidden"
                      >
                        <div className="w-[260px] max-w-[260px] px-3 py-3 flex items-center justify-between gap-1.5 overflow-hidden">
                          <span className="truncate">Client (Name · Mobile · Email)</span>
                          {renderSortIcon("clientName")}
                        </div>
                      </th>
                      {/* Col 3: Company */}
                      <th
                        onClick={() => handleSort("company")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[110px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Company</span>
                          {renderSortIcon("company")}
                        </div>
                      </th>
                      {/* Col 4: Datasource */}
                      <th
                        onClick={() => handleSort("dataSource")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[190px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Datasource</span>
                          {renderSortIcon("dataSource")}
                        </div>
                      </th>
                      {/* Col 5: Enquiry Date & Time */}
                      <th
                        onClick={() => handleSort("enquiryDate")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[160px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Enquiry Date &amp; Time</span>
                          {renderSortIcon("enquiryDate")}
                        </div>
                      </th>
                      {/* Col 6: Buffer Arrival */}
                      <th
                        onClick={() => handleSort("bufferArrival")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[155px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Buffer Arrival</span>
                          {renderSortIcon("bufferArrival")}
                        </div>
                      </th>
                      {/* Col 7: TAT (Moved right of Buffer Arrival) */}
                      <th
                        onClick={() => handleSort("tatMinutes")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[115px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>TAT</span>
                          {renderSortIcon("tatMinutes")}
                        </div>
                      </th>
                      {/* Col 8: KServe Status */}
                      <th
                        onClick={() => handleSort("kserveStatus")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[140px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>KServe Status</span>
                          {renderSortIcon("kserveStatus")}
                        </div>
                      </th>
                      {/* Col 9: Assigned To */}
                      <th
                        onClick={() => handleSort("assignedTo")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[135px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Assigned To</span>
                          {renderSortIcon("assignedTo")}
                        </div>
                      </th>
                      {/* Col 10: Follow-ups */}
                      <th
                        onClick={() => handleSort("totalFollowups")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[130px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Follow-ups</span>
                          {renderSortIcon("totalFollowups")}
                        </div>
                      </th>
                      {/* Col 11: Lead Status */}
                      <th
                        onClick={() => handleSort("leadStatus")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[125px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Lead Status</span>
                          {renderSortIcon("leadStatus")}
                        </div>
                      </th>
                      {/* Col 12: Final Status */}
                      <th
                        onClick={() => handleSort("finalStatus")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[165px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Final Status</span>
                          {renderSortIcon("finalStatus")}
                        </div>
                      </th>
                      {/* Col 13: Sales Person */}
                      <th
                        onClick={() => handleSort("salesPerson")}
                        className="group/th sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] cursor-pointer select-none hover:bg-[#2f1e61] transition-colors min-w-[155px]"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span>Sales Person</span>
                          {renderSortIcon("salesPerson")}
                        </div>
                      </th>
                      {/* Col 14: Actions */}
                      <th className="sticky top-0 z-30 bg-[#231649] px-3 py-3 text-left text-xs font-bold text-white whitespace-nowrap border-b border-[#37246e] min-w-[135px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedResults.map((lead, i) => (
                      <tr key={lead.leadId || i} className="group bg-white hover:bg-[#f2f6ff] text-sm transition-colors">
                        {/* Frozen Cell 1: Lead ID (100% opaque solid background + exact 160px inner clipping wrapper) */}
                        <td
                          className="sticky left-0 z-20 bg-white group-hover:bg-[#f2f6ff] p-0 border-b border-r border-slate-200 w-[160px] min-w-[160px] max-w-[160px] overflow-hidden transition-colors"
                          title={lead.leadId}
                        >
                          <div className="w-[160px] max-w-[160px] px-3 py-2.5 font-mono text-xs text-slate-700 overflow-hidden text-ellipsis whitespace-nowrap">
                            {lead.leadId || "—"}
                          </div>
                        </td>
                        {/* Frozen Cell 2: Client Name + Mobile + Email (100% opaque solid background + exact 260px inner clipping wrapper) */}
                        <td className="sticky left-[160px] z-20 bg-white group-hover:bg-[#f2f6ff] p-0 border-b border-r border-slate-300 shadow-[4px_0_8px_-2px_rgba(15,23,42,0.12)] w-[260px] min-w-[260px] max-w-[260px] overflow-hidden transition-colors">
                          <div className="w-[260px] max-w-[260px] px-3 py-2.5 space-y-0.5 overflow-hidden">
                            <p className="font-semibold text-slate-900 text-xs truncate" title={lead.clientName || ""}>
                              {lead.clientName || "—"}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 overflow-hidden">
                              <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="font-medium truncate">{lead.mobile || "—"}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 overflow-hidden">
                                <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate" title={lead.email}>{lead.email}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Cell 3: Company */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {lead.company ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${getCompanyBadgeStyle(lead.company)}`}>
                              {lead.company}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        {/* Cell 4: Datasource */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 max-w-[230px] bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <div className="space-y-1 min-w-0">
                            <p
                              className="text-xs text-slate-700 font-medium truncate"
                              title={lead.dataSource || lead.leadSource || ""}
                            >
                              {lead.dataSource || lead.leadSource || "—"}
                            </p>
                            {lead.verifiedSource && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold">
                                <Database className="h-2.5 w-2.5 text-slate-400" />
                                {lead.verifiedSource}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Cell 5: Enquiry Date & Time */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 text-xs text-slate-700 font-medium whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {formatDate(lead.enquiryDate || lead.bufferArrival)}
                        </td>
                        {/* Cell 6: Buffer Arrival */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 text-xs text-slate-500 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {formatDate(lead.bufferArrival)}
                        </td>
                        {/* Cell 7: TAT (Moved right of Buffer Arrival) */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTatBadgeStyle(lead.tatMinutes, lead.tatStage)}`}>
                              <Clock className="h-3 w-3" />
                              {lead.tatLabel || "—"}
                            </span>
                            {lead.tatStage && (
                              <span className="text-[10px] text-slate-400 font-medium pl-0.5">
                                {lead.tatStage}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Cell 8: KServe Status */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {getKserveStatusBadge(lead.kserveStatus, lead.kserveRoute)}
                        </td>
                        {/* Cell 9: Assigned To */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 text-xs text-slate-700 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <p className="font-medium text-slate-800">{lead.assignedTo || "—"}</p>
                        </td>
                        {/* Cell 10: Follow-ups */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <div className="flex items-center gap-1.5">
                            <PhoneCall className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-800">{lead.totalFollowups}</span>
                          </div>
                          {lead.lastFollowupDate && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(lead.lastFollowupDate)}</p>
                          )}
                        </td>
                        {/* Cell 11: Lead Status */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] border ${getLeadStatusBadgeStyle(lead.leadStatus)}`}>
                            {lead.leadStatus || "New"}
                          </span>
                        </td>
                        {/* Cell 12: Final Status */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {lead.finalStatus ? (
                            <span className={`text-xs px-2.5 py-1 rounded-full border inline-block whitespace-nowrap ${getFinalStatusColor(lead.finalStatus)}`}>
                              {lead.finalStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          )}
                          {lead.conversionAmount && lead.conversionAmount > 0 && (
                            <p className="text-xs text-emerald-600 font-bold mt-0.5">
                              ₹{lead.conversionAmount.toLocaleString("en-IN")}
                            </p>
                          )}
                        </td>
                        {/* Cell 13: Sales Person (Actual connected DialShree person — never campaign bucket) */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 text-xs text-slate-700 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          {lead.salesPerson ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                                <span className="font-bold text-slate-900">
                                  {lead.salesPerson}
                                </span>
                              </div>
                              {lead.assignedTo && lead.salesPerson !== lead.assignedTo && (
                                <p className="text-[10px] text-slate-400 pl-5">Queue: {lead.assignedTo}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">—</span>
                          )}
                        </td>
                        {/* Cell 14: Actions */}
                        <td className="px-3 py-2.5 border-b border-slate-200/80 whitespace-nowrap bg-white group-hover:bg-[#f2f6ff] transition-colors">
                          <Button
                            size="sm"
                            className="text-xs h-7 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white border-0 shadow-xs hover:shadow-md transition-all font-semibold"
                            onClick={() => handleViewJourney(lead)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View Journey
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Record Count, 50/100/200 Select & Paging Navigation */}
              <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Record Range Summary */}
                <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-900 font-bold">{totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{" "}
                    <strong className="text-slate-900 font-bold">{totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)}</strong> of{" "}
                    <strong className="text-slate-900 font-bold">{totalCount.toLocaleString("en-IN")}</strong> leads
                  </span>
                  {isLoadingDate && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-semibold ml-2">
                      <RefreshCcw className="h-3 w-3 animate-spin" /> Loading page...
                    </span>
                  )}
                </div>

                {/* Right: Page Size Selector (50/100/200) + Pagination Navigation */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Rows per page selector: 50 / 100 / 200 */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Rows:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                      {[50, 100, 200].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handlePageSizeChange(size)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                            pageSize === size
                              ? "bg-slate-900 text-white shadow-xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Paging Navigation Buttons */}
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-600 disabled:opacity-40 bg-white"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage <= 1 || isLoadingDate}
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>

                    {/* Previous Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs font-semibold text-slate-600 disabled:opacity-40 bg-white flex items-center gap-1"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || isLoadingDate}
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Prev</span>
                    </Button>

                    {/* Page indicator */}
                    <div className="px-3 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-md shadow-2xs min-w-[95px] text-center">
                      Page <span className="text-blue-600 font-extrabold">{currentPage}</span> of{" "}
                      <span className="text-slate-900 font-extrabold">{totalPages}</span>
                    </div>

                    {/* Next Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-xs font-semibold text-slate-600 disabled:opacity-40 bg-white flex items-center gap-1"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || isLoadingDate}
                      title="Next Page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Last Page */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-600 disabled:opacity-40 bg-white"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage >= totalPages || isLoadingDate}
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isSearching && !isLoadingDate && results.length === 0 && !searchError && (
          <div className="text-center py-16 text-slate-400">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">Search for a lead to see its full journey, or check today's leads</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => handlePresetChange("today")}
            >
              <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Check Today's Leads
            </Button>
          </div>
        )}

        {/* Journey Modal */}
        {selectedLead && (
          <TimelineModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
        )}
      </div>
    </DashboardLayout>
  )
}
