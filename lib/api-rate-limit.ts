import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getRequestSourceIp } from '@/lib/security-audit'

type LimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

type Bucket = {
  count: number
  resetAt: number
}

declare global {
  // Development/staging fallback. Production should replace this with shared
  // storage so limits are enforced across all app instances.
  var _crmApiRateLimitBuckets: Map<string, Bucket> | undefined
}

function buckets(): Map<string, Bucket> {
  if (!global._crmApiRateLimitBuckets) {
    global._crmApiRateLimitBuckets = new Map()
  }
  return global._crmApiRateLimitBuckets
}

function cleanKey(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9@._:-]/g, '_').slice(0, 160)
    : 'unknown'
}

export async function checkApiRateLimit(
  req: NextRequest,
  scope: string,
  actor: unknown,
  limit: number,
  windowMs: number,
): Promise<LimitResult> {
  const sourceIp = getRequestSourceIp(req)

  const now = Date.now()
  const key = `${cleanKey(scope)}:${cleanKey(actor)}:${cleanKey(sourceIp)}`
  const store = buckets()
  const current = store.get(key)
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current

  bucket.count += 1
  store.set(key, bucket)

  if (bucket.count <= limit) return { allowed: true }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': String(retryAfterSeconds),
      },
    },
  )
}
