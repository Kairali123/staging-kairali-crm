import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hasSalesCallAuditPageAccess } from "@/lib/authz"
import { getSentReportDates, recordSentReport, removeSentReport } from "@/lib/sales-call-audit-tracker"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
}

function normalizeToYmd(val: any): string | null {
  if (!val) return null
  if (typeof val === "string") {
    const s = val.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, "0")
      const month = ddmmyyyy[2].padStart(2, "0")
      const year = ddmmyyyy[3]
      return `${year}-${month}-${day}`
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (!hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required" },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const body = await req.json().catch(() => ({}))
    const rawDate = body.date || ""
    const targetYmd = normalizeToYmd(rawDate) || rawDate
    const status = body.status === "Pending" ? "Pending" : "Sent"

    if (!targetYmd) {
      return NextResponse.json(
        { success: false, error: "Missing required date parameter" },
        { status: 400, headers: noStoreHeaders }
      )
    }

    if (status === "Sent") {
      recordSentReport({
        date: targetYmd,
        sentAt: new Date().toISOString(),
        recipient: "manual-override (ho.hr@kairali.com)",
        messageId: `manual-override-${Date.now()}`,
      })
    } else {
      removeSentReport(targetYmd)
    }

    return NextResponse.json(
      {
        success: true,
        date: targetYmd,
        status,
        sentDates: getSentReportDates(),
      },
      { headers: noStoreHeaders }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update mail status" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
