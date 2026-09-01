// // src/app/api/meetings/extract-tasks/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import OpenAI from "openai";
// import {getPool} from '@/lib/db'

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const SYSTEM_PROMPT = `You are a task extraction assistant for Kairali Ayurvedic Group — a wellness company with divisions KTAHV (Kerala), KAPPL (Pollachi), and Villa Raag (Goa).

// Extract ALL actionable tasks from the meeting transcript. Return ONLY a valid JSON array with no markdown, no preamble, no code fences.

// Each task object must have exactly these fields:
// {
//   "task": "clear, specific task description",
//   "priority": "high" | "medium" | "low",
//   "assignee": "person name if mentioned, or Self",
//   "deadline": "YYYY-MM-DD if mentioned, or null"
// }

// Rules:
// - Extract only concrete actionable tasks, not vague discussion points
// - If no deadline mentioned, use null
// - If no person assigned, use "Self"
// - Priority: urgent/ASAP/today = high, this week = medium, later/someday = low
// - Return empty array [] if no tasks found
// - NEVER include markdown, code fences, or any explanation text`

// export async function POST(req: NextRequest) {
//   try {
//     const pool = await getPool()
//     const body = await req.json()
//     const { meeting_id, meeting_title, transcript, assigned_by } = body

//     if (!meeting_id || !transcript) {
//       return NextResponse.json(
//         { error: 'meeting_id and transcript are required' },
//         { status: 400 }
//       )
//     }

//     // ── OpenAI API call ───────────────────────────────────────────────
//     const response = await openai.responses.create({
//       model: "gpt-4.1-nano",
//       max_output_tokens: 2000,
//        // ensures valid JSON
//       input: [
//         {
//           role: "system",
//           content: SYSTEM_PROMPT,
//         },
//         {
//           role: "user",
//           content: `Meeting: ${meeting_title || 'Untitled'}

// Transcript:
// ${transcript}`,
//         },
//       ],
//     });

//     let extracted: any[] = []

//     try {
//       const parsed = JSON.parse(response.output_text)
//       extracted = Array.isArray(parsed) ? parsed : []
//     } catch (err) {
//       console.warn('[extract-tasks] OpenAI returned non-JSON:', response.output_text)
//       extracted = []
//     }

//     if (extracted.length === 0) {
//       return NextResponse.json({ tasks_created: 0, tasks: [] })
//     }

//     const today = new Date().toISOString().split('T')[0]

//     const values = extracted.map(t => [
//       meeting_id,
//       meeting_title || 'Untitled Meeting',
//       t.task        || 'Untitled Task',
//       ['high','medium','low'].includes(t.priority) ? t.priority : 'medium',
//       t.assignee    || 'Self',
//       assigned_by   || null,
//       t.deadline    || null,
//       'todo',
//       today,
//     ])

//     const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?)').join(',')

//     await pool.execute(
//       `INSERT INTO meeting_tasks
//        (meeting_id, meeting_title, task, priority, assignee, assigned_by, deadline, status, date)
//        VALUES ${placeholders}`,
//       values.flat()
//     )

//     const [rows]: any = await pool.execute(
//       'SELECT * FROM meeting_tasks WHERE meeting_id = ? ORDER BY created_at DESC',
//       [meeting_id]
//     )

//     return NextResponse.json({
//       tasks_created: extracted.length,
//       tasks: rows
//     })

//   } catch (err: any) {
//     console.error('[/api/meetings/extract-tasks]', err)
//     return NextResponse.json(
//       { error: err.message || 'Task extraction failed' },
//       { status: 500 }
//     )
//   }
// }


// src/app/api/meetings/extract-tasks/route.ts
// Two-pass task extraction with participant list + employee list + confidence scoring
// Pass 1: Extract tasks from speaker-attributed transcript
// Pass 2: Validate names, score confidence, flag uncertain tasks

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from "openai";
import { getPool } from '@/lib/db'
import {
  canAccessMeetingOwner,
  getMeetingSession,
  meetingForbidden,
  meetingUnauthorized,
} from '@/lib/meetings-auth'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' })

