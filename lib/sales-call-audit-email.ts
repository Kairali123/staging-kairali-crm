import nodemailer from "nodemailer"
export {
  renderAuditReportEmail,
  type RenderEmailParams,
  type RenderEmailResult,
} from "@/lib/sales-call-audit-email-render"

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
