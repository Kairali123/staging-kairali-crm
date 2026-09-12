const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
const compiled=ts.transpileModule(fs.readFileSync('app/api/marketing-daily-report/email/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function harness({user={id:'one'},permission=true,origin='http://localhost',valid=true,configured=true}={}){
 const exports={};let mails=[];
 vm.runInNewContext(compiled,{exports,require:name=>{
  if(name==='next/server')return{NextResponse:{json:(body,options)=>({body,...options})}};
  if(name==='nodemailer')return{createTransport:()=>({sendMail:async mail=>{mails.push(mail);return{rejected:[]}}})};
  if(name==='@/lib/authz')return{getSessionUser:()=>user,hasAdminRole:()=>permission,hasPermission:()=>false};
  if(name==='@/lib/api-rate-limit')return{checkApiRateLimit:async()=>({allowed:true})};
  if(name==='@/lib/marketing-report-email')return{readReportSnapshot:()=>{if(!valid)throw Error();return{date:'2026-09-11',companies:[]}},parseReportRecipients:()=>['test@example.com'],marketingMailConfig:()=>({configured,user:'sender@example.com',pass:'mock',host:'localhost',port:587})};
  if(name==='@/lib/marketing-daily-report')return{validateReportView:(_r,v)=>v,displayDate:()=> '11 September 2026 (Friday)',scopeLabel:()=> 'KTAHV',reportExportHTML:(_d,_r,v)=>'<html>SERVER REPORT '+v.expanded.join(',')+'</html>'};
  throw Error(name)
 }});
 return{mails,post:()=>exports.POST({headers:{get:()=>origin},nextUrl:new URL('http://localhost/api'),cookies:{get:()=>({value:'signed-session'})},text:async()=>JSON.stringify({snapshot:'signed',to:'test@example.com',view:{scope:'KTAHV',expanded:['KTAHV-sales']},html:'ATTACKER HTML'})})}
}
test('email route rejects unsigned, unauthorized, cross-origin and tampered requests without sending',async()=>{
 for(const [opts,status]of [[{user:null},401],[{permission:false},403],[{origin:'https://other.example'},403],[{valid:false},400],[{configured:false},503]]){const h=harness(opts);assert.equal((await h.post()).status,status);assert.equal(h.mails.length,0)}
});
test('email uses server-rendered signed snapshot and exact selected expansion, never client HTML',async()=>{
 const h=harness();const result=await h.post();assert.equal(result.body.success,true);assert.equal(h.mails.length,1);assert.equal(h.mails[0].html,'<html>SERVER REPORT KTAHV-sales</html>');assert(!h.mails[0].html.includes('ATTACKER'));assert.equal(h.mails[0].disableFileAccess,true);assert.equal(h.mails[0].disableUrlAccess,true)
});
