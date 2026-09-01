type LoginLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

type Bucket = {
  attempts: number
  resetAt: number
  blockedUntil: number
}

const WINDOW_MS = 15 * 60 * 1000
const IP_LIMIT = 30
const ACCOUNT_LIMIT = 8
const BASE_BLOCK_MS = 5 * 60 * 1000
const MAX_BLOCK_MS = 60 * 60 * 1000

declare global {
  var _crmLoginLimitBuckets: Map<string, Bucket> | undefined
}

function buckets(): Map<string, Bucket> {
  if (!global._crmLoginLimitBuckets) {
    global._crmLoginLimitBuckets = new Map()
  }
  return global._crmLoginLimitBuckets
}

function normalizeAccount(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function retryAfterSeconds(blockedUntil: number, now: number): number {
  return Math.max(1, Math.ceil((blockedUntil - now) / 1000))
}

function checkBucket(key: string, limit: number, now: number): LoginLimitResult {
  const store = buckets()
  const existing = store.get(key)

  if (existing && existing.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(existing.blockedUntil, now) }
  }

  const bucket =
    !existing || existing.resetAt <= now
      ? { attempts: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 }
      : existing

  bucket.attempts += 1

  if (bucket.attempts > limit) {
    const overage = bucket.attempts - limit
    const blockMs = Math.min(MAX_BLOCK_MS, BASE_BLOCK_MS * Math.max(1, overage))
    bucket.blockedUntil = now + blockMs
    store.set(key, bucket)
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(bucket.blockedUntil, now) }
  }

  store.set(key, bucket)
  return { allowed: true }
}

export function checkLoginRateLimit(sourceIp: string, account: unknown): LoginLimitResult {
  const now = Date.now()
  const ipResult = checkBucket(`ip:${sourceIp || 'unknown'}`, IP_LIMIT, now)
  if (!ipResult.allowed) return ipResult

  const normalizedAccount = normalizeAccount(account)
  if (!normalizedAccount) return { allowed: true }

  return checkBucket(`account:${normalizedAccount}`, ACCOUNT_LIMIT, now)
}

export function clearLoginRateLimit(account: unknown): void {
  const normalizedAccount = normalizeAccount(account)
  if (!normalizedAccount) return
  buckets().delete(`account:${normalizedAccount}`)
}

export type { LoginLimitResult }
