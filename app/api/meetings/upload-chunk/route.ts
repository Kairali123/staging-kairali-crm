// src/app/api/meetings/upload-chunk/route.ts
// Proxies chunk uploads to Google Drive — browser → this route → Drive
// (Direct browser→Drive is impossible: Drive resumable URLs reject CORS preflight)

import { NextRequest, NextResponse } from 'next/server'
import {
  getMeetingSession,
  isAllowedDriveUploadUrl,
  MAX_MEETING_AUDIO_BYTES,
  MAX_MEETING_AUDIO_CHUNK_BYTES,
  meetingUnauthorized,
  parsePositiveInteger,
} from '@/lib/meetings-auth'
import {
  isMeetingUploadSessionOwner,
  registerMeetingUploadedFile,
} from '@/lib/meeting-upload-sessions'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'

// Force Node.js runtime (not Edge) — Edge has a 4MB hard cap, Node allows more
export const runtime  = 'nodejs'
export const maxDuration = 60          // allow up to 60s per chunk on Vercel Pro

function isValidContentRange(value: string | null): boolean {
  if (!value) return false
  const match = value.match(/^bytes (\d+)-(\d+)\/(\d+|\*)$/)
  if (!match) return false

  const start = Number(match[1])
  const end = Number(match[2])
  const total = match[3] === '*' ? null : Number(match[3])

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    return false
  }

  if (end - start + 1 > MAX_MEETING_AUDIO_CHUNK_BYTES) return false

  return total === null || (Number.isSafeInteger(total) && total > 0 && total <= MAX_MEETING_AUDIO_BYTES && end < total)
}

// ── PUT: receive one chunk, forward to Drive ─────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.upload_chunk', session.email, 300, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const { searchParams } = new URL(req.url)
    const uploadUrl     = searchParams.get('uploadUrl')
    const contentRange  = req.headers.get('x-content-range')
    const contentLength = req.headers.get('x-content-length')
    const parsedContentLength = parsePositiveInteger(contentLength, MAX_MEETING_AUDIO_CHUNK_BYTES)

    if (!isAllowedDriveUploadUrl(uploadUrl)) {
      return NextResponse.json({ error: 'Valid Google Drive uploadUrl required' }, { status: 400 })
    }
    if (!isValidContentRange(contentRange) || !parsedContentLength) {
      return NextResponse.json({ error: 'Valid chunk range and size required' }, { status: 400 })
    }
    if (!isMeetingUploadSessionOwner(uploadUrl, session.email)) {
      return NextResponse.json({ error: 'Upload session not found or not owned by this user' }, { status: 403 })
    }

    const chunk = await req.arrayBuffer()
    if (chunk.byteLength !== parsedContentLength || chunk.byteLength > MAX_MEETING_AUDIO_CHUNK_BYTES) {
      return NextResponse.json({ error: 'Chunk size mismatch or too large' }, { status: 400 })
    }

    const driveRes = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        'Content-Length': String(parsedContentLength),
        'Content-Range':  contentRange!,
      },
      body: chunk,
    })

    if (driveRes.status === 308) {
      return NextResponse.json({ status: 308 }, { status: 200 })
    }

    if (driveRes.status === 200 || driveRes.status === 201) {
      const data = await driveRes.json()
      registerMeetingUploadedFile(data.id, session.email)
      return NextResponse.json({ status: driveRes.status, fileId: data.id })
    }

    const text = await driveRes.text()
    return NextResponse.json(
      { error: `Drive chunk error: ${driveRes.status} — ${text.substring(0, 200)}` },
      { status: driveRes.status >= 500 ? 502 : 400 }
    )

  } catch (err: any) {
    console.error('[upload-chunk PUT]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST: resume offset check (tiny body) ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.upload_resume', session.email, 300, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const { uploadUrl, totalSize } = await req.json()
    const parsedTotalSize = parsePositiveInteger(totalSize, MAX_MEETING_AUDIO_BYTES)
    if (!isAllowedDriveUploadUrl(uploadUrl)) {
      return NextResponse.json({ error: 'Valid Google Drive uploadUrl required' }, { status: 400 })
    }
    if (!parsedTotalSize) {
      return NextResponse.json({ error: 'Valid totalSize required' }, { status: 400 })
    }
    if (!isMeetingUploadSessionOwner(uploadUrl, session.email)) {
      return NextResponse.json({ error: 'Upload session not found or not owned by this user' }, { status: 403 })
    }

    const driveRes = await fetch(uploadUrl, {
      method:  'PUT',
      headers: { 'Content-Range': `bytes */${parsedTotalSize}`, 'Content-Length': '0' },
    })

    if (driveRes.status === 308) {
      const range      = driveRes.headers.get('range')
      const resumeFrom = range ? parseInt(range.split('-')[1]) + 1 : 0
      return NextResponse.json({ resumeFrom })
    }

    if (driveRes.status === 200 || driveRes.status === 201) {
      const data = await driveRes.json()
      registerMeetingUploadedFile(data.id, session.email)
      return NextResponse.json({ resumeFrom: parsedTotalSize, fileId: data.id, complete: true })
    }

    return NextResponse.json({ resumeFrom: 0 })

  } catch {
    return NextResponse.json({ resumeFrom: 0 })
  }
}
