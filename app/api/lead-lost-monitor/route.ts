import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasPermission } from '@/lib/authz'
import { getPool } from '@/lib/db'
import {
  leadLostParams,
  LEAD_LOST_DETAIL_QUERY,
  LEAD_LOST_AGGREGATE_QUERY,
  LEAD_LOST_DIAGNOSTICS_QUERY,
} from '@/lib/lead-lost-monitor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

function safeDate(val: unknown): string {
  if (!val) return ''
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return ''
      const p = (n: number) => String(n).padStart(2, '0')
      return `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())}T${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`
    }
    const str = String(val).trim()
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
    return str
  } catch { return '' }
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const user = getSessionUser(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to view this dashboard.' },
      { status: 401, headers: HEADERS }
    )
  }
  const role = String(user?.role || '').trim().toLowerCase()
  const isSuperAdmin =
    role === 'super_admin' ||
    role === 'super admin' ||
    (user?.permissions as string[] | undefined)?.includes('all')
  if (!isSuperAdmin && !hasPermission(user, 'leadguard_lead_lost_monitor.view') && !hasPermission(user, 'voicecall_kserve_lead_lost.view')) {
    return NextResponse.json(
      { error: 'Access denied. Permission required.' },
      { status: 403, headers: HEADERS }
    )
  }

  // ── Parse & validate params ───────────────────────────────────────────────
  const p = req.nextUrl.searchParams
  const fromRaw = p.get('from') || ''
  const toRaw = p.get('to') || ''
  const companyRaw = p.get('company') || 'ALL'
  const lostDaysRaw = Number(p.get('lost_days') || '5')

  let params: ReturnType<typeof leadLostParams>
  try {
    params = leadLostParams(fromRaw, toRaw, companyRaw, lostDaysRaw)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid parameters'
    return NextResponse.json(
      { error: msg + '. Select valid dates (up to 93 days) and company filter.' },
      { status: 400, headers: HEADERS }
    )
  }

  // Params layout: [from, toExclusive, company, company, lostDays]
  const [from, toEx, co1, co2, lostDays] = params

  // ── Database ──────────────────────────────────────────────────────────────
  let connection
  try {
    connection = await (await getPool()).getConnection()
    await connection.query("SET SESSION time_zone = '+05:30'")
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION READ ONLY')

    // 1. Fetch kserve settings for lostDays default
    let effectiveLostDays = lostDays
    try {
      const [settingRows]: any[] = await connection.query(
        'SELECT lost_days FROM kserve_settings WHERE id = 1'
      )
      if (settingRows?.[0]?.lost_days) {
        // prefer URL param if explicitly set, otherwise use DB setting
        effectiveLostDays = lostDaysRaw ? lostDays : Number(settingRows[0].lost_days)
      }
    } catch { /* kserve_settings table may not exist — use param default */ }

    // Rebuild params with effective lostDays
    const finalParams = [from, toEx, co1, co2, effectiveLostDays]
    const aggParams  = [effectiveLostDays, from, toEx, co1, co2]
    const diagParams = [effectiveLostDays, from, toEx, co1, co2]

    // 2. Lost leads detail
    const [detailRows]: any[] = await connection.query(
      { sql: LEAD_LOST_DETAIL_QUERY, timeout: 25_000 },
      finalParams
    )

    // 3. Aggregate summary (by company + source)
    const [aggregateRows]: any[] = await connection.query(
      { sql: LEAD_LOST_AGGREGATE_QUERY, timeout: 25_000 },
      aggParams
    )

    // 4. Diagnostics
    const [diagRows]: any[] = await connection.query(
      { sql: LEAD_LOST_DIAGNOSTICS_QUERY, timeout: 25_000 },
      diagParams
    )
    const diagnostics = (diagRows as Record<string, unknown>[])[0] ?? {}

    await connection.rollback()

    return NextResponse.json(
      {
        lostDays: effectiveLostDays,
        filters: { from: fromRaw, to: toRaw, company: companyRaw },
        data: (detailRows as any[]).map((r: any) => ({
          id: String(r.id ?? ''),
          name_of_client: String(r.name_of_client ?? ''),
          mobile: String(r.mobile ?? ''),
          email_id: String(r.email_id ?? ''),
          subjects: String(r.subjects ?? ''),
          company: String(r.company ?? ''),
          data_source: String(r.data_source ?? ''),
          campaign_name: String(r.campaign_name ?? ''),
          sent_date: safeDate(r.sent_date),
          days_pending: Number(r.days_pending) || 0,
        })),
        aggregate: (aggregateRows as any[]).map((r: any) => ({
          company: String(r.company ?? ''),
          data_source: String(r.data_source ?? ''),
          total_sent: Number(r.total_sent) || 0,
          total_received: Number(r.total_received) || 0,
          total_lost: Number(r.total_lost) || 0,
          loss_rate: Number(r.total_sent) > 0
            ? Math.round((Number(r.total_lost) / Number(r.total_sent)) * 100)
            : 0,
        })),
        diagnostics: {
          total_sent: Number(diagnostics.total_sent) || 0,
          total_received: Number(diagnostics.total_received) || 0,
          total_lost: Number(diagnostics.total_lost) || 0,
          first_sent: diagnostics.first_sent ? safeDate(diagnostics.first_sent) : null,
          last_sent: diagnostics.last_sent ? safeDate(diagnostics.last_sent) : null,
        },
        generatedAt: new Date().toISOString(),
        provenance: {
          database: 'spalabsdomain_Kairali_CRM_Db',
          tables: ['ai_voice_leads_sent', 'ai_voice_leads_received', 'kserve_settings'],
          dateBasis: 'Lead sent date (IST)',
          definition: `Lost = sent but not received, ${effectiveLostDays}+ days old`,
        },
      },
      { headers: HEADERS }
    )
  } catch (err) {
    if (connection) { try { await connection.rollback() } catch {} }
    console.error('[lead-lost-monitor] DB error:', err)
    return NextResponse.json(
      { error: 'Lead lost monitor is temporarily unavailable. Please retry.' },
      { status: 503, headers: HEADERS }
    )
  } finally {
    connection?.release()
  }
}
