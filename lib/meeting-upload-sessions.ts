type UploadSessionRecord = {
  ownerEmail: string
  expiresAt: number
}

type UploadedFileRecord = {
  ownerEmail: string
  expiresAt: number
}

const UPLOAD_SESSION_TTL_MS = 6 * 60 * 60 * 1000
const UPLOADED_FILE_TTL_MS = 24 * 60 * 60 * 1000

declare global {
  // In-memory binding for the server-created Drive resumable upload URL. This
  // prevents one authenticated CRM user from replaying another user's upload URL
  // on the same app instance. Production should back this with shared storage.
  var _crmMeetingUploadSessions: Map<string, UploadSessionRecord> | undefined
  var _crmMeetingUploadedFiles: Map<string, UploadedFileRecord> | undefined
}

function sessions(): Map<string, UploadSessionRecord> {
  if (!global._crmMeetingUploadSessions) {
    global._crmMeetingUploadSessions = new Map()
  }
  return global._crmMeetingUploadSessions
}

function uploadedFiles(): Map<string, UploadedFileRecord> {
  if (!global._crmMeetingUploadedFiles) {
    global._crmMeetingUploadedFiles = new Map()
  }
  return global._crmMeetingUploadedFiles
}

function uploadSessionId(uploadUrl: unknown): string | null {
  if (typeof uploadUrl !== 'string') return null
  try {
    const url = new URL(uploadUrl)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.googleapis.com' ||
      url.pathname !== '/upload/drive/v3/files'
    ) {
      return null
    }
    const id = url.searchParams.get('upload_id')
    return id && /^[A-Za-z0-9_-]{10,512}$/.test(id) ? id : null
  } catch {
    return null
  }
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function pruneExpired(now = Date.now()): void {
  for (const [key, record] of sessions()) {
    if (record.expiresAt <= now) sessions().delete(key)
  }
  for (const [key, record] of uploadedFiles()) {
    if (record.expiresAt <= now) uploadedFiles().delete(key)
  }
}

export function registerMeetingUploadSession(uploadUrl: string, ownerEmail: string): void {
  const id = uploadSessionId(uploadUrl)
  const normalizedOwner = normalizeEmail(ownerEmail)
  if (!id || !normalizedOwner) return
  pruneExpired()
  sessions().set(id, {
    ownerEmail: normalizedOwner,
    expiresAt: Date.now() + UPLOAD_SESSION_TTL_MS,
  })
}

export function isMeetingUploadSessionOwner(uploadUrl: unknown, ownerEmail: unknown): boolean {
  const id = uploadSessionId(uploadUrl)
  const normalizedOwner = normalizeEmail(ownerEmail)
  if (!id || !normalizedOwner) return false
  pruneExpired()
  const record = sessions().get(id)
  return !!record && record.ownerEmail === normalizedOwner
}

export function registerMeetingUploadedFile(fileId: unknown, ownerEmail: unknown): void {
  const normalizedOwner = normalizeEmail(ownerEmail)
  if (typeof fileId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(fileId) || !normalizedOwner) {
    return
  }

  pruneExpired()
  uploadedFiles().set(fileId, {
    ownerEmail: normalizedOwner,
    expiresAt: Date.now() + UPLOADED_FILE_TTL_MS,
  })
}

export function isMeetingUploadedFileOwner(fileId: unknown, ownerEmail: unknown): boolean {
  const normalizedOwner = normalizeEmail(ownerEmail)
  if (typeof fileId !== 'string' || !normalizedOwner) return false

  pruneExpired()
  const record = uploadedFiles().get(fileId)
  return !!record && record.ownerEmail === normalizedOwner
}
