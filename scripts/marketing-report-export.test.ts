import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reportHTML,reportExportHTML,displayDate,validateReportView,type ReportData} from '../lib/marketing-daily-report.ts'
import {signReportSnapshot,readReportSnapshot,parseReportRecipients} from '../lib/marketing-report-email.ts'
const base={description:'',traffic:100,sources:['Unique source'],leads:[5],high:[3],medium:[1],low:[1],trafficBySource:[100],spend:[100],sale:400,bookings:2,totalLeads:5,totalSpend:100,liveSales:[{source:'Unique source',spend:100,conversions:2,verified:400,unverified:12,cancelled:0}]}
const data:ReportData={date:'2026-09-11',companies:[{...base,name:'KTAHV'},{...base,name:'KAPPL',totalLeads:7}]}
test('date has explicit weekday and management output excludes technical diagnostics',()=>{
 assert.equal(displayDate('2026-09-11'),'11 September 2026 (Friday)')
 const html=reportHTML(data.date!,{...data,warnings:['Reconciliation pending','secret diagnostic']})
 assert(!html.includes('secret diagnostic'));assert(!html.includes('Reconciliation pending'))
 assert(html.includes('data-overview="KTAHV"'));assert(html.includes('Download JPG'))
})
test('all company summary export omits every source row and retains identity/date',()=>{
 const html=reportExportHTML(data.date!,data,{scope:'all',expanded:[]})
 assert(!html.includes('Unique source'));assert(!html.includes('<script'))
 assert(html.includes('11 September 2026 (Friday)'));assert(html.includes('KTAHV'));assert(html.includes('KAPPL'))
})
test('mixed expansion and company export preserve only selected source sections',()=>{
 const html=reportExportHTML(data.date!,data,{scope:'KTAHV',expanded:['KTAHV-sales','KAPPL-leads']})
 assert.equal(html.split('Unique source').length-1,1)
 assert(!html.includes('KAPPL'));assert(html.includes('KAIRALI GROUP'));assert(html.includes('COMPANY PERFORMANCE'))
 assert.throws(()=>validateReportView(data,{scope:'unknown',expanded:[]}))
 assert.throws(()=>validateReportView(data,{scope:'all',expanded:['KTAHV-unknown']}))
})
test('snapshot integrity binds exact report to session and rejects tampering/expiry',()=>{
 process.env.NEXTAUTH_SECRET='test-key-only-never-a-production-secret'
 const token=signReportSnapshot(data,'session-one')!
 assert.deepEqual(readReportSnapshot(token,'session-one'),data)
 assert.throws(()=>readReportSnapshot(token,'session-two'))
 assert.throws(()=>readReportSnapshot(token.replace(/^./,token[0]==='a'?'b':'a'),'session-one'))
 const now=Date.now;Date.now=()=>now()+3600001
 try{assert.throws(()=>readReportSnapshot(token,'session-one'))}finally{Date.now=now}
})
test('recipient validation prevents headers and malformed or excessive addresses',()=>{
 assert.deepEqual(parseReportRecipients('one@example.com; two@example.com, one@example.com'),['one@example.com','two@example.com'])
 for(const invalid of ['', 'a@example.com\r\nBcc: b@example.com','<a@example.com>','not-an-email'])assert.throws(()=>parseReportRecipients(invalid))
})
