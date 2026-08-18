// // src/app/api/meetings/tasks/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import { getPool } from '@/lib/db'

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url)
//     const meeting_id = searchParams.get('meeting_id')
//     const status     = searchParams.get('status')
//     const priority   = searchParams.get('priority')
//     const assignee   = searchParams.get('assignee')
//     const flagged    = searchParams.get('flagged')
//     const page       = parseInt(searchParams.get('page')  || '1')
//     const limit      = parseInt(searchParams.get('limit') || '50')
//     const offset     = (page - 1) * limit

//     const conditions: string[] = []
//     const params:     any[]    = []

//     if (meeting_id) { conditions.push('meeting_id = ?');  params.push(meeting_id) }
//     if (status)     { conditions.push('status = ?');      params.push(status) }
//     if (priority)   { conditions.push('priority = ?');    params.push(priority) }
//     if (assignee)   { conditions.push('assignee LIKE ?'); params.push(`%${assignee}%`) }
//     if (flagged === 'true') { conditions.push('flagged = 1') }

//     const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

//     const db = await getPool()
//     const [tasks]: any = await db.execute(
//       `SELECT * FROM meeting_tasks
//        ${where}
//        ORDER BY flagged DESC, FIELD(priority,'high','medium','low'), deadline ASC, date DESC
//        LIMIT ? OFFSET ?`,
//       [...params, limit, offset]
//     )

//     const [[{ total }]]: any = await db.execute(
//       `SELECT COUNT(*) as total FROM meeting_tasks ${where}`, params
//     )

//     const [[{ flagged_count }]]: any = await db.execute(
//       `SELECT COUNT(*) as flagged_count FROM meeting_tasks WHERE flagged = 1 AND reviewed = 0${meeting_id ? ' AND meeting_id = ?' : ''}`,
//       meeting_id ? [meeting_id] : []
//     )

//     return NextResponse.json({ tasks, total, page, limit, flagged_count })

//   } catch (err: any) {
//     console.error('[GET /api/meetings/tasks]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const {
//       meeting_id, meeting_title, task, priority,
//       assignee, assigned_by, deadline,
//     } = body

//     if (!meeting_id || !task) {
//       return NextResponse.json({ error: 'meeting_id and task are required' }, { status: 400 })
//     }

//     const db = await getPool()
//     const today = new Date().toISOString().split('T')[0]

//     const [result]: any = await db.execute(
//       `INSERT INTO meeting_tasks
//          (meeting_id, meeting_title, task, priority, assignee, assigned_by,
//           assigned_by_name, deadline, status, date,
//           confidence_score, flagged, reviewed)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, 1.0, 0, 1)`,
//       [
//         meeting_id,
//         meeting_title || 'Manual Task',
//         task,
//         ['high','medium','low'].includes(priority) ? priority : 'medium',
//         assignee || null,
//         assigned_by || null,
//         assigned_by || null,
//         deadline   || null,
//         today,
//       ]
//     )

//     const [[inserted]]: any = await db.execute(
//       'SELECT * FROM meeting_tasks WHERE id = ?', [result.insertId]
//     )

//     return NextResponse.json({ task: inserted, id: result.insertId })

//   } catch (err: any) {
//     console.error('[POST /api/meetings/tasks]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// export async function PATCH(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { id, status, priority, assignee, deadline, task, reviewed, flagged } = body

//     if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })

//     const updates: string[] = []
//     const params:  any[]    = []

//     if (status   !== undefined) { updates.push('status = ?');   params.push(status) }
//     if (priority !== undefined) { updates.push('priority = ?'); params.push(priority) }
//     if (assignee !== undefined) { updates.push('assignee = ?'); params.push(assignee) }
//     if (deadline !== undefined) { updates.push('deadline = ?'); params.push(deadline || null) }
//     if (task     !== undefined) { updates.push('task = ?');     params.push(task) }
//     if (reviewed !== undefined) { updates.push('reviewed = ?'); params.push(reviewed ? 1 : 0) }
//     if (flagged  !== undefined) { updates.push('flagged = ?');  params.push(flagged  ? 1 : 0) }

