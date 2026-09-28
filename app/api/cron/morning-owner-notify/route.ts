/**
 * POST /api/cron/morning-owner-notify
 *
 * Sends each owner a personal email listing their assigned leads for today.
 * Called:
 *   1. By the daily cron at 11:00 IST (via vercel.json schedule — same as snapshot).
 *   2. From the page when all leads are assigned (requires x-cron-secret header).
 *
 * Required env vars:
 *   CRON_SECRET                   — bearer auth
 *   MORNING_OWNER_NOTIFY_EMAILS   — JSON {"Owner Name":"email@example.com", ...}
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { buildAssignmentSnapshot } from '@/lib/morning-lead-allocation'
import { dispatchOwnerNotifyEmails } from '@/lib/morning-owner-notify-email'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a); const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return timingSafeEqual(bufA, bufB)
  } catch { return false }
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization') || req.headers.get('x-cron-secret') || ''
  return safeCompare(header, `Bearer ${secret}`) || safeCompare(header, secret)
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await buildAssignmentSnapshot()

    // Build per-owner lead lists from snapshot
    const ownersWithLeads = summary.byOwner.map(o => ({
      name: o.owner,
      leads: summary.leads.filter(l => l.owner === o.owner).map(l => ({
        id: l.id,
        name: l.name,
        mobile: l.business || '',
        source: l.source || '',
        status: l.status || 'Pending',
      })),
    })).filter(o => o.leads.length > 0)

    const results = await dispatchOwnerNotifyEmails(ownersWithLeads, summary.date)

    const sent = results.filter(r => r.sent).length
    const failed = results.filter(r => !r.sent).length

    console.log(`[cron:morning-owner-notify] Sent ${sent} owner emails, ${failed} failed`)

    return NextResponse.json({
      success: true,
      date: summary.date,
      ownerCount: ownersWithLeads.length,
      sent,
      failed,
      results,
    })
  } catch (error) {
    console.error('[cron:morning-owner-notify] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 },
    )
  }
}

export const POST = GET
