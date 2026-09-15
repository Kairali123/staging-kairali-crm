import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import { getPool } from '@/lib/db'
import { reportWindow, reportQueries, combineReport, type AggregateRow } from '@/lib/marketing-report-query'
import { signReportSnapshot, marketingMailConfig } from '@/lib/marketing-report-email'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
export async function GET(req: NextRequest) {
  const user = getSessionUser(req)
  if (!user) return NextResponse.json({error:'Unauthorized'}, {status:401,headers})
  const role = String(user?.role || '').trim().toLowerCase()
  const isSuperAdmin = role === 'super_admin' || role === 'super admin'
  if (!isSuperAdmin) return NextResponse.json({error:'Super administrator access required'}, {status:403,headers})
  const date=req.nextUrl.searchParams.get('date')||''
  let window: string[]
  try { window=reportWindow(date) } catch { return NextResponse.json({error:'Use a valid YYYY-MM-DD report date'}, {status:400,headers}) }
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  if(date>=today) return NextResponse.json({error:'Choose a completed reporting day'}, {status:400,headers})
  let connection
  try {
    connection=await (await getPool()).getConnection()
    await connection.query("SET SESSION time_zone = '+05:30'")
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await connection.query('START TRANSACTION READ ONLY')
    const results: Record<string, unknown[]> = {}
    for(const [key,sql] of Object.entries(reportQueries)) {
      const [rows]=await connection.query({sql,timeout:20000},window)
      results[key]=rows as unknown[]
    }
    await connection.rollback()
    const report=combineReport(date,results.traffic as AggregateRow[],results.spend as AggregateRow[],results.sales as AggregateRow[],Number((results.duplicates[0] as {duplicates:number}).duplicates),results.leads as AggregateRow[])
    return NextResponse.json({...report, snapshot:signReportSnapshot(report,req.cookies.get('kairali_user')?.value||''), emailEnabled:marketingMailConfig().configured && isSuperAdmin},{headers})
  } catch {
    if(connection) { try {await connection.rollback()} catch {} }
    return NextResponse.json({error:'SQL report unavailable. No demo data has been substituted.'},{status:503,headers})
  } finally { connection?.release() }
}
