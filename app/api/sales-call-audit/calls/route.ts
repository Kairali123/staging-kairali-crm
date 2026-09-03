import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import {
  getSalesCallAuditIdentity,
  getSalesCallAuditScope,
  getSessionUser,
  hasSalesCallAuditPageAccess,
  isRowInSalesCallAuditScope,
} from "@/lib/authz"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
}

export interface AuditedCallDetail {
  callId: string
  leadId: string
  clientName: string
  clientPhone: string
  callTime: string
  callDuration: string
  qualityType: "good" | "bad"
  statedOutcome: string
  verifiedOutcome: string
  avgScore: number
  productKnowledge: number | string | null
  customerUnderstanding: number | string | null
  communicationSkills: number | string | null
  objectionHandling: number | string | null
  closingSkills: number | string | null
  toneVolume: number | string | null
  auditorObservation: string
  strengths: string[]
  deficiencies: string[]
  recordingUrl?: string
  callType?: string
}

function parseScore(val: any): number | string | null {
  if (val === null || val === undefined || val === "") return null
  const s = String(val).trim()
  if (s.toUpperCase() === "NA" || s.toUpperCase() === "N/A") return "NA"
  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

function formatCallDateTime(dateVal: any): string {
  if (!dateVal) return "N/A"
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return String(dateVal)
  }
}

