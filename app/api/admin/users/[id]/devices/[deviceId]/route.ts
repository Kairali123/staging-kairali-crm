import { NextRequest, NextResponse } from 'next/server'
import { verifySessionCookieValue } from '@/lib/session'
import { removeRegisteredDevice } from '@/lib/user-devices'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; deviceId: string }> }
) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const { id, deviceId } = await params
    await removeRegisteredDevice(id, deviceId)

    return NextResponse.json({
      success: true,
      message: 'Registered device removed successfully. The user now has a free device slot.',
    })
  } catch (error: any) {
    console.error('[admin/devices] Error removing device:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove device.' },
      { status: 500 }
    )
  }
}