//     if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

//     params.push(id)
//     const db = await getPool()
//     await db.execute(`UPDATE meeting_tasks SET ${updates.join(', ')} WHERE id = ?`, params)

//     const [[updated]]: any = await db.execute('SELECT * FROM meeting_tasks WHERE id = ?', [id])
//     return NextResponse.json({ task: updated })

//   } catch (err: any) {
//     console.error('[PATCH /api/meetings/tasks]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// export async function DELETE(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { id } = body
//     if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
//     const db = await getPool()
//     await db.execute('DELETE FROM meeting_tasks WHERE id = ?', [id])
//     return NextResponse.json({ success: true, deleted_id: id })
//   } catch (err: any) {
//     console.error('[DELETE /api/meetings/tasks]', err)
//     return NextResponse.json({ error: err.message }, { status: 500 })
//   }
// }

// src/app/api/meetings/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import {
  canAccessMeetingOwner,
  getMeetingSession,
  meetingForbidden,
  meetingUnauthorized,
} from '@/lib/meetings-auth'

async function loadMeetingForAccess(db: any, meetingId: unknown) {
  const [[meeting]]: any = await db.execute(
    'SELECT id, recorded_by FROM meetings WHERE id = ?',
    [meetingId]
  )
  return meeting || null
}

async function loadTaskForAccess(db: any, taskId: unknown) {
  const [[row]]: any = await db.execute(
    `SELECT t.id, t.meeting_id, m.recorded_by
     FROM meeting_tasks t
     LEFT JOIN meetings m ON m.id = t.meeting_id
     WHERE t.id = ?`,
    [taskId]
  )
  return row || null
}

