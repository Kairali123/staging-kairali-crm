import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"

export const dynamic = "force-dynamic"

export interface AgentAuditMetric {
  id: string
  name: string
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
    const pool = await getPool()
    const url = new URL(req.url)
    let selectedDate = url.searchParams.get("date")

    // 1. Get list of distinct audit dates from kairali_sales_metric_bot_for_ho
    let availableDates: string[] = []
    try {
      const [dateRows] = await pool.query<any[]>(
        `SELECT DISTINCT DATE_FORMAT(timestamp, '%Y-%m-%d') as audit_date
         FROM kairali_sales_metric_bot_for_ho
         WHERE timestamp IS NOT NULL
         ORDER BY audit_date DESC
         LIMIT 30`
      )
      if (dateRows && dateRows.length > 0) {
        availableDates = dateRows.map(r => r.audit_date).filter(Boolean)
      }
    } catch (e: any) {
      console.warn("[sales-metric-email-api] Could not fetch distinct dates from metric bot table:", e?.message)
    }

    // If no date was requested and we have dates available, default to the latest date
    if (!selectedDate && availableDates.length > 0) {
      selectedDate = availableDates[0]
    }

    // 2. Query kairali_sales_metric_bot_for_ho for the chosen date or latest
    let rows: any[] = []
    try {
      if (selectedDate) {
        const [metricRows] = await pool.query<any[]>(
          `SELECT 
             id,
             timestamp,
             lead_id,
             sales_person_id,
             sales_person_name,
             client_name,
             lead_outcome_by_agent,
             quality_status,
             lead_outcome_verify_status,
             avg_score,
             overall_score,
             status
           FROM kairali_sales_metric_bot_for_ho
           WHERE DATE(timestamp) = DATE(?)
           ORDER BY timestamp DESC`,
          [selectedDate]
        )
        rows = metricRows || []
      } else {
        const [metricRows] = await pool.query<any[]>(
          `SELECT 
             id,
             timestamp,
             lead_id,
             sales_person_id,
             sales_person_name,
             client_name,
             lead_outcome_by_agent,
             quality_status,
             lead_outcome_verify_status,
             avg_score,
             overall_score,
             status
           FROM kairali_sales_metric_bot_for_ho
           ORDER BY timestamp DESC
           LIMIT 500`
        )
        rows = metricRows || []
      }
    } catch (metricErr: any) {
      console.warn("[sales-metric-email-api] Error reading kairali_sales_metric_bot_for_ho:", metricErr?.message)
    }

