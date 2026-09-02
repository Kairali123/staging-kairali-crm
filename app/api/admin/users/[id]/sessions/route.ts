import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { getPool } from '@/lib/db'
import {
  getRegisteredDevices,
  getUserSessions,
  revokeSessionBySid,
  revokeAllSessionsForUser,
} from '@/lib/user-devices'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const devices = await getRegisteredDevices(id)
    const sessions = await getUserSessions(id)

    let currentPassword: string | null = null
    if (sessionUser.role === 'super_admin') {
      try {
        const pool = await getPool()
        const [userRows]: any = await pool.query(
          `SELECT password FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR email_id = ? LIMIT 1`,
          [id, id, id, id]
        )
        if (Array.isArray(userRows) && userRows.length > 0 && userRows[0].password) {
          currentPassword = String(userRows[0].password)
        }
      } catch (err) {
        console.warn('[admin/sessions] Could not fetch current password:', err)
      }
    }

    return NextResponse.json({
      success: true,
      devices,
      sessions,
      currentPassword,
    })
  } catch (error: any) {
    console.error('[admin/sessions] Error fetching sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user sessions.' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { action, sid } = body

    if (action === 'revoke_all') {
      await revokeAllSessionsForUser(id, 'ADMIN_FORCE_LOGOUT')
      return NextResponse.json({
        success: true,
        message: 'All active sessions for this user have been logged out.',
      })
    }

    if (action === 'revoke_sid' && sid) {
      const revoked = await revokeSessionBySid(sid, 'ADMIN_FORCE_LOGOUT')
      return NextResponse.json({
        success: revoked,
        message: revoked
          ? 'Selected session logged out successfully.'
          : 'Session was not active or could not be found.',
      })
    }

    return NextResponse.json({ error: 'Invalid action or missing sid.' }, { status: 400 })
  } catch (error: any) {
    console.error('[admin/sessions] Error modifying sessions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute session action.' },
      { status: 500 }
    )
  }
}
