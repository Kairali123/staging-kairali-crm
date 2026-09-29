import { NextRequest, NextResponse } from "next/server"
import { verifySessionCookieValue } from "@/lib/session"
import { renderAllocationSnapshotEmail } from "@/lib/morning-allocation-email"
import type { AssignmentSummary } from "@/lib/morning-lead-allocation"

export const dynamic = "force-dynamic"
export const revalidate = 0

const noStoreHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
}

function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function resolveAppUrl(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (envUrl && envUrl.trim()) return envUrl.trim()
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  const origin = request.nextUrl.origin
  if (origin && !origin.includes("localhost")) {
    return origin
  }
  return "http://localhost:3000"
}

function getMockSnapshot(dateStr: string): AssignmentSummary {
  return {
    date: dateStr,
    totalLeads: 48,
    assignedLeads: 42,
    unassignedLeads: 2,
    overdueLeads: 4,
    byOwner: [
      { owner: "Priya", assigned: 14, received: 3 },
      { owner: "Anjali Menon", assigned: 12, received: 2 },
      { owner: "Rahul Sharma", assigned: 9, received: 1 },
      { owner: "Sneha Patel", assigned: 7, received: 1 },
    ],
    changes: [
      {
        time: "09:42 AM",
        leadId: "APP-10824",
        leadName: "Rajesh Malhotra",
        fromOwner: "Unassigned",
        toOwner: "Priya",
        actor: "Admin",
      },
      {
        time: "10:05 AM",
        leadId: "APP-10831",
        leadName: "Meenakshi Sundaram",
        fromOwner: "Sneha Patel",
        toOwner: "Anjali Menon",
        actor: "Transfer (Overdue)",
      },
      {
        time: "10:28 AM",
        leadId: "APP-10839",
        leadName: "Vikram Sethi",
        fromOwner: "Unassigned",
        toOwner: "Rahul Sharma",
        actor: "Admin",
      },
    ],
  }
}

export async function GET(request: NextRequest) {
  // Auth guard: check session cookie
  let session: any = null
  try {
    const userCookie = request.cookies.get("kairali_user")?.value
    session = userCookie ? verifySessionCookieValue(userCookie) : null
  } catch { }

  if (!session && process.env.NODE_ENV === "production") {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const requestedDate = searchParams.get("date")
  const dateStr = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : istToday()
  const appUrl = resolveAppUrl(request)

  let summary: AssignmentSummary
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const { buildAssignmentSnapshot } = await import("@/lib/morning-lead-allocation")
      summary = await buildAssignmentSnapshot()
      // If live returns 0 total leads, still show realistic sample for preview clarity
      if (!summary || summary.totalLeads === 0) {
        summary = getMockSnapshot(dateStr)
      }
    } catch (err) {
      console.warn("[morning-allocation-preview] Live sheet fetch failed, using preview fixture:", err)
      summary = getMockSnapshot(dateStr)
    }
  } else {
    summary = getMockSnapshot(dateStr)
  }

  const { html } = renderAllocationSnapshotEmail(summary, appUrl)
  return new NextResponse(html, { headers: noStoreHeaders })
}
