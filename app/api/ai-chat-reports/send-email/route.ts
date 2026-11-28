import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getSessionUser, hasAnyPermission } from '@/lib/authz'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import {
  isValidYmd,
  loadAiChatReportData,
  renderAiChatWeeklyEmailHtml,
} from '@/lib/ai-chat-reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HEADERS = { 'Cache-Control': 'private, no-store' }

function parseEmailList(raw: unknown): string[] {
  if (typeof raw !== 'string') return []
  if (/[\r\n]/.test(raw)) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
}

function escHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: HEADERS })
  }
  const role = String(user.role || '')
    .trim()
    .toLowerCase()
  const allowed =
    role === 'super_admin' ||
    role === 'super admin' ||
    role === 'admin' ||
    hasAnyPermission(user, ['marketing.view', 'marketing_daily_report.view', 'riya_sharma.view', 'sales_report.view'])
  if (!allowed) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403, headers: HEADERS })
  }
  if (req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403, headers: HEADERS })
  }

  const smtp = marketingMailConfig()
  if (!smtp.configured) {
    return NextResponse.json(
      { error: 'SMTP email credentials are not configured on this server' },
      { status: 503, headers: HEADERS }
    )
  }

  try {
    const body = await req.json()
    const toList = parseEmailList(body?.to)
    const ccList = parseEmailList(body?.cc)
    if (toList.length === 0) {
      return NextResponse.json(
        { error: 'Enter at least one valid To email address' },
        { status: 400, headers: HEADERS }
      )
    }
    if (toList.length + ccList.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 recipients allowed' },
        { status: 400, headers: HEADERS }
      )
    }

    const from = isValidYmd(body?.from) ? body.from : undefined
    const to = isValidYmd(body?.toDate) ? body.toDate : undefined
    const preset = typeof body?.preset === 'string' ? body.preset : 'weekly'
    const company = typeof body?.company === 'string' ? body.company : 'ALL'

    const report = await loadAiChatReportData({
      preset,
      from,
      to,
      company,
      recordLimitPerBot: 20,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    let html = renderAiChatWeeklyEmailHtml(report, {
      appUrl,
      includeDetails: true,
    })

    const intro = typeof body?.intro === 'string' ? body.intro.trim().slice(0, 2000) : ''
    const closing = typeof body?.closing === 'string' ? body.closing.trim().slice(0, 2000) : ''
    const wrapNote = (txt: string) =>
      txt
        ? `<div style="padding:16px 24px 0;white-space:pre-wrap;font:14px/1.7 Arial,sans-serif;color:#1e293b;">${escHtml(txt)}</div>`
        : ''

    html = html
      .replace('<!--email-intro-->', () => wrapNote(intro))
      .replace('<!--email-closing-->', () =>
        closing
          ? `<div style="padding:0 24px 18px;white-space:pre-wrap;font:14px/1.7 Arial,sans-serif;color:#1e293b;">${escHtml(closing)}</div>`
          : ''
      )

    const rawSubject =
      typeof body?.subject === 'string' && !/[\r\n]/.test(body.subject) && body.subject.trim()
        ? body.subject.trim().slice(0, 240)
        : `AI Chat Weekly Consolidated Report | ${report.periodLabel} | ${report.companyScope === 'ALL' ? 'All Companies' : report.companyScope}`

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user!, pass: smtp.pass! },
      connectionTimeout: 15000,
      socketTimeout: 30000,
      disableFileAccess: true,
      disableUrlAccess: true,
    })

    try {
      const info = await transport.sendMail({
        from: smtp.user,
        to: toList.join(', '),
        cc: ccList.length > 0 ? ccList.join(', ') : undefined,
        subject: rawSubject,
        html,
        text: `${rawSubject}\nPlease open this email in an HTML-capable mail client.`,
        disableFileAccess: true,
        disableUrlAccess: true,
      })

      return NextResponse.json(
        {
          success: true,
          accepted: info.accepted?.length || 0,
          rejected: info.rejected?.length || 0,
        },
        { headers: HEADERS }
      )
    } finally {
      transport.close()
    }
  } catch (err: any) {
    console.error('[api/ai-chat-reports/send-email] Error sending email:', err)
    return NextResponse.json(
      { error: err?.message || 'Unable to send AI Chat Report email' },
      { status: 500, headers: HEADERS }
    )
  }
}
