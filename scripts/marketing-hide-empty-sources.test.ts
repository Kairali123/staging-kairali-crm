// npx tsx --test scripts/marketing-hide-empty-sources.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { hasActivity, reportExportHTML, demoCompanies } from '../lib/marketing-daily-report'

const L = ['Source','Total traffic','Leads / traffic','Total leads','High quality','Medium quality','Low quality','Spend (₹)','CAC (₹)']
const S = ['Source','Spent (₹)','Conversions','Verified sales (₹)','ROAS','CAC (₹)','Unverified sales (₹)','Cancelled booking (₹)']
const kept = (headers: string[], rows: (string | number)[][]) => rows.filter(r => hasActivity(headers, r)).map(r => r[0])

test('KTAHV lead rows (2026-09-27 email): only the all-zero source is hidden', () => {
  assert.deepEqual(kept(L, [
    ['CRR','—','—',2,'0 -- 0%','2 -- 100%','0 -- 0%','3,333.00','1,666.50'],
    ['Facebook','79','153%',121,'121 -- 100%','0 -- 0%','0 -- 0%','11,828.36','97.76'],
    ['IVR','—','—',27,'1 -- 4%','4 -- 15%','22 -- 81%','333.00','12.33'],
    ['Priyasharma AI-Facebook','—','—',0,'0 -- —','0 -- —','0 -- —','833.00','—'],
    ['Priyasharma AI-Web','—','—',3,'1 -- 33%','2 -- 67%','0 -- 0%','833.00','277.67'],
  ]), ['CRR','Facebook','IVR','Priyasharma AI-Web'])
})

test('sales rows: spend, CAC and 0.00× ROAS alone do not keep a row', () => {
  assert.deepEqual(kept(S, [
    ['Priyasharma AI-Web','833.00',0,'0.00','0.00×','277.67','0.00','0.00'],
    ['Website','3,333.00',0,'0.00','0.00×','416.63','5,143.60','0.00'],
    ['CRR','3,333.00',1,'50,000.00','15.00×','1,666.50','0.00','0.00'],
  ]), ['Website','CRR'])
})

test('exactly "Google" and "Facebook" always stay; names merely containing them do not', () => {
  const zero = (s: string) => [s,'0.00',0,'0.00','—','—','0.00','0.00']
  assert.deepEqual(kept(S, [zero('Google'), zero('Facebook'), zero('Priyasharma AI-Facebook'), zero('Google PPC')]), ['Google','Facebook'])
})

test('exported source-wise table drops empty sources', () => {
  const data = { companies: demoCompanies('2026-09-27') }
  const html = reportExportHTML('2026-09-27', data, { scope: 'VILARAAG', expanded: ['VILARAAG-leads'] })
  assert.ok(html.includes('>Facebook + Instagram<'))
  assert.ok(!html.includes('>Anjali Menon - chat bot<'))
})
