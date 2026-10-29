import { NextResponse } from 'next/server'
import { loadRiyaSharmaReportData, renderRiyaSharmaEmailHtml } from '@/lib/riya-sharma-report'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date') || undefined
    const introParam = url.searchParams.get('intro') || undefined
    const closingParam = url.searchParams.get('closing') || undefined

    const data = await loadRiyaSharmaReportData(dateParam)
    const html = renderRiyaSharmaEmailHtml(data, introParam, closingParam)

    return NextResponse.json({
      success: true,
      data,
      html,
    })
  } catch (err: any) {
    console.error('[api/riya-sharma/email-data] Error generating email data:', err)
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Failed to generate Riya Sharma AI email report data',
      },
      { status: 500 }
    )
  }
}
