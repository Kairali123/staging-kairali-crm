'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Bot,
  RefreshCw,
  Download,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  Building2,
  MessageSquare,
  CheckCircle2,
  TrendingUp,
  IndianRupee,
  ArrowRight,
  Sparkles,
  Filter,
  Send,
  X,
} from 'lucide-react'
import type {
  AiBotId,
  AiChatReportData,
  AiCompanyCode,
  BotSheetSummary,
  ChatSheetRecord,
} from '@/lib/ai-chat-reports'

type ActiveTab = 'overview' | AiBotId
type RecordFilter = 'all' | 'enquiries' | 'converted' | 'dropped'

const PRESETS = [
  { key: 'weekly', label: 'Weekly (Last 7 Days)' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'today', label: 'Today' },
  { key: 'mtd', label: 'This Month (MTD)' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
] as const

const COMPANY_TABS: { key: 'ALL' | AiCompanyCode; label: string }[] = [
  { key: 'ALL', label: 'All Companies' },
  { key: 'KTAHV', label: 'KTAHV' },
  { key: 'KAPPL', label: 'KAPPL (Products)' },
  { key: 'VILLARAAG', label: 'Villa Raag' },
  { key: 'KATC', label: 'KATC (Centres)' },
]

const BOT_ACCENTS: Record<
  AiBotId,
  { badgeBg: string; badgeText: string; border: string; headerBg: string }
> = {
  'priya-sharma': {
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-800',
    border: 'border-t-emerald-600',
    headerBg: 'from-emerald-600 to-teal-700',
  },
  'product-priya-sharma': {
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-800',
    border: 'border-t-amber-500',
    headerBg: 'from-amber-600 to-orange-700',
  },
  'villaraag-anjali-menon': {
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-800',
    border: 'border-t-indigo-600',
    headerBg: 'from-indigo-600 to-blue-800',
  },
  'dr-aarika': {
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-800',
    border: 'border-t-sky-600',
    headerBg: 'from-sky-600 to-cyan-700',
  },
  'riya-sharma': {
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-800',
    border: 'border-t-purple-600',
    headerBg: 'from-purple-700 to-violet-800',
  },
}

function fmtINR(amount: number): string {
  const n = Number(amount) || 0
  if (n === 0) return '₹0'
  return '₹' + Math.round(n).toLocaleString('en-IN')
}

function fmtPct(v: number): string {
  return `${(Number(v) || 0).toFixed(1)}%`
}

function fmtDisplayDate(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '—'
  const d = new Date(`${ymd}T12:00:00Z`)
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function AiChatReportsInner() {
  const { user } = useAuth()
  const roleStr = String(user?.role || '')
    .trim()
    .toLowerCase()
  const isSuperAdmin = roleStr === 'super_admin' || roleStr === 'super admin'

  const [preset, setPreset] = useState<string>('weekly')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null)
  const [companyScope, setCompanyScope] = useState<'ALL' | AiCompanyCode>('ALL')
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')

  const [report, setReport] = useState<AiChatReportData | null>(null)
  const [emailEnabled, setEmailEnabled] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [refreshTick, setRefreshTick] = useState<number>(0)

  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({
    KTAHV: true,
    KAPPL: true,
    VILLARAAG: true,
  })

  // Sheet detail filters
  const [recordFilter, setRecordFilter] = useState<RecordFilter>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(25)

  // Weekly email modal state
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState<boolean>(false)
  const [emailTo, setEmailTo] = useState<string>('director@kairali.com')
  const [emailCc, setEmailCc] = useState<string>(
    'seo@ktahv.com, mkt@ktahv.com, ho.mkt@kairaliproducts.com, digital@kairali.com, sysadmin@kairali.com'
  )
  const [emailSubject, setEmailSubject] = useState<string>('')
  const [emailIntro, setEmailIntro] = useState<string>(
    'Dear Management & Team,\n\nPlease find below the consolidated Weekly AI Chat Performance Report across all companies and all 5 AI chat assistants.'
  )
  const [emailClosing, setEmailClosing] = useState<string>('Regards,\nKairali CRM Automation')
  const [sendingEmail, setSendingEmail] = useState<boolean>(false)
  const [emailFeedback, setEmailFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null
  )

  useEffect(() => {
    const controller = new AbortController()

    const sp = new URLSearchParams()
    sp.set('company', companyScope)
    if (appliedRange) {
      sp.set('from', appliedRange.from)
      sp.set('to', appliedRange.to)
    } else {
      sp.set('preset', preset)
    }

    fetch(`/api/ai-chat-reports?${sp.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Unable to load AI Chat report')
        }
        return data
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setReport(data.report)
        setEmailEnabled(Boolean(data.emailEnabled))
        setCustomFrom((prev) => prev || data.report.startDate)
        setCustomTo((prev) => prev || data.report.endDate)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Unable to load AI Chat report')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [appliedRange, companyScope, preset, refreshTick])

  const triggerReload = useCallback(() => {
    setLoading(true)
    setError('')
    setRefreshTick((n) => n + 1)
  }, [])

  const handleSelectPreset = (key: string) => {
    setLoading(true)
    setError('')
    setAppliedRange(null)
    setPreset(key)
    setPage(1)
  }

  const handleApplyCustomDates = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFrom || !customTo) return
    setLoading(true)
    setError('')
    setAppliedRange({ from: customFrom, to: customTo })
    setPreset('custom')
    setPage(1)
  }

  const toggleCompanyRow = (code: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [code]: !prev[code] }))
  }

  const openEmailPreviewModal = async () => {
    if (!report) return
    setEmailModalOpen(true)
    setEmailFeedback(null)
    const scopeLabel = report.companyScope === 'ALL' ? 'All Companies' : report.companyScope
    setEmailSubject(
      `AI Chat Weekly Consolidated Report — Chats, Enquiries & Conversions | ${report.periodLabel} | ${scopeLabel}`
    )
    setPreviewLoading(true)
    try {
      const sp = new URLSearchParams({
        from: report.startDate,
        to: report.endDate,
        company: report.companyScope,
      })
      const res = await fetch(`/api/ai-chat-reports/preview?${sp.toString()}`, {
        cache: 'no-store',
      })
      const html = await res.text()
      setPreviewHtml(html)
    } catch {
      setPreviewHtml(
        '<p style="padding:24px;font-family:Arial;color:#b91c1c">Unable to load email preview.</p>'
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSendEmailNow = async () => {
    if (!report || sendingEmail) return
    setSendingEmail(true)
    setEmailFeedback(null)
    try {
      const res = await fetch('/api/ai-chat-reports/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          cc: emailCc,
          subject: emailSubject,
          intro: emailIntro,
          closing: emailClosing,
          from: report.startDate,
          toDate: report.endDate,
          preset,
          company: report.companyScope,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send email')
      setEmailFeedback({
        kind: 'ok',
        text: `Email dispatched successfully (${data.accepted} recipient${data.accepted === 1 ? '' : 's'} accepted).`,
      })
    } catch (err: any) {
      setEmailFeedback({
        kind: 'err',
        text: err?.message || 'Unable to send email',
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const selectedBot: BotSheetSummary | null = useMemo(() => {
    if (!report || activeTab === 'overview') return null
    return report.bots.find((b) => b.botId === activeTab) || null
  }, [report, activeTab])

  const filteredRecords: ChatSheetRecord[] = useMemo(() => {
    if (!selectedBot) return []
    const q = searchQuery.trim().toLowerCase()
    return selectedBot.recentRecords.filter((rec) => {
      if (recordFilter === 'enquiries' && !rec.isEnquiry) return false
      if (recordFilter === 'converted' && !rec.isConverted) return false
      if (recordFilter === 'dropped' && rec.isEnquiry) return false
      if (!q) return true
      return (
        rec.clientName.toLowerCase().includes(q) ||
        rec.phone.toLowerCase().includes(q) ||
        rec.email.toLowerCase().includes(q) ||
        rec.leadOrChatId.toLowerCase().includes(q) ||
        rec.outcome.toLowerCase().includes(q) ||
        rec.channel.toLowerCase().includes(q) ||
        rec.status.toLowerCase().includes(q) ||
        rec.agentOrStaff.toLowerCase().includes(q) ||
        rec.bookingOrderId.toLowerCase().includes(q)
      )
    })
  }, [selectedBot, recordFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize))
  const paginatedRecords = useMemo(() => {
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, page, pageSize, totalPages])

  const handleExportOverviewCsv = () => {
    if (!report) return
    const headers = [
      'Section',
      'Company / Bot Name',
      'Type',
      'Total Chats',
      'Dropped / Non-Enquiry',
      'Enquiries / Actionable',
      'Chat to Enquiry %',
      'Verified Conversions / Resolved',
      'Pipeline Conversions / Open',
      'Total Conversions',
      'Enquiry to Conversion / Resolution %',
      'Chat to Conversion %',
      'Verified Revenue (INR)',
    ]
    const rows: (string | number)[][] = []
    for (const c of report.companies) {
      rows.push([
        'Company Summary',
        c.companyLabel,
        'Lead & Sales Funnel',
        c.leadChats,
        c.droppedChats,
        c.enquiries,
        c.enquiryPct,
        c.verifiedConversions,
        c.unverifiedConversions,
        c.totalConversions,
        c.enquiryToConversionPct,
        c.chatToConversionPct,
        Math.round(c.revenue),
      ])
    }
    rows.push([
      'Company Summary',
      'GROUP TOTAL',
      'Lead & Sales Funnel',
      report.totals.leadChats,
      report.totals.droppedChats,
      report.totals.enquiries,
      report.totals.enquiryPct,
      report.totals.verifiedConversions,
      report.totals.unverifiedConversions,
      report.totals.totalConversions,
      report.totals.enquiryToConversionPct,
      report.totals.chatToConversionPct,
      Math.round(report.totals.revenue),
    ])
    for (const b of report.bots) {
      if (b.kind === 'guest_support') {
        rows.push([
          'AI Chat Sheet',
          b.botName,
          'In-Resort Guest Support (KTAHV)',
          b.totalChats,
          b.droppedChats,
          b.enquiries,
          b.enquiryPct,
          b.resolvedTickets,
          b.openTickets,
          b.resolvedTickets,
          b.resolutionPct,
          fmtPct((b.resolvedTickets / Math.max(1, b.totalChats)) * 100),
          0,
        ])
      } else {
        rows.push([
          'AI Chat Sheet',
          b.botName,
          'Lead & Sales Chatbot',
          b.totalChats,
          b.droppedChats,
          b.enquiries,
          b.enquiryPct,
          b.verifiedConversions,
          b.unverifiedConversions,
          b.totalConversions,
          b.enquiryToConversionPct,
          b.chatToConversionPct,
          Math.round(b.revenue),
        ])
      }
    }
    downloadCsv(
      `AI-Chat-Consolidated-Report_${report.startDate}_to_${report.endDate}.csv`,
      headers,
      rows
    )
  }

  const handleExportBotRecordsCsv = (bot: BotSheetSummary) => {
    const headers = [
      'Date Time (IST)',
      'Bot Sheet',
      'Lead / Chat ID',
      'Client / Guest Name',
      'Phone',
      'Email',
      'Company',
      'Channel',
      bot.kind === 'guest_support' ? 'Actionable Ticket' : 'Enquiry Generated',
      'Outcome / Issue Category',
      'CRM / Resolution Status',
      'Agent / Department',
      bot.kind === 'guest_support' ? 'Resolved' : 'Converted',
      'Booking / Order ID',
      'Revenue (INR)',
    ]
    const rows = filteredRecords.map((r) => [
      r.dateTime,
      r.botName,
      r.leadOrChatId,
      r.clientName,
      r.phone,
      r.email,
      r.company,
      r.channel,
      r.isEnquiry ? 'Yes' : 'No',
      r.outcome,
      r.status,
      r.agentOrStaff,
      r.isConverted ? 'Yes' : 'No',
      r.bookingOrderId,
      Math.round(r.conversionAmount),
    ])
    downloadCsv(
      `${bot.botId}-sheet_${report?.startDate || 'report'}_to_${report?.endDate || 'now'}.csv`,
      headers,
      rows
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-slate-50/80 p-4 md:p-6 space-y-5">
        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                      AI Chat Consolidated Reports
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live SQL Data
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                    All 5 AI Chat Sheets in One Place — Company-wise Chats, Enquiries Generated,
                    Conversions %, Revenue &amp; Resort Guest Support
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={triggerReload}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  selectedBot ? handleExportBotRecordsCsv(selectedBot) : handleExportOverviewCsv()
                }
                disabled={!report || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={openEmailPreviewModal}
                disabled={!report || loading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 shadow-sm transition"
              >
                <Mail className="h-3.5 w-3.5" />
                Weekly Email Report
              </button>

              {isSuperAdmin && (
                <Link
                  href={`/settings/automation/email-triggers?report=ai-chat-weekly-report&scope=${companyScope}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
                >
                  <span>Auto Email Trigger</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Filter Strip: Presets + Date Picker + Company Scope */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Period:
              </span>
              {PRESETS.map((p) => {
                const active = !appliedRange && preset === p.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSelectPreset(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}

              <form onSubmit={handleApplyCustomDates} className="flex items-center gap-1.5 ml-1 flex-wrap">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  aria-label="Start date"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="End date"
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition"
                >
                  Apply
                </button>
              </form>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Company:
              </span>
              {COMPANY_TABS.map((c) => {
                const active = companyScope === c.key
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setLoading(true)
                      setError('')
                      setCompanyScope(c.key)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* All 5 Sheets Navigation Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview')
                setPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              All Companies &amp; All 5 Sheets
            </button>

            {(report?.bots || []).map((b) => {
              const isSelected = activeTab === b.botId
              return (
                <button
                  key={b.botId}
                  type="button"
                  onClick={() => {
                    setActiveTab(b.botId)
                    setRecordFilter('all')
                    setSearchQuery('')
                    setPage(1)
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{b.botName}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {b.totalChats.toLocaleString('en-IN')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Loading / Error State */}
        {loading && !report && (
          <div className="bg-white rounded-2xl border border-slate-200 p-14 flex flex-col items-center justify-center text-center">
            <div className="h-9 w-9 rounded-full border-3 border-teal-600 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              Loading live SQL metrics across all 5 AI chat tables…
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Priya Sharma · Product Priya Sharma · VillaRaag Anjali Menon · Dr. Aarika · Riya Sharma
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-red-800">
              <strong>Unable to load AI Chat report:</strong> {error}
            </div>
            <button
              type="button"
              onClick={triggerReload}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* MASTER CONSOLIDATED OVERVIEW */}
        {report && activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Period Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
              <div>
                Showing SQL data for <strong className="text-slate-900">{report.periodLabel}</strong>
                {' · '}
                Scope:{' '}
                <strong className="text-slate-900">
                  {report.companyScope === 'ALL' ? 'All Companies' : report.companyScope}
                </strong>
              </div>
              <div>
                Scheduled Weekly Trigger:{' '}
                <span className="font-semibold text-emerald-700">
                  Every Monday · 09:00 IST (Management &amp; Marketing)
                </span>
              </div>
            </div>

            {/* 4 Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Card 1: Total Chats */}
              <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    1. Website &amp; Social Chats
                  </span>
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {report.totals.leadChats.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">kitna chat hua</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>Dropped (No Contact):</span>
                  <span className="font-semibold text-slate-800">
                    {report.totals.droppedChats.toLocaleString('en-IN')} (
                    {fmtPct(
                      report.totals.leadChats > 0
                        ? (report.totals.droppedChats / report.totals.leadChats) * 100
                        : 0
                    )}
                    )
                  </span>
                </div>
              </div>

              {/* Card 2: Enquiries Generated */}
              <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-sky-500 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                    2. Enquiries Generated
                  </span>
                  <TrendingUp className="h-4 w-4 text-sky-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-sky-900">
                    {report.totals.enquiries.toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                    {fmtPct(report.totals.enquiryPct)} Chat&rarr;Enquiry
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${Math.min(100, report.totals.enquiryPct)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Visitors who shared phone/email &amp; entered CRM (kitna enquiry bana)
                  </div>
                </div>
              </div>

              {/* Card 3: Conversions & Revenue */}
              <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-emerald-600 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    3. Conversions &amp; Revenue
                  </span>
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-extrabold text-emerald-900">
                    {report.totals.totalConversions.toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {fmtPct(report.totals.enquiryToConversionPct)} Enq&rarr;Conv
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Verified:{' '}
                    <strong className="text-emerald-700">{report.totals.verifiedConversions}</strong>
                    {report.totals.unverifiedConversions > 0 && (
                      <>
                        {' · '}Pipeline:{' '}
                        <strong className="text-amber-700">
                          {report.totals.unverifiedConversions}
                        </strong>
                      </>
                    )}
                  </span>
                  <span className="font-bold text-slate-900">{fmtINR(report.totals.revenue)}</span>
                </div>
              </div>

              {/* Card 4: Riya Sharma Resort Support */}
              <div className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-purple-600 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                    4. Riya Sharma (Resort Chat)
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-purple-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-purple-950">
                    {report.totals.riyaChats.toLocaleString('en-IN')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {fmtPct(report.totals.riyaResolutionPct)} Resolved
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Resolved: <strong className="text-emerald-700">{report.totals.riyaResolved}</strong>/
                    {report.totals.riyaActionable}
                  </span>
                  <span>
                    Open: <strong className="text-amber-700">{report.totals.riyaOpen}</strong> · Esc:{' '}
                    <strong className="text-red-600">{report.totals.riyaEscalated}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Funnel Strip */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 rounded-2xl p-4 md:px-6 text-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-teal-300 font-bold">
                    Easy Funnel Summary (Lead &amp; Sales Chatbots)
                  </div>
                  <div className="text-sm text-slate-200 mt-0.5">
                    Out of every 100 website/social chats,{' '}
                    <strong className="text-white">{report.totals.enquiryPct.toFixed(1)}</strong>{' '}
                    become CRM enquiries and{' '}
                    <strong className="text-emerald-300">
                      {report.totals.chatToConversionPct.toFixed(1)}
                    </strong>{' '}
                    convert into bookings/orders ({fmtPct(report.totals.enquiryToConversionPct)} of
                    enquiries convert).
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap text-xs font-bold">
                  <span className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
                    Chats: {report.totals.leadChats.toLocaleString('en-IN')}
                  </span>
                  <ArrowRight className="h-4 w-4 text-teal-300" />
                  <span className="px-3 py-1.5 rounded-lg bg-sky-500/25 border border-sky-400/30 text-sky-100">
                    Enquiries: {report.totals.enquiries.toLocaleString('en-IN')} (
                    {fmtPct(report.totals.enquiryPct)})
                  </span>
                  <ArrowRight className="h-4 w-4 text-teal-300" />
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/25 border border-emerald-400/30 text-emerald-100">
                    Conversions: {report.totals.totalConversions.toLocaleString('en-IN')} (
                    {fmtPct(report.totals.enquiryToConversionPct)})
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 1: Company-Wise Consolidated Table (Expandable by Bot) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    1. Company-Wise AI Chat Funnel Summary
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any company row to expand/collapse which AI chatbot generated its chats,
                    enquiries &amp; conversions
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  V = Verified Conversion · P = Unverified / In-Pipeline
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-left font-semibold">Company</th>
                      <th className="py-3 px-3 text-right font-semibold">Total Chats</th>
                      <th className="py-3 px-3 text-right font-semibold">Dropped</th>
                      <th className="py-3 px-3 text-right font-semibold">Enquiries</th>
                      <th className="py-3 px-3 text-right font-semibold">Chat&rarr;Enq %</th>
                      <th className="py-3 px-3 text-right font-semibold">Conversions</th>
                      <th className="py-3 px-3 text-right font-semibold">Enq&rarr;Conv %</th>
                      <th className="py-3 px-3 text-right font-semibold">Chat&rarr;Conv %</th>
                      <th className="py-3 px-3 text-right font-semibold">Verified Revenue</th>
                      <th className="py-3 px-4 text-right font-semibold">Resort Support (Riya)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.companies.map((c) => {
                      const isExpanded = Boolean(expandedCompanies[c.company])
                      return (
                        <React.Fragment key={c.company}>
                          <tr
                            onClick={() => toggleCompanyRow(c.company)}
                            className="hover:bg-slate-50 cursor-pointer transition font-medium"
                          >
                            <td className="py-3.5 px-4 text-slate-900 font-bold">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-teal-600 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                                <span>{c.companyLabel}</span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                                  {c.bots.length} {c.bots.length === 1 ? 'sheet' : 'sheets'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                              {c.leadChats.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-500">
                              {c.droppedChats.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-sky-700">
                              {c.enquiries.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-semibold text-xs">
                                {fmtPct(c.enquiryPct)}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                              {c.totalConversions.toLocaleString('en-IN')}
                              {c.totalConversions > 0 && (
                                <span className="text-[11px] font-normal text-slate-500 ml-1">
                                  ({c.verifiedConversions}V
                                  {c.unverifiedConversions > 0 ? `+${c.unverifiedConversions}P` : ''}
                                  )
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs">
                                {fmtPct(c.enquiryToConversionPct)}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right text-slate-600 text-xs font-semibold">
                              {fmtPct(c.chatToConversionPct)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                              {fmtINR(c.revenue)}
                            </td>
                            <td className="py-3.5 px-4 text-right text-xs">
                              {c.guestSupportChats > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-semibold">
                                  {c.guestSupportChats} chats · {fmtPct(c.guestResolutionPct)} res.
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>

                          {isExpanded &&
                            c.bots.map((sub) => (
                              <tr
                                key={`${c.company}-${sub.botId}`}
                                className="bg-slate-50/90 text-xs text-slate-700"
                              >
                                <td className="py-2.5 pl-11 pr-4">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveTab(sub.botId)
                                      setPage(1)
                                    }}
                                    className="inline-flex items-center gap-1.5 font-semibold text-teal-700 hover:underline"
                                  >
                                    <span>&bull; {sub.botName}</span>
                                    {sub.kind === 'guest_support' && (
                                      <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px]">
                                        Resort Support
                                      </span>
                                    )}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  {sub.chats.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-500">
                                  {sub.droppedChats.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-sky-700">
                                  {sub.enquiries.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right">{fmtPct(sub.enquiryPct)}</td>
                                <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                                  {sub.kind === 'guest_support' ? (
                                    <span className="text-purple-700">
                                      {sub.resolvedTickets} Resolved
                                    </span>
                                  ) : (
                                    sub.totalConversions.toLocaleString('en-IN')
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  {sub.kind === 'guest_support'
                                    ? fmtPct(sub.resolutionPct)
                                    : fmtPct(sub.enquiryToConversionPct)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-500">
                                  {sub.kind === 'guest_support'
                                    ? '—'
                                    : fmtPct(sub.chatToConversionPct)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold">
                                  {sub.kind === 'guest_support' ? '—' : fmtINR(sub.revenue)}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {sub.kind === 'guest_support' ? (
                                    <span className="text-purple-700 font-medium">
                                      Open: {sub.openTickets} · Esc: {sub.escalatedTickets}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Lead Bot</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      )
                    })}

                    {/* Group Total Row */}
                    <tr className="bg-emerald-50/80 font-extrabold text-slate-900 border-t-2 border-emerald-600">
                      <td className="py-3.5 px-4">GROUP TOTAL (ALL COMPANIES)</td>
                      <td className="py-3.5 px-3 text-right">
                        {report.totals.leadChats.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-600">
                        {report.totals.droppedChats.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-sky-800">
                        {report.totals.enquiries.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-sky-800">
                        {fmtPct(report.totals.enquiryPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-800">
                        {report.totals.totalConversions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-3 text-right text-emerald-800">
                        {fmtPct(report.totals.enquiryToConversionPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {fmtPct(report.totals.chatToConversionPct)}
                      </td>
                      <td className="py-3.5 px-3 text-right">{fmtINR(report.totals.revenue)}</td>
                      <td className="py-3.5 px-4 text-right text-purple-800 text-xs">
                        {report.totals.riyaChats} chats · {fmtPct(report.totals.riyaResolutionPct)}{' '}
                        res.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: All 5 AI Chat Sheets Easy Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    2. All 5 AI Chat Sheets at a Glance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Priya Sharma Chat · Product Priya Sharma · VillaRaag Anjali Menon · Dr. Aarika ·
                    Riya Sharma Chat — click any card to open its full sheet
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {report.bots.map((b) => {
                  const accent = BOT_ACCENTS[b.botId]
                  const isSupport = b.kind === 'guest_support'
                  return (
                    <div
                      key={b.botId}
                      onClick={() => {
                        setActiveTab(b.botId)
                        setRecordFilter('all')
                        setSearchQuery('')
                        setPage(1)
                      }}
                      className={`bg-white rounded-2xl border border-slate-200 border-t-4 ${accent.border} p-4 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900 leading-snug">
                            {b.botName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${accent.badgeBg} ${accent.badgeText}`}
                          >
                            {isSupport ? 'Resort Support' : b.primaryCompany}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{b.subtitle}</p>

                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Total Chats:</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              {b.totalChats.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">
                              {isSupport ? 'Actionable Tickets:' : 'Enquiries Made:'}
                            </span>
                            <span className="font-bold text-sky-700">
                              {b.enquiries.toLocaleString('en-IN')} ({fmtPct(b.enquiryPct)})
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">
                              {isSupport ? 'Resolved Tickets:' : 'Conversions:'}
                            </span>
                            <span className="font-bold text-emerald-700">
                              {isSupport
                                ? `${b.resolvedTickets.toLocaleString('en-IN')} (${fmtPct(b.resolutionPct)})`
                                : `${b.totalConversions.toLocaleString('en-IN')} (${fmtPct(b.enquiryToConversionPct)})`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">
                              {isSupport ? 'Open / Escalated:' : 'Verified Revenue:'}
                            </span>
                            <span className="font-bold text-slate-900">
                              {isSupport
                                ? `${b.openTickets} Open · ${b.escalatedTickets} Esc`
                                : fmtINR(b.revenue)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-teal-700">
                        <span className="truncate text-slate-400 font-mono text-[10px]">
                          {b.sqlTable}
                        </span>
                        <span className="shrink-0 ml-2 flex items-center gap-0.5">
                          Open Sheet <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SECTION 3: Unified Sheet Comparison Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  3. Sheet-Wise Master Comparison Table (All 5 SQL Chat Sources)
                </h2>
                <p className="text-xs text-slate-500">
                  Direct comparison of chat volume, enquiry capture rate, conversions / resolutions
                  &amp; top channels
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-left font-semibold">AI Chat Sheet</th>
                      <th className="py-3 px-3 text-left font-semibold">Role / Company</th>
                      <th className="py-3 px-3 text-right font-semibold">Chats</th>
                      <th className="py-3 px-3 text-right font-semibold">Dropped</th>
                      <th className="py-3 px-3 text-right font-semibold">Enquiries / Tickets</th>
                      <th className="py-3 px-3 text-right font-semibold">Enquiry %</th>
                      <th className="py-3 px-3 text-right font-semibold">Conv. / Resolved</th>
                      <th className="py-3 px-3 text-right font-semibold">Success %</th>
                      <th className="py-3 px-3 text-right font-semibold">Revenue</th>
                      <th className="py-3 px-4 text-left font-semibold">Top Channels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.bots.map((b) => {
                      const isSupport = b.kind === 'guest_support'
                      return (
                        <tr
                          key={b.botId}
                          onClick={() => {
                            setActiveTab(b.botId)
                            setPage(1)
                          }}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{b.botName}</div>
                            <div className="text-[11px] font-mono text-slate-400">{b.sqlTable}</div>
                          </td>
                          <td className="py-3 px-3 text-xs">
                            {isSupport ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
                                KTAHV · Resort Support
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                                {b.companies.map((c) => c.company).join(', ') || b.primaryCompany} ·
                                Sales
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {b.totalChats.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500">
                            {b.droppedChats.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-sky-700">
                            {b.enquiries.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-sky-800">
                            {fmtPct(b.enquiryPct)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-700">
                            {isSupport
                              ? `${b.resolvedTickets.toLocaleString('en-IN')} Resolved`
                              : b.totalConversions.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-xs">
                              {isSupport
                                ? fmtPct(b.resolutionPct)
                                : fmtPct(b.enquiryToConversionPct)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {isSupport ? '—' : fmtINR(b.revenue)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {b.channels
                              .slice(0, 3)
                              .map((ch) => `${ch.channel} (${ch.chats})`)
                              .join(', ') || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: Channel-Wise Breakdown + Daily Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Channel Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">
                    4. Channel-Wise Performance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Website Widget vs WhatsApp vs Instagram vs Facebook Messenger vs Resort QR
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-xs uppercase">
                        <th className="py-2.5 px-4 text-left font-semibold">Channel</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Chats</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Enquiries</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Enq %</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Conv.</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.channels.map((ch) => (
                        <tr key={ch.channel} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{ch.channel}</td>
                          <td className="py-2.5 px-3 text-right">
                            {ch.chats.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-sky-700">
                            {ch.enquiries.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs">
                            {fmtPct(ch.enquiryPct)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                            {ch.conversions.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold">
                            {fmtINR(ch.revenue)}
                          </td>
                        </tr>
                      ))}
                      {report.channels.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No channel activity recorded for the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Trend */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-base font-bold text-slate-900">
                    5. Day-by-Day Activity Trend
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily progression of Website/Social Chats, Enquiries, Conversions &amp; Riya
                    Resort Chats
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 text-xs uppercase">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-semibold">Date</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Lead Chats</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Enquiries</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Conversions</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Riya Chats</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Riya Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.dailyTrend.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {fmtDisplayDate(d.date)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {d.chats.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-sky-700">
                            {d.enquiries.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">
                            {d.conversions.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-purple-700">
                            {d.riyaChats.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right text-teal-700 font-semibold">
                            {d.riyaResolved.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {report.dailyTrend.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No daily records found in this date window.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL BOT SHEET VIEW */}
        {report && selectedBot && (
          <div className="space-y-5">
            {/* Sheet Banner */}
            <div
              className={`rounded-2xl bg-gradient-to-r ${BOT_ACCENTS[selectedBot.botId].headerBg} p-5 text-white shadow-sm`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20">
                      SQL Table: {selectedBot.sqlTable}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20">
                      {report.periodLabel}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-extrabold mt-2">{selectedBot.botName}</h2>
                  <p className="text-xs md:text-sm text-white/85 mt-0.5">{selectedBot.subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportBotRecordsCsv(selectedBot)}
                    className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 flex items-center gap-1.5 transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export {selectedBot.shortName} CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition"
                  >
                    &larr; All 5 Sheets Summary
                  </button>
                </div>
              </div>

              {/* Bot KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                  <div className="text-[11px] text-white/75 uppercase font-semibold">
                    Total Chats
                  </div>
                  <div className="text-2xl font-extrabold mt-0.5">
                    {selectedBot.totalChats.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15">
                  <div className="text-[11px] text-white/75 uppercase font-semibold">
                    {selectedBot.kind === 'guest_support' ? 'Non-Actionable' : 'Dropped (No Phone)'}
                  </div>
                  <div className="text-2xl font-extrabold mt-0.5">
                    {selectedBot.droppedChats.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/25">
                  <div className="text-[11px] text-white/85 uppercase font-semibold">
                    {selectedBot.kind === 'guest_support'
                      ? 'Actionable Tickets'
                      : 'Enquiries Made'}
                  </div>
                  <div className="text-2xl font-extrabold mt-0.5">
                    {selectedBot.enquiries.toLocaleString('en-IN')}{' '}
                    <span className="text-xs font-semibold">({fmtPct(selectedBot.enquiryPct)})</span>
                  </div>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/25">
                  <div className="text-[11px] text-white/85 uppercase font-semibold">
                    {selectedBot.kind === 'guest_support' ? 'Resolved Tickets' : 'Conversions'}
                  </div>
                  <div className="text-2xl font-extrabold mt-0.5">
                    {selectedBot.kind === 'guest_support'
                      ? `${selectedBot.resolvedTickets} (${fmtPct(selectedBot.resolutionPct)})`
                      : `${selectedBot.totalConversions} (${fmtPct(selectedBot.enquiryToConversionPct)})`}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/15 col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-white/75 uppercase font-semibold">
                    {selectedBot.kind === 'guest_support'
                      ? 'Open / Escalated'
                      : 'Verified Revenue'}
                  </div>
                  <div className="text-xl font-extrabold mt-1">
                    {selectedBot.kind === 'guest_support'
                      ? `${selectedBot.openTickets} Open · ${selectedBot.escalatedTickets} Esc`
                      : fmtINR(selectedBot.revenue)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Breakdown Panels: Company Split · Channel Split · Top Outcomes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Company Split */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Company-Wise Split ({selectedBot.shortName})
                </h3>
                <div className="space-y-2.5">
                  {selectedBot.companies.map((c) => (
                    <div
                      key={c.company}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{c.companyLabel}</div>
                        <div className="text-slate-500 mt-0.5">
                          Chats: <strong>{c.chats}</strong> · Enq: <strong>{c.enquiries}</strong> (
                          {fmtPct(c.enquiryPct)})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700">
                          {selectedBot.kind === 'guest_support'
                            ? `${fmtPct(c.conversionPct)} Resolved`
                            : `${c.conversions} Conv (${fmtPct(c.conversionPct)})`}
                        </div>
                        {selectedBot.kind !== 'guest_support' && (
                          <div className="font-semibold text-slate-700 mt-0.5">
                            {fmtINR(c.revenue)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedBot.companies.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No company activity in this date window.
                    </p>
                  )}
                </div>
              </div>

              {/* Channel Split */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Channel-Wise Split ({selectedBot.shortName})
                </h3>
                <div className="space-y-2.5">
                  {selectedBot.channels.map((ch) => (
                    <div
                      key={ch.channel}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ch.channel}</div>
                        <div className="text-slate-500 mt-0.5">
                          Chats: <strong>{ch.chats}</strong> · Enq: <strong>{ch.enquiries}</strong>{' '}
                          ({fmtPct(ch.enquiryPct)})
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-700">{ch.conversions} Conv.</div>
                        <div className="text-slate-600 font-semibold mt-0.5">
                          {fmtINR(ch.revenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {selectedBot.channels.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No channel records in this date window.
                    </p>
                  )}
                </div>
              </div>

              {/* Top Outcomes */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Top Chat Outcomes / Categories
                </h3>
                <div className="space-y-2">
                  {selectedBot.topOutcomes.map((o) => (
                    <div key={o.outcome} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-800 truncate pr-2">
                          {o.outcome}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {o.count} ({fmtPct(o.pct)})
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full"
                          style={{ width: `${Math.min(100, o.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {selectedBot.topOutcomes.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      No outcomes recorded in this date window.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Sheet Records Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Sheet Filter:
                  </span>
                  {(
                    [
                      ['all', `All Chats (${selectedBot.recentRecords.length})`],
                      [
                        'enquiries',
                        selectedBot.kind === 'guest_support'
                          ? 'Actionable Tickets'
                          : 'Enquiries Only',
                      ],
                      [
                        'converted',
                        selectedBot.kind === 'guest_support' ? 'Resolved Only' : 'Converted Only',
                      ],
                      ['dropped', 'Dropped / Non-Enquiry'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setRecordFilter(key)
                        setPage(1)
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        recordFilter === key
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-72">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Search name, phone, ID, outcome…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider">
                      <th className="py-3 px-3 text-left font-semibold">Date &amp; Time</th>
                      <th className="py-3 px-3 text-left font-semibold">Client / Guest</th>
                      <th className="py-3 px-3 text-left font-semibold">Contact</th>
                      <th className="py-3 px-3 text-left font-semibold">Company</th>
                      <th className="py-3 px-3 text-left font-semibold">Channel</th>
                      <th className="py-3 px-3 text-center font-semibold">
                        {selectedBot.kind === 'guest_support' ? 'Ticket' : 'Enquiry'}
                      </th>
                      <th className="py-3 px-3 text-left font-semibold">Outcome / Category</th>
                      <th className="py-3 px-3 text-left font-semibold">Status &amp; Owner</th>
                      <th className="py-3 px-3 text-right font-semibold">
                        {selectedBot.kind === 'guest_support' ? 'Resolution' : 'Conversion'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                          <div className="font-semibold">{rec.dateTime || rec.date}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                            {rec.leadOrChatId}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {rec.clientName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {rec.phone || rec.email ? (
                            <>
                              {rec.phone && <div>{rec.phone}</div>}
                              {rec.email && (
                                <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                                  {rec.email}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400">No contact left</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                            {rec.company}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{rec.channel}</td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.isEnquiry ? (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px]">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px]">
                              Dropped
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 max-w-[220px] truncate">
                          {rec.outcome}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px]">
                          <div className="font-medium text-slate-800 truncate">{rec.status}</div>
                          {rec.agentOrStaff && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {rec.agentOrStaff}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {selectedBot.kind === 'guest_support' ? (
                            rec.isConverted ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                Resolved
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                                {rec.status}
                              </span>
                            )
                          ) : rec.isConverted ? (
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  rec.isVerifiedConversion
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.isVerifiedConversion ? 'Converted' : 'Pipeline'}
                              </span>
                              {rec.conversionAmount > 0 && (
                                <div className="font-bold text-slate-900 mt-0.5">
                                  {fmtINR(rec.conversionAmount)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {paginatedRecords.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400">
                          No chat records match your current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Showing{' '}
                  <strong>
                    {filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, filteredRecords.length)}
                  </strong>{' '}
                  of <strong>{filteredRecords.length}</strong> loaded sheet rows (Total SQL count in
                  period: <strong>{selectedBot.totalChats.toLocaleString('en-IN')}</strong>)
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                    aria-label="Rows per page"
                    className="px-2 py-1 rounded border border-slate-200 bg-white"
                  >
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-semibold">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEEKLY EMAIL PREVIEW & MANUAL SEND MODAL */}
        {emailModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-chat-email-modal-title"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <h2 id="ai-chat-email-modal-title" className="text-base font-bold">
                    Weekly AI Chat Management Email Report
                  </h2>
                  <p className="text-xs text-slate-300">
                    Auto-scheduled every Monday 09:00 IST in Settings &rarr; Automation &rarr; Email
                    Triggers · Or send now below
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  aria-label="Close modal"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
                {/* Left Config Form */}
                <div className="lg:col-span-4 p-4 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-y-auto space-y-3 bg-slate-50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      To (Management) *
                    </label>
                    <input
                      type="text"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      placeholder="director@kairali.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      CC (Marketing &amp; Team)
                    </label>
                    <textarea
                      rows={2}
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opening Note
                    </label>
                    <textarea
                      rows={3}
                      value={emailIntro}
                      onChange={(e) => setEmailIntro(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Closing Signature
                    </label>
                    <textarea
                      rows={2}
                      value={emailClosing}
                      onChange={(e) => setEmailClosing(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>

                  {emailFeedback && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-medium ${
                        emailFeedback.kind === 'ok'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {emailFeedback.text}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSendEmailNow}
                      disabled={sendingEmail || !emailEnabled}
                      className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sendingEmail
                        ? 'Sending Email…'
                        : emailEnabled
                          ? 'Send Report Email Now'
                          : 'SMTP Not Configured on Server'}
                    </button>

                    {isSuperAdmin && (
                      <Link
                        href={`/settings/automation/email-triggers?report=ai-chat-weekly-report&scope=${companyScope}`}
                        className="w-full py-2 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>Edit Weekly Schedule in Email Triggers</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Right Live Email HTML Preview */}
                <div className="lg:col-span-8 bg-slate-100 overflow-hidden flex flex-col min-h-[420px]">
                  <div className="px-4 py-2 bg-white border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span>Live HTML Email Preview</span>
                    <span className="text-slate-400">{report?.periodLabel}</span>
                  </div>
                  {previewLoading ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                      Generating HTML preview from SQL…
                    </div>
                  ) : (
                    <iframe
                      title="AI Chat Weekly Email Preview"
                      srcDoc={previewHtml}
                      className="w-full flex-1 border-0 bg-slate-100"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function AiChatReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 flex items-center justify-center text-sm text-slate-500">
          Loading AI Chat Reports…
        </div>
      }
    >
      <AiChatReportsInner />
    </Suspense>
  )
}
