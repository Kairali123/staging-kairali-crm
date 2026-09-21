const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http'),ts=require('typescript'),Module=require('node:module');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.paths=module.paths;m.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name)+'.ts'):require(name);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports}

const emp=(company,planned,actual,newPlanned=0,oldPlanned=0,newActual=0,oldActual=0)=>({companyName:company,plannedData:{totalPlannedCalls:planned,breakdown:{newClientCalls:newPlanned,oldClientCalls:oldPlanned}},actualData:{totalActualCalls:actual,breakdown:{newClientCalls:newActual,oldClientCalls:oldActual}}});
const sample={
  '2026-08-04':{'Sadik Rehman':emp('KTAHV',20,25,10,10,15,10)},
  '2026-08-03':{'Sadik Rehman':emp('KTAHV',30,12,20,10,9,3),'Pawan Kamra':emp('K T A H V ',10,0)},
  'not-a-date':{'Ghost':emp('KTAHV',1,1)},
  '2026-09-01':{'Broken Row':{}},
};

const {buildCallsReport}=load('lib/calls-report.ts');

test('calls report: groups per date (sorted), merges per employee-month, normalises company, skips non-date keys',()=>{
  const r=buildCallsReport(sample);
  assert.deepEqual(r.dateGroups.map(g=>g.date),['2026-08-03','2026-08-04','2026-09-01']);
  const first=r.dateGroups[0];
  assert.equal(first.displayDate,'03 Aug 2026');
  assert.equal(first.month,'AUGUST');
  assert.equal(first.totalPlanned,40);
  assert.equal(first.totalActual,12);
  assert.equal(first.totalVariance,-28);
  assert.equal(first.employees.find(e=>e.empName==='Pawan Kamra').company,'KTAHV');
  assert.ok(!JSON.stringify(r).includes('Ghost'));

  const sadik=r.callsData.find(x=>x.empName==='Sadik Rehman'&&x.month==='AUGUST');
  assert.equal(sadik.plannedCalls,50);
  assert.equal(sadik.actualCalls,37);
  assert.equal(sadik.varianceCalls,-13);
  assert.equal(sadik.variancePercent,-26);
  assert.equal(sadik.newClientsActual,24);
  assert.equal(sadik.oldClientsActual,13);
});

test('calls report: missing or non-numeric fields count as zero and never produce NaN',()=>{
  const r=buildCallsReport({'2026-09-01':{'Broken Row':{},'Text Row':{companyName:'KAPPL',plannedData:{totalPlannedCalls:'abc'},actualData:{totalActualCalls:'7'}}}});
  const [broken,text]=r.dateGroups[0].employees;
  assert.equal(broken.plannedCalls,0);
  assert.equal(broken.variancePercent,0);
  assert.equal(text.plannedCalls,0);
  assert.equal(text.actualCalls,7);
  assert.ok(Object.values(text).every(v=>typeof v!=='number'||Number.isFinite(v)));
});

// ── server cache ────────────────────────────────────────────────────────────────────────────────
const cacheFile=path.join(os.tmpdir(),`calls-report-test-${process.pid}.json`);
const realNow=Date.now.bind(Date);let offset=0;
let mode='ok',hits=0;const DELAY=120;
const server=http.createServer((req,res)=>{hits++;setTimeout(()=>{
  if(mode==='ok'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(sample))}
  else if(mode==='html404'){res.writeHead(404,{'content-type':'text/html'});res.end('<!DOCTYPE html><html>Sorry, unable to open the file</html>')}
  else{res.writeHead(200);res.end('{}')}
},DELAY)});
let ready;const listening=new Promise(r=>{ready=r});
server.listen(0,'127.0.0.1',()=>{process.env.CALLS_REPORT_SOURCE_URL=`http://127.0.0.1:${server.address().port}/exec`;process.env.CALLS_REPORT_CACHE_FILE=cacheFile;ready()});
Date.now=()=>realNow()+offset;
const rm=()=>{try{fs.unlinkSync(cacheFile)}catch{}};
after(()=>{Date.now=realNow;server.close();rm()});
const fresh=async()=>{await listening;return load('lib/calls-report-cache.ts').getCallsReport}; // a new module instance behaves like a server restart
const pause=ms=>new Promise(r=>setTimeout(r,ms));

test('calls cache: a cold start shares ONE upstream request and persists a good copy',async()=>{
  rm();mode='ok';hits=0;const get=await fresh();
  const results=await Promise.all([1,2,3,4,5].map(()=>get()));
  assert.equal(hits,1);
  assert.ok(results.every(r=>r.report.dateGroups.length===3&&r.stale===false));
  assert.ok(fs.existsSync(cacheFile));
});

test('calls cache: fresh copies are served without touching upstream; stale ones are served instantly and refreshed in the background',async()=>{
  rm();mode='ok';offset=0;const get=await fresh();await get();
  hits=0;assert.equal((await get()).stale,false);assert.equal(hits,0);

  offset+=6*60*1000;
  const t=realNow();const stale=await get();
  assert.ok(realNow()-t<DELAY,'stale copy must not wait for upstream');
  assert.equal(stale.stale,true);assert.equal(stale.refreshing,true);
  await pause(DELAY+150);
  const after=await get();
  assert.equal(after.stale,false);assert.equal(hits,1);
});

test('calls cache: an HTML error page is never cached, old data keeps being served, and failed refreshes cool down',async()=>{
  rm();mode='ok';offset=0;const get=await fresh();await get();
  mode='html404';offset+=6*60*1000;hits=0;
  await get();await pause(DELAY+150);          // background refresh fails
  const a=await get(),b=await get();
  assert.equal(a.report.dateGroups.length,3);assert.equal(a.stale,true);
  assert.match(a.warning,/HTTP 404/);
  assert.equal(b.stale,true);
  assert.equal(hits,1,'one failed attempt, not one per request');
});

test('calls cache: after a restart the last good copy is restored from disk even if upstream is down',async()=>{
  rm();mode='ok';offset=0;const first=await fresh();await first();
  mode='html404';const restarted=await fresh();
  const t=realNow();const r=await restarted();
  assert.ok(realNow()-t<DELAY);
  assert.equal(r.report.dateGroups.length,3);
});

test('calls cache: forced refresh returns fresh data, falls back to the stale copy when upstream is empty, and rejects with no copy at all',async()=>{
  rm();mode='ok';offset=0;const get=await fresh();await get();
  offset+=61*1000;
  assert.equal((await get({forceRefresh:true})).stale,false);
  mode='empty';const fallback=await get({forceRefresh:true});
  assert.equal(fallback.stale,true);assert.match(fallback.warning,/no data/i);

  rm();mode='html404';const cold=await fresh();
  await assert.rejects(()=>cold(),/HTTP 404/);
});
