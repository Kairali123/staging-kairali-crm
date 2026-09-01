// src/app/api/calendar/mobile/route.ts
// Returns Google Calendar events for the mobile app.
// Auth: uses the refresh token persisted at web login (no mobile OAuth needed).
//
// GET /api/calendar/mobile?email=user@kairali.com&days=30
//   → { events: [...] }  or  { error, needsWebLogin: true }

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export const runtime = 'nodejs'

// ── Mint a fresh access token from the stored refresh token ───────────────────
async function getAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      }),
    })
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

// ── Classify event timing ─────────────────────────────────────────────────────
function statusOf(start: string | null, end: string | null): string {
  if (!start) return 'upcoming'
  const now = Date.now()
  const s   = new Date(start).getTime()
  const e   = end ? new Date(end).getTime() : s + 3600_000
  if (now >= s && now <= e) return 'live'
  if (now < s && s - now < 15 * 60_000) return 'soon'
  if (now > e) return 'ended'
  return 'upcoming'
}

// ── Detect meeting platform from event ────────────────────────────────────────
function detectPlatform(ev: any): { platform: string | null; meetingUrl: string | null } {
  // Google Meet link
  if (ev.hangoutLink) return { platform: 'meet', meetingUrl: ev.hangoutLink }
  const text = `${ev.location || ''} ${ev.description || ''}`.toLowerCase()
  if (text.includes('zoom.us'))        return { platform: 'zoom',  meetingUrl: ev.location || null }
  if (text.includes('teams.microsoft'))return { platform: 'teams', meetingUrl: ev.location || null }
  return { platform: null, meetingUrl: null }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    const days  = Math.min(parseInt(searchParams.get('days') || '60'), 180)

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    // 1. Look up stored refresh token
    const db = await getPool()
    const [rows]: any = await db.execute(
      'SELECT refresh_token FROM google_tokens WHERE email = ? LIMIT 1',
      [email]
    )
    const refreshToken = rows?.[0]?.refresh_token
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please sign in with Google on the web CRM once.', needsWebLogin: true },
        { status: 200 }
      )
    }

    // 2. Mint fresh access token
    const accessToken = await getAccessToken(refreshToken)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google session expired. Please sign in again on the web CRM.', needsWebLogin: true },
        { status: 200 }
      )
    }

    // 3. Fetch events — from 7 days ago to `days` ahead
    const timeMin = new Date(Date.now() - 7 * 86400_000).toISOString()
    const timeMax = new Date(Date.now() + days * 86400_000).toISOString()
    const calRes  = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin, timeMax,
        singleEvents: 'true',
        orderBy:      'startTime',
        maxResults:   '250',
      }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!calRes.ok) {
      const err = await calRes.text()
      return NextResponse.json({ error: `Calendar fetch failed: ${err.slice(0, 120)}` }, { status: 502 })
    }

    const data = await calRes.json()

    // 4. Map to the shape the app expects
    const events = (data.items || [])
      .filter((ev: any) => ev.status !== 'cancelled')
      .map((ev: any) => {
        const start = ev.start?.dateTime || ev.start?.date || null
        const end   = ev.end?.dateTime   || ev.end?.date   || null
        const { platform, meetingUrl } = detectPlatform(ev)
        return {
          id:         ev.id,
          title:      ev.summary || '(No title)',
          start, end,
          status:     statusOf(start, end),
          platform, meetingUrl,
          organizer:  ev.organizer?.displayName || ev.organizer?.email || null,
          allDay:     !ev.start?.dateTime,   // date-only = all-day event
        }
      })

    return NextResponse.json({ events })

  } catch (err: any) {
    console.error('[calendar/mobile]', err)
    return NextResponse.json({ error: err.message || 'Calendar error' }, { status: 500 })
  }
}
