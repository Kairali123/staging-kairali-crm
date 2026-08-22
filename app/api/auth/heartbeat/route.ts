import { NextRequest, NextResponse } from 'next/server'
import { readVerifiedSessionPayload } from '@/lib/session'
import { validateSessionState } from '@/lib/user-devices'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rawCookie = req.cookies.get('kairali_user')?.value
  const payload = readVerifiedSessionPayload(rawCookie)

  if (!payload || !payload.user || !payload.user.id) {
    return NextResponse.json(
      { valid: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const userId = String(payload.user.id).trim()
  const sid = payload.sid ? String(payload.sid).trim() : `legacy_${userId}`
  const tokenVersion = payload.tokenVersion !== undefined ? Number(payload.tokenVersion) : undefined

  const check = await validateSessionState(sid, userId, tokenVersion)

  if (!check.valid) {
    return NextResponse.json(
      { valid: false, reason: check.reason || 'SESSION_INVALID' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  return NextResponse.json(
    { valid: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}
