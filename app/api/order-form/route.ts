import { NextRequest, NextResponse } from 'next/server'
import {
  auditOrderFormAction,
  consumeOrderFormRateLimit,
  getVerifiedOrderFormUser,
  isSameOriginOrderFormRequest,
  orderFormCorrelationId,
} from '@/lib/order-form-security'
import {
  authorizeOrderFormAction,
  readOrderFormAction,
  type OrderFormAction,
} from '@/lib/order-form-policy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_REQUEST_BYTES = 10_000_000
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
}

type ApiError = { code: string; message: string }

function json(body: Record<string, unknown>, status: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...extraHeaders },
  })
}

function error(status: number, code: string, message: string, correlationId?: string) {
  return json({ ok: false, error: { code, message }, correlationId }, status)
}

function targetId(body: Record<string, unknown>): string {
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : null
  return String(body.submissionId || body.orderId || payload?.submissionId || payload?.orderId || '').slice(0, 190)
}

function publicUpstreamError(action: OrderFormAction, upstream: unknown): ApiError {
  const generic = { code: 'ORDER_SERVICE_ERROR', message: 'Order service could not complete the request.' }
  if (!upstream || typeof upstream !== 'object') return generic
  const envelope = upstream as { error?: { code?: unknown; message?: unknown } }
  const code = typeof envelope.error?.code === 'string' ? envelope.error.code.slice(0, 80) : ''
  const message = typeof envelope.error?.message === 'string' ? envelope.error.message.slice(0, 240) : ''
  const safeValidationCodes = new Set([
    'BAD_REQUEST', 'MISSING_ID', 'NOT_FOUND', 'NOT_READY', 'BUSY', 'COMMIT_FAILED', 'UNKNOWN_ACTION',
  ])
  if (safeValidationCodes.has(code) && message) return { code, message }
  if (action === 'status' && code === 'NOT_FOUND') return { code, message: 'Submission not found.' }
  return generic
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const correlationId = orderFormCorrelationId(req)
  const user = getVerifiedOrderFormUser(req)
  let action: OrderFormAction | null = null
  let body: Record<string, unknown> = {}

  if (!user) return error(401, 'UNAUTHORIZED', 'Please sign in to use the order form.', correlationId)

  if (!isSameOriginOrderFormRequest(req) || req.headers.get('x-kappl-client') !== 'primary-order-form') {
    return error(403, 'FORBIDDEN_ORIGIN', 'Request origin is not allowed.', correlationId)
  }

  const contentLength = Number(req.headers.get('content-length') || 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return error(413, 'PAYLOAD_TOO_LARGE', 'Attachment is too large.', correlationId)
  }

  try {
    const text = await req.text()
    if (text.length > MAX_REQUEST_BYTES) return error(413, 'PAYLOAD_TOO_LARGE', 'Attachment is too large.', correlationId)
    body = JSON.parse(text || '{}') as Record<string, unknown>
  } catch {
    return error(400, 'INVALID_JSON', 'Invalid JSON request.', correlationId)
  }

  action = readOrderFormAction(body.action)
  if (!action) return error(400, 'INVALID_ACTION', 'Unsupported order action.', correlationId)

  if (!authorizeOrderFormAction(user, action)) {
    await auditOrderFormAction({ req, user, action, outcome: 'denied', correlationId, targetId: targetId(body), errorCode: 'FORBIDDEN' })
    return error(403, 'FORBIDDEN', 'You do not have permission for this order action.', correlationId)
  }

  try {
    const rate = await consumeOrderFormRateLimit(req, user, action)
    if (!rate.allowed) {
      await auditOrderFormAction({ req, user, action, outcome: 'denied', correlationId, targetId: targetId(body), errorCode: 'RATE_LIMITED' })
      return error(429, 'RATE_LIMITED', 'Too many requests. Please wait and try again.', correlationId)
    }
  } catch {
    await auditOrderFormAction({ req, user, action, outcome: 'failure', correlationId, targetId: targetId(body), errorCode: 'SECURITY_SERVICE_UNAVAILABLE' })
    return error(503, 'SECURITY_SERVICE_UNAVAILABLE', 'Order security service is temporarily unavailable.', correlationId)
  }

  const upstreamUrl = process.env.ORDER_FORM_APPS_SCRIPT_URL?.trim()
  const serverSecret = process.env.ORDER_FORM_APPS_SCRIPT_SECRET?.trim()
  if (!upstreamUrl || !serverSecret) {
    await auditOrderFormAction({ req, user, action, outcome: 'failure', correlationId, targetId: targetId(body), errorCode: 'NOT_CONFIGURED' })
    return error(503, 'NOT_CONFIGURED', 'Order service is not configured.', correlationId)
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, _serverSecret: serverSecret }),
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(28_000),
    })
    const upstreamText = await upstreamResponse.text()
    let upstream: Record<string, unknown>
    try {
      upstream = JSON.parse(upstreamText) as Record<string, unknown>
    } catch {
      throw new Error('INVALID_UPSTREAM')
    }

    if (!upstreamResponse.ok || upstream.ok !== true) {
      const safe = publicUpstreamError(action, upstream)
      await auditOrderFormAction({ req, user, action, outcome: 'failure', correlationId, targetId: targetId(body), durationMs: Date.now() - startedAt, errorCode: safe.code })
      return error(upstreamResponse.ok ? 422 : 502, safe.code, safe.message, correlationId)
    }

    await auditOrderFormAction({ req, user, action, outcome: 'success', correlationId, targetId: targetId(body), durationMs: Date.now() - startedAt })
    return json({ ...upstream, correlationId }, 200)
  } catch (caught) {
    const timedOut = caught instanceof Error && (caught.name === 'TimeoutError' || caught.name === 'AbortError')
    const code = timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR'
    await auditOrderFormAction({ req, user, action, outcome: 'failure', correlationId, targetId: targetId(body), durationMs: Date.now() - startedAt, errorCode: code })
    return error(
      timedOut ? 504 : 502,
      code,
      timedOut
        ? 'Order service timed out. Retry with the same submission ID.'
        : 'Order service could not be reached.',
      correlationId
    )
  }
}

export function GET() {
  return error(405, 'METHOD_NOT_ALLOWED', 'POST required.')
}
