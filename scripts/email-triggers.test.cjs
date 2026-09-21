const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
function setup(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'email-trigger-test-')),cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const req=id=>{if(id.startsWith('@/lib/')&&!id.includes('email-triggers'))return id.includes('marketing-report-email')?{marketingMailConfig:()=>({configured:true})}:{};if(id==='nodemailer')return {};if(id.startsWith('./load-'))return {};if(id.startsWith('.'))return load(path.resolve(path.dirname(file),id+'.ts'));return require(id)};const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{module,exports:module.exports,require:req,process:{...process,env:{},cwd:()=>root},Buffer,console,Date,setTimeout});return module.exports}return {load,root,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})}}
const env=setup(),schedule=env.load('lib/email-triggers/schedule.ts');
const base={frequency:'Daily',time:'09:00',custom:'09:00, 13:30, 18:00',interval:'6',weekday:'Monday',monthday:'Last day',timezone:'Asia/Kolkata',start:'2026-09-14',end:''};
test('daily IST schedule and exact-run boundary',()=>{assert.equal(schedule.nextRun(base,Date.parse('2026-09-14T03:29Z')),'2026-09-14T03:30:00.000Z');assert.equal(schedule.nextRun(base,Date.parse('2026-09-14T03:30Z')),'2026-09-15T03:30:00.000Z')});
test('custom times sort and deduplicate; end date stops schedule',()=>{assert.equal(schedule.nextRun({...base,frequency:'Custom',custom:'18:00, 09:00, 13:30, 09:00'},Date.parse('2026-09-14T03:30Z')),'2026-09-14T08:00:00.000Z');assert.equal(schedule.nextRun({...base,end:'2026-09-14'},Date.parse('2026-09-14T03:30Z')),null)});
test('six-hour recurrence anchors to configured start, including overnight',()=>assert.equal(schedule.nextRun({...base,frequency:'Every 6 hours'},Date.parse('2026-09-14T21:30Z')),'2026-09-15T03:30:00.000Z'));
test('monthly last day and weekly recurrence',()=>{assert.equal(schedule.nextRun({...base,frequency:'Monthly'},Date.parse('2026-09-14T03:30Z')),'2026-09-30T03:30:00.000Z');assert.equal(schedule.nextRun({...base,frequency:'Weekly'},Date.parse('2026-09-14T03:30Z')),'2026-09-21T03:30:00.000Z')});
test('invalid dates rejected including non-leap February',()=>{assert.equal(schedule.validDay('2026-02-29'),false);assert.equal(schedule.validDay('2028-02-29'),true);assert.equal(schedule.validDay('2026-13-12'),false)});
async function withRunner(fn){const x=setup();try{const store=x.load('lib/email-triggers/store.ts'),runner=x.load('lib/email-triggers/dispatch.ts');const now=Date.parse('2026-09-14T03:30Z'),trigger={...base,id:'t1',revision:1,name:'Test',status:'Active',nextRun:new Date(now).toISOString(),to:'test@example.com',cc:'',bcc:'',condition:'Always send'};await store.transaction(s=>s.triggers.push(trigger));await fn({store,runner,now})}finally{x.cleanup()}}
test('durable reservation prevents duplicate dispatch across two worker ticks',()=>withRunner(async({store,runner,now})=>{let sends=0;const io={build:async()=>({subject:'s',html:'h',hasData:true}),send:async()=>{sends++;return {accepted:1,rejected:0}}};await runner.dispatchDue(now,io);await runner.dispatchDue(now,io);assert.equal(sends,1);const state=await store.readState();assert.equal(state.runs.length,1);assert.equal(state.runs[0].status,'Accepted');assert.equal(state.triggers[0].nextRun,'2026-09-15T03:30:00.000Z')}));
test('uncertain SMTP pauses trigger and never retries',()=>withRunner(async({store,runner,now})=>{let sends=0;const io={build:async()=>({subject:'s',html:'h',hasData:true}),send:async()=>{sends++;throw Error('timeout')}};await runner.dispatchDue(now,io);await runner.dispatchDue(now+86400000,io);assert.equal(sends,1);assert.equal((await store.readState()).triggers[0].status,'Paused');assert.equal((await store.readState()).runs[0].status,'Unknown')}));
test('pausing during report preparation suppresses delivery',()=>withRunner(async({store,runner,now})=>{let sends=0;await runner.dispatchDue(now,{build:async()=>{await store.transaction(s=>s.triggers[0].status='Paused');return {subject:'s',html:'h',hasData:true}},send:async()=>{sends++;return {accepted:1,rejected:0}}});assert.equal(sends,0);assert.equal((await store.readState()).runs[0].status,'Skipped')}));
test('empty reports skip without sending',()=>withRunner(async({store,runner,now})=>{await store.transaction(s=>s.triggers[0].condition='Only when data is available');let sends=0;await runner.dispatchDue(now,{build:async()=>({hasData:false,html:'',subject:''}),send:async()=>{sends++;return {accepted:1,rejected:0}}});assert.equal(sends,0);assert.equal((await store.readState()).runs[0].status,'Skipped')}));
test.after(()=>env.cleanup());

test('late missed runs skip instead of sending stale email',()=>withRunner(async({store,runner,now})=>{let sends=0;await runner.dispatchDue(now+3600000,{build:async()=>({hasData:true,html:'',subject:''}),send:async()=>{sends++;return {accepted:1,rejected:0}}});assert.equal(sends,0);assert.equal((await store.readState()).runs[0].status,'Skipped')}));
test('report generation failure never reaches SMTP',()=>withRunner(async({store,runner,now})=>{let sends=0;await runner.dispatchDue(now,{build:async()=>{throw Error('data source down')},send:async()=>{sends++;return {accepted:1,rejected:0}}});assert.equal(sends,0);assert.equal((await store.readState()).runs[0].status,'Failed')}));

test('sales-call-audit trigger validates against schema and rejects mismatch',()=>{
  const schema=env.load('lib/email-triggers/schema.ts').triggerSchema;
  const validAuditTrigger={
    ...base,
    name:'Sales Call Audit · Daily HR Email',
    reportId:'sales-call-audit',
    source:'Daily HR Email Template',
    template:'Daily HR Email Template',
    department:'HR',
    company:'All companies',
    to:'ho.hr@kairali.com',
    cc:'',
    bcc:'',
    subject:'[Daily HR Quality Audit Report] - Agent-wise Call Audit ({{report_date}})',
    body:'',
    bodyType:'Full report in email body',
    intro:'',
    closing:'',
    period:'Today',
    reportDetail:'Full report',
    status:'Active',
    attachment:'None',
    mode:'Same email to all recipients',
    condition:'Always send',
    retry:'No retries',
    missed:'Skip missed run',
    replyTo:''
  };
  const res=schema.safeParse(validAuditTrigger);
  assert.equal(res.success,true);

  const mismatched={...validAuditTrigger,source:'Marketing Daily Report'};
  const invalid=schema.safeParse(mismatched);
  assert.equal(invalid.success,false);
});

