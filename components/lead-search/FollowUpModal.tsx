"use client"

import React, { useMemo } from "react"
import { X, Mic, ExternalLink, Clock, Calendar, User, Phone, Mail, Building, Tag, Loader2, Target, AlertCircle, MapPin, Hash, ChevronDown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { FollowUp } from "@/hooks/Use-call-history"

interface Lead {
  leadId?: string | number
  id?: string | number
  lead_id?: string | number
  clientName?: string
  name?: string
  currentEnquiryStatus?: string
  phone?: string
  email?: string
  city?: string
  state?: string
  campaignName?: string
  intent?: string
  priority?: string
  nextFollowUpDate?: string
  plannedFollowUpDate?: string
  createdAt?: string
  updatedAt?: string
  agent_Id?: string
}

interface FollowUpModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  followUps?: FollowUp[]
  isLoading?: boolean
  error?: string | null
}

const enquiryStatusColors: Record<string, string> = {
  "Not Called": "bg-slate-100 text-slate-700 border-slate-300",
  "Not Connected": "bg-cyan-100 text-cyan-700 border-cyan-300",
  Pending: "bg-amber-100 text-amber-700 border-amber-300",
  Cold: "bg-red-100 text-red-700 border-red-300",
  "First Followup": "bg-blue-100 text-blue-700 border-blue-300",
  Warm: "bg-amber-100 text-amber-700 border-amber-300",
  Hot: "bg-orange-100 text-orange-700 border-orange-300",
  "Under Conversion": "bg-purple-100 text-purple-700 border-purple-300",
  Converted: "bg-green-100 text-green-700 border-green-300",
}

function getDarkStatusClass(status?: string) {
  const base = enquiryStatusColors[status || ""] || ""

  if (base.includes("red")) return "bg-red-600 text-white"
  if (base.includes("green")) return "bg-green-600 text-white"
  if (base.includes("amber")) return "bg-amber-600 text-white"
  if (base.includes("orange")) return "bg-orange-600 text-white"
  if (base.includes("blue")) return "bg-blue-600 text-white"
  if (base.includes("cyan")) return "bg-cyan-600 text-white"
  if (base.includes("purple")) return "bg-purple-600 text-white"
  if (base.includes("slate")) return "bg-slate-600 text-white"

  return "bg-slate-600 text-white"
}

function formatDateTime(date: string, time?: string): string {
  if (!date || date === "") {
    return "Invalid Date"
  }

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return "Invalid Date"
  }

  const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  const timeStr = time || d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  return `${dateStr}, ${timeStr}`
}

function formatDate(date: string): string {
  if (!date || date === "") {
    return "Invalid Date"
  }

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return "Invalid Date"
  }

  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function mergeDateAndTime(date: string, time?: string) {
  if (!date || date === "") {
    return new Date().toISOString()
  }

  const d = new Date(date)

  if (isNaN(d.getTime())) {
    console.warn(`Invalid date provided to mergeDateAndTime: "${date}"`)
    return new Date().toISOString()
  }

  if (!time) {
    return d.toISOString()
  }

  const [timePart, modifier] = time.split(" ")
  if (!timePart) {
    return d.toISOString()
  }

  const timeParts = timePart.split(":").map(Number)
  let hours = timeParts[0] || 0
  let minutes = timeParts[1] || 0

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`Invalid time format provided to mergeDateAndTime: "${time}"`)
    return d.toISOString()
  }

  // Convert modifier to uppercase to handle both "PM"/"pm" and "AM"/"am"
  const modifierUpper = modifier ? modifier.trim().toUpperCase() : ""

  if (modifierUpper === "PM" && hours < 12) hours += 12
  if (modifierUpper === "AM" && hours === 12) hours = 0

  d.setHours(hours, minutes, 0, 0)

  if (isNaN(d.getTime())) {
    console.warn(`Invalid date after time merge: date="${date}", time="${time}"`)
    return new Date().toISOString()
  }

  return d.toISOString()
}

