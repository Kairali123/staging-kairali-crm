import mysql from 'mysql2/promise'

export async function ensureClientDatabaseTables(pool: mysql.Pool): Promise<void> {
  try {
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

    try {
      await pool.query(`ALTER TABLE client_database ADD COLUMN source_sheet_url VARCHAR(500) NULL AFTER source_sheet`)
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_upload_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        uploaded_by VARCHAR(255) NOT NULL DEFAULT 'System',
        total_rows INT NOT NULL DEFAULT 0,
        added_rows INT NOT NULL DEFAULT 0,
        rejected_rows INT NOT NULL DEFAULT 0,
        rejection_reasons JSON NULL,
        drive_file_id VARCHAR(255) NULL,
        drive_file_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'success',
        added_count INT NOT NULL DEFAULT 0,
        duplicate_count INT NOT NULL DEFAULT 0,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    // app_settings: key-value store for dynamic config (e.g. active master sheet)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key_name VARCHAR(100) PRIMARY KEY,
        key_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    // Seed the default master sheet ID if not already set
    await pool.query(`
      INSERT IGNORE INTO app_settings (key_name, key_value)
      VALUES 
        ('active_master_sheet_id', '1XkE5g9kzbLNFn8DnyNW3Ielfal60frvQhp2dK9q_Vp4'),
        ('active_master_sheet_url', 'https://docs.google.com/spreadsheets/d/1XkE5g9kzbLNFn8DnyNW3Ielfal60frvQhp2dK9q_Vp4/edit?gid=0#gid=0'),
        ('master_sheet_part', '1')
    `)
  } catch (err) {
    console.error('[DB] ensureClientDatabaseTables error:', err)
  }
}
