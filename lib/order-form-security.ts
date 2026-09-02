import { createHash, randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'
import { getRequestSourceIp, recordSecurityEvent } from '@/lib/security-audit'
import { orderFormActionRateLimit, type OrderFormAction } from '@/lib/order-form-policy'

type AuditOutcome = 'success' | 'failure' | 'denied'

let schemaPromise: Promise<void> | null = null

async function ensureSecuritySchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const pool = await getPool()
      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_form_rate_limits (
          rate_key VARCHAR(64) PRIMARY KEY,
          window_started_at DATETIME(3) NOT NULL,
          request_count INT NOT NULL DEFAULT 0,
          expires_at DATETIME(3) NOT NULL,
          INDEX idx_order_form_rate_expiry (expires_at)
        ) ENGINE=InnoDB
      `)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS order_form_audit_log (
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
        ) ENGINE=InnoDB
      `)
    })().catch((error) => {
      schemaPromise = null
      throw error
    })
  }
  await schemaPromise
}

function safeString(value: unknown, max = 190): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function getOrderFormActor(user: unknown): string {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return 'unknown'
  const record = user as Record<string, unknown>
  return safeString(record.email || record.user_email || record.id || record.name) || 'unknown'
}

function getRole(user: unknown): string {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return ''
  return safeString((user as Record<string, unknown>).role, 80)
}

export function getVerifiedOrderFormUser(req: NextRequest): unknown | null {
  return getSessionUser(req)
}

export function isSameOriginOrderFormRequest(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host === req.nextUrl.host
  } catch {
    return false
  }
}

export function orderFormCorrelationId(req: NextRequest): string {
  return safeString(req.headers.get('x-request-id'), 80) || randomUUID()
}

export async function consumeOrderFormRateLimit(
  req: NextRequest,
  user: unknown,
  action: OrderFormAction
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await ensureSecuritySchema()
  const windowSeconds = 60
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000
  const actor = getOrderFormActor(user)
  const sourceIp = getRequestSourceIp(req)
  const rawKey = `${actor}|${sourceIp}|${action}|${windowStart}`
  const rateKey = createHash('sha256').update(rawKey).digest('hex')
  const windowDate = new Date(windowStart)
  const expiryDate = new Date(windowStart + windowSeconds * 2 * 1000)
  const pool = await getPool()

  await pool.query(
    `INSERT INTO order_form_rate_limits (rate_key, window_started_at, request_count, expires_at)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
    [rateKey, windowDate, expiryDate]
  )
  const [rows] = await pool.query(
    'SELECT request_count FROM order_form_rate_limits WHERE rate_key = ? LIMIT 1',
    [rateKey]
  )
  const count = Number(Array.isArray(rows) ? (rows as Array<{ request_count?: number }>)[0]?.request_count : 0)
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000))

  // Low-cost opportunistic cleanup; correctness does not depend on it.
  if (Math.random() < 0.01) {
    void pool.query('DELETE FROM order_form_rate_limits WHERE expires_at < NOW(3)').catch(() => undefined)
  }

  return { allowed: count <= orderFormActionRateLimit(action), retryAfterSeconds }
}

export async function auditOrderFormAction(input: {
  req: NextRequest
  user: unknown
  action: OrderFormAction
  outcome: AuditOutcome
  correlationId: string
  targetId?: unknown
  durationMs?: number
  errorCode?: string
}): Promise<void> {
  const actor = getOrderFormActor(input.user)
  const sourceIp = getRequestSourceIp(input.req)
  const targetId = safeString(input.targetId)
  const role = getRole(input.user)
  const eventId = randomUUID()

  recordSecurityEvent({
    action: `order_form.${input.action}`,
    outcome: input.outcome,
    actor,
    target: targetId || null,
    sourceIp,
    correlationId: input.correlationId,
    context: {
      role: role || 'unknown',
      durationMs: Math.max(0, Math.round(input.durationMs || 0)),
      errorCode: safeString(input.errorCode, 80) || null,
    },
  })

  try {
    await ensureSecuritySchema()
    const pool = await getPool()
    await pool.query(
      `INSERT INTO order_form_audit_log
       (event_id, actor, role_name, action_name, outcome, source_ip, correlation_id, target_id, duration_ms, error_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        actor,
        role || 'unknown',
        input.action,
        input.outcome,
        sourceIp,
        input.correlationId,
        targetId || null,
        Math.max(0, Math.round(input.durationMs || 0)),
        safeString(input.errorCode, 80) || null,
      ]
    )
  } catch {
    // Structured runtime/security logs still retain the event if DB audit storage is unavailable.
    console.warn(`[order-form-audit] durable audit insert failed event=${eventId}`)
  }
}
