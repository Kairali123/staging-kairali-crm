import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// This legacy endpoint used to mail a standalone Booking PI Review Alert email
// (blue header scorecard) and create help tickets. It has been superseded by the
// unified email-triggers automation system (which sends the accurate green-header
// Booking PI Review Report from lib/booking-pi-review-report.ts via
// /settings/automation/email-triggers).
// vercel.json does not schedule this path; this handler is kept as a safe no-op
// so any stray or legacy cron calls fail safe instead of sending duplicate or
// obsolete emails.

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // In dev mode allow testing
    return process.env.NODE_ENV !== "production"
  }
  const header = req.headers.get("authorization") || ""
  return safeCompare(header, `Bearer ${secret}`)
}

async function handle(req: NextRequest) {
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

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
