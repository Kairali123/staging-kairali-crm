import { getPool } from '@/lib/db'

export interface CustomPagePermissionModule {
  key: string
  label: string
  category: string
  description: string
  actions: string[]
  isCustom?: boolean
}

let _customPermsTableEnsured = false

/**
 * Ensures system_page_permissions table exists in the database.
 */
export async function ensureCustomPermissionsTable(): Promise<void> {
  if (_customPermsTableEnsured) return
  try {
    const pool = await getPool()
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_page_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_key VARCHAR(128) NOT NULL UNIQUE,
        label VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'Custom Modules',
        description VARCHAR(255) DEFAULT '',
        actions_json TEXT NOT NULL,
        is_custom TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_module_key (module_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)
    _customPermsTableEnsured = true
  } catch (error) {
    console.error('[custom-page-permissions] Table initialization error:', error)
  }
}

/**
 * Loads all saved custom page modules and action overrides from the database.
 */
export async function getCustomPagePermissionModules(): Promise<CustomPagePermissionModule[]> {
  try {
    await ensureCustomPermissionsTable()
    const pool = await getPool()
    const [rows]: any = await pool.query(
      `SELECT module_key, label, category, description, actions_json, is_custom FROM system_page_permissions ORDER BY id ASC`
    )
    if (!Array.isArray(rows)) return []

    return rows.map((r: any) => {
      let actions: string[] = []
      try {
        actions = JSON.parse(r.actions_json)
      } catch {
        actions = String(r.actions_json || '')
          .split(',')
          .map((a: string) => a.trim())
          .filter(Boolean)
      }

      return {
        key: r.module_key,
        label: r.label,
        category: r.category,
        description: r.description || '',
        actions,
        isCustom: r.is_custom === 1 || r.is_custom === true,
      }
    })
  } catch (error) {
    console.error('[custom-page-permissions] Failed to fetch custom permissions:', error)
    return []
  }
}

/**
 * Upserts a page permission module and its allowed actions.
 */
export async function upsertCustomPagePermissionModule(
  mod: CustomPagePermissionModule
): Promise<void> {
  await ensureCustomPermissionsTable()
  const pool = await getPool()
  const cleanKey = mod.key.trim()
  const cleanLabel = mod.label.trim()
  const cleanCategory = mod.category.trim() || 'Custom Modules'
  const cleanDescription = mod.description.trim()
  const actionsJson = JSON.stringify(Array.from(new Set(mod.actions.map((a) => a.trim()).filter(Boolean))))
  const isCustom = mod.isCustom ?? true ? 1 : 0

  await pool.query(
    `
    INSERT INTO system_page_permissions (module_key, label, category, description, actions_json, is_custom)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      label = VALUES(label),
      category = VALUES(category),
      description = VALUES(description),
      actions_json = VALUES(actions_json),
      updated_at = CURRENT_TIMESTAMP
    `,
    [cleanKey, cleanLabel, cleanCategory, cleanDescription, actionsJson, isCustom]
  )
}

/**
 * Deletes a custom page permission module.
 */
export async function deleteCustomPagePermissionModule(moduleKey: string): Promise<void> {
  await ensureCustomPermissionsTable()
  const pool = await getPool()
  await pool.query(`DELETE FROM system_page_permissions WHERE module_key = ? AND is_custom = 1`, [
    moduleKey.trim(),
  ])
}
