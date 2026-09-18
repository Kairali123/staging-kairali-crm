import { getPool } from "@/lib/db"
import { AgentAuditMetric } from "@/app/api/sales-call-audit/email-data/route"

export interface SalesCallAuditReportMetrics {
  totalAgents: number
  totalCalls: number
  totalGood: number
  // Needs Improvement + Bad
  totalBad: number
  totalNeutral: number
  totalNotRated: number
  auditedLeads: number
  verified: number
  mismatch: number
  wrongOutcomesPercentage: number
  // Good ÷ (Good + Bad); Neutral and Not Rated are not rated calls
  goodCallRate: number
  passCount: number
  failCount: number
  failedEmployeesCount: number
}

export interface SalesCallAuditReportData {
  auditDate: string
  displayDate: string
  metrics: SalesCallAuditReportMetrics
  employees: AgentAuditMetric[]
}

export interface BuildSalesCallAuditReportResult {
  source: string
  data: SalesCallAuditReportData
}

export function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function emptyMetrics(): SalesCallAuditReportMetrics {
  return {
    totalAgents: 0,
    totalCalls: 0,
    totalGood: 0,
    totalBad: 0,
    totalNeutral: 0,
    totalNotRated: 0,
    auditedLeads: 0,
    verified: 0,
    mismatch: 0,
    wrongOutcomesPercentage: 0,
    goodCallRate: 0,
    passCount: 0,
    failCount: 0,
    failedEmployeesCount: 0,
  }
}

export async function buildSalesCallAuditReport(auditDate: string): Promise<BuildSalesCallAuditReportResult> {
  const pool = await getPool()

  const [rows] = await pool.query<any[]>(
    `SELECT id, emp_id, name, designation, time_stamp, created_at,
            total_calls_audited, good_calls, bad_calls, neutral, not_related,
            overall_performance, daily_fail_pass
     FROM daily_sales_reports_log_fms
     WHERE DATE(COALESCE(time_stamp, created_at)) = DATE(?)
     ORDER BY id ASC`,
    [auditDate]
  )

  const fmsRows = rows || []
  const metrics = emptyMetrics()
  const employees: AgentAuditMetric[] = []

  for (const r of fmsRows) {
    // Counts: the pilot report writes 0 as NULL. `not_related` holds Not Rated.
    const calls = Number(r.total_calls_audited) || 0
    const good = Number(r.good_calls) || 0
    const bad = Number(r.bad_calls) || 0
    const neutral = Number(r.neutral) || 0
    const notRated = Number(r.not_related) || 0
    // PASS/FAIL is read as stored (sheet formula); the HR half-day decision is not derived here.
    const isPass = String(r.daily_fail_pass || "").toUpperCase() === "PASS"

    metrics.totalCalls += calls
    metrics.totalGood += good
    metrics.totalBad += bad
    metrics.totalNeutral += neutral
    metrics.totalNotRated += notRated
    if (isPass) metrics.passCount++
    else metrics.failCount++

    employees.push({
      id: r.emp_id || "",
      name: r.name || "",
      designation: r.designation || "",
      calls,
      good,
      bad,
      neutral,
      notRated,
      overallPerformance: r.overall_performance || "",
      result: isPass ? "PASS" : "FAIL",
    })
  }

  // Sort: FAIL employees first, then by total calls descending
  employees.sort((a, b) => {
    if (a.result === "FAIL" && b.result === "PASS") return -1
    if (a.result === "PASS" && b.result === "FAIL") return 1
    return b.calls - a.calls
  })

  const rated = metrics.totalGood + metrics.totalBad
  metrics.totalAgents = employees.length
  metrics.auditedLeads = metrics.totalCalls
  metrics.verified = metrics.totalGood
  metrics.mismatch = metrics.totalBad
  metrics.wrongOutcomesPercentage = metrics.totalCalls > 0 ? Number(((metrics.totalBad / metrics.totalCalls) * 100).toFixed(2)) : 0
  metrics.goodCallRate = rated > 0 ? Number(((metrics.totalGood / rated) * 100).toFixed(2)) : 0
  metrics.failedEmployeesCount = metrics.failCount

  return {
    source: "daily_sales_reports_log_fms",
    data: {
      auditDate,
      displayDate: formatDateDisplay(auditDate),
      metrics,
      employees,
    },
  }
}
