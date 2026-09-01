// src/app/api/meetings/process/route.ts
// Accepts: { transcript: string, title?: string, meeting_type?: string }
// Returns: { summary, action_items, key_decisions, participants, follow_ups }

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from "openai";
import { getMeetingSession, meetingUnauthorized } from '@/lib/meetings-auth'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'

const MAX_TRANSCRIPT_CHARS = 120_000
const MAX_CONTEXT_CHARS = 200

function normalizeBoundedText(value: unknown, maxLength: number): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

const SYSTEM_PROMPT = `You are an expert meeting notes assistant for Kairali Ayurvedic Group — a 118-year-old Ayurvedic wellness company with divisions including KTAHV (Kerala), KAPPL (Pollachi), and Villa Raag (Goa).

Your job is to extract structured notes from a raw meeting transcript and return ONLY a valid JSON object with no markdown, no preamble, no explanation.

JSON structure (strictly follow this):
{
  "summary": "2-4 paragraph overview of what was discussed",
  "action_items": [
    {
      "task": "clear description of what needs to be done",
      "owner": "person name or 'Not assigned'",
      "deadline": "mentioned deadline or 'Not specified'",
      "priority": "high | medium | low"
    }
  ],
  "key_decisions": [
    {
      "decision": "what was decided",
      "context": "brief reason or background"
    }
  ],
  "participants": [
    {
      "name": "participant name",
      "role": "their role if mentioned"
    }
  ],
  "follow_ups": [
    {
      "topic": "what needs follow-up",
      "notes": "relevant context"
    }
  ]
}

Rules:
- If a field has no data, return an empty array []
- Never include markdown code fences in output
- Keep summary professional, factual, and concise
- Infer participant names from how people address each other in the transcript
- Flag any Kairali-specific topics (bookings, leads, HR, manufacturing, wellness programs) in the summary
`

export async function POST(req: NextRequest) {
    try {
        const session = getMeetingSession(req)
        if (!session) return meetingUnauthorized()
        const limit = await checkApiRateLimit(req, 'meetings.process', session.email, 30, 60 * 60 * 1000)
        if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

        const body = await req.json()
        const { transcript, title, meeting_type } = body
        const safeTranscript = normalizeBoundedText(transcript, MAX_TRANSCRIPT_CHARS)

        if (safeTranscript.length < 20) {
            return NextResponse.json(
                { error: 'Transcript is too short or empty' },
                { status: 400 }
            )
        }

        if (typeof transcript !== 'string' || transcript.length > MAX_TRANSCRIPT_CHARS) {
            return NextResponse.json(
                { error: 'Transcript is too large' },
                { status: 413 }
            )
        }

        const safeTitle = normalizeBoundedText(title, MAX_CONTEXT_CHARS) || 'Untitled'
        const safeMeetingType = normalizeBoundedText(meeting_type, MAX_CONTEXT_CHARS) || 'online'

        // response_format: {
        //         type: "json_schema",
        //         json_schema: { ...full schema }
        //     }, // 🔥 ensures JSON output

        // ── OpenAI API call ───────────────────────────────────────────────
        const response = await openai.responses.create({
            model: "gpt-4.1-nano",
            max_output_tokens: 2000,
            
            input: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: `Meeting Title: ${safeTitle}
Type: ${safeMeetingType}

Transcript:
${safeTranscript}`,
                },
            ],
        });

        let notes: any

        try {
            notes = JSON.parse(response.output_text)
        } catch (err) {
            console.error('[OpenAI Parse Error] Raw output:', response.output_text)
            return NextResponse.json(
                {
                    error: 'Failed to parse AI response. Try again.',
                    raw: response.output_text,
                },
                { status: 500 }
            )
        }

        return NextResponse.json({
            summary: notes.summary || '',
            action_items: notes.action_items || [],
            key_decisions: notes.key_decisions || [],
            participants: notes.participants || [],
            follow_ups: notes.follow_ups || [],
        })

    } catch (err: any) {
        console.error('[/api/meetings/process]', err)
        return NextResponse.json(
            { error: err.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
