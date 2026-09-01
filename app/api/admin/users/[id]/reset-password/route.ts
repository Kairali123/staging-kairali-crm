import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { adminResetUserPassword } from '@/lib/user-devices'
import { recordSecurityEvent, getRequestSourceIp } from '@/lib/security-audit'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Super Admin or Admin role required.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { newPassword } = body

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const result = await adminResetUserPassword(id, newPassword)

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Password update failed.' }, { status: 400 })
    }

    recordSecurityEvent({
      action: 'admin.user.password_reset',
      outcome: 'success',
      actor: sessionUser.email,
      target: id,
      sourceIp: getRequestSourceIp(req),
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully. The user will be notified in real-time and asked to log in again.',
    })
  } catch (error: any) {
    console.error('[admin/reset-password] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error while resetting password.' },
      { status: 500 }
    )
  }
}
