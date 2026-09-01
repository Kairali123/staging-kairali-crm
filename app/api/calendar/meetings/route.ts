// src/app/api/calendar/meetings/route.ts
// Fetches Google Calendar events for the next 7 days
// Detects Meet/Zoom/Teams URLs in each event
// Returns structured meeting list for the Calendar tab

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// ── URL detection helpers ──────────────────────────────────────────────────────
function detectMeetingUrl(text: string): { platform: string; url: string; code: string } | null {
  if (!text) return null

  // Google Meet
  const meetMatch = text.match(/https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
  if (meetMatch) return { platform: 'meet', url: meetMatch[0], code: meetMatch[1].toLowerCase() }

  // Zoom
  const zoomMatch = text.match(/https:\/\/[\w.]*zoom\.us\/j\/(\d{9,11})/i)
  if (zoomMatch) return { platform: 'zoom', url: zoomMatch[0], code: zoomMatch[1] }

  // Teams
  const teamsMatch = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<]+/i)
  if (teamsMatch) return { platform: 'teams', url: teamsMatch[0], code: '' }

  return null
}

function parseMeetingDetails(event: any) {
  const description  = event.description || ''
  const location     = event.location    || ''
  const hangoutLink  = event.hangoutLink || ''  // Google auto-populates Meet links here

  // Check hangoutLink first (most reliable for Meet)
  if (hangoutLink) {
    const code = hangoutLink.replace('https://meet.google.com/', '')
    return { platform: 'meet', url: hangoutLink, code }
  }

  // Try description and location
  return detectMeetingUrl(description + ' ' + location)
}

function formatParticipants(attendees: any[]) {
  if (!attendees?.length) return []
  return attendees
    .filter(a => a.email && !a.resource)  // exclude rooms/resources
    .map(a => ({
      name:     a.displayName || a.email.split('@')[0],
      email:    a.email,
      role:     a.organizer ? 'host' : 'attendee',
      accepted: a.responseStatus === 'accepted',
    }))
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accessToken = searchParams.get('token')

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected to Google. Please sign in with Google to see your calendar.' },
        { status: 401 }
      )
    }

    // Fetch events: start of current year → end of current year
    const now      = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)   // Jan 1
    const yearEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59)  // Dec 31

    const params = new URLSearchParams({
      calendarId:   'primary',
      timeMin:      yearStart.toISOString(),
      timeMax:      yearEnd.toISOString(),
      maxResults:   '2500',   // Google Calendar max per page
      singleEvents: 'true',
      orderBy:      'startTime',
    })

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!calRes.ok) {
      const err = await calRes.json()
      if (calRes.status === 401) {
        return NextResponse.json(
          { error: 'Google session expired. Please reconnect Google account.', expired: true },
          { status: 401 }
        )
      }
      return NextResponse.json(
        { error: `Google Calendar error: ${err?.error?.message || 'Unknown error'}` },
        { status: 400 }
      )
    }

    const data   = await calRes.json()
    const events = data.items || []

    // Process and enrich events
    const meetings = events
      .filter((e: any) => e.status !== 'cancelled')
      .map((e: any) => {
        const startRaw = e.start?.dateTime || e.start?.date
        const endRaw   = e.end?.dateTime   || e.end?.date
        const start    = startRaw ? new Date(startRaw) : null
        const end      = endRaw   ? new Date(endRaw)   : null
        const meeting  = parseMeetingDetails(e)
        const participants = formatParticipants(e.attendees || [])

        // Determine status
        const now = Date.now()
        const startMs = start?.getTime() || 0
        const endMs   = end?.getTime()   || 0
        const status  = endMs < now ? 'ended'
                      : startMs <= now && endMs >= now ? 'live'
                      : startMs - now <= 15 * 60 * 1000 ? 'soon'   // within 15 min
                      : 'upcoming'

        return {
          id:           e.id,
          title:        e.summary || 'Untitled Event',
          description:  e.description || '',
          start:        start?.toISOString() || null,
          end:          end?.toISOString()   || null,
          allDay:       !!e.start?.date,
          status,                   // live | soon | upcoming | ended
          platform:     meeting?.platform || null,
          meetingUrl:   meeting?.url      || null,
          meetCode:     meeting?.code     || null,
          participants,
          participantCount: participants.length,
          organizer:    e.organizer?.displayName || e.organizer?.email || null,
          htmlLink:     e.htmlLink || null,  // link to Google Calendar event
        }
      })
      // Only include events that have online meetings OR are future/live
      // (show all so user can see their full day)

    // Group by day for easier UI consumption
    const grouped: Record<string, any[]> = {}
    for (const m of meetings) {
      const day = m.start
        ? new Date(m.start).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })
        : 'All Day'
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(m)
    }

    return NextResponse.json({
      meetings,
      grouped,
      total:         meetings.length,
      withMeetLink:  meetings.filter((m: any) => m.meetingUrl).length,
    })

  } catch (err: any) {
    console.error('[/api/calendar/meetings]', err)
    return NextResponse.json(
      { error: 'Could not load calendar. Please try again.' },
      { status: 500 }
    )
  }
}


// // src/app/api/calendar/meetings/route.ts
// // Fetches Google Calendar events for the next 7 days
// // Detects Meet/Zoom/Teams URLs in each event
// // Returns structured meeting list for the Calendar tab

// import { NextRequest, NextResponse } from 'next/server'
// import { getServerSession } from 'next-auth'

