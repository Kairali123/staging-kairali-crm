const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module')
const m=new Module(__filename,module);m._compile(ts.transpileModule(fs.readFileSync('lib/good-lead-leakage-view.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,__filename)
const {sumRows,groupRows,quickRange,percent}=m.exports
const rows=[{company:'KTAHV',source:'Google',owner:'Same owner',cold:'10',manualReopened:'2',aiReopened:'1',reopened:'2',bothReopened:'1'},{company:'KAPPL',source:'Google',owner:'Same owner',cold:'20',manualReopened:'3',aiReopened:'0',reopened:'3'},{company:'KTAHV',source:'Google',owner:'__proto__',cold:'5',manualReopened:'1',aiReopened:'0',reopened:'1'}]
assert.equal(sumRows(rows).cold,35);assert.equal(sumRows(rows).manualReopened,6);assert.equal(sumRows([]).cold,0)
assert.equal(groupRows(rows,'source').length,2);assert.equal(groupRows(rows,'owner').length,3)
for(const dim of ['source','owner','company'])assert.equal(groupRows(rows,dim).reduce((n,r)=>n+r.cold,0),35)
assert.equal(percent(2,10),'20.0');assert.equal(percent(0,0),'0.0')
assert.deepEqual(quickRange('previous',new Date('2026-01-05T08:00:00Z')),{from:'2025-12-01',to:'2025-12-31'})
assert.deepEqual(quickRange('previous',new Date('2024-03-05T08:00:00Z')),{from:'2024-02-01',to:'2024-02-29'})
assert.deepEqual(quickRange('week',new Date('2026-09-11T19:00:00Z')),{from:'2026-09-06',to:'2026-09-12'})
console.log('PASS: numeric SQL values, empty totals, company-safe grouping, unusual owner names, percentages, leap year/year boundary and IST presets')
