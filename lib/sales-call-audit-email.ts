import nodemailer from "nodemailer"
import { AgentAuditMetric } from "@/app/api/sales-call-audit/email-data/route"
import { SalesCallAuditReportMetrics } from "@/lib/sales-call-audit-report"

export interface RenderEmailParams {
  date: string
  displayDate: string
  metrics: SalesCallAuditReportMetrics
  employees: AgentAuditMetric[]
}

export interface RenderEmailResult {
  subject: string
  html: string
}

export interface DispatchAuditReportParams {
  subject: string
  html: string
  to?: string[]
  cc?: string[]
}

export interface DispatchAuditReportResult {
  smtpConfigured: boolean
  smtpDispatched: boolean
  smtpError?: string
  to: string[]
  cc: string[]
  messageId?: string
}

export function renderAuditReportEmail({
  date,
  displayDate,
  metrics,
  employees,
}: RenderEmailParams): RenderEmailResult {
  const effectiveDate = displayDate || date
  const subject = `[Daily HR Quality Audit Report] - Agent-wise Call Audit (${effectiveDate})`

  const employeeRowsHtml = employees
    .map(
      (emp) => `
      <tr style="border-top: 1px solid #f1f5f9;">
        <td style="padding: 12px 14px;">
          <div style="font-weight: 600; color: #1e293b; font-size: 13px;">${emp.name}</div>
          ${emp.id ? `<div style="font-size: 10px; color: #94a3b8; font-family: monospace;">${emp.id}</div>` : ""}
        </td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 500; color: #334155; font-size: 13px;">
          ${emp.calls}
        </td>
        <td style="padding: 12px 14px; text-align: center; font-size: 12px;">
          <span style="color: #047857; font-weight: 600;">${emp.good}</span>
          <span style="color: #94a3b8; margin: 0 4px;">/</span>
          <span style="color: #be123c; font-weight: 600;">${emp.bad}</span>
        </td>
        <td style="padding: 12px 14px; text-align: center; font-size: 12px; color: #475569;">
          ${emp.neutral}
          <span style="color: #94a3b8; margin: 0 4px;">/</span>
          ${emp.notRated}
        </td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 600; color: #1e293b; font-size: 12px;">
          ${emp.overallPerformance || "—"}
        </td>
        <td style="padding: 12px 14px; text-align: center;">
          <span style="display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; ${
            emp.result === "FAIL"
              ? "background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;"
              : "background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
          }">
            ${emp.result}
          </span>
        </td>
      </tr>
    `
    )
    .join("")

  const wrongOutcomes = typeof metrics.wrongOutcomesPercentage === "number"
    ? metrics.wrongOutcomesPercentage.toFixed(2)
    : String(metrics.wrongOutcomesPercentage)

  const goodCallRate = typeof metrics.goodCallRate === "number"
    ? metrics.goodCallRate.toFixed(1)
    : String(metrics.goodCallRate)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
      <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
        
        <!-- Header Banner matching UI -->
        <div style="background: linear-gradient(135deg, #193a6a 0%, #12284c 100%); padding: 24px 28px; color: #ffffff;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #bfdbfe; font-weight: 700;">
            Head Office • Daily Quality Audit
          </div>
          <h1 style="margin: 6px 0 4px; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">
            Agent-wise Call Audit Report
          </h1>
          <div style="font-size: 12px; color: #dbeafe; font-weight: 500;">
            Audit date: <span style="font-weight: 700; text-decoration: underline;">${effectiveDate}</span>
          </div>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px 28px;">
          
          <!-- Intro Greeting -->
          <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #334155;">
            Hi HR Team,<br>
            Please find below the daily call audit outcome. Employees marked <span style="color: #dc2626; font-weight: 700;">FAIL</span> require a half-day attendance adjustment for the audit date (<strong>${effectiveDate}</strong>), subject to final HR verification.
          </p>

          <!-- 4 KPI Cards Grid -->
          <table style="width: 100%; border-collapse: separate; border-spacing: 10px; margin: 0 -10px 16px -10px;">
            <tr>
              <!-- Audited Leads -->
              <td style="width: 25%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">
                  Audited Leads
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                  ${metrics.auditedLeads}
                </div>
              </td>

              <!-- Verified Good -->
              <td style="width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #15803d;">
                  Good Calls
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #166534; margin-top: 4px;">
                  ${metrics.verified}
                </div>
              </td>

              <!-- Mismatch Bad -->
              <td style="width: 25%; background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #be123c;">
                  Bad Calls
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #9f1239; margin-top: 4px;">
                  ${metrics.mismatch}
                </div>
              </td>

              <!-- Wrong Outcomes -->
              <td style="width: 25%; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 10px; text-align: center;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #b45309;">
                  Wrong Outcomes
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #78350f; margin-top: 4px;">
                  ${wrongOutcomes}%
                </div>
              </td>
            </tr>
          </table>

          <!-- Secondary KPI Pill -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; margin-bottom: 20px; font-size: 12px; font-weight: 600;">
            <span style="color: #64748b;">Good-call rate:</span>
            <span style="color: #047857; font-weight: 700; margin-left: 4px;">${goodCallRate}%</span>
            <span style="color: #cbd5e1; margin: 0 10px;">|</span>
            <span style="color: #64748b;">Neutral:</span>
            <span style="color: #0f172a; font-weight: 700; margin-left: 4px;">${metrics.totalNeutral}</span>
            <span style="color: #cbd5e1; margin: 0 10px;">|</span>
            <span style="color: #64748b;">Not Rated:</span>
            <span style="color: #0f172a; font-weight: 700; margin-left: 4px;">${metrics.totalNotRated}</span>
          </div>

          <!-- HR Action Banner -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; color: #451a03; font-size: 12px; line-height: 1.5;">
            <strong>HR action:</strong> ${metrics.failedEmployeesCount} employee(s) failed. Verify each employee and mark half-day for <strong>${effectiveDate}</strong> where applicable. Confirm the Pagarbook update from the audit dashboard.
          </div>

          <!-- Employee Table -->
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700;">Employee</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; text-align: center;">Calls</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; text-align: center;">Good / Bad</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; text-align: center;">Neutral / Not Rated</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; text-align: center;">Overall</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; font-weight: 700; text-align: center;">Result</th>
              </tr>
            </thead>
            <tbody>
              ${employeeRowsHtml}
            </tbody>
          </table>

          <!-- Sign-off Note -->
          <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 18px; font-size: 12px; color: #64748b; line-height: 1.6;">
            For any questions or corrections, please contact IT before updating attendance.<br>
            <div style="margin-top: 10px; color: #1e293b;">
              Regards,<br>
              <strong>IT Audit Team</strong>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          This is an automated report generated by Kairali Group CRM • Head Office Quality Assurance System
        </div>
      </div>
    </body>
    </html>
  `

  return { subject, html }
}

export async function dispatchAuditReportEmail({
  subject,
  html,
  to: explicitTo,
  cc: explicitCc,
}: DispatchAuditReportParams): Promise<DispatchAuditReportResult> {
  const defaultTo = process.env.AUDIT_REPORT_TO || process.env.HR_AUDIT_EMAIL || "ho.hr@kairali.com"
  const defaultCc = process.env.AUDIT_REPORT_CC || ""

  const toList = explicitTo && explicitTo.length > 0
    ? explicitTo
    : defaultTo.split(",").map((e) => e.trim()).filter(Boolean)

  const ccList = explicitCc && explicitCc.length > 0
    ? explicitCc
    : defaultCc.split(",").map((e) => e.trim()).filter(Boolean)

  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com"
  const smtpPort = parseInt(process.env.SMTP_PORT || "587")
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS

  if (!smtpUser || !smtpPass) {
    console.warn("[sales-call-audit-email] SMTP credentials missing, failing closed")
    return {
      smtpConfigured: false,
      smtpDispatched: false,
      smtpError: "SMTP credentials not configured on server",
      to: toList,
      cc: ccList,
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    const info = await transporter.sendMail({
      from: `"Kairali CRM QA Audit" <${smtpUser}>`,
      to: toList.join(", "),
      cc: ccList.length > 0 ? ccList.join(", ") : undefined,
      subject,
      html,
    })

    console.log("[sales-call-audit-email] Dispatched report via SMTP:", info.messageId)

    return {
      smtpConfigured: true,
      smtpDispatched: true,
      to: toList,
      cc: ccList,
      messageId: info.messageId,
    }
  } catch (error: any) {
    console.error("[sales-call-audit-email] SMTP dispatch error:", error?.message)
    return {
      smtpConfigured: true,
      smtpDispatched: false,
      smtpError: error?.message || "Unknown SMTP error",
      to: toList,
      cc: ccList,
    }
  }
}
