"use client"

import { useState, useEffect } from "react"
import { ErrorBoundary } from "./error-boundary"
import { LoadingSkeleton } from "./loading-skeleton"
import { TrendingUp, TrendingDown } from "lucide-react"

interface KPIData {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  revenueINR: number
  roiPct: number
  trends: {
    totalLeads: number[]
    convertedLeads: number[]
    revenueINR: number[]
  }
  planVsActual: {
    totalLeads: { plan: number; actual: number }
    convertedLeads: { plan: number; actual: number }
    revenueINR: { plan: number; actual: number }
    conversionRate: { plan: number; actual: number }
    roiPct: { plan: number; actual: number }
  }
  mom: {
    totalLeads: number
    convertedLeads: number
    conversionRate: number
    revenueINR: number
    roiPct: number
  }
}

export function KPISection({ filters }: { filters: any }) {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPIData = async (filters: any) => {
      try {
        setError(null)
        const response = await fetch("/api/marketing/kpis")

        if (!response.ok) {
          throw new Error(`Failed to fetch KPI data: ${response.status}`)
        }

        const data = await response.json()
        setKpiData(data)
      } catch (error) {
        console.error("Failed to fetch KPI data:", error)
        setError(error instanceof Error ? error.message : "Failed to load KPI data")
      } finally {
        setLoading(false)
      }
    }

    fetchKPIData(filters)
  }, [filters])


  if (loading) {
    return (
      <div className="w-full mt-6 sm:mt-8">
        <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-white">
          <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b-2 border-slate-200">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <LoadingSkeleton type="kpi" count={5} />
          </div>
        </div>
      </div>
    )
  }

  if (error || !kpiData) {
    return (
      <ErrorBoundary
        fallback={
          <div className="w-full mt-6 sm:mt-8">
            <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-white">
              <div className="p-6 sm:p-12">
                <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-lg border border-gray-100 p-10">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Data</h3>
                  <p className="text-base text-gray-600 mb-6">{error || "Failed to load KPI data"}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2f6b4f] to-[#1f4d38] text-white rounded-lg hover:from-[#1f4d38] hover:to-[#2f6b4f] transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <div />
      </ErrorBoundary>
    )
  }

  const formatNumber = (num: number) => num.toLocaleString('en-IN')
  const formatCurrency = (num: number) => `₹${num.toLocaleString('en-IN')}`
  const formatPercent = (num: number) => `${num.toFixed(1)}%`

  const kpiCards = [
    {
      title: "TOTAL LEADS",
      value: formatNumber(kpiData.totalLeads),
      change: kpiData.mom.totalLeads,
      plan: formatNumber(kpiData.planVsActual.totalLeads.plan),
      actual: formatNumber(kpiData.planVsActual.totalLeads.actual),
      planVsActual: ((kpiData.planVsActual.totalLeads.actual - kpiData.planVsActual.totalLeads.plan) / kpiData.planVsActual.totalLeads.plan * 100),
      color: "blue",
      gradient: "from-blue-50 to-indigo-50",
      border: "border-blue-200",
      accent: "from-blue-500 to-indigo-500"
    },
    {
      title: "CONVERTED LEADS",
      value: formatNumber(kpiData.convertedLeads),
      change: kpiData.mom.convertedLeads,
      plan: formatNumber(kpiData.planVsActual.convertedLeads.plan),
      actual: formatNumber(kpiData.planVsActual.convertedLeads.actual),
      planVsActual: ((kpiData.planVsActual.convertedLeads.actual - kpiData.planVsActual.convertedLeads.plan) / kpiData.planVsActual.convertedLeads.plan * 100),
      color: "purple",
      gradient: "from-purple-50 to-pink-50",
      border: "border-purple-200",
      accent: "from-purple-500 to-pink-500"
    },
    {
      title: "CONVERSION %",
      value: formatPercent(kpiData.conversionRate * 100),
      change: kpiData.mom.conversionRate,
      plan: formatPercent(kpiData.planVsActual.conversionRate.plan * 100),
      actual: formatPercent(kpiData.planVsActual.conversionRate.actual * 100),
      planVsActual: ((kpiData.planVsActual.conversionRate.actual - kpiData.planVsActual.conversionRate.plan) / kpiData.planVsActual.conversionRate.plan * 100),
      color: "amber",
      gradient: "from-amber-50 to-orange-50",
      border: "border-amber-200",
      accent: "from-amber-500 to-orange-500"
    },
    {
      title: "REVENUE",
      value: formatCurrency(kpiData.revenueINR),
      change: kpiData.mom.revenueINR,
      plan: formatCurrency(kpiData.planVsActual.revenueINR.plan),
      actual: formatCurrency(kpiData.planVsActual.revenueINR.actual),
      planVsActual: ((kpiData.planVsActual.revenueINR.actual - kpiData.planVsActual.revenueINR.plan) / kpiData.planVsActual.revenueINR.plan * 100),
      color: "emerald",
      gradient: "from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      accent: "from-emerald-500 to-teal-500"
    },
    {
      title: "ROI %",
      value: formatPercent(kpiData.roiPct),
      change: kpiData.mom.roiPct,
      plan: formatPercent(kpiData.planVsActual.roiPct.plan),
      actual: formatPercent(kpiData.planVsActual.roiPct.actual),
      planVsActual: ((kpiData.planVsActual.roiPct.actual - kpiData.planVsActual.roiPct.plan) / kpiData.planVsActual.roiPct.plan * 100),
      color: "rose",
      gradient: "from-rose-50 to-red-50",
      border: "border-rose-200",
      accent: "from-rose-500 to-red-500"
    }
  ]

  return (
    <ErrorBoundary>
      <div className="w-full mt-6 sm:mt-8">
        {/* Main Container with Border */}
        <div className="border-2 border-slate-300 rounded-2xl overflow-hidden shadow-lg bg-white">

          {/* Header Section */}
          <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b-2 border-slate-200">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-4">
              {/* Left */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-indigo-100">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-800 leading-tight">
                    Key Performance Indicators
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time metrics & performance overview
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* KPI Cards Grid - Contained with proper padding */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {kpiCards.map((card, index) => (
                <div
                  key={index}
                  className={`relative bg-white ${card.border} rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden min-w-0`}
                >
                  {/* Top Accent Bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accent}`}></div>

                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-40`}></div>

                  {/* Content */}
                  <div className="relative p-4 space-y-3">
                    {/* Title and Change */}
                    <div className="flex items-start justify-between">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{card.title}</h3>
                      <div className={`flex items-center gap-1 text-xs font-bold ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {card.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(Math.abs(card.change))}
                      </div>
                    </div>

                    {/* Main Value */}
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{card.value}</div>

                    {/* Mini Sparkline Placeholder */}
                    <div className="h-8 flex items-end gap-0.5">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 bg-gradient-to-t ${card.accent} opacity-30 rounded-t`}
                          style={{ height: `${Math.random() * 100}%` }}
                        ></div>
                      ))}
                    </div>

                    {/* Plan vs Actual */}
                    <div className="pt-2 border-t border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Plan vs Actual</span>
                        <span className={`font-bold ${card.planVsActual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {card.planVsActual >= 0 ? '+' : ''}{formatPercent(card.planVsActual)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-slate-500">Plan</div>
                          <div className="font-semibold text-slate-700 break-words">{card.plan}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Actual</div>
                          <div className="font-semibold text-slate-700 break-words">{card.actual}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </ErrorBoundary>
  )
}
