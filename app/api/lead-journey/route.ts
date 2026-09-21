import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'
import { getSessionUser } from '@/lib/authz'
import { fetchLeadJourney, fetchBulkLeadJourneys } from '@/lib/lead-journey'

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

    const pool = await getPool()

    if (ids.length > 0) {
      const results = await fetchBulkLeadJourneys(pool, ids)
      return NextResponse.json({ success: true, results, count: results.length })
    }

    if (!q) {
      return NextResponse.json({ success: false, error: 'Query parameter q or ids is required' }, { status: 400 })
    }

    const results = await fetchLeadJourney(pool, q)
    return NextResponse.json({ success: true, results, count: results.length, query: q })
  } catch (err: any) {
    console.error('[lead-journey] error:', err)
    // The cause stays in the server log; outside production it is also returned so a failing search is diagnosable.
    const detail = process.env.NODE_ENV !== 'production' ? (err?.sqlMessage || err?.message) : undefined
    return NextResponse.json({ success: false, error: 'Server error', detail }, { status: 500 })
  }
}
