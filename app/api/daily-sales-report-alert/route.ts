import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import { getPool } from '@/lib/db'
import { combineSales, companies } from '@/lib/daily-sales-report'
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
 if(role!=='super_admin'&&role!=='super admin')return NextResponse.json({error:'Super administrator access required'},{status:403,headers})
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
  const [cancellations]=await connection.query({sql:cancellationSQL,timeout:20000},[JSON.stringify(sourceDates.ids)])
  const calls: Record<string,unknown>[]=[]
  const [employeeCompanies]=await connection.query('SELECT user_name, company, company_name FROM userlogin')
  await connection.rollback()
  const corrected=await bookingAmounts(bookings as BookingAggregate[],cancellations as BookingAggregate[])
  const report=combineSales(date,[...(sales as Record<string,unknown>[]).filter(r=>r.company!=='KTAHV'),...corrected],calls)
  report.cancellationSnapshotAt=sourceDates.capturedAt
  report.warnings.push(`KTAHV cancellations use AM status and CW dates from a verified Sheet snapshot captured ${sourceDates.capturedAt}; SQL CW dates have a known day/month sync mismatch. New cancellations after this snapshot need a refresh of the source snapshot.`)
  const calling=await loadCalling()
  for(const employee of calling.employees){
   const matches=(employeeCompanies as {user_name:string;company:string;company_name:string}[]).filter(r=>r.user_name?.trim().toLowerCase()===employee.name.toLowerCase())
   employee.companies=[...new Set(matches.flatMap(r=>[r.company,r.company_name].flatMap(value=>(value||'').toUpperCase().split(/[,;|]/).map(x=>x.trim()).filter(x=>Object.hasOwn(companies,x)))))]
  }
  const unmapped=calling.employees.filter(r=>!r.companies?.length).length
  if(unmapped)calling.warnings.push(`${unmapped} employees have no matched CRM company; visible under All companies only.`)
  return NextResponse.json({...report,calling,rows:report.rows.filter(r=>company==='ALL'||r.company===company)},{headers})
 }catch{if(connection)try{await connection.rollback()}catch{}return NextResponse.json({error:'SQL report unavailable. Please retry; no sample data has been substituted.'},{status:503,headers})}finally{connection?.release()}
}
