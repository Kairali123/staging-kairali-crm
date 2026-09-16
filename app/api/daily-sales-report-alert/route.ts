import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, hasPermission } from '@/lib/authz'
import { getPool } from '@/lib/db'
import { combineSales, companies, type SaleDetail } from '@/lib/daily-sales-report'
import { reportWindow, salesSQL } from '@/lib/daily-sales-report-query'
import { bookingSQL, cancellationSQL, cancellationDates, bookingAmounts, type BookingAggregate } from '@/lib/daily-sales-bookings'
import { loadCalling } from '@/lib/daily-sales-calling-server'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const headers={'Cache-Control':'private, no-store, max-age=0'}
export async function GET(req:NextRequest){
 const user=getSessionUser(req)
 if(!user)return NextResponse.json({error:'Unauthorized'},{status:401,headers})
 const role=String(user?.role||'').trim().toLowerCase()
 const isSuperAdmin = role==='super_admin'||role==='super admin'||user?.permissions?.includes('all')
 if(!isSuperAdmin && !hasPermission(user, 'daily_sales_alert.view')) return NextResponse.json({error:'Access denied. Permission required.'},{status:403,headers})
 const date=req.nextUrl.searchParams.get('date')||'',company=req.nextUrl.searchParams.get('company')||'ALL'
 let window:string[]
 try{window=reportWindow(date);if(company!=='ALL'&&!Object.hasOwn(companies,company))throw Error()}catch{return NextResponse.json({error:'Choose a valid report date and company'},{status:400,headers})}
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 if(date>today)return NextResponse.json({error:'Choose today or an earlier reporting day'},{status:400,headers})
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
  const [employeeCompanies]=await connection.query('SELECT user_name, company, company_name FROM userlogin')
  let ktahvRawDetails: any[] = []
  try {
    const [rows] = await connection.query({
      sql: `SELECT 
        b.id,
        b.reservation_id,
        COALESCE(NULLIF(TRIM(b.booking_taken_by),''),'Unassigned') AS agent,
        DATE_FORMAT(b.booking_datetime, '%Y-%m-%d %H:%i') AS booking_datetime,
        DATE_FORMAT(b.booking_datetime, '%Y-%m-%d') AS booking_date,
        COALESCE(NULLIF(TRIM(b.client_name),''), '—') AS client_name,
        COALESCE(b.invoice_amount, 0) AS invoice_amount,
        UPPER(TRIM(COALESCE(b.currency,'INR'))) AS currency,
        COALESCE(NULLIF(TRIM(nbs.nb_bvs_pi_number),''), b.reservation_id) AS pi_number,
        COALESCE(NULLIF(TRIM(inv.invoice_url_new),''), NULLIF(TRIM(nbs.nb_bvs_pi_link),'')) AS pi_link
      FROM ktahv_bookings_fms_v3_part1 b
      LEFT JOIN ktahv_bookings_fms_v3_nb_booking_verification_stage nbs ON b.reservation_id COLLATE utf8mb4_unicode_ci = nbs.reservation_id COLLATE utf8mb4_unicode_ci
      LEFT JOIN ktahv_invoicing_format inv ON b.reservation_id COLLATE utf8mb4_unicode_ci = inv.booking_id COLLATE utf8mb4_unicode_ci
      WHERE b.booking_datetime >= ? AND b.booking_datetime < ?
        AND LOWER(TRIM(COALESCE(b.booking_status,''))) NOT IN ('cancelled','booking cancelled','canceled')`,
      timeout: 20000
    }, window)
    const seen = new Set<string>()
    for (const r of rows as any[]) {
      const id = String(r.reservation_id || r.id)
      if (seen.has(id)) continue
      seen.add(id)
      ktahvRawDetails.push(r)
    }
  } catch (e) {
    console.warn('[daily-sales-report-alert] ktahvRawDetails error:', e)
  }

  let vrRawDetails: any[] = []
  try {
    const [rows] = await connection.query({
      sql: `SELECT 
        c.id,
        c.booking_order_id,
        COALESCE(NULLIF(TRIM(c.sales_person_name),''),'Unassigned') AS agent,
        DATE_FORMAT(c.date_and_time, '%Y-%m-%d %H:%i') AS booking_datetime,
        COALESCE(NULLIF(TRIM(c.name_of_client),''), '—') AS client_name,
        COALESCE(c.conversion_amount, 0) AS amount,
        COALESCE(NULLIF(TRIM(v.invoice_number),''), NULLIF(TRIM(c.booking_order_id),''), '—') AS pi_number,
        NULLIF(TRIM(v.invoice_url),'') AS pi_link
      FROM conversion_updates_employeewise c
      LEFT JOIN villa_raag_client_booking_fms v ON c.booking_order_id COLLATE utf8mb4_unicode_ci = v.booking_id COLLATE utf8mb4_unicode_ci
      WHERE c.date_and_time >= ? AND c.date_and_time < ?
        AND c.company = 'VILLARAAG'
        AND c.is_verified = 1
        AND LOWER(COALESCE(c.booking_status,'')) = 'confirmed'`,
      timeout: 20000
    }, window)
    const seen = new Set<string>()
    for (const r of rows as any[]) {
      const id = String(r.id)
      if (seen.has(id)) continue
      seen.add(id)
      vrRawDetails.push(r)
    }
  } catch (e) {
    console.warn('[daily-sales-report-alert] vrRawDetails error:', e)
  }

  let kapplRawDetails: any[] = []
  try {
    const [rows] = await connection.query({
      sql: `SELECT 
        c.id,
        c.booking_order_id,
        COALESCE(NULLIF(TRIM(c.sales_person_name),''),'Unassigned') AS agent,
        DATE_FORMAT(c.date_and_time, '%Y-%m-%d %H:%i') AS booking_datetime,
        COALESCE(NULLIF(TRIM(c.name_of_client),''), '—') AS client_name,
        COALESCE(NULLIF(c.amount_after_return, 0), c.conversion_amount, 0) AS amount,
        COALESCE(NULLIF(TRIM(c.booking_order_id),''), '—') AS pi_number,
        NULL AS pi_link
      FROM conversion_updates_employeewise c
      WHERE c.date_and_time >= ? AND c.date_and_time < ?
        AND c.company = 'KAPPL'
        AND c.is_verified = 1
        AND COALESCE(c.return_id, '') = ''`,
      timeout: 20000
    }, window)
    const seen = new Set<string>()
    for (const r of rows as any[]) {
      const id = String(r.id)
      if (seen.has(id)) continue
      seen.add(id)
      kapplRawDetails.push(r)
    }
  } catch (e) {
    console.warn('[daily-sales-report-alert] kapplRawDetails error:', e)
  }

  await connection.rollback()
  const corrected=await bookingAmounts(bookings as BookingAggregate[],cancellations as BookingAggregate[])
  const report=combineSales(date,[...(sales as Record<string,unknown>[]).filter(r=>r.company!=='KTAHV'),...corrected],calls)

  const fxRates = new Map<string, number>()
  for (const item of ktahvRawDetails) {
    const curr = item.currency === 'EURO' ? 'EUR' : item.currency
    let amt = Number(item.invoice_amount || 0)
    if (curr !== 'INR' && ['EUR', 'USD'].includes(curr)) {
      const key = curr + item.booking_date
      if (!fxRates.has(key)) {
        try {
          const res = await fetch(`https://api.frankfurter.dev/v2/rate/${curr}/INR?date=${item.booking_date}&providers=ecb`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
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

  const ktahvDetailMap = new Map<string, SaleDetail[]>()
  for (const r of ktahvRawDetails) {
    const key = String(r.agent || 'unassigned').trim().toLowerCase()
    if (!ktahvDetailMap.has(key)) ktahvDetailMap.set(key, [])
    ktahvDetailMap.get(key)!.push({
      id: String(r.reservation_id),
      date: r.booking_datetime || '—',
      clientName: r.client_name || '—',
      piNumber: r.pi_number || r.reservation_id || '—',
      piLink: r.pi_link || null,
      amount: Number(r.convertedAmount || 0),
      agent: r.agent
    })
  }

  const vrDetailMap = new Map<string, SaleDetail[]>()
  for (const r of vrRawDetails) {
    const key = String(r.agent || 'unassigned').trim().toLowerCase()
    if (!vrDetailMap.has(key)) vrDetailMap.set(key, [])
    vrDetailMap.get(key)!.push({
      id: String(r.booking_order_id || r.id),
      date: r.booking_datetime || '—',
      clientName: r.client_name || '—',
      piNumber: r.pi_number || '—',
      piLink: r.pi_link || null,
      amount: Number(r.amount || 0),
      agent: r.agent
    })
  }

  const kapplDetailMap = new Map<string, SaleDetail[]>()
  for (const r of kapplRawDetails) {
    const key = String(r.agent || 'unassigned').trim().toLowerCase()
    if (!kapplDetailMap.has(key)) kapplDetailMap.set(key, [])
    kapplDetailMap.get(key)!.push({
      id: String(r.booking_order_id || r.id),
      date: r.booking_datetime || '—',
      clientName: r.client_name || '—',
      piNumber: r.pi_number || '—',
      piLink: null,
      amount: Number(r.amount || 0),
      agent: r.agent
    })
  }

  for (const row of report.rows) {
    const key = row.agent.trim().toLowerCase()
    const details = row.company === 'KTAHV' ? (ktahvDetailMap.get(key) || [])
      : row.company === 'VILLARAAG' ? (vrDetailMap.get(key) || [])
      : row.company === 'KAPPL' ? (kapplDetailMap.get(key) || [])
      : []
    row.salesDetails = details
    row.piLinks = details.filter(d => d.piLink).map(d => ({ id: d.id || d.piNumber, piNumber: d.piNumber, url: d.piLink! }))
  }
  report.cancellationSnapshotAt=sourceDates.capturedAt
  report.warnings.push(`KTAHV cancellations use AM status and CW dates from a verified Sheet snapshot captured ${sourceDates.capturedAt}; SQL CW dates have a known day/month sync mismatch. New cancellations after this snapshot need a refresh of the source snapshot.`)
  const calling=await loadCalling(connection, date)
  for(const employee of calling.employees){
   const matches=(employeeCompanies as {user_name:string;company:string;company_name:string}[]).filter(r=>r.user_name?.trim().toLowerCase()===employee.name.toLowerCase())
   employee.companies=[...new Set(matches.flatMap(r=>[r.company,r.company_name].flatMap(value=>(value||'').toUpperCase().split(/[,;|]/).map(x=>x.trim()).filter(x=>Object.hasOwn(companies,x)))))]
  }
  const unmapped=calling.employees.filter(r=>!r.companies?.length).length
  if(unmapped)calling.warnings.push(`${unmapped} employees have no matched CRM company; visible under All companies only.`)
  return NextResponse.json({...report,calling,rows:report.rows.filter(r=>company==='ALL'||r.company===company)},{headers})
 }catch(err){console.error('[daily-sales-report-alert error]',err);if(connection)try{await connection.rollback()}catch{}return NextResponse.json({error:'SQL report unavailable. Please retry; no sample data has been substituted.'},{status:503,headers})}finally{connection?.release()}
}
