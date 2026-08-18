

// src/app/api/meetings/upload-audio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadAudioToDrive } from '@/lib/google-drive'
import {
  getMeetingSession,
  MAX_MEETING_AUDIO_BYTES,
  meetingAudioExtension,
  meetingUnauthorized,
  normalizeMeetingAudioMime,
} from '@/lib/meetings-auth'
import { checkApiRateLimit, rateLimitResponse } from '@/lib/api-rate-limit'
import { registerMeetingUploadedFile } from '@/lib/meeting-upload-sessions'

export async function POST(req: NextRequest) {
  try {
    const session = getMeetingSession(req)
    if (!session) return meetingUnauthorized()
    const limit = await checkApiRateLimit(req, 'meetings.upload_audio', session.email, 12, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds)

    const formData  = await req.formData()
    const audioFile = formData.get('audio') as File | null

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (audioFile.size <= 0 || audioFile.size > MAX_MEETING_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file too large (max 200MB)' }, { status: 413 })
    }

    const mimeType = normalizeMeetingAudioMime(audioFile.type || 'audio/webm')
    if (!mimeType) {
      return NextResponse.json({ error: 'Unsupported meeting audio type' }, { status: 415 })
    }

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const fileName    = `meeting-${Date.now()}.${meetingAudioExtension(mimeType)}`

    const { fileId, streamUrl, webViewLink } = await uploadAudioToDrive(
      audioBuffer,
      fileName,
      mimeType,
      session.email,
    )
    registerMeetingUploadedFile(fileId, session.email)

    return NextResponse.json({ fileId, streamUrl, webViewLink })

  } catch (err: any) {
    console.error('[/api/meetings/upload-audio]', err)
    return NextResponse.json({ error: err.message || 'Drive upload failed' }, { status: 500 })
  }
}
