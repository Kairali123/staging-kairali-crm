import { getPool } from '@/lib/db'
import type { User, UserRole, Department } from '@/hooks/use-auth'
import crypto from 'crypto'

export interface DbAuthResult {
  success: boolean
  user?: User
  tokenVersion?: number
  message?: string
}

/**
 * Normalizes password comparison to handle plaintext, MD5, SHA256, or standard hashing.
 */
function verifyPassword(inputPass: string, storedPass: string | null | undefined): boolean {
  if (!storedPass || !inputPass) return false
  const trimmedInput = inputPass.trim()
  const trimmedStored = storedPass.trim()

  // 1. Direct equality check
  if (trimmedInput === trimmedStored || inputPass === storedPass) {
    return true
  }

  // 2. MD5 check
  try {
    const md5Hash = crypto.createHash('md5').update(trimmedInput).digest('hex')
    if (md5Hash.toLowerCase() === trimmedStored.toLowerCase()) return true
  } catch {}

  // 3. SHA256 check
  try {
    const sha256Hash = crypto.createHash('sha256').update(trimmedInput).digest('hex')
    if (sha256Hash.toLowerCase() === trimmedStored.toLowerCase()) return true
  } catch {}

  return false
}

/**
 * Checks if account is considered active
 */
function isAccountActive(activeVal: any): boolean {
  if (activeVal === null || activeVal === undefined) return true // default active if unset
  const str = String(activeVal).toLowerCase().trim()
  return str === '1' || str === 'yes' || str === 'true' || str === 'active' || str === ''
}

/**
 * Parses user_role_permissions row columns into a flat string[] of permissions.
 */
export function parsePermissionsFromDbRow(row: Record<string, any> | null | undefined): string[] {
  if (!row) return []

  const permissionsSet = new Set<string>()

  // If role is super_admin or admin with 'all'
  if (row.role === 'super_admin') {
    permissionsSet.add('all')
  }

  const excludedKeys = new Set(['id', 'email', 'role', 'created_at', 'updated_at'])

  for (const [key, value] of Object.entries(row)) {
    if (excludedKeys.has(key) || value === null || value === undefined) continue

    const valStr = String(value).trim()
    if (!valStr || valStr === '0' || valStr === 'false' || valStr === 'no') continue

    // Normalize module key
    const moduleName = key.trim()

    // If val is 'all', '1', 'true', 'yes'
    if (valStr === 'all' || valStr === '1' || valStr === 'true' || valStr === 'yes') {
      permissionsSet.add(`${moduleName}.view`)
      permissionsSet.add(`${moduleName}.edit`)
      permissionsSet.add(`${moduleName}.manage`)
      permissionsSet.add(`${moduleName}.admin`)
      permissionsSet.add(moduleName)
      continue
    }

    // Comma-separated actions, e.g. "view,edit,assign,delete" or full keys like "leads.view,leads.edit"
    const parts = valStr.split(',').map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      if (part.includes('.')) {
        permissionsSet.add(part)
      } else {
        // e.g. 'view' -> 'leads.view', plus standalone 'leads'
        permissionsSet.add(`${moduleName}.${part}`)
        permissionsSet.add(moduleName)
      }
    }
  }

  return Array.from(permissionsSet)
}

/**
 * Extracts per-module chip arrays from a user_role_permissions row.
 * E.g. { dialshree_menu: ['view', 'stage1', 'stage2'], leads: ['view', 'assign'] }
 */
export function extractModulePermissionsFromDbRow(
  row: Record<string, any> | null | undefined
): Record<string, string[]> {
  if (!row) return {}
  const result: Record<string, string[]> = {}
  const excludedKeys = new Set(['id', 'email', 'role', 'created_at', 'updated_at'])

  for (const [key, value] of Object.entries(row)) {
    if (excludedKeys.has(key) || value === null || value === undefined) continue
    const valStr = String(value).trim()
    if (!valStr || valStr === '0' || valStr === 'false' || valStr === 'no') continue

    const moduleName = key.trim()
    if (valStr.toUpperCase() === 'ALL' || valStr === '1' || valStr.toLowerCase() === 'true') {
      result[moduleName] = ['all']
      continue
    }

    // Try parsing JSON if json string e.g. {"view": true, "export": true}
    if (valStr.startsWith('{') && valStr.endsWith('}')) {
      try {
        const parsed = JSON.parse(valStr)
        const activeKeys = Object.entries(parsed)
          .filter(([_, v]) => Boolean(v))
          .map(([k]) => k)
        if (activeKeys.length > 0) {
          result[moduleName] = activeKeys
          continue
        }
      } catch {}
    }

    // Comma-separated parts e.g. "view, assign" or "view, stage1"
    const parts = valStr.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 0) {
      result[moduleName] = parts
    }
  }

  return result
}

/**
 * Fetches permissions for a specific email or role from `user_role_permissions`.
 */
