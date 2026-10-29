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

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return new NextResponse(
      `<!DOCTYPE html><html><body><h3>Preview Error</h3><p>${err?.message || 'Error generating preview'}</p></body></html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )
  }
}
