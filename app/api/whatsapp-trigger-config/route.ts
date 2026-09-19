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
export const maxDuration = 60

export async function GET(req:NextRequest){
 try {
  if(!authorized(req))return NextResponse.json({error:'Super administrator access required'},{status:403,headers})
  const action=req.nextUrl.searchParams.get('action')
  if(action==='templates'){
   try{return NextResponse.json({templates:await templates(),checkedAt:new Date().toISOString()},{headers})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Template verification unavailable'},{status:503,headers})}
  }
  if(action==='start-worker'||action==='worker'||action==='tick'){
     if(process.env.VERCEL){
       const state=await readState().catch(()=>({version:1 as const,triggers:[],runs:[]}))
       return NextResponse.json({success:true,schedulerReady:workerReady(state),message:'On Vercel, automated dispatch runs via Vercel Cron.'},{headers})
     }
     let rendererOk=false,renderError=''
     try{
       const {renderJPEG}=await import('@/lib/whatsapp-triggers/render')
       await renderJPEG('<!doctype html><html><body style="background:white;padding:24px">WhatsApp renderer health check</body></html>')
       rendererOk=true
     }catch(e){renderError=e instanceof Error?e.message:'Renderer unavailable'}
     await transaction(s=>{s.heartbeat=new Date().toISOString();s.rendererReady=rendererOk}).catch(()=>{})
     const {ensureSchedulerRunning,runSchedulerTick}=await import('@/lib/whatsapp-triggers/scheduler-service')
     ensureSchedulerRunning()
     const tickResult=await runSchedulerTick().catch(()=>({processed:0}))
     const state=await readState()
     if(!rendererOk)return NextResponse.json({error:`Browser renderer failed: ${renderError}. Ensure Edge or Chrome is installed.`,schedulerReady:false},{status:503,headers})
     return NextResponse.json({success:true,processed:tickResult.processed,schedulerReady:workerReady(state)},{headers})
   }
   try{
     const state=await readState();
     if(state.triggers.some(t=>t.status==='Active')&&!process.env.VERCEL){
       const {ensureSchedulerRunning}=await import('@/lib/whatsapp-triggers/scheduler-service')
       ensureSchedulerRunning()
     }
     const enrichedRuns = (state.runs || []).map(r => {
       const trig = state.triggers.find(t => t.id === r.triggerId)
       const templateName = r.templateName || (trig ? reportTemplates[trig.reportId]?.template : undefined) || 'crm_daily_sales_report_image'
       return {
         ...r,
         triggerName: r.triggerName || trig?.name || 'WhatsApp Trigger',
         templateName,
         templateLink: r.templateLink || 'https://wa.redlava.in/ListTemplate',
       }
     })
     return NextResponse.json({
       ...state,
       runs: enrichedRuns,
       providerReady: configured(),
       schedulerReady: workerReady(state)
     }, {headers})
   }catch{return NextResponse.json({error:'Persistent WhatsApp storage unavailable on this server'},{status:503,headers})}
 } catch (err) {
   console.error('[whatsapp-trigger-config] Route error:', err)
   return NextResponse.json({error: err instanceof Error ? err.message : 'Server error in WhatsApp configuration'},{status:500,headers})
 }
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
  });
  if(item.status==='Active'&&!process.env.VERCEL){
   const {ensureSchedulerRunning,runSchedulerTick}=await import('@/lib/whatsapp-triggers/scheduler-service')
   ensureSchedulerRunning()
   setTimeout(()=>{runSchedulerTick().catch(()=>{})},500)
  }
  return NextResponse.json({trigger:item},{headers})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save configuration'},{status:400,headers})}
}
