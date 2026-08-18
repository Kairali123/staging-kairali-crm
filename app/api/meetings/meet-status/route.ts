// src/app/api/meetings/meet-status/route.ts
// Checks if a Google Meet is still running by querying conferenceRecords
// Returns { ended: boolean, reason?: string }
//
// How it works:
// - Google Meet API: conferenceRecords.list filtered by space name
// - If the latest record has end_time set → meeting ended
// - If end_time is null/absent → meeting is still running

import { NextRequest, NextResponse } from 'next/server'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'

export async function GET(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const { searchParams } = new URL(req.url)
    const code  = searchParams.get('code')   // e.g. abc-xyz-pqr
    const token = searchParams.get('token')  // Google OAuth access token

    if (!code || !token) {
      return NextResponse.json({ error: 'code and token required' }, { status: 400 })
    }

    // ── Step 1: Resolve space name from meet code ─────────────────────────
    // Meet codes map to space names like "spaces/abc-xyz-pqr"
    // The conferenceRecords filter uses space.name
    const spaceRes = await fetch(
      `https://meet.googleapis.com/v2/spaces/${code}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!spaceRes.ok) {
      // If space not found or no permission — assume still running (safe default)
      return NextResponse.json({ ended: false, reason: 'space_not_found' })
    }

    const spaceData = await spaceRes.json()
    const spaceName = spaceData.name  // e.g. "spaces/abc-xyz-pqr"

    // ── Step 2: Get latest conferenceRecord for this space ────────────────
    const recordsRes = await fetch(
      `https://meet.googleapis.com/v2/conferenceRecords?` +
      `filter=${encodeURIComponent(`space.name="${spaceName}"`)}` +
      `&pageSize=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!recordsRes.ok) {
      return NextResponse.json({ ended: false, reason: 'records_api_error' })
    }

    const recordsData = await recordsRes.json()
    const records: any[] = recordsData.conferenceRecords || []

    if (records.length === 0) {
      // No conference record yet — meeting hasn't started or just started
      return NextResponse.json({ ended: false, reason: 'no_records' })
    }

    // Sort by startTime descending to get the most recent
    const latest = records.sort((a: any, b: any) =>
      new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime()
    )[0]

    // end_time is set only when meeting has ended
    const ended = !!latest.endTime

    return NextResponse.json({
      ended,
      endTime:   latest.endTime   || null,
      startTime: latest.startTime || null,
      reason:    ended ? 'end_time_set' : 'meeting_active',
    })

  } catch (err: any) {
    console.error('[meet-status]', err)
    // On error — safe default: don't auto-stop
    return NextResponse.json({ ended: false, reason: 'error', error: err.message })
  }
}
