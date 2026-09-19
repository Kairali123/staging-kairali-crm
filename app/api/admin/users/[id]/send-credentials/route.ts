import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { getPool } from '@/lib/db'
import { sendUserCredentialsEmail } from '@/lib/send-user-credentials'
import { recordSecurityEvent, getRequestSourceIp } from '@/lib/security-audit'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    // Strictly enforce Super Admin access
    if (!sessionUser || sessionUser.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only Super Administrators can share credentials.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const cleanId = String(id).trim()

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Body is optional
    }

    const pool = await getPool()
    const [rows]: any = await pool.query(
      `SELECT id, user_name, email_id, password FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR LOWER(TRIM(email_id)) = ? LIMIT 1`,
      [cleanId, cleanId, cleanId, cleanId.toLowerCase()]
    )

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'User record not found.' }, { status: 404 })
    }

    const targetUser = rows[0]
    const recipientEmail = (targetUser.email_id || '').trim()
    const recipientName = (targetUser.user_name || 'Employee').trim()
    const passwordToSend = (body.password || targetUser.password || '').trim()

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { error: `User has no valid email address on file (${recipientEmail || 'empty'}).` },
        { status: 400 }
      )
    }

    if (!passwordToSend) {
      return NextResponse.json(
        { error: 'No password is set for this account.' },
        { status: 400 }
      )
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      'https://crm.kairali.com'

    const result = await sendUserCredentialsEmail({
      name: recipientName,
      email: recipientEmail,
      password: passwordToSend,
      loginUrl: origin,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Failed to dispatch email.' },
        { status: 500 }
      )
    }

    recordSecurityEvent({
      action: 'admin.user.credentials_shared',
      outcome: 'success',
      actor: sessionUser.email,
      target: targetUser.id,
      sourceIp: getRequestSourceIp(req),
    })

    return NextResponse.json({
      success: true,
      message: `Credentials successfully sent to ${recipientEmail}`,
    })
  } catch (error: any) {
    console.error('[admin/send-credentials] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Server error while sending credentials email.' },
      { status: 500 }
    )
  }
}
