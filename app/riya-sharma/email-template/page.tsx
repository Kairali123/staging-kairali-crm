"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  BotMessageSquare,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react"

import { emailReportTemplates } from "@/lib/email-report-template"
import { BackButton } from "@/components/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ---------------------------------------------------------------------------
// Types mirroring the shape returned by /api/riya-sharma/email-data
// ---------------------------------------------------------------------------
interface RiyaSharmaReportData {
  reportDate: string
  displayDate: string
  periodLabel: string
  totalComplaints: number
  allRecordsCount: number
  resolvedCount: number
  openCount: number
  overdueCount: number
  escalatedCount: number
  reopenedCount: number
  resolutionRate: number
  avgResolutionTatMin: number
  categories: Array<{ category: string; count: number; resolved: number; open: number }>
  subcategories: Array<{ subcategory: string; category: string; count: number; resolved: number; open: number }>
  departments: Array<{ department: string; count: number; resolved: number; open: number; overdue: number }>
  staff: Array<{ name: string; department: string; count: number; resolved: number; open: number; overdue: number }>
  repeatedComplaints: Array<{ name: string; roomnumber?: string; count: number }>
  escalations: Array<{ chatid: string; name: string; category: string; department: string; status: string }>
  recentComplaints: Array<{
    chatid: string
    name: string
    category: string
    subcategory: string
    department: string
    status: string
    date: string
  }>
}

interface ApiResponse {
  success: boolean
  data?: RiyaSharmaReportData
  html?: string
  error?: string
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function RiyaSharmaEmailTemplatePage() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/riya-sharma/email-data")
      const json: ApiResponse = await res.json()
      if (json.success && json.data) {
        setApiData(json)
      } else {
        setError(json.error || "Failed to load Riya Sharma AI report data")
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while fetching the report data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const data = apiData?.data
  const html = apiData?.html
  const displayDate = data?.displayDate || "Today"
  const periodLabel = data?.periodLabel || ""

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Header Banner (hidden when printing) ───────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 border-b border-violet-500 shadow-[0_8px_30px_rgba(124,58,237,0.35)] print:hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="w-full px-4 sm:px-6 lg:px-8 py-7 relative z-10">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton
              customBackUrl="/riya-sharma"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm"
            />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title & Icon */}
            <div className="space-y-2 w-full lg:w-auto">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <BotMessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                      {emailReportTemplates["riya-sharma-ai-report"].name}
                    </h1>
                    {data && data.totalComplaints > 0 ? (
                      <Badge className="border-emerald-300/60 bg-emerald-500/30 text-emerald-100 font-bold px-2.5 py-1 text-xs inline-flex items-center gap-1.5 shadow-sm backdrop-blur-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                        Data Loaded
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 font-medium text-xs">
                        {loading ? "Loading..." : "No Data"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-white/90 mt-1 font-medium">
                    Guest Relations • KTAHV •{" "}
                    <span className="font-bold">
                      {periodLabel || "Month-to-Date"}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
              {/* Period badge */}
              {displayDate && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-white/80" />
                  <span className="text-xs text-white font-semibold">{displayDate}</span>
                </div>
              )}

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={loading}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              {/* Manage Automation */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Link href="/settings/automation/email-triggers?report=riya-sharma-ai-report&scope=KTAHV">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Manage Automation
                </Link>
              </Button>

              {/* Open Dashboard */}
              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Link href="/riya-sharma">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Dashboard
                </Link>
              </Button>

              {/* Print / Save PDF */}
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Loading State ───────────────────────────────────────────────────── */}
      {loading && !apiData && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-9 w-9 animate-spin text-violet-600" />
          <p className="text-sm font-semibold text-slate-600">
            Loading live complaint data from Riya Sharma AI…
          </p>
        </div>
      )}

      {/* ─── Error State ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-auto max-w-[760px] flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-500" />
          <div>
            <p className="font-bold">Failed to load report data</p>
            <p className="mt-1 font-normal">{error}</p>
          </div>
        </div>
      )}

      {/* ─── KPI Summary Strip (shown above the email preview) ──────────────── */}
      {data && (
        <div className="mx-auto max-w-[760px] print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Complaints</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">{data.totalComplaints}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Resolved</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-800">{data.resolvedCount}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Open</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-900">{data.openCount}</div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-center shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Overdue</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-800">{data.overdueCount}</div>
            </div>
          </div>

          {/* Secondary stats row */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Resolution Rate:</span>
              <span className="text-emerald-700 font-bold">{data.resolutionRate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Escalated:</span>
              <span className="text-orange-700 font-bold">{data.escalatedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Reopened:</span>
              <span className="text-rose-700 font-bold">{data.reopenedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Avg Resolution TAT:</span>
              <span className="text-slate-900 font-bold">
                {data.avgResolutionTatMin > 0
                  ? `${Math.round(data.avgResolutionTatMin)} min`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Email HTML Preview ──────────────────────────────────────────────── */}
      {html && (
        <div
          className="mx-auto max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none print:max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {/* ─── Bottom Actions (hidden when printing) ───────────────────────────── */}
      {data && (
        <div className="mx-auto max-w-[760px] flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
          <Button asChild className="bg-violet-700 hover:bg-violet-800 text-white font-bold shadow-sm cursor-pointer">
            <Link href="/riya-sharma">
              <Mail className="mr-2 h-4 w-4" />
              Open Riya Sharma Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <Link href="/settings/automation/email-triggers?report=riya-sharma-ai-report&scope=KTAHV">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Configure Email Automation
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
