import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'
import { fetchLeadJourney, fetchBulkLeadJourneys, fetchLeadsByDateRange, fetchTodayLeadJourneys } from '@/lib/lead-journey'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const q = searchParams.get('q')?.trim() || ''
    const ids = searchParams.get('ids')?.split(',').map(s => s.trim()).filter(Boolean) || []
    const preset = (searchParams.get('preset') || searchParams.get('datePreset') || '') as any
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(200, Math.max(10, parseInt(searchParams.get('limit') || '50', 10) || 50))

    const pool = await getPool()

    if (ids.length > 0) {
      const results = await fetchBulkLeadJourneys(pool, ids)
      return NextResponse.json({ success: true, results, count: results.length })
    }

    if (q) {
      const results = await fetchLeadJourney(pool, q)
      return NextResponse.json({ 
        success: true, 
        results, 
        count: results.length, 
        totalCount: results.length,
        page: 1,
        limit: results.length || 50,
        totalPages: 1,
        query: q 
      })
    }

    // Date range filter query (Today / Yesterday / Last 7 Days / This Month / Last Month / Custom)
    const dateData = await fetchLeadsByDateRange(pool, {
      preset: preset || 'today',
      startDate,
      endDate,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      results: dateData.results,
      count: dateData.results.length,
      totalCount: dateData.totalCount,
      page: dateData.page,
      limit: dateData.limit,
      totalPages: dateData.totalPages,
      datePreset: preset || 'today',
      startDate,
      endDate,
      isToday: !preset || preset === 'today',
    })
  } catch (err: any) {
    console.error('[lead-journey] error:', err)
    const detail = process.env.NODE_ENV !== 'production' ? (err?.sqlMessage || err?.message) : undefined
    return NextResponse.json({ success: false, error: 'Server error', detail }, { status: 500 })
  }
}
