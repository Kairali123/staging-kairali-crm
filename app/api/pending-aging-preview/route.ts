import { NextRequest, NextResponse } from "next/server"
import { buildPendingAgingAlertEmail, loadPendingAgingEmailData } from "@/lib/email-triggers/templates/pending-aging-alert"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const cookieStr = req.headers.get("cookie") || ""
    const data = await loadPendingAgingEmailData(appUrl, cookieStr)
    const html = buildPendingAgingAlertEmail(data)
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
