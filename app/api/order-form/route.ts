import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
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

function resolveAppsScriptConfig(): { url: string; secret: string } | null {
  const rawUrl = process.env.ORDER_FORM_APPS_SCRIPT_URL?.trim()
  const secret = process.env.ORDER_FORM_APPS_SCRIPT_SECRET?.trim()
  if (!rawUrl || !secret || secret.length < 32) return null

  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com') return null
    return { url: url.toString(), secret }
  } catch {
    return null
  }
}

function getUserDisplayName(user: unknown): string {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return ''
  const record = user as Record<string, unknown>
  return typeof record.name === 'string' ? record.name.trim() : (typeof record.user_name === 'string' ? record.user_name.trim() : '')
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  const correlationId = orderFormCorrelationId(req)
  const user = getVerifiedOrderFormUser(req)
  const sessionUserName = getUserDisplayName(user)
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

  if (action === 'getProducts' || action === 'syncProducts') {
    try {
      const pool = await getPool()
      const [rows] = await pool.query(
        `SELECT id, sku, product, pack, price, inventory, combined, fac_ho, cost_price
         FROM product_inventory
         ORDER BY product ASC`
      )
      const productRows = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
      const products = productRows.map((r) => {
        const sku = String(r.sku || '').trim()
        const id = sku || String(r.id || '')
        const name = String(r.product || '').trim()
        const pack = String(r.pack || '').trim()
        const combined = r.combined
          ? String(r.combined).trim()
          : [name, sku, pack].filter(Boolean).join(' · ')

        return {
          id,
          sku,
          name,
          product: name,
          pack,
          packingSize: pack,
          price: Number(r.price) || 0,
          inventory: Number(r.inventory) || 0,
          combined,
          fac_ho: String(r.fac_ho || '').trim(),
          cost_price: Number(r.cost_price) || 0,
        }
      })

      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'success',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
      })

      return json(
        {
          ok: true,
          data: {
            products,
            syncedAt: new Date().toISOString(),
          },
          correlationId,
        },
        200
      )
    } catch {
      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'failure',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
        errorCode: 'DATABASE_ERROR',
      })
      return error(500, 'DATABASE_ERROR', 'Failed to retrieve products from database.', correlationId)
    }
  }

  if (action === 'getUsers') {
    try {
      const pool = await getPool()
      const [rows] = await pool.query(
        `SELECT DISTINCT all_users
         FROM all_users
         WHERE all_users IS NOT NULL AND TRIM(all_users) != ''
           AND (status_of_left IS NULL OR status_of_left NOT IN ('Left', 'Resigned', 'Terminated'))
           AND (date_of_left IS NULL)
         ORDER BY all_users ASC`
      )
      const userRows = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : []
      let users = userRows
        .map((r) => String(r.all_users || '').trim())
        .filter(Boolean)

      if (users.length === 0) {
        const [fallbackRows] = await pool.query(
          `SELECT DISTINCT all_users
           FROM all_users
           WHERE all_users IS NOT NULL AND TRIM(all_users) != ''
           ORDER BY all_users ASC`
        )
        const fb = Array.isArray(fallbackRows) ? (fallbackRows as Record<string, unknown>[]) : []
        users = fb.map((r) => String(r.all_users || '').trim()).filter(Boolean)
      }

      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'success',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
      })

      return json(
        {
          ok: true,
          data: {
            users,
          },
          correlationId,
        },
        200
      )
    } catch {
      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'failure',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
        errorCode: 'DATABASE_ERROR',
      })
      return error(500, 'DATABASE_ERROR', 'Failed to retrieve users from database.', correlationId)
    }
  }

  if (action === 'findBuyer') {
    try {
      const payloadObj = body.payload && typeof body.payload === 'object' ? (body.payload as Record<string, unknown>) : null
      const rawMobile = String(body.mobile || payloadObj?.mobile || '').trim()
      const rawEmail = String(body.email || payloadObj?.email || '').trim().toLowerCase()
      const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10)

      if (!cleanMobile && !rawEmail) {
        return json({ ok: true, data: { found: false, buyer: null }, correlationId }, 200)
      }

      const pool = await getPool()
      let rows: unknown[] = []

      if (cleanMobile && rawEmail) {
        const [mRows] = await pool.query(
          `SELECT id, buyer_id, order_id, name_of_client, mobile, email, 
                  client_category, client_category_updated, billing_address, 
                  shipping_address, others
           FROM master_conversion_sheet_kappl_ktahv
           WHERE (mobile LIKE ? OR LOWER(TRIM(email)) = ?)
           ORDER BY id DESC
           LIMIT 1`,
          [`%${cleanMobile}%`, rawEmail]
        )
        rows = Array.isArray(mRows) ? mRows : []
      } else if (cleanMobile) {
        const [mRows] = await pool.query(
          `SELECT id, buyer_id, order_id, name_of_client, mobile, email, 
                  client_category, client_category_updated, billing_address, 
                  shipping_address, others
           FROM master_conversion_sheet_kappl_ktahv
           WHERE mobile LIKE ?
           ORDER BY id DESC
           LIMIT 1`,
          [`%${cleanMobile}%`]
        )
        rows = Array.isArray(mRows) ? mRows : []
      } else if (rawEmail) {
        const [mRows] = await pool.query(
          `SELECT id, buyer_id, order_id, name_of_client, mobile, email, 
                  client_category, client_category_updated, billing_address, 
                  shipping_address, others
           FROM master_conversion_sheet_kappl_ktahv
           WHERE LOWER(TRIM(email)) = ?
           ORDER BY id DESC
           LIMIT 1`,
          [rawEmail]
        )
        rows = Array.isArray(mRows) ? mRows : []
      }

      if (rows.length === 0) {
        await auditOrderFormAction({
          req,
          user,
          action,
          outcome: 'success',
          correlationId,
          targetId: targetId(body),
          durationMs: Date.now() - startedAt,
        })
        return json({ ok: true, data: { found: false, buyer: null }, correlationId }, 200)
      }

      const row = rows[0] as Record<string, unknown>
      const name = String(row.name_of_client || '').trim()
      const clientType = String(row.client_category_updated || row.client_category || '').trim()
      const billingAddress = String(row.billing_address || '').trim()
      const shippingAddress = String(row.shipping_address || billingAddress).trim()
      const clientId = String(row.buyer_id || row.order_id || '').trim()
      const mobileFound = String(row.mobile || cleanMobile || rawMobile).trim()
      const emailFound = String(row.email || rawEmail).trim()

      let pinCode = ''
      const tokens = `${billingAddress} ${shippingAddress}`.split(/[\s,\r\n]+/)
      for (const token of tokens) {
        if (/^[1-9][0-9]{5}$/.test(token)) {
          pinCode = token
        }
      }

      let pan = ''
      for (const token of tokens) {
        const upper = token.toUpperCase()
        if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upper)) {
          pan = upper
          break
        }
      }

      const buyer = {
        clientId,
        name,
        mobile: cleanMobile || mobileFound,
        email: emailFound,
        clientType,
        gst: '',
        pan,
        pinCode,
        billingAddress,
        shippingAddress,
      }

      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'success',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
      })

      return json(
        {
          ok: true,
          data: {
            found: true,
            buyer,
          },
          correlationId,
        },
        200
      )
    } catch {
      await auditOrderFormAction({
        req,
        user,
        action,
        outcome: 'failure',
        correlationId,
        targetId: targetId(body),
        durationMs: Date.now() - startedAt,
        errorCode: 'DATABASE_ERROR',
      })
      return error(500, 'DATABASE_ERROR', 'Failed to search buyer in database.', correlationId)
    }
  }

  const appsScript = resolveAppsScriptConfig()
  if (!appsScript) {
    await auditOrderFormAction({ req, user, action, outcome: 'failure', correlationId, targetId: targetId(body), errorCode: 'NOT_CONFIGURED' })
    return error(503, 'NOT_CONFIGURED', 'Order service is not configured.', correlationId)
  }

  // Server-side enforcement: Lock orderPlacedBy to authenticated session user and ensure quantities are integers
  if (action === 'submit' && body.payload && typeof body.payload === 'object') {
    const payload = body.payload as Record<string, unknown>
    if (payload.form && typeof payload.form === 'object') {
      const form = payload.form as Record<string, unknown>
      if (sessionUserName) {
        form.orderPlacedBy = sessionUserName
      }
    }
    if (Array.isArray(payload.products)) {
      payload.products = payload.products.map((p) => {
        if (p && typeof p === 'object') {
          const prod = p as Record<string, unknown>
          const qty = Math.max(1, Math.floor(Number(prod.quantity) || 1))
          return { ...prod, quantity: qty }
        }
        return p
      })
    }
  }

  try {
    const upstreamResponse = await fetch(appsScript.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      body: JSON.stringify({ ...body, _serverSecret: appsScript.secret }),
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
