import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reportWindow, combineReport } from '../lib/marketing-report-query.ts'
import { reportHTML } from '../lib/marketing-daily-report.ts'

test('rejects impossible and injected dates, handles leap day',()=>{
  for(const value of ['2026-02-29','2026-13-01','2026-09-10\' OR 1=1','']) assert.throws(()=>reportWindow(value))
  assert.deepEqual(reportWindow('2024-02-29'),['2024-02-29','2024-03-01'])
})
test('keeps companies separate and includes sources appearing only in spend or sales',()=>{
  const report=combineReport('2026-09-10',[],[{company:'KTAHV',source:'Google',records:1,spend:'100.25'}],[{company:'KTAHV',source:'Referral',records:1,conversions:1,verified:'500.50',unverified:20,cancelled:10},{company:'KAPPL',source:'Google',records:1,conversions:2,verified:300}],0)
  assert.equal(report.companies[0].totalSpend,100.25*1.18)
  assert.equal(report.companies[0].sale,500.50)
  assert.equal(report.companies[2].sale,300)
  assert.deepEqual(report.companies[0].sources,['Google','Referral'])
  assert.equal(report.companies[0].unverified,20)
  assert.equal(report.companies[0].cancelled,10)
})
test('incomplete feeds and duplicate bookings cannot get a verified status',()=>{
  const report=combineReport('2026-09-10',[],[],[],1)
  assert.equal(report.status,'needs-reconciliation')
  assert(report.warnings.some(w=>w.includes('identifiers')))
  assert(report.warnings.some(w=>w.includes('absence does not confirm zero')))
})
test('live renderer never inserts demo sales, escapes source text and preserves zero denominators',()=>{
  const report=combineReport('2026-09-10',[],[],[{company:'KTAHV',source:'</script><script>alert(1)</script>',records:1,conversions:0,verified:0}],0)
  const html=reportHTML(report.date,report)
  assert(!html.includes('573471'))
  assert(!html.includes('NaN'))
  assert(!html.includes('Infinity'))
  assert(!html.includes('</script><script>alert(1)'))
  assert(html.includes('Lead quality is unavailable'))
  assert(html.includes('Reconciliation pending'))
})

test('assignment Intent rules preserve unclassified leads and normalize source buckets',()=>{
 const report=combineReport('2026-09-10',[],[],[],0,[{company:'KTAHV',source:' google ',records:4,leads:4,high:1,medium:1,low:1,unclassified:1},{company:'KTAHV',source:'GOOGLE',records:1,leads:1,high:1,medium:0,low:0,unclassified:0}])
 assert.equal(report.companies[0].totalLeads,5)
 assert.deepEqual(report.companies[0].high,[2])
 assert.deepEqual(report.companies[0].low,[1])
 assert.equal(report.companies[0].qualityAvailable,true)
 assert(report.warnings.some(w=>w.includes('Intent')))
 assert(!reportHTML(report.date,report).includes('Lead quality is unavailable'))
})

test('CAC uses lead denominator consistently even with no verified conversions',()=>{
 const report=combineReport('2026-09-10',[],[{company:'KTAHV',source:'Website',records:1,spend:120}],[],0,[{company:'KTAHV',source:'Website',records:4,leads:4,high:4,medium:0,low:0}])
 const html=reportHTML(report.date,report)
 assert(html.includes('CAC ₹30.00'))
 assert(html.includes('<td>120.00</td><td>0</td><td>0.00</td><td>0.00×</td><td>30.00</td>'))
 assert(html.includes('c.leads?currency(c.spend/c.leads)'))
 assert(!html.includes('spend/c.conversions'))
 assert(!html.includes('Infinity'))
})
