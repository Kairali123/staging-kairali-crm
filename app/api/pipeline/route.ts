// src/app/api/pipeline/route.ts
// CRUD for pipeline checkpoints
//
// POST   /api/pipeline           → create checkpoint, returns { id }
// PATCH  /api/pipeline           → update checkpoint by id
// GET    /api/pipeline?id=N      → get checkpoint by id
// DELETE /api/pipeline?id=N      → delete checkpoint (on success)

// import { NextRequest, NextResponse } from 'next/server'
// import { getPool } from '@/lib/db'

// // ── POST: create new checkpoint ───────────────────────────────────────────────
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const db   = await getPool()

//     const [result]: any = await db.execute(
//       `INSERT INTO pipeline_checkpoints
//          (title, mode, platform, meet_code, zoom_id,
//           recorded_at, duration_sec, audio_size_kb, participants)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         body.title        || null,
//         body.mode         || 'online',
//         body.platform     || null,
//         body.meetCode     || null,
//         body.zoomId       || null,
//         body.recordedAt   || new Date().toISOString(),
//         body.durationSec  || 0,
//         body.sizeKb       || 0,
//         body.participants ? JSON.stringify(body.participants) : null,
//       ]
//     )

//     return NextResponse.json({ id: result.insertId })
//   } catch (err: any) {
//     console.error('[POST /api/pipeline]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// // ── PATCH: update checkpoint after each step ──────────────────────────────────
// export async function PATCH(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { id, ...fields } = body

//     if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

//     const COL_MAP: Record<string, string> = {
//       lastStep:           'last_step',
//       errorStep:          'error_step',
//       errorMessage:       'error_message',
//       audioUrl:           'audio_url',
//       transcript:         'transcript',
//       segments:           'segments',
//       formattedTranscript:'fmt_transcript',
//       procData:           'proc_data',
//       participants:       'participants',
//       meetingId:          'meeting_id',
//     }

//     const updates: string[] = []
//     const params:  any[]    = []

//     for (const [key, col] of Object.entries(COL_MAP)) {
//       if (fields[key] !== undefined) {
//         updates.push(`${col} = ?`)
//         // JSON-stringify objects/arrays
//         const val = fields[key]
//         params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
//       }
//     }

//     if (updates.length === 0) {
//       return NextResponse.json({ ok: true })
//     }

//     params.push(id)
//     const db = await getPool()
//     await db.execute(
//       `UPDATE pipeline_checkpoints SET ${updates.join(', ')} WHERE id = ?`,
//       params
//     )

//     return NextResponse.json({ ok: true })
//   } catch (err: any) {
//     console.error('[PATCH /api/pipeline]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// // ── GET: load checkpoint ──────────────────────────────────────────────────────
// export async function GET(req: NextRequest) {
//   try {
//     const id = new URL(req.url).searchParams.get('id')
//     if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

//     const db = await getPool()
//     const [[row]]: any = await db.execute(
//       'SELECT * FROM pipeline_checkpoints WHERE id = ? LIMIT 1',
//       [id]
//     )

//     if (!row) return NextResponse.json({ checkpoint: null })

//     // Parse JSON fields
//     const parseJSON = (v: any) => {
//       if (!v) return null
//       if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
//       return v
//     }

//     return NextResponse.json({
//       checkpoint: {
//         id:                 row.id,
//         title:              row.title,
//         mode:               row.mode,
//         platform:           row.platform,
//         meetCode:           row.meet_code,
//         zoomId:             row.zoom_id,
//         recordedAt:         row.recorded_at,
//         durationSec:        row.duration_sec,
//         sizeKb:             row.audio_size_kb,
//         lastStep:           row.last_step,
//         errorStep:          row.error_step,
//         errorMessage:       row.error_message,
//         audioUrl:           row.audio_url,
//         transcript:         row.transcript,
//         segments:           parseJSON(row.segments),
//         formattedTranscript:row.fmt_transcript,
//         procData:           parseJSON(row.proc_data),
//         participants:       parseJSON(row.participants),
//         meetingId:          row.meeting_id,
//         createdAt:          row.created_at,
//       }
//     })
//   } catch (err: any) {
//     console.error('[GET /api/pipeline]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// // ── DELETE: clear checkpoint on success ───────────────────────────────────────
// export async function DELETE(req: NextRequest) {
//   try {
//     const id = new URL(req.url).searchParams.get('id')
//     if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

