import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSessionUser, hasSalesCallAuditReadAccess, hasSalesCallAuditWriteAccess } from "@/lib/authz"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
}

export type SalesCallAuditRecord = {
  id: number
  time_stamp: string | null
  emp_id: string | null
  name: string | null
  designation: string | null
  mid: string | null
  daily_fail_pass: string | null
  total_calls_audited: number | null
  good_calls: number | null
  bad_calls: number | null
  product_knowledge: number | null
  customer_understanding: number | null
  communication_skills: number | null
  objection_handling: number | null
  closing_skills: number | null
  tone_volume: number | null
  avg_score: number | null
  planned_management: string | null
  actual_hr: string | null
  time_delay_hr: string | null
  hr_name: string | null
  hr_verify_status: string | null
  hr_action_for_calling_fail_pass: string | null
  other_remarks: string | null
  hr_level_whatsapp_update_status_to_sales: string | null
  update_master_attendance_tracker: string | null
  update_status_of_account_fms: string | null
  created_at: string | null
  updated_at: string | null
}

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to view sales call audit data." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (user && !hasSalesCallAuditReadAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view or sales_call_audit.read permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()
    const url = new URL(req.url)
    const empId = url.searchParams.get("emp_id")
    const outcome = url.searchParams.get("outcome")
    const limitParam = parseInt(url.searchParams.get("limit") || "500", 10)
    const limit = Math.min(Math.max(isNaN(limitParam) ? 500 : limitParam, 1), 1000)

    let query = `
      SELECT 
        id, time_stamp, emp_id, name, designation, mid, daily_fail_pass,
        total_calls_audited, good_calls, bad_calls, product_knowledge,
        customer_understanding, communication_skills, objection_handling,
        closing_skills, tone_volume, avg_score, planned_management, actual_hr,
        time_delay_hr, hr_name, hr_verify_status, hr_action_for_calling_fail_pass,
        other_remarks, updated_in_master_attendance_tracker, updated_in_pagarbook,
        update_master_attendance_tracker, update_status_of_account_fms,
        created_at, updated_at
      FROM daily_sales_reports_log_fms
    `
    const params: any[] = []
    const conditions: string[] = []

    if (empId && empId !== "all") {
      conditions.push("(emp_id = ? OR name LIKE ?)")
      params.push(empId, `%${empId}%`)
    }

    if (outcome && outcome !== "all") {
      conditions.push("UPPER(daily_fail_pass) = UPPER(?)")
      params.push(outcome)
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY time_stamp DESC, id DESC LIMIT ?"
    params.push(limit)

    const [rows] = await pool.query(query, params)
    const records = (rows as any[]).map(row => ({
      id: Number(row.id),
      time_stamp: row.time_stamp ? new Date(row.time_stamp).toISOString() : null,
      emp_id: row.emp_id || "",
      name: row.name || "",
      designation: row.designation || "",
      mid: row.mid || "",
      daily_fail_pass: row.daily_fail_pass ? row.daily_fail_pass.toUpperCase() : "FAIL",
      total_calls_audited: row.total_calls_audited ? Number(row.total_calls_audited) : 0,
      good_calls: row.good_calls ? Number(row.good_calls) : 0,
      bad_calls: row.bad_calls ? Number(row.bad_calls) : 0,
      product_knowledge: row.product_knowledge !== null ? Number(row.product_knowledge) : null,
      customer_understanding: row.customer_understanding !== null ? Number(row.customer_understanding) : null,
      communication_skills: row.communication_skills !== null ? Number(row.communication_skills) : null,
      objection_handling: row.objection_handling !== null ? Number(row.objection_handling) : null,
      closing_skills: row.closing_skills !== null ? Number(row.closing_skills) : null,
      tone_volume: row.tone_volume !== null ? Number(row.tone_volume) : null,
      avg_score: row.avg_score !== null ? Number(row.avg_score) : 0,
      planned_management: row.planned_management ? new Date(row.planned_management).toISOString() : null,
      actual_hr: row.actual_hr ? new Date(row.actual_hr).toISOString() : null,
      time_delay_hr: row.time_delay_hr || null,
      hr_name: row.hr_name || null,
      hr_verify_status: row.hr_verify_status || null,
      hr_action_for_calling_fail_pass: row.hr_action_for_calling_fail_pass || null,
      other_remarks: row.other_remarks || null,
      hr_level_whatsapp_update_status_to_sales: null,
      update_master_attendance_tracker: row.update_master_attendance_tracker || row.updated_in_master_attendance_tracker || null,
      update_status_of_account_fms: row.update_status_of_account_fms || row.updated_in_pagarbook || null,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }))

    return NextResponse.json({
      success: true,
      data: records,
      count: records.length,
    }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("[sales-call-audit-api] Error fetching data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch sales call audit reports",
      },
      { status: 500, headers: noStoreHeaders }
    )
  }
}

