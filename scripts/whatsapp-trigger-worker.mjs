import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
const root=new URL('../.local/whatsapp-triggers/',import.meta.url)
await mkdir(root,{recursive:true,mode:0o700})
let secret
try{secret=await readFile(new URL('worker.key',root),'utf8')}catch(e){if(e.code!=='ENOENT')throw e;secret=randomBytes(32).toString('hex');await writeFile(new URL('worker.key',root),secret,{mode:0o600,flag:'wx'})}
const origin=process.env.WHATSAPP_WORKER_ORIGIN||process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'
const url=new URL('/api/cron/whatsapp-triggers',origin)
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.protocol!=='http:')throw Error('Local worker only supports loopback HTTP')
let stop=false;process.on('SIGINT',()=>{stop=true});process.on('SIGTERM',()=>{stop=true})
console.log('WhatsApp worker started. Draft and Paused configurations never send.')
do{
 try{const r=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+secret.trim()},redirect:'error',signal:AbortSignal.timeout(300000)});if(!r.ok)console.error('WhatsApp worker failed:',r.status);else{const result=await r.json();console.log('WhatsApp worker ready; processed:',result.processed)}}catch{console.error('WhatsApp worker unavailable; no automatic resend of uncertain deliveries.')}
 if(process.argv.includes('--once'))break
 if(!stop)await new Promise(r=>setTimeout(r,15000))
}while(!stop)
