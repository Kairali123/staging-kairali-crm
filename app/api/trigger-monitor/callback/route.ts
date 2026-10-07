import { NextRequest, NextResponse } from 'next/server'
import { administrator,decrypt,secureEqual,privateHeaders } from '@/lib/trigger-monitor/security'
import { completeGoogleConnection,scanAccount } from '@/lib/trigger-monitor/google'
export const runtime='nodejs'
export async function GET(req:NextRequest){
 const res=NextResponse.redirect(new URL('/settings/automation/trigger-management',req.url))
 res.cookies.set('trigger_monitor_oauth','',{httpOnly:true,path:'/api/trigger-monitor',maxAge:0})
 try{
  const user=administrator(req),cookie=req.cookies.get('trigger_monitor_oauth')?.value
  if(!user||!cookie)throw Error('Session missing')
  const s=JSON.parse(decrypt(cookie)),code=req.nextUrl.searchParams.get('code'),state=req.nextUrl.searchParams.get('state')||''
  if(!code||s.expires<Date.now()||s.user!==String(user.id)||!secureEqual(s.state,state))throw Error('OAuth state mismatch')
  await completeGoogleConnection(code,s.email,s.verifier)
  await scanAccount(s.email).catch(()=>{})
  res.headers.set('Location',new URL('/settings/automation/trigger-management?connection=success',req.url).toString())
 }catch{res.headers.set('Location',new URL('/settings/automation/trigger-management?connection=failed',req.url).toString())}
 Object.entries(privateHeaders).forEach(([k,v])=>res.headers.set(k,v));return res
}