const GAS_SALES_CALL_AUDIT_URL =
  "https://script.google.com/macros/s/AKfycbw0v0pdyiXReyFNoww5POL9ypXcR8TO5VrjRRvieTW3XKy10u2WDQ7Axh_bote3Y7mXeA/exec"

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to record HR actions." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (user && !hasSalesCallAuditWriteAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.write permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const body = await req.json()
    const {
      id,
      mid,
      hr_verify_status,
      hr_action_for_calling_fail_pass,
      other_remarks,
      update_master_attendance_tracker,
      update_status_of_account_fms,
      hr_name,
    } = body

    if (!id && !mid) {
      return NextResponse.json(
        { success: false, error: "Record ID or MID is required to update HR action" },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const pool = await getPool()
    const now = new Date()
    const actorName = String(hr_name || user?.name || user?.email || "HR Verifier").slice(0, 150)

    const updateQuery = `
      UPDATE daily_sales_reports_log_fms
      SET 
        hr_verify_status = ?,
        hr_action_for_calling_fail_pass = ?,
        other_remarks = ?,
        update_master_attendance_tracker = ?,
        update_status_of_account_fms = ?,
        hr_name = COALESCE(?, hr_name),
        actual_hr = ?,
        updated_at = ?
      WHERE ${id ? "id = ?" : "mid = ?"}
    `

    const params = [
      hr_verify_status || null,
      hr_action_for_calling_fail_pass || null,
      other_remarks || null,
      update_master_attendance_tracker || "No",
      update_status_of_account_fms || "No",
      actorName,
      now,
      now,
      id ? id : mid,
    ]

    const [result] = await pool.query(updateQuery, params)

    // Trigger doPost to Google Apps Script Web App for the sheet
    let sheetSynced = false
    let sheetResponse = null
    try {
      const gasPayload = {
        action: "save_hr_action",
        id: id || body.recordId || body.id,
        recordId: id || body.recordId || body.id,
        mid: mid || body.mid || "",
        emp_id: body.emp_id || body.empId || "",
        empId: body.emp_id || body.empId || "",
        name: body.name || body.employee_name || "",
        employee_name: body.name || body.employee_name || "",
        designation: body.designation || "",
        date: body.date || "",
        time_stamp: body.time_stamp || body.date || now.toISOString(),
        daily_fail_pass: body.daily_fail_pass || body.result || "",
        result: body.daily_fail_pass || body.result || "",
        total_calls_audited: body.total_calls_audited ?? body.calls ?? 0,
        good_calls: body.good_calls ?? body.good ?? 0,
        bad_calls: body.bad_calls ?? body.bad ?? 0,
        avg_score: body.avg_score ?? body.score ?? 0,
        hr_verify_status: hr_verify_status || body.verifyStatus || "",
        hr_action_for_calling_fail_pass: hr_action_for_calling_fail_pass || body.callingAction || "",
        other_remarks: other_remarks || body.remarks || "",
        update_master_attendance_tracker: update_master_attendance_tracker || (body.halfDayLeave ? "Yes" : "No"),
        update_status_of_account_fms: update_status_of_account_fms || (body.pagarbookUpdated ? "Yes" : "No"),
        hr_name: actorName,
        actual_hr: now.toISOString(),
        updated_at: now.toISOString(),
      }

      const gasRes = await fetch(GAS_SALES_CALL_AUDIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gasPayload),
        redirect: "follow",
      })

      const gasText = await gasRes.text()
      try {
        sheetResponse = JSON.parse(gasText)
      } catch {
        sheetResponse = gasText
      }
      sheetSynced = true
    } catch (gasErr: any) {
      console.error("[sales-call-audit-api] Error posting to Google Sheet Apps Script:", gasErr)
    }

    return NextResponse.json({
      success: true,
      message: "HR action updated successfully in daily_sales_reports_log_fms and Google Sheet",
      result,
      sheetSynced,
      sheetResponse,
      updated_at: now.toISOString(),
    }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("[sales-call-audit-api] Error saving HR action:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to update HR action",
      },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
