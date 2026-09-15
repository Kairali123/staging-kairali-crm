// Read-only live audit. Outputs aggregate pass/fail evidence only.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module')
const m=new Module(__filename,module);m._compile(ts.transpileModule(fs.readFileSync('lib/good-lead-leakage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,__filename)
const {leakageQuery,leakageBase,leakageDiagnosticsQuery}=m.exports
const fields=['cold','reopened','aiReopened','manualReopened','bothReopened','aiReassign','aiEscalated','manualReassign','manualEscalated','pending','lowAttempts','aiRejected','missingAttempts','missingCompany','missingSource','missingOwner']
const zero=()=>Object.fromEntries(fields.map(k=>[k,0]));const sum=rows=>rows.reduce((a,r)=>{for(const k of fields)a[k]+=Number(r[k]||0);return a},zero())
require('@next/env').loadEnvConfig(process.cwd());const mysql=require('mysql2/promise')
;(async()=>{let c;try{c=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});await c.query("SET SESSION time_zone = '+05:30'");await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await c.query('START TRANSACTION READ ONLY');
// Synthetic classification examples execute the real SQL, without writing any fixtures to the database.
const fixtures=[
 {ai:'reopen',senior:'cold',completed:1,attempts:1,expect:{cold:1,reopened:1,aiReopened:1,aiRejected:1,lowAttempts:1}},
 {ai:'reopen',senior:'reopen',completed:1,attempts:3,expect:{cold:1,reopened:1,aiReopened:1,manualReopened:1,bothReopened:1}},
 {ai:'not required',senior:'',completed:0,attempts:null,expect:{cold:1,pending:1,missingAttempts:1}},
 {ai:'manual review',senior:'reopen',completed:0,attempts:0,expect:{cold:1,pending:1}},
 {ai:'reopen to other',senior:'reopen to other',completed:1,attempts:2,expect:{cold:1,aiReassign:1,manualReassign:1}},
 {ai:'reopen to other and escalate',senior:'reopen and escalate to abhilash sir',completed:1,attempts:2,expect:{cold:1,aiEscalated:1,manualEscalated:1}},
 {ai:'',senior:'reopen',completed:1,attempts:-1,origin:'Archive',expect:{cold:1,reopened:1,manualReopened:1,missingAttempts:1}},
 {ai:'cold',senior:'',completed:0,attempts:2,expect:{cold:1,pending:1}},
]
const values=[];const selects=fixtures.map((f,i)=>{values.push('KTAHV','fixture'+i,'owner','2026-09-01 12:00:00',f.attempts,f.origin||'Current','uid'+i,'lead'+i,f.ai,f.senior,f.completed);return 'SELECT ? company, ? source, ? owner, ? review_date, ? attempts, ? origin, ? uid, ? lead_id, ? ai, ? senior, ? completed'})
const fixtureBase='WITH reviews AS ('+selects.join(' UNION ALL ')+leakageBase.slice(leakageBase.indexOf('), classified AS'))
const [tested]=await c.query({sql:leakageQuery.replace(leakageBase,fixtureBase),timeout:20000},[...values,'2026-09-01','2026-09-02','ALL','ALL','ALL','ALL'])
for(let i=0;i<fixtures.length;i++){const r=tested.find(r=>r.source==='fixture'+i);assert(r);for(const k of fields)assert.equal(Number(r[k]),fixtures[i].expect[k]||0,`fixture ${i} ${k}`)}
console.log('PASS: 8 classification fixtures, all 16 metrics; no SQL writes')
for(const [start,end,label] of [['1900-01-01','2100-01-01','All dated history'],['2026-08-01','2026-09-01','August'],['2026-09-01','2026-09-12','September 1–11']]){
const params=[start,end,'ALL','ALL','ALL','ALL'];const [rows]=await c.query({sql:leakageQuery,timeout:20000},params);const expected=zero()
for(const [table,date,company,owner,archive] of [['fms_enquiry_cold_reverification_v2','generate_date_time','company_belongs_to','cold_by_employee_name',false],['archieve_fms_enquiry_cold_reverification_v2','generate_datetime','company','assign_to_mr',true]]){
const [groups]=await c.query({sql:`SELECT ${archive?"''":'AI_Verification_Category'} ai,verify_action_status_executive_verifier executive,verify_action_status_senior_verifier senior,call_count_before_cold attempts,COALESCE(TRIM(${company}),'')='' mc,COALESCE(TRIM(data_source),'')='' ms,COALESCE(TRIM(${owner}),'')='' mo,COUNT(*) n FROM ${table} WHERE ${date} >= ? AND ${date} < ? GROUP BY 1,2,3,4,5,6,7`,timeout:20000},[start,end])
for(const g of groups){const ai=(g.ai||'').trim().toLowerCase(),senior=(g.senior||'').trim().toLowerCase();const completed=archive||Boolean((g.executive||'').trim()&&senior);const bucket=/escalate|abhilash/.test(ai)?'escalate':ai.includes('other')?'other':ai.includes('reopen')?'reopen':ai.includes('cold')?'cold':'manual';const ar=bucket==='reopen',mr=completed&&senior==='reopen';const checks={cold:true,reopened:ar||mr,aiReopened:ar,manualReopened:mr,bothReopened:ar&&mr,aiReassign:bucket==='other',aiEscalated:bucket==='escalate',manualReassign:completed&&senior==='reopen to other',manualEscalated:completed&&senior==='reopen and escalate to abhilash sir',pending:!completed,lowAttempts:(ar||mr)&&g.attempts!==null&&Number(g.attempts)>=0&&Number(g.attempts)<3,aiRejected:ar&&completed&&senior==='cold',missingAttempts:g.attempts===null||Number(g.attempts)<0,missingCompany:Boolean(g.mc),missingSource:Boolean(g.ms),missingOwner:Boolean(g.mo)};for(const k of fields)if(checks[k])expected[k]+=Number(g.n)}
}
assert.deepEqual(sum(rows),expected,label+' independent aggregates');const [diagnostics]=await c.query({sql:leakageDiagnosticsQuery,timeout:20000},params);assert.equal(Number(diagnostics[0].records),expected.cold);assert(Number(diagnostics[0].distinctReviewIds)<=expected.cold)
for(const company of ['ALL','KTAHV','KAPPL','VILLARAAG'])for(const review of ['ALL','AI','Manual']){const [filtered]=await c.query({sql:leakageQuery,timeout:20000},[start,end,company,company,review,review]);assert.deepEqual(sum(filtered),sum(rows.filter(r=>(company==='ALL'||r.company===company)&&(review==='ALL'||r.review===review))),label+' '+company+' '+review)}
console.log('PASS:',label,expected.cold,'records; all 16 fields + 12 company/workflow combinations; repeated review records:',Number(diagnostics[0].records)-Number(diagnostics[0].distinctReviewIds))
}
await c.rollback();console.log('PASS: complete audit; transaction rolled back')
}catch(e){console.error('FAIL:',e.code||e.message);process.exitCode=1}finally{await c?.end()}})()
