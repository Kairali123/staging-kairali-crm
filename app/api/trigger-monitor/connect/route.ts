import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { administrator,sameOrigin,encrypt,privateHeaders } from '@/lib/trigger-monitor/security'
import { oauthClient,scopes } from '@/lib/trigger-monitor/google'
import { emailSchema } from '@/lib/trigger-monitor/model'
import { readMonitor } from '@/lib/trigger-monitor/store'
export const runtime='nodejs'
export async function POST(req:NextRequest){
 const user=administrator(req)
 if(!user||!sameOrigin(req))return NextResponse.json({error:'Administrator access required'},{status:403})
 try{
  const email=emailSchema.parse((await req.json()).email)
  if(!(await readMonitor()).accounts.some(a=>a.email===email))throw Error('Account not registered')
  const state=randomBytes(32).toString('base64url')
  const client=oauthClient(),{codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync()
  const url=client.generateAuthUrl({access_type:'offline',prompt:'consent',scope:scopes,login_hint:email,state,code_challenge:codeChallenge,code_challenge_method:'S256' as import('google-auth-library').CodeChallengeMethod})
  const res=NextResponse.json({url},{headers:privateHeaders})
  res.cookies.set('trigger_monitor_oauth',encrypt(JSON.stringify({state,email,user:String(user.id),verifier:codeVerifier,expires:Date.now()+600000})),{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',path:'/api/trigger-monitor',maxAge:600})
  return res
 }catch{return NextResponse.json({error:'Google connection unavailable. Configure OAuth credentials, application URL and encryption key.'},{status:503,headers:privateHeaders})}
}
