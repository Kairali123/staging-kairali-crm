// src/app/api/meetings/meet-participants/route.ts
// Fetches all participants from a Google Meet conference using the Meet API
//
// Usage: POST /api/meetings/meet-participants
// Body:  { meetCode: "abc-defg-hij", accessToken: "ya29.xxx" }
// Returns: { participants: [{ name, email, role, joinTime, leaveTime }] }

// import { NextRequest, NextResponse } from 'next/server'

// interface ConferenceRecord {
//   name:      string   // e.g. "conferenceRecords/abc123"
//   startTime: string
//   endTime:   string
//   space:     string
// }

// interface Participant {
//   name:           string
//   earliestStartTime: string
//   latestEndTime:  string
//   signedinUser?:  { user: string; displayName: string }
//   anonymousUser?: { displayName: string }
//   phoneUser?:     { displayName: string }
// }

// interface ParticipantSession {
//   name:      string
//   startTime: string
//   endTime:   string
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { meetCode, accessToken } = body

//     if (!meetCode || !accessToken) {
//       return NextResponse.json(
//         { error: 'meetCode and accessToken are required' },
//         { status: 400 }
//       )
//     }

//     // Clean meet code — strip URL if user pastes full link
//     // e.g. "https://meet.google.com/abc-defg-hij" → "abc-defg-hij"
//     const cleanCode = meetCode
//       .replace('https://meet.google.com/', '')
//       .replace('http://meet.google.com/', '')
//       .trim()

//     const headers = {
//       Authorization: `Bearer ${accessToken}`,
//       'Content-Type': 'application/json',
//     }

//     // ── Step 1: Find conference record by meet code ───────────────────────
//     // The Meet API identifies conferences by space — we search by meetingCode
//     const spaceRes = await fetch(
//       `https://meet.googleapis.com/v2/spaces/${cleanCode}`,
//       { headers }
//     )

//     if (!spaceRes.ok) {
//       const err = await spaceRes.json()
//       console.error('[Meet API] Space lookup failed:', err)
//       return NextResponse.json(
//         { error: 'Could not find Meet space. Make sure the meeting code is correct and you were a participant.', details: err },
//         { status: 400 }
//       )
//     }

//     const space = await spaceRes.json()
//     // space.name = "spaces/abc-defg-hij"

//     // ── Step 2: Get conference records for this space ─────────────────────
//     const recordsRes = await fetch(
//       `https://meet.googleapis.com/v2/conferenceRecords?filter=space.name="${space.name}"`,
//       { headers }
//     )

//     const recordsData = await recordsRes.json()
//     const records: ConferenceRecord[] = recordsData.conferenceRecords || []

//     if (records.length === 0) {
//       return NextResponse.json(
//         { error: 'No conference records found. The meeting may not have ended yet or you were not a participant.' },
//         { status: 404 }
//       )
//     }

//     // Use the most recent conference record
//     const latestRecord = records[records.length - 1]

//     // ── Step 3: Fetch all participants ────────────────────────────────────
//     const participantsRes = await fetch(
//       `https://meet.googleapis.com/v2/${latestRecord.name}/participants?pageSize=100`,
//       { headers }
//     )

//     const participantsData = await participantsRes.json()
//     const rawParticipants: Participant[] = participantsData.participants || []

//     // ── Step 4: Normalise participant data ────────────────────────────────
//     const participants = rawParticipants.map(p => {
//       let name  = 'Unknown'
//       let email = ''
//       let role  = 'attendee'

//       if (p.signedinUser) {
//         name  = p.signedinUser.displayName || 'Unknown'
//         // user field is like "users/abc123" — email not directly available from participants API
//         // but displayName is reliable
//         email = ''
//       } else if (p.anonymousUser) {
//         name  = p.anonymousUser.displayName || 'Guest'
//         email = ''
//       } else if (p.phoneUser) {
//         name  = p.phoneUser.displayName || 'Phone User'
//         email = ''
//       }

//       return {
//         name,
//         email,
//         role,
//         joinTime:  p.earliestStartTime || null,
//         leaveTime: p.latestEndTime     || null,
//       }
//     })

//     return NextResponse.json({
//       participants,
//       meetCode:        cleanCode,
//       conferenceStart: latestRecord.startTime,
//       conferenceEnd:   latestRecord.endTime,
//       total:           participants.length,
//     })

//   } catch (err: any) {
//     console.error('[/api/meetings/meet-participants]', err)
//     return NextResponse.json(
//       { error: err.message || 'Failed to fetch participants' },
//       { status: 500 }
//     )
//   }
// }