    // Fallback: If no rows in kairali_sales_metric_bot_for_ho, check daily_sales_reports_log_fms
    if (rows.length === 0) {
      try {
        const [fmsRows] = await pool.query<any[]>(
          `SELECT 
             id,
             time_stamp as timestamp,
             mid as lead_id,
             emp_id as sales_person_id,
             name as sales_person_name,
             good_calls,
             bad_calls,
             total_calls_audited,
             avg_score,
             daily_fail_pass
           FROM daily_sales_reports_log_fms
           ${selectedDate ? "WHERE DATE(time_stamp) = DATE(?)" : ""}
           ORDER BY time_stamp DESC
           LIMIT 100`,
          selectedDate ? [selectedDate] : []
        )

        if (fmsRows && fmsRows.length > 0) {
          const employeesMap = new Map<string, AgentAuditMetric>()
          let totalAudited = 0
          let totalGood = 0
          let totalBad = 0
          let totalScoreSum = 0
          let scoreCount = 0

          for (const r of fmsRows) {
            const empId = r.sales_person_id || `EMP-${r.id}`
            const empName = r.sales_person_name || "Unknown Agent"
            const totalCalls = Number(r.total_calls_audited) || (Number(r.good_calls || 0) + Number(r.bad_calls || 0)) || 1
            const good = Number(r.good_calls) || 0
            const bad = Number(r.bad_calls) || (totalCalls - good)
            const score = Number(r.avg_score) || 0
            const isPass = String(r.daily_fail_pass || "").toUpperCase() === "PASS" || (score >= 2.5 && good >= bad)

            totalAudited += totalCalls
            totalGood += good
            totalBad += bad
            totalScoreSum += score
            scoreCount++

            employeesMap.set(empId, {
              id: empId,
              name: empName,
              calls: totalCalls,
              good,
              bad,
              score: Number(score.toFixed(2)),
              result: isPass ? "PASS" : "FAIL",
            })
          }

          const employees = Array.from(employeesMap.values())
          const wrongOutcomes = totalAudited > 0 ? Number(((totalBad / totalAudited) * 100).toFixed(2)) : 0
          const teamAvg = scoreCount > 0 ? Number((totalScoreSum / scoreCount).toFixed(2)) : 0
          const teamPerf = Number(((teamAvg / 5.0) * 100).toFixed(2))
          const failedCount = employees.filter(e => e.result === "FAIL").length

          const dateToUse = selectedDate || (fmsRows[0]?.timestamp ? new Date(fmsRows[0].timestamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])

          return NextResponse.json({
            success: true,
            source: "daily_sales_reports_log_fms",
            data: {
              auditDate: dateToUse,
              displayDate: formatDateDisplay(dateToUse),
              availableDates: availableDates.length > 0 ? availableDates : [dateToUse],
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
          })
        }
      } catch (fmsErr: any) {
        console.warn("[sales-metric-email-api] Fallback to FMS table also failed:", fmsErr?.message)
      }
    }

    // 3. Process rows from kairali_sales_metric_bot_for_ho
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

      // Good call criteria: quality_status contains good/pass, verify_status is verified, or score >= 2.5
      const isGood = qStatus.includes("good") || qStatus.includes("pass") || verifyStatus === "verified" || (rawScore !== null && rawScore >= 2.5)
      const isBad = qStatus.includes("bad") || qStatus.includes("fail") || qStatus.includes("mismatch") || verifyStatus === "mismatch" || (rawScore !== null && rawScore < 2.5)

      if (isGood && !isBad) {
        totalVerified++
      } else {
        totalMismatch++
      }

      if (rawScore !== null && !isNaN(rawScore) && rawScore > 0) {
        grandScoreSum += rawScore
        grandScoreCount++
      }

      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          id: agentId,
          name: agentName,
          calls: 0,
          good: 0,
          bad: 0,
          scoreSum: 0,
          scoreCount: 0,
        })
      }

      const agent = agentMap.get(agentId)!
      agent.calls++
      if (isGood && !isBad) {
        agent.good++
      } else {
        agent.bad++
      }

      if (rawScore !== null && !isNaN(rawScore) && rawScore > 0) {
        agent.scoreSum += rawScore
        agent.scoreCount++
      }
    }

    const employees: AgentAuditMetric[] = Array.from(agentMap.values()).map(a => {
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

    // Sort: FAIL employees first, then by calls descending
    employees.sort((a, b) => {
      if (a.result === "FAIL" && b.result === "PASS") return -1
      if (a.result === "PASS" && b.result === "FAIL") return 1
      return b.calls - a.calls
    })

    const wrongOutcomesPercentage = totalLeads > 0 ? Number(((totalMismatch / totalLeads) * 100).toFixed(2)) : 0
    const teamAverageScore = grandScoreCount > 0 ? Number((grandScoreSum / grandScoreCount).toFixed(2)) : (totalLeads > 0 ? Number(((totalVerified / totalLeads) * 5).toFixed(2)) : 0)
    const teamPerformancePercentage = Number(((teamAverageScore / 5.0) * 100).toFixed(2))
    const failedEmployeesCount = employees.filter(e => e.result === "FAIL").length

    const dateToUse = selectedDate || (rows[0]?.timestamp ? new Date(rows[0].timestamp).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])

    const payload: SalesCallAuditEmailData = {
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
      employees,
    }

    return NextResponse.json({
      success: true,
      source: "kairali_sales_metric_bot_for_ho",
      data: payload,
    })
  } catch (error: any) {
    console.error("[sales-metric-email-api] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to load sales metric audit email data",
      },
      { status: 500 }
    )
  }
}
