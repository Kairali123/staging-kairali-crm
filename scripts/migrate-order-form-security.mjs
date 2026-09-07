/**
 * Database Provisioning and Rollback Script for KAPPL Primary Order Form Security
 *
 * Usage:
 *   node scripts/migrate-order-form-security.mjs --status
 *   node scripts/migrate-order-form-security.mjs --up
 *   node scripts/migrate-order-form-security.mjs --down
 */

import mysql from 'mysql2/promise'

function resolveConfig() {
  const host = process.env.DB_HOST
  const database = process.env.DB_NAME
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const port = Number(process.env.DB_PORT || 3306)

  if (!host || !database || !user) {
    throw new Error('Missing database environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD).')
  }

  return { host, port, database, user, password, timezone: '+05:30' }
}

const UP_MIGRATION_SQL = [
  `CREATE TABLE IF NOT EXISTS order_form_rate_limits (
    rate_key VARCHAR(64) PRIMARY KEY,
    window_started_at DATETIME(3) NOT NULL,
    request_count INT NOT NULL DEFAULT 0,
    expires_at DATETIME(3) NOT NULL,
    INDEX idx_order_form_rate_expiry (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS order_form_audit_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id CHAR(36) NOT NULL UNIQUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    actor VARCHAR(190) NOT NULL,
    role_name VARCHAR(80) NOT NULL,
    action_name VARCHAR(40) NOT NULL,
    outcome ENUM('success','failure','denied') NOT NULL,
    source_ip VARCHAR(80) NOT NULL,
    correlation_id VARCHAR(80) NOT NULL,
    target_id VARCHAR(190) NULL,
    duration_ms INT UNSIGNED NULL,
    error_code VARCHAR(80) NULL,
    INDEX idx_order_form_audit_created (created_at),
    INDEX idx_order_form_audit_actor (actor, created_at),
    INDEX idx_order_form_audit_action (action_name, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
]

const DOWN_ROLLBACK_SQL = [
  `DROP TABLE IF EXISTS order_form_rate_limits;`,
  `DROP TABLE IF EXISTS order_form_audit_log;`
]

async function checkStatus(conn) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN ('order_form_rate_limits', 'order_form_audit_log')`
  )
  const found = (tables || []).map(r => r.TABLE_NAME)
  console.log('[migration-status] Found tables:', found)
  return found.length === 2
}

async function main() {
  const mode = process.argv[2] || '--status'
  const config = resolveConfig()
  const conn = await mysql.createConnection(config)

  try {
    if (mode === '--up') {
      console.log('[migration] Applying up migration...')
      for (const sql of UP_MIGRATION_SQL) {
        await conn.query(sql)
      }
      const verified = await checkStatus(conn)
      if (!verified) throw new Error('Verification failed after up migration')
      console.log('[migration] Successfully provisioned order form security schema.')
    } else if (mode === '--down') {
      console.log('[migration] Applying rollback (down migration)...')
      for (const sql of DOWN_ROLLBACK_SQL) {
        await conn.query(sql)
      }
      const remaining = await checkStatus(conn)
      if (remaining) throw new Error('Rollback verification failed: tables still exist')
      console.log('[migration] Successfully rolled back order form security schema.')
    } else if (mode === '--status') {
      const verified = await checkStatus(conn)
      console.log(`[migration] Schema readiness: ${verified ? 'PROVISIONED & READY' : 'TABLES MISSING'}`)
    } else {
      console.error(`Unknown argument: ${mode}. Use --up, --down, or --status.`)
      process.exitCode = 1
    }
  } finally {
    await conn.end()
  }
}

main().catch(err => {
  console.error('[migration-error]', err.message)
  process.exit(1)
})
