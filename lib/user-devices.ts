import { getPool } from '@/lib/db'
import { randomUUID } from 'crypto'
import { broadcastSessionEvent } from '@/lib/session-event-bus'

export interface UserDevice {
  id: string
  userId: string
  deviceId: string
  deviceName: string | null
  platform: string | null
  browser: string | null
  ipAddress: string | null
  createdAt: string
  lastUsedAt: string
}

export interface UserSessionRecord {
  sid: string
  userId: string
  deviceId: string
  deviceName: string | null
  platform: string | null
  ipAddress: string | null
  isActive: boolean
  revokedReason: string | null
  createdAt: string
  lastHeartbeat: string
}

let _tablesEnsured = false

/**
 * Ensures user_devices, user_sessions, and token_version exist in the database.
 */
export async function ensureSecurityTables(): Promise<void> {
  if (_tablesEnsured) return
  try {
    const pool = await getPool()

    // 1. user_devices table (tracks registered devices, max 2 per user)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        device_id VARCHAR(128) NOT NULL,
        device_name VARCHAR(128) NULL,
        platform VARCHAR(64) NULL,
        browser VARCHAR(64) NULL,
        ip_address VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_device (user_id, device_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    // 2. user_sessions table (tracks active concurrent sessions & heartbeats)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        device_id VARCHAR(128) NOT NULL,
        device_name VARCHAR(128) NULL,
        platform VARCHAR(64) NULL,
        ip_address VARCHAR(64) NULL,
        is_active TINYINT(1) DEFAULT 1,
        revoked_reason VARCHAR(128) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_active (user_id, is_active),
        INDEX idx_user_device (user_id, device_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `)

    // 3. Ensure token_version column exists on userlogin table
    try {
      await pool.query(`
        ALTER TABLE userlogin ADD COLUMN token_version INT DEFAULT 1;
      `)
    } catch (colErr: any) {
      // Ignore if duplicate column name error (ER_DUP_FIELDNAME)
      if (!String(colErr?.message || '').includes('Duplicate column') && colErr?.code !== 'ER_DUP_FIELDNAME') {
        console.warn('[user-devices] Alter userlogin token_version notice:', colErr?.message)
      }
    }

    _tablesEnsured = true
  } catch (error) {
    console.error('[user-devices] Failed to ensure security tables:', error)
  }
}

/**
 * Resolves any user identifier (id, unique_key, user_id, email_id) to the canonical userlogin.id string
 */
export async function resolveCanonicalUserId(userIdOrEmail: string): Promise<string> {
  const clean = String(userIdOrEmail).trim()
  if (!clean) return ''
  // If already a canonical numeric ID, return immediately without a DB round-trip
  if (/^\d+$/.test(clean)) return clean

  try {
    const pool = await getPool()
    const [rows]: any = await pool.query(
      `SELECT id FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR LOWER(TRIM(email_id)) = ? LIMIT 1`,
      [clean, clean, clean, clean.toLowerCase()]
    )
    if (Array.isArray(rows) && rows.length > 0 && rows[0].id) {
      return String(rows[0].id)
    }
  } catch (err) {
    console.warn('[user-devices] resolveCanonicalUserId error:', err)
  }
  return clean
}

/**
 * Validates and registers a device for a user.
 * Limit: Max 2 devices per user.
 */
export async function registerOrValidateDevice(
  rawUserId: string,
  deviceId: string,
  meta: {
    deviceName?: string
    platform?: string
    browser?: string
    ipAddress?: string
    role?: string
  }
): Promise<{
  allowed: boolean
  reason?: 'DEVICE_LIMIT_REACHED' | 'INVALID_DEVICE'
  registeredCount?: number
  devices?: UserDevice[]
}> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)
  const cleanDeviceId = String(deviceId).trim()

  if (!cleanUserId || !cleanDeviceId) {
    return { allowed: false, reason: 'INVALID_DEVICE' }
  }

  // Check if user is super_admin (exempt from 2-device limit)
  const normalizedRole = String(meta?.role || '').toLowerCase().trim().replace(/[\s_-]+/g, '_')
  let isSuperAdmin = normalizedRole === 'super_admin' || normalizedRole === 'superadmin'
  if (!isSuperAdmin) {
    try {
      const [roleRows]: any = await pool.query(
        `SELECT role FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? LIMIT 1`,
        [cleanUserId, cleanUserId, cleanUserId]
      )
      if (Array.isArray(roleRows) && roleRows.length > 0) {
        const dbRole = String(roleRows[0]?.role || '').toLowerCase().trim().replace(/[\s_-]+/g, '_')
        if (dbRole === 'super_admin' || dbRole === 'superadmin') {
          isSuperAdmin = true
        }
      }
    } catch {
      // Ignore query error and proceed with standard check
    }
  }

  // 1. Fetch currently registered devices in one query
  const [rows]: any = await pool.query(
    `SELECT * FROM user_devices WHERE user_id = ? OR user_id = ? ORDER BY last_used_at DESC`,
    [cleanUserId, String(rawUserId).trim()]
  )

  const currentDevices: any[] = Array.isArray(rows) ? rows : []
  const existingDevice = currentDevices.find((d) => String(d.device_id).trim() === cleanDeviceId)

  // If this device is already registered, update its metadata
  if (existingDevice) {
    await pool.query(
      `UPDATE user_devices 
       SET user_id = ?,
           last_used_at = NOW(), 
           device_name = COALESCE(?, device_name), 
           platform = COALESCE(?, platform),
           browser = COALESCE(?, browser),
           ip_address = COALESCE(?, ip_address)
       WHERE id = ?`,
      [
        cleanUserId,
        meta.deviceName || null,
        meta.platform || null,
        meta.browser || null,
        meta.ipAddress || null,
        existingDevice.id,
      ]
    )
    return { allowed: true }
  }

  // If already at 2 registered devices and NOT super_admin, reject 3rd new device
  if (!isSuperAdmin && currentDevices.length >= 2) {
    const formattedDevices: UserDevice[] = currentDevices.map((d) => ({
      id: d.id,
      userId: d.user_id,
      deviceId: d.device_id,
      deviceName: d.device_name,
      platform: d.platform,
      browser: d.browser,
      ipAddress: d.ip_address,
      createdAt: d.created_at,
      lastUsedAt: d.last_used_at,
    }))

    return {
      allowed: false,
      reason: 'DEVICE_LIMIT_REACHED',
      registeredCount: currentDevices.length,
      devices: formattedDevices,
    }
  }

  // Register the new device (1st, 2nd device, or unlimited for super_admin)
  const newId = randomUUID()
  await pool.query(
    `INSERT INTO user_devices (id, user_id, device_id, device_name, platform, browser, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       last_used_at = NOW(),
       device_name = COALESCE(VALUES(device_name), device_name),
       platform = COALESCE(VALUES(platform), platform),
       browser = COALESCE(VALUES(browser), browser),
       ip_address = COALESCE(VALUES(ip_address), ip_address)`,
    [
      newId,
      cleanUserId,
      cleanDeviceId,
      meta.deviceName || 'Web Browser',
      meta.platform || 'Unknown OS',
      meta.browser || 'Unknown Browser',
      meta.ipAddress || null,
    ]
  )

  return { allowed: true }
}

/**
 * Gets all registered devices for a given user.
 */
export async function getRegisteredDevices(rawUserId: string): Promise<UserDevice[]> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)

  const [rows]: any = await pool.query(
    `SELECT * FROM user_devices WHERE user_id = ? OR user_id = ? ORDER BY last_used_at DESC`,
    [cleanUserId, String(rawUserId).trim()]
  )

  if (!Array.isArray(rows)) return []

  return rows.map((d) => ({
    id: d.id,
    userId: d.user_id,
    deviceId: d.device_id,
    deviceName: d.device_name,
    platform: d.platform,
    browser: d.browser,
    ipAddress: d.ip_address,
    createdAt: d.created_at,
    lastUsedAt: d.last_used_at,
  }))
}

/**
 * Removes a registered device and terminates its active sessions.
 */
export async function removeRegisteredDevice(rawUserId: string, deviceId: string): Promise<boolean> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)
  const cleanDeviceId = String(deviceId).trim()

  // 1. Delete from user_devices
  await pool.query(`DELETE FROM user_devices WHERE (user_id = ? OR user_id = ?) AND device_id = ?`, [
    cleanUserId,
    String(rawUserId).trim(),
    cleanDeviceId,
  ])

  // 2. Revoke active sessions for this device
  await pool.query(
    `UPDATE user_sessions 
     SET is_active = 0, revoked_reason = 'DEVICE_REMOVED'
     WHERE (user_id = ? OR user_id = ?) AND device_id = ? AND is_active = 1`,
    [cleanUserId, String(rawUserId).trim(), cleanDeviceId]
  )

  // 3. Broadcast real-time remote logout event to that device
  broadcastSessionEvent(cleanUserId, {
    type: 'REMOTE_LOGOUT',
    deviceId: cleanDeviceId,
    message: 'This device was removed by the administrator. Please log in again if required.',
  })
  if (rawUserId !== cleanUserId) {
    broadcastSessionEvent(String(rawUserId).trim(), {
      type: 'REMOTE_LOGOUT',
      deviceId: cleanDeviceId,
      message: 'This device was removed by the administrator. Please log in again if required.',
    })
  }

  return true
}

/**
 * Creates an active session for a user on a given device.
 * Enforces Single Concurrent Active Device (Hotstar Model):
 * Any other currently active session for this user is kicked/paused.
 */
export async function createActiveSession(
  sid: string,
  rawUserId: string,
  deviceId: string,
  meta: {
    deviceName?: string
    platform?: string
    ipAddress?: string
  }
): Promise<void> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)
  const cleanDeviceId = String(deviceId).trim()

  // 1. Kick any other active session for this user (Single Active Device Concurrency)
  const [activeSessions]: any = await pool.query(
    `SELECT sid, device_id FROM user_sessions WHERE (user_id = ? OR user_id = ?) AND is_active = 1`,
    [cleanUserId, String(rawUserId).trim()]
  )

  if (Array.isArray(activeSessions) && activeSessions.length > 0) {
    await pool.query(
      `UPDATE user_sessions 
       SET is_active = 0, revoked_reason = 'KICKED_BY_CONCURRENT_DEVICE'
       WHERE (user_id = ? OR user_id = ?) AND is_active = 1`,
      [cleanUserId, String(rawUserId).trim()]
    )

    // Notify other active device(s) in real time
    for (const s of activeSessions) {
      if (s.sid !== sid) {
        broadcastSessionEvent(cleanUserId, {
          type: 'SESSION_KICKED',
          sid: s.sid,
          deviceId: s.device_id,
          message: 'Your account was accessed from another authorized device. Access on this device has been paused to prevent concurrent logins.',
        })
        if (rawUserId !== cleanUserId) {
          broadcastSessionEvent(String(rawUserId).trim(), {
            type: 'SESSION_KICKED',
            sid: s.sid,
            deviceId: s.device_id,
            message: 'Your account was accessed from another authorized device. Access on this device has been paused to prevent concurrent logins.',
          })
        }
      }
    }
  }

  // 2. Insert new active session record
  await pool.query(
    `INSERT INTO user_sessions (sid, user_id, device_id, device_name, platform, ip_address, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE 
       is_active = 1, 
       revoked_reason = NULL,
       device_name = COALESCE(VALUES(device_name), device_name),
       platform = COALESCE(VALUES(platform), platform),
       ip_address = COALESCE(VALUES(ip_address), ip_address),
       last_heartbeat = NOW()`,
    [
      sid,
      cleanUserId,
      cleanDeviceId,
      meta.deviceName || null,
      meta.platform || null,
      meta.ipAddress || null,
    ]
  )
}

/**
 * Validates session status against DB:
 * 1. Checks user token_version (password reset invalidation).
 * 2. Checks user_sessions.is_active status.
 */
export async function validateSessionState(
  sid: string,
  rawUserId: string,
  tokenVersion?: number
): Promise<{
  valid: boolean
  reason?: string
}> {
  try {
    const pool = await getPool()
    const cleanUserId = await resolveCanonicalUserId(rawUserId)

    // 1. Check userlogin token_version (only if client tokenVersion is known)
    if (tokenVersion !== undefined && tokenVersion > 0) {
      const [userRows]: any = await pool.query(
        `SELECT token_version, active FROM userlogin WHERE id = ? LIMIT 1`,
        [cleanUserId]
      )

      if (Array.isArray(userRows) && userRows.length > 0) {
        const dbUser = userRows[0]
        const dbTokenVersion = Number(dbUser.token_version || 1)

        if (tokenVersion < dbTokenVersion) {
          return {
            valid: false,
            reason: 'PASSWORD_CHANGED',
          }
        }
      }
    }

    // 2. Check user_sessions record for this exact sid (if not legacy)
    if (sid && !sid.startsWith('legacy_')) {
      const [sessionRows]: any = await pool.query(
        `SELECT is_active, revoked_reason FROM user_sessions WHERE sid = ? LIMIT 1`,
        [sid]
      )

      if (Array.isArray(sessionRows) && sessionRows.length > 0) {
        const s = sessionRows[0]
        if (s.is_active === 0 || s.is_active === false) {
          return {
            valid: false,
            reason: s.revoked_reason || 'SESSION_REVOKED',
          }
        }

        // Update heartbeat timestamp
        await pool.query(`UPDATE user_sessions SET last_heartbeat = NOW() WHERE sid = ?`, [sid])
      }
    }

    return { valid: true }
  } catch (error) {
    console.error('[user-devices] Session validation DB check error:', error)
    return { valid: true }
  }
}

/**
 * Automatically ensures device & session registration for an active session (e.g. on SSE connect / heartbeat)
 */
export async function autoEnsureActiveSessionAndDevice(
  sid: string,
  rawUserId: string,
  deviceId?: string,
  meta?: {
    deviceName?: string
    platform?: string
    browser?: string
    ipAddress?: string
    role?: string
  }
): Promise<void> {
  try {
    const cleanUserId = await resolveCanonicalUserId(rawUserId)
    const effectiveDeviceId = deviceId || `dev_${cleanUserId}_primary`

    await registerOrValidateDevice(cleanUserId, effectiveDeviceId, meta || {})

    const pool = await getPool()
    const [sessRows]: any = await pool.query(
      `SELECT is_active FROM user_sessions WHERE sid = ? LIMIT 1`,
      [sid]
    )

    if (!Array.isArray(sessRows) || sessRows.length === 0) {
      await pool.query(
        `INSERT INTO user_sessions (sid, user_id, device_id, device_name, platform, ip_address, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1, last_heartbeat = NOW()`,
        [
          sid,
          cleanUserId,
          effectiveDeviceId,
          meta?.deviceName || 'Web Browser',
          meta?.platform || 'Web',
          meta?.ipAddress || null,
        ]
      )
    } else {
      await pool.query(`UPDATE user_sessions SET last_heartbeat = NOW() WHERE sid = ?`, [sid])
    }
  } catch (err) {
    console.warn('[user-devices] autoEnsureActiveSessionAndDevice notice:', err)
  }
}

/**
 * Gets all active sessions for a user (for Super Admin dashboard).
 */
export async function getUserSessions(rawUserId: string): Promise<UserSessionRecord[]> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)

  const [rows]: any = await pool.query(
    `SELECT * FROM user_sessions WHERE (user_id = ? OR user_id = ?) AND is_active = 1 ORDER BY last_heartbeat DESC LIMIT 20`,
    [cleanUserId, String(rawUserId).trim()]
  )

  if (!Array.isArray(rows)) return []

  return rows.map((s) => ({
    sid: s.sid,
    userId: s.user_id,
    deviceId: s.device_id,
    deviceName: s.device_name,
    platform: s.platform,
    ipAddress: s.ip_address,
    isActive: Boolean(s.is_active),
    revokedReason: s.revoked_reason,
    createdAt: s.created_at,
    lastHeartbeat: s.last_heartbeat,
  }))
}

/**
 * Revokes a single session by sid.
 */
export async function revokeSessionBySid(sid: string, reason = 'REMOTE_LOGOUT'): Promise<boolean> {
  const pool = await getPool()

  const [rows]: any = await pool.query(`SELECT user_id, device_id FROM user_sessions WHERE sid = ? LIMIT 1`, [sid])
  if (Array.isArray(rows) && rows.length > 0) {
    const s = rows[0]
    await pool.query(
      `UPDATE user_sessions SET is_active = 0, revoked_reason = ? WHERE sid = ?`,
      [reason, sid]
    )

    broadcastSessionEvent(s.user_id, {
      type: 'REMOTE_LOGOUT',
      sid,
      deviceId: s.device_id,
      message: 'Your session has been logged out remotely by the administrator.',
    })
    return true
  }

  return false
}

/**
 * Revokes all sessions for a specific user (e.g. on Super Admin force logout or password reset).
 */
export async function revokeAllSessionsForUser(rawUserId: string, reason = 'FORCE_LOGOUT_ALL'): Promise<void> {
  const pool = await getPool()
  const cleanUserId = await resolveCanonicalUserId(rawUserId)

  await pool.query(
    `UPDATE user_sessions SET is_active = 0, revoked_reason = ? WHERE (user_id = ? OR user_id = ?) AND is_active = 1`,
    [reason, cleanUserId, String(rawUserId).trim()]
  )

  broadcastSessionEvent(cleanUserId, {
    type: reason === 'PASSWORD_CHANGED' ? 'PASSWORD_CHANGED' : 'REMOTE_LOGOUT',
    message:
      reason === 'PASSWORD_CHANGED'
        ? 'Your account password has been updated by the system administrator. For security reasons, your active session has been ended. Please log in using your new credentials.'
        : 'All active sessions for your account have been terminated by the administrator.',
  })
  if (rawUserId !== cleanUserId) {
    broadcastSessionEvent(String(rawUserId).trim(), {
      type: reason === 'PASSWORD_CHANGED' ? 'PASSWORD_CHANGED' : 'REMOTE_LOGOUT',
      message:
        reason === 'PASSWORD_CHANGED'
          ? 'Your account password has been updated by the system administrator. For security reasons, your active session has been ended. Please log in using your new credentials.'
          : 'All active sessions for your account have been terminated by the administrator.',
    })
  }
}

/**
 * Resets a user's password in userlogin, increments token_version, and revokes all sessions.
 */
export async function adminResetUserPassword(
  rawUserId: string,
  newPasswordPlain: string
): Promise<{ success: boolean; message?: string }> {
  const pool = await getPool()
  const clean = String(rawUserId).trim()

  // 1. Verify user exists
  const [rows]: any = await pool.query(
    `SELECT id, email_id, token_version FROM userlogin WHERE id = ? OR unique_key = ? OR user_id = ? OR email_id = ? LIMIT 1`,
    [clean, clean, clean, clean]
  )

  if (!Array.isArray(rows) || rows.length === 0) {
    return { success: false, message: 'User not found in system' }
  }

  const userRecord = rows[0]
  const targetId = userRecord.id
  const targetEmail = userRecord.email_id
  const nextTokenVersion = Number(userRecord.token_version || 1) + 1

  // 2. Update password and token_version
  await pool.query(
    `UPDATE userlogin 
     SET password = ?, token_version = ?, updated_at = NOW() 
     WHERE id = ?`,
    [newPasswordPlain.trim(), nextTokenVersion, targetId]
  )

  // 3. Invalidate all active sessions for both targetId and targetEmail
  await revokeAllSessionsForUser(String(targetId), 'PASSWORD_CHANGED')
  if (targetEmail && targetEmail !== String(targetId)) {
    await revokeAllSessionsForUser(String(targetEmail), 'PASSWORD_CHANGED')
  }

  return { success: true, message: 'Password updated successfully and all active sessions invalidated.' }
}
