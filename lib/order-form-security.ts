import { createHash, randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'
import { getRequestSourceIp, recordSecurityEvent } from '@/lib/security-audit'
import { orderFormActionRateLimit, type OrderFormAction } from '@/lib/order-form-policy'

type AuditOutcome = 'success' | 'failure' | 'denied'

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

  const insertSql = `INSERT INTO order_form_rate_limits (rate_key, window_started_at, request_count, expires_at)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE request_count = request_count + 1`

  // Pure DML on hot request path; fail-closed without any runtime DDL fallback.
  await pool.query(insertSql, [rateKey, windowDate, expiryDate])

  const [rows] = await pool.query(
    'SELECT request_count FROM order_form_rate_limits WHERE rate_key = ? LIMIT 1',
    [rateKey]
  )
  const count = Number(Array.isArray(rows) ? (rows as Array<{ request_count?: number }>)[0]?.request_count : 0)
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000))

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

  const auditSql = `INSERT INTO order_form_audit_log
       (event_id, actor, role_name, action_name, outcome, source_ip, correlation_id, target_id, duration_ms, error_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const auditParams = [
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

  try {
    const pool = await getPool()
    // Pure DML; fail-closed without any runtime DDL fallback.
    await pool.query(auditSql, auditParams)
  } catch {
    // Structured runtime/security logs still retain the event if DB audit storage is unavailable.
    console.warn(`[order-form-audit] durable audit insert failed event=${eventId}`)
  }
}
