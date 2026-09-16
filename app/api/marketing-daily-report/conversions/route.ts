import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasPermission } from '@/lib/authz'
import { getPool } from '@/lib/db'
import { reportWindow } from '@/lib/marketing-report-query'
import { normalizeVSrc, normalizeVSrcKey } from '@/lib/lead-source'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }

export interface ConversionRecord {
  id: string | number
  bookingOrderId: string
  clientName: string
  mobile: string
  email: string
  source: string
  rawSource: string
  salesPerson: string
  amount: number
  status: string
  bookingType: string
  dateTime: string
  nbdCrr: string
  company: string
}

function getDemoRecords(date: string, company?: string, source?: string, kind: 'verified' | 'unverified' = 'verified'): ConversionRecord[] {
  const normComp = (company || '').toUpperCase()
  const normSrc = (source || '').trim()
  const isAllSources = !normSrc || normSrc.toLowerCase() === 'company total' || normSrc.toLowerCase() === 'all'

  const verifiedPool: Record<string, ConversionRecord[]> = {
    KTAHV: [
      {
        id: 'demo-ktahv-1',
        bookingOrderId: 'BK-KTAHV-7821',
        clientName: 'Dr. Priya Menon',
        mobile: '+91 98471 23456',
        email: 'priya.menon@example.com',
        source: 'Website',
        rawSource: 'Website',
        salesPerson: 'Sunita Sharma',
        amount: 350000,
        status: 'Confirmed',
        bookingType: 'Panchakarma Retreat (14 Nights)',
        dateTime: `${date} 11:25`,
        nbdCrr: 'NBD',
        company: 'KTAHV',
      },
      {
        id: 'demo-ktahv-2',
        bookingOrderId: 'BK-KTAHV-7822',
        clientName: 'Mr. Arvind Saxena',
        mobile: '+91 98112 34567',
        email: 'arvind.saxena@example.com',
        source: 'Website',
        rawSource: 'Website',
        salesPerson: 'Rajesh Nair',
        amount: 223471,
        status: 'Confirmed',
        bookingType: 'Ayurvedic Rejuvenation (7 Nights)',
        dateTime: `${date} 16:40`,
        nbdCrr: 'CRR',
        company: 'KTAHV',
      },
    ],
    VILARAAG: [
      {
        id: 'demo-vr-1',
        bookingOrderId: 'BK-VR-4102',
        clientName: 'Mrs. Neha Kapoor',
        mobile: '+91 99201 87654',
        email: 'neha.kapoor@example.com',
        source: 'Facebook + Instagram',
        rawSource: 'Facebook + Instagram',
        salesPerson: 'Anjali Menon',
        amount: 182000,
        status: 'Confirmed',
        bookingType: 'Wellness Stay (5 Nights)',
        dateTime: `${date} 14:15`,
        nbdCrr: 'NBD',
        company: 'VILARAAG',
      },
    ],
    KAPPL: [
      {
        id: 'demo-kappl-1',
        bookingOrderId: 'ORD-KP-9901',
        clientName: 'Kailash Pharma & Herbs',
        mobile: '+91 97123 45678',
        email: 'purchase@kailashpharma.com',
        source: 'Google PPC',
        rawSource: 'Google PPC',
        salesPerson: 'Amit Verma',
        amount: 120000,
        status: 'Confirmed',
        bookingType: 'Bulk Product Order',
        dateTime: `${date} 10:30`,
        nbdCrr: 'CRR',
        company: 'KAPPL',
      },
      {
        id: 'demo-kappl-2',
        bookingOrderId: 'ORD-KP-9902',
        clientName: 'Dr. Suresh Babu',
        mobile: '+91 94470 12345',
        email: 'dr.suresh@babuklinik.org',
        source: 'Website',
        rawSource: 'Website',
        salesPerson: 'Amit Verma',
        amount: 68000,
        status: 'Confirmed',
        bookingType: 'Institutional Supply',
        dateTime: `${date} 13:45`,
        nbdCrr: 'NBD',
        company: 'KAPPL',
      },
      {
        id: 'demo-kappl-3',
        bookingOrderId: 'ORD-KP-9903',
        clientName: 'Sanjeevani Wellness Center',
        mobile: '+91 98860 98765',
        email: 'admin@sanjeevaniwell.in',
        source: 'WhatsApp',
        rawSource: 'WhatsApp',
        salesPerson: 'Vikram Singh',
        amount: 30000,
        status: 'Confirmed',
        bookingType: 'Formulation Medicines',
        dateTime: `${date} 17:10`,
        nbdCrr: 'CRR',
        company: 'KAPPL',
      },
    ],
  }

  const unverifiedPool: Record<string, ConversionRecord[]> = {
    KTAHV: [
      {
        id: 'demo-uv-ktahv-1',
        bookingOrderId: 'BK-KTAHV-8031',
        clientName: 'Mrs. Sunita Verma',
        mobile: '+91 98711 54321',
        email: 'sunita.v@example.com',
        source: 'Priyasharma AI Chat',
        rawSource: 'Priyasharma AI Chat',
        salesPerson: 'Priya Sharma AI',
        amount: 263617.14,
        status: 'Pending Verification',
        bookingType: 'Ayurvedic Treatment & Rejuvenation',
        dateTime: `${date} 09:40`,
        nbdCrr: 'NBD',
        company: 'KTAHV',
      },
      {
        id: 'demo-uv-ktahv-2',
        bookingOrderId: 'BK-KTAHV-8032',
        clientName: 'Mr. Deepankar Ghosh',
        mobile: '+91 98200 65432',
        email: 'deepankar.ghosh@example.com',
        source: 'Reference',
        rawSource: 'Reference',
        salesPerson: 'Dr. K. Raman',
        amount: 322317.86,
        status: 'Pending Verification',
        bookingType: 'Stress & Strain Relief Package',
        dateTime: `${date} 15:20`,
        nbdCrr: 'CRR',
        company: 'KTAHV',
      },
    ],
    VILARAAG: [
      {
        id: 'demo-uv-vr-1',
        bookingOrderId: 'BK-VR-4219',
        clientName: 'Rohit Deshmukh',
        mobile: '+91 98220 11223',
        email: 'rohit.d@example.com',
        source: 'Website',
        rawSource: 'Website',
        salesPerson: 'Anjali Menon',
        amount: 95000,
        status: 'Pending Verification',
        bookingType: 'Weekend Rejuvenation',
        dateTime: `${date} 12:10`,
        nbdCrr: 'NBD',
        company: 'VILARAAG',
      },
    ],
    KAPPL: [
      {
        id: 'demo-uv-kappl-1',
        bookingOrderId: 'ORD-KP-9988',
        clientName: 'AyurVeda Direct Store',
        mobile: '+91 94471 99880',
        email: 'orders@ayurdirect.in',
        source: 'Website',
        rawSource: 'Website',
        salesPerson: 'Vikram Singh',
        amount: 45000,
        status: 'Pending Verification',
        bookingType: 'Online Retail Order',
        dateTime: `${date} 16:05`,
        nbdCrr: 'CRR',
        company: 'KAPPL',
      },
    ],
  }

  const pool = kind === 'unverified' ? unverifiedPool : verifiedPool

  let list: ConversionRecord[] = []
  if (normComp === 'ALL' || !normComp) {
    list = Object.values(pool).flat()
  } else if (normComp === 'VILLARAAG' || normComp === 'VILARAAG') {
    list = pool.VILARAAG || []
  } else {
    list = pool[normComp] || []
  }

  if (!isAllSources) {
    list = list.filter(item =>
      normalizeVSrcKey(item.source) === normalizeVSrcKey(normSrc) ||
      normalizeVSrc(item.source).label.toLowerCase() === normSrc.toLowerCase()
    )
  }

  return list
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  const role = String(user?.role || '').trim().toLowerCase()
  const isSuperAdmin = role === 'super_admin' || role === 'super admin' || user?.permissions?.includes('all')
  if (!isSuperAdmin && !hasPermission(user, 'marketing_daily_report.view')) {
    return NextResponse.json({ error: 'Access denied. Permission required.' }, { status: 403, headers })
  }

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date') || ''
  const company = searchParams.get('company') || ''
  const source = searchParams.get('source') || ''
  const kindParam = (searchParams.get('kind') || searchParams.get('type') || 'verified').toLowerCase()
  const kind: 'verified' | 'unverified' = kindParam === 'unverified' ? 'unverified' : 'verified'

  let window: string[]
  try {
    window = reportWindow(date)
  } catch {
    return NextResponse.json({ error: 'Use a valid YYYY-MM-DD report date' }, { status: 400, headers })
  }

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  if (date >= today) {
    return NextResponse.json({ error: 'Choose a completed reporting day' }, { status: 400, headers })
  }

  let connection
  try {
    connection = await (await getPool()).getConnection()
    await connection.query("SET SESSION time_zone = '+05:30'")
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION READ ONLY')

    const dbCompany = company ? (company === 'VILARAAG' ? 'VILLARAAG' : company).toUpperCase() : ''
    
    // Exact SQL conditions matching reportQueries.sales
    const condition = kind === 'unverified'
      ? `is_verified = 0 AND (
          (company = 'KAPPL' AND COALESCE(return_id, '') = '' AND LOWER(COALESCE(booking_status,'')) NOT IN ('voucher','complimentary')) OR
          (company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) NOT IN ('cancelled','booking cancelled','no show','voucher','complimentary'))
        )`
      : `is_verified = 1 AND (
          (company = 'KAPPL' AND COALESCE(return_id, '') = '') OR
          (company <> 'KAPPL' AND LOWER(COALESCE(booking_status,'')) = 'confirmed')
        )`

    let sql = `SELECT 
      booking_order_id,
      name_of_client,
      mobile,
      email,
      NBD_CRR,
      sales_person_name,
      is_verified,
      conversion_amount,
      amount_after_return,
      verified_source,
      booking_status,
      booking_type,
      company,
      DATE_FORMAT(date_and_time, '%Y-%m-%d %H:%i') AS formatted_datetime,
      date_and_time,
      return_id
    FROM conversion_updates_employeewise
    WHERE date_and_time >= ? AND date_and_time < ?
      AND ${condition}`

    const params: (string | number)[] = [window[0], window[1]]

    if (dbCompany && dbCompany !== 'ALL') {
      sql += ' AND company = ?'
      params.push(dbCompany)
    }

    sql += ' ORDER BY date_and_time DESC'

    const [rows] = (await connection.query({ sql, timeout: 20000 }, params)) as unknown as [Record<string, unknown>[]]
    await connection.rollback()

    const isAllSources = !source || source.trim().toLowerCase() === 'company total' || source.trim().toLowerCase() === 'all'
    const targetSourceKey = isAllSources ? null : normalizeVSrcKey(source)
    const targetSourceLabel = isAllSources ? null : source.trim().toLowerCase()

    const records: ConversionRecord[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx]
      const rawSrc = String(r.verified_source || '')
      const norm = normalizeVSrc(rawSrc)
      if (!isAllSources) {
        const matchesKey = normalizeVSrcKey(rawSrc) === targetSourceKey
        const matchesLabel = norm.label.toLowerCase() === targetSourceLabel
        if (!matchesKey && !matchesLabel) continue
      }

      const rowComp = String(r.company || '')
      const finalAmt = rowComp === 'KAPPL'
        ? (Number(r.amount_after_return) || Number(r.conversion_amount) || 0)
        : (Number(r.conversion_amount) || 0)

      records.push({
        id: String(r.booking_order_id || `rec-${idx}`),
        bookingOrderId: String(r.booking_order_id || '—'),
        clientName: String(r.name_of_client || '—'),
        mobile: String(r.mobile || '—'),
        email: String(r.email || '—'),
        source: norm.label,
        rawSource: rawSrc,
        salesPerson: String(r.sales_person_name || 'Unassigned'),
        amount: finalAmt,
        status: String(r.booking_status || (kind === 'unverified' ? 'Pending Verification' : 'Confirmed')),
        bookingType: String(r.booking_type || '—'),
        dateTime: String(r.formatted_datetime || r.date_and_time || '—'),
        nbdCrr: String(r.NBD_CRR || '—'),
        company: rowComp === 'VILLARAAG' ? 'VILARAAG' : rowComp,
      })
    }

    const totalAmount = records.reduce((acc, rec) => acc + rec.amount, 0)

    return NextResponse.json({
      date,
      company: company || 'ALL',
      source: isAllSources ? 'Company total' : source,
      kind,
      count: records.length,
      totalAmount,
      conversions: records,
    }, { headers })
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback()
      } catch {}
    }
    console.warn('[marketing-daily-report/conversions] DB query failed, falling back to demo data:', err instanceof Error ? err.message : err)

    // Fallback gracefully to demo records for mock testing / demo mode
    const demoRecords = getDemoRecords(date, company, source, kind)
    const totalAmount = demoRecords.reduce((acc, rec) => acc + rec.amount, 0)

    return NextResponse.json({
      date,
      company: company || 'ALL',
      source: (!source || source.trim().toLowerCase() === 'company total') ? 'Company total' : source,
      kind,
      count: demoRecords.length,
      totalAmount,
      conversions: demoRecords,
      isDemo: true,
    }, { headers })
  } finally {
    connection?.release()
  }
}
