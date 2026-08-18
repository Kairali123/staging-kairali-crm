import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import { revokeSessionCookieValue } from '@/lib/session'
import { getRequestSourceIp, recordSecurityEvent } from '@/lib/security-audit'

// HttpOnly cookies can't be cleared by client JS, so logout needs a server round-trip.
export async function POST(req: NextRequest) {
  const rawSession = req.cookies.get('kairali_user')?.value
  const user = getSessionUser(req)
  const revoked = revokeSessionCookieValue(rawSession)

  recordSecurityEvent({
    action: 'auth.logout',
    outcome: 'success',
    actor: typeof user?.email === 'string' ? user.email : null,
    sourceIp: getRequestSourceIp(req),
    context: { sessionRevoked: revoked },
  })

  const response = NextResponse.json({ success: true })
  response.cookies.set('kairali_user', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
