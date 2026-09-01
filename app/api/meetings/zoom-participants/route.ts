// src/app/api/meetings/zoom-participants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'

export async function POST(req: NextRequest) {
  try {
    const crmSession = getMeetingSession(req)
    if (!crmSession) return meetingUnauthorized()

    const body          = await req.json()
    const { meetingId } = body

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId required' }, { status: 400 })
    }

    // Fix: use req.cookies in Route Handlers
    const raw = req.cookies.get('zoom_session')?.value
    if (!raw) {
      return NextResponse.json({ participants: [], note: 'Not authenticated with Zoom' })
    }

    let session: any
    try { session = JSON.parse(raw) } catch {
      return NextResponse.json({ participants: [], note: 'Invalid Zoom session' })
    }

    if (!session?.accessToken) {
      return NextResponse.json({ participants: [], note: 'No Zoom access token' })
    }

    const headers = { Authorization: `Bearer ${session.accessToken}` }

    // Try participant report (Pro+ accounts)
    const reportRes = await fetch(
      `https://api.zoom.us/v2/report/meetings/${meetingId}/participants?page_size=300`,
      { headers }
    )

    if (reportRes.status === 401 || reportRes.status === 403) {
      console.warn('[Zoom] Participant report not available — free account or no permission')
      return NextResponse.json({
        participants: [],
        note: 'Participant report not available for this account type',
      })
    }

    // Report not ready — fallback to live participants endpoint
    if (reportRes.status === 404) {
      const liveRes = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/participants?page_size=300`,
        { headers }
      )
      if (!liveRes.ok) {
        return NextResponse.json({ participants: [], note: 'Participant data not yet available' })
      }
      const liveData     = await liveRes.json()
      const participants = (liveData.participants || []).map((p: any) => ({
        name:      p.name       || p.user_name  || 'Unknown',
        email:     p.email      || '',
        role:      p.role       || 'attendee',
        joinTime:  p.join_time  || null,
        leaveTime: p.leave_time || null,
      }))
      return NextResponse.json({ participants, source: 'live' })
    }

    if (!reportRes.ok) {
      const err = await reportRes.json()
      return NextResponse.json({ participants: [], note: err.message || 'Report error' })
    }

    const reportData   = await reportRes.json()
    const participants = (reportData.participants || []).map((p: any) => ({
      name:      p.name       || 'Unknown',
      email:     p.user_email || '',
      role:      'attendee',
      joinTime:  p.join_time  || null,
      leaveTime: p.leave_time || null,
      duration:  p.duration   || 0,
    }))

    return NextResponse.json({ participants, source: 'report', total: participants.length })

  } catch (err: any) {
    console.error('[zoom-participants]', err)
    return NextResponse.json({ participants: [], note: err.message })
  }
}
