import {randomUUID} from 'node:crypto'
import {transaction} from './store'
import {nextDailyRun,reportDate} from './schedule'
import {reportTemplates, type Config} from './schema'
type IO={build:(config:Config,date:string)=>Promise<{company:string;image:Buffer}[]>;send:(config:Config,to:string,date:string,image:Buffer,company?:string)=>Promise<string>}
export async function dispatchDue(now=Date.now(),io:IO){
 // Reservations are durable before any report preparation or provider request.
 const jobs=await transaction(s=>{
  for(const run of s.runs.filter(r=>r.scheduledAt&&['Preparing','Sending'].includes(r.status)&&now-Date.parse(r.startedAt)>15*60000)){
   run.status='Unknown';run.detail='Interrupted run: reconcile in Redlava before reactivation'
   const c=s.triggers.find(t=>t.id===run.triggerId);if(c){c.status='Paused';c.nextRun=null;c.revision++}
  }
  const jobs:{config:Config;runId:string;date:string}[]=[]
  for(const c of s.triggers.filter(t=>t.status==='Active'&&t.nextRun&&Date.parse(t.nextRun)<=now)){
   const scheduledAt=c.nextRun!,slot=Date.parse(scheduledAt);c.nextRun=nextDailyRun(c,now)
   if(s.runs.some(r=>r.triggerId===c.id&&r.scheduledAt===scheduledAt))continue
   // Allow up to 30 minutes of grace period for daily reports so 15-min cron ticks don't drop the run
   const missed=now-slot>30*60000,id=randomUUID()
   const templateName=reportTemplates[c.reportId]?.template||'crm_daily_sales_report_image'
   s.runs.push({id,triggerId:c.id,triggerName:c.name,scheduledAt,startedAt:new Date(now).toISOString(),status:missed?'Skipped':'Preparing',detail:missed?'Missed run skipped (>2 hours late)':'Preparing report image',templateName,templateLink:'https://wa.redlava.in/ListTemplate',recipients:c.recipients.map(to=>({to,status:'Pending'}))})
   if(!missed)jobs.push({config:{...c},runId:id,date:reportDate(slot,(c.period as 'Today'|'Yesterday')||'Today')})
  }
  return jobs
 })
 for(const job of jobs){
  let images:{company:string;image:Buffer}[]
  try{images=await io.build(job.config,job.date)}catch(err:any){
   if(err?.name==='IncompleteReportError'){
    await transaction(s=>{
     const r=s.runs.find(r=>r.id===job.runId)
     if(r){r.status='Preparing';r.detail=err.message}
     const c=s.triggers.find(t=>t.id===job.config.id)
     if(c){c.nextRun=new Date(now+5*60000).toISOString()}
    })
    continue
   }
   await transaction(s=>{const r=s.runs.find(r=>r.id===job.runId)!;r.status='Failed';r.detail='Report image preparation failed; no message sent'});continue
  }
  for(const to of job.config.recipients){
   const allowed=await transaction(s=>{
    const c=s.triggers.find(t=>t.id===job.config.id),r=s.runs.find(r=>r.id===job.runId)!,recipient=r.recipients!.find(x=>x.to===to)!
    if(!c||c.status!=='Active'||c.revision!==job.config.revision||!c.consent||!c.recipients.includes(to)||r.status==='Unknown'){recipient.status='Skipped';return false}
    recipient.status='Sending';r.status='Sending';return true
   })
   if(!allowed)continue
   try{
    const messageIds:string[]=[]
    for(const {company,image} of images)messageIds.push(await io.send(job.config,to,job.date,image,company))
    await transaction(s=>{const recipient=s.runs.find(r=>r.id===job.runId)!.recipients!.find(r=>r.to===to)!;recipient.status='Accepted';recipient.messageId=messageIds.join(',')})
   }catch{
    await transaction(s=>{const run=s.runs.find(r=>r.id===job.runId)!;run.recipients!.find(r=>r.to===to)!.status='Unknown';run.status='Unknown';run.detail='Acceptance uncertain; no retries. Check Redlava.';const c=s.triggers.find(t=>t.id===job.config.id);if(c){c.status='Paused';c.nextRun=null;c.revision++}})
    break
   }
  }
  await transaction(s=>{
   const run=s.runs.find(r=>r.id===job.runId)!
   for(const recipient of run.recipients!)if(recipient.status==='Pending')recipient.status='Skipped'
   if(run.status==='Unknown')return
   const accepted=run.recipients!.filter(r=>r.status==='Accepted').length
   run.status=accepted===run.recipients!.length?'Accepted':accepted?'Partial':'Skipped'
   run.detail=`${accepted}/${run.recipients!.length} accepted by Redlava; delivery requires provider confirmation`
  })
 }
 return {processed:jobs.length}
}
