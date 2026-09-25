/**
 * Database Provisioning Script for Multi-Vendor Email Marketing & Newsletter Platform
 *
 * Usage:
 *   node scripts/migrate-email-marketing.mjs --plan
 *   node scripts/migrate-email-marketing.mjs --status
 *   node scripts/migrate-email-marketing.mjs --up
 *   node scripts/migrate-email-marketing.mjs --down
 */

import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

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

function getDbConfig() {
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
  `CREATE TABLE IF NOT EXISTS email_providers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status ENUM('Active', 'Inactive', 'Warning', 'Error') NOT NULL DEFAULT 'Inactive',
    monthly_limit INT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_provider_credentials (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    api_secret_encrypted TEXT NULL,
    base_url VARCHAR(255) NULL,
    region VARCHAR(50) NULL,
    account_id VARCHAR(100) NULL,
    webhook_secret_encrypted TEXT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_provider_limits (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    monthly_limit INT NULL,
    daily_limit INT NULL,
    hourly_limit INT NULL,
    per_minute_rate INT NULL,
    max_concurrent_jobs INT NOT NULL DEFAULT 5,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_provider_routing_rules (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    criteria_json TEXT NOT NULL,
    priority INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_sender_identities (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255) NULL,
    domain VARCHAR(255) NOT NULL,
    verification_status ENUM('Pending', 'Verified', 'Failed') NOT NULL DEFAULT 'Pending',
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_domains (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    spf_status VARCHAR(50) NULL,
    dkim_status VARCHAR(50) NULL,
    dmarc_status VARCHAR(50) NULL,
    verification_status ENUM('Pending', 'Verified', 'Failed') NOT NULL DEFAULT 'Pending',
    last_checked DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(60) NULL,
    description TEXT NULL,
    default_provider_id VARCHAR(36) NULL,
    created_by VARCHAR(60) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (default_provider_id) REFERENCES email_providers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_template_versions (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    version INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content LONGTEXT NOT NULL,
    created_by VARCHAR(60) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_campaigns (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(60) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    template_version_id VARCHAR(36) NOT NULL,
    description TEXT NULL,
    tags TEXT NULL,
    provider_selection_mode ENUM('MANUAL', 'AUTOMATIC', 'HYBRID') NOT NULL DEFAULT 'MANUAL',
    selected_provider_id VARCHAR(36) NULL,
    status ENUM('Draft', 'Scheduled', 'Processing', 'Completed', 'Failed', 'Cancelled') NOT NULL DEFAULT 'Draft',
    created_by VARCHAR(60) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (template_id) REFERENCES email_templates(id),
    FOREIGN KEY (template_version_id) REFERENCES email_template_versions(id),
    FOREIGN KEY (selected_provider_id) REFERENCES email_providers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_campaign_provider_assignments (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    percentage INT NULL,
    absolute_amount INT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    contact_id VARCHAR(60) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('Eligible', 'Suppressed', 'Unsubscribed', 'Invalid', 'Duplicate') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (campaign_id),
    INDEX (email),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_queue (
    job_id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    recipient_id VARCHAR(36) NOT NULL,
    contact_id VARCHAR(60) NOT NULL,
    provider_id VARCHAR(36) NULL,
    status ENUM('Pending', 'Processing', 'Sent', 'Delivered', 'Failed', 'Retrying', 'Unknown', 'Suppressed') NOT NULL DEFAULT 'Pending',
    attempt INT NOT NULL DEFAULT 0,
    scheduled_at DATETIME(3) NOT NULL,
    provider_message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX (campaign_id),
    INDEX (provider_id),
    INDEX (status, scheduled_at),
    INDEX (provider_message_id),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES email_campaign_recipients(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    job_id VARCHAR(36) NULL,
    provider_message_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    payload_json LONGTEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE (provider_event_id),
    INDEX (provider_message_id),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES email_queue(job_id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_campaign_events (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    job_id VARCHAR(36) NOT NULL,
    event_type ENUM('Sent', 'Delivered', 'Opened', 'Clicked', 'Hard Bounce', 'Soft Bounce', 'Complaint', 'Unsubscribe', 'Failed') NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX (campaign_id, event_type),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES email_queue(job_id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_suppressions (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    provider_id VARCHAR(36) NULL,
    reason VARCHAR(120) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE (email, provider_id),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_schedules (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NOT NULL,
    type ENUM('One-Time', 'Recurring') NOT NULL,
    cron_expression VARCHAR(60) NULL,
    scheduled_at DATETIME(3) NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    status ENUM('Active', 'Paused', 'Completed') NOT NULL DEFAULT 'Active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_provider_usage (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    month_year VARCHAR(7) NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE (provider_id, month_year),
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(60) NOT NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    details_json TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE IF NOT EXISTS email_test_sends (
    id VARCHAR(36) PRIMARY KEY,
    campaign_id VARCHAR(36) NULL,
    template_id VARCHAR(36) NULL,
    recipient_email VARCHAR(255) NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    status ENUM('Success', 'Failed') NOT NULL,
    error_message TEXT NULL,
    created_by VARCHAR(60) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES email_providers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
]

const DOWN_MIGRATION_SQL = [
  'DROP TABLE IF EXISTS email_test_sends;',
  'DROP TABLE IF EXISTS email_audit_logs;',
  'DROP TABLE IF EXISTS email_provider_usage;',
  'DROP TABLE IF EXISTS email_schedules;',
  'DROP TABLE IF EXISTS email_suppressions;',
  'DROP TABLE IF EXISTS email_campaign_events;',
  'DROP TABLE IF EXISTS email_webhook_events;',
  'DROP TABLE IF EXISTS email_queue;',
  'DROP TABLE IF EXISTS email_campaign_recipients;',
  'DROP TABLE IF EXISTS email_campaign_provider_assignments;',
  'DROP TABLE IF EXISTS email_campaigns;',
  'DROP TABLE IF EXISTS email_template_versions;',
  'DROP TABLE IF EXISTS email_templates;',
  'DROP TABLE IF EXISTS email_domains;',
  'DROP TABLE IF EXISTS email_sender_identities;',
  'DROP TABLE IF EXISTS email_provider_routing_rules;',
  'DROP TABLE IF EXISTS email_provider_limits;',
  'DROP TABLE IF EXISTS email_provider_credentials;',
  'DROP TABLE IF EXISTS email_providers;'
]

async function run() {
  const args = process.argv.slice(2)
  const isPlan = args.includes('--plan') || args.includes('--status')
  const isDown = args.includes('--down')
  const isUp = args.includes('--up')

  if (!isPlan && !isDown && !isUp) {
    console.error('Usage: node scripts/migrate-email-marketing.mjs [--plan | --status | --up | --down]')
    process.exit(1)
  }

  try {
    loadLocalEnv()
    const config = getDbConfig()
    
    if (isPlan) {
      console.log('--- Migration Plan ---')
      console.log('Database Host:', config.host)
      console.log('Database Name:', config.database)
      console.log('Tables to create:')
      for (const sql of UP_MIGRATION_SQL) {
        const match = sql.match(/CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)/)
        if (match) {
          console.log(`  + ${match[1]}`)
        }
      }
      return
    }

    console.log(`Connecting to database ${config.database} at ${config.host}...`)
    const conn = await mysql.createConnection(config)

    const statements = isDown ? DOWN_MIGRATION_SQL : UP_MIGRATION_SQL
    
    for (const sql of statements) {
      const matchCreate = sql.match(/CREATE TABLE IF NOT EXISTS ([a-z0-9_]+)/)
      const matchDrop = sql.match(/DROP TABLE IF EXISTS ([a-z0-9_]+)/)
      
      const tableName = (matchCreate && matchCreate[1]) || (matchDrop && matchDrop[1]) || 'unknown'
      console.log(`Executing: ${isDown ? 'DROP' : 'CREATE'} ${tableName}...`)
      
      await conn.query(sql)
    }

    await conn.end()
    console.log('Migration completed successfully.')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

run()
