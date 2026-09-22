"use client"

import { useMemo, useState, type Ref } from "react"
import { PieChart as PieChartIcon, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EMPLOYEE_PIE_COLORS, EmployeeShareDonut, RankBadge } from "@/components/reports/employee-performance"
import type { CallsRow } from "@/lib/calls-report"

const formatNumber = (v: number) => (!v || Number.isNaN(v) ? "0" : Math.round(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }))
const formatVariance = (pct: number | null) => (pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`)
const varianceTone = (pct: number | null) => (pct === null ? "text-slate-400" : pct >= 0 ? "text-green-700" : "text-red-600")

interface Props {
  /** Rows after the page's filters (company, month, year, employee, search). */
  rows: CallsRow[]
  loading: boolean
  headerRef?: Ref<HTMLDivElement>
}

const NAME_W = 210
const TH = "px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider border-r border-slate-700"

export default function EmployeeCallsPerformance({ rows, loading, headerRef }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)

  const { employees, totals } = useMemo(() => {
    const byName = new Map<string, { empName: string; planned: number; actual: number; newClients: number; oldClients: number }>()
    for (const row of rows) {
      const name = (row.empName || "").trim()
      if (!name) continue
      const item = byName.get(name) ?? { empName: name, planned: 0, actual: 0, newClients: 0, oldClients: 0 }
      item.planned += row.plannedCalls || 0
      item.actual += row.actualCalls || 0
      item.newClients += row.newClientsActual || 0
      item.oldClients += row.oldClientsActual || 0
      byName.set(name, item)
    }
    const all = Array.from(byName.values())
    const actual = all.reduce((s, e) => s + e.actual, 0)
    const list = all
      .map(e => ({
        ...e,
        share: actual > 0 ? (e.actual / actual) * 100 : 0,
        variancePct: e.planned > 0 ? ((e.actual - e.planned) / e.planned) * 100 : null,
      }))
      .sort((a, b) => b.actual - a.actual || b.planned - a.planned || a.empName.localeCompare(b.empName))
    const planned = list.reduce((s, e) => s + e.planned, 0)
    return {
      employees: list,
      totals: {
        planned,
        actual,
        newClients: list.reduce((s, e) => s + e.newClients, 0),
        oldClients: list.reduce((s, e) => s + e.oldClients, 0),
        variancePct: planned > 0 ? ((actual - planned) / planned) * 100 : null,
      },
    }
  }, [rows])

  const contributors = employees.filter(e => e.actual > 0).length
  const shareOfCalls = (n: number) => (totals.actual > 0 ? `${((n / totals.actual) * 100).toFixed(1)}%` : "0.0%")
  const donutItems = useMemo(() => employees.map(e => ({ name: e.empName, value: e.actual })), [employees])
  // The donut colours slices in order of the employees that have calls; the legend must use the same order.
  const colorOf = useMemo(() => {
    const map = new Map<string, string>()
    employees.filter(e => e.actual > 0).forEach((e, i) => map.set(e.empName, EMPLOYEE_PIE_COLORS[i % EMPLOYEE_PIE_COLORS.length]))
    return map
  }, [employees])

  return (
    <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white mt-8">
      <div ref={headerRef} className="w-full px-4 sm:px-6 py-4 bg-[#f5f9ff] border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md text-white shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Employee-wise Calls Performance</h2>
          </div>
          {!loading && (
            <span className="inline-flex items-center self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
              {employees.length} Employees
            </span>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 sm:p-6 bg-slate-50/40" aria-busy="true" aria-label="Loading employee-wise calls performance">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 rounded-lg bg-slate-100 animate-pulse" />)}
              </div>
              <div className="xl:col-span-5 rounded-xl border border-slate-200 bg-white p-5 flex flex-col items-center gap-4">
                <div className="aspect-square w-full max-w-[220px] rounded-full bg-slate-100 animate-pulse" />
                <div className="h-16 w-full rounded-lg bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-base font-semibold text-slate-600 mb-1">No employee calls data found</p>
            <p className="text-sm text-slate-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 bg-slate-50/40">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* ── LEFT: rankings table ── */}
              <div className="xl:col-span-7 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate">Employee Performance Rankings</span>
                  </div>
                  <span className="text-xs text-slate-300 font-medium whitespace-nowrap hidden sm:inline">Sorted by Actual Calls</span>
                </div>

                {/* Phones: one compact card per employee instead of a sideways-scrolling table */}
                <ul className="sm:hidden divide-y divide-slate-100" aria-label="Employee performance rankings">
                  {employees.map((emp, idx) => (
                    <li key={emp.empName} className="px-3 py-3" style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                      <div className="flex items-center gap-2 min-w-0">
                        <RankBadge index={idx} />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-800" title={emp.empName}>{emp.empName}</span>
                        <span className="shrink-0 text-right">
                          <span className="block text-base font-black leading-tight text-green-700 tabular-nums">{formatNumber(emp.actual)}</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Actual · {emp.actual > 0 ? `${emp.share.toFixed(1)}%` : "—"}</span>
                        </span>
                      </div>
                      <dl className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Planned", value: formatNumber(emp.planned), tone: "text-blue-700" },
                          { label: "Var %", value: formatVariance(emp.variancePct), tone: varianceTone(emp.variancePct) },
                          { label: "NBD", value: formatNumber(emp.newClients), tone: "text-violet-700" },
                          { label: "CRR", value: formatNumber(emp.oldClients), tone: "text-amber-700" },
                        ].map(m => (
                          <div key={m.label} className="rounded-lg bg-slate-50 px-1 py-1.5 border border-slate-100">
                            <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</dt>
                            <dd className={`text-xs font-bold tabular-nums ${m.tone}`}>{m.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                  {employees.length > 1 && (
                    <li className="px-3 py-3.5 text-white" style={{ backgroundColor: "#0f172a", borderTop: "3px solid #f59e0b" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold tracking-wide">GRAND TOTAL</span>
                        <span className="text-right">
                          <span className="block text-base font-black leading-tight text-green-400 tabular-nums">{formatNumber(totals.actual)}</span>
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">Actual · {totals.actual > 0 ? "100.0%" : "0.0%"}</span>
                        </span>
                      </div>
                      <dl className="mt-2.5 grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "Planned", value: formatNumber(totals.planned), tone: "text-blue-400" },
                          { label: "Var %", value: formatVariance(totals.variancePct), tone: totals.variancePct === null ? "text-slate-400" : totals.variancePct >= 0 ? "text-emerald-400" : "text-red-400" },
                          { label: "NBD", value: formatNumber(totals.newClients), tone: "text-violet-300" },
                          { label: "CRR", value: formatNumber(totals.oldClients), tone: "text-amber-400" },
                        ].map(m => (
                          <div key={m.label} className="rounded-lg bg-white/5 px-1 py-1.5 border border-white/10">
                            <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</dt>
                            <dd className={`text-xs font-bold tabular-nums ${m.tone}`}>{m.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  )}
                </ul>

                <div className="hidden sm:block overflow-x-auto w-full" style={{ WebkitOverflowScrolling: "touch" }}>
                  <table className="border-collapse w-full" style={{ minWidth: "696px", tableLayout: "fixed" }}>
                    <caption className="sr-only">Employee-wise planned versus actual calls, ranked by actual calls</caption>
                    <colgroup>
                      <col style={{ width: `${NAME_W}px` }} />
                      <col style={{ width: "90px" }} />
                      <col style={{ width: "90px" }} />
                      <col style={{ width: "76px" }} />
                      <col style={{ width: "90px" }} />
                      <col style={{ width: "70px" }} />
                      <col style={{ width: "70px" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "linear-gradient(to right, #1e293b, #334155, #1e293b)" }}>
                        <th
                          scope="col"
                          style={{ width: NAME_W, minWidth: NAME_W, maxWidth: NAME_W, backgroundColor: "#1e293b", position: "sticky", left: 0, zIndex: 3, boxShadow: "3px 0 8px -1px rgba(0,0,0,0.35)" }}
                          className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-white border-r border-slate-700"
                        >
                          Employee Name
                        </th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH} text-blue-300`}>Planned Calls</th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH} text-green-300`}>Actual Calls</th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH} text-cyan-300`}>% Share</th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH} text-emerald-300`}>Variance %</th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH} text-violet-300`}>NBD</th>
                        <th scope="col" style={{ backgroundColor: "#1e293b" }} className={`${TH.replace(" border-r border-slate-700", "")} text-amber-300`}>CRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => {
                        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc"
                        return (
                          <tr key={emp.empName} className="border-b border-slate-100 transition-colors hover:bg-blue-50/40" style={{ backgroundColor: rowBg }}>
                            <td
                              style={{ width: NAME_W, minWidth: NAME_W, maxWidth: NAME_W, backgroundColor: rowBg, position: "sticky", left: 0, zIndex: 2, boxShadow: "3px 0 8px -1px rgba(0,0,0,0.08), 1px 0 0 0 #f1f5f9" }}
                              className="px-4 py-2.5 border-r border-slate-100"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <RankBadge index={idx} />
                                <span className="text-xs font-semibold text-slate-800 truncate block" title={emp.empName}>{emp.empName}</span>
                              </div>
                            </td>
                            <td className="text-center px-3 py-2.5 text-xs font-bold text-blue-700 border-r border-slate-100 tabular-nums">{formatNumber(emp.planned)}</td>
                            <td className="text-center px-3 py-2.5 text-xs font-bold text-green-700 border-r border-slate-100 tabular-nums">{formatNumber(emp.actual)}</td>
                            <td className="text-center px-3 py-2.5 text-xs font-bold text-slate-800 border-r border-slate-100 tabular-nums">{emp.actual > 0 ? `${emp.share.toFixed(1)}%` : "—"}</td>
                            <td className={`text-center px-3 py-2.5 text-xs font-bold border-r border-slate-100 tabular-nums ${varianceTone(emp.variancePct)}`}>{formatVariance(emp.variancePct)}</td>
                            <td className="text-center px-3 py-2.5 text-xs font-bold text-violet-700 border-r border-slate-100 tabular-nums">{formatNumber(emp.newClients)}</td>
                            <td className="text-center px-3 py-2.5 text-xs font-bold text-amber-700 tabular-nums">{formatNumber(emp.oldClients)}</td>
                          </tr>
                        )
                      })}
                    </tbody>

                    {employees.length > 1 && (
                      <tfoot>
                        <tr style={{ borderTop: "3px solid #f59e0b", backgroundColor: "#0f172a" }}>
                          <td
                            style={{ width: NAME_W, minWidth: NAME_W, maxWidth: NAME_W, backgroundColor: "#0f172a", position: "sticky", left: 0, zIndex: 2, boxShadow: "3px 0 8px -1px rgba(0,0,0,0.5)" }}
                            className="font-extrabold text-xs text-white text-left px-4 py-3.5 border-r border-slate-700"
                          >
                            GRAND TOTAL
                          </td>
                          <td style={{ backgroundColor: "#0f172a" }} className="text-center px-3 py-3.5 border-r border-slate-700 font-bold text-xs sm:text-sm text-blue-400 tabular-nums">{formatNumber(totals.planned)}</td>
                          <td style={{ backgroundColor: "#0f172a" }} className="text-center px-3 py-3.5 border-r border-slate-700 font-bold text-xs sm:text-sm text-green-400 tabular-nums">{formatNumber(totals.actual)}</td>
                          <td style={{ backgroundColor: "#0f172a" }} className="text-center px-3 py-3.5 border-r border-slate-700 font-bold text-xs sm:text-sm text-cyan-300 tabular-nums">{totals.actual > 0 ? "100.0%" : "0.0%"}</td>
                          <td style={{ backgroundColor: "#0f172a" }} className={`text-center px-3 py-3.5 border-r border-slate-700 font-bold text-xs sm:text-sm tabular-nums ${totals.variancePct === null ? "text-slate-400" : totals.variancePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatVariance(totals.variancePct)}</td>
                          <td style={{ backgroundColor: "#0f172a" }} className="text-center px-3 py-3.5 border-r border-slate-700 font-bold text-xs sm:text-sm text-violet-300 tabular-nums">{formatNumber(totals.newClients)}</td>
                          <td style={{ backgroundColor: "#0f172a" }} className="text-center px-3 py-3.5 font-bold text-xs sm:text-sm text-amber-400 tabular-nums">{formatNumber(totals.oldClients)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── RIGHT: share donut + legend + summary ── */}
              <div className="xl:col-span-5 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0"><PieChartIcon className="w-4 h-4" /></div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">Employee Calls Share</h3>
                        <p className="text-[11px] text-slate-500">{contributors} of {employees.length} contributors with calls</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2 py-0.5 whitespace-nowrap shrink-0">
                      {employees.length === 1 ? "Single Employee" : "Team Breakdown"}
                    </Badge>
                  </div>

                  <div className="flex flex-col items-center justify-center pt-1">
                    <EmployeeShareDonut items={donutItems} hovered={hovered} onHover={setHovered} format={formatNumber} totalLabel="Total Calls" emptyLabel="No Calls Data" />

                    <div className="w-full mt-3.5">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 pb-1.5 border-b border-slate-100">
                        <span>Employee</span>
                        <div className="flex items-center gap-3 sm:gap-4">
                          <span>Actual</span>
                          <span className="w-12 text-right">Share</span>
                          <span className="hidden sm:block w-14 text-right">Var %</span>
                        </div>
                      </div>
                      <ul className="max-h-[170px] overflow-y-auto mt-1.5 pr-1 divide-y divide-slate-50">
                        {employees.map(emp => {
                          const has = emp.actual > 0
                          const isHovered = hovered === emp.empName
                          return (
                            <li key={emp.empName}>
                              <button
                                type="button"
                                aria-pressed={isHovered}
                                onMouseEnter={() => has && setHovered(emp.empName)}
                                onMouseLeave={() => setHovered(null)}
                                onFocus={() => has && setHovered(emp.empName)}
                                onBlur={() => setHovered(null)}
                                onClick={() => has && setHovered(isHovered ? null : emp.empName)}
                                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${isHovered ? "bg-blue-50/90 ring-1 ring-blue-300 font-semibold" : "hover:bg-slate-50 text-slate-700"} ${has ? "" : "opacity-50 cursor-default"}`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorOf.get(emp.empName) ?? "#cbd5e1" }} />
                                  <span className="truncate text-slate-800 font-medium" title={emp.empName}>{emp.empName}</span>
                                </span>
                                <span className="flex items-center gap-3 sm:gap-4 shrink-0 tabular-nums">
                                  <span className="font-bold text-slate-900">{formatNumber(emp.actual)}</span>
                                  <span className={`w-12 text-right font-extrabold ${has ? "text-blue-600" : "text-slate-400"}`}>{emp.share.toFixed(1)}%</span>
                                  <span className={`hidden sm:block w-14 text-right font-bold ${varianceTone(emp.variancePct)}`}>{formatVariance(emp.variancePct)}</span>
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Calls & Clients Summary</span>
                    <span className="hidden sm:inline text-[10px] text-slate-400 font-medium">Supporting Information</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3 border border-slate-200/80 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">Total Actual Calls</span>
                      <div className="mt-1">
                        <span className="text-sm sm:text-base font-black text-slate-900 tabular-nums block truncate">{formatNumber(totals.actual)}</span>
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5">Planned {formatNumber(totals.planned)}</span>
                      </div>
                    </div>
                    <div className="bg-violet-50/70 rounded-xl p-2.5 sm:p-3 border border-violet-200/70 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-800 truncate">NBD Clients</span>
                        <span className="text-[9px] font-extrabold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded shrink-0">{shareOfCalls(totals.newClients)}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm sm:text-base font-black text-violet-950 tabular-nums block truncate">{formatNumber(totals.newClients)}</span>
                        <span className="text-[10px] text-violet-700 block truncate mt-0.5">New client calls</span>
                      </div>
                    </div>
                    <div className="bg-amber-50/70 rounded-xl p-2.5 sm:p-3 border border-amber-200/70 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 truncate">CRR Clients</span>
                        <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">{shareOfCalls(totals.oldClients)}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm sm:text-base font-black text-amber-950 tabular-nums block truncate">{formatNumber(totals.oldClients)}</span>
                        <span className="text-[10px] text-amber-700 block truncate mt-0.5">Returning client calls</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
