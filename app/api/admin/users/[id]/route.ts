import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { verifySessionCookieValue } from '@/lib/session'
import { syncUserRolePermissions, findUserloginRecord } from '@/lib/db-user-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(
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
    if (!id) {
      return NextResponse.json({ error: 'User identifier is required.' }, { status: 400 })
    }

    const body = await req.json()
    const {
      name,
      email,
      role,
      department,
      company,
      employeeId,
      phone,
      isActive,
      permissions,
    } = body

    const pool = await getPool()

    // 1. Locate user in userlogin
    const existingUser = await findUserloginRecord(id)
    if (!existingUser) {
      return NextResponse.json({ error: `User '${id}' not found in database.` }, { status: 404 })
    }

    const targetId = existingUser.id
    const updatedEmail = (email || existingUser.email_id || '').trim().toLowerCase()
    const updatedName = (name ?? existingUser.user_name ?? '').trim()
    const updatedRole = role ?? existingUser.role ?? 'sales_agent'
    const updatedDept = department ?? existingUser.department ?? 'Sales'
    const updatedCompany = company ?? existingUser.company ?? 'KAPPL'
    const updatedEmpId = employeeId ?? existingUser.user_id ?? existingUser.unique_key ?? String(targetId)
    const updatedPhone = phone ?? existingUser.user_mobile_no ?? ''
    const updatedActive = isActive !== undefined ? (isActive ? 'Active' : 'Inactive') : (existingUser.active || 'Active')

    const permsArr: string[] = Array.isArray(permissions)
      ? permissions
      : existingUser.permission
      ? String(existingUser.permission).split(',').map((p) => p.trim()).filter(Boolean)
      : []

    const permString = updatedRole === 'super_admin' ? 'all' : permsArr.join(',')

    // 2. Update userlogin record and increment token_version
    await pool.query(
      `UPDATE userlogin 
       SET 
         user_name = ?,
         email_id = ?,
         role = ?,
         department = ?,
         company_name = ?,
         company = ?,
         user_id = ?,
         user_mobile_no = ?,
         permission = ?,
         active = ?,
         token_version = COALESCE(token_version, 1) + 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        updatedName,
        updatedEmail,
        updatedRole,
        updatedDept,
        updatedCompany,
        updatedCompany,
        updatedEmpId,
        updatedPhone,
        permString,
        updatedActive,
        targetId,
      ]
    )

    // 3. Synchronize permissions in user_role_permissions
    if (updatedEmail) {
      await syncUserRolePermissions(
        updatedEmail,
        updatedRole,
        updatedRole === 'super_admin' ? ['all'] : permsArr
      )
    }

    return NextResponse.json({
      success: true,
      message: `Employee profile and access permissions for '${updatedName}' updated successfully in database.`,
      user: {
        id: String(targetId),
        email: updatedEmail,
        name: updatedName,
        role: updatedRole,
        department: updatedDept,
        company: updatedCompany,
        employeeId: updatedEmpId,
        phone: updatedPhone,
        isActive: updatedActive === 'Active' || updatedActive === '1',
        permissions: updatedRole === 'super_admin' ? ['all'] : permsArr,
      },
    })
  } catch (error: any) {
    console.error('[admin/users/[id] PATCH] Error updating user:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user in database' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(req, ctx)
}

export async function DELETE(
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
    if (!id) {
      return NextResponse.json({ error: 'User identifier is required.' }, { status: 400 })
    }

    const existingUser = await findUserloginRecord(id)
    if (!existingUser) {
      return NextResponse.json({ error: `User '${id}' not found.` }, { status: 404 })
    }

    const pool = await getPool()
    const targetId = existingUser.id
    const userKeys = [
      String(existingUser.id || ''),
      String(existingUser.unique_key || ''),
      String(existingUser.user_id || ''),
      String(existingUser.email_id || '').toLowerCase().trim(),
    ].filter(Boolean)

    // Delete or deactivate from userlogin
    await pool.query(`DELETE FROM userlogin WHERE id = ?`, [targetId])

    // Cleanup sessions & devices
    for (const key of userKeys) {
      await pool.query(`DELETE FROM user_sessions WHERE user_id = ?`, [key]).catch(() => {})
      await pool.query(`DELETE FROM user_devices WHERE user_id = ?`, [key]).catch(() => {})
    }

    if (existingUser.email_id) {
      await pool.query(`DELETE FROM user_role_permissions WHERE LOWER(TRIM(email)) = ?`, [
        existingUser.email_id.toLowerCase().trim(),
      ]).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: `User '${existingUser.user_name || existingUser.email_id}' deleted from database.`,
    })
  } catch (error: any) {
    console.error('[admin/users/[id] DELETE] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
