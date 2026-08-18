import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Authorizes either an external server-to-server caller (Authorization: Bearer <MEASUREMENT_API_TOKEN>)
// or the internal frontend (same session cookie check as middleware.ts).
// MEASUREMENT_API_TOKEN_EXPIRES_AT is an ISO date (e.g. "2026-10-19"); past that date the
// token is rejected even if it still matches, forcing rotation rather than a silent forever-token.
export async function authorizeApiRequest(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const expected = process.env.MEASUREMENT_API_TOKEN
    const expiresAtRaw = process.env.MEASUREMENT_API_TOKEN_EXPIRES_AT
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
    const notExpired = !expiresAt || isNaN(expiresAt.getTime()) || Date.now() < expiresAt.getTime()
    if (expected && token && notExpired && safeCompare(token, expected)) return true
  }

  const user = req.cookies.get('kairali_user')?.value
  if (user && verifySessionCookieValue(user)) {
    return true
  }

  return false
}

export function isBearerTokenRequest(req: NextRequest): boolean {
  return !!req.headers.get('authorization')?.startsWith('Bearer ')
}

// Distinguishes "your token expired, ask for a new one" from a generic invalid/missing
// credential, so an integration partner isn't left guessing why a previously-working token failed.
export function unauthorizedResponse(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const expected = process.env.MEASUREMENT_API_TOKEN
    const expiresAtRaw = process.env.MEASUREMENT_API_TOKEN_EXPIRES_AT
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null
    const isExpired = expiresAt && !isNaN(expiresAt.getTime()) && Date.now() >= expiresAt.getTime()
    if (isExpired && expected && token && safeCompare(token, expected)) {
      return Response.json({ success: false, error: 'Token expired. Request a new token.' }, { status: 401 })
    }
  }
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}
