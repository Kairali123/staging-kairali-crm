import { getPool } from '@/lib/db'
import { combineSales, companies, type CollectionDetail } from '@/lib/daily-sales-report'
import { reportWindow, salesSQL } from '@/lib/daily-sales-report-query'
import { bookingSQL, cancellationSQL, cancellationDates, bookingAmounts, type BookingAggregate } from '@/lib/daily-sales-bookings'
import { loadCalling } from '@/lib/daily-sales-calling-server'
import { mapEmployeeCompanies } from '@/lib/daily-sales-calling'
export async function loadScheduledSales(date:string){
 const window=reportWindow(date)
 let connection
 try{
  connection=await(await getPool()).getConnection()
  await connection.query("SET SESSION time_zone = '+05:30'")
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
  await connection.query('START TRANSACTION READ ONLY')
  const [sales]=await connection.query({sql:salesSQL,timeout:20000},window)
  const sourceDates=await cancellationDates(date)
  const [bookings]=await connection.query({sql:bookingSQL,timeout:20000},window)
  const [cancellations]=await connection.query({sql:cancellationSQL,timeout:20000},window)
  const calls: Record<string,unknown>[]=[]
  const [employeeCompanies]=await connection.query(`
    SELECT user_name, company, company_name FROM userlogin
    UNION ALL
    SELECT all_users AS user_name, company, company_type AS company_name FROM all_users
  `)

  let rawCollections: any[] = []
  try {
    const [rows] = await connection.query({
      sql: `SELECT 
        p.id,
        p.collection_id,
        p.booking_id,
        COALESCE(NULLIF(TRIM(p.company), ''), NULLIF(TRIM(b.company_name), ''), '') AS company,
        COALESCE(NULLIF(TRIM(p.name), ''), NULLIF(TRIM(b.client_name), ''), NULLIF(TRIM(vr.name_of_client), ''), '—') AS client_name,
        COALESCE(NULLIF(TRIM(p.receipt_number), ''), NULLIF(TRIM(p.receipt_id), ''), '—') AS receipt_number,
        DATE_FORMAT(p.payment_received_date, '%Y-%m-%d %H:%i') AS payment_datetime,
        DATE_FORMAT(p.payment_received_date, '%Y-%m-%d') AS payment_date,
        COALESCE(NULLIF(p.received_amount, 0), p.actual_received, 0) AS amount,
        UPPER(TRIM(COALESCE(p.currency, 'INR'))) AS currency,
        COALESCE(NULLIF(TRIM(p.payment_mode), ''), '—') AS payment_mode,
        COALESCE(NULLIF(TRIM(p.payment_collected_by), ''), NULLIF(TRIM(b.booking_taken_by), ''), NULLIF(TRIM(vr.booking_taken_by), ''), 'Unassigned') AS payment_collected_by
      FROM payment_collection p
      LEFT JOIN ktahv_bookings_fms_v3_part1 b ON p.booking_id COLLATE utf8mb4_unicode_ci = b.reservation_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN villa_raag_client_booking_fms vr ON p.booking_id COLLATE utf8mb4_unicode_ci = vr.booking_id COLLATE utf8mb4_unicode_ci
      WHERE p.payment_received_date >= ? AND p.payment_received_date < ?
        AND LOWER(COALESCE(p.received_status, '')) NOT IN ('cancelled', 'rejected', 'failed', 'refunded')`,
      timeout: 20000
    }, window)
    const seen = new Set<string>()
    for (const r of rows as any[]) {
      const id = String(r.collection_id || r.id)
      if (seen.has(id)) continue
      seen.add(id)
      rawCollections.push(r)
    }
  } catch (e) {
    console.error('[loadScheduledSales] rawCollections error:', e)
  }

  await connection.rollback()

  const fxRates = new Map<string, number>()
  for (const item of rawCollections) {
    const curr = item.currency === 'EURO' ? 'EUR' : item.currency
    let amt = Number(item.amount || 0)
    if (curr !== 'INR' && ['EUR', 'USD'].includes(curr)) {
      const key = curr + item.payment_date
      if (!fxRates.has(key)) {
        try {
          const res = await fetch(`https://api.frankfurter.dev/v2/rate/${curr}/INR?date=${item.payment_date}&providers=ecb`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
          if (res.ok) {
            const data = await res.json()
            if (Number.isFinite(data.rate) && data.rate > 0) fxRates.set(key, data.rate)
          }
        } catch {}
      }
      amt = amt * (fxRates.get(key) || 1)
    }
    item.convertedAmount = amt
  }

  const resolveCollectionCompany = (comp: string): string => {
    const s = (comp || '').trim().toLowerCase()
    if (s.includes('villa') || s.includes('raag')) return 'VILLARAAG'
    if (s.includes('kappl') || s.includes('product')) return 'KAPPL'
    return 'KTAHV'
  }

  const collectionGroups = new Map<string, { company: string; agent: string; amount: number; count: number; collectionDetails: CollectionDetail[] }>()
  for (const item of rawCollections) {
    const comp = resolveCollectionCompany(item.company)
    const agent = (item.payment_collected_by || 'Unassigned').trim()
    const key = comp + '|' + agent.toLowerCase()
    if (!collectionGroups.has(key)) {
      collectionGroups.set(key, { company: comp, agent, amount: 0, count: 0, collectionDetails: [] })
    }
    const grp = collectionGroups.get(key)!
    grp.amount += item.convertedAmount
    grp.count += 1
    grp.collectionDetails.push({
      id: String(item.id || item.collection_id),
      date: item.payment_datetime || item.payment_date || '—',
      clientName: item.client_name || '—',
      bookingId: String(item.booking_id || '—'),
      receiptNumber: item.receipt_number || '—',
      paymentMode: item.payment_mode || '—',
      amount: item.convertedAmount,
      agent,
      company: comp
    })
  }

  const corrected=await bookingAmounts(bookings as BookingAggregate[],cancellations as BookingAggregate[])
  const report=combineSales(date,[...(sales as Record<string,unknown>[]).filter(r=>r.company!=='KTAHV'),...corrected],calls,[...collectionGroups.values()])

  for (const row of report.rows) {
    const key = row.agent.trim().toLowerCase()
    const compKey = row.company + '|' + key
    const coll = collectionGroups.get(compKey)
    if (coll) {
      row.collection = coll.amount
      row.collectionCount = coll.count
      row.collectionDetails = coll.collectionDetails
    } else {
      row.collection = row.collection || 0
      row.collectionCount = row.collectionCount || 0
      row.collectionDetails = row.collectionDetails || []
    }
  }

  report.cancellationSnapshotAt=sourceDates.capturedAt
  report.warnings.push(`KTAHV cancellations use AM status and CW dates from a verified Sheet snapshot captured ${sourceDates.capturedAt}; SQL CW dates have a known day/month sync mismatch. New cancellations after this snapshot need a refresh of the source snapshot.`)
  const calling=await loadCalling(connection, date)
  mapEmployeeCompanies(calling.employees, employeeCompanies as {user_name?:string;company?:string;company_name?:string}[], companies)
  const unmapped=calling.employees.filter(r=>!r.companies?.length).length
  if(unmapped)calling.warnings.push(`${unmapped} employees have no matched CRM company; visible under All companies only.`)
  return {...report,calling}
 }catch(err){console.error('[loadScheduledSales error]', err);if(connection)try{await connection.rollback()}catch{}throw Error('Report data unavailable')}finally{connection?.release()}
}
