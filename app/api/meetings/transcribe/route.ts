// src/app/api/meetings/transcribe/route.ts
// Transcription + diarization. Magic-byte format detection, terminal-422 for
// bad audio, whisper-1 fallback for truncated (broken-header) recordings.

import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getMeetingSession,
  meetingUnauthorized,
  parseMeetingAudioUrl,
} from '@/lib/meetings-auth'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'

const openai          = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' })
const OPENAI_MAX_BYTES = 24 * 1024 * 1024
const MAX_RETRIES      = 3

// ── Transcription prompt ──────────────────────────────────────────────────────
const TRANSCRIPTION_PROMPT = `Transcription context: Real-world Indian business meeting. Multiple speakers. Audio may contain Hindi, English, or Hinglish (mixed Hindi-English).

RULES:
- Preserve every speaker turn as a separate line
- Never merge two speakers into one sentence
- Preserve short acknowledgements: haan, hmm, okay, theek hai, accha, bilkul
- Preserve hesitations: uh, um, matlab, actually
- Preserve names exactly as spoken
- Punctuate aggressively for conversational clarity
- Prefer 1–2 sentence utterances
- Do not add speaker labels or markdown`

// ── Raw multipart builder — no FormData dependency ────────────────────────────
function buildMultipart(
  fields:      Record<string, string>,
  fileBuffer:  Buffer,
  fileName:    string,
  contentType: string,
) {
  const boundary = `----FormBoundary${Date.now().toString(16)}`
  const CRLF     = '\r\n'
  const parts: Buffer[] = []

  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${name}"${CRLF}` +
      CRLF + `${value}${CRLF}`
    ))
  }
  parts.push(Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
    `Content-Type: ${contentType}${CRLF}` + CRLF
  ))
  parts.push(fileBuffer)
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`))

  return {
    body:        Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

// ── Derive safe extension from MIME — never from URL path ────────────────────
function extFromMime(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg'))  return 'ogg'
  if (mime.includes('wav'))  return 'wav'
  if (mime.includes('mp4'))  return 'mp4'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('flac')) return 'flac'
  if (mime.includes('m4a'))  return 'm4a'
  return 'webm'
}

// ── Detect audio format from the file's MAGIC BYTES (the reliable way) ────────
// mimeType from Drive is often generic (application/octet-stream), which made
// extFromMime fall back to 'webm' — OpenAI then tried to decode MP3/M4A bytes
// as WebM, failed, and returned an empty transcript ("too short"). Sniffing the
// actual bytes fixes this for every format.
function sniffAudioFormat(buf: Buffer): { ext: string; mime: string } {
  // MP3: ID3 tag ("ID3") or MPEG frame sync (0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2)
  if (buf.length >= 3 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    return { ext: 'mp3', mime: 'audio/mpeg' }
  }
  if (buf.length >= 2 && buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) {
    return { ext: 'mp3', mime: 'audio/mpeg' }
  }
  // WAV: "RIFF"...."WAVE"
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WAVE') {
    return { ext: 'wav', mime: 'audio/wav' }
  }
  // OGG: "OggS"
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'OggS') {
    return { ext: 'ogg', mime: 'audio/ogg' }
  }
  // FLAC: "fLaC"
  if (buf.length >= 4 && buf.toString('ascii', 0, 4) === 'fLaC') {
    return { ext: 'flac', mime: 'audio/flac' }
  }
  // M4A / MP4: ftyp box at offset 4
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12)
    if (brand.startsWith('M4A') || brand.startsWith('mp4') || brand.startsWith('isom')) {
      return { ext: 'm4a', mime: 'audio/mp4' }
    }
    return { ext: 'mp4', mime: 'audio/mp4' }
  }
  // WebM / Matroska: EBML header 0x1A 0x45 0xDF 0xA3
  if (buf.length >= 4 && buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
    return { ext: 'webm', mime: 'audio/webm' }
  }
  // Unknown — fall back to mp3 (most permissive for OpenAI), not webm
  return { ext: 'mp3', mime: 'audio/mpeg' }
}

// ── Diarization using GPT-4o ──────────────────────────────────────────────────
async function diarize(
  transcript:    string,
  participants:  { name: string; role?: string }[],
  meetingTitle:  string,
): Promise<string> {
  const participantNames = participants.length
    ? participants.map(p => p.name).join(', ')
    : 'Unknown participants'

//   const prompt = `You are analyzing a meeting transcript to identify who said what.

// Meeting: "${meetingTitle || 'Unknown'}"
// Known Participants: ${participantNames}

