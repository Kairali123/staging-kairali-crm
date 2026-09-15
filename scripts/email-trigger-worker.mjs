import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
const root=new URL('../.local/email-triggers/',import.meta.url)
await mkdir(root,{recursive:true,mode:0o700})
let secret
try{secret=await readFile(new URL('worker.key',root),'utf8')}catch(e){if(e.code!=='ENOENT')throw e;secret=randomBytes(32).toString('hex');await writeFile(new URL('worker.key',root),secret,{mode:0o600,flag:'wx'})}
const url='http://localhost:3011/api/cron/email-triggers'
console.log('Email trigger worker started. Checks every 15 seconds; no credentials logged.')
let stop=false;process.on('SIGINT',()=>{stop=true});process.on('SIGTERM',()=>{stop=true})
while(!stop){try{const r=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+secret.trim()},signal:AbortSignal.timeout(300000)});if(!r.ok)console.error('Worker tick failed:',r.status);else{const result=await r.json();if(result.processed)console.log('Processed scheduled runs:',result.processed)}}catch{console.error('Worker could not reach local CRM. Will retry.')};if(!stop)await new Promise(r=>setTimeout(r,15000))}
