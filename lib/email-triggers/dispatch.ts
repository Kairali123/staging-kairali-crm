import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import { marketingMailConfig } from '@/lib/marketing-report-email'
import { scopedEmployees } from '@/lib/daily-sales-calling'
import { exportSalesHTML } from '@/lib/daily-sales-report'
import { reportExportHTML } from '@/lib/marketing-daily-report'
import { loadScheduledSales } from './load-sales'
import { loadScheduledMarketing } from './load-marketing'
import { localDay, nextRun } from './schedule'
import { transaction } from './store'
import type { Trigger, Run } from './schema'
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export async function buildEmail(t:Trigger,at:number){
 let date=localDay(at,'Asia/Kolkata');if(t.period==='Yesterday')date=new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);if(t.period==='Selected date')date=t.previewDate!
 const replace=(s:string)=>s.replaceAll('{{report_date}}',date).replaceAll('{{company_name}}',t.company).replaceAll('{{recipient_name}}','Team')
 let html='',hasData=true,attachments:any[]|undefined
 if(t.bodyType==='Full report in email body'){
  if(t.reportId==='daily-sales-report'){const report=await loadScheduledSales(date);const scope=t.company==='All companies'?'ALL':t.company==='VILARAAG'?'VILLARAAG':t.company;hasData=report.rows.some(r=>scope==='ALL'||r.company===scope)||scopedEmployees(report.calling,scope).length>0;html=exportSalesHTML(report,scope)}
  else if(t.reportId==='sales-call-audit'){const {buildSalesCallAuditReport}=await import('@/lib/sales-call-audit-report');const {renderAuditReportEmail}=await import('@/lib/sales-call-audit-email-render');const {data}=await buildSalesCallAuditReport(date);hasData=data.employees.length>0;const rendered=renderAuditReportEmail({date:data.auditDate,displayDate:data.displayDate,metrics:data.metrics,employees:data.employees});html=rendered.html}
  else{const report=await loadScheduledMarketing(date);const scope=t.company==='All companies'?'all':t.company,selected=report.companies.filter(c=>scope==='all'||c.name===scope);hasData=selected.some(c=>c.totalLeads||c.totalSpend||c.sale);html=reportExportHTML(date,report,{scope,expanded:t.reportDetail==='Include source-wise details'?selected.flatMap(c=>[c.name+'-leads',c.name+'-sales']):[]})}
  const p=(s:string)=>(s||'').trim()?'<div style="padding:18px 24px;white-space:pre-wrap;font:14px/1.8 Arial">'+esc(replace(s))+'</div>':''
  // Reports with in-layout markers keep the note inside their centered column; others get it around <body>.
  html=html.includes('<!--email-intro-->')?html.replace('<!--email-intro-->',()=>p(t.intro)).replace('<!--email-closing-->',()=>p(t.closing)):html.replace(/(<body[^>]*>)/,'$1'+p(t.intro)).replace('</body>',p(t.closing)+'</body>')
  if(t.reportId!=='sales-call-audit'){
   try{
    const {renderJPEG}=await import('@/lib/whatsapp-triggers/render')
    if(typeof renderJPEG==='function'){
     const image=await renderJPEG(html)
     if(image&&image.length>0){
      attachments=[{filename:`Daily-Report-${date}.jpg`,content:image,cid:'report-image'}]
      html=`<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:16px;background:#f4f6fc;font-family:Arial,sans-serif;"><div style="max-width:1344px;margin:0 auto;text-align:center;"><img src="cid:report-image" alt="Daily Report" style="width:100%;max-width:1344px;height:auto;display:block;margin:0 auto;border-radius:12px;box-shadow:0 4px 24px rgba(30,48,91,0.08);" /></div></body></html>`
     }
    }
   }catch(err){console.warn('[email-trigger] renderJPEG fallback to HTML:',err)}
  }
 }else html='<div style="white-space:pre-wrap;font:14px/1.8 Arial">'+esc(t.bodyType==='Static'?t.body:replace(t.body))+'</div>'
 return {subject:replace(t.subject),html,hasData,...(attachments?{attachments}:{})}
}
export type DispatchDeps={build:typeof buildEmail;send:(t:Trigger,email:{subject:string;html:string;attachments?:any[]})=>Promise<{accepted:number;rejected:number}>}
const deps:DispatchDeps={build:buildEmail,send:async(t,email)=>{
 const c=marketingMailConfig();if(!c.configured)throw Error('SMTP unavailable')
 const transport=nodemailer.createTransport({host:c.host,port:c.port,secure:c.port===465,auth:{user:c.user!,pass:c.pass!},connectionTimeout:15000,socketTimeout:30000,disableFileAccess:true,disableUrlAccess:true})
 try{const result=await transport.sendMail({from:c.user,to:t.to,cc:t.cc||undefined,bcc:t.bcc||undefined,replyTo:t.replyTo||undefined,...email,text:email.subject+'\nPlease view the formatted HTML email.',disableFileAccess:true,disableUrlAccess:true});return {accepted:result.accepted?.length||0,rejected:result.rejected?.length||0}}finally{transport.close()}
}}
/** Reserve before send, never retry an uncertain SMTP result automatically. */
export async function dispatchDue(now=Date.now(),io=deps){
 const claims=await transaction(s=>{
  s.heartbeat=new Date(now).toISOString()
  for(const run of s.runs.filter(r=>['Preparing','Sending'].includes(r.status)&&now-Date.parse(r.startedAt)>10*60000)){
   run.status='Unknown';run.detail='Worker interrupted. Verify mailbox before resuming.';run.finishedAt=new Date(now).toISOString();const t=s.triggers.find(t=>t.id===run.triggerId);if(t){t.status='Paused';t.lastResult='Unknown';t.nextRun=null}
  }
  return s.triggers.filter(t=>t.status==='Active'&&t.nextRun&&Date.parse(t.nextRun)<=now).slice(0,5).flatMap(t=>{
   const due=t.nextRun!,id=t.id+':'+due
   if(s.runs.some(r=>r.id===id)){t.nextRun=nextRun(t,now);return []}
   const run:Run={id,triggerId:t.id,name:t.name,scheduledAt:due,startedAt:new Date(now).toISOString(),status:'Preparing',detail:'Preparing fresh report',recipientCount:[t.to,t.cc,t.bcc].flatMap(s=>s.split(',').filter(x=>x.trim())).length}
   s.runs.push(run);t.nextRun=nextRun(t,now);if(now-Date.parse(due)>15*60000){run.status='Skipped';run.finishedAt=new Date(now).toISOString();run.detail='Missed scheduled run (more than 15 minutes late)';t.lastResult='Skipped';return []}return [{trigger:{...t},run}]
  })
 })
 for(const {trigger:t,run} of claims){
  let status:Run['status']='Failed',detail='Report generation failed. No email sent.',sending=false
  try{
   const email=await io.build(t,Date.parse(run.scheduledAt))
   if(!email.hasData&&t.condition==='Only when data is available'){status='Skipped';detail='No data for the selected report'}
   else{
    const allowed=await transaction(s=>{const current=s.triggers.find(x=>x.id===t.id),r=s.runs.find(x=>x.id===run.id)!;if(!current||current.status!=='Active'||current.revision!==t.revision){r.status='Skipped';return false}r.status='Sending';r.detail='Handing message to provider';return true})
    if(!allowed){status='Skipped';detail='Configuration changed or paused before delivery'}
    else{sending=true;const result=await io.send(t,email);status=result.rejected?'Partial':result.accepted?'Accepted':'Failed';detail=result.rejected?'Some recipients rejected; inspect mailbox before retrying':result.accepted?'Accepted by email provider (not delivery confirmation)':'Provider accepted no recipients'}
   }
  }catch(err:any){if(sending){status='Unknown';detail='Delivery outcome uncertain. Verify mailbox before resuming.'}else{console.error('[email-trigger dispatch error]', err);detail=err?.message?`Report generation failed: ${err.message}. No email sent.`:'Report generation failed. No email sent.'}}
  await transaction(s=>{const r=s.runs.find(x=>x.id===run.id)!;Object.assign(r,{status,detail,finishedAt:new Date().toISOString()});const current=s.triggers.find(x=>x.id===t.id);if(current){current.lastResult=status;if(['Unknown','Partial'].includes(status)){current.status='Paused';current.nextRun=null}}})
 }
 return {processed:claims.length,workerId:randomUUID()}
}
