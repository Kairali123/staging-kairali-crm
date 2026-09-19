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
export function exportSalesHTML(report:DailySalesReport,scope:string){
 const rows=scopedRows(report,scope),codes=scope==='ALL'?Object.keys(companies):[scope];
 const summary=callingSummary(report.calling,scope),employees=scopedEmployees(report.calling,scope)
 const contributors=salesContributors(rows)
 const totalSales=rows.reduce((n,r)=>n+r.sales,0),totalCollection=rows.reduce((n,r)=>n+r.collection,0)
 const totalUnverified=rows.reduce((n,r)=>n+r.unverified,0),totalCancelled=rows.reduce((n,r)=>n+r.cancelled,0)
 const palette=['#4f6de0','#9270cf','#31a2ad','#e4a04d','#dc7d9b','#6788a8']
 // Build an email-safe donut chart using QuickChart.io (img tag, works in Gmail/Outlook).
 // SVG is stripped by most email clients, so we use a PNG image from a chart URL service.
 const donutChartHTML = buildSalesDonutSvg(report, scope) || `<div style="width:190px;margin:0 auto;text-align:center;padding:32px 0;color:#64748b;font-size:13px">No sales</div>`
 const contributorRows=contributors.map((r,i)=>{
  const fraction=totalSales>0?r.sales/totalSales:0,pct=(fraction*100).toFixed(1),color=palette[i%palette.length]
  return `<tr><td style="text-align:left"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;vertical-align:middle"></span><strong>${esc(r.agent)}</strong></td><td style="text-align:right">${money(r.sales)}</td><td style="text-align:right;font-weight:bold;color:#294995">${pct}%</td><td style="text-align:left;width:140px"><div style="background:#eef2ff;border-radius:4px;height:8px;width:100%;overflow:hidden"><div style="background:${color};height:8px;width:${pct}%;border-radius:4px"></div></div></td></tr>`
 }).join('')
 const contributorHTML=`<section class="contributors"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px"><div><span style="font-size:10px;letter-spacing:1.6px;color:#4338ca;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">SALES CONTRIBUTION</span><h2 style="margin:0 0 4px;font-size:20px">Sales by contributor</h2><p style="margin:0;color:#64748b;font-size:12px">${contributors.length} active agent${contributors.length===1?'':'s'} with positive sales · ${scope==='ALL'?'All companies':esc(companies[scope as Company])}</p></div><div style="text-align:right"><span style="font-size:11px;color:#64748b;display:block">Total contributing sales</span><strong style="font-size:18px;color:#1e305b">${money(totalSales)}</strong></div></div><div class="contributorLayout"><div class="contributorChart">${donutChartHTML}</div><div class="contributorTableWrap"><table class="contributorTable"><thead><tr><th style="text-align:left">Employee</th><th style="text-align:right">Total Sales (INR)</th><th style="text-align:right">Contribution</th><th style="text-align:left">Share</th></tr></thead><tbody>${contributorRows||'<tr><td colspan="4" style="text-align:center;padding:18px;color:#64748b">No positive sales contributors recorded for this date.</td></tr>'}</tbody><tfoot><tr><td style="text-align:left">Grand total</td><td style="text-align:right">${money(totalSales)}</td><td style="text-align:right">${totalSales>0?'100%':'—'}</td><td></td></tr></tfoot></table></div></div></section>`
 const callingCards = [
  {
   label: 'AppSheet Pending',
   value: showCount(summary.pendingAppsheet),
   note: 'AppSheet Pending · AppSheet total',
   isPending: true,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(report.calling?.pending?.KAPPL?.appsheet ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(report.calling?.pending?.KTAHV?.appsheet ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(report.calling?.pending?.VILLARAAG?.appsheet ?? 0) },
   ],
  },
  {
   label: 'Pending leads National (Hopper)',
   value: showCount(summary.pendingNational),
   note: 'DialerPending · National total',
   isPending: true,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(report.calling?.pending?.KAPPL?.national ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(report.calling?.pending?.KTAHV?.national ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(report.calling?.pending?.VILLARAAG?.national ?? 0) },
   ],
  },
  {
   label: 'Pending leads International (Hopper)',
   value: showCount(summary.pendingInternational),
   note: 'DialerPending · International total',
   isPending: true,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(report.calling?.pending?.KAPPL?.international ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(report.calling?.pending?.KTAHV?.international ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(report.calling?.pending?.VILLARAAG?.international ?? 0) },
   ],
  },
  {
   label: 'Calls Done (AppSheet)',
   value: showCount(summary.appsheet),
   note: scope === 'ALL' ? 'Live · column AI' : 'Employee totals · ' + scope,
   isPending: false,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'appsheet') ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'appsheet') ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'appsheet') ?? 0) },
   ],
  },
  {
   label: 'Calls Done (Dialer)',
   value: showCount(summary.dialer),
   note: scope === 'ALL' ? 'Live · column M' : 'Employee totals · ' + scope,
   isPending: false,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'dialer') ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'dialer') ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'dialer') ?? 0) },
   ],
  },
  {
   label: 'Total Calls Done',
   value: showCount(summary.done),
   note: 'All channels · AppSheet + Dialer',
   isPending: false,
   breakdown: [
    { name: 'KPPL', code: 'KAPPL', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KAPPL'), 'done') ?? 0) },
    { name: 'KTAHV', code: 'KTAHV', count: showCount(employeeTotal(scopedEmployees(report.calling, 'KTAHV'), 'done') ?? 0) },
    { name: 'Villaraag', code: 'VILLARAAG', count: showCount(employeeTotal(scopedEmployees(report.calling, 'VILLARAAG'), 'done') ?? 0) },
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

 const callingCardsHTML = `<div class="callingGrid" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin:16px 0 24px">
  ${callingCards.map(c => {
   const bg = c.isPending ? '#fff8ed' : '#edf7ff'
   const borderTop = c.isPending ? '3px solid #d89a38' : '3px solid #458ecc'
   const border = c.isPending ? '1px solid #f2e2c8' : '1px solid #cfe5f8'
   const numColor = c.isPending ? '#9b620d' : '#256a9c'
   const dividerColor = c.isPending ? '#fde68a' : '#bfdbfe'
   return `<div style="background:${bg};border:${border};border-top:${borderTop};border-radius:12px;padding:16px 12px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
    <div>
     <span style="font-size:11px;color:#52627f;font-weight:600;display:block">${esc(c.label)}</span>
     <strong style="display:block;font:26px Georgia,serif;font-weight:700;color:${numColor};margin:10px 0 6px">${esc(c.value)}</strong>
     <small style="font-size:9px;color:#6e7c94;display:block;margin-bottom:14px;line-height:1.4">${esc(c.note)}</small>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${dividerColor};padding-top:10px;margin-top:auto">
     ${c.breakdown.map((b, idx) => {
      const isDim = scope !== 'ALL' && scope !== b.code
      const borderLeft = idx > 0 ? `border-left:1px solid ${dividerColor};` : ''
      return `<div style="flex:1;text-align:center;padding:2px 4px;${borderLeft}${isDim ? 'opacity:0.4;' : ''}">
       <span style="font-size:11px;font-weight:600;color:#24324b;display:block;margin-bottom:4px">${esc(b.name)}</span>
       <strong style="font:17px Georgia,serif;font-weight:700;color:${numColor};display:block;margin:0">${esc(b.count)}</strong>
      </div>`
     }).join('')}
    </div>
   </div>`
  }).join('')}
 </div>`

 const callingHeaders=['Employee','AppSheet pending','AppSheet done','Dialer done','Total done','Completion %','Updated (IST)']
 const callingThStyles=['text-align:left;background:#eef2ff','text-align:right;background:#fff0f1;color:#a8384b','text-align:right;background:#eaf8ee;color:#277548','text-align:right;background:#eaf8ee;color:#277548','text-align:right;background:#eaf8ee;color:#277548','text-align:right;background:#eef2ff','text-align:right;background:#eef2ff']
 const callingHTML=`<section>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:14px">
   <div><span style="font-size:10px;letter-spacing:1.6px;color:#4338ca;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">DAILY CALLING ACTIVITY</span><h2 style="margin:0 0 4px;font-size:20px;color:#1e305b">Calling overview</h2></div>
   <div style="text-align:right;font-size:11px;line-height:1.7;color:#64748b">
    <span><strong style="font-weight:600">${pendingModeBadge}</strong> · ${esc(scope==='ALL'?'all companies':scope)} · ${esc(pendingDateLabel)}</span><br>
    <span>Calls done: Live · ${esc(callsDoneDateLabel)}</span>
   </div>
  </div>
  ${callingCardsHTML}
  <h2 style="margin:26px 0 6px;font-size:18px;color:#1e305b">Employee calling activity · ${esc(scope==='ALL'?'ALL':scope)}</h2>
  <p style="margin:0 0 14px;color:#64748b;font-size:12px">Employees filtered by registered CRM company. Calling values retain their source dates.</p>
  <table class="calling"><thead><tr>${callingHeaders.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${employees.map(r=>(()=>{const _ep=r.pending??0,_ed=r.done??0,_eDen=_ed+_ep,empRate=(_eDen>0&&r.pending!==null&&r.done!==null)?Math.round(_ed/_eDen*100):null,empRateStr=empRate===null?'—':empRate+'%',empRateColor=empRate===null?'#64748b':empRate>=70?'#16a34a':empRate>=40?'#d97706':'#dc2626',rowBg=r.done===0?'style="background:#fef9f9"':'',pendOverride=_ep>50?'style="background:#fff7ed"':'';return`<tr ${rowBg}><td>${esc(r.name)}</td><td ${pendOverride}>${showCount(r.pending)}</td><td>${showCount(r.appsheet)}</td><td>${showCount(r.dialer)}</td><td>${showCount(r.done)}</td><td style="color:${empRateColor}">${empRateStr}</td><td class="muted">${esc(r.updatedAt)}</td></tr>`})()).join('')}</tbody><tfoot><tr style="font-weight:bold;background:#eef2ff"><td>Grand total</td><td>${showCount(employeeTotal(employees,'pending'))}</td><td>${showCount(employeeTotal(employees,'appsheet'))}</td><td>${showCount(employeeTotal(employees,'dialer'))}</td><td>${showCount(employeeTotal(employees,'done'))}</td><td>—</td><td>All employees</td></tr></tfoot></table>
 </section>`

 return `<!doctype html><html><head><meta charset="utf-8"><title>Daily Sales Report Alert · ${esc(report.date)}</title><style>body{margin:0;background:#f4f6fc;color:#24324b;font:14px Arial}main{padding:28px;max-width:1344px;margin:auto}header{background:#1e305b;color:white;padding:30px;border-radius:16px}h1{font:34px Georgia}h2{font-size:20px}section{background:white;padding:24px;margin-top:20px;border:1px solid #e0e5f1;border-radius:12px}table{width:100%;border-collapse:collapse}th,td{text-align:right;padding:13px 9px;border-bottom:1px solid #e5eaf4}th:first-child,td:first-child{text-align:left}.calling th:nth-child(2),.calling td:nth-child(2){background:#fff0f1;color:#a8384b}.calling td:nth-child(2){font-weight:600}.calling th:nth-child(3),.calling th:nth-child(4),.calling th:nth-child(5),.calling td:nth-child(3),.calling td:nth-child(4){background:#eaf8ee;color:#277548}.calling td:nth-child(5){background:#eaf8ee;color:#277548;font-weight:600}tfoot{background:#eef2ff;font-weight:bold}th{font-size:12px;background:#eef2ff}p{line-height:1.6}.muted{color:#64748b}footer{font-size:12px;line-height:1.8;margin-top:20px}.contributorLayout{display:flex;flex-wrap:wrap;align-items:center;gap:24px}.contributorChart{flex:0 0 240px;text-align:center;margin:auto}.contributorTableWrap{flex:1;min-width:320px;overflow-x:auto}.contributorTable{width:100%;border-collapse:collapse}@media(max-width:1100px){.callingGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}@media(max-width:650px){.callingGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@page{size:A4 landscape;margin:10mm}@media print{*{print-color-adjust:exact;-webkit-print-color-adjust:exact}main{padding:0}tr{break-inside:avoid}}</style></head><body><main><header><div>KAIRALI GROUP · SALES BRIEFING</div><h1>Daily Sales Report Alert</h1><p>${esc(dayLabel(report.date))} · IST<br>${scope==='ALL'?'All companies':esc(companies[scope as Company])}</p><h2>Sales value ${money(totalSales)} · Collection ${money(totalCollection)}</h2><p>Unverified ${money(totalUnverified)} · Cancelled ${money(totalCancelled)} · Sales contributors ${contributors.length}</p></header>${callingHTML}${contributorHTML}${codes.map(code=>`<section><h2>${esc(companies[code as Company])}</h2><table><thead><tr>${['Agent Name','Sales Quantity','UnVerified Sales Value','Collection Amount','Cancelled Qty','Cancelled Value'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.filter(r=>r.company===code).map(r=>`<tr><td>${esc(r.agent)}</td><td>${showCount(r.conversions)}</td><td>${money(r.sales)}</td><td>${money(r.collection)}</td><td>${showCount(r.cancelledCount)}</td><td>${money(r.cancelled)}</td></tr>`).join('')||'<tr><td colspan="6">No sales or collection activity for this date.</td></tr>'}</tbody><tfoot><tr><td>Grand total</td><td>${showCount(rows.filter(r=>r.company===code).reduce((n,r)=>n+r.conversions,0))}</td><td>${money(rows.filter(r=>r.company===code).reduce((n,r)=>n+r.sales,0))}</td><td>${money(rows.filter(r=>r.company===code).reduce((n,r)=>n+r.collection,0))}</td><td>${showCount(rows.filter(r=>r.company===code).reduce((n,r)=>n+(r.cancelledCount||0),0))}</td><td>${money(rows.filter(r=>r.company===code).reduce((n,r)=>n+r.cancelled,0))}</td></tr></tfoot></table></section>`).join('')}<footer>Prepared for Sales Team & Management · Generated ${esc(report.generatedAt)} · Amounts in INR</footer></main></body></html>`
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
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 190" width="190" height="190" style="display:block;margin:0 auto"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/>${arcs.join('')}<text x="${cx}" y="${cy-7}" text-anchor="middle" font-size="11" fill="#64748b" font-family="Arial,sans-serif">Sales</text><text x="${cx}" y="${cy+12}" text-anchor="middle" font-size="15" fill="#1e305b" font-weight="bold" font-family="Arial,sans-serif">${contributors.length}</text><text x="${cx}" y="${cy+27}" text-anchor="middle" font-size="10" fill="#64748b" font-family="Arial,sans-serif">contributors</text></svg>`
}
