'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CalendarDays, ChevronDown, Download, RefreshCw, X } from 'lucide-react'
import { companies, dayLabel, money, scopedRows, exportSalesHTML, salesContributors, type Company, type DailySalesReport, type PILink, type SaleDetail, type CollectionDetail } from '@/lib/daily-sales-report'
import { callingSummary, showCount, employeeTotal, scopedEmployees } from '@/lib/daily-sales-calling'
import ContributionChart from './contribution-chart'
const todayIST=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
import { copyReportHTML, printReport, reportJPG, saveReportFile } from '@/lib/marketing-report-browser'
import styles from './report.module.css'

function DailySalesReportAlertContent(){
 const searchParams=useSearchParams()
 const qDate=searchParams?.get('date')
 const qCompany=searchParams?.get('company')
 const autoPrint=searchParams?.get('print')==='1'||searchParams?.get('format')==='pdf'
 const [date,setDate]=useState(()=>(qDate&&/^\d{4}-\d{2}-\d{2}$/.test(qDate)?qDate:todayIST()))
 const [scope,setScope]=useState(()=>(qCompany&&(qCompany==='ALL'||Object.hasOwn(companies,qCompany))?qCompany:'ALL'))
 const [report,setReport]=useState<DailySalesReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const [dialog,setDialog]=useState<{kind:string;html:string;name:string;subject:string}|null>(null)
 const [salesModal,setSalesModal]=useState<{agent:string;company:string;items:SaleDetail[]}|null>(null)
 const [collectionModal,setCollectionModal]=useState<{agent:string;company:string;items:CollectionDetail[]}|null>(null)
 const lock=useRef(false),closeButton=useRef<HTMLButtonElement>(null),printedRef=useRef(false)
 function reload(nextDate=date){setLoading(true);setError('');setReport(null);setDialog(null);setSalesModal(null);setCollectionModal(null);setDate(nextDate);setRetry(n=>n+1)}
 useEffect(()=>{const controller=new AbortController()
 fetch('/api/daily-sales-report-alert?date='+date,{cache:'no-store',signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to load report');return data}).then(data=>{if(!controller.signal.aborted)setReport(data)}).catch(e=>{if(!controller.signal.aborted)setError(e.message)}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
 return()=>controller.abort()},[date,retry])
 useEffect(()=>{if(dialog)closeButton.current?.focus();const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!lock.current){setDialog(null);setSalesModal(null);setCollectionModal(null)}};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)},[dialog])
 const rows=report?scopedRows(report,scope):[],codes=scope==='ALL'?Object.keys(companies):[scope]
 const total=(key:'sales'|'collection'|'unverified'|'cancelled'|'dialer'|'conversions')=>rows.reduce((n,r)=>n+(r[key]||0),0)
 const contributors=salesContributors(rows)
 const totalSales=total('sales'),totalCollection=total('collection'),calling=report?.calling,summary=callingSummary(calling,scope),employees=scopedEmployees(calling,scope)
 async function action(kind:string){if(!report||lock.current)return;lock.current=true;setBusy(true);setNotice('')
 try{const html=exportSalesHTML(report,scope),name=`Daily-Sales-Report-${date}-${scope}`,subject=`Daily Sales Report Alert | ${dayLabel(date)} | ${scope==='ALL'?'All companies':companies[scope as Company]}`
 if(kind==='print')await printReport(html)
 else if(kind==='jpg'){saveReportFile(await reportJPG(html),name+'.jpg');setNotice('JPG downloaded')}
 else if(kind==='html'){saveReportFile(new Blob([html],{type:'text/html'}),name+'.html');setNotice('HTML downloaded')}
 else setDialog({kind,html,name,subject})
 }catch(e){setNotice(e instanceof Error?e.message:'Export unavailable')}finally{lock.current=false;setBusy(false)}}
 useEffect(()=>{
  if(autoPrint&&report&&!loading&&!busy&&!printedRef.current){
   printedRef.current=true
   void action('print')
  }
 },[autoPrint,report,loading,busy])
 async function share(){if(!dialog||lock.current)return;lock.current=true;setBusy(true);try{const file=new File([await reportJPG(dialog.html)],dialog.name+'.jpg',{type:'image/jpeg'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:dialog.subject});else{saveReportFile(file,file.name);setNotice('JPG downloaded. Attach it in WhatsApp.')}}catch(e){setNotice(e instanceof Error?e.message:'Share unavailable')}finally{lock.current=false;setBusy(false)}}
 return <main className={styles.shell}>
  <nav className={styles.breadcrumb}><Link href="/sales/reports"><ArrowLeft size={15}/> Sales Report</Link><span>/ Daily Sales Report Alert</span></nav>
  <header className={styles.hero}><div className={styles.brand}>KAIRALI GROUP <span> / </span> DAILY SALES BRIEFING</div><div className={styles.heroTop}><div><h1>Daily Sales Report Alert</h1><p className={styles.date}><CalendarDays size={17}/>{dayLabel(date)} <small>IST</small></p><p className={styles.scope}>{scope==='ALL'?'All companies · Healing Village, Villa Raag & KAPPL':companies[scope as Company]}</p></div>
  <div className={styles.controls}><label>Report date<input aria-label="Report date" type="date" value={date} max={todayIST()} onChange={e=>{if(e.target.value)reload(e.target.value)}}/></label><label>Company<select aria-label="Company" value={scope} onChange={e=>{setScope(e.target.value);setDialog(null)}}><option value="ALL">All companies</option>{Object.entries(companies).map(([code,name])=><option key={code} value={code}>{code} · {name}</option>)}</select></label><button type="button" className={styles.pdfButton} disabled={!report||loading||busy} onClick={()=>void action('print')} title="View / Save as PDF"><Download size={14}/> Save PDF</button><details className={styles.menu}><summary><Download size={15}/>Export & Share<ChevronDown size={14}/></summary><div>{[['print','Print / Save PDF'],['jpg','Download JPG'],['html','Download HTML'],['email','Email template'],['whatsapp','WhatsApp share']].map(([kind,label])=><button key={kind} disabled={!report||loading||busy} onClick={e=>{e.currentTarget.closest('details')!.open=false;void action(kind)}}>{label}</button>)}</div></details></div></div>
  <div className={styles.heroStats}><div><span>SALES VALUE</span><strong>{report?money(totalSales):'—'}</strong><small>KTAHV by booking date</small></div><div><span>COLLECTION AMOUNT</span><strong>{report?money(totalCollection):'—'}</strong><small>Payments received</small></div><div><span>UNVERIFIED SALES</span><strong>{report?money(total('unverified')):'—'}</strong><small>Awaiting verification</small></div><div><span>CANCELLED VALUE</span><strong>{report?money(total('cancelled')):'—'}</strong><small>Reported separately</small></div><div><span>SALES CONTRIBUTORS</span><strong>{report?contributors.length:'—'}</strong><small>Agents with positive sales</small></div></div></header>
  <div className={styles.toolbar}><span><i/> {loading?'Loading SQL report…':report?'SQL connected · Partial calling coverage':'Report unavailable'}</span><button disabled={loading} onClick={()=>reload()}><RefreshCw size={14}/>Refresh</button></div>
  {report?.cancellationSnapshotAt&&<p className={styles.sourceNote}>KTAHV cancellation dates · Sheet snapshot {new Date(report.cancellationSnapshotAt).toLocaleString('en-GB',{timeZone:'Asia/Kolkata'})} IST</p>}
  {error&&<div role="alert" className={styles.coverage}>{error}</div>}
  {loading&&<div role="status" className={styles.loading}>Preparing the daily sales briefing…</div>}
  {report&&<><div className={styles.callingHeading}><h2>Calling overview</h2><p>Pending totals: {scope==='ALL'?'all companies':scope} · {calling?.pendingMode==='database'?'Database':calling?.pendingMode==='snapshot'?'Sheet snapshot (DialerPending)':calling?.pendingMode==='live'?'Live (DialerPending)':'Unavailable'} · {calling?.pendingCapturedAt?new Date(calling.pendingCapturedAt).toLocaleString('en-GB',{timeZone:'Asia/Kolkata'})+' IST':'unavailable'}<br/>Calls done: Live sheet · {summary.dates.join(', ')||'unavailable'} · employee totals cover all companies</p></div>
   {(() => {
     const callingCards = calling ? [
       {
         label: 'AppSheet Pending',
         value: showCount(summary.pendingAppsheet),
         note: 'AppSheet Pending · AppSheet total',
         isPending: true,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(calling.pending?.KAPPL?.appsheet ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(calling.pending?.KTAHV?.appsheet ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(calling.pending?.VILLARAAG?.appsheet ?? 0) },
         ],
       },
       {
         label: 'Pending leads National (Hopper)',
         value: showCount(summary.pendingNational),
         note: 'DialerPending · National total',
         isPending: true,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(calling.pending?.KAPPL?.national ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(calling.pending?.KTAHV?.national ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(calling.pending?.VILLARAAG?.national ?? 0) },
         ],
       },
       {
         label: 'Pending leads International (Hopper)',
         value: showCount(summary.pendingInternational),
         note: 'DialerPending · International total',
         isPending: true,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(calling.pending?.KAPPL?.international ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(calling.pending?.KTAHV?.international ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(calling.pending?.VILLARAAG?.international ?? 0) },
         ],
       },
       {
         label: 'Calls Done (AppSheet)',
         value: showCount(summary.appsheet),
         note: scope === 'ALL' ? 'Live · column AI' : 'Employee totals · ' + scope,
         isPending: false,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(calling, 'KAPPL'), 'appsheet') ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(calling, 'KTAHV'), 'appsheet') ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(calling, 'VILLARAAG'), 'appsheet') ?? 0) },
         ],
       },
       {
         label: 'Calls Done (Dialer)',
         value: showCount(summary.dialer),
         note: scope === 'ALL' ? 'Live · column M' : 'Employee totals · ' + scope,
         isPending: false,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(calling, 'KAPPL'), 'dialer') ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(calling, 'KTAHV'), 'dialer') ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(calling, 'VILLARAAG'), 'dialer') ?? 0) },
         ],
       },
       {
         label: 'Total Calls Done',
         value: showCount(summary.done),
         note: 'All channels · AppSheet + Dialer',
         isPending: false,
         breakdown: [
           { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(calling, 'KAPPL'), 'done') ?? 0) },
           { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(calling, 'KTAHV'), 'done') ?? 0) },
           { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(calling, 'VILLARAAG'), 'done') ?? 0) },
         ],
       },
     ] : []
     return (
       <div className={styles.metrics}>
         {callingCards.map(card => (
           <article key={card.label} className={card.isPending ? styles.pendingMetric : styles.doneMetric}>
             <span>{card.label}</span>
             <strong>{card.value}</strong>
             <small>{card.note}</small>
             <div className={styles.companyBreakdown}>
               {card.breakdown.map(b => (
                 <div
                   key={b.name}
                   className={`${card.isPending ? styles.breakdownCol : styles.breakdownColDone} ${scope !== 'ALL' && scope !== b.code ? styles.dimCol : ''}`}
                 >
                   <span className={styles.breakdownCompany}>{b.name}</span>
                   <strong className={card.isPending ? styles.breakdownCount : styles.breakdownCountDone}>
                     {b.count}
                   </strong>
                 </div>
               ))}
             </div>
           </article>
         ))}
       </div>
     )
   })()}
  <section className={styles.company}><header><div><span className={styles.tag}>{scope==='ALL'?'ALL COMPANIES':scope}</span><h2>Employee calling activity</h2><p>Employees by registered company · Latest calling activity</p></div></header><div className={styles.tableScroll}><table className={styles.callingTable}><thead><tr><th rowSpan={2}>Employee</th><th colSpan={2} className={styles.appsheetGroup}>AppSheet</th><th className={styles.dialerGroup}>Dialer</th><th rowSpan={2} className={styles.doneGroup}>Total calls done</th><th rowSpan={2}>Last updated (IST)</th></tr><tr><th>Pending leads</th><th>Calls done</th><th>Calls done</th></tr></thead><tbody>{employees.map(r=><tr key={r.name}><td>{r.name}</td><td>{showCount(r.pending)}</td><td>{showCount(r.appsheet)}</td><td>{showCount(r.dialer)}</td><td className={styles.sale}>{showCount(r.done)}</td><td>{r.updatedAt}</td></tr>)}</tbody><tfoot><tr><td>Grand total</td>{(['pending','appsheet','dialer','done'] as const).map(key=><td key={key}>{showCount(employeeTotal(employees,key))}</td>)}<td>All employees</td></tr></tfoot></table></div>{!employees.length&&<p className={styles.empty}>No calling employees available for this company.</p>}</section>
    <div className={styles.content}><div className={styles.tables}>{codes.map(code=>{const agents=rows.filter(r=>r.company===code);return <section key={code} className={styles.company}><header><div><span className={styles.tag}>{code}</span><h2>{companies[code as Company]}</h2><p>Agent performance · {dayLabel(date)}</p></div><div className={styles.companyTotal}><span>Sales value</span><strong>{money(agents.reduce((n,r)=>n+r.sales,0))}</strong></div></header><div className={styles.tableScroll}><table><thead><tr>{['Agent Name','Sales Quantity','UnVerified Sales Value','Collection Amount','Cancelled Qty','Cancelled Value'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{agents.map(r=><tr key={r.agent}><td><span className={styles.avatar}>{r.agent.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>{r.agent}</td><td>{r.conversions>0?<button type="button" className={styles.quantityLink} onClick={()=>setSalesModal({agent:r.agent,company:r.company,items:r.salesDetails||[]})} title={`Click to view ${r.conversions} sales record(s)`}>{r.conversions}</button>:<span className={styles.quantityMuted}>—</span>}</td><td className={r.sales>0?styles.sale:undefined}>{money(r.sales)}</td><td>{r.collection>0?<button type="button" className={styles.collectionLink} onClick={()=>setCollectionModal({agent:r.agent,company:r.company,items:r.collectionDetails||[]})} title={`Click to view ${r.collectionCount||1} collection receipt(s)`}>{money(r.collection)}</button>:<span className={styles.quantityMuted}>{money(0)}</span>}</td><td>{r.cancelledCount>0?r.cancelledCount:<span className={styles.quantityMuted}>—</span>}</td><td>{money(r.cancelled)}</td></tr>)}</tbody><tfoot><tr><td>Grand total</td><td>{showCount(agents.reduce((n,r)=>n+r.conversions,0))}</td><td>{money(agents.reduce((n,r)=>n+r.sales,0))}</td><td>{money(agents.reduce((n,r)=>n+(r.collection||0),0))}</td><td>{showCount(agents.reduce((n,r)=>n+(r.cancelledCount||0),0))}</td><td>{money(agents.reduce((n,r)=>n+r.cancelled,0))}</td></tr></tfoot></table></div>{!agents.length&&<p className={styles.empty}>No sales found for this date.</p>}</section>})}</div>
  <ContributionChart key={scope+date} contributors={contributors}/></div><footer className={styles.footer}>Prepared for Sales Team & Management <span>INR · IST · Updated {new Date(report.generatedAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})} IST</span></footer></>}
  {notice&&!dialog&&<p role="status" className={styles.notice}>{notice}</p>}
   {dialog&&<div className={styles.backdrop}><section role="dialog" aria-modal="true" aria-labelledby="share-title" className={styles.dialog}><header><div><h2 id="share-title">{dialog.kind==='email'?'Email template':'WhatsApp report'}</h2><p>{dialog.subject}</p></div><button ref={closeButton} aria-label="Close preview" disabled={busy} onClick={()=>setDialog(null)}><X/></button></header><iframe title="Export preview" srcDoc={dialog.html} sandbox=""/><div className={styles.dialogActions}>{dialog.kind==='email'?<><button onClick={async()=>{try{await copyReportHTML(dialog.html);setNotice('Formatted email copied. Paste into your email composer.')}catch{setNotice('Clipboard unavailable. Download the HTML template.')}}}>Copy formatted email</button><button onClick={()=>saveReportFile(new Blob([dialog.html],{type:'text/html'}),dialog.name+'.html')}>Download email HTML</button></>:<button disabled={busy} onClick={share}>{busy?'Preparing image…':'Share / download JPG'}</button>}<button onClick={async()=>{try{await navigator.clipboard.writeText(dialog.subject);setNotice('Caption copied')}catch{setNotice('Clipboard unavailable')}}}>Copy caption</button></div><p role="status">{notice||'Preview includes the selected date and company scope.'}</p></section></div>}
  {salesModal&&<div className={styles.backdrop} onClick={()=>setSalesModal(null)}><section role="dialog" aria-modal="true" aria-label="Sales Details" className={styles.salesModal} onClick={e=>e.stopPropagation()}><header className={styles.salesModalHeader}><div><h3>Sales Breakdown · {salesModal.agent}</h3><p>{companies[salesModal.company as Company]||salesModal.company} · {salesModal.items.length} contributing record{salesModal.items.length===1?'':'s'}</p></div><button aria-label="Close" onClick={()=>setSalesModal(null)} className={styles.salesCloseBtn}><X size={18}/></button></header><div className={styles.salesModalBody}><table className={styles.salesModalTable}><thead><tr><th>Date</th><th>Name of the Client</th><th>PI Details</th><th>Amount</th><th>Sales Agent</th></tr></thead><tbody>{salesModal.items.map((item,idx)=><tr key={item.id||idx}><td className={styles.dateCell}>{item.date}</td><td className={styles.clientName}>{item.clientName}</td><td>{item.piLink?<a href={item.piLink.startsWith('http')?`/api/pi-document?url=${encodeURIComponent(item.piLink)}&bookingId=${encodeURIComponent(item.id||item.piNumber)}`:item.piLink} target="_blank" rel="noopener noreferrer" className={styles.piDocLink} title="Open PI Document">{item.piNumber} ↗</a>:<span>{item.piNumber||'—'}</span>}</td><td className={styles.amountCell}>{money(item.amount)}</td><td>{item.agent}</td></tr>)}{!salesModal.items.length&&<tr><td colSpan={5} className={styles.emptyDetail}>No individual records available for this agent.</td></tr>}</tbody>{salesModal.items.length>0&&<tfoot><tr><td colSpan={3}>Total</td><td className={styles.amountCell}>{money(salesModal.items.reduce((sum,item)=>sum+item.amount,0))}</td><td>{salesModal.items.length} sale{salesModal.items.length===1?'':'s'}</td></tr></tfoot>}</table></div></section></div>}
  {collectionModal&&<div className={styles.backdrop} onClick={()=>setCollectionModal(null)}><section role="dialog" aria-modal="true" aria-label="Collection Details" className={styles.salesModal} onClick={e=>e.stopPropagation()}><header className={styles.salesModalHeader}><div><h3>Collection Breakdown · {collectionModal.agent}</h3><p>{companies[collectionModal.company as Company]||collectionModal.company} · {collectionModal.items.length} contributing receipt{collectionModal.items.length===1?'':'s'}</p></div><button aria-label="Close" onClick={()=>setCollectionModal(null)} className={styles.salesCloseBtn}><X size={18}/></button></header><div className={styles.salesModalBody}><table className={styles.salesModalTable}><thead><tr><th>Date</th><th>Client Name</th><th>Booking ID</th><th>Receipt No</th><th>Mode</th><th>Amount</th><th>Collected By</th></tr></thead><tbody>{collectionModal.items.map((item,idx)=><tr key={item.id||idx}><td className={styles.dateCell}>{item.date}</td><td className={styles.clientName}>{item.clientName}</td><td>{item.bookingId}</td><td>{item.receiptNumber||'—'}</td><td>{item.paymentMode||'—'}</td><td className={styles.amountCell}>{money(item.amount)}</td><td>{item.agent}</td></tr>)}{!collectionModal.items.length&&<tr><td colSpan={7} className={styles.emptyDetail}>No individual collection records available for this agent.</td></tr>}</tbody>{collectionModal.items.length>0&&<tfoot><tr><td colSpan={5}>Total</td><td className={styles.amountCell}>{money(collectionModal.items.reduce((sum,item)=>sum+item.amount,0))}</td><td>{collectionModal.items.length} receipt{collectionModal.items.length===1?'':'s'}</td></tr></tfoot>}</table></div></section></div>}
 </main>
}

export default function DailySalesReportAlert(){
 return (
  <Suspense fallback={<div className={styles.loading}>Preparing the daily sales briefing…</div>}>
   <DailySalesReportAlertContent />
  </Suspense>
 )
}
