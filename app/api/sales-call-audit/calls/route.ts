import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import {
  getSalesCallAuditScope,
  getSessionUser,
  hasSalesCallAuditPageAccess,
  isRowInSalesCallAuditScope,
} from "@/lib/authz"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
}

// Per-call Overall Performance labels written by the live pilot audit (v1.9).
export type CallPerformance = "Good" | "Needs Improvement" | "Bad" | "Neutral" | "Not Rated"
// Popup tab. "bad" groups Needs Improvement + Bad, matching daily bad_calls.
export type CallGroup = "good" | "bad" | "neutral" | "not_rated"

export interface AuditedCallDetail {
  callId: string
  leadId: string | null
  clientName: string | null
  callTime: string
  businessUnit: string | null
  callStage: string | null
  recordingUrl: string | null
  crmOutcome: string | null
  crmNotes: string | null
  performance: CallPerformance
  group: CallGroup
  performanceRemarks: string | null
  salesJobAssessment: string | null
  // Cold workflow — only filled when the CRM outcome is Cold
  recommendedAction: string | null
  actionMode: string | null
  followupOwner: string | null
  followupDue: string | null
  targetTeam: string | null
  escalationReason: string | null
  coldReason: string | null
  remarks: string | null
  whatWentWrong: string | null
  suggestedSolution: string | null
}

const PERFORMANCE_BY_ASSESSMENT: Record<string, CallPerformance> = {
  done_correctly: "Good",
  partially_done: "Needs Improvement",
  not_done_correctly: "Bad",
  neutral: "Neutral",
}

const GROUP_BY_PERFORMANCE: Record<CallPerformance, CallGroup> = {
  "Good": "good",
  "Needs Improvement": "bad",
  "Bad": "bad",
  "Neutral": "neutral",
  "Not Rated": "not_rated",
}

// Same mapping as the pilot's callOverallPerformance_: use the stored label,
// fall back to the assessment, anything else is Not Rated.
function performanceOf(overall: unknown, assessment: unknown): CallPerformance {
  const label = String(overall ?? "").trim()
  if (label in GROUP_BY_PERFORMANCE) return label as CallPerformance
  return PERFORMANCE_BY_ASSESSMENT[String(assessment ?? "").trim()] ?? "Not Rated"
}

const IST_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// DATETIME columns hold IST wall time. The pool (timezone +05:30) returns them
// as Dates at the right instant; a raw "YYYY-MM-DD HH:mm:ss" string is read as
// IST too. Never depends on the server clock (Vercel runs in UTC).
function toIstInstant(val: unknown): Date | null {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  const s = String(val).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/)
  const d = m ? new Date(`${m[1]}T${m[2]}+05:30`) : new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function istYmd(val: unknown): string | null {
  const d = toIstInstant(val)
  return d ? IST_YMD.format(d) : null
}

function nextYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

function formatCallTime(val: unknown): string {
  const d = toIstInstant(val)
  if (!d) return val ? String(val) : ""
  return d.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

const text = (v: unknown): string | null => {
  const s = v === null || v === undefined ? "" : String(v).trim()
  return s || null
}

const PARENT_SELECT_COLUMNS = `
  id, emp_id, name, designation, time_stamp, daily_fail_pass,
  total_calls_audited, good_calls, bad_calls, neutral, not_related,
  overall_performance, hr_name
`

const CALL_SELECT_COLUMNS = `
  id, call_id, lead_id, call_datetime, client, business_unit, call_stage,
  recording_drive_url, crm_outcome, crm_notes, sales_job_assessment,
  overall_performance, overall_performance_remarks, recommended_action, action_mode,
  followup_owner, followup_due, target_team, escalation_reason, cold_reason,
  remarks, what_went_wrong, suggested_solution
`

const MAX_CALLS = 100

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to view call details." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const scope = getSalesCallAuditScope(user)
    if (scope === "none") {
      return NextResponse.json(
        { success: false, error: "Forbidden: no sales call audit data in scope." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const recordId = new URL(req.url).searchParams.get("record_id")
    if (!recordId) {
      return NextResponse.json(
        { success: false, error: "record_id is required." },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()

    // The daily record decides whose calls and which day — never client input.
    const [parentRows] = await pool.query<any[]>(
      `SELECT ${PARENT_SELECT_COLUMNS} FROM daily_sales_reports_log_fms WHERE id = ? LIMIT 1`,
      [recordId]
    )
    const parent = parentRows?.[0]
    if (!parent) {
      return NextResponse.json(
        { success: false, error: "Audit record not found." },
        { status: 404, headers: noStoreHeaders }
      )
    }

    if (scope === "self" && !isRowInSalesCallAuditScope(user, parent)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: this audit record belongs to another employee" },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const salesperson = String(parent.name || "").trim()
    const day = istYmd(parent.time_stamp)

    let callRows: any[] = []
    if (salesperson && day) {
      // `salesperson` is the exact name the pilot's daily report groups by.
      // String bounds keep the comparison in stored IST wall time.
      const [rows] = await pool.query<any[]>(
        `SELECT ${CALL_SELECT_COLUMNS} FROM sales_call_audit_live_pilot_calls
         WHERE TRIM(salesperson) = ?
           AND call_datetime >= ? AND call_datetime < ?
           AND processing_status = 'Completed'
         ORDER BY call_datetime DESC, id DESC
         LIMIT ?`,
        [salesperson, `${day} 00:00:00`, `${nextYmd(day)} 00:00:00`, MAX_CALLS]
      )
      callRows = rows || []
    }

    const calls: AuditedCallDetail[] = callRows.map(r => {
      const performance = performanceOf(r.overall_performance, r.sales_job_assessment)
      return {
        callId: String(r.call_id || `CALL-${r.id}`),
        leadId: text(r.lead_id),
        clientName: text(r.client),
        callTime: formatCallTime(r.call_datetime),
        businessUnit: text(r.business_unit),
        callStage: text(r.call_stage),
        recordingUrl: text(r.recording_drive_url),
        crmOutcome: text(r.crm_outcome),
        crmNotes: text(r.crm_notes),
        performance,
        group: GROUP_BY_PERFORMANCE[performance],
        performanceRemarks: text(r.overall_performance_remarks),
        salesJobAssessment: text(r.sales_job_assessment),
        recommendedAction: text(r.recommended_action),
        actionMode: text(r.action_mode),
        followupOwner: text(r.followup_owner),
        followupDue: text(r.followup_due),
        targetTeam: text(r.target_team),
        escalationReason: text(r.escalation_reason),
        coldReason: text(r.cold_reason),
        remarks: text(r.remarks),
        whatWentWrong: text(r.what_went_wrong),
        suggestedSolution: text(r.suggested_solution),
      }
    })

    return NextResponse.json(
      {
        success: true,
        // Header counts come from the daily record so the popup matches the table.
        agent: {
          empId: parent.emp_id || "",
          name: salesperson,
          designation: parent.designation || "",
          date: day,
          totalCalls: Number(parent.total_calls_audited) || 0,
          goodCalls: Number(parent.good_calls) || 0,
          badCalls: Number(parent.bad_calls) || 0,
          neutralCalls: Number(parent.neutral) || 0,
          notRatedCalls: Number(parent.not_related) || 0,
          overallPerformance: parent.overall_performance || null,
          outcome: parent.daily_fail_pass ? String(parent.daily_fail_pass).toUpperCase() : null,
          evaluator: parent.hr_name || null,
        },
        count: calls.length,
        truncated: calls.length === MAX_CALLS,
        calls,
        data: calls,
      },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error("[sales-call-details-api] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load call audit details" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
