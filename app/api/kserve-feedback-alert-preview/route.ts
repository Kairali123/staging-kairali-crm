import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { loadLatestKserveFeedbackForPreview } from '@/lib/email-triggers/load-kserve-feedback'
import { buildKserveFeedbackAlertEmail } from '@/lib/email-triggers/templates/kserve-daily-call-audit-feedback-alert'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(request: NextRequest) {
  let session: any = null
  try {
    const userCookie = request.cookies.get('kairali_user')?.value
    session = userCookie ? verifySessionCookieValue(userCookie) : null
  } catch {}

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const company = request.nextUrl.searchParams.get('company') || 'All companies'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const item = await loadLatestKserveFeedbackForPreview(company)
    const html = buildKserveFeedbackAlertEmail(item, appUrl)

    return new NextResponse(html, {
      status: 200,
      headers: {
        ...noStoreHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('[kserve-feedback-alert-preview] Error:', error)
    return new NextResponse(
      `<p style="font:14px Arial;padding:25px;color:#b91c1c">Error generating preview: ${error?.message || 'Unknown error'}</p>`,
      { status: 500, headers: { ...noStoreHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
