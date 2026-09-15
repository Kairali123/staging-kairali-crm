import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/authz'
import { getPool } from '@/lib/db'
import { leakageParams, leakageQuery, leakageDiagnosticsQuery } from '@/lib/good-lead-leakage'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = {'Cache-Control':'private, no-store, max-age=0'}
export async function GET(req:NextRequest) {
 const user=getSessionUser(req)
 if(!user) return NextResponse.json({error:'Please sign in to view this dashboard.'},{status:401,headers})
 const role = String(user?.role || '').trim().toLowerCase()
 if(role !== 'super_admin' && role !== 'super admin') return NextResponse.json({error:'Super administrator access is required for this dashboard.'},{status:403,headers})
 let params
 try { const p=req.nextUrl.searchParams; params=leakageParams(p.get('from')||'',p.get('to')||'',p.get('company')||'ALL',p.get('review')||'ALL') }
 catch { return NextResponse.json({error:'Select valid dates (up to 93 days), company and review filters.'},{status:400,headers}) }
 let connection
 try {
  connection=await (await getPool()).getConnection()
  await connection.query("SET SESSION time_zone = '+05:30'")
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
  await connection.query('START TRANSACTION READ ONLY')
  const [databaseRows]=await connection.query('SELECT DATABASE() AS name')
  const database=(databaseRows as {name:string}[])[0].name
  const [rows]=await connection.query({sql:leakageQuery,timeout:20000},params)
  const [diagnosticRows]=await connection.query({sql:leakageDiagnosticsQuery,timeout:20000},params)
  const diagnostics=(diagnosticRows as Record<string,unknown>[])[0]
  await connection.rollback()
  return NextResponse.json({rows,diagnostics,generatedAt:new Date().toISOString(),provenance:{database,tables:['fms_enquiry_cold_reverification_v2','archieve_fms_enquiry_cold_reverification_v2'],dateBasis:'Review generated date (IST)',countBasis:'Review records; not unique leads'}},{headers})
 } catch {
  if(connection) {try{await connection.rollback()}catch{}}
  return NextResponse.json({error:'Live SQL reporting is unavailable. Please retry.'},{status:503,headers})
 } finally {connection?.release()}
}
