import { NextRequest,NextResponse } from 'next/server'
import { secureEqual } from '@/lib/trigger-monitor/security'
import { readMonitor,monitorTransaction } from '@/lib/trigger-monitor/store'
import { scanAccount } from '@/lib/trigger-monitor/google'
export const runtime='nodejs'
export const maxDuration=300
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||!secureEqual(req.headers.get('authorization')||'',`Bearer ${process.env.CRON_SECRET}`))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const state=await readMonitor()
  // Oldest scan first; bounded work, remaining accounts advance on the next tick.
  const accounts=state.accounts.filter(a=>a.refreshToken).sort((a,b)=>(a.lastScan||'').localeCompare(b.lastScan||'')).slice(0,5)
  let failed=0
  for(const a of accounts)try{await scanAccount(a.email)}catch{failed++}
  await monitorTransaction(s=>{s.heartbeat=new Date().toISOString()})
  return NextResponse.json({scanned:accounts.length,failed},{headers:{'Cache-Control':'no-store'}})
 }catch{return NextResponse.json({error:'Monitoring storage unavailable'},{status:503})}
}