// // ── URL detection helpers ──────────────────────────────────────────────────────
// function detectMeetingUrl(text: string): { platform: string; url: string; code: string } | null {
//   if (!text) return null

//   // Google Meet
//   const meetMatch = text.match(/https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)
//   if (meetMatch) return { platform: 'meet', url: meetMatch[0], code: meetMatch[1].toLowerCase() }

//   // Zoom
//   const zoomMatch = text.match(/https:\/\/[\w.]*zoom\.us\/j\/(\d{9,11})/i)
//   if (zoomMatch) return { platform: 'zoom', url: zoomMatch[0], code: zoomMatch[1] }

//   // Teams
//   const teamsMatch = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s"<]+/i)
//   if (teamsMatch) return { platform: 'teams', url: teamsMatch[0], code: '' }

//   return null
// }

// function parseMeetingDetails(event: any) {
//   const description  = event.description || ''
//   const location     = event.location    || ''
//   const hangoutLink  = event.hangoutLink || ''  // Google auto-populates Meet links here

//   // Check hangoutLink first (most reliable for Meet)
//   if (hangoutLink) {
//     const code = hangoutLink.replace('https://meet.google.com/', '')
//     return { platform: 'meet', url: hangoutLink, code }
//   }

//   // Try description and location
//   return detectMeetingUrl(description + ' ' + location)
// }

// function formatParticipants(attendees: any[]) {
//   if (!attendees?.length) return []
//   return attendees
//     .filter(a => a.email && !a.resource)  // exclude rooms/resources
//     .map(a => ({
//       name:     a.displayName || a.email.split('@')[0],
//       email:    a.email,
//       role:     a.organizer ? 'host' : 'attendee',
//       accepted: a.responseStatus === 'accepted',
//     }))
// }

// // ── Main handler ──────────────────────────────────────────────────────────────
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url)
//     const accessToken = searchParams.get('token')

//     if (!accessToken) {
//       return NextResponse.json(
//         { error: 'Not connected to Google. Please sign in with Google to see your calendar.' },
//         { status: 401 }
//       )
//     }

//     // Fetch events: now → 7 days from now
//     const now     = new Date()
//     const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

//     const params = new URLSearchParams({
//       calendarId:   'primary',
//       timeMin:      now.toISOString(),
//       timeMax:      in7Days.toISOString(),
//       maxResults:   '50',
//       singleEvents: 'true',
//       orderBy:      'startTime',
//     })

//     const calRes = await fetch(
//       `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
//       { headers: { Authorization: `Bearer ${accessToken}` } }
//     )

//     if (!calRes.ok) {
//       const err = await calRes.json()
//       if (calRes.status === 401) {
//         return NextResponse.json(
//           { error: 'Google session expired. Please reconnect Google account.', expired: true },
//           { status: 401 }
//         )
//       }
//       return NextResponse.json(
//         { error: `Google Calendar error: ${err?.error?.message || 'Unknown error'}` },
//         { status: 400 }
//       )
//     }

//     const data   = await calRes.json()
//     const events = data.items || []

//     // Process and enrich events
//     const meetings = events
//       .filter((e: any) => e.status !== 'cancelled')
//       .map((e: any) => {
//         const startRaw = e.start?.dateTime || e.start?.date
//         const endRaw   = e.end?.dateTime   || e.end?.date
//         const start    = startRaw ? new Date(startRaw) : null
//         const end      = endRaw   ? new Date(endRaw)   : null
//         const meeting  = parseMeetingDetails(e)
//         const participants = formatParticipants(e.attendees || [])

//         // Determine status
//         const now = Date.now()
//         const startMs = start?.getTime() || 0
//         const endMs   = end?.getTime()   || 0
//         const status  = endMs < now ? 'ended'
//                       : startMs <= now && endMs >= now ? 'live'
//                       : startMs - now <= 15 * 60 * 1000 ? 'soon'   // within 15 min
//                       : 'upcoming'

//         return {
//           id:           e.id,
//           title:        e.summary || 'Untitled Event',
//           description:  e.description || '',
//           start:        start?.toISOString() || null,
//           end:          end?.toISOString()   || null,
//           allDay:       !!e.start?.date,
//           status,                   // live | soon | upcoming | ended
//           platform:     meeting?.platform || null,
//           meetingUrl:   meeting?.url      || null,
//           meetCode:     meeting?.code     || null,
//           participants,
//           participantCount: participants.length,
//           organizer:    e.organizer?.displayName || e.organizer?.email || null,
//           htmlLink:     e.htmlLink || null,  // link to Google Calendar event
//         }
//       })
//       // Only include events that have online meetings OR are future/live
//       // (show all so user can see their full day)

//     // Group by day for easier UI consumption
//     const grouped: Record<string, any[]> = {}
//     for (const m of meetings) {
//       const day = m.start
//         ? new Date(m.start).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })
//         : 'All Day'
//       if (!grouped[day]) grouped[day] = []
//       grouped[day].push(m)
//     }

//     return NextResponse.json({
//       meetings,
//       grouped,
//       total:         meetings.length,
//       withMeetLink:  meetings.filter((m: any) => m.meetingUrl).length,
//     })

//   } catch (err: any) {
//     console.error('[/api/calendar/meetings]', err)
//     return NextResponse.json(
//       { error: 'Could not load calendar. Please try again.' },
//       { status: 500 }
//     )
//   }
// }