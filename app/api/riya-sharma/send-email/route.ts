import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import { loadRiyaSharmaReportData, renderRiyaSharmaEmailHtml } from '@/lib/riya-sharma-report'

export const dynamic = 'force-dynamic'

const DEFAULT_RECIPIENTS = 'gm.hv@kairali.com, director@kairali.com, dme@kairali.com, sysadmin@kairali.com'

export async function POST(req: NextRequest) {
  try {
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const requestedDate = body.date || ''
    const to = (body.to || DEFAULT_RECIPIENTS).trim()
    const customSubject = body.subject || ''
    const intro = body.intro || undefined
    const closing = body.closing || undefined

    const reportData = await loadRiyaSharmaReportData(requestedDate)
    const html = renderRiyaSharmaEmailHtml(reportData, intro, closing)

    const subject = customSubject || `KTAHV - Riya Sharma AI | Daily Data Analysis Report | ${reportData.periodLabel}`

    const c = marketingMailConfig()
    if (!c.configured) {
      return NextResponse.json(
        {
          success: false,
          error: 'SMTP credentials not configured on server (SMTP_HOST / SMTP_USER missing)',
        },
        { status: 500 }
      )
    }

    const transport = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: { user: c.user!, pass: c.pass! },
      connectionTimeout: 15000,
      socketTimeout: 30000,
      disableFileAccess: true,
      disableUrlAccess: true,
    })

    try {
      const result = await transport.sendMail({
        from: `sysadmin@kairali.com`,
        to,
        replyTo: 'sysadmin@kairali.com',
        subject,
        html,
        text: `${subject}\n\nPlease find attached the Report Analysis Data Sheet for Riya Sharma AI under KTAHV. Please view the formatted HTML email.`,
        disableFileAccess: true,
        disableUrlAccess: true,
      })

      return NextResponse.json({
        success: true,
        message: `Report successfully dispatched to ${to}`,
        messageId: result.messageId,
        accepted: result.accepted,
      })
    } finally {
      transport.close()
    }
  } catch (error: any) {
    console.error('[api/riya-sharma/send-email] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch email' },
      { status: 500 }
    )
  }
}
