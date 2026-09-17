import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {timingSafeEqual} from 'node:crypto'
import {readState,stateRoot,transaction} from '@/lib/whatsapp-triggers/store'
import {dispatchDue} from '@/lib/whatsapp-triggers/dispatch'
import {buildReportImage,renderJPEG} from '@/lib/whatsapp-triggers/render'
import {sendReport} from '@/lib/whatsapp-triggers/provider'
import {workerReady} from '@/lib/whatsapp-triggers/schedule'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300
export async function POST(req:NextRequest){
 const headers={'Cache-Control':'no-store'}
 if(process.env.VERCEL)return NextResponse.json({error:'Hosted scheduler requires shared durable storage'},{status:503,headers})
 try{const secret=(await readFile(path.join(stateRoot(),'worker.key'),'utf8')).trim(),received=Buffer.from(req.headers.get('authorization')||''),expected=Buffer.from('Bearer '+secret);if(secret.length<32||received.length!==expected.length||!timingSafeEqual(received,expected))return NextResponse.json({error:'Unauthorized'},{status:401,headers})}catch{return NextResponse.json({error:'Unauthorized'},{status:401,headers})}
 try{
  if(!workerReady(await readState()))await renderJPEG('<!doctype html><html><body style="background:white;padding:24px">WhatsApp renderer health check</body></html>')
  await transaction(s=>{s.heartbeat=new Date().toISOString();s.rendererReady=true})
  return NextResponse.json(await dispatchDue(Date.now(),{build:buildReportImage,send:sendReport}),{headers})
 }catch{
  await transaction(s=>{s.rendererReady=false}).catch(()=>{})
  return NextResponse.json({error:'Worker or renderer unavailable. No unreserved sends allowed.'},{status:503,headers})
 }
}