// ── Fetch employee list from DB ───────────────────────────────────────────────
async function getEmployeeList(): Promise<string[]> {
  try {
    const db = await getPool()
    const [rows]: any = await db.execute(
      `SELECT name FROM users WHERE status = 'active' OR status IS NULL ORDER BY name`
    )
    return rows.map((r: any) => r.name).filter(Boolean)
  } catch (err) {
    console.warn('[extract-tasks] Could not fetch employee list:', err)
    return []
  }
}

// ── PASS 1: Extract tasks ─────────────────────────────────────────────────────
const EXTRACTION_SYSTEM = `You are a precise task extraction assistant for Kairali Ayurvedic Group.

You will receive a speaker-attributed meeting transcript and must extract ONLY concrete, actionable tasks.

Return ONLY a valid JSON array with no markdown, no preamble, no explanation.

Each task object:
{
  "task": "clear specific task description",
  "assigned_to": "exact name from participant/employee list, or 'Self' if speaker takes ownership, or 'Unknown' if unclear",
  "assigned_by": "speaker who gave the task, from transcript speaker labels",
  "priority": "high | medium | low",
  "deadline": "YYYY-MM-DD if mentioned, or null",
  "timestamp": "timestamp from transcript when task was mentioned",
  "confidence": 0.0-1.0,
  "confidence_reason": "brief explanation of confidence score",
  "context": "1 sentence of context from conversation"
}

Confidence scoring rules:
- 0.9-1.0: Explicit task with named person, clear action, deadline mentioned
- 0.7-0.8: Clear task, person named but action slightly vague, no deadline
- 0.5-0.6: Task implied, person unclear or inferred from context
- 0.3-0.4: Vague action, person unknown or external
- Below 0.5: Flag for human review

Priority rules:
- high: "urgent", "ASAP", "today", "immediately", "critical"
- medium: "this week", "soon", "please do"
- low: "whenever", "eventually", "sometime"

STRICT RULES:
- Only extract EXPLICIT actionable tasks, not discussions or mentions
- If assigned_to not in provided list → use their name but mark confidence lower
- Never hallucinate names not mentioned in transcript
- Return [] if no tasks found`

// ── PASS 2: Validate tasks ────────────────────────────────────────────────────
const VALIDATION_SYSTEM = `You are a task validation assistant for Kairali Ayurvedic Group.

You will receive extracted tasks and must validate them against the original transcript and participant list.

Return ONLY a valid JSON array with no markdown. Same schema as input but with updated fields.

For each task:
1. Verify assigned_to is a real participant or employee (check provided lists)
2. Verify assigned_by is a real speaker from the transcript
3. Confirm the task actually exists in the transcript verbatim or near-verbatim
4. Remove exact duplicate tasks
5. Adjust confidence score if needed
6. Set flagged=true if:
   - confidence < 0.6
   - assigned_to = 'Unknown'
   - name not in participant or employee list
   - task is ambiguous

Return the same JSON schema with added field:
"flagged": true|false,
"flag_reason": "reason if flagged, null otherwise"`

