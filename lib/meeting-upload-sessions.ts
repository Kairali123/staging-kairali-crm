import { createHmac, timingSafeEqual } from 'crypto'

// Ownership of a Drive resumable upload used to live in a module-level Map.
// That only holds when every request of an upload reaches the same instance,
// which is not true on Vercel: `create-upload-session` wrote the Map on one
// lambda and `upload-chunk` read it on another, so a legitimate upload failed
// with "Upload session not found or not owned by this user".
//
// The binding is now signed into the upload URL itself rather than stored. The
// guarantee is unchanged — the token is an HMAC over Drive's `upload_id` AND the
// owner's email, so one user still cannot replay another user's upload URL — but
// it survives instance rotation, restarts and deploys, because there is no
// shared state left to miss.
//
// Callers keep round-tripping the URL exactly as before; the extra query
// parameter is stripped here before the URL is ever sent to Google.
//
// File ownership after an upload completes is NOT tracked here: both upload
// paths already stamp `appProperties.crmOwnerEmail` onto the Drive file, so
// `lib/google-drive.ts#getMeetingAudioOwner` reads it back from the file itself.

const UPLOAD_SESSION_TTL_MS = 6 * 60 * 60 * 1000
const TOKEN_PARAM = 'crmToken'

function signingSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return secret
}

export function normalizeOwnerEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function uploadSessionId(url: URL): string | null {
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'www.googleapis.com' ||
    url.pathname !== '/upload/drive/v3/files'
  ) {
    return null
  }
  const id = url.searchParams.get('upload_id')
  return id && /^[A-Za-z0-9_-]{10,512}$/.test(id) ? id : null
}

function sign(uploadId: string, ownerEmail: string, expiresAt: number): string {
  return createHmac('sha256', signingSecret())
    .update(`meeting-upload-session:${uploadId}:${ownerEmail}:${expiresAt}`)
    .digest('base64url')
}

// Returns the Drive upload URL with an ownership token attached. The expiry
// travels in the clear but is covered by the signature, preserving the TTL the
// Map used to enforce by pruning — without anything left to prune.
export function attachUploadToken(uploadUrl: string, ownerEmail: unknown): string | null {
  const email = normalizeOwnerEmail(ownerEmail)
  if (!email) return null

  let url: URL
  try {
    url = new URL(uploadUrl)
  } catch {
    return null
  }

  const uploadId = uploadSessionId(url)
  if (!uploadId) return null

  const expiresAt = Date.now() + UPLOAD_SESSION_TTL_MS
  url.searchParams.set(TOKEN_PARAM, `${expiresAt}.${sign(uploadId, email, expiresAt)}`)
  return url.toString()
}

// Verifies the token a caller sent back and returns the URL to hand to Google
// with the token removed, or null when the caller does not own this upload.
export function verifyAndStripUploadToken(uploadUrl: unknown, ownerEmail: unknown): string | null {
  const email = normalizeOwnerEmail(ownerEmail)
  if (typeof uploadUrl !== 'string' || !email) return null

  let url: URL
  try {
    url = new URL(uploadUrl)
  } catch {
    return null
  }

  const uploadId = uploadSessionId(url)
  const token = url.searchParams.get(TOKEN_PARAM)
  if (!uploadId || !token) return null

  const separator = token.indexOf('.')
  if (separator <= 0) return null

  const expiresAt = Number(token.slice(0, separator))
  const signature = token.slice(separator + 1)
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0 || Date.now() > expiresAt) return null
  if (!signature) return null

  let expected: string
  try {
    expected = sign(uploadId, email, expiresAt)
  } catch {
    return null
  }

  const provided = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (provided.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(provided, expectedBuffer)) return null

  url.searchParams.delete(TOKEN_PARAM)
  return url.toString()
}
