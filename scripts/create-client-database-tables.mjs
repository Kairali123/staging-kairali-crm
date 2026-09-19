import { getPool } from '../lib/db.js'

async function migrate() {
  console.log('[Migration] Updating client database tables with Address, Country & Expanded Columns...')
  const pool = await getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_database (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unique_client_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NULL,
      phone VARCHAR(50) NULL,
      alternate_phone VARCHAR(50) NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized',
      sub_category VARCHAR(100) NULL DEFAULT 'General',
      source_sheet VARCHAR(255) NOT NULL DEFAULT 'Manual Entry',
      address TEXT NULL,
      city_state VARCHAR(255) NULL,
      country VARCHAR(100) NULL DEFAULT 'India',
      remarks TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_client_phone (phone),
      INDEX idx_client_email (email),
      INDEX idx_client_category (category),
      INDEX idx_client_sub_category (sub_category),
      INDEX idx_client_source (source_sheet)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  try {
    await pool.query(`ALTER TABLE client_database ADD COLUMN address TEXT NULL AFTER source_sheet`)
  } catch (e) {}

  try {
    await pool.query(`ALTER TABLE client_database ADD COLUMN country VARCHAR(100) NULL DEFAULT 'India' AFTER city_state`)
  } catch (e) {}

  console.log('[Migration] Client database tables updated successfully with Address & Country!')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('[Migration Error]', err)
  process.exit(1)
})
