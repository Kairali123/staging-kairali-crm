// src/app/api/meetings/zoom-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'

function getSession(req: NextRequest) {
  const raw = req.cookies.get('zoom_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ── GET: return zoom session ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const crmSession = getMeetingSession(req)
  if (!crmSession) return meetingUnauthorized()

  const session = getSession(req)
  if (!session?.accessToken) return NextResponse.json({ connected: false })
  if (Date.now() > session.expiresAt) return NextResponse.json({ connected: false, expired: true })
  return NextResponse.json({
    connected: true,
    userName:  session.userName  || '',
    userEmail: session.userEmail || '',
    userId:    session.userId    || '',
  })
}

// ── POST: check meeting status + host ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const crmSession = getMeetingSession(req)
    if (!crmSession) return meetingUnauthorized()

    const body          = await req.json()
    const { meetingId } = body

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId required' }, { status: 400 })
    }

    const session = getSession(req)
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated with Zoom' }, { status: 401 })
    }

    const headers = { Authorization: `Bearer ${session.accessToken}` }

    // ── Get meeting details ───────────────────────────────────────────────
    const meetingRes = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      { headers }
    )

    if (meetingRes.status === 404) {
      return NextResponse.json({ status: 'ended', isEnded: true, isHost: false })
    }
    if (!meetingRes.ok) {
      const err = await meetingRes.json()
      return NextResponse.json({ error: err.message || 'Zoom API error' }, { status: 400 })
    }

    const meetingData = await meetingRes.json()
    const hostId      = meetingData.host_id || ''
    const isEnded     = meetingData.status === 'finished' || meetingData.status === 'ended'

    // ── Determine userId via fallback chain ───────────────────────────────
    // 1st: try /users/me with current token
    // 2nd: try /users/{email} if we have email
    // 3rd: fall back to userId stored in cookie at OAuth time
    let myUserId = session.userId || ''

    if (!myUserId) {
      // Try /users/me
      try {
        const meRes  = await fetch('https://api.zoom.us/v2/users/me', { headers })
        if (meRes.ok) {
          const meData = await meRes.json()
          myUserId = meData.id || ''
        }
      } catch { /* silent */ }
    }

    // If still empty and we have email, try /users/{email}
    if (!myUserId && session.userEmail) {
      try {
        const emailRes  = await fetch(
          `https://api.zoom.us/v2/users/${session.userEmail}`,
          { headers }
        )
        if (emailRes.ok) {
          const emailData = await emailRes.json()
          myUserId = emailData.id || ''
        }
      } catch { /* silent */ }
    }

    // ── Last resort: check if the meeting topic contains the user's name ──
    // If /users/me fails completely, check host_email field on the meeting
    // Zoom includes host_email in meeting details for the host
    const hostEmail   = meetingData.host_email || ''
    const isHostEmail = session.userEmail && hostEmail &&
                        hostEmail.toLowerCase() === session.userEmail.toLowerCase()

    const isHost = myUserId
      ? hostId === myUserId
      : isHostEmail   // fallback to email comparison

    console.log('[zoom-status]', {
      host_id:     hostId,
      host_email:  hostEmail,
      my_user_id:  myUserId,
      my_email:    session.userEmail,
      isHost,
    })

    return NextResponse.json({
      status:    meetingData.status,
      isEnded,
      isHost,
      topic:     meetingData.topic      || '',
      startTime: meetingData.start_time || '',
      _debug: {
        host_id:    hostId,
        host_email: hostEmail,
        my_user_id: myUserId,
        my_email:   session.userEmail || '',
        matched_by: myUserId ? 'userId' : isHostEmail ? 'email' : 'none',
      },
    })

  } catch (err: any) {
    console.error('[zoom-status POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
