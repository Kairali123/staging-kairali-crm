import { getPool } from "@/lib/db"
import { AgentAuditMetric } from "@/app/api/sales-call-audit/email-data/route"

export interface SalesCallAuditReportMetrics {
  totalAgents: number
  totalCalls: number
  totalGood: number
  totalBad: number
  auditedLeads: number
  verified: number
  mismatch: number
  wrongOutcomesPercentage: number
  teamAverageScore: number
  teamPerformancePercentage: number
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

export async function buildSalesCallAuditReport(auditDate: string): Promise<BuildSalesCallAuditReportResult> {
  const pool = await getPool()

  const [rows] = await pool.query<any[]>(
    `SELECT id, emp_id, name, designation, time_stamp, created_at,
            total_calls_audited, good_calls, bad_calls, avg_score, daily_fail_pass
     FROM daily_sales_reports_log_fms
     WHERE DATE(COALESCE(time_stamp, created_at)) = DATE(?)
     ORDER BY id ASC`,
    [auditDate]
  )

  const fmsRows = rows || []

  if (fmsRows.length === 0) {
    return {
      source: "daily_sales_reports_log_fms",
      data: {
        auditDate,
        displayDate: formatDateDisplay(auditDate),
        metrics: {
          totalAgents: 0,
          totalCalls: 0,
          totalGood: 0,
          totalBad: 0,
          auditedLeads: 0,
          verified: 0,
          mismatch: 0,
          wrongOutcomesPercentage: 0,
          teamAverageScore: 0,
          teamPerformancePercentage: 0,
          passCount: 0,
          failCount: 0,
          failedEmployeesCount: 0,
        },
        employees: [],
      },
    }
  }

  const employees: AgentAuditMetric[] = []
  let totalCalls = 0
  let totalGood = 0
  let totalBad = 0
  let passCount = 0
  let failCount = 0
  let scoreSum = 0
  let scoreCount = 0

  for (const r of fmsRows) {
    const empId = r.emp_id || ""
    const empName = r.name || ""
    const designation = r.designation || ""
    const calls = Number(r.total_calls_audited) || 0
    const good = Number(r.good_calls) || 0
    const bad = Number(r.bad_calls) || 0
    const scoreVal = r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null

    // User ruling: if avg score >= 3.0 then PASS otherwise FAIL
    const isPass = scoreVal !== null && !isNaN(scoreVal)
      ? scoreVal >= 3.0
      : String(r.daily_fail_pass || "").toUpperCase() === "PASS"

    totalCalls += calls
    totalGood += good
    totalBad += bad

    if (isPass) {
      passCount++
    } else {
      failCount++
    }

    if (scoreVal !== null && !isNaN(scoreVal)) {
      scoreSum += scoreVal
      scoreCount++
    }

    employees.push({
      id: empId,
      name: empName,
      designation,
      calls,
      good,
      bad,
      score: scoreVal !== null ? Number(scoreVal.toFixed(2)) : 0,
      result: isPass ? "PASS" : "FAIL",
    })
  }

  // Sort: FAIL employees first, then by total calls descending
  employees.sort((a, b) => {
    if (a.result === "FAIL" && b.result === "PASS") return -1
    if (a.result === "PASS" && b.result === "FAIL") return 1
    return b.calls - a.calls
  })

  const totalAgents = employees.length
  const wrongOutcomes = totalCalls > 0 ? Number(((totalBad / totalCalls) * 100).toFixed(2)) : 0
  const teamAvg = scoreCount > 0 ? Number((scoreSum / scoreCount).toFixed(2)) : 0
  const teamPerf = Number(((teamAvg / 5.0) * 100).toFixed(2))
  const failedCount = failCount

  return {
    source: "daily_sales_reports_log_fms",
    data: {
      auditDate,
      displayDate: formatDateDisplay(auditDate),
      metrics: {
        totalAgents,
        totalCalls,
        totalGood,
        totalBad,
        auditedLeads: totalCalls,
        verified: totalGood,
        mismatch: totalBad,
        wrongOutcomesPercentage: wrongOutcomes,
        teamAverageScore: teamAvg,
        teamPerformancePercentage: Math.min(100, teamPerf),
        passCount,
        failCount,
        failedEmployeesCount: failedCount,
      },
      employees,
    },
  }
}
