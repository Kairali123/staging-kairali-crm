import { NextRequest, NextResponse } from "next/server"
import type { RowDataPacket } from "mysql2"
import { z } from "zod"

import { getSessionUser, hasPermission } from "@/lib/authz"
import { getPool } from "@/lib/db"

const READ_PERMISSION = "sales_call_audit.read"
const WRITE_PERMISSION = "sales_call_audit.write"

const actionSchema = z.object({
  auditDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/),
  employeeId: z.string().trim().min(1).max(80),
  verifyStatus: z.enum(["Verified", "Need clarification", "Rejected"]),
  callingAction: z.enum([
    "Half day leave",
    "No action required",
    "Coaching required",
    "Warning issued",
    "Re-audit required",
  ]),
  remarks: z.string().trim().max(1000),
  halfDayLeave: z.boolean(),
  pagarbookUpdated: z.boolean(),
})

type ActionRow = RowDataPacket & {
  audit_date: Date | string
  employee_id: string
  verify_status: string
  calling_action: string
  remarks: string | null
  half_day_leave: number | boolean
  pagarbook_updated: number | boolean
  updated_at: Date | string
}

function toAuditDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}-${month}-${date.getFullYear()}`
}

function denied(status: 401 | 403, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } })
}

function storageUnavailable() {
  return NextResponse.json(
    { error: "HR action storage is not provisioned in this environment." },
    { status: 503, headers: { "Cache-Control": "private, no-store" } },
  )
}

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) return denied(401, "Unauthorized")
  if (!hasPermission(user, READ_PERMISSION)) return denied(403, "Sales call audit read permission required")

  try {
    const pool = await getPool()
    const [rows] = await pool.query<ActionRow[]>(
      `SELECT audit_date, employee_id, verify_status, calling_action, remarks,
              half_day_leave, pagarbook_updated, updated_at
         FROM sales_call_audit_hr_actions
        ORDER BY updated_at DESC
        LIMIT 1000`,
    )

    return NextResponse.json({
      actions: rows.map((row) => ({
        auditDate: toAuditDate(row.audit_date),
        employeeId: row.employee_id,
        verifyStatus: row.verify_status,
        callingAction: row.calling_action,
        remarks: row.remarks ?? "",
        halfDayLeave: Boolean(row.half_day_leave),
        pagarbookUpdated: Boolean(row.pagarbook_updated),
        savedAt: new Date(row.updated_at).toISOString(),
      })),
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return storageUnavailable()
  }
}

export async function PUT(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) return denied(401, "Unauthorized")
  if (!hasPermission(user, WRITE_PERMISSION)) return denied(403, "Sales call audit write permission required")

  const parsed = actionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid HR action payload" }, { status: 400 })
  }

  try {
    const pool = await getPool()
    const action = parsed.data
    const actor = String(user.email || user.id || "authenticated-user").slice(0, 190)

    await pool.query(
      `INSERT INTO sales_call_audit_hr_actions
        (audit_date, employee_id, verify_status, calling_action, remarks,
         half_day_leave, pagarbook_updated, updated_by, updated_at)
       VALUES (STR_TO_DATE(?, '%d-%m-%Y'), ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         verify_status = VALUES(verify_status),
         calling_action = VALUES(calling_action),
         remarks = VALUES(remarks),
         half_day_leave = VALUES(half_day_leave),
         pagarbook_updated = VALUES(pagarbook_updated),
         updated_by = VALUES(updated_by),
         updated_at = NOW()`,
      [
        action.auditDate,
        action.employeeId,
        action.verifyStatus,
        action.callingAction,
        action.remarks || null,
        action.halfDayLeave,
        action.pagarbookUpdated,
        actor,
      ],
    )

    return NextResponse.json({
      action: { ...action, savedAt: new Date().toISOString() },
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return storageUnavailable()
  }
}
