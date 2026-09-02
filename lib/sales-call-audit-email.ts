import nodemailer from "nodemailer"

import type { AgentAuditMetric, SalesCallAuditEmailData } from "@/lib/sales-call-audit-report"

// Rendering and dispatch for the agent-wise call audit report.
//
// Lifted out of `app/api/sales-call-audit/send-email/route.ts` verbatim — the
// markup below is unchanged, down to its indentation — so the 09:00 IST cron and
// the super_admin's manual button send the same message rather than two templates
// that drift apart.

// Where the report goes when `AUDIT_REPORT_TO` is unset. Kept so an unconfigured
// deployment behaves exactly as it did before recipients became configurable.
export const DEFAULT_AUDIT_REPORT_RECIPIENT = "sysadmin@kairali.com"

export interface AuditReportRecipients {
  to: string[]
  cc: string[]
}

// One address per entry, separated by commas or semicolons.
//
// Anything that is not shaped like an address is dropped with a warning rather
// than passed to nodemailer, because one typo in an env var would otherwise fail
// the entire send — including the valid recipients alongside it.
function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return []
  const out: string[] = []
  for (const entry of raw.split(/[,;]/)) {
    const address = entry.trim()
    if (!address) continue
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      console.warn(`[sales-call-audit-email] Ignoring malformed recipient in env: ${JSON.stringify(address)}`)
      continue
    }
    if (!out.some(existing => existing.toLowerCase() === address.toLowerCase())) out.push(address)
  }
  return out
}

// The report's To and Cc lists, from the environment.
//
//   AUDIT_REPORT_TO=sysadmin@kairali.com
//   AUDIT_REPORT_CC=owner@kairali.com,ea@kairali.com
//
// Env rather than a constant in this file on purpose: `AI-HUMAN.md` requires that
// recipients stay outside Git, and both senders — the 09:00 IST cron and the
// super_admin's manual button — read this one function, so the two lists cannot
// drift apart. `.env*` is gitignored, so nothing here reaches the repository.
//
// A Cc address that is already in To is dropped, so nobody is mailed twice.
export function getAuditReportRecipients(): AuditReportRecipients {
  const to = parseRecipients(process.env.AUDIT_REPORT_TO)
  const cc = parseRecipients(process.env.AUDIT_REPORT_CC)
  const resolvedTo = to.length > 0 ? to : [DEFAULT_AUDIT_REPORT_RECIPIENT]
  const lowerTo = new Set(resolvedTo.map(address => address.toLowerCase()))
  return { to: resolvedTo, cc: cc.filter(address => !lowerTo.has(address.toLowerCase())) }
}

export interface AuditReportEmailInput {
  date?: string
  displayDate?: string
  metrics?: Partial<SalesCallAuditEmailData["metrics"]>
  employees?: AgentAuditMetric[]
}

export interface AuditReportDispatchResult {
  smtpConfigured: boolean
  smtpDispatched: boolean
  smtpError: string | null
  to: string[]
  cc: string[]
}

