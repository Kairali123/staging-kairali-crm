import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasSalesCallAuditSendAccess } from "@/lib/authz"
import {
  dispatchAuditReportEmail,
  renderAuditReportEmail,
} from "@/lib/sales-call-audit-email"
import { buildSalesCallAuditReport } from "@/lib/sales-call-audit-report"
import { recordSentReport } from "@/lib/sales-call-audit-tracker"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
}

function normalizeToYmd(val: any): string | null {
  if (!val) return null
  if (typeof val === "string") {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0")
      const month = ddmmyyyy[2].padStart(2, "0")
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }
    const ddmmmyyyy = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})$/)
    if (ddmmmyyyy) {
      const day = ddmmmyyyy[1].padStart(2, "0")
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      }
      const month = monthMap[ddmmmyyyy[2].toLowerCase().slice(0, 3)] || "01"
      const year = ddmmmyyyy[3]
      return `${year}-${month}-${day}`
    }
  }
  try {
    const d = val instanceof Date ? val : new Date(val)
    if (isNaN(d.getTime())) return null
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    return formatter.format(d)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to send audit reports." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditSendAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.send permission required to dispatch email reports." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const targetRecipient = process.env.HR_AUDIT_EMAIL || "ho.hr@kairali.com"

    // Issue #60: Reject any client-supplied metrics, employee lists, or unauthorized custom recipients
    const isCustomTo = body.to && body.to !== targetRecipient && body.to !== "ho.hr@kairali.com"
    const isCustomRecipient = body.recipient && body.recipient !== targetRecipient && body.recipient !== "ho.hr@kairali.com"

    if (body.metrics || body.employees || isCustomTo || isCustomRecipient || body.reportContent) {
      return NextResponse.json(
        {
          success: false,
          error: "Client-supplied metrics, employee data, or custom recipient override is prohibited. All report data is server-computed.",
        },
        { status: 400, headers: noStoreHeaders }
      )
    }

    const requestedDate = body.date || body.dateKey || ""
    const targetYmd = normalizeToYmd(requestedDate) || normalizeToYmd(new Date()) || ""

    const { source, data } = await buildSalesCallAuditReport(targetYmd)

    if (data.employees.length === 0) {
      return NextResponse.json(
        { success: false, error: `No audit records found for the requested date: ${targetYmd}` },
        { status: 404, headers: noStoreHeaders }
      )
    }

    const { subject, html } = renderAuditReportEmail({
      date: data.auditDate,
      displayDate: data.displayDate,
      metrics: data.metrics,
      employees: data.employees,
    })

    const { smtpConfigured, smtpDispatched, smtpError, to, cc, messageId } = await dispatchAuditReportEmail({
      subject,
      html,
    })

    if (!smtpConfigured) {
      console.warn("[sales-call-audit-email] SMTP credentials missing, failing closed")
      return NextResponse.json(
        {
          success: false,
          error: "SMTP credentials not configured on server",
        },
        { status: 500, headers: noStoreHeaders }
      )
    }

    if (!smtpDispatched) {
      console.error("[sales-call-audit-email] SMTP dispatch failed:", smtpError)
      return NextResponse.json(
        {
          success: false,
          error: `SMTP dispatch failed: ${smtpError || "Mailer error"}`,
        },
        { status: 502, headers: noStoreHeaders }
      )
    }

    console.log(
      "[sales-call-audit-email] Dispatched report via SMTP:",
      messageId,
      "to:",
      to.join(", "),
      cc.length > 0 ? `cc: ${cc.join(", ")}` : ""
    )

    // Persist sent status for this audit date
    recordSentReport({
      date: targetYmd,
      sentAt: new Date().toISOString(),
      recipient: to.join(", "),
      messageId,
    })

    return NextResponse.json(
      {
        success: true,
        message: `Report successfully dispatched to ${to.join(", ")}`,
        messageId,
        metrics: data.metrics,
      },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error("[sales-call-audit-email] Fatal error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process email report" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
