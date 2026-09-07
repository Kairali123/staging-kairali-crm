import { NextRequest, NextResponse } from "next/server"

import {
  dispatchAuditReportEmail,
  renderAuditReportEmail,
} from "@/lib/sales-call-audit-email"
import { buildSalesCallAuditReport } from "@/lib/sales-call-audit-report"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Daily agent-wise call audit report, mailed unattended at 09:00 Asia/Kolkata.
//
// Scheduled from `vercel.json` as `30 3 * * *` — Vercel cron schedules are UTC,
// and 03:30 UTC is 09:00 IST. India does not observe DST, so the offset is a
// fixed +05:30 year-round and the schedule needs no seasonal correction.
//
// The report always covers YESTERDAY in IST, never "the latest date with data":
// on 1 September this mails the 31 August audit. That is the whole point of a
// morning send — the previous working day is complete, today's is not.

// Today's date in IST as `YYYY-MM-DD`. `en-CA` formats in exactly that order, and
// asking Intl for the IST civil date avoids the off-by-one that
// `new Date().toISOString()` produces between 18:30 and 24:00 UTC, when India is
// already on the next calendar day.
function istDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at)
}

function istYesterday(at: Date): string {
  const d = new Date(`${istDate(at)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Vercel attaches `Authorization: Bearer $CRON_SECRET` to every cron invocation.
// Fails closed: with no secret configured the endpoint is unreachable rather than
// open, because reaching it mails the whole team's scorecard out of the system.
function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: valid CRON_SECRET bearer token required." },
      { status: 401 }
    )
  }

  try {
    // `?date=YYYY-MM-DD` re-runs a specific day by hand (still behind the secret).
    // Unset — the scheduled case — means yesterday IST.
    const override = new URL(req.url).searchParams.get("date")
    const auditDate = override && /^\d{4}-\d{2}-\d{2}$/.test(override)
      ? override
      : istYesterday(new Date())

    const { source, data } = await buildSalesCallAuditReport(auditDate)

    // No audit rows for that date — a holiday, or the upstream bot has not written
    // yet. Send nothing. A zero-row report still reads as "0 employees failed" and
    // instructs HR to reconcile attendance against it, so an empty send is worse
    // than a skipped one. The response records the skip for the cron log.
    if (data.employees.length === 0) {
      console.warn(`[cron:sales-call-audit-daily-email] No audit rows for ${auditDate}; skipping send.`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "no-audit-rows",
        auditDate,
        source,
        smtpDispatched: false,
      })
    }

    const { subject, html } = renderAuditReportEmail({
      date: data.auditDate,
      displayDate: data.displayDate,
      metrics: data.metrics,
      employees: data.employees,
    })

    // Recipients come from AUDIT_REPORT_TO / AUDIT_REPORT_CC, the same lists the
    // manual send uses.
    const { smtpConfigured, smtpDispatched, smtpError, to, cc } = await dispatchAuditReportEmail({
      subject,
      html,
    })

    const audience = cc.length > 0 ? `${to.join(", ")} (cc: ${cc.join(", ")})` : to.join(", ")

    // A cron that answers 200 on a failed send is a cron nobody notices breaking,
    // so an undelivered report is a 500 and shows up in Vercel's cron log as failed.
    if (!smtpDispatched) {
      console.error(
        `[cron:sales-call-audit-daily-email] Report for ${auditDate} was NOT sent`,
        smtpConfigured ? `(SMTP error: ${smtpError})` : "(SMTP not configured)"
      )
      return NextResponse.json(
        {
          success: false,
          error: smtpConfigured
            ? `SMTP dispatch failed: ${smtpError}`
            : "SMTP is not configured on this deployment.",
          auditDate,
          smtpConfigured,
          smtpDispatched: false,
        },
        { status: 500 }
      )
    }

    console.log(
      `[cron:sales-call-audit-daily-email] Sent ${auditDate} report to ${audience} ` +
      `(${data.employees.length} employees, ${data.metrics.failedEmployeesCount} failed)`
    )

    return NextResponse.json({
      success: true,
      skipped: false,
      auditDate,
      displayDate: data.displayDate,
      source,
      recipient: to.join(", "),
      to,
      cc,
      subject,
      employeeCount: data.employees.length,
      failedEmployeesCount: data.metrics.failedEmployeesCount,
      smtpConfigured,
      smtpDispatched,
    })
  } catch (error: any) {
    console.error("[cron:sales-call-audit-daily-email] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Daily audit email cron failed" },
      { status: 500 }
    )
  }
}
