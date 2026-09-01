"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts"
import { formatCurrency, formatNumber } from "@/lib/marketing-vs-sales-mock"
import { ErrorBoundary } from "./error-boundary"
import { LoadingSkeleton } from "./loading-skeleton"

interface ChartData {
  channelPerformance: Array<{ channelId: string; channel: string; totalLeads: number; convertedLeads: number }>
  funnel: { total: number; qualified: number; converted: number; followups: number }
  geo: Array<{ state: string; leads: number; converted: number; revenueINR: number }>
  planningLeads: Array<{ period: string; plan: number; actual: number }>
  leadsAndConversion: Array<{
    period: string
    leadsPlan: number
    leadsActual: number
    convPlan: number
    convActual: number
  }>
  leadsVsRevenue: Array<{ date: string; leads: number; revenueINR: number }>
  monthly: Array<{ month: string; leadsPlan: number; leadsActual: number; convPlan: number; convActual: number }>
  quarterly: Array<{
    fy: string
    quarter: string
    leadsPlan: number
    leadsActual: number
    convPlan: number
    convActual: number
  }>
  revenueBySource: Array<{ source: string; revenueINR: number }>
}

export function ChartsSection() {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setError(null)
        const [
          channelPerformanceRes,
          funnelRes,
          geoRes,
          planningLeadsRes,
          leadsAndConversionRes,
          leadsVsRevenueRes,
          monthlyRes,
          quarterlyRes,
          revenueBySourceRes,
        ] = await Promise.all([
          fetch("/api/marketing/overview/channel-performance"),
          fetch("/api/marketing/overview/funnel"),
          fetch("/api/marketing/overview/geo"),
          fetch("/api/marketing/planning/leads"),
          fetch("/api/marketing/planning/leads-and-conversion"),
          fetch("/api/marketing/perf/leads-vs-revenue"),
          fetch("/api/marketing/trends/monthly"),
          fetch("/api/marketing/trends/quarterly"),
          fetch("/api/marketing/revenue/by-source"),
        ])

        // Check if any request failed
        const responses = [
          channelPerformanceRes,
          funnelRes,
          geoRes,
          planningLeadsRes,
          leadsAndConversionRes,
          leadsVsRevenueRes,
          monthlyRes,
          quarterlyRes,
          revenueBySourceRes,
        ]

        const failedResponse = responses.find((res) => !res.ok)
        if (failedResponse) {
          throw new Error(`Failed to fetch chart data: ${failedResponse.status}`)
        }

        const data = {
          channelPerformance: await channelPerformanceRes.json(),
          funnel: await funnelRes.json(),
          geo: await geoRes.json(),
          planningLeads: await planningLeadsRes.json(),
          leadsAndConversion: await leadsAndConversionRes.json(),
          leadsVsRevenue: await leadsVsRevenueRes.json(),
          monthly: await monthlyRes.json(),
          quarterly: await quarterlyRes.json(),
          revenueBySource: await revenueBySourceRes.json(),
        }

        setChartData(data)
      } catch (error) {
        console.error("Failed to fetch chart data:", error)
        setError(error instanceof Error ? error.message : "Failed to load chart data")
      } finally {
        setLoading(false)
      }
    }

    fetchChartData()
  }, [])

  if (loading) {
    return (
      <section className="w-full mt-6 mb-6 sm:mt-8 sm:mb-8 rounded-2xl border-2 border-slate-300 bg-white shadow-lg overflow-hidden">

        {/* ===== HEADER (SAME AS OTHER CRM SECTIONS) ===== */}
        <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Performance Overview & Analytics
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Comprehensive insights and trend analysis
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== SKELETON ===== */}
        <div className="p-4 sm:p-6">
          <LoadingSkeleton type="chart" count={6} />
        </div>
      </section>
    )
  }


  if (error || !chartData) {
    return (
      <ErrorBoundary
        fallback={
          <div className="text-center py-8">
            <p className="text-[#475569] mb-4">{error || "Failed to load chart data"}</p>
            <button onClick={() => window.location.reload()} className="text-[#2f6b4f] hover:underline">
              Try again
            </button>
          </div>
        }
      >
        <div />
      </ErrorBoundary>
    )
  }

  // Prepare funnel data
  const funnelData = [
    { name: "Total Leads", value: chartData.funnel.total, fill: "#2f6b4f" },
    { name: "Qualified", value: chartData.funnel.qualified, fill: "#059669" },
    { name: "Converted", value: chartData.funnel.converted, fill: "#10b981" },
    { name: "Follow-ups", value: chartData.funnel.followups, fill: "#34d399" },
  ]

  // Prepare geo data with intensity
  const maxLeads = Math.max(...chartData.geo.map((item) => item.leads))
  const geoDataWithIntensity = chartData.geo.map((item) => ({
    ...item,
    intensity: (item.leads / maxLeads) * 100,
    conversionRate: (item.converted / item.leads) * 100,
  }))

  // Sort revenue by source data
  const sortedRevenueData = [...chartData.revenueBySource].sort((a, b) => b.revenueINR - a.revenueINR)

  return (
    <ErrorBoundary>
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Performance Overview & Analytics</h2>
              <p className="text-sm text-slate-600 mt-0.5">Comprehensive insights and trend analysis</p>
            </div>
          </div>
        </div>

        {/* Performance Overview Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Channel Performance Bar Chart */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Channel-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.channelPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis dataKey="channel" stroke="#475569" fontSize={11} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#475569" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === "totalLeads" ? "Total Leads" : "Converted Leads",
                      ]}
                    />
                    <Bar dataKey="totalLeads" fill="#2f6b4f" name="totalLeads" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="convertedLeads" fill="#10b981" name="convertedLeads" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={funnelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [formatNumber(value), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {funnelData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <div className="text-sm">
                      <div className="font-medium text-[#1f2a2e]">{item.name}</div>
                      <div className="text-[#475569]">{formatNumber(item.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Performance */}
        <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Geographic Performance by State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {geoDataWithIntensity.map((state) => (
                <div
                  key={state.state}
                  className="p-4 rounded-lg border border-[#dfe7e2] hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: `rgba(47, 107, 79, ${(state.intensity / 100) * 0.1 + 0.05})`,
                  }}
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold text-[#1f2a2e]">{state.state}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-[#475569]">Leads</div>
                        <div className="font-semibold text-[#1f2a2e]">{formatNumber(state.leads)}</div>
                      </div>
                      <div>
                        <div className="text-[#475569]">Converted</div>
                        <div className="font-semibold text-[#1f2a2e]">{formatNumber(state.converted)}</div>
                      </div>
                      <div>
                        <div className="text-[#475569]">Conv. Rate</div>
                        <div className="font-semibold text-[#1f2a2e]">{state.conversionRate.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[#475569]">Revenue</div>
                        <div className="font-semibold text-[#1f2a2e]">{formatCurrency(state.revenueINR)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Planning vs Actual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Leads Planning vs Actual */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Leads: Planned vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.planningLeads} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis dataKey="period" stroke="#475569" fontSize={12} />
                    <YAxis stroke="#475569" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        formatNumber(value),
                        name === "plan" ? "Planned" : "Actual",
                      ]}
                    />
                    <Bar dataKey="plan" fill="#b6864a" name="plan" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="actual" fill="#2f6b4f" name="actual" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads vs Revenue Correlation */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Leads vs Revenue Correlation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.leadsVsRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis
                      dataKey="date"
                      stroke="#475569"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-IN", { month: "short" })}
                    />
                    <YAxis yAxisId="leads" orientation="left" stroke="#475569" fontSize={12} />
                    <YAxis yAxisId="revenue" orientation="right" stroke="#475569" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        name === "leads" ? formatNumber(value) : formatCurrency(value),
                        name === "leads" ? "Leads" : "Revenue",
                      ]}
                    />
                    <Line
                      yAxisId="leads"
                      type="monotone"
                      dataKey="leads"
                      stroke="#2f6b4f"
                      strokeWidth={3}
                      dot={{ fill: "#2f6b4f", strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenueINR"
                      stroke="#b6864a"
                      strokeWidth={3}
                      dot={{ fill: "#b6864a", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trends & Revenue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Monthly Trends */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Monthly Leads & Conversion Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.monthly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis dataKey="month" stroke="#475569" fontSize={12} />
                    <YAxis stroke="#475569" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => {
                        const labels = {
                          leadsPlan: "Leads Plan",
                          leadsActual: "Leads Actual",
                          convPlan: "Conv. Plan",
                          convActual: "Conv. Actual",
                        }
                        return [formatNumber(value), labels[name as keyof typeof labels] || name]
                      }}
                    />
                    <Bar dataKey="leadsPlan" fill="#b6864a" name="leadsPlan" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="leadsActual" fill="#2f6b4f" name="leadsActual" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="convPlan" fill="#d4af37" name="convPlan" radius={[1, 1, 0, 0]} />
                    <Bar dataKey="convActual" fill="#10b981" name="convActual" radius={[1, 1, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Source */}
          <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Revenue by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sortedRevenueData}
                    layout="horizontal"
                    margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                    <XAxis type="number" stroke="#475569" fontSize={12} />
                    <YAxis type="category" dataKey="source" stroke="#475569" fontSize={10} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #dfe7e2",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Bar dataKey="revenueINR" fill="#2f6b4f" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Performance */}
        <Card className="rounded-2xl shadow-sm border-[#dfe7e2]">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-[#1f2a2e]">Quarterly Performance (FY2023-FY2025)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {["FY2023", "FY2024", "FY2025"].map((fy) => {
                const fyData = chartData.quarterly.filter((item) => item.fy === fy)
                return (
                  <div key={fy} className="space-y-3">
                    <h3 className="font-semibold text-[#1f2a2e] text-center">{fy}</h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dfe7e2" />
                          <XAxis dataKey="quarter" stroke="#475569" fontSize={10} />
                          <YAxis stroke="#475569" fontSize={10} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "white",
                              border: "1px solid #dfe7e2",
                              borderRadius: "8px",
                              fontSize: "11px",
                            }}
                            formatter={(value: number, name: string) => {
                              const labels = {
                                leadsPlan: "Leads Plan",
                                leadsActual: "Leads Actual",
                                convPlan: "Conv. Plan",
                                convActual: "Conv. Actual",
                              }
                              return [formatNumber(value), labels[name as keyof typeof labels] || name]
                            }}
                          />
                          <Bar dataKey="leadsActual" fill="#2f6b4f" name="leadsActual" radius={[1, 1, 0, 0]} />
                          <Bar dataKey="convActual" fill="#10b981" name="convActual" radius={[1, 1, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
