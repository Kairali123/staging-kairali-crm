import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {authorized,responseHeaders as headers} from '@/lib/whatsapp-triggers/auth'
import {configSchema} from '@/lib/whatsapp-triggers/schema'
import {readState,transaction} from '@/lib/whatsapp-triggers/store'
import {configured,templates} from '@/lib/whatsapp-triggers/provider'
import {reportTemplates} from '@/lib/whatsapp-triggers/schema'
import {workerReady,nextDailyRun} from '@/lib/whatsapp-triggers/schedule'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Super administrator access required'},{status:403,headers})
 try{const state=await readState();return NextResponse.json({...state,providerReady:configured(),schedulerReady:workerReady(state)},{headers})}catch{return NextResponse.json({error:'Persistent WhatsApp storage unavailable on this server'},{status:503,headers})}
}
export async function POST(req:NextRequest){
 const user=authorized(req);if(!user||req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Access denied'},{status:403,headers})
 try{
  const text=await req.text();if(text.length>16000)return NextResponse.json({error:'Configuration too large'},{status:413,headers})
  const parsed=configSchema.safeParse(JSON.parse(text));if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(x=>x.message).join('; ')},{status:400,headers})
  if(parsed.data.status==='Active'){
   if(!configured()||!workerReady(await readState()))throw Error('Redlava API and a healthy image worker are required before activation')
   const name=reportTemplates[parsed.data.reportId].template
   if(!(await templates()).some(t=>t.name===name&&t.compatible))throw Error('An approved compatible image template is required before activation')
  }
  const item=await transaction(state=>{
   const input=parsed.data,previous=state.triggers.find(t=>t.id===input.id)
   if(input.id&&(!previous||input.revision!==previous.revision))throw Error('Configuration changed. Reload before saving.')
   if(!previous&&state.triggers.length>=100)throw Error('Maximum 100 configurations')
   if(input.status==='Active'&&!workerReady(state))throw Error('Worker heartbeat expired; refresh before activation')
   const saved={...input,nextRun:input.status==='Active'?nextDailyRun(input):null,id:previous?.id||randomUUID(),revision:(previous?.revision||0)+1,owner:String(user.id),updatedAt:new Date().toISOString()}
   state.triggers=previous?state.triggers.map(t=>t.id===saved.id?saved:t):[...state.triggers,saved];return saved
  });return NextResponse.json({trigger:item},{headers})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save configuration'},{status:400,headers})}
}