export async function GET(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const { searchParams } = new URL(req.url)
    const meeting_id = searchParams.get('meeting_id')
    const status     = searchParams.get('status')
    const priority   = searchParams.get('priority')
    const assignee   = searchParams.get('assignee')
    const flagged    = searchParams.get('flagged')
    const page       = parseInt(searchParams.get('page')  || '1')
    const limit      = parseInt(searchParams.get('limit') || '50')
    const offset     = (page - 1) * limit

    const conditions: string[] = []
    const params:     any[]    = []
    const db = await getPool()

    if (meeting_id) {
      const meeting = await loadMeetingForAccess(db, meeting_id)
      if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
      if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
        return meetingForbidden('You do not have access to this meeting.')
      }
      conditions.push('meeting_id = ?')
      params.push(meeting_id)
    } else if (!session.isAdmin) {
      conditions.push('meeting_id IN (SELECT id FROM meetings WHERE LOWER(recorded_by) = ?)')
      params.push(session.email)
    }
    if (status)     { conditions.push('status = ?');      params.push(status) }
    if (priority)   { conditions.push('priority = ?');    params.push(priority) }
    if (assignee)   { conditions.push('assignee LIKE ?'); params.push(`%${assignee}%`) }
    if (flagged === 'true') { conditions.push('flagged = 1') }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [tasks]: any = await db.execute(
      `SELECT * FROM meeting_tasks
       ${where}
       ORDER BY flagged DESC, FIELD(priority,'high','medium','low'), deadline ASC, date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    const [[{ total }]]: any = await db.execute(
      `SELECT COUNT(*) as total FROM meeting_tasks ${where}`, params
    )

    const flaggedConditions = ['flagged = 1', 'reviewed = 0']
    const flaggedParams: any[] = []
    if (meeting_id) {
      flaggedConditions.push('meeting_id = ?')
      flaggedParams.push(meeting_id)
    } else if (!session.isAdmin) {
      flaggedConditions.push('meeting_id IN (SELECT id FROM meetings WHERE LOWER(recorded_by) = ?)')
      flaggedParams.push(session.email)
    }

    const [[{ flagged_count }]]: any = await db.execute(
      `SELECT COUNT(*) as flagged_count FROM meeting_tasks WHERE ${flaggedConditions.join(' AND ')}`,
      flaggedParams
    )

    return NextResponse.json({ tasks, total, page, limit, flagged_count })

  } catch (err: any) {
    console.error('[GET /api/meetings/tasks]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const body = await req.json()
    const {
      meeting_id, meeting_title, task, priority,
      assignee, assigned_by, deadline,
    } = body

    if (!meeting_id || !task) {
      return NextResponse.json({ error: 'meeting_id and task are required' }, { status: 400 })
    }

    const db = await getPool()
    const meeting = await loadMeetingForAccess(db, meeting_id)
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
      return meetingForbidden('You do not have permission to add tasks to this meeting.')
    }

    const today = new Date().toISOString().split('T')[0]

    const [result]: any = await db.execute(
      `INSERT INTO meeting_tasks
         (meeting_id, meeting_title, task, priority, assignee, assigned_by,
          assigned_by_name, deadline, status, date,
          confidence_score, flagged, reviewed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?, 1.0, 0, 1)`,
      [
        meeting_id,
        meeting_title || 'Manual Task',
        task,
        ['high','medium','low'].includes(priority) ? priority : 'medium',
        assignee || null,
        session.email,
        session.name || assigned_by || null,
        deadline   || null,
        today,
      ]
    )

    const [[inserted]]: any = await db.execute(
      'SELECT * FROM meeting_tasks WHERE id = ?', [result.insertId]
    )

    return NextResponse.json({ task: inserted, id: result.insertId })

  } catch (err: any) {
    console.error('[POST /api/meetings/tasks]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const body = await req.json()
    const { id, status, priority, assignee, deadline, task, reviewed, flagged, delegated, ht_raised, emailed } = body

    if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })

    const db = await getPool()
    const taskRow = await loadTaskForAccess(db, id)
    if (!taskRow) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (!canAccessMeetingOwner(session, taskRow.recorded_by)) {
      return meetingForbidden('You do not have permission to update this task.')
    }

    const updates: string[] = []
    const params:  any[]    = []

    if (status    !== undefined) { updates.push('status = ?');    params.push(status) }
    if (priority  !== undefined) { updates.push('priority = ?');  params.push(priority) }
    if (assignee  !== undefined) { updates.push('assignee = ?');  params.push(assignee) }
    if (deadline  !== undefined) { updates.push('deadline = ?');  params.push(deadline || null) }
    if (task      !== undefined) { updates.push('task = ?');      params.push(task) }
    if (reviewed  !== undefined) { updates.push('reviewed = ?');  params.push(reviewed  ? 1 : 0) }
    if (flagged   !== undefined) { updates.push('flagged = ?');   params.push(flagged   ? 1 : 0) }
    if (delegated !== undefined) { updates.push('delegated = ?'); params.push(delegated ? 1 : 0) }
    if (ht_raised !== undefined) { updates.push('ht_raised = ?'); params.push(ht_raised ? 1 : 0) }
    if (emailed   !== undefined) { updates.push('emailed = ?');   params.push(emailed   ? 1 : 0) }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    params.push(id)
    await db.execute(`UPDATE meeting_tasks SET ${updates.join(', ')} WHERE id = ?`, params)

    const [[updated]]: any = await db.execute('SELECT * FROM meeting_tasks WHERE id = ?', [id])
    return NextResponse.json({ task: updated })

  } catch (err: any) {
    console.error('[PATCH /api/meetings/tasks]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 })
    const db = await getPool()
    const taskRow = await loadTaskForAccess(db, id)
    if (!taskRow) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (!canAccessMeetingOwner(session, taskRow.recorded_by)) {
      return meetingForbidden('You do not have permission to delete this task.')
    }

    await db.execute('DELETE FROM meeting_tasks WHERE id = ?', [id])
    return NextResponse.json({ success: true, deleted_id: id })
  } catch (err: any) {
    console.error('[DELETE /api/meetings/tasks]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
