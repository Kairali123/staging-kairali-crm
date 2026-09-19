import { NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/db"
import { getSalesCallAuditScope, getSessionUser, hasSalesCallAuditPageAccess } from "@/lib/authz"
import { isReportSentForDate } from "@/lib/sales-call-audit-tracker"
import { buildSalesCallAuditReport, type SalesCallAuditReportMetrics } from "@/lib/sales-call-audit-report"

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
  // Needs Improvement + Bad
  bad: number
  neutral: number
  notRated: number
  overallPerformance: string
  result: "PASS" | "FAIL"
}

export interface SalesCallAuditEmailData {
  auditDate: string
  displayDate: string
  availableDates: string[]
  metrics: SalesCallAuditReportMetrics
  isMailSent?: boolean
  employees: AgentAuditMetric[]
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

    // 2. Same report the email sends (lib/sales-call-audit-report)
    const { source, data } = await buildSalesCallAuditReport(selectedDate || "")

    return NextResponse.json({
      success: true,
      source,
      data: {
        ...data,
        displayDate: selectedDate ? data.displayDate : "No Date Selected",
        availableDates,
        isMailSent: selectedDate ? isReportSentForDate(selectedDate) : false,
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
