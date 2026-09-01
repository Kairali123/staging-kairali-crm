// src/app/api/meetings/audio/route.ts
// Proxies Google Drive audio with proper HTTP Range support so <audio> can
// seek, show duration, and play. Fixes: only send Content-Range on 206 (Range)
// responses — sending it on a plain 200 confuses browser duration detection.

import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getPool } from '@/lib/db'
import {
  canAccessMeetingOwner,
  getMeetingSession,
  isValidDriveFileId,
  meetingForbidden,
  meetingUnauthorized,
  normalizeEmail,
} from '@/lib/meetings-auth'

export const runtime = 'nodejs'

function getDriveClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

async function loadSavedMeetingOwner(fileId: string): Promise<string | null> {
  const pool = await getPool()
  const [[meeting]]: any = await pool.execute(
    `SELECT recorded_by FROM meetings
     WHERE audio_url LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [`%id=${fileId}%`],
  )
  return meeting?.recorded_by || null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('id')
    if (!fileId) return new NextResponse('Missing file id', { status: 400 })
    if (!isValidDriveFileId(fileId)) return new NextResponse('Invalid file id', { status: 400 })

    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()

    const drive = getDriveClient()

    // ── 1. File metadata (size + mimeType) ────────────────────────────────────
    const meta = await drive.files.get({
      fileId,
      fields:            'size, mimeType, name, appProperties',
      supportsAllDrives: true,
    })
    const driveOwnerEmail = normalizeEmail(meta.data.appProperties?.crmOwnerEmail)
    const savedMeetingOwner = driveOwnerEmail ? null : await loadSavedMeetingOwner(fileId)
    const canAccess =
      session.isAdmin ||
      driveOwnerEmail === session.email ||
      (savedMeetingOwner ? canAccessMeetingOwner(session, savedMeetingOwner) : false)

    if (!canAccess) {
      return meetingForbidden('You do not have access to this audio.')
    }

    const totalSize = parseInt(meta.data.size || '0')
    let   mimeType  = meta.data.mimeType || 'audio/mpeg'
    // Normalize generic types so the browser picks the right decoder
    if (mimeType === 'application/octet-stream') mimeType = 'audio/mpeg'

    // ── 2. Parse Range header ─────────────────────────────────────────────────
    const rangeHeader = req.headers.get('range')
    let start = 0
    let end   = totalSize - 1
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (!match) {
        return new NextResponse('Invalid range', {
          status: 416,
          headers: { 'Cache-Control': 'private, no-store' },
        })
      }

      start = parseInt(match[1])
      end   = match[2] ? parseInt(match[2]) : totalSize - 1
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        end < start ||
        start >= totalSize
      ) {
        return new NextResponse('Invalid range', {
          status: 416,
          headers: {
            'Cache-Control': 'private, no-store',
            'Content-Range': `bytes */${totalSize}`,
          },
        })
      }
    }
    end = Math.min(end, totalSize - 1)
    const chunkSize = end - start + 1

    // ── 3. Stream the requested bytes from Drive ──────────────────────────────
    const driveRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
    )

    const stream   = driveRes.data as any
    const readable = new ReadableStream({
      start(controller) {
        stream.on('data',  (chunk: Buffer) => controller.enqueue(chunk))
        stream.on('end',   ()             => controller.close())
        stream.on('error', (err: Error)  => controller.error(err))
      },
    })

    // ── 4. Headers — ONLY add Content-Range on a 206 (Range) response ─────────
    const headers: Record<string, string> = {
      'Content-Type':   mimeType,
      'Content-Length': String(chunkSize),
      'Accept-Ranges':  'bytes',
      'Cache-Control':  'private, no-store',
    }
    if (rangeHeader) {
      headers['Content-Range'] = `bytes ${start}-${end}/${totalSize}`
    }

    return new NextResponse(readable, {
      status: rangeHeader ? 206 : 200,
      headers,
    })

  } catch (err: any) {
    console.error('[/api/meetings/audio]', err)
    return new NextResponse(err.message || 'Audio stream failed', { status: 500 })
  }
}
