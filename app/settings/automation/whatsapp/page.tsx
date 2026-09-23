'use client'
import {useEffect,useRef,useState} from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {useRouter} from 'next/navigation'
import {MessageSquare,ShieldCheck,ImageIcon,Clock,RefreshCw,ExternalLink,Save,Plus} from 'lucide-react'
import {DashboardLayout} from '@/components/dashboard-layout'
import {useAuth} from '@/hooks/use-auth'
import {reportTemplates,type ConfigInput,type Config,type Template} from '@/lib/whatsapp-triggers/schema'
import type {Run} from '@/lib/whatsapp-triggers/store'
import {exportSalesHTML,type DailySalesReport} from '@/lib/daily-sales-report'
import {reportExportHTML,yesterdayIST,type ReportData} from '@/lib/marketing-daily-report'
import {reportJPG,saveReportFile} from '@/lib/marketing-report-browser'

const field='mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600'
const button='inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-40'
function initial(reportId:ConfigInput['reportId']='daily-sales-report'):ConfigInput{return {name:reportTemplates[reportId].title,reportId,company:'ALL',recipients:[],consent:false,status:'Draft',time:'09:00',timezone:'Asia/Kolkata',period:'Today',start:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),details:true}}
async function json(url:string,options?:RequestInit){
 const r=await fetch(url,{cache:'no-store',...options})
 const contentType=r.headers?.get?.('content-type')||''
 let data: any=null
 if(!contentType||contentType.includes('application/json')){
  try{data=await r.json()}catch{}
 }
 if(!r.ok){
  if(data?.error)throw Error(data.error)
  if(r.status===504)throw Error('Server timeout (HTTP 504): The report query timed out. Please retry.')
  if(r.status===502||r.status===503)throw Error(`Server unavailable (HTTP ${r.status}). Please retry shortly.`)
  if(r.status===500)throw Error('Server error (HTTP 500). Please check application logs.')
  if(r.status===401||r.status===403)throw Error('Session expired or access denied. Please re-login.')
  throw Error(`Request failed (HTTP ${r.status})`)
 }
 if(data===null){
  throw Error('Server returned an unexpected non-JSON response.')
 }
 return data
}
export default function WhatsAppTriggers(){
 const {user,isLoading}=useAuth(),router=useRouter()
 const admin=['super_admin','super admin'].includes(String(user?.role||'').trim().toLowerCase())
 const [config,setConfig]=useState<ConfigInput>(()=>initial()),[items,setItems]=useState<Config[]>([]),[recipientText,setRecipientText]=useState('')
 const [runs,setRuns]=useState<Run[]>([])
 const [activeTab,setActiveTab]=useState<'All'|'Active'|'Paused'|'Drafts'|'History'>('All')
 const [templates,setTemplates]=useState<Template[]>([]),[providerReady,setProviderReady]=useState(false),[schedulerReady,setSchedulerReady]=useState(false),[checkedAt,setCheckedAt]=useState('')
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[dirty,setDirty]=useState(true)
 const [preview,setPreview]=useState<{url:string;blob:Blob;date:string}|null>(null),[testTo,setTestTo]=useState(''),[confirmTest,setConfirmTest]=useState(false)
 const imageUrl=useRef(''),generation=useRef(0),sending=useRef(false),requestId=useRef('')
 useEffect(()=>{if(!isLoading&&!admin)router.replace('/access-denied')},[isLoading,admin,router])
 useEffect(()=>{
  if(!admin)return;
  let active=true;
  json('/api/whatsapp-trigger-config').then(async s=>{
   if(active){
    setItems(s.triggers||[]);
    setRuns(s.runs||[]);
    setProviderReady(Boolean(s.providerReady));
    setSchedulerReady(Boolean(s.schedulerReady));
    if(s.triggers?.[0]){
     setConfig(s.triggers[0]);
     setRecipientText(s.triggers[0].recipients.join(', '));
     setDirty(false);
    }
    setLoaded(true);
   }
  }).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false}
 },[admin])
 useEffect(()=>()=>{if(imageUrl.current)URL.revokeObjectURL(imageUrl.current)},[])
 function clearImage(){generation.current++;if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);imageUrl.current='';setPreview(null);setConfirmTest(false);requestId.current=''}
 function edit<K extends keyof ConfigInput>(key:K,value:ConfigInput[K]){clearImage();setConfig(c=>({...c,[key]:value}));setDirty(true);setNotice('')}
 function choose(c:ConfigInput){clearImage();setConfig(c);setRecipientText(c.recipients.join(', '));setDirty(!c.id);setTestTo('');setNotice('');setError('')}
 async function startWorker(){
  setBusy(true);setError('');
  try{
   const res=await json('/api/whatsapp-trigger-config?action=start-worker');
   if(res?.schedulerReady){
    setSchedulerReady(true);
    setNotice(res.message || 'Background worker connected and scheduler ready.');
   } else {
    setNotice(res?.message || 'Worker not running. Automated sends require a background worker or Vercel Cron.');
   }
  }catch(err){
   setError(err instanceof Error ? err.message : 'Could not connect background worker.');
  }finally{setBusy(false)}
 }
 async function refresh(){
  setBusy(true);setError('');
  try{
   let state=await json('/api/whatsapp-trigger-config');
   setSchedulerReady(Boolean(state.schedulerReady));
   setProviderReady(Boolean(state.providerReady));
   setItems(state.triggers||[]);
   setRuns(state.runs||[]);
   const s=await json('/api/whatsapp-trigger-config/templates').catch(()=>json('/api/whatsapp-trigger-config?action=templates'));
   setTemplates(s.templates||[]);
   setCheckedAt(s.checkedAt||'');
   setNotice('Trigger configuration and send history refreshed');
  }catch(e){
   setTemplates([]);
   setCheckedAt('');
   setError(e instanceof Error?e.message:'Could not verify templates');
  }finally{setBusy(false)}
 }
 async function save(){setBusy(true);setError('');try{const payload={id:config.id,revision:config.revision,name:config.name,reportId:config.reportId,company:config.company,recipients:recipientText.split(/[,\n]/).map(x=>x.trim()).filter(Boolean),consent:config.consent,status:config.status,time:config.time,timezone:config.timezone,period:config.period,start:config.start,details:config.details};const {trigger}=await json('/api/whatsapp-trigger-config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});setItems(list=>[...list.filter(t=>t.id!==trigger.id),trigger]);setConfig(trigger);setDirty(false);setNotice(trigger.status==='Active'?'Active: daily report delivery is scheduled.':'Configuration saved. Automatic sending remains off.')}catch(e){setError(e instanceof Error?e.message:'Save failed')}finally{setBusy(false)}}
 async function render(){setBusy(true);setError('');clearImage();const version=generation.current;try{
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date())
  const date=config.period==='Yesterday'?yesterdayIST():today
  const sales=config.reportId==='daily-sales-report',data=await json((sales?'/api/daily-sales-report-alert':'/api/marketing-daily-report')+'?date='+date)
  const scope=config.company==='ALL'?'all':config.company==='VILLARAAG'?'VILARAAG':config.company
  const report=data as ReportData
  const expanded=!sales&&config.details?report.companies.filter(c=>scope==='all'||c.name===scope).flatMap(c=>[c.name+'-leads',c.name+'-sales']):[]
  const html=sales?exportSalesHTML(data as DailySalesReport,config.company):reportExportHTML(date,report,{scope,expanded})
  const blob=await reportJPG(html);if(blob.size>4*1024*1024)throw Error('Report image exceeds 4 MB. Choose one company or fewer details.')
  if(version!==generation.current)return
  const url=URL.createObjectURL(blob);imageUrl.current=url;setPreview({url,blob,date});setNotice('Image generated from the current report data. Review it before a test send.')
 }catch(e){setError(e instanceof Error?e.message:'Report image unavailable')}finally{setBusy(false)}}
 async function test(){if(!preview||sending.current)return;sending.current=true;setBusy(true);setError('');try{
  requestId.current ||= crypto.randomUUID()
  const image=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('Image could not be read'));r.readAsDataURL(preview.blob)})
  const result=await json('/api/whatsapp-trigger-config/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:config.id,revision:config.revision,requestId:requestId.current,to:testTo,date:preview.date,image})})
  setNotice(result.message);setConfirmTest(false);
  json('/api/whatsapp-trigger-config').then(s=>{if(s?.runs)setRuns(s.runs)}).catch(()=>{})
 }catch(e){setError(e instanceof Error?e.message:'Check Redlava before retrying')}finally{sending.current=false;setBusy(false)}}
 const mapped=reportTemplates[config.reportId],template=templates.find(t=>t.name===mapped.template&&t.language==='en'),ready=!!template?.compatible
 const filteredItems=items.filter(c=>{
  if(activeTab==='All'||activeTab==='History')return true
  if(activeTab==='Active')return c.status==='Active'
  if(activeTab==='Paused')return c.status==='Paused'
  if(activeTab==='Drafts')return c.status==='Draft'
  return true
 })
 if(!admin)return null
 return <DashboardLayout><main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-7">
  <div className="mx-auto max-w-[1440px] space-y-6">
   <header className="flex flex-wrap items-start justify-between gap-4">
    <div>
     <div className="mb-2 text-xs font-medium uppercase tracking-widest text-slate-500"><Link href="/settings/automation">Settings / Automation</Link> / WhatsApp</div>
     <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><span className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><MessageSquare size={26}/></span>WhatsApp Triggers</h1>
     <p className="mt-2 text-sm text-slate-500">Schedule your daily reports as images using Meta-approved templates.</p>
    </div>
    <a className={button+' bg-white'} href="https://wa.redlava.in/ListTemplate" target="_blank" rel="noreferrer">Open Redlava <ExternalLink size={15}/></a>
   </header>
   <div className="grid gap-4 md:grid-cols-3">
    {[
     [MessageSquare,'Redlava connection',providerReady?'API key configured · verify templates':'API key required',undefined],
     [ShieldCheck,'Meta approval',checkedAt?`${templates.filter(t=>t.compatible).length} compatible report templates`:'Not verified from this server',undefined],
     [Clock,'Report scheduler',schedulerReady?'Scheduler ready · runs automatically':'Offline · worker or Vercel Cron needed',!schedulerReady?startWorker:undefined]
    ].map(([Icon,title,value,onClick])=>{
     const I=Icon as typeof Clock;
     return <div key={String(title)} onClick={onClick as any} className={`flex items-center gap-4 rounded-xl border bg-white p-5 ${onClick?'cursor-pointer hover:bg-emerald-50/50 transition-colors':''}`} title={onClick?'Click to connect worker':undefined}>
      <I className="text-emerald-700 shrink-0" size={23}/>
      <div>
       <p className="text-xs text-slate-500">{String(title)}</p>
       <p className="mt-1 text-sm font-semibold">{String(value)}</p>
      </div>
     </div>
    })}
   </div>
   {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
   {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</div>}

   <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pt-2">
    <div className="flex gap-2 sm:gap-6">
     {(['All','Active','Paused','Drafts','History'] as const).map(tab=>{
      const label=tab==='All'?'All triggers':tab==='History'?'Run history':tab
      const isSelected=activeTab===tab
      const count=tab==='All'?items.length:tab==='History'?runs.length:items.filter(t=>t.status===(tab==='Drafts'?'Draft':tab)).length
      return (
       <button
        key={tab}
        type="button"
        onClick={()=>setActiveTab(tab)}
        className={`relative pb-3 pt-2 text-sm font-medium transition-colors ${isSelected?'text-emerald-700 font-semibold':'text-slate-500 hover:text-slate-800'}`}
       >
        <span className="flex items-center gap-1.5">
         {label}
         <span className={`rounded-full px-2 py-0.5 text-xs ${isSelected?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}`}>
          {count}
         </span>
        </span>
        {isSelected&&<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"/>}
       </button>
      )
     })}
    </div>
    <span className="text-xs text-slate-500 pb-2">Timezone: Asia/Kolkata ↗</span>
   </div>

   {activeTab==='History' ? (
    <section className="rounded-xl border bg-white p-5 md:p-6 shadow-sm">
     <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
       <h2 className="text-lg font-semibold text-slate-900">Send history</h2>
       <p className="mt-1 text-xs text-slate-500">Accepted means accepted by the WhatsApp provider (Redlava); Unknown / Partial runs pause the trigger to avoid duplicate delivery.</p>
      </div>
      <button type="button" disabled={busy} onClick={refresh} className={button+' bg-white text-xs py-1.5 px-3'}>
       <RefreshCw size={13} className={busy?'animate-spin':''}/> Refresh history
      </button>
     </div>
     <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm">
       <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <tr>
         <th className="px-5 py-3">Trigger</th>
         <th className="px-5 py-3">Scheduled</th>
         <th className="px-5 py-3">Result</th>
         <th className="px-5 py-3">Details</th>
         <th className="px-5 py-3 text-right">Template</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-100">
        {runs.length===0 ? (
         <tr>
          <td colSpan={5} className="p-8 text-center text-xs text-slate-500">
           No scheduled or test sends recorded yet. Activate a trigger or send a test above to view history here.
          </td>
         </tr>
        ) : (
         runs.slice().reverse().map((run)=>{
          const trigger=items.find(t=>t.id===run.triggerId)
          const name=run.triggerName||trigger?.name||'WhatsApp Trigger'
          const templateName=run.templateName||(trigger?reportTemplates[trigger.reportId]?.template:undefined)||'crm_daily_sales_report_image'
          const templateLink=run.templateLink||'https://wa.redlava.in/ListTemplate'
          const scheduledTime=run.scheduledAt||run.startedAt
          const resultClass=
           run.status==='Accepted'
            ?'bg-emerald-50 text-emerald-700 border-emerald-200'
            :run.status==='Failed'
            ?'bg-red-50 text-red-700 border-red-200'
            :run.status==='Sending'||run.status==='Preparing'
            ?'bg-blue-50 text-blue-700 border-blue-200'
            :run.status==='Partial'
            ?'bg-amber-50 text-amber-700 border-amber-200'
            :'bg-slate-100 text-slate-700 border-slate-200'

          return (
           <tr key={run.id} className="hover:bg-slate-50/70 transition-colors">
            <td className="px-5 py-4 font-medium text-slate-900">
             <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-700">
               <MessageSquare size={14}/>
              </span>
              <div>
               <span className="block font-medium">{name}</span>
               <span className="text-[11px] font-normal text-slate-400">
                {trigger?.reportId==='marketing-daily-report'?'Marketing Daily Report':'Daily Sales Report'}
               </span>
              </div>
             </div>
            </td>
            <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600">
             {scheduledTime ? new Date(scheduledTime).toLocaleString('en-IN',{
              day:'2-digit',
              month:'2-digit',
              year:'numeric',
              hour:'2-digit',
              minute:'2-digit',
              second:'2-digit',
              hour12:false
             }) : '—'}
            </td>
            <td className="px-5 py-4 whitespace-nowrap">
             <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${resultClass}`}>
              {run.status==='Accepted'&&'● '}
              {run.status}
             </span>
            </td>
            <td className="px-5 py-4 text-xs text-slate-600 max-w-xs truncate" title={run.detail||''}>
             {run.detail||(run.status==='Accepted'?'Accepted by Redlava (not delivery confirmation)':'—')}
            </td>
            <td className="px-5 py-4 whitespace-nowrap text-right">
             <a
              href={templateLink}
              target="_blank"
              rel="noreferrer"
              title={`Open template ${templateName} in Redlava`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-mono font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-300"
             >
              <span>{templateName}</span>
              <ExternalLink size={12} className="text-slate-400"/>
             </a>
            </td>
           </tr>
          )
         })
        )}
       </tbody>
      </table>
     </div>
    </section>
   ) : (
    <div className="grid items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)_340px]">
     <aside className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
       <h2 className="font-semibold">Report triggers</h2>
       <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{filteredItems.length}</span>
      </div>
      <div className="space-y-2">
       {filteredItems.map(c=><button key={c.id} disabled={busy} onClick={()=>choose(c)} className={'w-full rounded-lg border p-3 text-left text-sm '+(c.id===config.id?'border-emerald-600 bg-emerald-50':'border-slate-100')}><span className="block font-medium">{c.name}</span><span className="mt-1 block text-xs text-slate-500">{c.status} · {c.time} IST</span></button>)}
      </div>
      <p className="my-4 text-xs text-slate-500">{loaded&&!filteredItems.length?'No triggers match this filter.':'Create a report configuration'}</p>
      {Object.entries(reportTemplates).map(([id,r])=><button key={id} disabled={busy} onClick={()=>choose(initial(id as ConfigInput['reportId']))} className={button+' mb-2 w-full justify-start border-dashed bg-white text-left'}><Plus size={15}/>{r.title}</button>)}
     </aside>
     <section className="rounded-xl border bg-white p-5 md:p-6">
      <div className="mb-6 flex justify-between">
       <div>
        <h2 className="text-lg font-semibold">Trigger configuration</h2>
        <p className="mt-1 text-xs text-slate-500">{dirty?'Unsaved changes':'Saved configuration'}</p>
       </div>
       <span className="h-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">{config.status}</span>
      </div>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
       <label className="block text-sm font-medium">Trigger name<input className={field} value={config.name} maxLength={120} onChange={e=>edit('name',e.target.value)}/></label>
       <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Report source<select className={field} value={config.reportId} onChange={e=>edit('reportId',e.target.value as ConfigInput['reportId'])}>{Object.entries(reportTemplates).map(([id,r])=><option key={id} value={id}>{r.title}</option>)}</select></label>
        <label className="text-sm font-medium">Company<select className={field} value={config.company} onChange={e=>edit('company',e.target.value as ConfigInput['company'])}><option value="ALL">All companies</option><option>KTAHV</option><option value="VILLARAAG">VILARAAG</option><option>KAPPL</option></select></label>
       </div>
       <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17}/>Meta template mapping</div>
        <code className="break-all text-xs">{mapped.template}</code>
        <p className="mt-2 text-xs text-slate-600">English · Image header · {'{{1}}'} Report date · {'{{2}}'} Company</p>
        <p className="mt-2 text-xs font-medium">{template?`${template.status} · ${template.header} header${ready?' · Compatible':' · Sending blocked'}`:'Awaiting provider verification'}</p>
        <button type="button" onClick={refresh} className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800"><RefreshCw size={13}/>Refresh template status</button>
        {checkedAt&&<p className="mt-2 text-xs text-slate-500">Checked {new Date(checkedAt).toLocaleString()}</p>}
       </div>
       <label className="block text-sm font-medium">WhatsApp recipients<textarea className={field} rows={3} placeholder="+919876543210, +919876543211" value={recipientText} onChange={e=>{setRecipientText(e.target.value);setDirty(true);setConfirmTest(false)}}/><span className="mt-1 block text-xs font-normal text-slate-500">International format. Separate numbers with commas or new lines. Maximum 50.</span></label>
       <label className="flex items-start gap-2 text-sm text-slate-600"><input className="mt-1 accent-emerald-700" type="checkbox" checked={config.consent} onChange={e=>edit('consent',e.target.checked)}/>These recipients have opted in to receive this internal report on WhatsApp.</label>
        <div className="border-t pt-5">
         <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Clock size={17}/>Daily schedule</h3>
         <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Send time (IST)<input type="time" className={field} value={config.time} onChange={e=>edit('time',e.target.value)}/></label>
          <label className="text-sm font-medium">Start date<input type="date" className={field} value={config.start} onChange={e=>edit('start',e.target.value)}/></label>
          <label className="text-sm font-medium">Report period<select className={field} value={config.period||'Today'} onChange={e=>edit('period',e.target.value as 'Today'|'Yesterday')}><option value="Today">Today (Current day)</option><option value="Yesterday">Yesterday (Previous day)</option></select></label>
         </div>
         <p className="mt-3 text-xs text-slate-500">Asia/Kolkata · {config.period==='Yesterday'?'Previous completed day':'Current day (Today)'} · JPEG attachment</p>
         {config.reportId==='marketing-daily-report'&&<label className="mt-3 flex gap-2 text-sm"><input type="checkbox" checked={config.details} onChange={e=>edit('details',e.target.checked)}/>Include source-wise details</label>}
        </div>
        <label className="block text-sm font-medium">Configuration status<select className={field} value={config.status} onChange={e=>edit('status',e.target.value as ConfigInput['status'])}><option>Draft</option><option disabled={!schedulerReady||!ready||!providerReady||!config.consent}>Active</option><option>Paused</option></select></label>
       </fieldset>
       <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{config.status==='Active'?`Active triggers send ${config.period==='Yesterday'?'the previous day’s report':'today’s daily report'} at the selected time while the worker is running. Missed runs are skipped; uncertain sends pause the trigger.`:'Draft and Paused configurations do not send automatically. Activation requires opted-in recipients, an approved image template, Redlava API access and a healthy worker.'}</div>
      <div className="mt-5 flex flex-wrap gap-3">
       <button disabled={busy||!loaded} onClick={save} className={button+' border-emerald-800 bg-emerald-800 text-white'}><Save size={16}/>{busy?'Please wait…':'Save configuration'}</button>
       <button disabled={busy} onClick={render} className={button+' bg-white'}><ImageIcon size={16}/>Generate report image</button>
      </div>
     </section>
     <aside className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-white">
       <h2 className="border-b px-5 py-4 font-semibold">WhatsApp preview</h2>
       <div className="bg-[#eae5dd] p-4">
        <div className="rounded-lg bg-white p-2.5 shadow-sm">
         {preview?<Image unoptimized src={preview.url} width={1400} height={1000} alt={`${mapped.title} for ${preview.date}`} className="h-auto max-h-96 w-full rounded object-contain"/>:<div className="flex h-44 flex-col items-center justify-center gap-3 rounded bg-slate-100 px-5 text-center text-xs text-slate-500"><ImageIcon size={30}/><span>Generate an image to preview the actual report.</span></div>}
         <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{template?.body||`Dear Team,\nYour requested ${config.reportId==='daily-sales-report'?'Daily Sales Report':'Marketing Daily Report'} for {{1}} covering {{2}} is attached as an image.\nThis is your scheduled internal report notification.\nKairali Group`}</p>
         <p className="mt-3 text-[10px] text-slate-400">Internal report • Kairali Group</p>
        </div>
       </div>
       <p className="p-4 text-xs text-slate-500">{ready?'Approved template text shown above. Date and company are filled when sending.':'Proposed template preview. Meta approval has not been verified.'}</p>
       {preview&&<button className={button+' mx-4 mb-4 bg-white'} onClick={()=>saveReportFile(preview.blob,config.reportId+'-'+preview.date+'.jpg')}>Download JPG</button>}
      </section>
      <section className="rounded-xl border bg-white p-5">
       <h2 className="font-semibold">Send a test</h2>
       <p className="my-2 text-xs leading-relaxed text-slate-500">Save your configuration and review the generated image. A test sends to one saved recipient through Redlava.</p>
       <label className="block text-sm font-medium">Test recipient
        <select
         disabled={busy}
         className={field + (!config.recipients.length ? ' bg-slate-50 text-slate-500' : '')}
         value={testTo}
         onChange={e=>{setTestTo(e.target.value);setConfirmTest(false);requestId.current=''}}
        >
         <option value="">{config.recipients.length ? 'Select recipient' : (recipientText.trim() ? 'Save configuration to select recipient' : 'No recipients (add numbers above and save)')}</option>
         {Array.from(new Set([...config.recipients, ...recipientText.split(/[,\n]/).map(x=>x.trim()).filter(x=>/^\+[1-9]\d{7,14}$/.test(x))])).map(n=><option key={n} value={n}>{n}{!config.recipients.includes(n) ? ' (unsaved)' : ''}</option>)}
        </select>
       </label>
       {dirty && <p className="mt-2 text-xs text-amber-700 font-medium">⚠️ Click <strong>Save configuration</strong> above to save changes before sending a test.</p>}
       {!dirty && !config.recipients.length && <p className="mt-2 text-xs text-slate-500">Add phone numbers in <strong>WhatsApp recipients</strong> above and click Save configuration.</p>}
       <button disabled={busy||dirty||!config.id||!preview||!ready||!providerReady||!testTo||!config.consent} onClick={()=>setConfirmTest(true)} className={button+' mt-4 w-full border-emerald-800 bg-emerald-800 text-white'}>Review test send</button>
       {(dirty||!config.id||!preview||!ready||!providerReady||!testTo||!config.consent) && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
         <p className="font-semibold text-slate-700 mb-1">To enable test send:</p>
         <ul className="space-y-0.5">
          {(!config.id || dirty) && <li>• Click &quot;Save configuration&quot; above</li>}
          {!testTo && <li>• Select a test recipient above</li>}
          {!preview && <li>• Click &quot;Generate report image&quot; to preview the report</li>}
          {!config.consent && <li>• Check the opt-in consent checkbox</li>}
          {!providerReady && <li>• Configure REDLAVA_API_KEY on the server</li>}
          {providerReady && !ready && <li>• Meta template must be approved and compatible</li>}
         </ul>
        </div>
       )}
       {confirmTest&&<div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs"><p>Send this report image and template to {testTo}? Provider messaging charges may apply.</p><div className="mt-3 flex gap-2"><button disabled={busy} onClick={test} className={button+' bg-white'}>Send now</button><button disabled={busy} onClick={()=>setConfirmTest(false)}>Cancel</button></div></div>}
      </section>
     </aside>
    </div>
   )}
  </div>
 </main></DashboardLayout>
}
