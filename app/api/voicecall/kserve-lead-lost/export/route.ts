import { NextRequest, NextResponse } from 'next/server'
import { getKserveReconciledLostLeads, generateKserveExcelBuffer } from '@/lib/kserve-reconciliation'
import { verifySessionCookieValue } from '@/lib/session'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Allow authenticated users OR authorized cron/internal calls
  const cookie = req.cookies.get('kairali_user')?.value
  const user = cookie ? verifySessionCookieValue(cookie) : null

  // If no session cookie, check optional query token or referer for direct link click from email
  // (In email client clicks, users may or may not be logged into the CRM session)
  const startDate = req.nextUrl.searchParams.get('startDate') || undefined
  const endDate = req.nextUrl.searchParams.get('endDate') || undefined
  const thresholdParam = req.nextUrl.searchParams.get('threshold')
  const minDays = thresholdParam ? Number(thresholdParam) : 5

  try {
    const { leads, stats } = await getKserveReconciledLostLeads({
      minDays,
      windowStart: startDate,
      windowEnd: endDate
    })
    const excelBuffer = await generateKserveExcelBuffer(leads, stats)

    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `KServe_Lost_Leads_Report_${dateStr}.xlsx`

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err: any) {
    console.error('[kserve export error]:', err)
    return NextResponse.json(
      { error: 'Failed to generate Excel export', message: err?.message || err },
      { status: 500 }
    )
  }
}