export async function getUserPermissionsFromDb(email: string, role?: string): Promise<string[]> {
  try {
    const pool = await getPool()
    const cleanEmail = email.trim().toLowerCase()

    // 1. Query by email
    const [rows]: any = await pool.query(
      `SELECT * FROM user_role_permissions WHERE LOWER(TRIM(email)) = ? LIMIT 1`,
      [cleanEmail]
    )

    if (Array.isArray(rows) && rows.length > 0) {
      return parsePermissionsFromDbRow(rows[0])
    }

    // 2. Fallback to role if email not found
    if (role) {
      const [roleRows]: any = await pool.query(
        `SELECT * FROM user_role_permissions WHERE LOWER(TRIM(role)) = ? LIMIT 1`,
        [role.toLowerCase().trim()]
      )
      if (Array.isArray(roleRows) && roleRows.length > 0) {
        return parsePermissionsFromDbRow(roleRows[0])
      }
    }

    // 3. Fallback for super_admin
    if (role === 'super_admin') {
      return ['all']
    }

    return []
  } catch (error) {
    console.error('[db-auth] Error fetching permissions from DB:', error)
    return []
  }
}

/**
 * Authenticates a user against `userlogin` and loads permissions from `user_role_permissions`.
 */
export async function authenticateUserFromDb(
  email: string,
  password: string,
  company?: string
): Promise<DbAuthResult> {
  try {
    const pool = await getPool()
    const cleanEmail = email.trim().toLowerCase()

    // 1. Query user and role-permissions concurrently in parallel
    const [userResult, permResult]: any = await Promise.all([
      pool.query(`SELECT * FROM userlogin WHERE LOWER(TRIM(email_id)) = ? LIMIT 1`, [cleanEmail]),
      pool.query(`SELECT * FROM user_role_permissions WHERE LOWER(TRIM(email)) = ? LIMIT 1`, [cleanEmail]),
    ])

    const rows = userResult[0]

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, message: 'Invalid credentials or inactive account' }
    }

    const userRow = rows[0]

    // 2. Verify active status
    if (!isAccountActive(userRow.active)) {
      return { success: false, message: 'Invalid credentials or inactive account' }
    }

    // 3. Verify password
    const isPasswordValid = verifyPassword(password, userRow.password)
    if (!isPasswordValid) {
      return { success: false, message: 'Invalid credentials or inactive account' }
    }

    // 4. Verify company (if provided and user is not super_admin)
    const userRole = (userRow.role || 'sales_agent') as UserRole
    const userCompany = (userRow.company || userRow.company_name || 'KAPPL').toUpperCase()

    if (company && userRole !== 'super_admin') {
      const requestedCompany = company.trim().toUpperCase()
      if (userCompany !== requestedCompany && userCompany !== 'ALL') {
        console.warn(`[db-auth] Company mismatch for ${cleanEmail}: DB=${userCompany}, Requested=${requestedCompany}`)
      }
    }

    // 5. Fetch permissions from the parallel query or fallback
    let permissions: string[] = []
    const permRows = permResult[0]
    if (Array.isArray(permRows) && permRows.length > 0) {
      permissions = parsePermissionsFromDbRow(permRows[0])
    } else {
      permissions = await getUserPermissionsFromDb(cleanEmail, userRole)
    }

    // Merge any direct permissions from userlogin.permission column if present
    if (userRow.permission && typeof userRow.permission === 'string') {
      const directPerms = userRow.permission.split(',').map((p: string) => p.trim()).filter(Boolean)
      permissions = Array.from(new Set([...permissions, ...directPerms]))
    }

    // 6. Assemble action permissions
    const action: Record<string, string> = {
      ktahvPage: userRow.ktahv_page_action_permissions || '',
      villaRaagPage: userRow.villa_raag_page_action_permissions || '',
      kapplPage: userRow.kappl_page_action_permissions || '',
    }

    // 7. Map to the application's User object
    const user: User = {
      id: String(userRow.id || userRow.unique_key || userRow.user_id),
      email: userRow.email_id || cleanEmail,
      name: userRow.user_name || '',
      role: userRole,
      department: (userRow.department || 'Sales') as Department,
      company: (userCompany === 'KTAHV' ? 'KTAHV' : 'KAPPL'),
      employeeId: userRow.user_id || userRow.unique_key || String(userRow.id),
      phone: userRow.user_mobile_no || '',
      imageUrl: userRow.image_link || '',
      joinDate: userRow.join_date
        ? new Date(userRow.join_date).toISOString().split('T')[0]
        : '',
      isActive: true,
      permissions,
      action,
    }

    return {
      success: true,
      user,
      tokenVersion: Number(userRow.token_version || 1),
    }
  } catch (error: any) {
    console.error('[db-auth] Authentication database error:', error)
    return {
      success: false,
      message: 'Authentication service temporarily unavailable',
    }
  }
}
