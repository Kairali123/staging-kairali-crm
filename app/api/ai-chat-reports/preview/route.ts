import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import {
  isValidYmd,
  loadAiChatReportData,
  renderAiChatWeeklyEmailHtml,
  shiftDays,
  todayIST,
} from '@/lib/ai-chat-reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  'Content-Type': 'text/html; charset=utf-8',
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401, headers: NO_STORE_HEADERS })
  }

  try {
    const sp = req.nextUrl.searchParams
    const fromParam = sp.get('from')
    const toParam = sp.get('to')
    const dateParam = sp.get('date')
    const company = sp.get('company') || 'ALL'
    const details = sp.get('details') || 'Full report'

    let report
    if (isValidYmd(fromParam) && isValidYmd(toParam)) {
      report = await loadAiChatReportData({
        from: fromParam,
        to: toParam,
        company,
        recordLimitPerBot: 20,
      })
    } else {
      const endDate = isValidYmd(dateParam) ? dateParam : shiftDays(todayIST(), -1)
      report = await loadAiChatReportData({
        endDate,
        days: 7,
        company,
        recordLimitPerBot: 20,
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const html = renderAiChatWeeklyEmailHtml(report, {
      appUrl,
      includeDetails: details !== 'Summary only',
    })

    return new NextResponse(html, {
      status: 200,
      headers: NO_STORE_HEADERS,
    })
  } catch (err: any) {
    console.error('[api/ai-chat-reports/preview] Preview generation failed:', err)
    return new NextResponse(
      `<p style="font:14px Arial;padding:24px;color:#b91c1c">Unable to render AI Chat Weekly Report preview: ${String(err?.message || 'SQL error').replace(/[<>&]/g, '')}</p>`,
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
