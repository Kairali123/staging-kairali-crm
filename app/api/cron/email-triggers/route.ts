import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {timingSafeEqual} from 'node:crypto'
import {stateRoot} from '@/lib/email-triggers/store'
import {dispatchDue} from '@/lib/email-triggers/dispatch'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=300
export async function POST(req:NextRequest){
 if(process.env.VERCEL)return NextResponse.json({error:'Hosted scheduler storage not configured'},{status:503})
 try{const secret=(await readFile(path.join(stateRoot(),'worker.key'),'utf8')).trim(),received=req.headers.get('authorization')||'',expected='Bearer '+secret;if(secret.length<32||received.length!==expected.length||!timingSafeEqual(Buffer.from(received),Buffer.from(expected)))return NextResponse.json({error:'Unauthorized'},{status:401})}catch{return NextResponse.json({error:'Unauthorized'},{status:401})}
 try{return NextResponse.json(await dispatchDue(),{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Worker could not obtain durable state; no unreserved sends allowed'},{status:503})}
}
