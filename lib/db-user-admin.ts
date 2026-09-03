import { getPool } from '@/lib/db'
import { parsePermissionsFromDbRow } from '@/lib/db-auth'

export const PERMISSION_MODULE_COLUMNS = [
  'bookings',
  'calls',
  'consultations',
  'dashboard',
  'employee',
  'escalations',
  'fms',
  'guests',
  'helpdesk',
  'invoices',
  'leads',
  'marketing',
  'payments',
  'performance',
  'prescriptions',
  'reports',
  'team',
  'users',
  'villa_raag',
  'calls_report',
  'sales_report',
  'marketing_facebook_report',
  'marketing_google_report',
  'google_adword_report',
  'marketing_funnel',
  'portal_hub',
  'sales_target_portal',
  'call_recording_portal',
  'doctor_portal',
  'partner_onboard_form',
  'partners',
  'ai_voice_menu',
  'ai_voice_sent',
  'ai_voice_received',
  'ai_voice_summary',
  'new_order_fms',
  'riya_sharma',
  'meetings',
  'accounts_tracker',
  'crr_fms',
  'om_fms',
  'oohl_enquiry_new',
  'dialshree_menu',
  'dialshree_received',
  'dialshree_sent',
  'dialshree_summary',
  'sales_call_audit',
] as const

/**
 * Maps a list of granular permission keys (e.g. ['dashboard.view', 'crr_fms.view'])
 * or an explicit module-permissions map into individual column values for `user_role_permissions`.
 */
export function mapPermissionsToColumns(
  permissions: string[],
  modulePermissions?: Record<string, string[]>
): Record<string, string> {
  const isSuper = permissions.includes('all')
  const record: Record<string, string> = {}

  // If explicit module permissions map is provided, use it directly
  if (modulePermissions && typeof modulePermissions === 'object') {
    for (const [modKey, chips] of Object.entries(modulePermissions)) {
      if (!chips || !Array.isArray(chips) || chips.length === 0) {
        record[modKey] = ''
      } else if (isSuper) {
        record[modKey] = 'ALL'
      } else {
        record[modKey] = chips.join(', ')
      }
    }
  }

  for (const col of PERMISSION_MODULE_COLUMNS) {
    // If already set by modulePermissions, keep it
    if (record[col] !== undefined) continue

    if (isSuper) {
      if (
        [
          'reports',
          'calls_report',
          'sales_report',
          'marketing_facebook_report',
          'marketing_google_report',
          'google_adword_report',
        ].includes(col)
      ) {
        record[col] = JSON.stringify({ view: true, export: true })
      } else {
        record[col] = 'ALL'
      }
      continue
    }

    // Match permissions for this column
    const normalizedCol = col.replace(/_/g, '-')
    const matchingPerms = permissions.filter((p) => {
      const pNorm = p.replace(/_/g, '-')
      return pNorm === normalizedCol || pNorm.startsWith(`${normalizedCol}.`)
    })

    if (matchingPerms.length === 0) {
      record[col] = ''
      continue
    }

    if (
      [
        'reports',
        'calls_report',
        'sales_report',
        'marketing_facebook_report',
        'marketing_google_report',
        'google_adword_report',
      ].includes(col)
    ) {
      record[col] = JSON.stringify({ view: true, export: true })
      continue
    }

    const actions = matchingPerms.map((p) => {
      const dotIndex = p.indexOf('.')
      return dotIndex >= 0 ? p.substring(dotIndex + 1) : 'view'
    })

    record[col] = Array.from(new Set(actions)).join(', ') || 'view'
  }

  return record
}

/**
 * Saves permissions to `user_role_permissions` (upsert by email).
 * Safely verifies actual database columns first to prevent syntax/column errors.
 */
export async function syncUserRolePermissions(
  email: string,
  role: string,
  permissions: string[],
  modulePermissions?: Record<string, string[]>
): Promise<void> {
  if (!email || !email.trim()) return

  const cleanEmail = email.trim().toLowerCase()
  const pool = await getPool()
  const columnValues = mapPermissionsToColumns(permissions, modulePermissions)

  // Fetch actual columns that exist in the database table
  let existingColumns: Set<string> | null = null
  try {
    const [cols]: any = await pool.query('SHOW COLUMNS FROM user_role_permissions')
    if (Array.isArray(cols)) {
      existingColumns = new Set(cols.map((c: any) => String(c.Field).toLowerCase()))
    }
  } catch (err) {
    console.warn('[syncUserRolePermissions] Warning: could not introspect columns:', err)
  }

  // Filter only to columns that exist in table (or default to known columns if introspection failed)
  const candidateColumns = ['email', 'role', ...Object.keys(columnValues)]
  const filteredColumns = candidateColumns.filter((col) => {
    if (!existingColumns) return true
    return existingColumns.has(col.toLowerCase())
  })

  const values = filteredColumns.map((col) => {
    if (col === 'email') return cleanEmail
    if (col === 'role') return role
    return columnValues[col] ?? ''
  })

  const placeholders = filteredColumns.map(() => '?').join(', ')
  const updateClause = filteredColumns
    .filter((c) => c !== 'email')
    .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
    .join(', ')

  const sql = `
    INSERT INTO user_role_permissions (${filteredColumns.map((c) => `\`${c}\``).join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updateClause}, updated_at = CURRENT_TIMESTAMP
  `

  await pool.query(sql, values)
}

/**
 * Finds user in `userlogin` by ID, unique_key, user_id, or email_id.
 */
export async function findUserloginRecord(idOrKey: string) {
  const pool = await getPool()
  const [rows]: any = await pool.query(
    `SELECT * FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR LOWER(TRIM(email_id)) = ? LIMIT 1`,
    [idOrKey, idOrKey, idOrKey, idOrKey.toLowerCase().trim()]
  )
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null
}
