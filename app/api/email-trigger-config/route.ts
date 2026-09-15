import {NextRequest,NextResponse} from 'next/server'
import {randomUUID} from 'node:crypto'
import {getSessionUser,hasAdminRole,hasPermission} from '@/lib/authz'
import {marketingMailConfig} from '@/lib/marketing-report-email'
import {triggerSchema} from '@/lib/email-triggers/schema'
import {readState,transaction} from '@/lib/email-triggers/store'
import {nextRun} from '@/lib/email-triggers/schedule'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
function authorized(req:NextRequest){const u=getSessionUser(req);if(!u)return null;const r=String(u.role||'').trim().toLowerCase();return (r==='super_admin'||r==='super admin')?u:null}
export async function GET(req:NextRequest){if(!authorized(req))return NextResponse.json({error:'Administrator access required'},{status:403,headers});try{const state=await readState();return NextResponse.json({...state,smtpReady:marketingMailConfig().configured,workerReady:!!state.heartbeat&&Date.now()-Date.parse(state.heartbeat)<120000,sender:marketingMailConfig().user||''},{headers})}catch{return NextResponse.json({error:'Persistent storage unavailable on this server'},{status:503,headers})}}
export async function POST(req:NextRequest){
 const user=authorized(req);if(!user)return NextResponse.json({error:'Administrator access required'},{status:403,headers})
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403,headers})
 try{const raw=await req.text();if(raw.length>35000)return NextResponse.json({error:'Configuration too large'},{status:413,headers});const parsed=triggerSchema.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(x=>x.message).join('; ')},{status:400,headers});const input=parsed.data
 const saved=await transaction(s=>{
  const previous=input.id?s.triggers.find(x=>x.id===input.id):undefined
  if(input.id&&(!previous||input.revision!==previous.revision))throw Error('Configuration changed. Reload before saving.')
  if(input.status==='Active'&&(!marketingMailConfig().configured||!s.heartbeat||Date.now()-Date.parse(s.heartbeat)>120000))throw Error('SMTP and background worker must be ready before activating')
  if(s.triggers.length>=100&&!previous)throw Error('Maximum 100 triggers')
  const item={...input,id:previous?.id||randomUUID(),revision:(previous?.revision||0)+1,owner:String(user.id),updatedAt:new Date().toISOString(),nextRun:input.status==='Active'?nextRun(input,Date.now()):null,lastResult:previous?.lastResult||'—'}
  s.triggers=previous?s.triggers.map(x=>x.id===item.id?item:x):[...s.triggers,item];return item
 });return NextResponse.json({trigger:saved},{headers})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save configuration'},{status:400,headers})}
}
