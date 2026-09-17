import { getPool } from '@/lib/db'
import { combineSales, companies } from '@/lib/daily-sales-report'
import { reportWindow, salesSQL } from '@/lib/daily-sales-report-query'
import { bookingSQL, cancellationSQL, cancellationDates, bookingAmounts, type BookingAggregate } from '@/lib/daily-sales-bookings'
import { loadCalling } from '@/lib/daily-sales-calling-server'
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
  const [employeeCompanies]=await connection.query('SELECT user_name, company, company_name FROM userlogin')
  await connection.rollback()
  const corrected=await bookingAmounts(bookings as BookingAggregate[],cancellations as BookingAggregate[])
  const report=combineSales(date,[...(sales as Record<string,unknown>[]).filter(r=>r.company!=='KTAHV'),...corrected],calls)
  report.cancellationSnapshotAt=sourceDates.capturedAt
  report.warnings.push(`KTAHV cancellations use AM status and CW dates from a verified Sheet snapshot captured ${sourceDates.capturedAt}; SQL CW dates have a known day/month sync mismatch. New cancellations after this snapshot need a refresh of the source snapshot.`)
  const calling=await loadCalling(connection, date)
  for(const employee of calling.employees){
   const matches=(employeeCompanies as {user_name:string;company:string;company_name:string}[]).filter(r=>r.user_name?.trim().toLowerCase()===employee.name.toLowerCase())
   employee.companies=[...new Set(matches.flatMap(r=>[r.company,r.company_name].flatMap(value=>(value||'').toUpperCase().split(/[,;|]/).map(x=>x.trim()).filter(x=>Object.hasOwn(companies,x)))))]
  }
  const unmapped=calling.employees.filter(r=>!r.companies?.length).length
  if(unmapped)calling.warnings.push(`${unmapped} employees have no matched CRM company; visible under All companies only.`)
  return {...report,calling}
 }catch(err){console.error('[loadScheduledSales error]', err);if(connection)try{await connection.rollback()}catch{}throw Error('Report data unavailable')}finally{connection?.release()}
}
