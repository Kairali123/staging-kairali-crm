import { NextRequest,NextResponse } from 'next/server'
import { administrator,privateHeaders,appOrigin } from '@/lib/trigger-monitor/security'
import { readMonitor } from '@/lib/trigger-monitor/store'
import { renderTriggerDigest } from '@/lib/trigger-monitor/email'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:NextRequest){
 if(!administrator(req))return NextResponse.json({error:'Administrator access required'},{status:403})
 try{return new NextResponse(renderTriggerDigest(await readMonitor(),appOrigin()).html,{headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'"}})}
 catch{return NextResponse.json({error:'Digest unavailable. Check monitoring storage and application URL.'},{status:503})}
}
