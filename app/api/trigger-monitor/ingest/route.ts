import { NextRequest, NextResponse } from 'next/server'
import { ingestSchema,applyIntake,projectKey } from '@/lib/trigger-monitor/model'
import { monitorTransaction } from '@/lib/trigger-monitor/store'
import { hash,secureEqual,privateHeaders } from '@/lib/trigger-monitor/security'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function POST(req:NextRequest){
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||''
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return NextResponse.json({error:'Unauthorized connector'},{status:401,headers:privateHeaders})
 try{
  const raw=await req.text();if(raw.length>64000)return NextResponse.json({error:'Payload too large'},{status:413})
  const parsed=ingestSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Invalid telemetry'},{status:400})
  const event=parsed.data
  await monitorTransaction(s=>{
   const p=s.projects.find(p=>p.key===projectKey(event.email,event.scriptId))
   if(!p?.connectorHash||!secureEqual(p.connectorHash,hash(token)))throw Error('unauthorized')
   applyIntake(s,p,event)
  })
  return NextResponse.json({accepted:true},{headers:privateHeaders})
 }catch{return NextResponse.json({error:'Connector rejected. Check token, project identity and event timestamps.'},{status:400,headers:privateHeaders})}
}
