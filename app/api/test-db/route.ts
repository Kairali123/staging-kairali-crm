// app/api/test-db/route.ts
// ─────────────────────────────────────────────────────────────
// DB CONNECTIVITY DIAGNOSTIC — admin only.
// Middleware proves there is a signed CRM session; this diagnostic still does
// its own admin-role check before it ever opens the pool.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser, hasAdminRole } from '@/lib/authz'

// Diagnostic output is per-session; never let it sit in a shared cache.
const noStoreHeaders = { 'Cache-Control': 'private, no-store' }

export async function GET(req: NextRequest) {
  // Rejects missing, tampered, forged, and expired cookies. `getSessionUser` reads
  // the same `kairali_user` cookie and defers to the same `verifySessionCookieValue`
  // this route called inline before — same inputs, same null cases, same result.
  const user = getSessionUser(req)
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    )
  }

  // `'trimmed-lower'` is this route's own long-standing coercion —
  // `String(user?.role ?? '').trim().toLowerCase()` against `super_admin`/`admin`
  // — reproduced exactly by the shared predicate, not the folding `normalizeRole`.
  // Same accepts, same rejects, one fewer local copy (matrix M9; folding is D1).
  if (!hasAdminRole(user, 'trimmed-lower')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden' },
      { status: 403, headers: noStoreHeaders }
    )
  }

  try {
    const pool = await getPool()
    const [rows] = await pool.query('SELECT 1 as connected')
    return NextResponse.json({ success: true, result: rows }, { headers: noStoreHeaders })
  } catch {
    // Generic on both sides: the driver message can carry host, user, and SQL.
    console.error('[test-db] database check failed')
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
