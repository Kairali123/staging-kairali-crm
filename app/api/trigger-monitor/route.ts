import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { administrator, sameOrigin, privateHeaders, hash, googleConnectionSetup } from '@/lib/trigger-monitor/security'
import { dashboard, emailSchema, googleId, projectKey } from '@/lib/trigger-monitor/model'
import { readMonitor, monitorTransaction } from '@/lib/trigger-monitor/store'
import { scanAccount } from '@/lib/trigger-monitor/google'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('account'),email:emailSchema}),
 z.object({action:z.literal('scan'),email:emailSchema}),
 z.object({action:z.literal('project'),email:emailSchema,scriptId:googleId,name:z.string().trim().min(1).max(200)}),
 z.object({action:z.literal('connector'),key:z.string().max(500)}),
 z.object({action:z.literal('assign'),key:z.string().max(700),assignee:z.union([emailSchema,z.literal('')])}),
 z.object({action:z.literal('acknowledge'),key:z.string().max(700)}),
 z.object({action:z.literal('disconnect'),email:emailSchema}),
])
export async function GET(req: NextRequest) {
 if(!administrator(req))return NextResponse.json({error:'Super administrator access required'},{status:403,headers:privateHeaders})
 try{const googleSetup=googleConnectionSetup();return NextResponse.json({...dashboard(await readMonitor()),oauthReady:googleSetup.ready,googleSetup,cronConfigured:Boolean(process.env.CRON_SECRET)},{headers:privateHeaders})}
 catch{return NextResponse.json({error:'Monitoring storage unavailable. Provision the existing email_trigger_state table and check database access.'},{status:503,headers:privateHeaders})}
}
export async function POST(req: NextRequest) {
 if(!administrator(req)||!sameOrigin(req))return NextResponse.json({error:'Administrator and same-origin request required'},{status:403,headers:privateHeaders})
 try {
  const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Request too large'},{status:413})
  const parsed=command.safeParse(JSON.parse(raw));if(!parsed.success)return NextResponse.json({error:'Invalid monitoring configuration'},{status:400})
  const c=parsed.data
  if(c.action==='scan')return NextResponse.json(await scanAccount(c.email),{headers:privateHeaders})
  const result=await monitorTransaction(s=>{
   if(c.action==='account') {if(!s.accounts.some(a=>a.email===c.email)){if(s.accounts.length>=50)throw Error('Maximum 50 accounts');s.accounts.push({email:c.email,addedAt:new Date().toISOString()})}return {saved:true}}
   if(c.action==='project') {if(!s.accounts.some(a=>a.email===c.email))throw Error('Add the account first');const key=projectKey(c.email,c.scriptId);if(!s.projects.some(p=>p.key===key)){if(s.projects.length>=1000)throw Error('Maximum 1000 projects');s.projects.push({key,email:c.email,scriptId:c.scriptId,name:c.name,discoveredAt:new Date().toISOString()})}return {saved:true}}
   if(c.action==='connector') {const p=s.projects.find(p=>p.key===c.key);if(!p)throw Error('Project not found');const token=randomBytes(32).toString('base64url');p.connectorHash=hash(token);return {token}}
   if(c.action==='disconnect') {const a=s.accounts.find(a=>a.email===c.email);if(a){delete a.refreshToken;delete a.connectedAt;delete a.scanCursor}for(const p of s.projects.filter(p=>p.email===c.email))delete p.connectorHash;return {saved:true}}
   const t=s.triggers.find(t=>t.key===c.key);if(!t)throw Error('Trigger not found')
   if(c.action==='assign')t.assignee=c.assignee
   else t.acknowledgedAt=new Date().toISOString()
   return {saved:true}
  });return NextResponse.json(result,{headers:privateHeaders})
 }catch{return NextResponse.json({error:'Operation could not be completed. Check account/project registration and storage, then retry.'},{status:400,headers:privateHeaders})}
}
