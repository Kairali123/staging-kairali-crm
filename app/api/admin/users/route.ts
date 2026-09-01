import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { verifySessionCookieValue } from '@/lib/session'
import { ensureSecurityTables } from '@/lib/user-devices'
import { parsePermissionsFromDbRow } from '@/lib/db-auth'
import { syncUserRolePermissions } from '@/lib/db-user-admin'

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
        u.permission,
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

    // 4. Fetch all user_role_permissions rows
    const [permRows]: any = await pool.query(`SELECT * FROM user_role_permissions`)
    const permMap = new Map<string, any>()
    if (Array.isArray(permRows)) {
      for (const pr of permRows) {
        if (pr.email) permMap.set(pr.email.trim().toLowerCase(), pr)
      }
    }

    const users = rows.map((r) => {
      const uid = String(r.id || r.unique_key || r.user_id)
      const cleanEmail = String(r.email_id || '').toLowerCase().trim()
      const userRole = r.role || 'sales_agent'

      const keys = [
        String(r.id || ''),
        String(r.unique_key || ''),
        String(r.user_id || ''),
        cleanEmail,
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

      // Assemble permissions
      let userPermissions: string[] = []
      if (userRole === 'super_admin') {
        userPermissions = ['all']
      } else {
        const dbPermRow = cleanEmail ? permMap.get(cleanEmail) : null
        if (dbPermRow) {
          userPermissions = parsePermissionsFromDbRow(dbPermRow)
        }
        if (r.permission && typeof r.permission === 'string') {
          const direct = r.permission.split(',').map((p: string) => p.trim()).filter(Boolean)
          userPermissions = Array.from(new Set([...userPermissions, ...direct]))
        }
      }

      return {
        id: uid,
        email: r.email_id || '',
        name: r.user_name || r.email_id || 'User',
        role: userRole,
        department: r.department || 'Sales',
        company: (r.company || r.company_name || 'KAPPL').toUpperCase(),
        employeeId: r.user_id || r.unique_key || String(r.id),
        phone: r.user_mobile_no || '',
        joinDate: r.join_date ? new Date(r.join_date).toISOString().split('T')[0] : '',
        isActive: String(r.active).toLowerCase() === '1' || String(r.active).toLowerCase() === 'yes' || String(r.active).toLowerCase() === 'active',
        tokenVersion: Number(r.token_version || 1),
        permissions: userPermissions,
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

export async function POST(req: NextRequest) {
  try {
    const rawCookie = req.cookies.get('kairali_user')?.value
    const sessionUser = rawCookie ? verifySessionCookieValue(rawCookie) : null

    if (!sessionUser || !['super_admin', 'admin'].includes(sessionUser.role)) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      email,
      role = 'sales_agent',
      department = 'Sales',
      company = 'KAPPL',
      employeeId,
      phone = '',
      isActive = true,
      permissions = [],
      password = 'Password@123',
    } = body

    if (!name || !email || !employeeId) {
      return NextResponse.json({ error: 'Name, Email, and Employee ID are required.' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const pool = await getPool()

    // Check if email or employeeId already exists
    const [existing]: any = await pool.query(
      `SELECT id FROM userlogin WHERE LOWER(TRIM(email_id)) = ? OR user_id = ? LIMIT 1`,
      [cleanEmail, employeeId.trim()]
    )

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json(
        { error: 'An employee with this Email or Employee ID already exists.' },
        { status: 409 }
      )
    }

    const permissionsArr: string[] = Array.isArray(permissions) ? permissions : []
    const permString = role === 'super_admin' ? 'all' : permissionsArr.join(',')
    const activeVal = isActive ? 'Active' : 'Inactive'

    // Insert new userlogin record
    const [insertResult]: any = await pool.query(
      `INSERT INTO userlogin (
        user_id,
        user_name,
        email_id,
        password,
        user_mobile_no,
        role,
        department,
        company_name,
        company,
        permission,
        active,
        join_date,
        token_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE(), 1)`,
      [
        employeeId.trim(),
        name.trim(),
        cleanEmail,
        password,
        phone.trim(),
        role,
        department,
        company,
        company,
        permString,
        activeVal,
      ]
    )

    // Synchronize user_role_permissions table
    await syncUserRolePermissions(cleanEmail, role, role === 'super_admin' ? ['all'] : permissionsArr)

    return NextResponse.json({
      success: true,
      message: 'Employee registered and permissions saved to database successfully',
      id: insertResult.insertId,
    })
  } catch (error: any) {
    console.error('[admin/users POST] Error creating user:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user in database' },
      { status: 500 }
    )
  }
}
