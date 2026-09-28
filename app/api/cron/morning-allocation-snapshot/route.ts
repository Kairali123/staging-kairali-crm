/**
 * Cron: /api/cron/morning-allocation-snapshot
 * Schedule: 30 5 * * * (UTC) = 11:00 IST — see vercel.json
 *
 * Fires daily at 11:00 IST and:
 *  1. Builds today's assignment snapshot (who assigned to whom, totals, overdue count).
 *  2. Emails all owners (MORNING_ALLOCATION_TO) a formatted HTML report.
 *
 * Also fires immediately when all leads for a given user are assigned (triggered from
 * the client via POST to this endpoint with { trigger: 'all_done' } — still requires
 * the CRON_SECRET header so only server-side code can call it).
 *
 * The CRON_SECRET env var is required; without it the endpoint is always unreachable.
 */

import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { buildAssignmentSnapshot } from '@/lib/morning-lead-allocation'
import {
  renderAllocationSnapshotEmail,
  dispatchAllocationSnapshotEmail,
} from '@/lib/morning-allocation-email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') || ''
  return safeCompare(header, `Bearer ${secret}`)
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: valid CRON_SECRET bearer token required.' },
      { status: 401 },
    )
  }

  try {
    const summary = await buildAssignmentSnapshot()
    const { subject, html } = renderAllocationSnapshotEmail(summary)
    const result = await dispatchAllocationSnapshotEmail({ subject, html })

    if (!result.smtpDispatched) {
      console.error('[cron:morning-allocation-snapshot] Email NOT sent:', result.smtpError)
      return NextResponse.json(
        {
          success: false,
          error: result.smtpConfigured
            ? `SMTP dispatch failed: ${result.smtpError}`
            : 'SMTP is not configured on this deployment.',
          summary,
          smtpConfigured: result.smtpConfigured,
        },
        { status: 500 },
      )
    }

    console.log(
      `[cron:morning-allocation-snapshot] Sent ${summary.date} snapshot to ${result.to.join(', ')} ` +
      `(${summary.assignedLeads} assigned, ${summary.overdueLeads} overdue, ${summary.changes.length} transfers)`,
    )

    return NextResponse.json({
      success: true,
      date: summary.date,
      assignedLeads: summary.assignedLeads,
      unassignedLeads: summary.unassignedLeads,
      overdueLeads: summary.overdueLeads,
      transfers: summary.changes.length,
      byOwnerCount: summary.byOwner.length,
      to: result.to,
      cc: result.cc,
      messageId: result.messageId,
      subject,
    })
  } catch (error) {
    console.error('[cron:morning-allocation-snapshot] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Snapshot cron failed' },
      { status: 500 },
    )
  }
}

/**
 * POST — triggered from the client when all leads for a user are done.
 * Requires the same CRON_SECRET Authorization header.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }
  // Re-use the GET handler logic
  return GET(req)
}
