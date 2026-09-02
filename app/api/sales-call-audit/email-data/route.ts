import { NextRequest, NextResponse } from "next/server"
import { getSalesCallAuditScope, getSessionUser, hasSalesCallAuditPageAccess } from "@/lib/authz"
import { buildSalesCallAuditReport } from "@/lib/sales-call-audit-report"

export const dynamic = "force-dynamic"

const noStoreHeaders = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
}

// The report shape now lives in `lib/sales-call-audit-report.ts` so the 09:00 IST
// cron dispatch can build the same figures without going through this route.
// Re-exported here because `app/sales-call-audit/email-template/page.tsx` and any
// other client importing them from this module keeps working unchanged.
export type {
  AgentAuditMetric,
  SalesCallAuditEmailData,
} from "@/lib/sales-call-audit-report"

export async function GET(req: NextRequest) {
  try {
    const user = getSessionUser(req)
    const isDev = process.env.NODE_ENV === "development"

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in to access sales call audit metrics." },
        { status: 401, headers: noStoreHeaders }
      )
    }

    if (user && !hasSalesCallAuditPageAccess(user)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.view permission required." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    // This endpoint aggregates the whole team into one report — team averages,
    // a failed-employee count, and a per-employee table. There is no self-scoped
    // version of that artifact, so it requires `viewAll` outright rather than
    // handing a `viewSelf` holder their colleagues' figures.
    if (user && getSalesCallAuditScope(user) !== "all") {
      return NextResponse.json(
        { success: false, error: "Forbidden: sales_call_audit.viewAll permission required for team audit metrics." },
        { status: 403, headers: noStoreHeaders }
      )
    }

    const url = new URL(req.url)
    const { source, data } = await buildSalesCallAuditReport(url.searchParams.get("date"))

    return NextResponse.json({ success: true, source, data }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error("[sales-metric-email-api] Error:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load sales metric audit email data" },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
