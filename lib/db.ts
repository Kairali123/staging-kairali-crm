
import mysql from 'mysql2/promise'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set — check .env.local (dev) or Vercel project env vars (prod).`)
  return value
}

const DEFAULT_DB_PORT = 3306

function resolvePort(): number {
  const raw = process.env.DB_PORT
  if (raw === undefined || raw.trim() === '') return DEFAULT_DB_PORT

  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `DB_PORT must be a base-10 integer between 1 and 65535 — check .env.local (dev) or Vercel project env vars (prod).`
    )
  }

  const port = Number.parseInt(trimmed, 10)
  if (port < 1 || port > 65535) {
    throw new Error(
      `DB_PORT must be a base-10 integer between 1 and 65535 — check .env.local (dev) or Vercel project env vars (prod).`
    )
  }

  return port
}

const DB_CONFIG = {
  host: requireEnv('DB_HOST'),
  port: resolvePort(),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  waitForConnections: true,
  connectionLimit: 20,
  connectTimeout: 30000,
  timezone: '+05:30',
}


declare global {
  var _sqlPool: mysql.Pool | undefined
}

export async function getPool(): Promise<mysql.Pool> {

  if (global._sqlPool) return global._sqlPool

  global._sqlPool = mysql.createPool(DB_CONFIG)

  return global._sqlPool
}

/* -----------------------------------
   Retry wrapper for DB queries
----------------------------------- */

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 200
): Promise<T> {

  let lastError: any

  for (let i = 0; i < retries; i++) {

    try {
      return await fn()
    } catch (err) {

      lastError = err

      if (i < retries - 1) {

        const wait = delay * Math.pow(2, i)

        console.warn(`[DB] Retry ${i + 1}/${retries} after ${wait}ms`)

        await new Promise((resolve) => setTimeout(resolve, wait))
      }
    }
  }

  throw lastError
}

export { mysql as sql }

export function requiresOtpProtection(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  // Strip multi-line comments /* ... */ and single-line comments -- ... or # ...
  const clean = query
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '')
    .replace(/#.*$/gm, '')
    .trim()
    .toUpperCase();

  // OTP protection is required ONLY for:
  // 1. Table Creation: CREATE
  // 2. Table / Data Deletion: DELETE, DROP, TRUNCATE
  return (
    clean.startsWith('CREATE') ||
    clean.startsWith('DELETE') ||
    clean.startsWith('DROP') ||
    clean.startsWith('TRUNCATE')
  );
}

export function isWriteQuery(query: string): boolean {
  return requiresOtpProtection(query);
}

export async function ensureDbAccessTables(): Promise<void> {
  const pool = await getPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_access_otp_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requested_by VARCHAR(255) NOT NULL,
        user_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        reason TEXT NOT NULL,
        otp_hash VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        expires_at DATETIME NOT NULL,
        verified_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.query(`ALTER TABLE db_access_otp_requests MODIFY COLUMN action_type VARCHAR(100) NOT NULL`);
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS db_access_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        user_name VARCHAR(255) NULL,
        user_email VARCHAR(255) NULL,
        ip_address VARCHAR(100) NULL,
        user_agent TEXT NULL,
        api_route VARCHAR(255) NULL,
        sql_query TEXT NULL,
        operation_type VARCHAR(50) NULL,
        table_affected VARCHAR(255) NULL,
        status VARCHAR(100) NOT NULL DEFAULT 'success',
        otp_request_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.error('[DB] ensureDbAccessTables error:', err);
  }
}

export async function executeWriteQuery(
  query: string,
  params: any[] = [],
  req?: any,
  otpRequestId?: number
): Promise<any> {
  if (!otpRequestId) {
    throw new Error('Database write action blocked: Missing OTP verification token.');
  }

  await ensureDbAccessTables();
  const pool = await getPool();

  // Validate OTP in DB: must be verified
  const [rows]: any = await pool.query(
    `SELECT * FROM db_access_otp_requests WHERE id = ? AND status = 'verified' LIMIT 1`,
    [otpRequestId]
  );
  const otpRequest = rows[0];

  if (!otpRequest) {
    throw new Error('Database write action blocked: Invalid, expired, or unverified OTP request.');
  }

  // Check if verified within last 15 minutes
  if (otpRequest.expires_at && new Date() > new Date(new Date(otpRequest.expires_at).getTime() + 15 * 60 * 1000)) {
    throw new Error('Database write action blocked: OTP session has expired. Please request a new OTP.');
  }

  // Mark request as consumed/expired so it cannot be replayed
  await pool.query(
    `UPDATE db_access_otp_requests SET status = 'expired' WHERE id = ?`,
    [otpRequestId]
  );

  // Execute the write query (using pool.query for full DDL and DML support)
  const [result] = await pool.query(query, params);
  
  // Audit log
  try {
    await pool.query(
      `INSERT INTO db_access_audit_logs (otp_request_id, sql_query, user_name, user_id, status, operation_type, api_route) VALUES (?, ?, ?, ?, 'success', ?, '/api/inspect-db')`,
      [
        otpRequestId,
        query,
        otpRequest.requested_by || 'Admin',
        otpRequest.user_id || null,
        otpRequest.action_type || 'Write',
      ]
    );
  } catch (auditError) {
    console.error('[AUDIT ERROR] Failed to write db_access_audit_log:', auditError);
  }

  return result;
}


// import mysql from 'mysql2/promise'

// function requireEnv(name: string): string {
//   const value = process.env[name]
//   if (!value) throw new Error(`${name} is not set — check .env.local (dev) or Vercel project env vars (prod).`)
//   return value
// }

// const DEFAULT_DB_PORT = 3306

// function resolvePort(): number {
//   const raw = process.env.DB_PORT
//   if (raw === undefined || raw.trim() === '') return DEFAULT_DB_PORT

//   const trimmed = raw.trim()
//   if (!/^\d+$/.test(trimmed)) {
//     throw new Error(
//       `DB_PORT must be a base-10 integer between 1 and 65535 — check .env.local (dev) or Vercel project env vars (prod).`
//     )
//   }

//   const port = Number.parseInt(trimmed, 10)
//   if (port < 1 || port > 65535) {
//     throw new Error(
//       `DB_PORT must be a base-10 integer between 1 and 65535 — check .env.local (dev) or Vercel project env vars (prod).`
//     )
//   }

//   return port
// }

// const DB_CONFIG = {
//   host: requireEnv('DB_HOST'),
//   port: resolvePort(),
//   database: requireEnv('DB_NAME'),
//   user: requireEnv('DB_USER'),
//   password: requireEnv('DB_PASSWORD'),
//   waitForConnections: true,
//   connectionLimit: 20,
//   connectTimeout: 30000,
//   timezone: '+05:30',
// }


// declare global {
//   var _sqlPool: mysql.Pool | undefined
// }

// export async function getPool(): Promise<mysql.Pool> {

//   if (global._sqlPool) return global._sqlPool

//   global._sqlPool = mysql.createPool(DB_CONFIG)

//   return global._sqlPool
// }

// /* -----------------------------------
//    Retry wrapper for DB queries
// ----------------------------------- */

// export async function executeWithRetry<T>(
//   fn: () => Promise<T>,
//   retries = 3,
//   delay = 200
// ): Promise<T> {

//   let lastError: any

//   for (let i = 0; i < retries; i++) {

//     try {
//       return await fn()
//     } catch (err) {

//       lastError = err

//       if (i < retries - 1) {

//         const wait = delay * Math.pow(2, i)

//         console.warn(`[DB] Retry ${i + 1}/${retries} after ${wait}ms`)

//         await new Promise((resolve) => setTimeout(resolve, wait))
//       }
//     }
//   }

//   throw lastError
// }

// export { mysql as sql }
