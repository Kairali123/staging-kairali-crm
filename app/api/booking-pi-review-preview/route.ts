import { NextRequest, NextResponse } from "next/server"
import { loadBookingPIReviewAlertData } from "@/lib/email-triggers/load-booking-pi-review"
import { buildPIReviewAlertEmail } from "@/lib/email-triggers/templates/booking-pi-review-alert"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const date = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10)
    const data = await loadBookingPIReviewAlertData(date, appUrl)
    const html = buildPIReviewAlertEmail(data)
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch (err: any) {
    return new NextResponse(`<p style="font:14px Arial;padding:25px;color:red">Error: ${err?.message}</p>`, {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
}