// src/app/api/meetings/meet-participants/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'

export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const body = await req.json()
    const { meetCode, accessToken } = body

    if (!meetCode || !accessToken) {
      return NextResponse.json(
        { error: 'meetCode and accessToken are required' },
        { status: 400 }
      )
    }

    // Clean meet code
    const cleanCode = meetCode
      .replace('https://meet.google.com/', '')
      .replace('http://meet.google.com/', '')
      .trim()

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    // ── Step 1: Get space info ─────────────────────────────────────────────
    const spaceRes = await fetch(
      `https://meet.googleapis.com/v2/spaces/${cleanCode}`,
      { headers }
    )

    if (!spaceRes.ok) {
      const err = await spaceRes.json()
      console.error('[Meet] Space lookup failed:', err)
      return NextResponse.json(
        { error: `Could not find Meet space (${err?.error?.message || spaceRes.status}). Make sure the meet code is correct.` },
        { status: 400 }
      )
    }

    const space = await spaceRes.json()
    // space.name = "spaces/abc-defg-hij"

    // ── Step 2: Get conference records with retry ─────────────────────────
    // Meet API takes 1-3 minutes after meeting ends to generate conference records
    // We retry up to 4 times with 15s delay = up to 1 minute total wait
    let records: any[] = []
    let lastRecordError = ''

    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        // Wait 15 seconds before retry
        console.log(`[Meet] Waiting 15s before retry ${attempt}...`)
        await new Promise(r => setTimeout(r, 15000))
      }

      try {
        // Use correct filter format for Meet API
        const filterParam = encodeURIComponent(`space.name="${space.name}"`)
        const recordsRes  = await fetch(
          `https://meet.googleapis.com/v2/conferenceRecords?filter=${filterParam}&pageSize=10`,
          { headers }
        )

        if (!recordsRes.ok) {
          const err = await recordsRes.json()
          lastRecordError = err?.error?.message || `HTTP ${recordsRes.status}`
          console.warn(`[Meet] Conference records attempt ${attempt + 1} failed:`, lastRecordError)
          continue
        }

        const recordsData = await recordsRes.json()
        records = recordsData.conferenceRecords || []

        if (records.length > 0) {
          console.log(`[Meet] Found ${records.length} conference record(s) on attempt ${attempt + 1}`)
          break  // got records — stop retrying
        } else {
          console.warn(`[Meet] No records yet on attempt ${attempt + 1}`)
          lastRecordError = 'Conference record not generated yet'
        }
      } catch (e: any) {
        lastRecordError = e.message
        console.warn(`[Meet] Attempt ${attempt + 1} error:`, e.message)
      }
    }

    if (records.length === 0) {
      return NextResponse.json(
        {
          error: `No conference records found after retries. ${lastRecordError}. The meeting may not have ended yet, or the record is still being generated (can take up to 3 minutes).`,
          participants: [],
          retry_suggestion: true,
        },
        { status: 404 }
      )
    }

    // Use most recent record
    const latestRecord = records[records.length - 1]
    console.log('[Meet] Using record:', latestRecord.name)

    // ── Step 3: Fetch participants ─────────────────────────────────────────
    const participantsRes = await fetch(
      `https://meet.googleapis.com/v2/${latestRecord.name}/participants?pageSize=100`,
      { headers }
    )

    if (!participantsRes.ok) {
      const err = await participantsRes.json()
      return NextResponse.json(
        { error: `Could not fetch participants: ${err?.error?.message || participantsRes.status}` },
        { status: 400 }
      )
    }

    const participantsData = await participantsRes.json()
    const rawParticipants  = participantsData.participants || []

    // ── Step 4: Normalise ─────────────────────────────────────────────────
    const participants = rawParticipants.map((p: any) => {
      let name  = 'Unknown'
      let email = ''

      if (p.signedinUser?.displayName) {
        name = p.signedinUser.displayName
      } else if (p.anonymousUser?.displayName) {
        name = p.anonymousUser.displayName
      } else if (p.phoneUser?.displayName) {
        name = `📞 ${p.phoneUser.displayName}`
      }

      return {
        name,
        email,
        role:      'attendee',
        joinTime:  p.earliestStartTime || null,
        leaveTime: p.latestEndTime     || null,
      }
    })

    return NextResponse.json({
      participants,
      total:           participants.length,
      meetCode:        cleanCode,
      conferenceStart: latestRecord.startTime,
      conferenceEnd:   latestRecord.endTime,
    })

  } catch (err: any) {
    console.error('[/api/meetings/meet-participants]', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}
