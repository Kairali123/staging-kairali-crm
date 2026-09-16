/**
 * Database Provisioning Script for Email Trigger Configuration & Execution History
 *
 * Usage:
 *   node scripts/migrate-email-triggers.mjs --plan
 *   node scripts/migrate-email-triggers.mjs --status
 *   node scripts/migrate-email-triggers.mjs --up
 *   node scripts/migrate-email-triggers.mjs --down
 */

import fs from 'node:fs'
import path from 'node:path'

function loadLocalEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const filePath = path.join(process.cwd(), envFile)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim()
          let val = trimmed.slice(idx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
}

function resolveConfig() {
  loadLocalEnv()
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
  // 1. Atomic state storage with row-level locking for serverless environments
  `CREATE TABLE IF NOT EXISTS email_trigger_state (
    id INT PRIMARY KEY,
    state_json LONGTEXT NOT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // Initialize row 1 if not exists
  `INSERT IGNORE INTO email_trigger_state (id, state_json)
   VALUES (1, '{"version":1,"triggers":[],"runs":[]}');`,

  // 2. Tabular triggers view for relational querying / auditing
  `CREATE TABLE IF NOT EXISTS email_triggers (
    id VARCHAR(36) PRIMARY KEY,
    revision INT NOT NULL DEFAULT 1,
    name VARCHAR(120) NOT NULL,
    report_id VARCHAR(60) NOT NULL,
    source VARCHAR(60) NOT NULL,
    template VARCHAR(120) NOT NULL,
    department VARCHAR(60) NOT NULL,
    company VARCHAR(30) NOT NULL,
    to_recipients TEXT NOT NULL,
    cc_recipients TEXT NULL,
    bcc_recipients TEXT NULL,
    subject VARCHAR(250) NOT NULL,
    body MEDIUMTEXT NULL,
    body_type VARCHAR(50) NOT NULL,
    intro TEXT NULL,
    closing TEXT NULL,
    period VARCHAR(30) NOT NULL,
    preview_date VARCHAR(10) NULL,
    report_detail VARCHAR(50) NOT NULL,
    status ENUM('Draft', 'Active', 'Paused') NOT NULL DEFAULT 'Draft',
    frequency VARCHAR(30) NOT NULL,
    schedule_time VARCHAR(10) NOT NULL,
    custom_times VARCHAR(180) NULL,
    interval_hours VARCHAR(10) NULL,
    weekday VARCHAR(20) NULL,
    monthday VARCHAR(20) NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    start_date VARCHAR(10) NOT NULL,
    end_date VARCHAR(10) NULL,
    reply_to VARCHAR(255) NULL,
    owner VARCHAR(60) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    next_run VARCHAR(50) NULL,
    last_result VARCHAR(255) NOT NULL DEFAULT '—',
    INDEX idx_email_triggers_status (status),
    INDEX idx_email_triggers_report (report_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  // 3. Tabular execution history view
  `CREATE TABLE IF NOT EXISTS email_trigger_runs (
    id VARCHAR(100) PRIMARY KEY,
    trigger_id VARCHAR(36) NOT NULL,
    name VARCHAR(120) NOT NULL,
    scheduled_at VARCHAR(50) NOT NULL,
    started_at VARCHAR(50) NOT NULL,
    finished_at VARCHAR(50) NULL,
    status ENUM('Preparing', 'Sending', 'Accepted', 'Failed', 'Unknown', 'Skipped', 'Partial') NOT NULL,
    detail TEXT NOT NULL,
    recipient_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_email_trigger_runs_trigger (trigger_id),
    INDEX idx_email_trigger_runs_status (status),
    INDEX idx_email_trigger_runs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
]

async function checkStatus(conn) {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN ('email_trigger_state', 'email_triggers', 'email_trigger_runs')`
  )
  const found = (tables || []).map(r => r.TABLE_NAME)
  console.log('[migration-status] Found tables:', found)
  return found.length === 3
}

async function main() {
  const mode = process.argv[2] || '--status'

  if (mode === '--plan') {
    console.log('[migration-plan] Additive tables: email_trigger_state, email_triggers, email_trigger_runs')
    console.log('[migration-plan] Storage provides atomic row locking in MySQL for serverless hosted scheduling.')
    console.log('[migration-plan] Existing objects are preserved; no destructive changes.')
    return
  }

  if (mode === '--down') {
    console.log('[rollback] Additive tables contain configuration and send logs.')
    console.log('[rollback] To preserve audit logs and avoid accidental deletion, no tables are automatically dropped.')
    console.log('[rollback] Revert application code to roll back.')
    return
  }

  if (mode !== '--up' && mode !== '--status') {
    throw new Error(`Unknown argument: ${mode}. Use --plan, --up, --down, or --status.`)
  }

  const { default: mysql } = await import('mysql2/promise')
  const conn = await mysql.createConnection(resolveConfig())

  try {
    if (mode === '--up') {
      console.log('[migration] Applying up migration...')
      for (const sql of UP_MIGRATION_SQL) {
        await conn.query(sql)
      }
      const verified = await checkStatus(conn)
      if (!verified) throw new Error('Verification failed after up migration')
      console.log('[migration] Successfully provisioned email trigger schema.')
    } else {
      const verified = await checkStatus(conn)
      console.log(`[migration] Schema readiness: ${verified ? 'PROVISIONED & READY' : 'TABLES MISSING'}`)
    }
  } finally {
    await conn.end()
  }
}

main().catch(err => {
  console.error('[migration-error]', err.message)
  process.exit(1)
})
