import {NextRequest,NextResponse} from 'next/server'
import {authorized,responseHeaders as headers} from '@/lib/whatsapp-triggers/auth'
import {templates} from '@/lib/whatsapp-triggers/provider'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration = 60
export async function GET(req:NextRequest){
 if(!authorized(req))return NextResponse.json({error:'Super administrator access required'},{status:403,headers})
 try{return NextResponse.json({templates:await templates(),checkedAt:new Date().toISOString()},{headers})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Template verification unavailable'},{status:503,headers})}
}
