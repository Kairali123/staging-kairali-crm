import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { verifySessionCookieValue } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const pool = await getPool()

    // 1. Fetch distinct roles from both user_role_permissions and userlogin tables
    const [rows]: any = await pool.query(`
      SELECT DISTINCT role FROM (
        SELECT LOWER(TRIM(role)) AS role FROM user_role_permissions WHERE role IS NOT NULL AND TRIM(role) != ''
        UNION
        SELECT LOWER(TRIM(role)) AS role FROM userlogin WHERE role IS NOT NULL AND TRIM(role) != ''
      ) as combined_roles
      WHERE role != ''
      ORDER BY role ASC
    `)

    const dbRoles = Array.isArray(rows)
      ? rows
          .map((r: any) => String(r.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_'))
          .filter(Boolean)
      : []

    // 2. Baseline standard roles guaranteed in system
    const defaultRoles = [
      'super_admin',
      'admin',
      'sales_manager',
      'sales_agent',
      'operation_manager',
      'operation_staff',
      'account_manager',
      'account_staff',
      'general_manager',
      'doctor',
      'hr_manager',
      'front_office',
    ]

    const merged = Array.from(new Set([...defaultRoles, ...dbRoles]))

    return NextResponse.json({
      success: true,
      roles: merged,
    })
  } catch (error: any) {
    console.error('[admin/roles GET] Error fetching roles:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}
