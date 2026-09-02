import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isSalesCallAuditSuperAdmin } from "@/lib/authz"
import {
  dispatchAuditReportEmail,
  renderAuditReportEmail,
} from "@/lib/sales-call-audit-email"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to send audit reports." },
        { status: 401 }
      )
    }

    // Dispatching this report is a super_admin-only action (owner ruling).
    //
    // It is not a read: the message tells HR to dock half a day's attendance for
    // every FAIL, and it leaves the system to a fixed mailbox. `viewAll` — which
    // HR managers hold in order to read the same figures on screen — deliberately
    // does not carry it. The page hides the button for everyone else, and this is
    // the check that actually enforces it.
    if (user && !isSalesCallAuditSuperAdmin(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: only a super_admin may dispatch the team audit report." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      date,
      displayDate = "Today",
      metrics,
      employees = [],
    } = body

    // A `to` in the request body is deliberately ignored. Recipients come from
    // AUDIT_REPORT_TO / AUDIT_REPORT_CC, so a caller cannot redirect the team's
    // scorecard to an address of their choosing.
    const { subject, html } = renderAuditReportEmail({ date, displayDate, metrics, employees })

    const { smtpConfigured, smtpDispatched, smtpError, to, cc } = await dispatchAuditReportEmail({
      subject,
      html,
    })

    const audience = cc.length > 0 ? `${to.join(", ")} (cc: ${cc.join(", ")})` : to.join(", ")

    return NextResponse.json({
      success: true,
      message: smtpDispatched
        ? `Daily HR Email Template report successfully dispatched via SMTP to ${audience}`
        : `Email prepared for ${audience}, but SMTP did not dispatch it.`,
      smtpConfigured,
      smtpDispatched,
      smtpError,
      recipient: to.join(", "),
      to,
      cc,
      subject,
      employeeCount: employees.length,
    })
  } catch (error: any) {
    console.error("[sales-call-audit-email] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to dispatch email report" },
      { status: 500 }
    )
  }
}