export function renderAuditReportEmail(
  input: AuditReportEmailInput
): { subject: string; html: string } {
  const { date, displayDate = "Today", metrics, employees = [] } = input

  const subject = `[Daily HR Quality Audit Report] - Agent-wise Call Audit (${displayDate || date})`

    // Generate clean, inline-styled HTML table report for email clients
    const employeeRowsHtml = employees
      .map(
        (emp: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 14px; font-weight: bold; color: #1e293b; font-size: 13px;">
            ${emp.name}
            <div style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: normal;">${emp.id}</div>
          </td>
          <td style="padding: 12px 14px; text-align: center; font-weight: bold; color: #334155; font-size: 13px;">
            ${emp.calls}
          </td>
          <td style="padding: 12px 14px; text-align: center; font-size: 12px;">
            <span style="color: #059669; font-weight: bold;">${emp.good}</span>
            <span style="color: #94a3b8; margin: 0 4px;">/</span>
            <span style="color: #e11d48; font-weight: bold;">${emp.bad}</span>
          </td>
          <td style="padding: 12px 14px; text-align: center; font-weight: bold; color: #4338ca; font-size: 13px;">
            ${Number(emp.score).toFixed(2)}
          </td>
          <td style="padding: 12px 14px; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; text-transform: uppercase; ${
              emp.result === "PASS"
                ? "background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
                : "background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;"
            }">
              ${emp.result}
            </span>
          </td>
        </tr>
      `
      )
      .join("")

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: Arial, sans-serif;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 24px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; font-weight: bold;">
              Head Office • Daily Quality Audit
            </div>
            <h1 style="margin: 6px 0 2px; font-size: 22px; font-weight: bold; color: #ffffff;">
              Agent-wise Call Audit Report
            </h1>
            <div style="font-size: 12px; opacity: 0.9;">
              Audit date: <strong>${displayDate}</strong>
            </div>
          </div>

          <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 13px; color: #334155; line-height: 1.5;">
              Hi HR Team,
            </p>
            <p style="font-size: 13px; color: #334155; line-height: 1.5;">
              Please find below the daily call audit outcome. Employees marked <strong style="color: #be123c;">FAIL</strong> require a half-day attendance adjustment for the audit date (<strong>${displayDate}</strong>), subject to final HR verification.
            </p>

            <!-- Metrics Grid -->
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="width: 25%; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px 0 0 8px; text-align: center;">
                  <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Audited Leads</div>
                  <div style="font-size: 22px; font-weight: bold; color: #0f172a; margin-top: 4px;">${metrics?.auditedLeads || 0}</div>
                </td>
                <td style="width: 25%; padding: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0; text-align: center;">
                  <div style="font-size: 10px; text-transform: uppercase; color: #15803d; font-weight: bold;">Verified Good</div>
                  <div style="font-size: 22px; font-weight: bold; color: #166534; margin-top: 4px;">${metrics?.verified || 0}</div>
                </td>
                <td style="width: 25%; padding: 12px; background-color: #fff1f2; border: 1px solid #fecdd3; text-align: center;">
                  <div style="font-size: 10px; text-transform: uppercase; color: #be123c; font-weight: bold;">Mismatch Bad</div>
                  <div style="font-size: 22px; font-weight: bold; color: #9f1239; margin-top: 4px;">${metrics?.mismatch || 0}</div>
                </td>
                <td style="width: 25%; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0 8px 8px 0; text-align: center;">
                  <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">Wrong Outcomes</div>
                  <div style="font-size: 22px; font-weight: bold; color: #be123c; margin-top: 4px;">${metrics?.wrongOutcomesPercentage || 0}%</div>
                </td>
              </tr>
            </table>

            <!-- Secondary Metrics Bar -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
              <tr>
                <td style="padding: 10px 14px; background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 6px; width: 50%;">
                  <span style="color: #6d28d9; font-weight: bold;">Team Average:</span> <strong>${metrics?.teamAverageScore || 0} / 5</strong>
                </td>
                <td style="padding: 10px 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; width: 50%; text-align: right;">
                  <span style="color: #047857; font-weight: bold;">Team Performance:</span> <strong>${metrics?.teamPerformancePercentage || 0}%</strong>
                </td>
              </tr>
            </table>

            <!-- HR Alert Callout Box -->
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 12px; color: #92400e; line-height: 1.5;">
              <strong>HR Action:</strong> ${metrics?.failedEmployeesCount || 0} employee(s) failed. Verify each employee and mark half-day for <strong>${displayDate}</strong> where applicable. Confirm the Pagarbook update from the audit dashboard.
            </div>

            <!-- Agent Wise Audit Table -->
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 10px 14px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Employee</th>
                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Calls</th>
                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Good / Bad</th>
                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Score</th>
                  <th style="padding: 10px 14px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Result</th>
                </tr>
              </thead>
              <tbody>
                ${employeeRowsHtml}
              </tbody>
            </table>

            <p style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
              For any questions or corrections, please contact IT before updating attendance.
            </p>
            <p style="font-size: 12px; color: #334155; margin-top: 0; font-weight: bold;">
              Regards,<br>
              IT Audit Team • Kairali CRM
            </p>
          </div>
        </div>
      </body>
      </html>
    `

  return { subject, html: emailHtml }
}

// Sends the report if SMTP is configured. Never throws: the caller decides what a
// failure means, and both callers report it rather than swallowing it.
//
// Recipients are not a parameter. They come from `getAuditReportRecipients()` so
// that neither caller — nor a request body — can redirect the team's scorecard to
// an arbitrary address; changing who receives it is an env change, not a code or
// API change.
export async function dispatchAuditReportEmail(args: {
  subject: string
  html: string
}): Promise<AuditReportDispatchResult> {
  const { to, cc } = getAuditReportRecipients()
  const audience = cc.length > 0 ? `${to.join(", ")} (cc: ${cc.join(", ")})` : to.join(", ")

  // `.env` names this SMTP_PASSWORD; some deployments set SMTP_PASS. Accept both,
  // otherwise the credential silently reads as absent and no mail is dispatched.
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass)

  if (!smtpConfigured) {
    console.log(`[sales-call-audit-email] [SMTP not configured] Ready for ${audience}: ${args.subject}`)
    return { smtpConfigured: false, smtpDispatched: false, smtpError: null, to, cc }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Kairali Sales Call Audit" <${process.env.SMTP_USER}>`,
      to: to.join(", "),
      // Omitted entirely when empty — nodemailer renders an empty `cc` as a
      // visible, malformed header on some servers rather than skipping it.
      ...(cc.length > 0 ? { cc: cc.join(", ") } : {}),
      subject: args.subject,
      html: args.html,
    })

    console.log(`[sales-call-audit-email] Dispatched report via SMTP to ${audience}`)
    return { smtpConfigured: true, smtpDispatched: true, smtpError: null, to, cc }
  } catch (mailErr: any) {
    const smtpError = mailErr?.message || "SMTP error"
    console.warn("[sales-call-audit-email] SMTP dispatch warning:", smtpError)
    return { smtpConfigured: true, smtpDispatched: false, smtpError, to, cc }
  }
}
