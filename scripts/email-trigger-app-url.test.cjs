const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm')
function load(){
 const file=path.resolve('lib/email-triggers/app-url.ts')
 const module={exports:{}}
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,esModuleInterop:true}}).outputText
 vm.runInNewContext(js,{module,exports:module.exports,require,process,console})
 return module.exports
}
test('explicit NEXT_PUBLIC_APP_URL always wins, trailing slashes trimmed',()=>{
 const {resolveAppUrl}=load()
 assert.equal(resolveAppUrl({NEXT_PUBLIC_APP_URL:'https://crm.kairali.com///'}),'https://crm.kairali.com')
 assert.equal(resolveAppUrl({NEXT_PUBLIC_APP_URL:'https://crm.kairali.com',NODE_ENV:'production'}),'https://crm.kairali.com')
})
test('falls back to localhost only in genuine local development',()=>{
 const {resolveAppUrl}=load()
 assert.equal(resolveAppUrl({NODE_ENV:'development'}),'http://localhost:3000')
})
test('uses the Vercel production URL when no explicit URL is set',()=>{
 const {resolveAppUrl}=load()
 assert.equal(resolveAppUrl({NODE_ENV:'production',VERCEL_PROJECT_PRODUCTION_URL:'kairali-group-crm.vercel.app'}),'https://kairali-group-crm.vercel.app')
})
test('never silently defaults to localhost outside development; fails loudly instead',()=>{
 const {resolveAppUrl}=load()
 assert.throws(()=>resolveAppUrl({NODE_ENV:'production'}),/NEXT_PUBLIC_APP_URL is not set/)
 assert.throws(()=>resolveAppUrl({}),/NEXT_PUBLIC_APP_URL is not set/)
})
