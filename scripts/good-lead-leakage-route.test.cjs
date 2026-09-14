const assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs'),Module=require('node:module')
let user=null,invalid=false,fail=false,events=[]
const connection={query:async(sql,params)=>{const statement=typeof sql==='string'?sql:sql.sql;events.push(statement);if(statement==='MAIN_QUERY'){assert.deepEqual(params,['bound']);if(fail)throw new Error('private database details');return [[{cold:2}]]}if(statement==='DIAGNOSTICS_QUERY')return [[{records:2}]];if(statement==='SELECT DATABASE() AS name')return [[{name:'test_database'}]];return [[]]},rollback:async()=>{events.push('rollback')},release:()=>events.push('release')}
const m=new Module(__filename,module);m.require=id=>{
 if(id==='next/server')return {NextResponse:{json:(body,options)=>({body,status:200,...options})}}
 if(id==='@/lib/authz')return {getSessionUser:()=>user,hasAdminRole:u=>u.role==='admin',hasPermission:(u,p)=>(u.permissions||[]).includes(p)}
 if(id==='@/lib/db')return {getPool:async()=>{events.push('getPool');return {getConnection:async()=>connection}}}
 if(id==='@/lib/good-lead-leakage')return {leakageParams:()=>{if(invalid)throw new Error('Invalid range');return ['bound']},leakageQuery:'MAIN_QUERY',leakageDiagnosticsQuery:'DIAGNOSTICS_QUERY'}
 return require(id)
};m._compile(ts.transpileModule(fs.readFileSync('app/api/good-lead-leakage/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,__filename)
;(async()=>{const req={nextUrl:new URL('http://localhost/api/good-lead-leakage')};assert.equal((await m.exports.GET(req)).status,401);user={role:'sales'};assert.equal((await m.exports.GET(req)).status,403);user={role:'admin'};invalid=true;assert.equal((await m.exports.GET(req)).status,400);assert.deepEqual(events,[])
invalid=false;const response=await m.exports.GET(req);assert.equal(response.status,200);assert.match(response.headers['Cache-Control'],/private, no-store/);assert.equal(response.body.provenance.database,'test_database');assert.equal(response.body.provenance.tables.length,2);assert.equal(response.body.diagnostics.records,2);assert(events.indexOf('START TRANSACTION READ ONLY')<events.indexOf('MAIN_QUERY'));assert(events.indexOf('DIAGNOSTICS_QUERY')<events.indexOf('rollback'));assert.deepEqual(events.slice(-2),['rollback','release'])
events=[];fail=true;const unavailable=await m.exports.GET(req);assert.equal(unavailable.status,503);assert(!JSON.stringify(unavailable).includes('private database details'));assert.deepEqual(events.slice(-2),['rollback','release'])
console.log('PASS: 401/403/400 cannot access SQL; success provenance, bound params, private no-store, read-only snapshot, diagnostics, rollback/release; failure sanitized and connection released')})().catch(e=>{console.error(e);process.exitCode=1})
