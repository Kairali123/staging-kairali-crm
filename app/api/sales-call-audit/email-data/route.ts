import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSalesCallAuditScope, getSessionUser, hasSalesCallAuditPageAccess } from "@/lib/authz"
import { isReportSentForDate } from "@/lib/sales-call-audit-tracker"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

export interface AgentAuditMetric {
  id: string
  name: string
  designation?: string
  calls: number
  good: number
  bad: number
  score: number
  result: "PASS" | "FAIL"
}

export interface SalesCallAuditEmailData {
  auditDate: string
  displayDate: string
  availableDates: string[]
  metrics: {
    auditedLeads: number
    verified: number
    mismatch: number
    wrongOutcomesPercentage: number
    teamAverageScore: number
    teamPerformancePercentage: number
    failedEmployeesCount: number
  }
  isMailSent?: boolean
  employees: AgentAuditMetric[]
}

function formatDateDisplay(dateStr: string): string {
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

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to access sales call audit metrics." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    if (getSalesCallAuditScope(user) !== "all") {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.viewAll permission required for team audit metrics." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()
    const url = new URL(req.url)
    let selectedDate = url.searchParams.get("date")

    // 1. Get distinct audit dates from daily_sales_reports_log_fms
    let availableDates: string[] = []
    try {
      const [dateRows] = await pool.query<any[]>(
        `SELECT DISTINCT DATE_FORMAT(COALESCE(time_stamp, created_at), '%Y-%m-%d') as audit_date
         FROM daily_sales_reports_log_fms
         WHERE time_stamp IS NOT NULL OR created_at IS NOT NULL
         ORDER BY audit_date DESC
         LIMIT 30`
      )
      if (dateRows && dateRows.length > 0) {
        availableDates = dateRows.map(r => r.audit_date).filter(Boolean)
      }
    } catch (e: any) {
      console.warn("[sales-metric-email-api] Could not fetch distinct dates:", e?.message)
    }

    if (!selectedDate && availableDates.length > 0) {
      selectedDate = availableDates[0]
    }

    // 2. Query daily_sales_reports_log_fms strictly with bounded selected columns
    let fmsRows: any[] = []
    try {
      if (selectedDate) {
        const [rows] = await pool.query<any[]>(
          `SELECT id, emp_id, name, designation, time_stamp, created_at,
                  total_calls_audited, good_calls, bad_calls, avg_score, daily_fail_pass
           FROM daily_sales_reports_log_fms
           WHERE DATE(COALESCE(time_stamp, created_at)) = DATE(?)
           ORDER BY id ASC`,
          [selectedDate]
        )
        fmsRows = rows || []
      } else {
        const [rows] = await pool.query<any[]>(
          `SELECT id, emp_id, name, designation, time_stamp, created_at,
                  total_calls_audited, good_calls, bad_calls, avg_score, daily_fail_pass
           FROM daily_sales_reports_log_fms
           ORDER BY COALESCE(time_stamp, created_at) DESC LIMIT 100`
        )
        fmsRows = rows || []
      }
    } catch (fmsErr: any) {
      console.error("[sales-metric-email-api] Error reading daily_sales_reports_log_fms:", fmsErr?.message)
      return NextResponse.json(
        { success: false, error: "Database error fetching audit report data" },
        { status: 500, headers: noStoreHeaders }
      )
    }

    if (fmsRows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          source: "daily_sales_reports_log_fms",
          data: {
            auditDate: selectedDate || "",
            displayDate: selectedDate ? formatDateDisplay(selectedDate) : "No Date Selected",
            availableDates,
            metrics: {
              auditedLeads: 0,
              verified: 0,
              mismatch: 0,
              wrongOutcomesPercentage: 0,
              teamAverageScore: 0,
              teamPerformancePercentage: 0,
              failedEmployeesCount: 0,
            },
            employees: [],
          },
        },
        { headers: noStoreHeaders }
      )
    }

    const employees: AgentAuditMetric[] = []
    let totalAudited = 0
    let totalGood = 0
    let totalBad = 0
    let totalScoreSum = 0
    let scoreCount = 0

    for (const r of fmsRows) {
      const empId = r.emp_id || ""
      const empName = r.name || ""
      const designation = r.designation || ""
      const totalCalls = Number(r.total_calls_audited) || 0
      const good = Number(r.good_calls) || 0
      const bad = Number(r.bad_calls) || 0
      const rawScore = r.avg_score !== null && r.avg_score !== undefined ? Number(r.avg_score) : null
      const isPass = String(r.daily_fail_pass || "").toUpperCase() === "PASS"

      totalAudited += totalCalls
      totalGood += good
      totalBad += bad

      if (rawScore !== null && !isNaN(rawScore)) {
        totalScoreSum += rawScore
        scoreCount++
      }

      employees.push({
        id: empId,
        name: empName,
        designation,
        calls: totalCalls,
        good,
        bad,
        score: rawScore !== null ? Number(rawScore.toFixed(2)) : 0,
        result: isPass ? "PASS" : "FAIL",
      })
    }

    // Sort: FAIL employees first, then by total calls descending
    employees.sort((a, b) => {
      if (a.result === "FAIL" && b.result === "PASS") return -1
      if (a.result === "PASS" && b.result === "FAIL") return 1
      return b.calls - a.calls
    })

    const wrongOutcomes = totalAudited > 0 ? Number(((totalBad / totalAudited) * 100).toFixed(2)) : 0
    const teamAvg = scoreCount > 0 ? Number((totalScoreSum / scoreCount).toFixed(2)) : 0
    const teamPerf = Number(((teamAvg / 5.0) * 100).toFixed(2))
    const failedCount = employees.filter(e => e.result === "FAIL").length

    const actualDate = selectedDate || (fmsRows[0]?.time_stamp ? new Date(fmsRows[0].time_stamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])

    const isMailSent = isReportSentForDate(actualDate)

    return NextResponse.json({
      success: true,
      source: "daily_sales_reports_log_fms",
      data: {
        auditDate: actualDate,
        displayDate: formatDateDisplay(actualDate),
        availableDates,
        metrics: {
          auditedLeads: totalAudited,
          verified: totalGood,
          mismatch: totalBad,
          wrongOutcomesPercentage: wrongOutcomes,
          teamAverageScore: teamAvg,
          teamPerformancePercentage: Math.min(100, teamPerf),
          failedEmployeesCount: failedCount,
        },
        isMailSent,
        employees,
      },
    }, { headers: noStoreHeaders })
  } catch (err: any) {
    console.error("[sales-metric-email-api] Fatal error:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load audit metrics" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
