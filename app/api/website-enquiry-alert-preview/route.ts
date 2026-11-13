import { NextRequest, NextResponse } from 'next/server'
import { buildWebsiteEnquiryAlertEmail, getSampleEnquiryData } from '@/lib/email-triggers/templates/website-enquiry-alert'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const company = searchParams.get('company') || 'KTAHV'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

    const sample = getSampleEnquiryData(company, appUrl)

    // Allow overriding fields via query params if provided
    if (searchParams.get('leadName')) sample.leadName = searchParams.get('leadName')!
    if (searchParams.get('leadPhone')) sample.leadPhone = searchParams.get('leadPhone')!
    if (searchParams.get('leadEmail')) sample.leadEmail = searchParams.get('leadEmail')!
    if (searchParams.get('program')) sample.program = searchParams.get('program')!
    if (searchParams.get('preferredMonth')) sample.preferredMonth = searchParams.get('preferredMonth')!
    if (searchParams.get('campaignName')) sample.campaignName = searchParams.get('campaignName')!
    if (searchParams.get('sourceUrl')) sample.sourceUrl = searchParams.get('sourceUrl')!
    if (searchParams.get('dataSource')) sample.dataSource = searchParams.get('dataSource')!

    const html = buildWebsiteEnquiryAlertEmail(sample)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err: any) {
    return new NextResponse(`<p style="font:14px Arial;padding:25px;color:red">Failed to render preview: ${err?.message}</p>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
