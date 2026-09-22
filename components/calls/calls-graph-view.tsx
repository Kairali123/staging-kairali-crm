"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Award, BarChart3, Phone, TrendingDown, TrendingUp, UserCheck, UserPlus } from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, ReferenceLine, Cell, LabelList, Area, AreaChart,
} from "recharts"
import type { CallsRow } from "@/lib/calls-report"

// Graph view of the calls report. Loaded on demand (next/dynamic) so the chart library is not part of the
// initial page bundle, and its aggregations only run once someone opens this view.

const MONTH_ORDER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

const formatNumber = (v: number | undefined | null) =>
  !v || isNaN(v) ? "0" : Math.round(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })
const formatPct = (v: number | undefined | null) =>
  !v || isNaN(v) ? "0.0" : v.toFixed(1)

interface Props {
  /** Rows after the page's filters. */
  rows: CallsRow[]
  monthFilter: string
  yearFilter: string
}

export default function CallsGraphView({ rows: filteredData, monthFilter, yearFilter }: Props) {
  /* ─── monthly chart data ─────────────────────────────────────────────────── */
  const monthlyChartData = useMemo(() =>
    MONTH_ORDER.map(month => {
      const md = filteredData.filter(d => d.month.toUpperCase() === month && (yearFilter === "all" || d.year === yearFilter))
      const planned = md.reduce((s, d) => s + (d.plannedCalls || 0), 0)
      const actual = md.reduce((s, d) => s + (d.actualCalls || 0), 0)
      const newC = md.reduce((s, d) => s + (d.newClientsActual || 0), 0)
      const oldC = md.reduce((s, d) => s + (d.oldClientsActual || 0), 0)
      const variance = actual - planned
      return {
        month: month.substring(0, 3).charAt(0).toUpperCase() + month.substring(1, 3).toLowerCase(),
        planned, actual, newClients: newC, oldClients: oldC, variance,
        variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)),
      }
    }).filter(d => d.planned > 0 || d.actual > 0),
    [filteredData, yearFilter])

  /* ─── selected-month KPIs (graph view) ──────────────────────────────────── */
  const selectedMonthKPIs = useMemo(() => {
    const cd = filteredData.filter(d =>
      (monthFilter === "all" || d.month === monthFilter) &&
      (yearFilter === "all" || d.year === yearFilter))
    const planned = cd.reduce((s, d) => s + (d.plannedCalls || 0), 0)
    const actual = cd.reduce((s, d) => s + (d.actualCalls || 0), 0)
    const newC = cd.reduce((s, d) => s + (d.newClientsActual || 0), 0)
    const oldC = cd.reduce((s, d) => s + (d.oldClientsActual || 0), 0)
    const variance = actual - planned
    return {
      plannedCalls: planned, actualCalls: actual,
      newClientsActual: newC, oldClientsActual: oldC,
      varianceCalls: variance,
      variancePercent: planned !== 0 ? (variance / planned) * 100 : 0,
    }
  }, [filteredData, monthFilter, yearFilter])

  /* ─── quarterly metrics ─────────────────────────────────────────────────── */
  const quarterlyMetrics = useMemo(() => {
    const qs = {
      Q1: ["JANUARY", "FEBRUARY", "MARCH"], Q2: ["APRIL", "MAY", "JUNE"],
      Q3: ["JULY", "AUGUST", "SEPTEMBER"], Q4: ["OCTOBER", "NOVEMBER", "DECEMBER"],
    }
    return Object.entries(qs).map(([quarter, months]) => {
      const qd = filteredData.filter(d => months.includes(d.month.toUpperCase()) && (yearFilter === "all" || d.year === yearFilter))
      const planned = qd.reduce((s, d) => s + (d.plannedCalls || 0), 0)
      const actual = qd.reduce((s, d) => s + (d.actualCalls || 0), 0)
      const variance = actual - planned
      return {
        quarter, planned, actual, variance,
        variancePercent: Number((planned !== 0 ? (variance / planned) * 100 : 0).toFixed(1)),
        achieved: actual >= planned,
      }
    }).filter(q => q.planned > 0 || q.actual > 0)
  }, [filteredData, yearFilter])

  /* ─── cumulative chart data ──────────────────────────────────────────────── */
  const cumulativeCallData = useMemo(() => {
    let cp = 0, ca = 0, cn = 0, co = 0
    return monthlyChartData.map(m => {
      cp += m.planned; ca += m.actual; cn += m.newClients; co += m.oldClients
      return {
        month: m.month,
        cumulativePlanned: cp, cumulativeActual: ca,
        cumulativeNew: cn, cumulativeOld: co,
      }
    })
  }, [monthlyChartData])

  /* ─── custom tooltip ─────────────────────────────────────────────────────── */
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload || {}
    const planned = Number(d.planned ?? 0)
    const actual = Number(d.actual ?? 0)
    const newC = Number(d.newClients ?? 0)
    const oldC = Number(d.oldClients ?? 0)
    const variance = actual - planned
    const vp = planned !== 0 ? (variance / planned) * 100 : 0
    return (
      <div style={{ borderRadius: 12, border: "2px solid #e2e8f0", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: 12, backgroundColor: "white", minWidth: 190 }}>
        <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8, fontSize: 14 }}>{label}</div>
        <div className="flex flex-col gap-1">
          {[
            ["Planned Calls", formatNumber(planned), "text-slate-600", "text-blue-700"],
            ["Actual Calls", formatNumber(actual), "text-slate-600", "text-green-700"],
            ["NBD Clients", formatNumber(newC), "text-slate-600", "text-violet-700"],
            ["CRR Clients", formatNumber(oldC), "text-slate-600", "text-amber-700"],
            ["Variance", formatNumber(variance), "text-slate-600", variance >= 0 ? "text-green-700" : "text-red-700"],
          ].map(([lbl, val, lc, vc]) => (
            <div key={lbl} className="flex justify-between">
              <div className={`text-xs ${lc}`}>{lbl}</div>
              <div className={`text-sm font-semibold ${vc}`}>{val}</div>
            </div>
          ))}
          <div className="flex justify-between">
            <div className="text-xs text-slate-600">Variance %</div>
            <div className={`text-sm font-semibold ${vp >= 0 ? "text-green-700" : "text-red-700"}`}>
              {vp >= 0 ? "+" : ""}{formatPct(vp)}%
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
    
            {/* Month KPI summary cards */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">{monthFilter} {yearFilter}</h2>
                <p className="text-sm text-slate-600 mt-1">Calls Performance Overview & Metrics</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-4 md:gap-5">
                {[
                  { icon: <Phone className="w-6 h-6 text-blue-600" />, bg: "bg-blue-100", badge: "PLANNED", badgeCls: "bg-blue-50 text-blue-700 border-blue-200", label: "Planned Calls", val: selectedMonthKPIs.plannedCalls, color: "text-slate-900", note: "Monthly target benchmark", hoverBorder: "hover:border-blue-300" },
                  { icon: <Activity className="w-6 h-6 text-green-600" />, bg: "bg-green-100", badge: "ACHIEVED", badgeCls: "bg-green-50 text-green-700 border-green-200", label: "Actual Calls", val: selectedMonthKPIs.actualCalls, color: "text-slate-900", note: null, hoverBorder: "hover:border-green-300" },
                  { icon: <UserPlus className="w-6 h-6 text-violet-600" />, bg: "bg-violet-100", badge: "NEW", badgeCls: "bg-violet-50 text-violet-700 border-violet-200", label: "NBD Clients", val: selectedMonthKPIs.newClientsActual, color: "text-violet-700", note: "Newly acquired clients", hoverBorder: "hover:border-violet-300" },
                  { icon: <UserCheck className="w-6 h-6 text-amber-600" />, bg: "bg-amber-100", badge: "RETURNING", badgeCls: "bg-amber-50 text-amber-700 border-amber-200", label: "CRR Clients", val: selectedMonthKPIs.oldClientsActual, color: "text-amber-700", note: "Returning clients", hoverBorder: "hover:border-amber-300" },
                ].map(c => (
                  <Card key={c.label} className={`border border-slate-200 ${c.hoverBorder} transition-colors`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 ${c.bg} rounded-lg`}>{c.icon}</div>
                        <Badge variant="outline" className={`${c.badgeCls} text-xs font-medium`}>{c.badge}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{c.label}</p>
                      <p className={`text-xl font-bold ${c.color} mb-2 break-all`}>{formatNumber(c.val)}</p>
                      {c.note && <p className="text-xs text-slate-500">{c.note}</p>}
                    </CardContent>
                  </Card>
                ))}
                {/* Variance card */}
                <Card className={`border border-slate-200 ${selectedMonthKPIs.varianceCalls >= 0 ? "hover:border-green-300" : "hover:border-red-300"} transition-colors`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${selectedMonthKPIs.varianceCalls >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                        <Activity className={`w-6 h-6 ${selectedMonthKPIs.varianceCalls >= 0 ? "text-green-600" : "text-red-600"}`} />
                      </div>
                      <Badge variant="outline" className={selectedMonthKPIs.varianceCalls >= 0 ? "bg-green-50 text-green-700 border-green-200 text-xs font-medium" : "bg-red-50 text-red-700 border-red-200 text-xs font-medium"}>
                        {selectedMonthKPIs.varianceCalls >= 0 ? "SURPLUS" : "DEFICIT"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Variance</p>
                    <p className={`text-xl font-bold mb-2 break-all ${selectedMonthKPIs.varianceCalls >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatNumber(Math.abs(selectedMonthKPIs.varianceCalls))}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className={`font-semibold text-sm ${selectedMonthKPIs.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {selectedMonthKPIs.variancePercent >= 0 ? "+" : ""}{formatPct(selectedMonthKPIs.variancePercent)}%
                      </span> from target
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
    
            {/* Quarter + Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-2 border-slate-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg"><BarChart3 className="w-5 h-5 text-blue-600" /></div>
                    <div><CardTitle className="text-base font-bold text-slate-800">Quarter Performance</CardTitle><p className="text-xs text-slate-500 mt-0.5">Q1 to Q4 calls breakdown</p></div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {quarterlyMetrics.length > 0 ? quarterlyMetrics.map(q => (
                      <div key={q.quarter} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${q.achieved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{q.quarter}</div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{formatNumber(q.actual)} calls</div>
                            <div className="text-xs text-slate-500">Target: {formatNumber(q.planned)}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${q.variancePercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {q.variancePercent >= 0 ? "+" : ""}{q.variancePercent}%
                        </div>
                      </div>
                    )) : <div className="text-center py-8 text-slate-500"><BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-sm">No quarterly data available</p></div>}
                  </div>
                </CardContent>
              </Card>
    
              <Card className="border-2 border-slate-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-lg"><Award className="w-5 h-5 text-purple-600" /></div>
                    <div><CardTitle className="text-base font-bold text-slate-800">Performance Summary</CardTitle><p className="text-xs text-slate-500 mt-0.5">Cumulative call totals</p></div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {cumulativeCallData.length > 0 && (<>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Planned</div>
                        <div className="text-xl font-black text-blue-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativePlanned)}</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative Actual</div>
                        <div className="text-xl font-black text-green-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativeActual)}</div>
                      </div>
                      <div className="p-3 bg-violet-50 rounded-lg border border-violet-200">
                        <div className="text-xs text-slate-600 font-semibold mb-1">Cumulative NBD Clients</div>
                        <div className="text-xl font-black text-violet-700 break-all">{formatNumber(cumulativeCallData[cumulativeCallData.length - 1].cumulativeNew)}</div>
                      </div>
                    </>)}
                  </div>
                </CardContent>
              </Card>
            </div>
    
            {/* Cumulative Area Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="p-2.5 bg-purple-100 rounded-lg"><Activity className="w-5 h-5 text-purple-600" /></div>
                <div><h3 className="text-lg font-semibold text-slate-800">Cumulative Calls Tracking</h3><p className="text-xs text-slate-500 mt-0.5">Year-to-date for {yearFilter}</p></div>
              </div>
              {cumulativeCallData.length > 0 ? (
                <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                  <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={cumulativeCallData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <defs>
                          <linearGradient id="cpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} /></linearGradient>
                          <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} /></linearGradient>
                          <linearGradient id="cnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} /><stop offset="95%" stopColor="#a78bfa" stopOpacity={0.05} /></linearGradient>
                          <linearGradient id="coGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={55} />
                        <Tooltip content={({ active, payload, label }) => {
                          if (!active || !payload) return null
                          return (
                            <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-lg">
                              <p className="font-bold text-slate-900 mb-2">{label}</p>
                              <div className="space-y-1 text-sm">
                                {([["Cumul. Planned", "text-blue-600", 0], ["Cumul. Actual", "text-green-600", 1], ["Cumul. NBD Clients", "text-violet-600", 2], ["Cumul. CRR Clients", "text-amber-600", 3]] as [string, string, number][]).map(([lbl, cls, i]) =>
                                  <div key={lbl} className="flex justify-between gap-6">
                                    <span className={`${cls} font-semibold`}>{lbl}:</span>
                                    <span className="font-bold">{formatNumber(payload[i]?.value as number || 0)}</span>
                                  </div>)}
                              </div>
                            </div>
                          )
                        }} />
                        <Area type="monotone" dataKey="cumulativePlanned" stroke="#3b82f6" strokeWidth={3} fill="url(#cpGrad)" name="Cumulative Planned" />
                        <Area type="monotone" dataKey="cumulativeActual" stroke="#22c55e" strokeWidth={3} fill="url(#caGrad)" name="Cumulative Actual" />
                        <Area type="monotone" dataKey="cumulativeNew" stroke="#8b5cf6" strokeWidth={2} fill="url(#cnGrad)" name="Cumulative NBD Clients" />
                        <Area type="monotone" dataKey="cumulativeOld" stroke="#f59e0b" strokeWidth={2} fill="url(#coGrad)" name="Cumulative CRR Clients" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div></div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <Activity className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                  <p className="text-sm text-slate-500">Select a year to view cumulative tracking</p>
                </div>
              )}
            </div>
    
            {/* Monthly Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <div className="p-2.5 bg-slate-100 rounded-lg"><BarChart3 className="w-5 h-5 text-slate-600" /></div>
                <div><h3 className="text-lg font-semibold text-slate-800">Year-to-Date Calls Trends</h3><p className="text-xs text-slate-500 mt-0.5">Monthly planned vs actual for {yearFilter}</p></div>
              </div>
              {monthlyChartData.length > 0 ? (
                <div className="space-y-6">
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-200">
                    <div className="overflow-x-auto -mx-4 px-4"><div className="min-w-[600px]">
                      <ResponsiveContainer width="100%" height={monthlyChartData.length <= 3 ? 400 : monthlyChartData.length <= 6 ? 450 : 550}>
                        <BarChart data={monthlyChartData} margin={{ top: 40, right: 30, left: 20, bottom: 80 }}>
                          <defs>
                            <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={1} /></linearGradient>
                            <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity={0.9} /><stop offset="100%" stopColor="#22c55e" stopOpacity={1} /></linearGradient>
                            <linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.9} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} /></linearGradient>
                            <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fde68a" stopOpacity={0.9} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={1} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" angle={monthlyChartData.length > 6 ? -45 : -35} textAnchor="end" height={90} tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" interval={0} />
                          <YAxis tick={{ fontSize: 12, fontWeight: 600, fill: "#475569" }} stroke="#94a3b8" width={55} />
                          <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                          <Bar dataKey="planned" fill="url(#bg1)" name="Planned Calls" radius={[6, 6, 0, 0]} maxBarSize={60}
                            label={{ position: "top", formatter: ((v: any, e: any, i: number) => { const dp = monthlyChartData[i]; const vp = dp?.variancePercent ? Number(dp.variancePercent) : 0; return vp !== 0 ? `${vp > 0 ? "+" : ""}${vp.toFixed(1)}%` : "" }) as any, fill: "#64748b", fontSize: 11, fontWeight: "600", offset: 8 }} />
                          <Bar dataKey="actual" fill="url(#bg2)" name="Actual Calls" radius={[6, 6, 0, 0]} maxBarSize={60} />
                          <Bar dataKey="newClients" fill="url(#bg3)" name="NBD Clients" radius={[6, 6, 0, 0]} maxBarSize={60} />
                          <Bar dataKey="oldClients" fill="url(#bg4)" name="CRR Clients" radius={[6, 6, 0, 0]} maxBarSize={60} />
                          <Bar dataKey="variance" name="Variance" radius={[4, 4, 0, 0]} maxBarSize={35}>
                            {monthlyChartData.map((e, i) => <Cell key={`c-${i}`} fill={e.variance >= 0 ? "#22c55e" : "#ef4444"} opacity={0.75} />)}
                            <LabelList dataKey="variancePercent" position="top" formatter={(v: any) => v !== undefined ? `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%` : ""} style={{ fill: "#64748b", fontSize: 10, fontWeight: 600 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div></div>
                  </div>
                  {/* Legend */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      ["bg-blue-50 border-blue-100", "bg-blue-500", "Planned Calls", "Target benchmark"],
                      ["bg-green-50 border-green-100", "bg-green-500", "Actual Calls", "Calls completed"],
                      ["bg-violet-50 border-violet-100", "bg-violet-500", "NBD Clients", "Newly acquired"],
                      ["bg-amber-50 border-amber-100", "bg-amber-500", "CRR Clients", "Returning clients"],
                    ].map(([wrap, dot, lbl, sub]) => (
                      <div key={lbl} className={`flex items-center gap-3 p-4 ${wrap} rounded-lg border`}>
                        <div className={`w-3 h-3 ${dot} rounded`} />
                        <div><p className="text-xs text-slate-600 font-medium">{lbl}</p><p className="text-xs text-slate-500">{sub}</p></div>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-green-600" /><TrendingDown className="w-3.5 h-3.5 text-red-600" /></div>
                      <div><p className="text-xs text-slate-600 font-medium">Variance %</p><p className="text-xs text-slate-500">Performance gap</p></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                  <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-base font-semibold text-slate-600 mb-1">No Data Available</p>
                  <p className="text-sm text-slate-500">Select a different year or add call data</p>
                </div>
              )}
            </div>
    
          </div>
  )
}
