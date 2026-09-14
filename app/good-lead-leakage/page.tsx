'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Bot, CheckCheck, ChevronLeft, ChevronRight, Clock3, Database, Layers3, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import type { LeakageRow } from '@/lib/good-lead-leakage'
import { groupRows, percent, quickRange, reportDate, sumRows, type GroupDimension } from '@/lib/good-lead-leakage-view'
import styles from './dashboard.module.css'

type Filters = {from:string;to:string;company:string;review:string}
type Report = {
 rows:LeakageRow[];generatedAt:string
 diagnostics:{records:number;distinctReviewIds:number;distinctLeadIds:number;missingReviewIds:number;missingLeadIds:number;firstReview:string|null;lastReview:string|null}
 provenance:{database:string;tables:string[];dateBasis:string;countBasis:string}
}
const number=(n:number)=>n.toLocaleString('en-IN')
const dateLabel=(date:string)=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})
const pageSize=10

export default function GoodLeadLeakagePage(){
 const [filters,setFilters]=useState<Filters>(()=>({...quickRange('month'),company:'ALL',review:'ALL'}))
 const [draft,setDraft]=useState(filters)
 const [refresh,setRefresh]=useState(0)
 const [result,setResult]=useState<{key:string;data?:Report;error?:string;status?:number}|null>(null)
 const [dimension,setDimension]=useState<GroupDimension>('source')
 const [search,setSearch]=useState('')
 const [page,setPage]=useState(1)
 const query=new URLSearchParams(filters).toString()
 const requestKey=query+'&refresh='+refresh
 useEffect(()=>{
  const controller=new AbortController()
  let disposed=false
  const timer=setTimeout(()=>controller.abort(),50000)
  fetch('/api/good-lead-leakage?'+query,{signal:controller.signal,cache:'no-store'})
   .then(async response=>{const body=await response.json();if(!disposed)setResult(response.ok?{key:requestKey,data:body}:{key:requestKey,error:body.error||'Unable to load report.',status:response.status})})
   .catch(()=>{if(!disposed)setResult({key:requestKey,error:controller.signal.aborted?'The report took too long to load. Try a shorter date range or refresh.':'Could not reach the report. Please check your connection and retry.'})})
   .finally(()=>clearTimeout(timer))
  return ()=>{disposed=true;clearTimeout(timer);controller.abort()}
 },[query,requestKey])
 const loading=result?.key!==requestKey
 const data=!loading?result?.data:undefined
 const error=!loading?result?.error:undefined
 const rows=useMemo(()=>data?.rows||[],[data])
 const totals=useMemo(()=>sumRows(rows),[rows])
 const owners=useMemo(()=>groupRows(rows,'owner').filter(row=>row.manualReopened>0||row.aiReopened>0).slice(0,6),[rows])
 const breakdown=useMemo(()=>groupRows(rows,dimension).filter(row=>`${row.name} ${row.company}`.toLowerCase().includes(search.trim().toLowerCase())),[rows,dimension,search])
 const totalPages=Math.max(1,Math.ceil(breakdown.length/pageSize))
 const currentPage=Math.min(page,totalPages)
 const visibleRows=breakdown.slice((currentPage-1)*pageSize,currentPage*pageSize)
 const pendingChanges=JSON.stringify(draft)!==JSON.stringify(filters)
 function apply(event:FormEvent){event.preventDefault();setFilters(draft);setPage(1);setSearch('');setRefresh(n=>n+1)}
 function preset(period:'month'|'previous'|'week'){const next={...draft,...quickRange(period)};setDraft(next);setFilters(next);setPage(1);setSearch('')}
 const metrics=[
  {label:'Confirmed manual reopens',value:totals.manualReopened,note:`${percent(totals.manualReopened,totals.cold)}% of review records`,icon:CheckCheck,primary:true},
  {label:'Cold review records',value:totals.cold,note:'Current and archived reviews',icon:Layers3},
  {label:'AI reopen recommendations',value:totals.aiReopened,note:'Recommendation, not confirmation',icon:Bot},
  {label:'Pending manual completion',value:totals.pending,note:'One or both review steps pending',icon:Clock3},
  {label:'Records with reopen signal',value:totals.reopened,note:'AI or manual · overlap counted once',icon:ShieldCheck},
 ]
 const overlap=data?Math.max(0,Number(data.diagnostics.records)-Number(data.diagnostics.distinctReviewIds)-Number(data.diagnostics.missingReviewIds)):0
 const repeatedLeadIds=data?Math.max(0,Number(data.diagnostics.records)-Number(data.diagnostics.distinctLeadIds)-Number(data.diagnostics.missingLeadIds)):0
 const scope=filters.company==='ALL'?'All companies':filters.company
 return <main className={styles.root}>
  <header className={styles.topbar}><div className={`${styles.shell} ${styles.topinner}`}><div className={styles.brand}><Image src="/logo1.png" alt="Kairali" width={122} height={46} priority/><div className={styles.brandLabel}><p className={styles.eyebrow}>Kairali intelligence</p>Sales quality & recovery</div></div><span className={styles.live}><span className={styles.dot}/>{loading?'Updating report':data?'Live SQL · Read only':'Report unavailable'}</span></div></header>
  <div className={styles.shell}>
   <section className={styles.hero}><div><p className={styles.eyebrow}>Sales performance / Quality control</p><h1>Good Lead Leakage Dashboard</h1><p>Understand reopening decisions. Find the follow-up that needs attention.</p></div><Link className={styles.link} href="/fms/enquiry-reverification">Open review workflow <ArrowUpRight size={14}/></Link></section>
   <form className={styles.toolbar} onSubmit={apply}>
    <div className={styles.filterRow}>
     <label className={styles.field}>Company<select value={draft.company} onChange={e=>setDraft({...draft,company:e.target.value})}><option value="ALL">All companies</option>{['KTAHV','KAPPL','VILLARAAG'].map(company=><option key={company}>{company}</option>)}</select></label>
     <label className={styles.field}>Review workflow<select value={draft.review} onChange={e=>setDraft({...draft,review:e.target.value})}><option value="ALL">All workflows</option><option value="AI">AI workflow</option><option value="Manual">Manual workflow</option></select></label>
     <label className={styles.field}>Review generated from<input required type="date" value={draft.from} max={draft.to||reportDate()} onChange={e=>setDraft({...draft,from:e.target.value})}/></label>
     <label className={styles.field}>Through<input required type="date" value={draft.to} min={draft.from} max={reportDate()} onChange={e=>setDraft({...draft,to:e.target.value})}/></label>
     <button className={styles.apply} type="submit">Apply filters</button>
    </div>
    <div className={styles.quickRow}><div className={styles.quick}><button type="button" onClick={()=>preset('week')}>Last 7 days</button><button type="button" onClick={()=>preset('month')}>This month</button><button type="button" onClick={()=>preset('previous')}>Last month</button></div><span className={styles.period}>{pendingChanges?'Filter changes not applied':'Up to 93 days · Review generated date · IST'}</span></div>
   </form>
   <div className={styles.status}><span>{scope} · {dateLabel(filters.from)} – {dateLabel(filters.to)} · {filters.review==='ALL'?'All workflows':filters.review+' workflow'}</span><button className={styles.refresh} disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={12}/>{loading?'Loading…':data?'Updated '+new Date(data.generatedAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})+' IST · Refresh':'Retry'}</button></div>
   {error&&<div className={styles.error} role="alert">{error} {result?.status===401&&<Link href="/">Sign in to CRM</Link>}</div>}
   {loading&&<span role="status" className="sr-only">Loading live dashboard data</span>}
   <section className={styles.cards} aria-label="Dashboard summary" aria-busy={loading}>{metrics.map(metric=><article key={metric.label} className={`${styles.metric} ${metric.primary?styles.metricPrimary:''}`}><div className={styles.metricHead}><h2>{metric.label}</h2><span className={styles.icon}><metric.icon size={16}/></span></div>{loading?<span className={styles.skeleton}/>:<p className={styles.metricValue}>{data?number(metric.value):'—'}</p>}<p className={styles.metricNote}>{data?metric.note:metric.primary?'Completed senior decisions':metric.note}</p></article>)}</section>
   <div className={styles.mainGrid}>
    <section className={styles.panel}><div className={styles.panelHead}><div><p className={styles.eyebrow}>Owner overview</p><h2>Where reopens are concentrated</h2></div><span className={styles.smallBadge}>Top 6 · Confirmed first</span></div><div className={styles.ownerList}>{owners.map((owner,index)=><div className={styles.owner} key={owner.key}><span className={styles.rank}>{String(index+1).padStart(2,'0')}</span><div><div className={styles.ownerName}>{owner.name}</div><div className={styles.sub}>{owner.company} · {number(owner.cold)} reviews · {number(owner.aiReopened)} AI signals</div></div><div><div className={styles.barTrack}><div className={styles.bar} style={{width:percent(owner.manualReopened,owner.cold)+'%'}}/></div><div className={styles.sub} style={{marginTop:5}}>{percent(owner.manualReopened,owner.cold)}% confirmed</div></div><div className={styles.ownerCount}>{number(owner.manualReopened)}<small>confirmed</small></div></div>)}{!owners.length&&<div className={styles.empty}><strong>{loading?'Loading owner overview':data?'No reopen signals in this period':'Owner overview unavailable'}</strong>{data?'Try another date range or company.':'The overview appears when the report loads.'}</div>}</div></section>
    <section className={styles.panel}><div className={styles.panelHead}><div><p className={styles.eyebrow}>Decision breakdown</p><h2>Keep the outcomes distinct</h2></div><Bot size={18} color="#729681"/></div><div className={styles.reviewBody}><div className={styles.flow}><div className={styles.flowCard}><span>Manual reassignment</span><strong>{data?number(totals.manualReassign):'—'}</strong><span>Reopen to another owner</span></div><div className={styles.flowCard}><span>Manual escalation</span><strong>{data?number(totals.manualEscalated):'—'}</strong><span>Senior escalation decision</span></div></div><div className={styles.reviewLine}><span>AI reassign / escalate recommendations</span><strong>{data?`${number(totals.aiReassign)} / ${number(totals.aiEscalated)}`:'—'}</strong></div><div className={styles.reviewLine}><span>AI reopen later confirmed cold</span><strong>{data?number(totals.aiRejected):'—'}</strong></div><div className={styles.reviewLine}><span>Both AI and manual ordinary reopen</span><strong>{data?number(totals.bothReopened):'—'}</strong></div><div className={styles.note}>A recommendation is not a recovered sale. Conversion and revenue remain unavailable until the lead-to-booking link is verified.</div></div></section>
   </div>
   <section className={styles.panel}><div className={styles.panelHead}><div><p className={styles.eyebrow}>Performance detail</p><h2>Explore the review records</h2></div><span className={styles.smallBadge}>{data?number(breakdown.length):'—'} groups</span></div>
    <div className={styles.tableTools}><div className={styles.tabs} role="group" aria-label="Group results by">{(['source','owner','company'] as const).map(tab=><button key={tab} aria-pressed={dimension===tab} className={dimension===tab?styles.active:''} onClick={()=>{setDimension(tab);setSearch('');setPage(1)}}>{tab==='source'?'By source':tab==='owner'?'By owner':'By company'}</button>)}</div><label className={styles.search}><span className="sr-only">Search breakdown only</span><Search size={14}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder={`Search ${dimension} or company`}/></label></div>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">{dimension}</th><th scope="col">Reviews</th><th scope="col">Confirmed</th><th scope="col">AI signals</th><th scope="col">Pending</th><th scope="col">Confirmed %</th></tr></thead><tbody>{visibleRows.map(row=><tr key={row.key}><td><div className={styles.tableName}>{row.name}</div><span className={styles.company}>{row.company}</span></td><td>{number(row.cold)}</td><td><span className={styles.valuePill}>{number(row.manualReopened)}</span></td><td>{number(row.aiReopened)}</td><td>{number(row.pending)}</td><td>{percent(row.manualReopened,row.cold)}%</td></tr>)}</tbody></table></div>
    <div className={styles.mobileList}>{visibleRows.map(row=><article className={styles.mobileRow} key={row.key}><div className={styles.mobileTitle}><div><div className={styles.tableName}>{row.name}</div><span className={styles.company}>{row.company}</span></div><span className={styles.valuePill}>{percent(row.manualReopened,row.cold)}%</span></div><div className={styles.mobileStats}><div><span>REVIEWS</span><strong>{number(row.cold)}</strong></div><div><span>CONFIRMED</span><strong>{number(row.manualReopened)}</strong></div><div><span>AI SIGNALS</span><strong>{number(row.aiReopened)}</strong></div><div><span>PENDING</span><strong>{number(row.pending)}</strong></div></div></article>)}</div>
    {!visibleRows.length&&<div className={styles.empty}><strong>{loading?'Loading records':error?'Report unavailable':'No matching records'}</strong>{search?'Clear the search or choose another grouping.':'Choose another period or workflow to explore more records.'}</div>}
    <div className={styles.pager}><span>{breakdown.length?`${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize,breakdown.length)} of ${number(breakdown.length)} groups`:'0 groups'} · Search applies to this section only</span><div className={styles.pageButtons}><button disabled={currentPage===1} aria-label="Previous page" onClick={()=>setPage(currentPage-1)}><ChevronLeft size={14}/></button><span>{currentPage} / {totalPages}</span><button disabled={currentPage===totalPages} aria-label="Next page" onClick={()=>setPage(currentPage+1)}><ChevronRight size={14}/></button></div></div>
   </section>
   <div className={styles.bottomGrid}>
    <section className={styles.panel}><div className={styles.panelHead}><div><p className={styles.eyebrow}>Data completeness</p><h2>What the numbers can tell us</h2></div><ShieldCheck size={18} color="#729681"/></div><div className={styles.quality}><div className={styles.qualityGrid}>{[['Missing company',totals.missingCompany],['Missing owner',totals.missingOwner],['Missing source',totals.missingSource],['Missing / invalid attempts',totals.missingAttempts]].map(([label,value])=><div className={styles.qualityItem} key={label}><span>{label}</span><strong>{data?number(Number(value)):'—'}</strong></div>)}</div><p><strong>{data?number(totals.lowAttempts):'—'}</strong> flagged records have fewer than 3 recorded call attempts. Unknown attempts are excluded; this is a follow-up signal, not proof of premature closure.</p><p>{data?`${number(repeatedLeadIds)} additional records share a lead ID; ${number(overlap)} additional records share a review ID. `:''}Totals count records, not unique leads. Repeated identifiers require reconciliation before treating these as unique opportunities.</p></div></section>
    <section className={styles.panel}><div className={styles.panelHead}><div><p className={styles.eyebrow}>Connected source</p><h2>Live data, clear definitions</h2></div><Database size={18} color="#729681"/></div><div className={styles.quality}><div className={styles.qualityGrid}><div className={styles.qualityItem}><span>Current records</span><strong>{data?number(rows.filter(r=>r.origin==='Current').reduce((n,r)=>n+Number(r.cold),0)):'—'}</strong></div><div className={styles.qualityItem}><span>Archived records</span><strong>{data?number(rows.filter(r=>r.origin==='Archive').reduce((n,r)=>n+Number(r.cold),0)):'—'}</strong></div></div></div><details className={styles.details}><summary>Database, tables & counting rules</summary>{data&&<><p>MySQL · Read only</p><code>{data.provenance.database}</code>{data.provenance.tables.map(table=><code key={table}>{table}</code>)}</>}<p>Dates use review generation in IST. Manual confirmed reopens require a completed senior “Reopen” decision; current reviews also require the executive step. Archived records follow the completed archive workflow.</p><p>AI workflow contains recognized current AI categories. Other current records and archives are manual workflow. Reassignments and escalations are counted separately. “Records with reopen signal” is the union of AI and manual ordinary reopens, including AI recommendations later rejected by manual review.</p></details></section>
   </div>
   <footer className={styles.foot}><span>Kairali Group · Sales quality intelligence</span><span>Counts reconcile within the selected period. Conversion attribution is pending.</span></footer>
  </div>
 </main>
}
