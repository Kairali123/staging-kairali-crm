// src/app/api/meetings/zoom-meeting-status/route.ts
// Checks if a Zoom meeting is still running
// Returns { ended: boolean }
//
// Uses Zoom's GET /meetings/{meetingId} endpoint
// status = 'started' → still running
// status = 'ended'   → finished
// 404                → ended (meeting no longer exists)

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'

export async function GET(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const { searchParams } = new URL(req.url)
    const meetingId = searchParams.get('meetingId')

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId required' }, { status: 400 })
    }

    // Get Zoom access token from session cookie (set by /api/zoom/callback)
    const cookieStore = cookies()
    const zoomSession = (cookieStore as any).get('zoom_session')

    if (!zoomSession?.value) {
      // No Zoom session — can't check, safe default
      return NextResponse.json({ ended: false, reason: 'no_session' })
    }

    let sessionData: any
    try { sessionData = JSON.parse(zoomSession.value) } catch {
      return NextResponse.json({ ended: false, reason: 'invalid_session' })
    }

    const accessToken = sessionData.accessToken
    if (!accessToken) {
      return NextResponse.json({ ended: false, reason: 'no_token' })
    }

    // ── Query Zoom meeting status ──────────────────────────────────────────
    const zoomRes = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // 404 = meeting ended and no longer in Zoom's active meetings
    if (zoomRes.status === 404) {
      return NextResponse.json({ ended: true, reason: 'not_found' })
    }

    if (!zoomRes.ok) {
      // Any other error — safe default, don't auto-stop
      return NextResponse.json({ ended: false, reason: 'api_error' })
    }

    const data = await zoomRes.json()

    // status field: 'waiting' | 'started' | 'ended'
    const ended = data.status === 'ended'

    return NextResponse.json({
      ended,
      status: data.status,
      reason: ended ? 'status_ended' : 'meeting_active',
    })

  } catch (err: any) {
    console.error('[zoom-meeting-status]', err)
    return NextResponse.json({ ended: false, reason: 'error', error: err.message })
  }
}
