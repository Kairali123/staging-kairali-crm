import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'

type AuditOutcome = 'success' | 'failure' | 'denied'

type AuditEvent = {
  action: string
  outcome: AuditOutcome
  actor?: string | null
  target?: string | null
  sourceIp?: string | null
  correlationId?: string
  context?: Record<string, string | number | boolean | null>
}

type SerializedAuditEvent = {
  eventId: string
  timestamp: string
  action: string
  outcome: AuditOutcome
  actor: string | null
  target: string | null
  sourceIp: string | null
  correlationId: string
  context: Record<string, string | number | boolean | null>
}

const AUDIT_CSV_HEADER = [
  'eventId',
  'timestamp',
  'action',
  'outcome',
  'actor',
  'target',
  'sourceIp',
  'correlationId',
  'context',
].join(',')

function safeText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function excelSafeCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value)
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${formulaSafe.replace(/"/g, '""')}"`
}

function toAuditCsvLine(payload: SerializedAuditEvent): string {
  return [
    payload.eventId,
    payload.timestamp,
    payload.action,
    payload.outcome,
    payload.actor,
    payload.target,
    payload.sourceIp,
    payload.correlationId,
    JSON.stringify(payload.context),
  ].map(excelSafeCell).join(',')
}

export function getRequestSourceIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]
  return (
    safeText(forwardedFor) ||
    safeText(req.headers.get('x-real-ip')) ||
    'unknown'
  )
}

async function forwardSecurityEvent(payload: SerializedAuditEvent): Promise<void> {
  const webhookUrl = process.env.CRM_SECURITY_AUDIT_WEBHOOK_URL?.trim()
  if (!webhookUrl) return

  const token = process.env.CRM_SECURITY_AUDIT_WEBHOOK_TOKEN?.trim()
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    // Audit forwarding must never break authentication or authorization flows.
    console.warn('[security-audit] webhook forwarding failed')
  }
}

async function appendSecurityEventToExcelCsv(payload: SerializedAuditEvent): Promise<void> {
  if (typeof (globalThis as any).EdgeRuntime === 'string') return

  try {
    const [{ appendFile, mkdir, stat }, path] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ])
    const configuredPath = process.env.CRM_SECURITY_AUDIT_EXCEL_CSV_PATH?.trim()
    const targetPath = configuredPath || path.join(process.cwd(), 'data', 'security-audit-events.csv')
    const targetDir = path.dirname(targetPath)
    await mkdir(targetDir, { recursive: true })

    let needsHeader = false
    try {
      const existing = await stat(targetPath)
      needsHeader = existing.size === 0
    } catch {
      needsHeader = true
    }

    const prefix = needsHeader ? `${AUDIT_CSV_HEADER}\n` : ''
    await appendFile(targetPath, `${prefix}${toAuditCsvLine(payload)}\n`, 'utf8')
  } catch {
    // Local/hosted filesystems may be read-only or ephemeral. Audit file writes
    // are best-effort and must not break auth, logout, or authorization flows.
    console.warn('[security-audit] Excel-compatible CSV append failed')
  }
}

export function recordSecurityEvent(event: AuditEvent): void {
  const payload: SerializedAuditEvent = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    action: event.action,
    outcome: event.outcome,
    actor: safeText(event.actor),
    target: safeText(event.target),
    sourceIp: safeText(event.sourceIp),
    correlationId: safeText(event.correlationId) || randomUUID(),
    context: event.context || {},
  }

  // Safe structured application event. This is intentionally free of passwords,
  // tokens, cookies, transcript/file contents, and raw request bodies.
  console.info(`[security-audit] ${JSON.stringify(payload)}`)
  void appendSecurityEventToExcelCsv(payload)
  void forwardSecurityEvent(payload)
}
