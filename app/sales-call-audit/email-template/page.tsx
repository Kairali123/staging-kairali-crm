"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  ExternalLink,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  TableProperties,
} from "lucide-react"

import { BackButton } from "@/components/back-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AgentAuditMetric, SalesCallAuditEmailData } from "@/app/api/sales-call-audit/email-data/route"

export default function SalesCallAuditEmailTemplatePage() {
  const [data, setData] = useState<SalesCallAuditEmailData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (date?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = date
        ? `/api/sales-call-audit/email-data?date=${encodeURIComponent(date)}`
        : "/api/sales-call-audit/email-data"
      const res = await fetch(url)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data)
        if (!date && json.data.auditDate) {
          setSelectedDate(json.data.auditDate)
        }
      } else {
        setError(json.error || "Failed to load audit metrics")
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while fetching audit data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    fetchData(newDate)
  }

  const metrics = data?.metrics || {
    auditedLeads: 0,
    verified: 0,
    mismatch: 0,
    wrongOutcomesPercentage: 0,
    teamAverageScore: 0,
    teamPerformancePercentage: 0,
    failedEmployeesCount: 0,
  }

  const employees: AgentAuditMetric[] = data?.employees || []
  const displayDate = data?.displayDate || "Today"

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Standard CRM Header Banner (Hidden when Printing) ────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 border-b border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.35)] print:hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        <div className="w-full px-4 sm:px-6 lg:px-8 py-7 relative z-10">
          {/* Back Button */}
          <div className="mb-4">
            <BackButton
              customBackUrl="/sales-call-audit"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm"
            />
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Title & Icon */}
            <div className="space-y-2 w-full lg:w-auto">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30 flex-shrink-0">
                  <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                    Daily HR Email Template
                  </h1>
                  <p className="text-sm sm:text-base text-white/90 mt-1 font-medium">
                    Quality Assurance • Powered by kairali_sales_metric_bot_for_ho
                  </p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
              {/* Date Filter */}
              {data?.availableDates && data.availableDates.length > 0 && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg border border-white/20 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-white" />
                  <Select value={selectedDate} onValueChange={handleDateChange}>
                    <SelectTrigger className="h-8 bg-transparent text-white border-0 focus:ring-0 text-xs w-[140px]">
                      <SelectValue placeholder="Select Date" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.availableDates.map(d => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(selectedDate)}
                disabled={loading}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                asChild
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Link href="/sales-call-audit">
                  <TableProperties className="mr-2 h-4 w-4" />
                  Audit Dashboard
                </Link>
              </Button>

              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading & Error Indicators */}
      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-600">Loading live audit metrics from database...</p>
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-[760px] p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* ─── Agent-wise Call Audit Report (Live Template) ──────────── */}
      {data && (
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl print:max-w-none print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-[#193a6a] px-7 py-7 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">Head Office · Daily Quality Audit</div>
            <h2 className="mt-2 text-2xl font-bold">Agent-wise Call Audit Report</h2>
            <div className="mt-1 text-sm text-blue-100">Audit date: {displayDate}</div>
          </div>

          <div className="space-y-5 px-7 py-7 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Hi HR Team,</p>
              <p className="mt-3 leading-6">
                Please find below the daily audit outcome. Employees marked <strong className="text-red-600">FAIL</strong> require a half-day attendance adjustment for the audit date ({displayDate}), subject to final HR verification.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Audited leads", value: String(metrics.auditedLeads), danger: false },
                { label: "Verified", value: String(metrics.verified), danger: false },
                { label: "Mismatch", value: String(metrics.mismatch), danger: metrics.mismatch > 0 },
                { label: "Wrong outcomes", value: `${metrics.wrongOutcomesPercentage}%`, danger: metrics.wrongOutcomesPercentage > 20 },
              ].map(item => (
                <div
                  key={item.label}
                  className={`rounded-lg border p-3 ${
                    item.danger ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="text-xs text-slate-500">{item.label}</div>
                  <div className={`mt-1 text-xl font-bold ${item.danger ? "text-red-700" : "text-[#193a6a]"}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <span className="text-xs text-violet-700">Team average</span>
                <strong className="float-right text-violet-800">{metrics.teamAverageScore.toFixed(2)} / 5</strong>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <span className="text-xs text-emerald-700">Team performance</span>
                <strong className="float-right text-emerald-800">{metrics.teamPerformancePercentage.toFixed(2)}%</strong>
              </div>
            </div>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
              <strong>HR action:</strong>{" "}
              {metrics.failedEmployeesCount > 0
                ? `${metrics.failedEmployeesCount} employee(s) failed. Verify each employee and mark half-day for ${displayDate} where applicable. Confirm the Pagarbook update from the audit dashboard.`
                : `All employees passed the quality threshold for ${displayDate}. No half-day attendance adjustment required.`}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3 text-center">Calls</th>
                    <th className="p-3 text-center">Good / Bad</th>
                    <th className="p-3 text-center">Score</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3 text-right">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                        No audit records found for this date.
                      </td>
                    </tr>
                  ) : (
                    employees.map(employee => (
                      <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{employee.name}</div>
                          <div className="text-[10px] text-slate-400">{employee.id}</div>
                        </td>
                        <td className="p-3 text-center font-medium text-slate-700">{employee.calls}</td>
                        <td className="p-3 text-center text-slate-600">
                          <span className="text-emerald-700 font-semibold">{employee.good}</span> /{" "}
                          <span className="text-rose-700 font-semibold">{employee.bad}</span>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-800">{employee.score.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          {employee.result === "FAIL" ? (
                            <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50 font-bold">
                              FAIL
                            </Badge>
                          ) : (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-bold">
                              PASS
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href={`/sales-call-audit?emp_id=${encodeURIComponent(employee.id)}`}
                            className="inline-flex items-center font-semibold text-blue-600 hover:underline"
                          >
                            View details <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-center">
              <Button asChild className="bg-[#193a6a] hover:bg-[#193a6a]/90">
                <Link href="/sales-call-audit">
                  <Mail className="mr-2 h-4 w-4" />
                  Open consolidated audit report
                </Link>
              </Button>
            </div>

            <div className="border-t border-slate-200 pt-5 leading-6">
              <p>For any questions or corrections, please contact IT before updating attendance.</p>
              <p className="mt-3 text-slate-800">
                Regards,<br />
                <strong>IT Audit Team</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
