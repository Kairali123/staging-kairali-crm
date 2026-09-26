import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// This endpoint used to mail the Agent-wise Call Audit Report unattended at 09:00 IST,
// scheduled from `vercel.json`. That duplicated the "sales-call-audit" trigger under
// /settings/automation/email-triggers, which sends the same report on the same
// schedule — recipients got two copies every morning. vercel.json no longer schedules
// this path; the handler is kept only so a stray call (or an undeployed vercel.json)
// fails safe instead of mailing the report twice.

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get("authorization") || ""
  return safeCompare(header, `Bearer ${secret}`)
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: valid CRON_SECRET bearer token required." },
      { status: 401 }
    )
  }

  return NextResponse.json({
    success: true,
    skipped: true,
    reason: "superseded-by-email-triggers",
  })
}
