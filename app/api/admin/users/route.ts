import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { verifySessionCookieValue } from '@/lib/session'
import { ensureSecurityTables } from '@/lib/user-devices'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    await ensureSecurityTables()
    const pool = await getPool()

    // 1. Fetch users from userlogin
    const [rows]: any = await pool.query(`
      SELECT 
        u.id, 
        u.unique_key, 
        u.user_id, 
        u.user_name, 
        u.email_id, 
        u.role, 
        u.department, 
        u.company_name, 
        u.company, 
        u.active, 
        u.join_date, 
        u.user_mobile_no,
        COALESCE(u.token_version, 1) as token_version
      FROM userlogin u
      ORDER BY u.id DESC
    `)

    if (!Array.isArray(rows)) {
      return NextResponse.json({ success: true, users: [] })
    }

    // 2. Fetch device counts per user
    const [deviceCounts]: any = await pool.query(`
      SELECT user_id, COUNT(*) as count FROM user_devices GROUP BY user_id
    `)
    const deviceCountMap = new Map<string, number>()
    if (Array.isArray(deviceCounts)) {
      for (const d of deviceCounts) {
        deviceCountMap.set(String(d.user_id), Number(d.count))
      }
    }

    // 3. Fetch active sessions count per user
    const [sessionCounts]: any = await pool.query(`
      SELECT user_id, COUNT(*) as count FROM user_sessions WHERE is_active = 1 GROUP BY user_id
    `)
    const activeSessionMap = new Map<string, number>()
    if (Array.isArray(sessionCounts)) {
      for (const s of sessionCounts) {
        activeSessionMap.set(String(s.user_id), Number(s.count))
      }
    }

    const users = rows.map((r) => {
      const uid = String(r.id || r.unique_key || r.user_id)
      const keys = [
        String(r.id || ''),
        String(r.unique_key || ''),
        String(r.user_id || ''),
        String(r.email_id || '').toLowerCase(),
      ].filter(Boolean)

      let registeredDevicesCount = 0
      for (const k of keys) {
        if (deviceCountMap.has(k)) {
          registeredDevicesCount = Math.max(registeredDevicesCount, deviceCountMap.get(k) || 0)
        }
      }

      let activeSessionsCount = 0
      for (const k of keys) {
        if (activeSessionMap.has(k)) {
          activeSessionsCount = Math.max(activeSessionsCount, activeSessionMap.get(k) || 0)
        }
      }

      return {
        id: uid,
        email: r.email_id || '',
        name: r.user_name || r.email_id || 'User',
        role: r.role || 'sales_agent',
        department: r.department || 'Sales',
        company: (r.company || r.company_name || 'KAPPL').toUpperCase(),
        employeeId: r.user_id || r.unique_key || String(r.id),
        phone: r.user_mobile_no || '',
        joinDate: r.join_date ? new Date(r.join_date).toISOString().split('T')[0] : '',
        isActive: String(r.active).toLowerCase() === '1' || String(r.active).toLowerCase() === 'yes' || String(r.active).toLowerCase() === 'active',
        tokenVersion: Number(r.token_version || 1),
        registeredDevicesCount,
        activeSessionsCount,
      }
    })

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error('[admin/users] Error fetching users list:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
