import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasAdminRole, hasPermission } from '@/lib/authz'
import { loadMorningDialerCounts } from '@/lib/morning-dialer-counts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  if (!hasAdminRole(user, 'trimmed-lower') && !hasPermission(user, 'leads.view') && !hasPermission(user, 'leads.assign')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403, headers })
  }
  return NextResponse.json(await loadMorningDialerCounts(), { headers })
}
