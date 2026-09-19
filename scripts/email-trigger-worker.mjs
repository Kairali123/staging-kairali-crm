import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
const root=new URL('../.local/email-triggers/',import.meta.url)
await mkdir(root,{recursive:true,mode:0o700})
let secret
try{secret=await readFile(new URL('worker.key',root),'utf8')}catch(e){if(e.code!=='ENOENT')throw e;secret=randomBytes(32).toString('hex');await writeFile(new URL('worker.key',root),secret,{mode:0o600,flag:'wx'})}
const origin=process.env.EMAIL_WORKER_ORIGIN||process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'
const url=origin+'/api/cron/email-triggers'
const snapshotUrl=origin+'/api/calling-snapshot'
const liveURL='https://script.google.com/macros/s/AKfycbz1wmE_4sczF7XrozAB-EYaZwmtC367uBPchMYcH_yi3UQJC5J3ANIkgTQTOQ7JzOD5nA/exec'
console.log('Email trigger worker started. Checks every 15 seconds; no credentials logged.')
let stop=false;process.on('SIGINT',()=>{stop=true});process.on('SIGTERM',()=>{stop=true})
async function pushCallingSnapshot(){try{const r=await fetch(liveURL,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)return;const b=await r.json();if(b.success!==true||!Array.isArray(b.data))return;await fetch(snapshotUrl,{method:'POST',headers:{authorization:'Bearer '+secret.trim(),'content-type':'application/json'},body:JSON.stringify({employees:b.data}),signal:AbortSignal.timeout(15000)});console.log('Calling snapshot pushed to DB:',b.data.length,'employees')}catch(e){console.warn('Calling snapshot push failed:',e?.message||e)}}
while(!stop){await pushCallingSnapshot();try{const r=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+secret.trim()},signal:AbortSignal.timeout(300000)});if(!r.ok)console.error('Worker tick failed:',r.status);else{const result=await r.json();if(result.processed)console.log('Processed scheduled runs:',result.processed)}}catch{console.error('Worker could not reach local CRM. Will retry.')};if(!stop)await new Promise(r=>setTimeout(r,15000))}
