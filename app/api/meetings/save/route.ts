// src/app/api/meetings/save/route.ts
// Phase 2: multi-user. Meetings are owned by the recorder (recorded_by = email).
// GET filters by owner unless caller is super_admin / admin (who see all).

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import {
  canAccessMeetingOwner,
  getMeetingSession,
  meetingForbidden,
  meetingUnauthorized,
  parseMeetingAudioUrl,
} from '@/lib/meetings-auth'
import { isMeetingUploadedFileOwner } from '@/lib/meeting-upload-sessions'

// ── POST: create a meeting, stamped with the recorder ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const body = await req.json()
    const pool = await getPool()
    const {
      title, meeting_type, platform, recorded_at,
      duration_sec, audio_size_kb, audio_url,
      transcript, diarized_transcript, summary,
      action_items, key_decisions, participants, follow_ups,
      lead_id, contact_email,
    } = body

    if (!recorded_at) {
      return NextResponse.json({ error: 'recorded_at is required' }, { status: 400 })
    }
    const recorded_by = session.email
    const recorded_by_name = session.name
    let safeAudioUrl: string | null = null
    if (audio_url) {
      const parsedAudioUrl = parseMeetingAudioUrl(audio_url, req.nextUrl.origin)
      const fileId = parsedAudioUrl?.searchParams.get('id')
      if (!parsedAudioUrl || !isMeetingUploadedFileOwner(fileId, session.email)) {
        return NextResponse.json({ error: 'Invalid or unauthorized audio_url' }, { status: 400 })
      }
      safeAudioUrl = `${parsedAudioUrl.pathname}?${parsedAudioUrl.searchParams.toString()}`
    }

    // ── Idempotency guard ────────────────────────────────────────────────────
    // A retry must NOT create a duplicate. Dedupe by recorder + recorded_at:
    // if a meeting with the same recorded_by AND recorded_at already exists,
    // UPDATE it in place instead of inserting a new row.
    const [existing]: any = await pool.execute(
      `SELECT id FROM meetings WHERE recorded_by = ? AND recorded_at = ? LIMIT 1`,
      [recorded_by, recorded_at]
    )

    const vals = [
      title         || 'Untitled Meeting',
      meeting_type  || 'online',
      platform      || null,
      duration_sec  || 0,
      audio_size_kb || 0,
      safeAudioUrl,
      transcript    || null,
      diarized_transcript || null,
      summary       || null,
      action_items  ? JSON.stringify(action_items)  : null,
      key_decisions ? JSON.stringify(key_decisions) : null,
      participants  ? JSON.stringify(participants)  : null,
      follow_ups    ? JSON.stringify(follow_ups)    : null,
      lead_id       || null,
      contact_email || null,
      recorded_by_name || null,
    ]

    if (existing?.[0]?.id) {
      // ── UPDATE existing row (retry / re-save) ──────────────────────────────
      const id = existing[0].id
      await pool.execute(
        `UPDATE meetings SET
           title=?, meeting_type=?, platform=?, duration_sec=?, audio_size_kb=?,
           audio_url=?, transcript=?, diarized_transcript=?, summary=?,
           action_items=?, key_decisions=?, participants=?, follow_ups=?,
           lead_id=?, contact_email=?, recorded_by_name=?, status='ready'
         WHERE id=?`,
        [...vals, id]
      )
      return NextResponse.json({ id, message: 'Meeting updated (idempotent)', deduped: true })
    }

    // ── INSERT new row ─────────────────────────────────────────────────────────
    const [result]: any = await pool.execute(
      `INSERT INTO meetings (
        title, meeting_type, platform, duration_sec, audio_size_kb,
        audio_url, transcript, diarized_transcript, summary,
        action_items, key_decisions, participants, follow_ups,
        lead_id, contact_email, recorded_by_name, recorded_at, recorded_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`,
      [...vals, recorded_at, recorded_by]
    )

    return NextResponse.json({ id: result.insertId, message: 'Meeting notes saved successfully' })

  } catch (err: any) {
    console.error('[/api/meetings/save POST]', err)
    return NextResponse.json({ error: err.message || 'DB insert failed' }, { status: 500 })
  }
}

// ── GET: list meetings, scoped to the caller's visibility ─────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const pool = await getPool()
    const { searchParams } = new URL(req.url)
    const page      = parseInt(searchParams.get('page')  || '1')
    const limit     = parseInt(searchParams.get('limit') || '20')
    const lead_id   = searchParams.get('lead_id')
    const type      = searchParams.get('type')
    const platform  = searchParams.get('platform')

    // Optional: admin filtering by a specific recorder
    const filterBy  = searchParams.get('recorded_by') || ''

    const offset = (page - 1) * limit
    const conditions: string[] = []
    const params: any[]        = []

    // ── Visibility enforcement (server-side) ────────────────────────────────
    if (!session.isAdmin) {
      // Regular users: ONLY their own recordings
      conditions.push('recorded_by = ?')
      params.push(session.email)
    } else if (filterBy) {
      // Admin optionally narrowing to one person
      conditions.push('recorded_by = ?')
      params.push(filterBy)
    }

    if (lead_id)  { conditions.push('lead_id = ?');      params.push(lead_id) }
    if (type)     { conditions.push('meeting_type = ?'); params.push(type) }
    if (platform) { conditions.push('platform = ?');     params.push(platform) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [rows]: any = await pool.execute(
      `SELECT
         id, title, meeting_type, platform, recorded_at, duration_sec,
         audio_url, transcript, diarized_transcript, action_items, key_decisions, participants, follow_ups,
         lead_id, contact_email, recorded_by, recorded_by_name, status, created_at
       FROM meetings
       ${where}
       ORDER BY recorded_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const [[{ total }]]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM meetings ${where}`,
      params
    )

    const meetings = rows.map((m: any) => ({
      ...m,
      action_items:  m.action_items  ? JSON.parse(m.action_items)  : [],
      key_decisions: m.key_decisions ? JSON.parse(m.key_decisions) : [],
      participants:  m.participants  ? JSON.parse(m.participants)  : [],
      follow_ups:    m.follow_ups    ? JSON.parse(m.follow_ups)    : [],
    }))

    return NextResponse.json({ meetings, total, page, limit, isAdmin: session.isAdmin })

  } catch (err: any) {
    console.error('[/api/meetings/save GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PATCH: update specific fields (participant retry) ─────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const pool = await getPool()
    const body = await req.json()
    const { id, participants } = body

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const [[meeting]]: any = await pool.execute(
      'SELECT id, recorded_by FROM meetings WHERE id = ?',
      [id]
    )
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
      return meetingForbidden('You do not have permission to update this meeting.')
    }

    const updates: string[] = []
    const params:  any[]    = []
    if (participants !== undefined) {
      updates.push('participants = ?')
      params.push(JSON.stringify(participants))
    }
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    params.push(id)
    await pool.execute(`UPDATE meetings SET ${updates.join(', ')} WHERE id = ?`, params)
    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[PATCH /api/meetings/save]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
