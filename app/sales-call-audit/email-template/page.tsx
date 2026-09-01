"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Calendar,
  ExternalLink,
  Loader2,
  Mail,
  Printer,
  RefreshCw,
  Send,
  TableProperties,
} from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/use-auth"
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
  const { user } = useAuth()
  const [data, setData] = useState<SalesCallAuditEmailData | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [sendingEmail, setSendingEmail] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const isHrOrAdmin = useMemo(() => {
    if (!user) return false
    const role = String(user.role || "").toLowerCase()
    const dept = String(user.department || "").toLowerCase()
    return (
      role === "super_admin" ||
      role === "admin" ||
      role === "hr_manager" ||
      role === "hr" ||
      role === "hr_executive" ||
      dept === "hr" ||
      dept === "administration" ||
      user.permissions?.includes("all") ||
      user.permissions?.includes("sales_call_audit.admin") ||
      user.permissions?.includes("hr.admin")
    )
  }, [user])

  const isUserRecord = useCallback(
    (empId?: string | null, name?: string | null) => {
      if (isHrOrAdmin) return true
      if (!user) return true
      const uEmp = String(user.employeeId || "").trim().toLowerCase()
      const uName = String(user.name || "").trim().toLowerCase()
      const eId = String(empId || "").trim().toLowerCase()
      const eName = String(name || "").trim().toLowerCase()

      if (uEmp && eId && (eId === uEmp || eId.includes(uEmp) || uEmp.includes(eId))) return true
      if (uName && eName && (eName.includes(uName) || uName.includes(eName))) return true
      return false
    },
    [isHrOrAdmin, user]
  )

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

  const rawEmployees: AgentAuditMetric[] = data?.employees || []
  const employees = useMemo(() => {
    return rawEmployees.filter(emp => isUserRecord(emp.id, emp.name))
  }, [rawEmployees, isUserRecord])

  const displayDate = data?.displayDate || "Today"

  const handleSendEmail = async () => {
    if (!data) return
    try {
      setSendingEmail(true)
      const res = await fetch("/api/sales-call-audit/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "sysadmin@kairali.com",
          date: selectedDate,
          displayDate,
          metrics,
          employees,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Report successfully sent to sysadmin@kairali.com!`, {
          description: `Dispatched ${employees.length} employee audit records for ${displayDate}`,
        })
      } else {
        toast.error(json.error || "Failed to send email report")
      }
    } catch (e: any) {
      console.error("Email send error:", e)
      toast.error(e?.message || "Failed to connect to email service")
    } finally {
      setSendingEmail(false)
    }
  }

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
                    Quality Assurance • Powered by daily_sales_reports_log_fms
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
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              {/* Send Email Button */}
              <Button
                size="sm"
                onClick={handleSendEmail}
                disabled={sendingEmail || !data}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md cursor-pointer border border-emerald-400/40"
              >
                {sendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sendingEmail ? "Sending..." : "Send to sysadmin@kairali.com"}
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
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm shadow-sm cursor-pointer"
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

      {/* ─── Email Template Card ────────────────────────────────────────────── */}
      {data && (
        <div className="mx-auto max-w-[760px] overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200 print:shadow-none print:border-none print:max-w-none">
          {/* Email Header */}
          <div className="bg-gradient-to-r from-[#193a6a] to-[#12284c] p-6 text-white">
            <div className="text-xs uppercase tracking-[0.2em] text-blue-200 font-bold">
              Head Office • Daily Quality Audit
            </div>
            <h2 className="mt-1 text-2xl font-bold">Agent-wise Call Audit Report</h2>
            <div className="mt-2 text-xs text-blue-100 font-medium">
              Audit date: <span className="font-bold underline">{displayDate}</span>
            </div>
          </div>

          <div className="space-y-6 p-6 text-slate-700 text-sm">
            <p className="leading-6">
              Hi HR Team,
              <br />
              Please find below the daily call audit outcome. Employees marked <span className="font-bold text-red-600">FAIL</span> require a half-day attendance adjustment for the audit date (<strong>{displayDate}</strong>), subject to final HR verification.
            </p>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Audited Leads</div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{metrics.auditedLeads}</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Verified Good</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-800">{metrics.verified}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Mismatch Bad</div>
                <div className="mt-1 text-2xl font-extrabold text-rose-800">{metrics.mismatch}</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-center">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Wrong Outcomes</div>
                <div className="mt-1 text-2xl font-extrabold text-amber-900">{metrics.wrongOutcomesPercentage}%</div>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="flex flex-wrap gap-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Team average:</span>
                <span className="text-slate-900 font-bold">{metrics.teamAverageScore} / 5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Team performance:</span>
                <span className="text-emerald-700 font-bold">{metrics.teamPerformancePercentage}%</span>
              </div>
            </div>

            {/* HR Action Banner */}
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <p className="text-xs leading-5">
                <strong>HR action:</strong> {metrics.failedEmployeesCount} employee(s) failed. Verify each employee and mark half-day for <strong>{displayDate}</strong> where applicable. Confirm the Pagarbook update from the audit dashboard.
              </p>
            </div>

            {/* Employee Audit Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider">
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

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild className="bg-[#193a6a] hover:bg-[#193a6a]/90 cursor-pointer shadow-sm">
                <Link href="/sales-call-audit">
                  <Mail className="mr-2 h-4 w-4" />
                  Open consolidated audit report
                </Link>
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !data}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-sm"
              >
                {sendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {sendingEmail ? "Sending..." : "Send Report to sysadmin@kairali.com"}
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
