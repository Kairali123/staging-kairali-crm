// src/app/api/meetings/diarize/route.ts
// Pseudo-diarization using GPT-4o
// Takes Whisper segments + participant list → returns speaker-attributed transcript
// Since Whisper doesn't support diarization, we use GPT-4o to infer speakers
// from conversation patterns, address patterns, and the known participant list

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' })

export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.diarize', session.email, 30, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const body = await req.json()
    const { segments, participants, meetingTitle } = body

    // segments = Whisper verbose_json segments: [{ start, end, text }]
    // participants = [{ name, email, role }] from Meet/Zoom API or manual input

    if (!segments?.length) {
      return NextResponse.json({ error: 'segments required' }, { status: 400 })
    }

    // Build raw transcript with timestamps
    const rawTranscript = segments
      .map((s: any) => `[${Math.floor(s.start)}s] ${s.text.trim()}`)
      .join('\n')

    const participantNames = participants?.length
      ? participants.map((p: any) => p.name).join(', ')
      : 'Unknown participants'

    const prompt = `You are analyzing a meeting transcript to identify who said what.

Meeting: "${meetingTitle || 'Unknown'}"
Known Participants: ${participantNames}

Raw transcript with timestamps:
${rawTranscript}

Instructions:
- Attribute each line to a participant based on:
  1. Direct address ("Satyam, please...") — the person being addressed is NOT the speaker
  2. First-person statements ("I will...", "I'll send...") — speaker is taking ownership
  3. Questions directed at someone ("Can you handle...?") — speaker is assigning
  4. Response patterns ("Yes, sure", "Got it") — likely the person just addressed
  5. Topic continuity — same speaker usually continues related thoughts
- If speaker is unclear, use "Unknown"
- Do NOT invent names not in the participant list
- Keep timestamps

Return ONLY a JSON array, no markdown, no explanation:
[
  { "timestamp": "0s", "speaker": "Name or Unknown", "text": "what they said" },
  ...
]`

    const response = await openai.chat.completions.create({
      model:       'gpt-4.1-nano',
      temperature: 0.1,  // low temp for consistency
      messages: [
        { role: 'system', content: 'You are a meeting transcript analyzer. Return only valid JSON.' },
        { role: 'user',   content: prompt },
      ],
    })

    const raw = response.choices[0].message.content || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()

    let attributed: any[] = []
    try {
      attributed = JSON.parse(cleaned)
    } catch {
      console.warn('[diarize] GPT returned non-JSON, falling back to unattributed')
      // Fallback: return segments without speaker labels
      attributed = segments.map((s: any) => ({
        timestamp: `${Math.floor(s.start)}s`,
        speaker:   'Unknown',
        text:      s.text.trim(),
      }))
    }

    // Build formatted transcript for task extraction
    const formattedTranscript = attributed
      .map((s: any) => `[${s.timestamp}] ${s.speaker}: ${s.text}`)
      .join('\n')

    return NextResponse.json({
      attributed,
      formattedTranscript,
      participantCount: participants?.length || 0,
    })

  } catch (err: any) {
    console.error('[/api/meetings/diarize]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
