import { callingSummary, showCount, employeeTotal, scopedEmployees, type CallingData } from './daily-sales-calling'
export const companies = { KTAHV: 'Kairali – The Ayurvedic Healing Village', VILLARAAG: 'Villa Raag', KAPPL: 'Kairali Ayurvedic Products Pvt. Ltd.' } as const
export type Company = keyof typeof companies
export type PILink = {id:string;piNumber:string;url:string}
export type SaleDetail = {id?:string;date:string;clientName:string;piNumber:string;piLink?:string|null;amount:number;agent:string}
export type CollectionDetail = {id?:string;date:string;clientName:string;bookingId:string;receiptNumber?:string;paymentMode?:string;amount:number;agent:string;company:string}
export type SalesAgent = {company:string;agent:string;sales:number;collection:number;collectionCount:number;unverified:number;cancelled:number;cancelledCount:number;conversions:number;quantity:number;dialer:number;appsheet:number|null;pending:number|null;done:number|null;piLinks?:PILink[];salesDetails?:SaleDetail[];collectionDetails?:CollectionDetail[]}
export type DailySalesReport = {date:string;generatedAt:string;cancellationSnapshotAt?:string;calling?:CallingData;rows:SalesAgent[];warnings:string[];unmappedCalls:number;sourceRecords:number}
export function combineSales(date:string,sales:Record<string,unknown>[],calls:Record<string,unknown>[],collections:Record<string,unknown>[]=[]):DailySalesReport {
 const map=new Map<string,SalesAgent>();const warnings=[
 'KTAHV sales use bookings created on the selected booking date where booking status is not cancelled; cancelled bookings are reported separately under cancelled value and count. Other companies retain their existing conversion-report definitions.',
 'KTAHV amounts use current SQL invoice amounts; EUR/USD use historical ECB reference rates for the booking date via Frankfurter. Other companies still use conversion-update dates.',
 'Calling activity is a live all-company employee snapshot. Its source date is shown separately from the selected sales date. Blank numeric cells in the Live sheet count as zero; sheet errors remain unavailable.'
 ];
 let unmappedCalls=0,sourceRecords=0;
 const get=(r:Record<string,unknown>)=>{const company=String(r.company),agent=String(r.agent||'Unassigned').trim();const key=company+'|'+agent.toLowerCase();if(!map.has(key))map.set(key,{company,agent,sales:0,collection:0,collectionCount:0,unverified:0,cancelled:0,cancelledCount:0,conversions:0,quantity:0,dialer:0,appsheet:null,pending:null,done:null,piLinks:[],salesDetails:[],collectionDetails:[]});return map.get(key)!}
 for(const r of sales){sourceRecords+=Number(r.records||0);if(!Object.hasOwn(companies,String(r.company))){warnings.push('Unmapped sales company found; consolidated sales coverage is incomplete.');continue}const a=get(r);a.sales+=Number(r.verified||0);a.unverified+=Number(r.unverified||0);a.cancelled+=Number(r.cancelled||0);a.cancelledCount+=Number(r.cancelledCount||0);a.conversions+=Number(r.conversions||0);a.quantity+=Number(r.conversions||0);if(Array.isArray(r.salesDetails)){a.salesDetails!.push(...(r.salesDetails as SaleDetail[]))}if(Array.isArray(r.piLinks)){const urls=new Set((a.piLinks||[]).map(p=>p.url));for(const p of r.piLinks as PILink[]){if(p&&p.url&&!urls.has(p.url)){urls.add(p.url);a.piLinks!.push(p)}}}}
 for(const r of calls){if(!(String(r.company) in companies)){unmappedCalls+=Number(r.dialer||0);continue}get(r).dialer+=Number(r.dialer||0)}
 for(const r of collections){if(!Object.hasOwn(companies,String(r.company)))continue;const a=get(r);a.collection+=Number(r.amount||r.collection||r.received_amount||0);a.collectionCount+=Number(r.count||r.collectionCount||1);if(Array.isArray(r.collectionDetails)){a.collectionDetails!.push(...(r.collectionDetails as CollectionDetail[]))}}
 if(unmappedCalls)warnings.push(`${unmappedCalls} dialer calls have no recognized company and are excluded from company totals.`)
 return {date,generatedAt:new Date().toISOString(),rows:[...map.values()].sort((a,b)=>b.sales-a.sales||b.collection-a.collection||a.agent.localeCompare(b.agent)),warnings,unmappedCalls,sourceRecords}
}
export const money=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value)
export const dayLabel=(date:string)=>new Date(date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})
export const esc=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function scopedRows(report:DailySalesReport,scope:string){if(scope!=='ALL'&&!Object.hasOwn(companies,scope))throw Error('Invalid company');return report.rows.filter(r=>scope==='ALL'||r.company===scope)}
export function salesContributors(rows:SalesAgent[]):{agent:string;sales:number}[]{
 const map=new Map<string,{agent:string;sales:number}>()
 for(const r of rows){
  const name=(r.agent||'').trim()
  if(!name)continue
  const key=name.toLowerCase()
  const existing=map.get(key)
  if(existing){existing.sales+=r.sales}
  else{map.set(key,{agent:name,sales:r.sales})}
 }
 return [...map.values()].filter(r=>r.sales>0).sort((a,b)=>b.sales-a.sales||a.agent.localeCompare(b.agent))
}
// Mobile-first: base rules describe the phone layout (stacked cards, 2-up tiles).
// Everything under min-width:621px upgrades it to real tables and wider grids.
// Inline styles carry only dynamic values (colours from data), so a client that
// drops <style> still gets a readable, single-column document.
const SALES_EMAIL_CSS=`*{box-sizing:border-box}
body{margin:0;padding:0;background:#f4f6fc;color:#24324b;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0}
h1,h2,h3,p{margin:0}
img{display:block;border:0;outline:0;max-width:100%;height:auto}
.wrap{padding:12px 8px}
.hero{background:#1e305b;color:#fff;border-radius:14px;padding:20px 16px}
.brand{font-size:11px;letter-spacing:1.6px;color:#93c5fd;font-weight:700;text-transform:uppercase;margin-bottom:6px}
.hero h1{font:400 26px/1.2 Georgia,'Times New Roman',serif;margin-bottom:8px}
.hero-sub{color:#cbd5e1;font-size:13px;line-height:1.6;margin-bottom:12px}
.hero-note{color:#cbd5e1;font-size:12px;margin-top:8px}
.grid{font-size:0;margin:0 -4px}
.g4,.g6{display:inline-block;width:50%;vertical-align:top;padding:4px;font-size:14px}
.kpi{background:#2c4174;border-radius:10px;padding:10px 12px}
.kpi-l{display:block;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:#bcd0f5}
.kpi-v{display:block;font-size:16px;line-height:1.3;font-weight:700;color:#fff;margin-top:4px;overflow-wrap:anywhere}
.card,.contributors{background:#fff;border:1px solid #e0e5f1;border-radius:12px;padding:16px;margin-top:12px}
.eyebrow{display:block;font-size:10px;letter-spacing:1.6px;color:#4338ca;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.card h2,.contributors h2{font-size:18px;line-height:1.3;color:#1e305b;margin-bottom:4px}
.card h3{font-size:16px;line-height:1.3;color:#1e305b;margin:22px 0 4px}
.sub{color:#64748b;font-size:12px;line-height:1.5;margin-bottom:12px}
.stack{width:100%;margin-bottom:8px}
.stack>tbody>tr>td{display:block;width:100%}
.meta{font-size:11px;line-height:1.7;color:#64748b;padding-top:4px}
.total-l{display:block;font-size:11px;color:#64748b}
.total-v{display:block;font-size:18px;color:#1e305b}
.k{border-radius:10px;padding:12px 10px}
.k-l{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;line-height:1.3;min-height:26px}
.k-v{display:block;font-size:22px;line-height:1.2;font-weight:700;color:#0f172a;margin:4px 0}
.k-n{display:block;font-size:10px;color:#64748b;line-height:1.3;min-height:26px}
.k-b{border-top:1px solid #d5dbe6;margin-top:8px;padding-top:6px}
.k-b td{padding:2px 0;font-size:11px;font-weight:700}
.split{width:100%}
.split>tbody>tr>td{display:block;width:100%}
.chart{text-align:center;padding:4px 0 16px}
.empty-chart{padding:24px 0;color:#64748b;font-size:13px;text-align:center}
.crow{width:100%;margin-bottom:14px}
.cname{font-weight:700;font-size:14px;color:#24324b;padding-bottom:6px}
.camt{text-align:right;font-size:14px;color:#24324b;padding-bottom:6px;white-space:nowrap}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle}
.cbar{background:#eef2ff;border-radius:4px;height:8px;overflow:hidden}
.cpct{width:54px;text-align:right;font-weight:700;color:#294995;font-size:13px}
.ctot{background:#eef2ff;border-radius:8px;padding:10px 12px;font-weight:700;color:#1e305b}
.ctot span{float:right}
.ctot:after{content:"";display:block;clear:both}
.rt{width:100%}
.rt thead{display:none}
.rt tbody,.rt tfoot,.rt tr,.rt td{display:block;width:100%}
.rt tr{border:1px solid #e5eaf4;border-radius:10px;margin:0 0 10px;overflow:hidden;background:#fff}
.rt td{padding:7px 12px;border-bottom:1px solid #eef1f8;text-align:right;font-size:13px;overflow:hidden}
.rt td:first-child{background:#eef2ff;text-align:left;font-weight:700;font-size:15px;color:#1e305b}
.rt td:last-child{border-bottom:0}
.rt td.empty{background:none;text-align:center;font-weight:400;font-size:13px;color:#64748b}
.rt tfoot tr{background:#eef2ff;border-color:#c7d2fe}
.rt tfoot td{background:none;border-bottom-color:#dde3f6}
.rt tfoot td:first-child{color:#1e305b}
.lbl{float:left;padding-right:12px;text-align:left;color:#64748b;font-weight:600;font-size:12px}
.c-pend{color:#a8384b}
.c-done{color:#277548}
.muted{color:#64748b}
.foot{font-size:12px;line-height:1.8;color:#64748b;padding:16px 4px 4px}
@media (min-width:621px){
.wrap{padding:24px 16px}
.hero{padding:28px 30px}
.hero h1{font-size:32px}
.g4{width:25%}
.g6{width:33.333%}
.kpi-v{font-size:20px}
.card,.contributors{padding:24px}
.card h2,.contributors h2{font-size:20px}
.stack>tbody>tr>td{display:table-cell;width:auto;vertical-align:bottom}
.meta{text-align:right;padding-top:0}
.split>tbody>tr>td{display:table-cell;width:auto;vertical-align:middle}
.split .chart{width:220px;padding:0 24px 0 0}
.rt thead{display:table-header-group}
.rt tbody{display:table-row-group}
.rt tfoot{display:table-footer-group}
.rt tr{display:table-row;border:0;border-radius:0;margin:0;overflow:visible;background:none}
.rt td,.rt th{display:table-cell;width:auto;padding:11px 9px;border-bottom:1px solid #e5eaf4;text-align:right;font-size:13px;overflow:visible}
.rt th{background:#eef2ff;color:#24324b;font-size:12px;font-weight:700}
.rt td:first-child,.rt th:first-child{text-align:left;background:none;font-size:13px;font-weight:600;color:inherit}
.rt th:first-child{background:#eef2ff}
.rt td:last-child{border-bottom:1px solid #e5eaf4}
.rt td.empty{text-align:center}
.rt tfoot tr{background:none}
.rt tfoot td,.rt tfoot td:first-child{background:#eef2ff;font-weight:700;border-bottom:0}
.lbl{display:none}
th.c-pend,td.c-pend{background:#fff0f1}
th.c-done,td.c-done{background:#eaf8ee}
}
@page{size:A4;margin:10mm}
@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}body{background:#fff}.wrap{padding:0}.rt tr{break-inside:avoid}.card,.contributors,.hero{break-inside:avoid}}`
export function exportSalesHTML(report:DailySalesReport,scope:string){
 const rows=scopedRows(report,scope),codes=scope==='ALL'?Object.keys(companies):[scope];
 const summary=callingSummary(report.calling,scope),employees=scopedEmployees(report.calling,scope)
 const contributors=salesContributors(rows)
 const totalSales=rows.reduce((n,r)=>n+(r.sales||0),0),totalCollection=rows.reduce((n,r)=>n+(r.collection||0),0)
 const totalUnverified=rows.reduce((n,r)=>n+(r.unverified||0),0),totalCancelled=rows.reduce((n,r)=>n+(r.cancelled||0),0)
  const palette=['#4f6de0','#9270cf','#31a2ad','#e4a04d','#dc7d9b','#6788a8']
  const donutChartHTML = buildSalesDonutSvg(report, scope) || '<div class="empty-chart">No sales</div>'
  const contributorRows=contributors.map((r,i)=>{
   const pct=(totalSales>0?r.sales/totalSales*100:0).toFixed(1),color=palette[i%palette.length]
   return `<table role="presentation" class="crow" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="cname"><span class="dot" style="background:${color}"></span>${esc(r.agent)}</td><td class="camt" align="right">${money(r.sales)}</td></tr><tr><td colspan="2"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><div class="cbar"><div style="background:${color};height:8px;width:${pct}%;border-radius:4px"></div></div></td><td class="cpct" width="54" align="right">${pct}%</td></tr></table></td></tr></table>`
  }).join('')
  const contributorHTML=`<section class="contributors"><table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><span class="eyebrow">SALES CONTRIBUTION</span><h2>Sales by contributor</h2><p class="sub" style="margin-bottom:0">${contributors.length} active agent${contributors.length===1?'':'s'} with positive sales · ${scope==='ALL'?'All companies':esc(companies[scope as Company])}</p></td><td class="meta"><span class="total-l">Total contributing sales</span><strong class="total-v">${money(totalSales)}</strong></td></tr></table><table role="presentation" class="split" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="chart">${donutChartHTML}</td><td>${contributorRows||'<p class="sub" style="text-align:center;margin:18px 0">No positive sales contributors recorded for this date.</p>'}${contributors.length?`<div class="ctot">Grand total<span>${money(totalSales)} · ${totalSales>0?'100%':'—'}</span></div>`:''}</td></tr></table></section>`
   const callingCards = [
     {
      label: 'AppSheet Pending',
      value: showCount(summary.pendingAppsheet),
      note: scope === 'ALL' ? 'AppSheet Pending · Employee totals' : 'Employee totals · ' + scope,
      bg: 'rgba(254, 243, 199, 0.45)',
      border: '2px solid #fcd34d',
      titleColor: '#b45309',
      breakdown: [
       { name: 'KAPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'pending') ?? 0), color: '#be185d' },
       { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'pending') ?? 0), color: '#059669' },
       { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'pending') ?? 0), color: '#d97706' },
      ],
     },
    {
     label: 'Pending leads National (Hopper)',
     value: showCount(summary.pendingNational),
     note: 'DialerPending · National total',
     bg: 'rgba(255, 237, 213, 0.45)',
     border: '2px solid #fdba74',
     titleColor: '#c2410c',
     breakdown: [
      { name: 'KAPPL', code: 'KAPPL', count: showCount(report.calling?.pending?.KAPPL?.national ?? 0), color: '#be185d' },
      { name: 'KTAHV', code: 'KTAHV', count: showCount(report.calling?.pending?.KTAHV?.national ?? 0), color: '#059669' },
      { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(report.calling?.pending?.VILLARAAG?.national ?? 0), color: '#d97706' },
     ],
    },
    {
     label: 'Pending leads International (Hopper)',
     value: showCount(summary.pendingInternational),
     note: 'DialerPending · International total',
     bg: 'rgba(245, 243, 255, 0.55)',
     border: '2px solid #c4b5fd',
     titleColor: '#6d28d9',
     breakdown: [
      { name: 'KAPPL', code: 'KAPPL', count: showCount(report.calling?.pending?.KAPPL?.international ?? 0), color: '#be185d' },
      { name: 'KTAHV', code: 'KTAHV', count: showCount(report.calling?.pending?.KTAHV?.international ?? 0), color: '#059669' },
      { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(report.calling?.pending?.VILLARAAG?.international ?? 0), color: '#d97706' },
     ],
    },
    {
     label: 'Calls Done (AppSheet)',
     value: showCount(summary.appsheet),
     note: scope === 'ALL' ? 'Live · column AI' : 'Employee totals · ' + scope,
     bg: 'rgba(239, 246, 255, 0.55)',
     border: '2px solid #93c5fd',
     titleColor: '#1d4ed8',
     breakdown: [
      { name: 'KAPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'appsheet') ?? 0), color: '#be185d' },
      { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'appsheet') ?? 0), color: '#059669' },
      { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'appsheet') ?? 0), color: '#d97706' },
     ],
    },
    {
     label: 'Calls Done (Dialer)',
     value: showCount(summary.dialer),
     note: scope === 'ALL' ? 'Live · column M' : 'Employee totals · ' + scope,
     bg: 'rgba(236, 254, 255, 0.55)',
     border: '2px solid #67e8f9',
     titleColor: '#0e7490',
     breakdown: [
      { name: 'KAPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'dialer') ?? 0), color: '#be185d' },
      { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'dialer') ?? 0), color: '#059669' },
      { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'dialer') ?? 0), color: '#d97706' },
     ],
    },
    {
     label: 'Total Calls Done',
     value: showCount(summary.done),
     note: 'All channels · AppSheet + Dialer',
     bg: 'rgba(236, 253, 245, 0.55)',
     border: '2px solid #6ee7b7',
     titleColor: '#047857',
     breakdown: [
      { name: 'KAPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'done') ?? 0), color: '#be185d' },
      { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'done') ?? 0), color: '#059669' },
      { name: 'VILLA RAAG', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'done') ?? 0), color: '#d97706' },
     ],
    },
   ]

  const pendingModeLabel = report.calling?.pendingMode === 'database' ? 'Database'
   : report.calling?.pendingMode === 'snapshot' ? 'Sheet snapshot (DialerPending)'
   : report.calling?.pendingMode === 'live' ? 'Live (DialerPending)'
   : (report.calling?.pendingMode || 'Unavailable')
  const pendingModeBadge = report.calling?.pendingMode === 'live' ? '🟢 Live' : report.calling?.pendingMode === 'database' ? '⚪ Database' : '🟡 Snapshot'
  const pendingDateLabel = report.calling?.pendingCapturedAt ? (new Date(report.calling.pendingCapturedAt).toLocaleString('en-GB',{timeZone:'Asia/Kolkata'}) + ' IST') : 'unavailable'
  const callsDoneDateLabel = summary.dates.join(', ') || 'unavailable'

  const callingCardsHTML=`<div class="grid">${callingCards.map(c=>`<div class="g6"><div class="k" style="background:${c.bg};border:${c.border}"><span class="k-l" style="color:${c.titleColor}">${esc(c.label)}</span><strong class="k-v">${esc(c.value)}</strong><span class="k-n">${esc(c.note)}</span><div class="k-b"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${c.breakdown.map(b=>{const dim=scope!=='ALL'&&scope!==b.code;return `<tr${dim?' style="opacity:.4"':''}><td style="color:${b.color}">${esc(b.name)}</td><td align="right" style="color:${b.color}">${esc(b.count)}</td></tr>`}).join('')}</table></div></div></div>`).join('')}</div>`

  const lbl=(text:string)=>`<span class="lbl">${text}</span>`
  const callingHeaders=[['Employee',''],['AppSheet pending','c-pend'],['AppSheet done','c-done'],['Dialer done','c-done'],['Total done','c-done'],['Completion %',''],['Updated (IST)','']]
  const employeeRows=employees.map(r=>{
   const pending=r.pending??0,done=r.done??0,denominator=done+pending
   const rate=(denominator>0&&r.pending!==null&&r.done!==null)?Math.round(done/denominator*100):null
   const rateColor=rate===null?'#64748b':rate>=70?'#16a34a':rate>=40?'#d97706':'#dc2626'
   const pendingStyle=pending>50?' style="background:#fff7ed;color:#c2410c;font-weight:600"':' style="font-weight:600"'
   return `<tr${r.done===0?' style="background:#fef9f9"':''}><td>${esc(r.name)}</td><td class="c-pend"${pendingStyle}>${lbl('AppSheet pending')}${showCount(r.pending)}</td><td class="c-done">${lbl('AppSheet done')}${showCount(r.appsheet)}</td><td class="c-done">${lbl('Dialer done')}${showCount(r.dialer)}</td><td class="c-done" style="font-weight:600">${lbl('Total done')}${showCount(r.done)}</td><td style="color:${rateColor};font-weight:600">${lbl('Completion %')}${rate===null?'—':rate+'%'}</td><td class="muted">${lbl('Updated (IST)')}${esc(r.updatedAt)}</td></tr>`
  }).join('')
  const callingHTML=`<section class="card">
   <table role="presentation" class="stack" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><span class="eyebrow">DAILY CALLING ACTIVITY</span><h2>Calling overview</h2></td><td class="meta"><strong style="font-weight:600">${pendingModeBadge}</strong> · ${esc(scope==='ALL'?'all companies':scope)} · ${esc(pendingDateLabel)}<br>Calls done: Live · ${esc(callsDoneDateLabel)}</td></tr></table>
   ${callingCardsHTML}
   <h3>Employee calling activity · ${esc(scope==='ALL'?'ALL':scope)}</h3>
   <p class="sub">Employees filtered by registered CRM company. Calling values retain their source dates.</p>
   <table class="rt calling" width="100%" cellpadding="0" cellspacing="0" border="0"><thead><tr>${callingHeaders.map(([t,c])=>`<th${c?` class="${c}"`:''}>${t}</th>`).join('')}</tr></thead><tbody>${employeeRows||'<tr><td class="empty" colspan="7">No employee calling data for this scope.</td></tr>'}</tbody><tfoot><tr><td>Grand total</td><td class="c-pend">${lbl('AppSheet pending')}${showCount(employeeTotal(employees,'pending'))}</td><td class="c-done">${lbl('AppSheet done')}${showCount(employeeTotal(employees,'appsheet'))}</td><td class="c-done">${lbl('Dialer done')}${showCount(employeeTotal(employees,'dialer'))}</td><td class="c-done">${lbl('Total done')}${showCount(employeeTotal(employees,'done'))}</td><td>${lbl('Completion %')}—</td><td>${lbl('Updated (IST)')}All employees</td></tr></tfoot></table>
  </section>`

  const agentHeaders=['Agent Name','Sales Quantity','UnVerified Sales Value','Collection Amount','Cancelled Qty','Cancelled Value']
  const companyHTML=codes.map(code=>{
   const list=rows.filter(r=>r.company===code)
   const sum=(pick:(r:SalesAgent)=>number|undefined|null)=>list.reduce((n,r)=>n+(Number(pick(r))||0),0)
   const cells=(qty:string,sales:string,collection:string,cancelledQty:string,cancelled:string)=>`<td>${lbl(agentHeaders[1])}${qty}</td><td>${lbl(agentHeaders[2])}${sales}</td><td>${lbl(agentHeaders[3])}${collection}</td><td>${lbl(agentHeaders[4])}${cancelledQty}</td><td>${lbl(agentHeaders[5])}${cancelled}</td>`
   const body=list.map(r=>`<tr><td>${esc(r.agent)}</td>${cells(r.conversions>0?showCount(r.conversions):'—',money(r.sales||0),money(r.collection||0),r.cancelledCount>0?showCount(r.cancelledCount):'—',money(r.cancelled||0))}</tr>`).join('')
   return `<section class="card"><h2>${esc(companies[code as Company])}</h2><table class="rt" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><thead><tr>${agentHeaders.map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${body||'<tr><td class="empty" colspan="6">No sales or collection activity for this date.</td></tr>'}</tbody><tfoot><tr><td>Grand total</td>${cells(showCount(sum(r=>r.conversions)),money(sum(r=>r.sales)),money(sum(r=>r.collection)),showCount(sum(r=>r.cancelledCount)),money(sum(r=>r.cancelled)))}</tr></tfoot></table></section>`
  }).join('')

  const kpis:[string,string][]=[['Sales value',money(totalSales)],['Collection',money(totalCollection)],['Unverified',money(totalUnverified)],['Cancelled',money(totalCancelled)]]
  const scopeName=scope==='ALL'?'All companies':esc(companies[scope as Company])
  const preheader=`Sales ${money(totalSales)} · Collection ${money(totalCollection)} · ${dayLabel(report.date)}`

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Daily Sales Report Alert · ${esc(report.date)}</title><style>${SALES_EMAIL_CSS}</style></head><body style="margin:0;padding:0;background:#f4f6fc;color:#24324b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fc">${esc(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f4f6fc"><tr><td align="center" class="wrap" style="padding:12px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:800px;text-align:left"><tr><td><!--email-intro--><header class="hero" style="background:#1e305b;color:#ffffff;border-radius:14px;padding:20px 16px"><div class="brand">KAIRALI GROUP · SALES BRIEFING</div><h1>Daily Sales Report Alert</h1><p class="hero-sub">${esc(dayLabel(report.date))} · IST<br>${scopeName}</p><div class="grid">${kpis.map(([k,v])=>`<div class="g4"><div class="kpi"><span class="kpi-l">${k}</span><strong class="kpi-v">${v}</strong></div></div>`).join('')}</div><p class="hero-note">Sales contributors ${contributors.length}</p></header>${callingHTML}${contributorHTML}${companyHTML}<!--email-closing--><div class="foot">Prepared for Sales Team &amp; Management · Generated ${esc(report.generatedAt)} · Amounts in INR</div></td></tr></table></td></tr></table></body></html>`
}

export function buildSalesDonutSvg(report:DailySalesReport,scope:string):string{
 const rows=scopedRows(report,scope),contributors=salesContributors(rows)
 const totalSales=rows.reduce((n,r)=>n+r.sales,0)
 if(totalSales<=0)return ''
 const palette=['#4f6de0','#9270cf','#31a2ad','#e4a04d','#dc7d9b','#6788a8']
 const slices=contributors.filter(c=>c.sales>0).map((c,i)=>({v:c.sales,col:palette[i%palette.length]}))
 const cx=95,cy=95,r=62,sw=22,circ=2*Math.PI*r
 let off=circ/4
 const arcs=slices.map(s=>{const len=(s.v/totalSales)*circ;const a=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.col}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${circ.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"/>`;off-=len;return a})
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 190" width="190" height="190" style="display:block;margin:0 auto" role="img" aria-label="ALL CONTRIBUTORS · Sales contribution donut chart"><title>ALL CONTRIBUTORS · Sales contribution donut chart</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/>${arcs.join('')}<text x="${cx}" y="${cy-7}" text-anchor="middle" font-size="11" fill="#64748b" font-family="Arial,sans-serif">Sales</text><text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="15" fill="#1e305b" font-weight="bold" font-family="Arial,sans-serif">${contributors.length}</text><text x="${cx}" y="${cy+27}" text-anchor="middle" font-size="10" fill="#64748b" font-family="Arial,sans-serif">${contributors.length===1?'contributor':'contributors'}</text></svg>`
}
