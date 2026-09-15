'use client'
import { useEffect, useRef, useState } from 'react'
import { reportHTML, reportExportHTML, yesterdayIST, displayDate, scopeLabel, validateReportView, type ReportData, type ReportView } from '@/lib/marketing-daily-report'
import { reportJPG, printReport, saveReportFile, copyReportHTML } from '@/lib/marketing-report-browser'
type LiveReport=ReportData & {snapshot?:string;emailEnabled?:boolean}
type ExportDialog={kind:'email'|'whatsapp';html:string;view:ReportView;subject:string;name:string;snapshot?:string;emailEnabled:boolean}
export default function MarketingDailyReport(){
 const [date,setDate]=useState(yesterdayIST),[report,setReport]=useState<LiveReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0)
 const [dialog,setDialog]=useState<ExportDialog|null>(null),[to,setTo]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false)
 const frame=useRef<HTMLIFrameElement>(null),actionBusy=useRef(false)
 useEffect(()=>{
  const controller=new AbortController()
  fetch('/api/marketing-daily-report?date='+date,{cache:'no-store',signal:controller.signal}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error||'Report unavailable');return b}).then(b=>{if(!controller.signal.aborted)setReport(b)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
  return()=>controller.abort()
 },[date,retry])
 useEffect(()=>{
  const handler=async(event:MessageEvent)=>{
   if(event.source!==frame.current?.contentWindow)return
   if(event.data?.type==='marketing-report-date'){
    const next=event.data.date;if(typeof next==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(next)&&next<=yesterdayIST()){setLoading(true);setError('');setReport(null);setDate(next);setRetry(n=>n+1);setDialog(null)}
    return
   }
   if(event.data?.type!=='marketing-report-export'||!report||actionBusy.current)return
   actionBusy.current=true;setBusy(true);setNotice('')
   try{
    const view=validateReportView(report,event.data.view),html=reportExportHTML(date,report,view),name='Marketing-Daily-Report-'+date+'-'+view.scope
    const subject=`Marketing Daily Report | ${displayDate(date)} | ${scopeLabel(report,view.scope)}`
    switch(event.data.action){
     case 'print':await printReport(html);break
     case 'jpg':setNotice('Preparing JPG…');saveReportFile(await reportJPG(html),name+'.jpg');setNotice('JPG downloaded');break
     case 'download':saveReportFile(new Blob([html],{type:'text/html'}),name+'.html');setNotice('Report downloaded');break
     case 'email':case 'whatsapp':setDialog({kind:event.data.action,html,view,subject,name,snapshot:report.snapshot,emailEnabled:!!report.emailEnabled});setTo('');setSent(false);break
    }
   }catch(e){setNotice(e instanceof Error?e.message:'Export unavailable')}finally{actionBusy.current=false;setBusy(false)}
  }
  window.addEventListener('message',handler);return()=>window.removeEventListener('message',handler)
 },[date,report])
 useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busy)setDialog(null)};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)},[busy])
 async function send(){
  if(!dialog||!to.trim()||busy||sent)return
  setBusy(true);setNotice('Sending email…')
  try{
   const response=await fetch('/api/marketing-daily-report/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,snapshot:dialog.snapshot,view:dialog.view})})
   const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to send email')
   setSent(true);setNotice('Email submitted successfully to the listed recipients.')
  }catch(e){setNotice(e instanceof Error?e.message:'Delivery could not be confirmed')}finally{setBusy(false)}
 }
 async function image(share=false){
  if(!dialog||busy)return
  setBusy(true);setNotice('Preparing image…')
  try{
   const file=new File([await reportJPG(dialog.html)],dialog.name+'.jpg',{type:'image/jpeg'})
   if(share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:dialog.subject});setNotice('Share sheet opened')}
   else {saveReportFile(file,file.name);setNotice(share?'JPG downloaded. Attach it in WhatsApp.':'JPG downloaded')}
  }catch(e){setNotice(e instanceof Error?e.message:'Image unavailable')}finally{setBusy(false)}
 }
 if(loading)return <div className="p-10 flex flex-col items-center justify-center min-h-[400px]" role="status"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" /><p className="text-gray-600 font-medium">Loading marketing report…</p></div>
 if(error)return <div className="p-8 bg-white rounded-xl shadow-sm border border-red-100 max-w-xl mx-auto mt-8"><h1 className="text-2xl font-semibold text-gray-900 mb-2">Marketing Daily Report</h1><p className="text-red-600 mb-4" role="alert">{error}</p><button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium" onClick={()=>{setLoading(true);setError('');setReport(null);setRetry(n=>n+1)}}>Retry</button></div>
 return <>
  <iframe ref={frame} title="Marketing Daily Report" srcDoc={report?reportHTML(date,report):''} sandbox="allow-scripts" className="block w-full border-0 rounded-xl shadow-sm bg-white" style={{ height: "calc(100vh - 120px)", minHeight: "750px" }}/>
  {notice&&!dialog&&<p role="status" className="fixed bottom-5 right-5 z-50 rounded-lg bg-white p-4 text-sm shadow-lg border border-gray-100">{notice}</p>}
  {dialog&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"><section role="dialog" aria-modal="true" aria-labelledby="export-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
   <header className="flex items-start justify-between gap-4"><div><h2 id="export-title" className="text-xl font-semibold">{dialog.kind==='email'?'Email template':'WhatsApp report'}</h2><p className="mt-1 text-sm text-gray-600">{dialog.subject}</p><p className="mt-1 text-xs text-gray-500">Includes only the source sections you expanded. This preview is the exact export.</p></div><button disabled={busy} onClick={()=>{setDialog(null);setNotice('')}} className="rounded border px-3 py-2">Close</button></header>
   <iframe title="Export preview" srcDoc={dialog.html} sandbox="" className="my-4 min-h-0 w-full flex-1 border" style={{height:'55vh'}}/>
   {dialog.kind==='email'&&<label className="mb-3 text-sm font-medium">To <input type="text" autoComplete="off" placeholder="Enter recipient email addresses, separated by commas" value={to} onChange={e=>setTo(e.target.value)} disabled={busy||sent} className="mt-1 block w-full rounded-lg border p-3"/></label>}
   <div className="flex flex-wrap gap-2">
    {dialog.kind==='email'?<><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={async()=>{try{await copyReportHTML(dialog.html);setNotice('Formatted email copied. Paste into your email composer.')}catch{setNotice('Clipboard unavailable. Download the HTML template and copy it from your browser.')}}}>Copy formatted email</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={()=>saveReportFile(new Blob([dialog.html],{type:'text/html'}),dialog.name+'.html')}>Download email HTML</button><button disabled={!dialog.emailEnabled||!dialog.snapshot||!to.trim()||busy||sent} onClick={send} className="rounded-lg bg-emerald-900 px-5 py-2 text-white disabled:opacity-40">{sent?'Sent':busy?'Please wait…':'Send email'}</button></>:<><button disabled={busy} className="rounded-lg bg-emerald-900 px-4 py-2 text-white" onClick={()=>image(true)}>Share image</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={()=>image()}>Download JPG</button><button disabled={busy} className="rounded-lg border px-4 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(dialog.subject+'\nPlease see the attached marketing report.');setNotice('Caption copied')}catch{setNotice('Clipboard unavailable')}}}>Copy caption</button></>}
   </div>
   {dialog.kind==='email'&&!dialog.emailEnabled&&<p className="mt-2 text-xs text-gray-600">Email sending is unavailable for this account or server. Copy or download the formatted template.</p>}
   <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>
  </section></div>}
 </>
}
