import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { adminResetUserPassword } from '@/lib/user-devices'
import { recordSecurityEvent, getRequestSourceIp } from '@/lib/security-audit'

import { getPool } from '@/lib/db'
import { sendUserCredentialsEmail } from '@/lib/send-user-credentials'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || sessionUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized: Only Super Administrators can change passwords.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { newPassword, sendEmail } = body

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

    let emailSent = false
    let emailMessage = ''
    if (sendEmail) {
      try {
        const pool = await getPool()
        const [rows]: any = await pool.query(
          `SELECT user_name, email_id FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR email_id = ? LIMIT 1`,
          [id, id, id, id]
        )
        if (Array.isArray(rows) && rows.length > 0 && rows[0].email_id) {
          const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin || 'https://crm.kairali.com'
          const mailRes = await sendUserCredentialsEmail({
            name: rows[0].user_name || 'Employee',
            email: rows[0].email_id,
            password: newPassword.trim(),
            loginUrl: origin,
          })
          emailSent = mailRes.success
          emailMessage = mailRes.message
        }
      } catch (mailErr: any) {
        console.error('[admin/reset-password] Email dispatch error:', mailErr)
      }
    }

    return NextResponse.json({
      success: true,
      newPassword: newPassword.trim(),
      emailSent,
      emailMessage,
      message: emailSent
        ? 'Password updated and new credentials emailed to user successfully.'
        : 'Password updated successfully. The user will be notified in real-time and asked to log in again.',
    })
  } catch (error: any) {
    console.error('[admin/reset-password] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error while resetting password.' },
      { status: 500 }
    )
  }
}
