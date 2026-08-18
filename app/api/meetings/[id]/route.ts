// src/app/api/meetings/[id]/route.ts
// Phase 2: ownership-checked. A user can only open/delete their OWN meeting
// unless they are super_admin / admin.

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { deleteAudioFromDrive } from '@/lib/google-drive'
import {
  canAccessMeetingOwner,
  getMeetingSession,
  meetingForbidden,
  meetingUnauthorized,
} from '@/lib/meetings-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const { id }    = await params
    const meetingId = parseInt(id)
    const pool = await getPool()
    if (isNaN(meetingId)) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    const [[meeting]]: any = await pool.execute(
      'SELECT * FROM meetings WHERE id = ?',
      [meetingId]
    )

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // ── Ownership check ─────────────────────────────────────────────────────
    if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
      return meetingForbidden('You do not have access to this meeting.')
    }

    const parsed = {
      ...meeting,
      action_items:  meeting.action_items  ? JSON.parse(meeting.action_items)  : [],
      key_decisions: meeting.key_decisions ? JSON.parse(meeting.key_decisions) : [],
      participants:  meeting.participants  ? JSON.parse(meeting.participants)  : [],
      follow_ups:    meeting.follow_ups    ? JSON.parse(meeting.follow_ups)    : [],
    }

    const [tasks]: any = await pool.execute(
      `SELECT * FROM meeting_tasks WHERE meeting_id = ?
       ORDER BY FIELD(priority,'high','medium','low'), deadline ASC`,
      [meetingId]
    )

    return NextResponse.json({ meeting: parsed, tasks })

  } catch (err: any) {
    console.error('[GET /api/meetings/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const { id }    = await params
    const meetingId = parseInt(id)
    const pool = await getPool()
    if (isNaN(meetingId)) {
      return NextResponse.json({ error: 'Invalid meeting ID' }, { status: 400 })
    }

    const [[meeting]]: any = await pool.execute(
      'SELECT id, audio_url, recorded_by FROM meetings WHERE id = ?',
      [meetingId]
    )

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // ── Ownership check — only owner or admin can delete ────────────────────
    if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
      return meetingForbidden('You do not have permission to delete this meeting.')
    }

    if (meeting.audio_url) {
      await deleteAudioFromDrive(meeting.audio_url)
    }

    await pool.execute('DELETE FROM meetings WHERE id = ?', [meetingId])
    return NextResponse.json({ success: true, deleted_id: meetingId })

  } catch (err: any) {
    console.error('[DELETE /api/meetings/[id]]', err)
    return NextResponse.json({ error: err.message || 'Delete failed' }, { status: 500 })
  }
}