//     const db = await getPool()
//     await db.execute('DELETE FROM pipeline_checkpoints WHERE id = ?', [id])
//     return NextResponse.json({ ok: true })
//   } catch (err: any) {
//     console.error('[DELETE /api/pipeline]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// src/app/api/pipeline/route.ts
// CRUD for pipeline checkpoints
//
// POST   /api/pipeline           → create checkpoint, returns { id }
// PATCH  /api/pipeline           → update checkpoint by id
// GET    /api/pipeline?id=N      → get checkpoint by id
// DELETE /api/pipeline?id=N      → delete checkpoint (on success)

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser, hasAdminRole, hasAnyPermission } from '@/lib/authz'

// Increase body limit — transcripts can be large for long meetings


function pipelineUnauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

function pipelineForbidden() {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

function getAuthorizedPipelineUser(req: NextRequest): any | NextResponse {
  const user = getSessionUser(req)
  if (!user) return pipelineUnauthorized()
  if (hasAnyPermission(user, ['meetings.view']) || hasAdminRole(user, 'lower')) {
    return user
  }
  return pipelineForbidden()
}

// ── POST: create new checkpoint ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = getAuthorizedPipelineUser(req)
    if (user instanceof NextResponse) return user

    const body = await req.json()
    const db   = await getPool()

    const [result]: any = await db.execute(
      `INSERT INTO pipeline_checkpoints
         (title, mode, platform, meet_code, zoom_id,
          recorded_at, duration_sec, audio_size_kb, participants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title        || null,
        body.mode         || 'online',
        body.platform     || null,
        body.meetCode     || null,
        body.zoomId       || null,
        body.recordedAt   || new Date().toISOString(),
        body.durationSec  || 0,
        body.sizeKb       || 0,
        body.participants ? JSON.stringify(body.participants) : null,
      ]
    )

    return NextResponse.json({ id: result.insertId })
  } catch (err: any) {
    console.error('[POST /api/pipeline]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── PATCH: update checkpoint after each step ──────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = getAuthorizedPipelineUser(req)
    if (user instanceof NextResponse) return user

    const body = await req.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const COL_MAP: Record<string, string> = {
      lastStep:           'last_step',
      errorStep:          'error_step',
      errorMessage:       'error_message',
      audioUrl:           'audio_url',
      uploadSessionUrl:   'upload_session_url',   // Drive resumable session URL
      transcript:         'transcript',
      segments:           'segments',
      formattedTranscript:'fmt_transcript',
      procData:           'proc_data',
      participants:       'participants',
      meetingId:          'meeting_id',
    }

    const updates: string[] = []
    const params:  any[]    = []

    for (const [key, col] of Object.entries(COL_MAP)) {
      if (fields[key] !== undefined) {
        updates.push(`${col} = ?`)
        // JSON-stringify objects/arrays
        const val = fields[key]
        params.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ ok: true })
    }

    params.push(id)
    const db = await getPool()
    await db.execute(
      `UPDATE pipeline_checkpoints SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[PATCH /api/pipeline]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET: load checkpoint ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = getAuthorizedPipelineUser(req)
    if (user instanceof NextResponse) return user

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = await getPool()
    const [[row]]: any = await db.execute(
      'SELECT * FROM pipeline_checkpoints WHERE id = ? LIMIT 1',
      [id]
    )

    if (!row) return NextResponse.json({ checkpoint: null })

    // Parse JSON fields
    const parseJSON = (v: any) => {
      if (!v) return null
      if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
      return v
    }

    return NextResponse.json({
      checkpoint: {
        id:                 row.id,
        title:              row.title,
        mode:               row.mode,
        platform:           row.platform,
        meetCode:           row.meet_code,
        zoomId:             row.zoom_id,
        recordedAt:         row.recorded_at,
        durationSec:        row.duration_sec,
        sizeKb:             row.audio_size_kb,
        lastStep:           row.last_step,
        errorStep:          row.error_step,
        errorMessage:       row.error_message,
        audioUrl:           row.audio_url,
        uploadSessionUrl:   row.upload_session_url,
        transcript:         row.transcript,
        segments:           parseJSON(row.segments),
        formattedTranscript:row.fmt_transcript,
        procData:           parseJSON(row.proc_data),
        participants:       parseJSON(row.participants),
        meetingId:          row.meeting_id,
        createdAt:          row.created_at,
      }
    })
  } catch (err: any) {
    console.error('[GET /api/pipeline]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── DELETE: clear checkpoint on success ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthorizedPipelineUser(req)
    if (user instanceof NextResponse) return user

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const db = await getPool()
    await db.execute('DELETE FROM pipeline_checkpoints WHERE id = ?', [id])
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[DELETE /api/pipeline]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