function getAccurateDelayInfo(plannedDate: string, actualDate?: string) {
  const planned = new Date(plannedDate)
  const actual = actualDate ? new Date(actualDate) : new Date()

  if (isNaN(planned.getTime())) {
    return {
      text: "Invalid Date",
      color: "text-slate-700",
      bg: "bg-slate-50 border-slate-200",
    }
  }

  if (isNaN(actual.getTime())) {
    return {
      text: "Invalid Date",
      color: "text-slate-700",
      bg: "bg-slate-50 border-slate-200",
    }
  }

  // FIXED: Should be Actual - Planned (not Planned - Actual)
  const diffMs = actual.getTime() - planned.getTime()
  const absMs = Math.abs(diffMs)

  const totalSeconds = Math.floor(absMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  // Format as HH:MM:SS
  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')

  const displayText = `${hoursStr}:${minutesStr}:${secondsStr}`

  // If actual < planned (early/before planned time)
  if (diffMs < 0) {
    return {
      text: `Early by ${displayText}`,
      color: "text-green-700 border-green-300",
      bg: "bg-green-50",
    }
  }
  // If actual > planned (late/delayed)
  else if (diffMs > 0) {
    return {
      text: `Delayed by ${displayText}`,
      color: "text-red-700 border-red-300",
      bg: "bg-red-50",
    }
  }
  // If exactly on time
  else {
    return {
      text: "On Time",
      color: "text-green-700 border-green-300",
      bg: "bg-green-50",
    }
  }
}

export default function FollowUpModal({ isOpen, onClose, lead, followUps = [], isLoading = false, error = null }: FollowUpModalProps) {
  const [showLeadDetails, setShowLeadDetails] = React.useState(false)

  // Calculate total follow-ups and latest status (must be called before any returns)
  const followUpSummary = useMemo(() => {
    if (!followUps || followUps.length === 0) return null

    return {
      totalCount: followUps.length,
      latestStatus: followUps[followUps.length - 1].enquiryStatus
    }
  }, [followUps])

  // Calculate delay info for no-history case (must be before any early returns)
  const plannedDate = lead?.nextFollowUpDate || lead?.plannedFollowUpDate || lead?.createdAt || lead?.updatedAt

  const noHistoryDelayInfo = useMemo(() => {
    if (!plannedDate) {
      return {
        text: "—",
        color: "text-slate-700",
        bg: "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300"
      }
    }

    const planned = new Date(plannedDate)
    const now = new Date()

    if (isNaN(planned.getTime())) {
      return {
        text: "Invalid Date",
        color: "text-slate-700",
        bg: "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300"
      }
    }

    const diffMs = now.getTime() - planned.getTime()
    const absMs = Math.abs(diffMs)

    const totalSeconds = Math.floor(absMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const timeStr = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    // If planned time is in future (negative diff)
    if (diffMs < 0) {
      return {
        text: `Due in ${timeStr}`,
        color: "text-blue-700",
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300"
      }
    }

    // If overdue
    if (hours >= 1) {
      return {
        text: `Overdue ${timeStr}`,
        color: "text-red-700",
        bg: "bg-gradient-to-br from-red-50 to-red-100 border-red-300"
      }
    }

    // Less than 1 hour overdue
    return {
      text: `Overdue ${timeStr}`,
      color: "text-orange-700",
      bg: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300"
    }
  }, [plannedDate])

  if (!lead) {
    return null
  }
  // Get the latest enquiry status from followUps or fallback to lead status
  const latestEnquiryStatus = followUps.length > 0
    ? followUps[followUps.length - 1].enquiryStatus
    : lead.currentEnquiryStatus || "Not Called"

  const displayStatus = latestEnquiryStatus

  const currentStatusClass =
    enquiryStatusColors[displayStatus] ||
    enquiryStatusColors["Not Called"]

  const clientName =
    lead.clientName ||
    lead.name ||
    "Unknown Lead"

  const leadId =
    lead.leadId ||
    lead.id ||
    lead.lead_id ||
    "N/A"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl w-[98vw] md:w-[95vw] h-[95vh] md:h-[90vh] flex flex-col p-0 overflow-hidden [&>button]:hidden">

        {/* Header - Compact Single Row Layout */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left Side - Call History Title */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-semibold text-white">Call History</DialogTitle>
                <p className="text-xs sm:text-sm text-slate-300">
                  {isLoading ? "Loading..." : `${followUps.length} call(s) recorded`}
                </p>
              </div>
            </div>

            {/* Middle - Status and Follow-up Summary */}
            {followUpSummary && (
              <div className="hidden md:flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/20">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/70 font-medium">Status:</span>
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${enquiryStatusColors[followUpSummary.latestStatus] || enquiryStatusColors["Cold"]} border shadow-sm`}>
                    {followUpSummary.latestStatus}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-white/30"></div>

                {/* Follow-up Count */}
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-white/80" />
                  <span className="text-sm font-bold text-white">{followUpSummary.totalCount}</span>
                  <span className="text-xs text-white/70">Follow Up{followUpSummary.totalCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}

            {/* Right Side - Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-slate-600 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>

          {/* Mobile Only - Status and Follow-up Summary (Below on small screens) */}
          {followUpSummary && (
            <div className="md:hidden flex items-center gap-2 mt-3 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
              {/* Status Badge */}
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-xs text-white/70 font-medium">Status:</span>
                <span className={`px-2 py-1 rounded-md text-xs font-bold ${enquiryStatusColors[followUpSummary.latestStatus] || enquiryStatusColors["Cold"]} border shadow-sm`}>
                  {followUpSummary.latestStatus}
                </span>
              </div>

              {/* Divider */}
              <div className="h-4 w-px bg-white/30"></div>

              {/* Follow-up Count */}
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-white/80" />
                <span className="text-sm font-bold text-white">{followUpSummary.totalCount}</span>
                <span className="text-xs text-white/70">Follow Up{followUpSummary.totalCount > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>

        {/* Lead Details Header - Collapsible on Mobile */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-b-2 border-slate-200">
          {/* Compact View - Always visible */}
          <div className="px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800">{clientName}</h3>
                  {/* <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-sm border ${currentStatusClass} whitespace-nowrap`}>
                    {displayStatus}
                  </span> */}
                </div>
              </div>

              {/* Toggle Button - Mobile Only */}
              <button
                onClick={() => setShowLeadDetails(!showLeadDetails)}
                className="md:hidden flex items-center gap-1 px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-700">Details</span>
                <ChevronDown className={`h-4 w-4 text-slate-700 transition-transform ${showLeadDetails ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* Expandable Details - Mobile: Collapsible, Desktop: Always visible */}
          <div className={`overflow-hidden transition-all duration-300 ${showLeadDetails ? 'max-h-[500px]' : 'max-h-0 md:max-h-[500px]'}`}>
            <div className="px-3 sm:px-6 pb-3 sm:pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* Lead ID Card */}
                <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border-2 border-blue-200">
                  <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Lead ID</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{leadId}</p>
                </div>

                {/* Phone Card */}
                {lead.phone && (
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border-2 border-green-200">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Phone</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">{lead.phone}</p>
                  </div>
                )}

                {/* Priority Card */}
                <div className={`bg-white rounded-lg p-2 sm:p-3 shadow-sm border-2 ${lead.priority?.toLowerCase() === "high" ? "border-red-200" : lead.priority?.toLowerCase() === "medium" ? "border-amber-200" : lead.priority ? "border-emerald-200" : "border-slate-200"}`}>
                  <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <AlertCircle className={`h-3 w-3 sm:h-4 sm:w-4 ${lead.priority?.toLowerCase() === "high" ? "text-red-600" : lead.priority?.toLowerCase() === "medium" ? "text-amber-600" : lead.priority ? "text-emerald-600" : "text-slate-400"}`} />
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Priority</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-bold ${lead.priority?.toLowerCase() === "high" ? "text-red-700" : lead.priority?.toLowerCase() === "medium" ? "text-amber-700" : lead.priority ? "text-emerald-700" : "text-slate-400 italic"}`}>
                    {lead.priority ? lead.priority.toUpperCase() : "N/A"}
                  </p>
                </div>

                {/* Intent Card */}
                <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border-2 border-indigo-200">
                  <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Intent</span>
                  </div>
                  <p className={`text-xs sm:text-sm font-bold truncate ${lead.priority ? "text-indigo-700" : "text-slate-400 italic"}`}>
                    {lead.priority || "N/A"}
                  </p>
                </div>

                {/* Campaign Card */}
                {lead.campaignName && (
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border-2 border-orange-200 col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                      <Building className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase">Campaign</span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{lead.campaignName}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Follow-up Summary Section - COMPLETELY HIDDEN */}
        {/* This entire section is removed as per requirement */}

        {/* Content Area - Scrollable & Responsive */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 bg-slate-50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-slate-400" />
              <p className="text-sm sm:text-base text-slate-500">Loading call history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center">
                <X className="h-8 w-8 sm:h-10 sm:w-10 text-red-600" />
              </div>
              <p className="text-sm sm:text-base text-red-600 font-semibold">Error loading data</p>
              <p className="text-xs sm:text-sm text-slate-500 text-center max-w-md">{error}</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-full flex items-center justify-center shadow-sm">
                  <Phone className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm sm:text-base text-slate-700 font-semibold mb-1">No Call History</p>
                  <p className="text-xs sm:text-sm text-slate-500">No follow-up calls recorded for this lead yet.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative pl-4 sm:pl-8">
              <div className="absolute left-[7px] sm:left-[15px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-400 via-blue-300 to-slate-300" />

              {[...followUps].reverse().map((followUp, index) => {
                const originalIndex = followUps.length - 1 - index
                const statusClass = enquiryStatusColors[followUp.enquiryStatus] || enquiryStatusColors["Cold"]
                // actualDate already contains the full ISO timestamp from API
                // No need to merge with time - that would strip seconds!
                const actualDateTime = followUp.actualDate

                const delayInfo = getAccurateDelayInfo(
                  followUp.plannedDate,
                  actualDateTime
                )

                return (
                  <div key={`${followUp.actualDate}-${originalIndex}`} className="relative mb-6 sm:mb-8 last:mb-0">
                    <div
                      className={`absolute left-[-11px] sm:left-[-23px] top-3 sm:top-4 w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 sm:ring-4 ring-white border-2 border-white z-10 ${followUp.enquiryStatus === "Converted" || followUp.enquiryStatus === "Hot"
                        ? "bg-green-500"
                        : followUp.enquiryStatus === "Warm" || followUp.enquiryStatus === "First Followup"
                          ? "bg-amber-500"
                          : followUp.enquiryStatus === "Cold"
                            ? "bg-red-500"
                            : followUp.enquiryStatus === "Not Connected"
                              ? "bg-cyan-500"
                              : "bg-slate-400"
                        }`}
                    />

                    <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg sm:rounded-xl border-2 border-slate-200 shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center text-slate-700 font-bold text-xs sm:text-sm">
                            {originalIndex + 1}
                          </span>

                          <div>
                            <p className="text-xs sm:text-sm text-white font-bold flex items-center gap-2">
                              Follow-up {originalIndex + 1}
                              <span className="text-[10px] sm:text-xs text-slate-300 font-normal">
                                {followUp.agentId}
                              </span>
                            </p>
                            <p className="text-[10px] sm:text-xs text-slate-300">
                              {formatDate(followUp.actualDate)} • {followUp.time}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm ${getDarkStatusClass(followUp.enquiryStatus)}`}>
                          {followUp.enquiryStatus}
                        </span>
                      </div>

                      {(followUp.callDuration || followUp.recordingUrl) && (
                        <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-slate-200">
                              <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-1 sm:mb-2">CALL DURATION</p>
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                {followUp.callDuration && (
                                  <div className="flex items-center gap-1 sm:gap-1.5 text-slate-600 bg-slate-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm font-semibold">{followUp.callDuration} min</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-slate-200">
                              <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mb-1 sm:mb-2">RECORDING</p>
                              {followUp.recordingUrl ? (
                                <a
                                  href={followUp.recordingUrl}
                                  download
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
                                >
                                  <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">Download Recording</span>
                                  <span className="sm:hidden">Download</span>
                                  <ExternalLink className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                                </a>
                              ) : (
                                <div className="flex items-center justify-center h-6 sm:h-8 text-xs sm:text-sm text-slate-400 italic">
                                  Not Available
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Agent Remarks */}
                      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200">
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-3 sm:p-4 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-400 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">💬</span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-amber-700 font-bold uppercase tracking-wide">Agent Remarks</p>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{followUp.agentRemarks}</p>
                          {followUp.nextFollowUpDate && (
                            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-amber-200 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                              <div className="flex items-center gap-1 sm:gap-1.5 bg-amber-100 px-2 py-1 rounded">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                                <span className="text-amber-700 font-semibold text-xs">
                                  Next: {formatDate(followUp.nextFollowUpDate)}
                                </span>
                              </div>
                              {followUp.nextAction && (
                                <span className="text-amber-700 text-xs">- {followUp.nextAction}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadata Row */}
                      <div className="px-3 sm:px-5 py-2 sm:py-3 bg-white border-b border-slate-200">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-slate-500 text-xs">Call Type:</span>
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 sm:py-1 rounded text-xs">
                              {followUp.followUpDoneIn}
                            </span>
                          </div>

                          {followUp.potentialValue > 0 && (
                            <>
                              <div className="hidden sm:block h-5 w-px bg-slate-300" />
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-slate-500 text-xs">Potential Value:</span>
                                <span className="font-bold text-green-700 bg-green-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-xs">
                                  ₹ {followUp.potentialValue.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timing Footer */}
                      <div className={`px-3 sm:px-5 py-2 sm:py-3 ${delayInfo.bg} border-t-2`}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 w-full sm:w-auto">
                            <div className="bg-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm border border-slate-200 w-full sm:w-auto">
                              <span className="text-[10px] sm:text-xs text-slate-500 block">Planned</span>
                              <span className="font-bold text-slate-700 text-xs sm:text-sm">
                                {formatDateTime(followUp.plannedDate)}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-slate-400">
                              <div className="w-8 border-t-2 border-dashed border-slate-300" />
                              <span className="text-xl">→</span>
                              <div className="w-8 border-t-2 border-dashed border-slate-300" />
                            </div>
                            <div className="bg-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-sm border border-slate-200 w-full sm:w-auto">
                              <span className="text-[10px] sm:text-xs text-slate-500 block">Actual</span>
                              <span className="font-bold text-slate-700 text-xs sm:text-sm">{formatDateTime(followUp.actualDate, followUp.time)}</span>
                            </div>
                          </div>
                          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm ${delayInfo.color} bg-white border-2 shadow-md w-full sm:w-auto text-center`}>
                            {delayInfo.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-white">
          {followUps.length === 0 && !isLoading && !error ? (
            <div className="px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 lg:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1">
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg px-3 py-2 shadow-sm border border-slate-200 w-full sm:w-auto">
                    <span className="text-[10px] sm:text-xs text-slate-500 block font-medium">Planned</span>
                    <span className="font-bold text-slate-700 text-xs sm:text-sm">
                      {plannedDate ? formatDateTime(plannedDate) : "—"}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-slate-400 self-center">
                    <div className="w-6 border-t-2 border-dashed border-slate-300" />
                    <span className="text-lg">→</span>
                    <div className="w-6 border-t-2 border-dashed border-slate-300" />
                  </div>
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg px-3 py-2 shadow-sm border border-slate-200 w-full sm:w-auto">
                    <span className="text-[10px] sm:text-xs text-slate-500 block font-medium">Actual</span>
                    <span className="font-bold text-slate-400 text-xs sm:text-sm italic">—</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className={`px-3 sm:px-4 py-2 rounded-lg font-bold text-xs sm:text-sm ${noHistoryDelayInfo.color} ${noHistoryDelayInfo.bg} border-2 shadow-md flex items-center justify-center gap-1.5`}>
                    <span className="text-base">⏳</span>
                    <span>{noHistoryDelayInfo.text}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="text-xs sm:text-sm font-semibold hover:bg-slate-100 border-slate-300 shadow-sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-3 sm:px-6 py-2 sm:py-3 flex justify-end">
              <Button variant="outline" onClick={onClose} className="text-xs sm:text-sm">Close</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
