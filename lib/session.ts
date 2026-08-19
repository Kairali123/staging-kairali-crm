import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days — matches previous cookie lifetime

declare global {
  var _crmRevokedSessionIds: Map<string, number> | undefined
}

function revokedSessionIds(): Map<string, number> {
  if (!global._crmRevokedSessionIds) {
    global._crmRevokedSessionIds = new Map()
  }
  return global._crmRevokedSessionIds
}

function pruneRevokedSessionIds(now = Date.now()): void {
  for (const [sid, expiresAt] of revokedSessionIds()) {
    if (expiresAt <= now) revokedSessionIds().delete(sid)
  }
}

function sign(encodedPayload: string): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url')
}

function readVerifiedPayload(raw: string): any | null {
  const parts = raw.split('.')
  if (parts.length !== 2) return null
  const [encoded, signature] = parts

  let expectedSig: string
  try {
    expectedSig = sign(encoded)
  } catch {
    return null
  }

  const sigBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function readVerifiedSessionPayload(raw: string | undefined | null): any | null {
  return raw ? readVerifiedPayload(raw) : null
}

// Signed session cookie value: "<base64url payload>.<hmac signature>"
// Embeds user object, expiry, issuance timestamp, unique session ID (`sid`),
// optional `deviceId`, and `tokenVersion` for real-time invalidation.
export function createSessionCookieValue(
  user: unknown,
  options?: {
    sid?: string
    deviceId?: string
    tokenVersion?: number
  }
): string {
  const now = Date.now()
  const sid = options?.sid || randomUUID()
  const payload = JSON.stringify({
    user,
    exp: now + SESSION_TTL_MS,
    iat: now,
    sid,
    deviceId: options?.deviceId,
    tokenVersion: options?.tokenVersion ?? 1,
  })
  const encoded = Buffer.from(payload, 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

export function createSessionCookieWithMetadata(
  user: unknown,
  options?: {
    sid?: string
    deviceId?: string
    tokenVersion?: number
  }
): { cookieValue: string; sid: string; deviceId?: string; tokenVersion: number } {
  const sid = options?.sid || randomUUID()
  const tokenVersion = options?.tokenVersion ?? 1
  const cookieValue = createSessionCookieValue(user, {
    sid,
    deviceId: options?.deviceId,
    tokenVersion,
  })
  return { cookieValue, sid, deviceId: options?.deviceId, tokenVersion }
}

export function verifySessionCookieValue(raw: string): any | null {
  pruneRevokedSessionIds()
  const payload = readVerifiedPayload(raw)
  if (!payload?.exp || Date.now() > payload.exp) return null

  if (typeof payload.sid !== 'string' || !payload.sid) {
    return process.env.CRM_ALLOW_LEGACY_SESSION_COOKIES === 'true'
      ? (payload.user ?? null)
      : null
  }

  if (revokedSessionIds().has(payload.sid)) {
    return null
  }

  return payload.user ?? null
}

export function revokeSessionCookieValue(raw: string | undefined | null): boolean {
  if (!raw) return false

  const payload = readVerifiedPayload(raw)
  if (typeof payload?.sid !== 'string' || !payload.sid) return false

  pruneRevokedSessionIds()
  const expiresAt = typeof payload.exp === 'number' ? payload.exp : Date.now() + SESSION_TTL_MS
  revokedSessionIds().set(payload.sid, expiresAt)
  return true
}

export function manuallyRevokeSid(sid: string, ttlMs = SESSION_TTL_MS): void {
  pruneRevokedSessionIds()
  revokedSessionIds().set(sid, Date.now() + ttlMs)
}
