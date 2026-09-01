import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSalesCallAuditScope, getSessionUser, hasSalesCallAuditPageAccess } from "@/lib/authz"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
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
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to access sales call audit metrics." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (user && !hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    // This endpoint aggregates the whole team into one report — team averages,
    // a failed-employee count, and a per-employee table. There is no self-scoped
    // version of that artifact, so it requires `viewAll` outright rather than
    // handing a `viewSelf` holder their colleagues' figures.
    if (user && getSalesCallAuditScope(user) !== "all") {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.viewAll permission required for team audit metrics." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()
    const url = new URL(req.url)
    let selectedDate = url.searchParams.get("date")

    // 1. Get distinct audit dates from daily_sales_reports_log_fms (the primary source of truth)
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
      console.warn("[sales-metric-email-api] Could not fetch distinct dates from daily_sales_reports_log_fms:", e?.message)
    }

    // Fallback: If no dates in daily_sales_reports_log_fms, check kairali_sales_metric_bot_for_ho
    if (availableDates.length === 0) {
      try {
        const [botDateRows] = await pool.query<any[]>(
          `SELECT DISTINCT DATE_FORMAT(timestamp, '%Y-%m-%d') as audit_date
           FROM kairali_sales_metric_bot_for_ho
           WHERE timestamp IS NOT NULL
           ORDER BY audit_date DESC
           LIMIT 30`
        )
        if (botDateRows && botDateRows.length > 0) {
          availableDates = botDateRows.map(r => r.audit_date).filter(Boolean)
        }
      } catch (e: any) {
        console.warn("[sales-metric-email-api] Fallback date query error:", e?.message)
      }
    }

    // Default to latest available date
    if (!selectedDate && availableDates.length > 0) {
      selectedDate = availableDates[0]
    }

    // 2. Query daily_sales_reports_log_fms for the selected date (or all recent rows)
    let fmsRows: any[] = []
    try {
      if (selectedDate) {
        const [rows] = await pool.query<any[]>(
          `SELECT * FROM daily_sales_reports_log_fms 
           WHERE DATE(COALESCE(time_stamp, created_at)) = DATE(?)
           ORDER BY id ASC`,
          [selectedDate]
        )
        fmsRows = rows || []
      } else {
        const [rows] = await pool.query<any[]>(
          `SELECT * FROM daily_sales_reports_log_fms 
           ORDER BY COALESCE(time_stamp, created_at) DESC LIMIT 100`
        )
        fmsRows = rows || []
      }
    } catch (fmsErr: any) {
      console.warn("[sales-metric-email-api] Error reading daily_sales_reports_log_fms:", fmsErr?.message)
    }

    // If we have records in daily_sales_reports_log_fms, calculate exact employee audit metrics
    if (fmsRows.length > 0) {
      const employees: AgentAuditMetric[] = []
      let totalAudited = 0
      let totalGood = 0
      let totalBad = 0
      let totalScoreSum = 0

      for (const r of fmsRows) {
        const empId = r.emp_id || `EMP-${r.id}`
        const empName = r.name || "Unknown Agent"
        const designation = r.designation || "Sales Executive"
        const totalCalls = Number(r.total_calls_audited) || (Number(r.good_calls || 0) + Number(r.bad_calls || 0)) || 1
        const good = Number(r.good_calls) || 0
        const bad = Number(r.bad_calls) || Math.max(0, totalCalls - good)
        const score = Number(r.avg_score) || 0
        const isPass = String(r.daily_fail_pass || "").toUpperCase() === "PASS"

        totalAudited += totalCalls
        totalGood += good
        totalBad += bad
        totalScoreSum += score

        employees.push({
          id: empId,
          name: empName,
          designation,
          calls: totalCalls,
          good,
          bad,
          score: Number(score.toFixed(2)),
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
      const teamAvg = employees.length > 0 ? Number((totalScoreSum / employees.length).toFixed(2)) : 0
      const teamPerf = Number(((teamAvg / 5.0) * 100).toFixed(2))
      const failedCount = employees.filter(e => e.result === "FAIL").length

      const actualDate = selectedDate || (fmsRows[0]?.time_stamp ? new Date(fmsRows[0].time_stamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])

      return NextResponse.json({
        success: true,
        source: "daily_sales_reports_log_fms",
        data: {
          auditDate: actualDate,
          displayDate: formatDateDisplay(actualDate),
          availableDates: availableDates.length > 0 ? availableDates : [actualDate],
          metrics: {
            auditedLeads: totalAudited,
            verified: totalGood,
            mismatch: totalBad,
            wrongOutcomesPercentage: wrongOutcomes,
            teamAverageScore: teamAvg,
            teamPerformancePercentage: teamPerf,
            failedEmployeesCount: failedCount,
          },
          employees,
        },
      }, { headers: noStoreHeaders })
    }

    // Secondary Fallback: Process rows from kairali_sales_metric_bot_for_ho if daily_sales_reports_log_fms is empty
    let rows: any[] = []
    try {
      const [metricRows] = await pool.query<any[]>(
        `SELECT * FROM kairali_sales_metric_bot_for_ho 
         ${selectedDate ? "WHERE DATE(timestamp) = DATE(?)" : ""}
         ORDER BY timestamp DESC LIMIT 500`,
        selectedDate ? [selectedDate] : []
      )
      rows = metricRows || []
    } catch (e: any) {
      console.warn("[sales-metric-email-api] Secondary fallback query error:", e?.message)
    }

    const agentMap = new Map<string, {
      id: string
      name: string
      calls: number
      good: number
      bad: number
      scoreSum: number
      scoreCount: number
    }>()

    let totalLeads = rows.length
    let totalVerified = 0
    let totalMismatch = 0
    let grandScoreSum = 0
    let grandScoreCount = 0

    for (const row of rows) {
      const agentId = String(row.sales_person_id || row.emp_id || "").trim() || "UNASSIGNED"
      const agentName = String(row.sales_person_name || row.name || "").trim() || (agentId !== "UNASSIGNED" ? agentId : "Unknown Agent")
      const qStatus = String(row.quality_status || "").toLowerCase()
      const verifyStatus = String(row.lead_outcome_verify_status || "").toLowerCase()
      const rawScore = row.avg_score !== null && row.avg_score !== undefined ? Number(row.avg_score) : (row.overall_score ? parseFloat(String(row.overall_score)) : null)

      const isGood = qStatus.includes("good") || qStatus.includes("pass") || verifyStatus === "verified" || (rawScore !== null && rawScore >= 2.5)
      const isBad = qStatus.includes("bad") || qStatus.includes("fail") || qStatus.includes("mismatch") || verifyStatus === "mismatch" || (rawScore !== null && rawScore < 2.5)

      if (isGood && !isBad) totalVerified++
      else totalMismatch++

      if (rawScore !== null && !isNaN(rawScore) && rawScore > 0) {
        grandScoreSum += rawScore
        grandScoreCount++
      }

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, { id: agentId, name: agentName, calls: 0, good: 0, bad: 0, scoreSum: 0, scoreCount: 0 })
      }

      const agent = agentMap.get(agentId)!
      agent.calls++
      if (isGood && !isBad) agent.good++
      else agent.bad++

      if (rawScore !== null && !isNaN(rawScore) && rawScore > 0) {
        agent.scoreSum += rawScore
        agent.scoreCount++
      }
    }

    const fallbackEmployees: AgentAuditMetric[] = Array.from(agentMap.values()).map(a => {
      const avgScore = a.scoreCount > 0 ? Number((a.scoreSum / a.scoreCount).toFixed(2)) : (a.calls > 0 ? Number(((a.good / a.calls) * 5).toFixed(2)) : 0)
      const isPass = avgScore >= 2.5 && a.good >= a.bad
      return {
        id: a.id,
        name: a.name,
        calls: a.calls,
        good: a.good,
        bad: a.bad,
        score: avgScore,
        result: isPass ? "PASS" : "FAIL",
      }
    })

    const wrongOutcomesPercentage = totalLeads > 0 ? Number(((totalMismatch / totalLeads) * 100).toFixed(2)) : 0
    const teamAverageScore = grandScoreCount > 0 ? Number((grandScoreSum / grandScoreCount).toFixed(2)) : 0
    const teamPerformancePercentage = Number(((teamAverageScore / 5.0) * 100).toFixed(2))
    const failedEmployeesCount = fallbackEmployees.filter(e => e.result === "FAIL").length
    const dateToUse = selectedDate || (rows[0]?.timestamp ? new Date(rows[0].timestamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])

    return NextResponse.json({
      success: true,
      source: "kairali_sales_metric_bot_for_ho",
      data: {
        auditDate: dateToUse,
        displayDate: formatDateDisplay(dateToUse),
        availableDates: availableDates.length > 0 ? availableDates : [dateToUse],
        metrics: {
          auditedLeads: totalLeads,
          verified: totalVerified,
          mismatch: totalMismatch,
          wrongOutcomesPercentage,
          teamAverageScore,
          teamPerformancePercentage,
          failedEmployeesCount,
        },
        employees: fallbackEmployees,
      },
    }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("[sales-metric-email-api] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load sales metric audit email data" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
