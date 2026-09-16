const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),path=require('node:path'),Module=require('node:module');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.paths=module.paths;m.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports}
const model=load('lib/daily-sales-report.ts'),query=load('lib/daily-sales-report-query.ts');
test('dates reject injection and impossible days, handle leap years',()=>{for(const d of ['2026-02-29','2026-13-01',"2026-09-11' OR 1=1",''])assert.throws(()=>query.reportWindow(d));assert.deepEqual(query.reportWindow('2024-02-29'),['2024-02-29','2024-03-01'])});
test('scoping, same-agent grouping and unavailable metrics stay truthful',()=>{const r=model.combineSales('2026-09-11',[{company:'KTAHV',agent:'Agent',verified:100,unverified:20,cancelled:30,conversions:1},{company:'KAPPL',agent:'Agent',verified:200}], [{company:'KTAHV',agent:'agent',dialer:10},{company:'UNMAPPED',agent:'x',dialer:3}]);assert.equal(r.rows.length,2);assert.equal(r.unmappedCalls,3);const a=model.scopedRows(r,'KTAHV')[0];assert.equal(a.dialer,10);assert.equal(a.pending,null);assert.equal(a.done,null);assert.equal(a.sales,100);assert.throws(()=>model.scopedRows(r,'__proto__'))});
test('exports preserve company, date, coverage and escape agent names',()=>{const r=model.combineSales('2026-09-11',[{company:'KTAHV',agent:'<script>alert(1)</script>',verified:100,conversions:2},{company:'KAPPL',agent:'OTHER COMPANY',verified:200}],[]);const html=model.exportSalesHTML(r,'KTAHV');assert(html.includes('11 September 2026'));assert(!html.includes('OTHER COMPANY'));assert(html.includes('&lt;script&gt;'));assert(!html.includes('<script>'));assert(html.includes('unavailable'));assert(html.includes('Pending leads'));assert(html.includes('Sales Quantity'));assert(html.includes('<td>2</td>'))});
test('sales quantity reflects contributing record count and grand total equals agent sum across companies',()=>{
 const sales=[
  {company:'KTAHV',agent:'Pawan',verified:150000,cancelled:0,conversions:2},
  {company:'KTAHV',agent:'Pawan',verified:50000,cancelled:0,conversions:1},
  {company:'KTAHV',agent:'Pawan',verified:0,cancelled:20000,conversions:0},
  {company:'KTAHV',agent:'Roshni',verified:80000,cancelled:0,conversions:1},
  {company:'VILLARAAG',agent:'Pawan',verified:60000,cancelled:0,conversions:3},
  {company:'KAPPL',agent:'Zaid',verified:120000,cancelled:0,conversions:5},
  {company:'KAPPL',agent:'Sanjay',verified:0,cancelled:5000,conversions:0}
 ];
 const report=model.combineSales('2026-09-15',sales,[]);
 const ktahv=model.scopedRows(report,'KTAHV');
 const pawan=ktahv.find(r=>r.agent==='Pawan');
 assert.equal(pawan.conversions,3);
 assert.equal(pawan.quantity,3);
 assert.equal(pawan.sales,200000);
 assert.equal(pawan.cancelled,20000);
 const roshni=ktahv.find(r=>r.agent==='Roshni');
 assert.equal(roshni.conversions,1);
 assert.equal(roshni.quantity,1);
 const ktahvTotalQty=ktahv.reduce((n,r)=>n+r.quantity,0);
 assert.equal(ktahvTotalQty,4);

 const vr=model.scopedRows(report,'VILLARAAG');
 assert.equal(vr[0].quantity,3);
 assert.equal(vr.reduce((n,r)=>n+r.quantity,0),3);

 const kappl=model.scopedRows(report,'KAPPL');
 const zaid=kappl.find(r=>r.agent==='Zaid');
 assert.equal(zaid.quantity,5);
 const sanjay=kappl.find(r=>r.agent==='Sanjay');
 assert.equal(sanjay.quantity,0);
 assert.equal(kappl.reduce((n,r)=>n+r.quantity,0),5);

 const html=model.exportSalesHTML(report,'ALL');
 assert(html.includes('<th>Agent Name</th><th>Sales Quantity</th><th>Sales Value</th><th>Cancelled Qty</th><th>Cancelled Value</th>'));
});
test('salesDetails attach to agent rows and export renders clean sales quantity without PI badge',()=>{
 const sales=[
  {company:'KTAHV',agent:'Pawan',verified:100000,conversions:1,salesDetails:[{id:'RES-1',date:'2026-09-15 11:30',clientName:'John Doe',piNumber:'PI-1',piLink:'https://example.com/pi1',amount:100000,agent:'Pawan'}],piLinks:[{id:'RES-1',piNumber:'PI-1',url:'https://example.com/pi1'}]},
  {company:'KTAHV',agent:'Sadik',verified:200000,conversions:2,salesDetails:[
    {id:'RES-2',date:'2026-09-15 12:00',clientName:'Jane Smith',piNumber:'PI-2',piLink:'https://example.com/pi2',amount:120000,agent:'Sadik'},
    {id:'RES-3',date:'2026-09-15 15:45',clientName:'Bob Ross',piNumber:'PI-3',piLink:null,amount:80000,agent:'Sadik'}
  ],piLinks:[
    {id:'RES-2',piNumber:'PI-2',url:'https://example.com/pi2'}
  ]}
 ];
 const report=model.combineSales('2026-09-15',sales,[]);
 const pawan=model.scopedRows(report,'KTAHV').find(r=>r.agent==='Pawan');
 assert.equal(pawan.salesDetails.length,1);
 assert.equal(pawan.salesDetails[0].clientName,'John Doe');
 assert.equal(pawan.salesDetails[0].piLink,'https://example.com/pi1');
 const sadik=model.scopedRows(report,'KTAHV').find(r=>r.agent==='Sadik');
 assert.equal(sadik.salesDetails.length,2);
 assert.equal(sadik.salesDetails[1].clientName,'Bob Ross');
 assert.equal(sadik.salesDetails[1].piLink,null);

 const html=model.exportSalesHTML(report,'KTAHV');
 assert(!html.includes('PI ↗'));
 assert(!html.includes('2 PIs'));
 assert(html.includes('<td>1</td>'));
 assert(html.includes('<td>2</td>'));
});
module.exports={load};
