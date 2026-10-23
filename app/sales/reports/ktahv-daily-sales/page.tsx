// app/sales/reports/ktahv-daily-sales/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  BarChart3,
  Percent,
  Search,
  ExternalLink,
} from 'lucide-react'
import {
  KtahvDailySalesReportData,
  formatINR,
  formatNum,
  formatPct,
  exportKtahvDailySalesHTML,
} from '@/lib/ktahv-daily-sales-report'

export default function KtahvDailySalesReportPage() {
  const [data, setData] = useState<KtahvDailySalesReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'cancellations' | 'complimentary' | 'discounts' | 'marketing'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [reportDate, setReportDate] = useState('2026-10-20')

  const fetchReport = async (date: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/ktahv-daily-sales-report?date=${date}`)
      if (!res.ok) throw new Error('Failed to load report data')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err?.message || 'Error loading report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport(reportDate)
  }, [reportDate])

  const handlePrint = () => {
    window.print()
  }

  const handleExportHTML = () => {
    if (!data) return
    const html = exportKtahvDailySalesHTML(data)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `KTAHV-Monthly-Sales-Report-Daily-Progress-${data.reportDate}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredSalespeople = data?.salespeople.filter((p) =>
    p.salesPerson.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/sales/reports" className="flex items-center gap-1 hover:text-slate-800 transition">
              <ArrowLeft size={14} /> Sales Reports
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">KTAHV Monthly Sales Report – Daily Progress</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReport(reportDate)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm text-slate-600 disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handlePrint}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm text-slate-600 disabled:opacity-50"
            >
              <Printer size={13} />
              Print / Save PDF
            </button>
            <button
              onClick={handleExportHTML}
              disabled={!data}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              <Download size={13} />
              Export HTML Email
            </button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-teal-900 text-white p-6 md:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold tracking-wider uppercase mb-2 border border-teal-500/30">
                KTAHV Executive Briefing · Monthly Progress
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                KTAHV Monthly Sales Report – Daily Progress
              </h1>              <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                <Calendar size={14} className="text-teal-400" />
                <span>Period: {data ? `${data.dateRange.from} to ${data.dateRange.to}` : reportDate}</span>
                <span className="opacity-40">|</span>
                <span>Generated: {data?.generatedAt || 'Live'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
              <span className="text-xs text-slate-200 font-medium">Reporting Day:</span>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Key Metric Tiles */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <span className="text-xs uppercase font-semibold text-slate-300 tracking-wider">Verified Sales</span>
                <div className="text-2xl font-black text-white mt-1">
                  {formatINR(data.amountMetrics.find(m => m.category === 'TOTAL')?.actualVerified || 0)}
                </div>
                <div className="text-xs text-teal-300 font-semibold mt-1 flex items-center gap-1">
                  Target: {formatINR(data.amountMetrics.find(m => m.category === 'TOTAL')?.target || 0)}
                  <span className="text-red-300">({formatPct(data.amountMetrics.find(m => m.category === 'TOTAL')?.shortfallPct || 0)})</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <span className="text-xs uppercase font-semibold text-slate-300 tracking-wider">Orders Quantity</span>
                <div className="text-2xl font-black text-white mt-1">
                  {data.quantityMetrics.find(m => m.category === 'TOTAL')?.actual || 0} Orders
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-1">
                  Target: {data.quantityMetrics.find(m => m.category === 'TOTAL')?.target || 0}
                  <span className="text-red-300 ml-1">({formatPct(data.quantityMetrics.find(m => m.category === 'TOTAL')?.shortfallPct || 0)})</span>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <span className="text-xs uppercase font-semibold text-slate-300 tracking-wider">Collections Received</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {formatINR(data.financialBadges.collectionAmountDone)}
                </div>
                <div className="text-xs text-amber-300 font-semibold mt-1">
                  Pending: {formatINR(data.financialBadges.collectionAmountPending)}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <span className="text-xs uppercase font-semibold text-slate-300 tracking-wider">Cancelled Bookings</span>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  {formatINR(data.financialBadges.bookingCancelledAmount)}
                </div>
                <div className="text-xs text-slate-300 font-semibold mt-1">
                  Pending Verif: {formatINR(data.financialBadges.bookingsVerifiedPending)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 gap-6 overflow-x-auto text-sm font-semibold text-slate-500">
          {[
            { id: 'overview', label: '1. Planned vs Actual & Weekly' },
            { id: 'leaderboard', label: '2. Sales Leaderboard (MTD)' },
            { id: 'discounts', label: '3. Discount Governance' },
            { id: 'cancellations', label: '4. Cancellations with Reason' },
            { id: 'complimentary', label: '5. Complimentary Bookings' },
            { id: 'marketing', label: '6. Marketing Leads Trend' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-800'
                  : 'border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <RefreshCw className="animate-spin text-teal-600 mx-auto mb-3" size={24} />
            <p className="text-sm font-semibold text-slate-600">Loading KTAHV Monthly Sales Report – Daily Progress...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {data && !loading && (
          <>
            {/* TAB 1: OVERVIEW & WEEKLY */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Amount Planned vs Actual */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-800 mb-1">Channel Amount Planned vs Actual</h2>
                    <p className="text-xs text-slate-500 mb-4">Verified sales revenue achieved vs monthly budget</p>
                    
                    <div className="divide-y divide-slate-100">
                      {data.amountMetrics.map((m) => (
                        <div key={m.category} className="py-2.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{m.category}</span>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-bold text-slate-900">{formatINR(m.actualVerified)}</div>
                              <div className="text-xs text-slate-400">Target: {formatINR(m.target)}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                m.shortfallPct >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {formatPct(m.shortfallPct)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantity Planned vs Actual */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-800 mb-1">Bookings Quantity Planned vs Actual</h2>
                    <p className="text-xs text-slate-500 mb-4">Confirmed booking count across channels</p>
                    
                    <div className="divide-y divide-slate-100">
                      {data.quantityMetrics.map((q) => (
                        <div key={q.category} className="py-2.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{q.category}</span>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <div className="font-bold text-slate-900">{q.actual} Orders</div>
                              <div className="text-xs text-slate-400">Target: {q.target}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                q.shortfallPct >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {formatPct(q.shortfallPct)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weekly Run-Rate Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h2 className="text-base font-bold text-slate-800 mb-1">Weekly Run-Rate of This Month (Mon–Sun)</h2>
                  <p className="text-xs text-slate-500 mb-4">Progression of calls, uploads, and verified sales by week</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Week Interval</th>
                          <th className="py-3 px-4 text-right">Calls Uploaded</th>
                          <th className="py-3 px-4 text-right">Converted Qty</th>
                          <th className="py-3 px-4 text-right">Verified Sale Amount</th>
                          <th className="py-3 px-4 text-right">Run-rate Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.weeklyBreakdown.map((w) => {
                          const total = data.weeklyBreakdown.reduce((sum, item) => sum + item.verifiedSaleAmt, 0)
                          const share = total > 0 ? (w.verifiedSaleAmt / total) * 100 : 0
                          return (
                            <tr key={w.week} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-4 font-bold text-slate-800">{w.week}</td>
                              <td className="py-3 px-4 text-right">{formatNum(w.calls)}</td>
                              <td className="py-3 px-4 text-right font-medium">{formatNum(w.convertedQty)}</td>
                              <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(w.verifiedSaleAmt)}</td>
                              <td className="py-3 px-4 text-right">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                                  {share.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SALES LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">KTAHV Sales Performance Leaderboard</h2>
                    <p className="text-xs text-slate-500">Employee-level performance across Orders, NBD, CRR, Calls & Collections</p>
                  </div>
                  
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search salesperson..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Rank & Agent</th>
                        <th className="py-3 px-3 text-right">Orders (Ver/Plan)</th>
                        <th className="py-3 px-3 text-right">% Order Ach</th>
                        <th className="py-3 px-3 text-right">NBD Orders</th>
                        <th className="py-3 px-3 text-right">CRR Orders</th>
                        <th className="py-3 px-3 text-right">Verified Sale Amt</th>
                        <th className="py-3 px-3 text-right">Planned Target</th>
                        <th className="py-3 px-3 text-right">% Target Ach</th>
                        <th className="py-3 px-3 text-right">NBD Sale Amt</th>
                        <th className="py-3 px-3 text-right">CRR Sale Amt</th>
                        <th className="py-3 px-3 text-right">Calls (Total)</th>
                        <th className="py-3 px-3 text-right">Collections Done</th>
                        <th className="py-3 px-3 text-right">Pending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSalespeople.map((p) => (
                        <tr key={p.salesPerson} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600">
                              {p.rank}
                            </span>
                            {p.salesPerson}
                          </td>
                          <td className="py-3 px-3 text-right font-medium">{p.actualVerifiedOrders} / {p.plannedTotalOrders}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.orderTargetAchievedPct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {formatPct(p.orderTargetAchievedPct)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">{p.actualVerifiedNBDOrders} / {p.plannedNBDOrders}</td>
                          <td className="py-3 px-3 text-right">{p.actualVerifiedCRROrders} / {p.plannedCRROrders}</td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(p.verifiedActualSaleAmount)}</td>
                          <td className="py-3 px-3 text-right text-slate-500">{formatINR(p.plannedTotalSaleValue)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.saleValueAchievedPct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {formatPct(p.saleValueAchievedPct)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">{formatINR(p.actualNBDSaleAmount)}</td>
                          <td className="py-3 px-3 text-right">{formatINR(p.actualCRRSaleAmount)}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatNum(p.totalCallsUploaded)}</td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatINR(p.collectionAmount)}</td>
                          <td className="py-3 px-3 text-right font-bold text-rose-600">{formatINR(p.pendingPayments)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td className="py-3 px-3 text-slate-900">Grand Total</td>
                        <td className="py-3 px-3 text-right">{data.salespeopleTotal.actualVerifiedOrders} / {data.salespeopleTotal.plannedTotalOrders}</td>
                        <td className="py-3 px-3 text-right">{formatPct(data.salespeopleTotal.orderTargetAchievedPct)}</td>
                        <td className="py-3 px-3 text-right">{data.salespeopleTotal.actualVerifiedNBDOrders} / {data.salespeopleTotal.plannedNBDOrders}</td>
                        <td className="py-3 px-3 text-right">{data.salespeopleTotal.actualVerifiedCRROrders} / {data.salespeopleTotal.plannedCRROrders}</td>
                        <td className="py-3 px-3 text-right">{formatINR(data.salespeopleTotal.verifiedActualSaleAmount)}</td>
                        <td className="py-3 px-3 text-right">{formatINR(data.salespeopleTotal.plannedTotalSaleValue)}</td>
                        <td className="py-3 px-3 text-right">{formatPct(data.salespeopleTotal.saleValueAchievedPct)}</td>
                        <td className="py-3 px-3 text-right">{formatINR(data.salespeopleTotal.actualNBDSaleAmount)}</td>
                        <td className="py-3 px-3 text-right">{formatINR(data.salespeopleTotal.actualCRRSaleAmount)}</td>
                        <td className="py-3 px-3 text-right">{formatNum(data.salespeopleTotal.totalCallsUploaded)}</td>
                        <td className="py-3 px-3 text-right text-emerald-700">{formatINR(data.salespeopleTotal.collectionAmount)}</td>
                        <td className="py-3 px-3 text-right text-rose-700">{formatINR(data.salespeopleTotal.pendingPayments)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DISCOUNT GOVERNANCE */}
            {activeTab === 'discounts' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Discount Governance Analysis</h2>
                  <p className="text-xs text-slate-500">Breakdown of gross booking values, average discount %, and final invoiced amount</p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Rank & Salesperson</th>
                        <th className="py-3 px-4 text-right">Pre-Discount Booking Value</th>
                        <th className="py-3 px-4 text-right">Avg Discount %</th>
                        <th className="py-3 px-4 text-right">Total Discount Given</th>
                        <th className="py-3 px-4 text-right">Final Invoiced Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.discountReport.map((d) => (
                        <tr key={d.salesPerson} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {d.rank}. {d.salesPerson}
                          </td>
                          <td className="py-3 px-4 text-right">{formatINR(d.totalBookingAmountBeforeDiscount)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                              {d.avgDiscountPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-rose-600">{formatINR(d.totalDiscountAmount)}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(d.totalInvoiceAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td className="py-3 px-4">Grand Total</td>
                        <td className="py-3 px-4 text-right">{formatINR(data.discountTotal.totalBookingAmountBeforeDiscount)}</td>
                        <td className="py-3 px-4 text-right">{data.discountTotal.avgDiscountPct.toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-rose-600">{formatINR(data.discountTotal.totalDiscountAmount)}</td>
                        <td className="py-3 px-4 text-right">{formatINR(data.discountTotal.totalInvoiceAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: CANCELLATIONS WITH REASONS */}
            {activeTab === 'cancellations' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Cancellations with Verified Reasons (MTD)</h2>
                  <p className="text-xs text-slate-500">
                    Total Cancelled Amount: <strong className="text-rose-600">{formatINR(data.financialBadges.bookingCancelledAmount)}</strong>
                  </p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Reservation ID</th>
                        <th className="py-3 px-3">Client Name</th>
                        <th className="py-3 px-3">Booking Date/Time</th>
                        <th className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-rose-700">
                            🕐 Cancelled At
                          </span>
                        </th>
                        <th className="py-3 px-3">Stay Dates</th>
                        <th className="py-3 px-3">Package / Room</th>
                        <th className="py-3 px-3 text-right">Invoice Amount</th>
                        <th className="py-3 px-3">Agent</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Remarks / Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.cancelledBookings.map((c) => (
                        <tr key={c.reservationId} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3 font-bold text-indigo-700">{c.reservationId}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{c.clientName}</td>
                          <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                            {c.bookingDateTime
                              ? new Date(c.bookingDateTime).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                })
                              : '—'}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {c.cancelledDate ? (
                              <span className="inline-flex flex-col">
                                <span className="font-bold text-rose-700">
                                  {c.cancelledDate.split(' ')[0]}
                                </span>
                                <span className="text-[10px] text-rose-500 font-semibold">
                                  {c.cancelledDate.split(' ')[1] || ''}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500">{c.arrivalDate} &rarr; {c.departureDate} ({c.daysOfStay}d)</td>
                          <td className="py-3 px-3 text-slate-600">
                            <div>{c.packageName || 'Treatment Package'}</div>
                            <div className="text-[10px] text-slate-400">{c.roomCategory}</div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(c.invoiceAmount)}</td>
                          <td className="py-3 px-3 text-slate-600">{c.bookingTakenBy}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                              {c.accountsStatus || c.actionStatus || 'Cancelled'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={c.doerRemarks || c.accountsRemarks || ''}>
                            {c.doerRemarks || c.accountsRemarks || 'Auto-released by policy'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: COMPLIMENTARY BOOKINGS */}
            {activeTab === 'complimentary' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Complimentary Bookings (MTD)</h2>
                    <p className="text-xs text-slate-500">Approved complimentary stays — GM/Director authorised, zero revenue impact</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold">
                    {data.complimentaryBookings?.length ?? 0} Records
                  </span>
                </div>

                {(data.complimentaryBookings?.length ?? 0) === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    No complimentary bookings recorded for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-3">Reservation ID</th>
                          <th className="py-3 px-3">Client Name</th>
                          <th className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-violet-700">
                              🕐 Booking Date/Time
                            </span>
                          </th>
                          <th className="py-3 px-3">Stay Dates</th>
                          <th className="py-3 px-3">Package / Room</th>
                          <th className="py-3 px-3">Agent</th>
                          <th className="py-3 px-3">PMS Status</th>
                          <th className="py-3 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.complimentaryBookings.map((c) => (
                          <tr key={c.reservationId} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-3 font-bold text-violet-700">{c.reservationId}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">{c.clientName}</td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {c.bookingDateTime ? (
                                <span className="inline-flex flex-col">
                                  <span className="font-bold text-violet-700">
                                    {c.bookingDateTime.split(' ')[0]}
                                  </span>
                                  <span className="text-[10px] text-violet-500 font-semibold">
                                    {c.bookingDateTime.split(' ')[1] || ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {c.arrivalDate} &rarr; {c.departureDate}
                              <span className="ml-1 text-[10px] text-slate-400">({c.daysOfStay}d)</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              <div>{c.packageName}</div>
                              <div className="text-[10px] text-slate-400">{c.roomCategory}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-medium">{c.bookingTakenBy}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {c.pmsStatus || 'Confirmed'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={c.remarks || ''}>
                              {c.remarks || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: MARKETING LEADS */}
            {activeTab === 'marketing' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Marketing Lead Target Report</h2>
                  <p className="text-xs text-slate-500">Daily target vs Fresh vs CRR leads and percentage achieved</p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">Target Leads</th>
                        <th className="py-3 px-4 text-right">Fresh Leads</th>
                        <th className="py-3 px-4 text-right">CRR Leads</th>
                        <th className="py-3 px-4 text-right">Actual Leads</th>
                        <th className="py-3 px-4 text-right">Achievement %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.marketingLeads.map((m) => (
                        <tr key={m.date} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-bold text-slate-800">{m.date}</td>
                          <td className="py-3 px-4 text-right">{m.targetLead}</td>
                          <td className="py-3 px-4 text-right">{m.freshLead}</td>
                          <td className="py-3 px-4 text-right">{m.crrLead}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">{m.actualLead}</td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                m.targetAchievedPct >= 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {formatPct(m.targetAchievedPct)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