// Raw transcript:
// ${transcript}

// Instructions:
// - Attribute each line to a participant based on:
//   1. Direct address ("Satyam, please...") — person addressed is NOT the speaker
//   2. First-person statements ("I will...") — speaker is taking ownership
//   3. Questions ("Can you handle...?") — speaker is assigning
//   4. Response patterns ("Yes, sure", "Got it") — likely the person just addressed
//   5. Topic continuity — same speaker usually continues related thoughts
// - If speaker is unclear, use "Unknown"
// - Do NOT invent names not in the participant list
// - Keep it concise — just attribute each utterance

// Return ONLY a JSON array, no markdown:
// [
//   { "speaker": "Name or Unknown", "text": "what they said" },
//   ...
// ]`

const prompt = `# Production-Grade Speaker Attribution / Diarization Prompt

You are an expert conversational attribution engine.

Your task is to identify the most likely speaker for each utterance in a meeting transcript.

## INPUTS

Meeting Title:
"${meetingTitle || 'Unknown'}"

Known Participants:
${participantNames}

Raw Transcript:
${transcript}

---

## PRIMARY OBJECTIVE

For each utterance in the transcript:

1. Determine the most likely speaker
2. Preserve the original text exactly
3. Return structured JSON only
4. Never invent participant names
5. Use "Unknown" when attribution confidence is insufficient

---

## SPEAKER ATTRIBUTION RULES

Apply the following reasoning rules in priority order.

### 1. Direct Address Detection

If a participant name is directly addressed:

Example:
"Satyam, can you handle deployment?"

Then:
- "Satyam" is likely NOT the speaker
- The speaker is likely someone else assigning or asking

---

### 2. Response Pairing

Short acknowledgements typically belong to the person previously addressed.

Examples:
- "Yes"
- "Sure"
- "Got it"
- "Will do"
- "Okay"
- "Makes sense"

Attribute these to:
- the participant most recently asked/questioned/addressed

unless strong evidence suggests otherwise.

---

### 3. First-Person Ownership

Statements containing ownership language indicate the speaker is volunteering or reporting their own actions.

Examples:
- "I will handle it"
- "I already sent that"
- "I'm working on it"

Attribute to:
- the participant whose responsibilities or context best match the statement

---

### 4. Conversational Continuity

Consecutive related statements usually belong to the same speaker unless:
- interrupted
- directly answered
- another participant is explicitly addressed

Maintain continuity when topic flow strongly suggests the same speaker.

---

### 5. Question → Answer Relationships

Questions are often followed by answers from another participant.

Example:
A: "Can you send the report?"
B: "Yes, I'll do it."

Avoid assigning both utterances to the same speaker unless clearly justified.

---

### 6. Expertise / Responsibility Matching

Use contextual clues:
- engineering topics
- product topics
- scheduling
- finance
- ownership references

to infer the most likely speaker ONLY when evidence is reasonably strong.

Do NOT over-infer.

---

### 7. Ambiguity Handling

Use "Unknown" when:
- multiple participants are equally plausible
- context is insufficient
- attribution confidence is low
- transcript fragments are incomplete/noisy

Prefer "Unknown" over incorrect attribution.

---

## TRANSCRIPT NORMALIZATION RULES

Before attribution:

- Treat each newline or transcript segment as a potential utterance
- Ignore filler noise when irrelevant:
  - "um"
  - "uh"
  - "[noise]"
  - "[inaudible]"
- Preserve meaningful conversational text exactly
- Do not rewrite or summarize utterances

---

## HARD CONSTRAINTS

- NEVER invent names
- NEVER create participants not listed
- NEVER merge unrelated utterances
- NEVER alter utterance wording
- NEVER explain reasoning
- NEVER output markdown
- NEVER output anything except valid JSON

---

## OUTPUT FORMAT

Return ONLY a JSON array.

Schema:

[
  {
    "speaker": "Participant Name or Unknown",
    "text": "original utterance text"
  }
]

---

## OUTPUT QUALITY REQUIREMENTS

- Ensure valid parsable JSON
- Preserve utterance order
- Preserve exact transcript wording
- Keep attribution concise and deterministic
- Use "Unknown" conservatively but appropriately
- Avoid speculative attribution

---

## EXAMPLE

Participants:
["Satyam", "Rahul", "Priya"]

Transcript:
Rahul can you send the deck?
Yeah I'll send it today
Thanks

Expected Output:
[
  {
    "speaker": "Priya",
    "text": "Rahul can you send the deck?"
  },
  {
    "speaker": "Rahul",
    "text": "Yeah I'll send it today"
  },
  {
    "speaker": "Priya",
    "text": "Thanks"
  }
]
`

  try {
    const response = await openai.chat.completions.create({
      model:       'gpt-4.1-nano',
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'You are a meeting transcript analyzer. Return only valid JSON arrays.' },
        { role: 'user',   content: prompt },
      ],
      max_tokens: 16000,   // gpt-4.1-nano cap; 1000000 was invalid
    })

    const raw     = response.choices[0].message.content || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const attributed: { speaker: string; text: string }[] = JSON.parse(cleaned)

    // Format: "Speaker Name: text"
    return attributed
      .map(s => `${s.speaker}: ${s.text}`)
      .join('\n')

  } catch (err) {
    console.warn('[Transcribe] Diarization failed, using plain transcript:', err)
    // Non-fatal — return plain transcript as fallback
    return transcript
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.transcribe', session.email, 12, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const body = await req.json()
    const { audioUrl, participants = [], meetingTitle = '' } = body

    if (!audioUrl) {
      return NextResponse.json({ error: 'No audioUrl provided' }, { status: 400 })
    }

    const parsedAudioUrl = parseMeetingAudioUrl(audioUrl, req.nextUrl.origin)
    if (!parsedAudioUrl) {
      return NextResponse.json(
        { error: 'audioUrl must be a CRM meeting audio URL' },
        { status: 400 },
      )
    }
    const resolvedUrl = parsedAudioUrl.toString()

    console.log(`[Transcribe] Fetching: ${resolvedUrl}`)

    const audioRes = await fetch(resolvedUrl, {
      headers: {
        cookie: req.headers.get('cookie') || '',
      },
    })
    if (!audioRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch audio: ${audioRes.status} ${audioRes.statusText}` },
        { status: 502 }
      )
    }

    const audioBuffer    = Buffer.from(await audioRes.arrayBuffer())
    const mimeFromHeader = audioRes.headers.get('content-type') || ''

    // Detect REAL format from magic bytes — don't trust Drive's mimeType header,
    // which is often generic and caused empty transcripts ("too short").
    const sniffed  = sniffAudioFormat(audioBuffer)
    const mimeType = sniffed.mime
    const ext      = sniffed.ext
    const fileName = `recording.${ext}`

    console.log(`[Transcribe] ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB | header-mime: "${mimeFromHeader}" | sniffed: ${mimeType} (.${ext}) | ${fileName}`)

    // Guard: empty / tiny download (proxy returned an error page, not audio)
    if (audioBuffer.length < 2048) {
      return NextResponse.json(
        { error: `Audio download too small (${audioBuffer.length} bytes) — the audio proxy may have returned an error instead of the file.` },
        { status: 502 }
      )
    }

    // ── Step 1: Transcribe ────────────────────────────────────────────────
    const chunks = splitIntoChunks(audioBuffer, OPENAI_MAX_BYTES)
    console.log(`[Transcribe] ${chunks.length} chunk(s)`)

    const chunkResults = await Promise.all(
      chunks.map((chunk, i) => transcribeChunk(chunk, i, chunks.length, fileName, mimeType))
    )

    let fullText         = ''
    let totalDuration    = 0
    let detectedLanguage = ''

    for (const result of chunkResults) {
      if (!result.ok) {
        console.warn('[Transcribe] Skipping failed chunk:', result.error)
        continue
      }
      detectedLanguage  = detectedLanguage || result.data.language || ''
      totalDuration    += result.data.duration || 0
      fullText         += (fullText ? ' ' : '') + (result.data.text || '')
    }

    console.log(`[Transcribe] Raw transcript: ${fullText.length} chars, reported duration ${Math.round(totalDuration)}s`)

    // ── Truncation guard ──────────────────────────────────────────────────────
    // If the file is large but the transcript/duration is tiny, the duration
    // HEADER was likely broken (screen-lock interruption). gpt-4o-transcribe
    // stopped early. Re-transcribe the FULL stream with whisper-1, which ignores
    // the bad header. Heuristic: > 3MB of audio but < 90s transcribed.
    const looksTruncated =
      chunks.length === 1 &&
      audioBuffer.length > 3 * 1024 * 1024 &&
      totalDuration > 0 && totalDuration < 90

    if (looksTruncated) {
      console.warn(`[Transcribe] Suspected truncation (${(audioBuffer.length/1024/1024).toFixed(1)}MB but only ${Math.round(totalDuration)}s). Retrying with whisper-1...`)
      const w = await transcribeWithWhisper(chunks[0], fileName, mimeType)
      if (w.ok && w.text.trim() && w.duration > totalDuration) {
        console.log(`[Transcribe] whisper-1 recovered full audio: ${Math.round(w.duration)}s, ${w.text.length} chars`)
        fullText      = w.text
        totalDuration = w.duration
      }
    }

    if (!fullText.trim()) {
      return NextResponse.json(
        {
          error: 'Could not transcribe the audio. It may have echo, feedback, or be too quiet. ' +
                 'Please re-record in a quieter setting (mute when not speaking). ' +
                 `(format: ${mimeType}, ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB)`,
          code: 'EMPTY_TRANSCRIPT',   // ← TERMINAL: client must NOT retry
          terminal: true,
        },
        { status: 422 }
      )
    }

    // ── Step 2: Diarize — runs only if participants are provided ──────────
    // If no participants passed, formattedTranscript = plain transcript
    let formattedTranscript = fullText

    if (participants.length > 0) {
      console.log(`[Transcribe+Diarize] Running diarization with ${participants.length} participants`)
      formattedTranscript = await diarize(fullText, participants, meetingTitle)
      console.log(`[Transcribe+Diarize] Done. ${formattedTranscript.length} chars`)
    } else {
      console.log('[Transcribe] No participants provided — skipping diarization')
    }

    return NextResponse.json({
      transcript:          fullText,            // raw transcript (always present)
      formattedTranscript,                      // speaker-attributed (or same as transcript)
      detected_language:   detectedLanguage,
      duration_sec:        Math.round(totalDuration),
      segments:            [],                  // gpt-4o-transcribe json format has no segments
      diarized:            participants.length > 0,
    })

  } catch (err: any) {
    console.error('[/api/meetings/transcribe]', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}

function splitIntoChunks(buffer: Buffer, maxBytes: number): Buffer[] {
  if (buffer.length <= maxBytes) return [buffer]
  const chunks: Buffer[] = []
  let offset = 0
  while (offset < buffer.length) {
    chunks.push(buffer.slice(offset, offset + maxBytes))
    offset += maxBytes
  }
  return chunks
}

// ── Fallback: whisper-1 transcription ─────────────────────────────────────────
// gpt-4o-transcribe can truncate when a file's duration HEADER is wrong (e.g. a
// recording interrupted by screen-lock: 35 min of audio but header says 1 min).
// whisper-1 decodes the actual audio stream and ignores the bad header, so it
// recovers the full transcript. Used as a fallback when truncation is detected.
async function transcribeWithWhisper(
  chunk: Buffer, fileName: string, mimeType: string,
): Promise<{ ok: true; text: string; duration: number } | { ok: false; error: string }> {
  try {
    const { body, contentType } = buildMultipart(
      { model: 'whisper-1', response_format: 'verbose_json' },
      chunk, fileName, mimeType,
    )
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': contentType },
      body,
    })
    if (!res.ok) return { ok: false, error: await res.text() }
    const data = await res.json()
    return { ok: true, text: data.text || '', duration: data.duration || 0 }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

async function transcribeChunk(
  chunk:       Buffer,
  index:       number,
  total:       number,
  fileName:    string,
  mimeType:    string,
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  let lastError = ''
  const ext           = fileName.split('.').pop() || 'webm'
  const chunkFileName = total === 1 ? fileName : `chunk_${index + 1}_of_${total}.${ext}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { body, contentType: ct } = buildMultipart(
        {
          model:           'gpt-4o-transcribe',
          prompt:          TRANSCRIPTION_PROMPT,
          response_format: 'json',
          // verbose_json + timestamp_granularities not supported by gpt-4o-transcribe
        },
        chunk, chunkFileName, mimeType,
      )

      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method:  'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': ct },
        body,
      })

      if (!res.ok) {
        lastError = await res.text()
        console.warn(`[Transcribe] Chunk ${index+1}/${total} attempt ${attempt} (${res.status}):`, lastError)
        if (res.status < 500 && res.status !== 429) break
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
        continue
      }

      const data = await res.json()
      console.log(`[Transcribe] Chunk ${index+1}/${total} OK — "${(data.text || '').substring(0, 60)}..."`)
      return { ok: true, data: { text: data.text || '', language: data.language || '', duration: data.duration || 0 } }

    } catch (err: any) {
      lastError = err.message
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)))
    }
  }
  return { ok: false, error: lastError }
}