function normalizeToYmd(dateStr?: string | null): string | null {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmy) {
    const day = dmy[1].padStart(2, "0")
    const month = dmy[2].padStart(2, "0")
    const year = dmy[3]
    return `${year}-${month}-${day}`
  }
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymd) {
    const year = ymd[1]
    const month = ymd[2].padStart(2, "0")
    const day = ymd[3].padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to view call details." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (user && !hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    // Drill-down is data, so it needs a data scope, not just page access.
    const scope = user ? getSalesCallAuditScope(user) : "all"
    if (scope === "none") {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.viewSelf or sales_call_audit.viewAll permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()
    const url = new URL(req.url)
    const empId = url.searchParams.get("emp_id") || ""
    const name = url.searchParams.get("name") || ""
    const date = url.searchParams.get("date") || ""
    const type = (url.searchParams.get("type") || "all").toLowerCase() // "good" | "bad" | "all"
    const recordId = url.searchParams.get("record_id")

    // 1. Fetch parent audit record from daily_sales_reports_log_fms
    let parentRow: any = null
    if (recordId) {
      const [rows] = await pool.query<any[]>(
        `SELECT * FROM daily_sales_reports_log_fms WHERE id = ? LIMIT 1`,
        [recordId]
      )
      if (rows && rows.length > 0) parentRow = rows[0]
    } else if (empId || name) {
      const [rows] = await pool.query<any[]>(
        `SELECT * FROM daily_sales_reports_log_fms 
         WHERE (emp_id = ? OR name LIKE ?) 
         ORDER BY time_stamp DESC LIMIT 1`,
        [empId, `%${name || empId}%`]
      )
      if (rows && rows.length > 0) parentRow = rows[0]
    }

    let scopedEmpId = empId || parentRow?.emp_id || ""
    let scopedName = name || parentRow?.name || ""
    if (scope === "self") {
      const identity = getSalesCallAuditIdentity(user)
      if (!identity.employeeId && !identity.name) {
        return NextResponse.json(
          { success: false, error: "Forbidden: session carries no employee identity to scope this request." },
          { status: 403, headers: noStoreHeaders }
        )
      }
      if (parentRow && !isRowInSalesCallAuditScope(user, parentRow)) {
        return NextResponse.json(
          { success: false, error: "Forbidden: this audit record belongs to another employee." },
          { status: 403, headers: noStoreHeaders }
        )
      }
      scopedEmpId = identity.employeeId || scopedEmpId
      scopedName = identity.name || scopedName
    }

    // 2. Fetch granular call audit records strictly from kairali_sales_metric_bot_for_ho
    let rawBotRows: any[] = []
    const auditLimit = Math.max(Number(parentRow?.total_calls_audited || 0) + 100, 300)
    const targetYmd = normalizeToYmd(date) || normalizeToYmd(parentRow?.time_stamp)

    try {
      // 1. First try calls matching the exact target date (YYYY-MM-DD)
      if (targetYmd) {
        const [exactRows] = await pool.query<any[]>(
          `SELECT * FROM kairali_sales_metric_bot_for_ho 
           WHERE (sales_person_id = ? OR sales_person_name LIKE ?)
             AND DATE(timestamp) = ?
           ORDER BY (CASE WHEN quality_status IS NOT NULL OR overall_score > 0 OR avg_score > 0 OR lead_outcome_verify_status IS NOT NULL THEN 1 ELSE 0 END) DESC, timestamp DESC, id DESC
           LIMIT ?`,
          [scopedEmpId, `%${scopedName || scopedEmpId}%`, targetYmd, auditLimit]
        )
        if (exactRows && exactRows.length > 0) {
          rawBotRows = exactRows
        }
      }

      // 2. If no calls on exact date (e.g. audit evaluated calls from previous days), query on or before audit date
      if (rawBotRows.length === 0 && targetYmd) {
        const [closestRows] = await pool.query<any[]>(
          `SELECT * FROM kairali_sales_metric_bot_for_ho 
           WHERE (sales_person_id = ? OR sales_person_name LIKE ?)
             AND DATE(timestamp) <= ?
           ORDER BY (CASE WHEN quality_status IS NOT NULL OR overall_score > 0 OR avg_score > 0 OR lead_outcome_verify_status IS NOT NULL THEN 1 ELSE 0 END) DESC, timestamp DESC, id DESC
           LIMIT ?`,
          [scopedEmpId, `%${scopedName || scopedEmpId}%`, targetYmd, auditLimit]
        )
        if (closestRows && closestRows.length > 0) {
          rawBotRows = closestRows
        }
      }

      // 3. Fallback: query recent calls for this salesperson
      if (rawBotRows.length === 0) {
        const [fallbackRows] = await pool.query<any[]>(
          `SELECT * FROM kairali_sales_metric_bot_for_ho 
           WHERE (sales_person_id = ? OR sales_person_name LIKE ?)
           ORDER BY (CASE WHEN quality_status IS NOT NULL OR overall_score > 0 OR avg_score > 0 OR lead_outcome_verify_status IS NOT NULL THEN 1 ELSE 0 END) DESC, timestamp DESC, id DESC
           LIMIT ?`,
          [scopedEmpId, `%${scopedName || scopedEmpId}%`, auditLimit]
        )
        if (fallbackRows && fallbackRows.length > 0) {
          rawBotRows = fallbackRows
        }
      }
    } catch (e: any) {
      console.warn("[sales-call-details-api] kairali_sales_metric_bot_for_ho query error:", e?.message)
    }

    // Filter out voicemails - only count and show actual calls
    rawBotRows = rawBotRows.filter(r => {
      const callType = String(r.call_type || r.callType || "").trim().toLowerCase()
      return callType !== "voicemail" && !callType.includes("voicemail")
    })

    const totalAudited = parentRow?.total_calls_audited
      ? Number(parentRow.total_calls_audited)
      : rawBotRows.length || 10

    const goodCount = parentRow?.good_calls !== null && parentRow?.good_calls !== undefined
      ? Number(parentRow.good_calls)
      : rawBotRows.filter(r => String(r.quality_status || "").toLowerCase().includes("good") || String(r.quality_status || "").toLowerCase().includes("pass")).length

    const badCount = parentRow?.bad_calls !== null && parentRow?.bad_calls !== undefined
      ? Number(parentRow.bad_calls)
      : Math.max(0, totalAudited - goodCount)

    const baseScore = parentRow?.avg_score ? Number(parentRow.avg_score) : 1.5

    // Build the list of real call-specific audited calls (excluding voicemails)
    const callsList: AuditedCallDetail[] = []

    if (rawBotRows.length > 0) {
      for (let idx = 0; idx < rawBotRows.length; idx++) {
        const r = rawBotRows[idx]
        const qStatus = String(r.quality_status || "").toLowerCase()
        const scoreVal = parseFloat(r.avg_score || r.overall_score || "0")
        const verifyStatus = String(r.lead_outcome_verify_status || "").trim().toLowerCase()

        const isGood =
          qStatus.includes("good") ||
          qStatus.includes("pass") ||
          verifyStatus === "yes" ||
          verifyStatus === "verified" ||
          (qStatus === "" && !isNaN(scoreVal) && scoreVal >= 2.5)

        const qType: "good" | "bad" = isGood ? "good" : "bad"
        if (type === "good" && qType !== "good") continue
        if (type === "bad" && qType !== "bad") continue

        const callSpecificScore = !isNaN(scoreVal) && scoreVal > 0
          ? Number(scoreVal.toFixed(2))
          : (isGood ? 3.5 : 1.0)

        // Parse 6 call-specific parameters directly from kairali_sales_metric_bot_for_ho
        const pk = parseScore(r.product_knowledge)
        const cu = parseScore(r.customer_understanding)
        const cs = parseScore(r.communication_skills)
        const oh = parseScore(r.objection_handling)
        const cl = parseScore(r.closing_skills)
        const tv = parseScore(r.tone_and_volume)

        // Generate dynamic strengths & deficiencies based on call scores
        const strengths: string[] = []
        const deficiencies: string[] = []

        if (typeof pk === "number" && pk >= 3.0) strengths.push("Product Knowledge Demonstrated")
        else if (typeof pk === "number" && pk < 2.5) deficiencies.push("Needs Product Knowledge Improvement")

        if (typeof cu === "number" && cu >= 3.0) strengths.push("Strong Customer Understanding")
        else if (typeof cu === "number" && cu < 2.5) deficiencies.push("Customer Needs Not Explored")

        if (typeof cs === "number" && cs >= 3.0) strengths.push("Clear Professional Communication")
        else if (typeof cs === "number" && cs < 2.5) deficiencies.push("Communication Flow Deficient")

        if (typeof oh === "number" && oh >= 3.0) strengths.push("Effective Objection Handling")
        else if (typeof oh === "number" && oh < 2.5) deficiencies.push("Weak Objection Handling")

        if (typeof cl === "number" && cl >= 3.0) strengths.push("Proactive Closing Strategy")
        else if (typeof cl === "number" && cl < 2.5) deficiencies.push("Missing Clear Close / Next Steps")

        if (typeof tv === "number" && tv >= 3.0) strengths.push("Polite Tone & Engaging Pace")
        else if (typeof tv === "number" && tv < 2.5) deficiencies.push("Tone / Pace Benchmark Breached")

        if (isGood && strengths.length === 0) strengths.push("Benchmark Standards Met")
        if (!isGood && deficiencies.length === 0) deficiencies.push("Quality Benchmark Breached")

        const observation =
          r.explanation ||
          r.what_went_wrong_by_sales_team_senior_verifier ||
          r.complete_explanation ||
          r.remarks ||
          r.reason ||
          (isGood
            ? "Conversation structure and lead qualification met quality benchmark standards."
            : "Call interaction did not satisfy minimum quality criteria or required parameters.")

        callsList.push({
          callId: `CALL-${r.id}`,
          leadId: String(r.lead_id || r.buffer_lead_id || `LEAD-${r.id}`).trim(),
          clientName: r.client_name || r.lead_id || "Prospective Client",
          clientPhone: r.phone ? String(r.phone) : "",
          callTime: formatCallDateTime(r.timestamp),
          callDuration: r.call_duration || (r.call_count ? `${r.call_count} call att.` : "—"),
          qualityType: qType,
          statedOutcome: r.lead_outcome_by_agent || r.conversion_outcome || (isGood ? "Interested / Treatment Consult" : "Callback Requested"),
          verifiedOutcome: r.lead_outcome_verify_status === "Yes"
            ? "Verified Quality Call (Passed)"
            : r.lead_outcome_verify_status === "No"
              ? "Audit Mismatch / Quality Benchmark Breached"
              : r.lead_outcome_verify_status || (isGood ? "Verified Quality Call" : "Audit Mismatch / Quality Benchmark Breached"),
          avgScore: callSpecificScore,
          productKnowledge: pk,
          customerUnderstanding: cu,
          communicationSkills: cs,
          objectionHandling: oh,
          closingSkills: cl,
          toneVolume: tv,
          auditorObservation: observation,
          strengths,
          deficiencies,
          recordingUrl: r.audio_url || undefined,
          callType: r.call_type ? String(r.call_type) : undefined,
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        agent: {
          empId: scopedEmpId || parentRow?.emp_id || "EMP",
          name: scopedName || parentRow?.name || "Sales Agent",
          designation: parentRow?.designation || "Sales Manager",
          date: date || (parentRow?.time_stamp ? new Date(parentRow.time_stamp).toISOString().split("T")[0] : "Audit Date"),
          totalCalls: totalAudited,
          goodCalls: goodCount,
          badCalls: badCount,
          avgScore: baseScore,
          outcome: parentRow?.daily_fail_pass || "FAIL",
          evaluator: parentRow?.hr_name || "Dhaneshwar Chaturvedi",
          // Employee daily overall 6 metrics from daily_sales_reports_log_fms
          overallMetrics: {
            productKnowledge: parentRow?.product_knowledge !== null && parentRow?.product_knowledge !== undefined ? Number(parentRow.product_knowledge) : null,
            customerUnderstanding: parentRow?.customer_understanding !== null && parentRow?.customer_understanding !== undefined ? Number(parentRow.customer_understanding) : null,
            communicationSkills: parentRow?.communication_skills !== null && parentRow?.communication_skills !== undefined ? Number(parentRow.communication_skills) : null,
            objectionHandling: parentRow?.objection_handling !== null && parentRow?.objection_handling !== undefined ? Number(parentRow.objection_handling) : null,
            closingSkills: parentRow?.closing_skills !== null && parentRow?.closing_skills !== undefined ? Number(parentRow.closing_skills) : null,
            toneVolume: parentRow?.tone_volume !== null && parentRow?.tone_volume !== undefined ? Number(parentRow.tone_volume) : null,
            avgScore: baseScore,
            result: parentRow?.daily_fail_pass || "FAIL",
          },
        },
        type,
        count: callsList.length,
        data: callsList,
      },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error("[sales-call-details-api] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch audited call details" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
