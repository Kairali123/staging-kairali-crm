import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasPermission } from '@/lib/authz'
import { getCallsReport } from '@/lib/calls-report-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// A cold start has to wait for the upstream Apps Script (30-45 s).
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const user = getSessionUser(request)
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(user, 'calls_report.view')) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  try {
    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1'
    const result = await getCallsReport({ forceRefresh })
    return NextResponse.json(
      {
        success: true,
        data: result.report,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        stale: result.stale,
        refreshing: result.refreshing,
        warning: result.warning,
      },
      { headers: { 'Cache-Control': forceRefresh ? 'no-store' : 'private, max-age=30, stale-while-revalidate=300' } }
    )
  } catch (err) {
    console.error('[calls-report] error:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Calls data is unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