export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.extract_tasks', session.email, 30, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const body = await req.json()
    const {
      meeting_id,
      meeting_title,
      transcript,          // plain transcript (fallback)
      formatted_transcript, // speaker-attributed transcript (preferred)
      participants,         // from Meet/Zoom API: [{ name, email, role }]
    } = body

    if (!meeting_id) {
      return NextResponse.json({ error: 'meeting_id required' }, { status: 400 })
    }

    const db = await getPool()
    const [[meeting]]: any = await db.execute(
      'SELECT id, recorded_by FROM meetings WHERE id = ?',
      [meeting_id],
    )
    if (!meeting) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    if (!canAccessMeetingOwner(session, meeting.recorded_by)) {
      return meetingForbidden('You do not have permission to extract tasks for this meeting.')
    }

    const transcriptToUse = formatted_transcript || transcript || ''
    if (!transcriptToUse.trim()) {
      return NextResponse.json({ tasks_created: 0, tasks: [] })
    }

    // ── Get employee list from DB ─────────────────────────────────────────
    const employeeNames = await getEmployeeList()

    // Build context strings for prompts
    const participantList = participants?.length
      ? participants.map((p: any) => p.name).join(', ')
      : 'Not available'

    const employeeList = employeeNames.length
      ? employeeNames.join(', ')
      : 'Not available'

    const contextBlock = `
Meeting: ${meeting_title || 'Untitled'}
Known Meeting Participants: ${participantList}
Known Kairali Employees: ${employeeList}
Note: Tasks can be assigned to meeting participants, employees, or external people. Prioritize names from the participant and employee lists.`



    const pass1 = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      max_tokens: 100000,
      messages: [
        {
          role: "system",
          content: EXTRACTION_SYSTEM,
        },
        {
          role: "user",
          content: `${contextBlock}\n\nTranscript:\n${transcriptToUse}`,
        },
      ],
    });

    const raw1 = (pass1.choices[0].message.content || '')
      .replace(/```json|```/g, '')
      .trim()

    let extracted: any[] = []
    try {
      extracted = JSON.parse(raw1)
      if (!Array.isArray(extracted)) extracted = []
    } catch {
      console.warn('[extract-tasks] Pass 1 non-JSON:', raw1.slice(0, 200))
      extracted = []
    }

    if (extracted.length === 0) {
      return NextResponse.json({ tasks_created: 0, tasks: [] })
    }

    // ── PASS 2: Validate tasks ────────────────────────────────────────────
    const pass2 = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      max_tokens: 100000,
      messages: [
        {
          role: 'system',
          content: VALIDATION_SYSTEM,        // ← moved into messages array
        },
        {
          role: 'user',
          content: `${contextBlock}

Original Transcript:
${transcriptToUse}

Extracted Tasks to Validate:
${JSON.stringify(extracted, null, 2)}`,
        },
      ],
    })

    const raw2 = (pass2.choices[0].message.content || '')   // ← fixed response parsing
      .replace(/```json|```/g, '')
      .trim()

    let validated: any[] = []
    try {
      validated = JSON.parse(raw2)
      if (!Array.isArray(validated)) validated = extracted  // fallback to pass 1
    } catch {
      console.warn('[extract-tasks] Pass 2 non-JSON, using pass 1 results')
      validated = extracted
    }

    if (validated.length === 0) {
      return NextResponse.json({ tasks_created: 0, tasks: [] })
    }

    // ── Bulk insert into meeting_tasks ────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]
    const values = validated.map(t => [
      meeting_id,
      meeting_title || 'Untitled Meeting',
      t.task || 'Untitled Task',
      ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      t.assigned_to || 'Self',
      session.email,
      t.deadline || null,
      'todo',
      today,
      typeof t.confidence === 'number' ? Math.round(t.confidence * 100) / 100 : null,
      t.assigned_by || session.name,
      t.flagged ? 1 : 0,
      0,  // reviewed = false initially
      t.flag_reason || null,
    ])

    const placeholders = values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')

    await db.execute(
      `INSERT INTO meeting_tasks
         (meeting_id, meeting_title, task, priority, assignee, assigned_by,
          deadline, status, date,
          confidence_score, assigned_by_name, flagged, reviewed, flag_reason)
       VALUES ${placeholders}`,
      values.flat()
    )

    // Fetch saved tasks
    const [rows]: any = await db.execute(
      `SELECT * FROM meeting_tasks WHERE meeting_id = ? ORDER BY
       FIELD(priority,'high','medium','low'), created_at DESC`,
      [meeting_id]
    )

    const flaggedCount = validated.filter(t => t.flagged).length
    const highConfCount = validated.filter(t => (t.confidence || 0) >= 0.8).length

    return NextResponse.json({
      tasks_created: validated.length,
      flagged_count: flaggedCount,
      high_conf_count: highConfCount,
      tasks: rows,
    })

  } catch (err: any) {
    console.error('[/api/meetings/extract-tasks]', err)
    return NextResponse.json({ error: err.message || 'Task extraction failed' }, { status: 500 })
  }
}
