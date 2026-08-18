import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSessionUser, hasAdminRole } from '@/lib/authz'

export type MeetingSession = {
  user: any
  email: string
  name: string
  isAdmin: boolean
}

function valueAsString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeEmail(value: unknown): string {
  return valueAsString(value).toLowerCase()
}

function sessionDisplayName(user: any, email: string): string {
  return (
    valueAsString(user?.name) ||
    valueAsString(user?.fullName) ||
    valueAsString(user?.displayName) ||
    email
  )
}

export function getMeetingSession(req: NextRequest): MeetingSession | null {
  const user = getSessionUser(req)
  const email = normalizeEmail(user?.email)

  if (!user || !email) return null

  return {
    user,
    email,
    name: sessionDisplayName(user, email),
    isAdmin: hasAdminRole(user, 'raw'),
  }
}

export function meetingUnauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export function meetingForbidden(message = 'You do not have access to this meeting.') {
  return NextResponse.json(
    { error: message },
    { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
  )
}

export function canAccessMeetingOwner(
  session: MeetingSession,
  recordedBy: unknown,
): boolean {
  if (session.isAdmin) return true
  return normalizeEmail(recordedBy) === session.email
}

export function isValidDriveFileId(value: unknown): value is string {
  return /^[A-Za-z0-9_-]{10,200}$/.test(valueAsString(value))
}

const ALLOWED_MEETING_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'video/webm',
  'video/mp4',
])

const MEETING_AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
}

export const MAX_MEETING_AUDIO_BYTES = 200 * 1024 * 1024
export const MAX_MEETING_AUDIO_CHUNK_BYTES = 25 * 1024 * 1024

export function normalizeMeetingAudioMime(value: unknown): string | null {
  const mimeType = valueAsString(value).split(';')[0].toLowerCase()
  return ALLOWED_MEETING_AUDIO_MIME_TYPES.has(mimeType) ? mimeType : null
}

export function meetingAudioExtension(mimeType: string): string {
  return MEETING_AUDIO_EXTENSIONS[mimeType] || 'webm'
}

export function parsePositiveInteger(value: unknown, maxValue: number): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 && value <= maxValue ? value : null
  }

  const text = valueAsString(value)
  if (!/^\d+$/.test(text)) return null

  const parsed = Number(text)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maxValue ? parsed : null
}

export function sanitizeMeetingFileName(value: unknown, fallbackExtension = 'webm'): string | null {
  const raw = valueAsString(value)
  if (!raw || raw.length > 180) return null

  const baseName = raw
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[^\w.\- ()]/g, '_')
    .replace(/_+/g, '_')
    .trim()

  if (!baseName || baseName === '.' || baseName === '..') return null

  const withoutDangerousDots = baseName.replace(/^\.+/, '')
  const withExtension = /\.[A-Za-z0-9]{2,8}$/.test(withoutDangerousDots)
    ? withoutDangerousDots
    : `${withoutDangerousDots}.${fallbackExtension}`

  return withExtension.slice(0, 180)
}

export function isAllowedDriveUploadUrl(value: unknown): value is string {
  const raw = valueAsString(value)
  if (!raw || raw.length > 4096) return false

  try {
    const url = new URL(raw)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'www.googleapis.com' &&
      url.pathname === '/upload/drive/v3/files' &&
      url.searchParams.get('uploadType') === 'resumable' &&
      !!url.searchParams.get('upload_id')
    )
  } catch {
    return false
  }
}

export function parseMeetingAudioUrl(value: unknown, origin: string): URL | null {
  const raw = valueAsString(value)
  if (!raw || raw.length > 2048) return null

  try {
    const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, origin)
    if (url.origin !== origin) return null
    if (url.pathname !== '/api/meetings/audio') return null
    if (!isValidDriveFileId(url.searchParams.get('id'))) return null
    return url
  } catch {
    return null
  }
}
